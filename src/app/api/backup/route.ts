import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// ==================== CONFIGURAÇÃO ====================

function getConfig() {
    try {
        const configPath = path.resolve(process.cwd(), 'DB', 'Supabase', 'config.json');
        const raw = fs.readFileSync(configPath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function getBasePath(): string {
    const config = getConfig();
    return config?.backup?.base_path || path.resolve(process.cwd(), 'DB', 'Supabase');
}

function getTables(): string[] {
    const config = getConfig();
    return config?.supabase?.tables || [
        'clinics',
        'clinic_contacts',
        'clinic_delivery_points',
        'clinic_staff',
        'clinic_discounts',
        'organization_settings'
    ];
}

// ==================== HELPERS INCREMENTAL ====================

interface BackupInfo {
    dir: string;
    metadata: any;
    dirName: string;
}

function findLastFullBackup(backupsDir: string): BackupInfo | null {
    if (!fs.existsSync(backupsDir)) return null;

    const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && e.name.startsWith('FULL_'))
        .map(e => e.name)
        .sort()
        .reverse();

    for (const dirName of entries) {
        const metaPath = path.join(backupsDir, dirName, '_metadata.json');
        if (fs.existsSync(metaPath)) {
            try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                if (meta.status === 'success' || meta.status === 'partial') {
                    return { dir: path.join(backupsDir, dirName), metadata: meta, dirName };
                }
            } catch { /* ignorar */ }
        }
    }
    return null;
}

function findLastBackup(backupsDir: string): BackupInfo | null {
    if (!fs.existsSync(backupsDir)) return null;

    const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && (e.name.startsWith('FULL_') || e.name.startsWith('INCR_')))
        .map(e => e.name)
        .sort()
        .reverse();

    for (const dirName of entries) {
        const metaPath = path.join(backupsDir, dirName, '_metadata.json');
        if (fs.existsSync(metaPath)) {
            try {
                const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                if (meta.status === 'success' || meta.status === 'partial') {
                    return { dir: path.join(backupsDir, dirName), metadata: meta, dirName };
                }
            } catch { /* ignorar */ }
        }
    }
    return null;
}

function loadFullBackupIds(fullBackupDir: string, table: string): Set<string> {
    const filePath = path.join(fullBackupDir, `${table}.json`);
    if (!fs.existsSync(filePath)) return new Set();

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return new Set(data.map((row: any) => row.id));
    } catch {
        return new Set();
    }
}

function shouldDoFullBackup(config: any, requestedMode: string, backupsDir: string) {
    if (requestedMode === 'full') return { doFull: true, reason: 'Modo FULL forçado pelo utilizador' };
    if (requestedMode === 'incremental') {
        const lastFull = findLastFullBackup(backupsDir);
        if (!lastFull) return { doFull: true, reason: 'Sem backup FULL base — FULL primeiro' };
        return { doFull: false, reason: 'Modo INCREMENTAL forçado' };
    }

    // Modo AUTO
    const lastFull = findLastFullBackup(backupsDir);
    if (!lastFull) return { doFull: true, reason: 'Primeiro backup — base de referência' };

    const fullDate = new Date(lastFull.metadata.timestamp);
    const daysSinceFull = (Date.now() - fullDate.getTime()) / (1000 * 60 * 60 * 24);
    const intervalDays = config?.backup?.full_backup_interval_days || 7;

    if (daysSinceFull >= intervalDays) {
        return { doFull: true, reason: `Último FULL há ${Math.floor(daysSinceFull)} dias (intervalo: ${intervalDays})` };
    }

    return { doFull: false, reason: `INCREMENTAL (último FULL há ${Math.floor(daysSinceFull)} dias)` };
}

// ==================== BACKUP FULL (dados) ====================

async function backupTablesFull(supabase: any, tables: string[], backupDir: string) {
    const results: Record<string, any> = {};
    let totalRows = 0;
    let errors = 0;

    for (const table of tables) {
        try {
            let allData: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .range(from, from + pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    from += pageSize;
                    hasMore = data.length === pageSize;
                } else {
                    hasMore = false;
                }
            }

            const filePath = path.join(backupDir, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf-8');

            results[table] = {
                rows: allData.length,
                file: `${table}.json`,
                size_bytes: fs.statSync(filePath).size,
                status: 'ok'
            };
            totalRows += allData.length;
        } catch (err: any) {
            results[table] = { rows: 0, status: 'error', error: err.message };
            errors++;
        }
    }

    return { results, totalRows, successCount: tables.length - errors, errors };
}

// ==================== BACKUP INCREMENTAL (dados) ====================

async function backupTablesIncremental(
    supabase: any,
    tables: string[],
    backupDir: string,
    lastFull: BackupInfo,
    lastBackup: BackupInfo,
    now: Date
) {
    const sinceTimestamp = lastBackup.metadata.timestamp;
    const results: Record<string, any> = {};
    let totalChanges = 0;
    let successCount = 0;
    let skippedCount = 0;
    let errors = 0;

    for (const table of tables) {
        try {
            // 1. Obter registos alterados desde o último backup
            let changedData: any[] = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .gt('updated_at', sinceTimestamp)
                    .range(from, from + pageSize - 1);

                if (error) throw error;

                if (data && data.length > 0) {
                    changedData = changedData.concat(data);
                    from += pageSize;
                    hasMore = data.length === pageSize;
                } else {
                    hasMore = false;
                }
            }

            // 2. Separar ADDED vs MODIFIED
            const added: any[] = [];
            const modified: any[] = [];
            for (const row of changedData) {
                if (row.created_at && new Date(row.created_at) > new Date(sinceTimestamp)) {
                    added.push(row);
                } else {
                    modified.push(row);
                }
            }

            // 3. Detectar ELIMINADOS
            const fullBackupIds = loadFullBackupIds(lastFull.dir, table);
            const deletedIds: string[] = [];

            if (fullBackupIds.size > 0 && table !== 'user_clinic_access') {
                let idFrom = 0;
                let idHasMore = true;
                const currentIds = new Set<string>();

                while (idHasMore) {
                    const { data: idData, error: idError } = await supabase
                        .from(table)
                        .select('id')
                        .range(idFrom, idFrom + pageSize - 1);

                    if (idError) throw idError;

                    if (idData && idData.length > 0) {
                        idData.forEach((row: any) => currentIds.add(row.id));
                        idFrom += pageSize;
                        idHasMore = idData.length === pageSize;
                    } else {
                        idHasMore = false;
                    }
                }

                for (const id of fullBackupIds) {
                    if (!currentIds.has(id)) {
                        deletedIds.push(id);
                    }
                }
            }

            // 4. Sem mudanças → skip
            if (added.length === 0 && modified.length === 0 && deletedIds.length === 0) {
                results[table] = {
                    status: 'unchanged',
                    summary: { added: 0, modified: 0, deleted: 0 }
                };
                skippedCount++;
                continue;
            }

            // 5. Guardar ficheiro incremental
            const incrementalData = {
                table,
                backup_type: 'incremental',
                base_backup: lastFull.dirName,
                since: sinceTimestamp,
                timestamp: now.toISOString(),
                summary: {
                    added: added.length,
                    modified: modified.length,
                    deleted: deletedIds.length
                },
                changes: {
                    added,
                    modified,
                    deleted_ids: deletedIds
                }
            };

            const filePath = path.join(backupDir, `${table}.json`);
            fs.writeFileSync(filePath, JSON.stringify(incrementalData, null, 2), 'utf-8');

            const changeCount = added.length + modified.length + deletedIds.length;
            totalChanges += changeCount;
            successCount++;

            results[table] = {
                status: 'ok',
                file: `${table}.json`,
                size_bytes: fs.statSync(filePath).size,
                summary: incrementalData.summary
            };
        } catch (err: any) {
            results[table] = { status: 'error', error: err.message };
            errors++;
        }
    }

    // Gerar _summary.json
    const summary = {
        backup_type: 'incremental',
        base_backup: lastFull.dirName,
        since: sinceTimestamp,
        timestamp: now.toISOString(),
        total_changes: totalChanges,
        tables_with_changes: successCount,
        tables_unchanged: skippedCount,
        tables_error: errors,
        per_table: {} as Record<string, any>
    };

    for (const table of tables) {
        if (results[table]?.summary) {
            summary.per_table[table] = results[table].summary;
        }
    }

    const summaryPath = path.join(backupDir, '_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    return { results, totalRows: totalChanges, successCount, skippedCount, errors };
}

// ==================== INFRAESTRUTURA (só FULL) ====================

async function backupInfrastructure(supabase: any, tables: string[], backupDir: string, now: Date) {
    const infraDir = path.join(backupDir, '_infrastructure');
    const infrastructure: Record<string, any> = {};

    // Schema DDL
    try {
        const { data: schemaData, error: schemaError } = await supabase.rpc('get_schema_ddl');

        if (!schemaError && schemaData) {
            fs.writeFileSync(path.join(infraDir, 'schema_ddl.json'), JSON.stringify(schemaData, null, 2), 'utf-8');
            infrastructure.schema = { status: 'ok', file: '_infrastructure/schema_ddl.json' };
        } else {
            const schemaInfo: Record<string, any> = {};
            for (const table of tables) {
                try {
                    const { data: sample } = await supabase.from(table).select('*').limit(1);
                    if (sample && sample.length > 0) {
                        schemaInfo[table] = {
                            columns: Object.keys(sample[0]).map(col => ({
                                name: col,
                                sample_type: typeof sample[0][col],
                                is_null: sample[0][col] === null,
                            }))
                        };
                    }
                } catch { /* ignorar */ }
            }
            fs.writeFileSync(path.join(infraDir, 'schema_inferred.json'), JSON.stringify(schemaInfo, null, 2), 'utf-8');
            infrastructure.schema = { status: 'inferred', file: '_infrastructure/schema_inferred.json' };
        }
    } catch (err: any) {
        infrastructure.schema = { status: 'error', error: err.message };
    }

    // TypeScript types
    try {
        const typesPath = path.resolve(process.cwd(), 'src', 'types', 'database.types.ts');
        if (fs.existsSync(typesPath)) {
            fs.copyFileSync(typesPath, path.join(infraDir, 'database.types.ts'));
            infrastructure.typescript_types = { status: 'ok', file: '_infrastructure/database.types.ts' };
        }
    } catch { /* não crítico */ }

    // Auth Users
    try {
        const { data: allUsers, error: rpcError } = await supabase.rpc('get_auth_users_summary');

        if (!rpcError && allUsers && allUsers.length > 0) {
            const authInfo = { backup_type: 'full', total_users: allUsers.length, users: allUsers, backup_date: now.toISOString() };
            fs.writeFileSync(path.join(infraDir, 'auth_users.json'), JSON.stringify(authInfo, null, 2), 'utf-8');
            infrastructure.auth = { status: 'ok', file: '_infrastructure/auth_users.json', total_users: allUsers.length };
        } else {
            const { data: userData } = await supabase.auth.getUser();
            if (userData?.user) {
                const authInfo = {
                    backup_type: 'partial',
                    note: 'Apenas user actual.',
                    current_user: { id: userData.user.id, email: userData.user.email, role: userData.user.role, created_at: userData.user.created_at },
                    backup_date: now.toISOString(),
                };
                fs.writeFileSync(path.join(infraDir, 'auth_users.json'), JSON.stringify(authInfo, null, 2), 'utf-8');
                infrastructure.auth = { status: 'partial', file: '_infrastructure/auth_users.json' };
            } else {
                infrastructure.auth = { status: 'skipped', reason: 'Sem sessão activa' };
            }
        }
    } catch (err: any) {
        infrastructure.auth = { status: 'error', error: err.message };
    }

    // RLS Policies
    try {
        const { data: rlsData, error: rlsError } = await supabase.rpc('get_rls_policies');
        if (!rlsError && rlsData) {
            fs.writeFileSync(path.join(infraDir, 'rls_policies.json'), JSON.stringify(rlsData, null, 2), 'utf-8');
            infrastructure.rls_policies = { status: 'ok', file: '_infrastructure/rls_policies.json' };
        } else {
            infrastructure.rls_policies = { status: 'unavailable' };
        }
    } catch (err: any) {
        infrastructure.rls_policies = { status: 'error', error: err.message };
    }

    // DB Functions
    try {
        const { data: fnData, error: fnError } = await supabase.rpc('get_db_functions');
        if (!fnError && fnData) {
            fs.writeFileSync(path.join(infraDir, 'db_functions.json'), JSON.stringify(fnData, null, 2), 'utf-8');
            infrastructure.db_functions = { status: 'ok', file: '_infrastructure/db_functions.json' };
        } else {
            infrastructure.db_functions = { status: 'unavailable' };
        }
    } catch (err: any) {
        infrastructure.db_functions = { status: 'error', error: err.message };
    }

    // README
    const readmeContent = `# AsymLAB — Backup FULL do Supabase
## Data: ${now.toISOString()}

### Conteúdo:
#### 📦 Dados (tabelas JSON — cópia completa)
${tables.map(t => `- ${t}.json`).join('\n')}

#### 🏗️ Infraestrutura (_infrastructure/)
- schema_ddl.json / schema_inferred.json
- database.types.ts
- auth_users.json
- rls_policies.json
- db_functions.json

### 📋 Metadata
Ver \`_metadata.json\` para detalhes.
`;
    fs.writeFileSync(path.join(infraDir, 'README.md'), readmeContent, 'utf-8');

    return infrastructure;
}

// ==================== POST — Executar backup ====================

export async function POST(request: Request) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Variáveis Supabase não configuradas' }, { status: 500 });
        }

        // Ler modo do body (opcional)
        let requestedMode = 'auto';
        try {
            const body = await request.json();
            if (body?.mode && ['full', 'incremental', 'auto'].includes(body.mode)) {
                requestedMode = body.mode;
            }
        } catch { /* sem body ou body inválido — usar auto */ }

        const config = getConfig();
        const supabase = createClient(supabaseUrl, supabaseKey);
        const basePath = getBasePath();
        const tables = getTables();
        const backupsDir = path.join(basePath, 'backups');

        // Configurar modo do config se não foi especificado no body
        if (requestedMode === 'auto') {
            requestedMode = config?.backup?.default_mode || 'auto';
        }

        // Decidir FULL vs INCREMENTAL
        const { doFull, reason } = shouldDoFullBackup(config, requestedMode, backupsDir);
        const backupType = doFull ? 'full' : 'incremental';

        // Criar pasta com prefixo FULL_ ou INCR_
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const dateStr = now.toISOString().slice(0, 10);
        const prefix = doFull ? 'FULL' : 'INCR';
        const backupDir = path.join(backupsDir, `${prefix}_${dateStr}_${timestamp.slice(11)}`);
        const infraDir = path.join(backupDir, '_infrastructure');

        fs.mkdirSync(infraDir, { recursive: true });

        // ═══════════════════════════════════════════
        // FASE 1: Dados das tabelas
        // ═══════════════════════════════════════════
        let tableResult: any;
        let infrastructure: Record<string, any> = {};

        if (doFull) {
            tableResult = await backupTablesFull(supabase, tables, backupDir);

            // FASE 2-5: Infraestrutura (só no FULL)
            infrastructure = await backupInfrastructure(supabase, tables, backupDir, now);
        } else {
            const lastFull = findLastFullBackup(backupsDir)!;
            const lastBackup = findLastBackup(backupsDir)!;
            tableResult = await backupTablesIncremental(supabase, tables, backupDir, lastFull, lastBackup, now);
        }

        // ═══════════════════════════════════════════
        // Metadata final
        // ═══════════════════════════════════════════
        const metadata: any = {
            version: '3.0',
            type: backupType,
            timestamp: now.toISOString(),
            date: dateStr,
            trigger: 'manual',
            mode_requested: requestedMode,
            mode_reason: reason,
            supabase_url: supabaseUrl,
            tables: tableResult.results,
            infrastructure,
            total_rows: tableResult.totalRows,
            tables_ok: tableResult.successCount,
            tables_failed: tableResult.errors,
            tables_unchanged: tableResult.skippedCount || 0,
            status: tableResult.errors === 0 ? 'success' : 'partial',
        };

        if (!doFull) {
            const lastFull = findLastFullBackup(backupsDir);
            metadata.base_backup = lastFull?.dirName;
            metadata.since = findLastBackup(backupsDir)?.metadata?.timestamp;
        }

        fs.writeFileSync(
            path.join(backupDir, '_metadata.json'),
            JSON.stringify(metadata, null, 2),
            'utf-8'
        );

        // Log
        try {
            const logsDir = path.join(basePath, 'logs');
            fs.mkdirSync(logsDir, { recursive: true });
            const typeLabel = backupType === 'full' ? 'FULL' : 'INCR';
            const logLine = `[${metadata.timestamp}] type=${typeLabel} trigger=manual status=${metadata.status} tables=${metadata.tables_ok}/${tables.length} rows=${metadata.total_rows} duration=api\n`;
            fs.appendFileSync(path.join(logsDir, 'backup.log'), logLine, 'utf-8');
        } catch { /* não crítico */ }

        // Resposta
        const message = doFull
            ? `Backup FULL: ${tableResult.totalRows} registos em ${tableResult.successCount}/${tables.length} tabelas`
            : `Backup INCREMENTAL: ${tableResult.totalRows} alterações, ${tableResult.successCount} tabelas com mudanças, ${tableResult.skippedCount} sem alterações`;

        return NextResponse.json({
            success: true,
            type: backupType,
            message,
            reason,
            path: backupDir,
            metadata
        });

    } catch (err: any) {
        return NextResponse.json({
            success: false,
            error: err.message
        }, { status: 500 });
    }
}

// ==================== GET — Info do último backup ====================

export async function GET() {
    try {
        const basePath = getBasePath();
        const backupsDir = path.join(basePath, 'backups');

        if (fs.existsSync(backupsDir)) {
            const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
                .filter(e => e.isDirectory() && (e.name.startsWith('FULL_') || e.name.startsWith('INCR_')))
                .sort((a, b) => b.name.localeCompare(a.name));

            if (entries.length > 0) {
                const latestDir = path.join(backupsDir, entries[0].name);
                const metaFile = path.join(latestDir, '_metadata.json');
                if (fs.existsSync(metaFile)) {
                    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));

                    // Também encontrar o último FULL para contexto
                    const lastFullEntry = entries.find(e => e.name.startsWith('FULL_'));
                    let lastFullMeta = null;
                    if (lastFullEntry) {
                        const fullMetaFile = path.join(backupsDir, lastFullEntry.name, '_metadata.json');
                        if (fs.existsSync(fullMetaFile)) {
                            lastFullMeta = JSON.parse(fs.readFileSync(fullMetaFile, 'utf-8'));
                        }
                    }

                    return NextResponse.json({
                        lastBackup: meta,
                        lastFullBackup: lastFullMeta,
                        totalBackups: entries.length,
                        totalFull: entries.filter(e => e.name.startsWith('FULL_')).length,
                        totalIncremental: entries.filter(e => e.name.startsWith('INCR_')).length,
                    });
                }
            }
        }

        return NextResponse.json({ lastBackup: null, message: 'Nenhum backup encontrado' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
