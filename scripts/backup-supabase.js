/**
 * AsymLAB — Supabase Backup Script (v2.0 — Incremental)
 * 
 * Suporta 3 modos de backup:
 *   - FULL: Exporta tudo (SELECT *)
 *   - INCREMENTAL: Só exporta dados alterados desde o último backup
 *   - AUTO: Decide automaticamente (FULL se necessário, senão INCREMENTAL)
 * 
 * Uso:
 *   node scripts/backup-supabase.js                           (modo auto)
 *   node scripts/backup-supabase.js --mode full               (forçar full)
 *   node scripts/backup-supabase.js --mode incremental        (forçar incremental)
 *   node scripts/backup-supabase.js --path "Z:\NAS\DB\Supabase"  (override path)
 * 
 * Preparado para transição NAS: basta alterar o base_path em DB/Supabase/config.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAÇÃO ====================

const CONFIG_PATH = path.resolve(__dirname, '..', 'DB', 'Supabase', 'config.json');

function loadConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch (err) {
        console.error('❌ Erro ao ler config.json:', err.message);
        console.log('   Esperado em:', CONFIG_PATH);
        process.exit(1);
    }
}

function loadEnv() {
    const envPath = path.resolve(__dirname, '..', '.env.local');
    try {
        const content = fs.readFileSync(envPath, 'utf-8').replace(/\r/g, '');
        const vars = {};
        content.split('\n').forEach(line => {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) return;
            const eqIndex = trimmed.indexOf('=');
            if (eqIndex > 0) {
                const key = trimmed.slice(0, eqIndex).trim();
                const value = trimmed.slice(eqIndex + 1).trim();
                vars[key] = value;
            }
        });
        return vars;
    } catch (err) {
        console.error('❌ Erro ao ler .env.local:', err.message);
        process.exit(1);
    }
}

// ==================== HELPERS INCREMENTAL ====================

/**
 * Encontra o último backup FULL no diretório de backups
 * Retorna { dir, metadata } ou null
 */
function findLastFullBackup(backupsDir) {
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
            } catch (e) { /* ignorar metadata corrompido */ }
        }
    }
    return null;
}

/**
 * Encontra o último backup (FULL ou INCR) para obter o timestamp mais recente
 */
function findLastBackup(backupsDir) {
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
            } catch (e) { /* ignorar */ }
        }
    }
    return null;
}

/**
 * Carrega os IDs de uma tabela do último backup FULL
 */
function loadFullBackupIds(fullBackupDir, table) {
    const filePath = path.join(fullBackupDir, `${table}.json`);
    if (!fs.existsSync(filePath)) return new Set();

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        return new Set(data.map(row => row.id));
    } catch (e) {
        return new Set();
    }
}

/**
 * Decide se deve fazer FULL ou INCREMENTAL
 */
function shouldDoFullBackup(config, requestedMode, backupsDir) {
    // Se o user forçou um modo específico
    if (requestedMode === 'full') return { doFull: true, reason: 'Modo FULL forçado pelo utilizador' };
    if (requestedMode === 'incremental') {
        // Verificar se existe backup FULL como base
        const lastFull = findLastFullBackup(backupsDir);
        if (!lastFull) return { doFull: true, reason: 'Modo INCREMENTAL pedido mas não existe backup FULL base — a fazer FULL primeiro' };
        return { doFull: false, reason: 'Modo INCREMENTAL forçado pelo utilizador' };
    }

    // Modo AUTO
    const lastFull = findLastFullBackup(backupsDir);
    if (!lastFull) {
        return { doFull: true, reason: 'Primeiro backup — base de referência' };
    }

    const fullDate = new Date(lastFull.metadata.timestamp);
    const daysSinceFull = (Date.now() - fullDate.getTime()) / (1000 * 60 * 60 * 24);
    const intervalDays = config.backup.full_backup_interval_days || 7;

    if (daysSinceFull >= intervalDays) {
        return { doFull: true, reason: `Último FULL há ${Math.floor(daysSinceFull)} dias (intervalo: ${intervalDays} dias)` };
    }

    return { doFull: false, reason: `Último FULL há ${Math.floor(daysSinceFull)} dias — INCREMENTAL suficiente` };
}

// ==================== BACKUP FULL ====================

async function runFullBackup(supabase, tables, backupDir, now, metadata) {
    let totalRows = 0;
    let successCount = 0;

    for (const table of tables) {
        try {
            process.stdout.write(`  ⏳ ${table}...`);

            let allData = [];
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

            const rowCount = allData.length;
            totalRows += rowCount;
            successCount++;

            metadata.tables[table] = {
                rows: rowCount,
                file: `${table}.json`,
                size_bytes: fs.statSync(filePath).size,
                status: 'ok'
            };

            console.log(` ✅ ${rowCount} registos`);
        } catch (err) {
            const errorMsg = err.message || String(err);
            metadata.tables[table] = { rows: 0, status: 'error', error: errorMsg };
            metadata.errors.push({ table, error: errorMsg });
            console.log(` ❌ ERRO: ${errorMsg}`);
        }
    }

    return { totalRows, successCount };
}

// ==================== BACKUP INCREMENTAL ====================

async function runIncrementalBackup(supabase, tables, backupDir, now, metadata, lastFull, lastBackup) {
    const sinceTimestamp = lastBackup.metadata.timestamp;
    let totalChanges = 0;
    let successCount = 0;
    let skippedCount = 0;

    metadata.base_backup = lastFull.dirName;
    metadata.since = sinceTimestamp;

    for (const table of tables) {
        try {
            process.stdout.write(`  ⏳ ${table}...`);

            // 1. Obter registos alterados/novos desde o último backup
            let changedData = [];
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

            // 2. Separar em ADDED vs MODIFIED
            const added = [];
            const modified = [];
            for (const row of changedData) {
                if (row.created_at && new Date(row.created_at) > new Date(sinceTimestamp)) {
                    added.push(row);
                } else {
                    modified.push(row);
                }
            }

            // 3. Detectar ELIMINADOS (comparar IDs com último FULL)
            const fullBackupIds = loadFullBackupIds(lastFull.dir, table);
            let deletedIds = [];

            if (fullBackupIds.size > 0) {
                // Obter todos os IDs atuais (query leve)
                let currentIds = new Set();
                let idFrom = 0;
                let idHasMore = true;

                // Determinar a primary key da tabela
                const pkColumn = (table === 'user_clinic_access') ? null : 'id';

                if (pkColumn) {
                    while (idHasMore) {
                        const { data: idData, error: idError } = await supabase
                            .from(table)
                            .select('id')
                            .range(idFrom, idFrom + pageSize - 1);

                        if (idError) throw idError;

                        if (idData && idData.length > 0) {
                            idData.forEach(row => currentIds.add(row.id));
                            idFrom += pageSize;
                            idHasMore = idData.length === pageSize;
                        } else {
                            idHasMore = false;
                        }
                    }

                    // IDs que estavam no FULL mas já não existem = ELIMINADOS
                    for (const id of fullBackupIds) {
                        if (!currentIds.has(id)) {
                            deletedIds.push(id);
                        }
                    }
                }
            }

            // 4. Se não houve mudanças → skip
            if (added.length === 0 && modified.length === 0 && deletedIds.length === 0) {
                metadata.tables[table] = {
                    status: 'unchanged',
                    summary: { added: 0, modified: 0, deleted: 0 }
                };
                skippedCount++;
                console.log(` ⏭️ Sem alterações`);
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

            metadata.tables[table] = {
                status: 'ok',
                file: `${table}.json`,
                size_bytes: fs.statSync(filePath).size,
                summary: incrementalData.summary
            };

            const parts = [];
            if (added.length > 0) parts.push(`+${added.length} novos`);
            if (modified.length > 0) parts.push(`~${modified.length} modificados`);
            if (deletedIds.length > 0) parts.push(`-${deletedIds.length} eliminados`);
            console.log(` ✅ ${parts.join(', ')}`);

        } catch (err) {
            const errorMsg = err.message || String(err);
            metadata.tables[table] = { status: 'error', error: errorMsg };
            metadata.errors.push({ table, error: errorMsg });
            console.log(` ❌ ERRO: ${errorMsg}`);
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
        tables_error: tables.length - successCount - skippedCount,
        per_table: {}
    };

    for (const table of tables) {
        if (metadata.tables[table]?.summary) {
            summary.per_table[table] = metadata.tables[table].summary;
        }
    }

    const summaryPath = path.join(backupDir, '_summary.json');
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf-8');

    return { totalRows: totalChanges, successCount, skippedCount };
}

// ==================== BACKUP PRINCIPAL ====================

async function runBackup(overridePath, overrideMode) {
    const config = loadConfig();
    const env = loadEnv();

    const supabaseUrl = env[config.supabase.url_env];
    const supabaseKey = env[config.supabase.key_env];

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Variáveis de ambiente do Supabase não encontradas!');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const tables = config.supabase.tables;

    const basePath = overridePath || config.backup.base_path;
    const backupsDir = path.join(basePath, 'backups');
    const requestedMode = overrideMode || config.backup.default_mode || 'auto';

    // Decidir modo
    const { doFull, reason } = shouldDoFullBackup(config, requestedMode, backupsDir);
    const backupType = doFull ? 'full' : 'incremental';

    // Criar pasta com prefixo FULL_ ou INCR_
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateStr = now.toISOString().slice(0, 10);
    const prefix = doFull ? 'FULL' : 'INCR';
    const backupDir = path.join(backupsDir, `${prefix}_${dateStr}_${timestamp.slice(11)}`);

    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(path.join(backupDir, '_infrastructure'), { recursive: true });

    const typeLabel = doFull ? 'FULL Backup' : 'Incremental Backup';
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log(`║    AsymLAB — Supabase ${typeLabel.padEnd(24)}    ║`);
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`📅 Data: ${now.toLocaleString('pt-PT')}`);
    console.log(`📁 Destino: ${backupDir}`);
    console.log(`📊 Tabelas: ${tables.length}`);
    console.log(`🔄 Modo: ${requestedMode.toUpperCase()} → ${backupType.toUpperCase()}`);
    console.log(`💡 Razão: ${reason}`);
    console.log('─'.repeat(52));

    const metadata = {
        version: '3.0',
        type: backupType,
        timestamp: now.toISOString(),
        date: dateStr,
        supabase_url: supabaseUrl,
        mode_requested: requestedMode,
        mode_reason: reason,
        tables: {},
        infrastructure: {},
        status: 'in_progress',
        duration_ms: 0,
        errors: []
    };

    const startTime = Date.now();

    // ═══════════════════════════════════════════
    // FASE 1: Dados das tabelas
    // ═══════════════════════════════════════════
    console.log(`\n📦 FASE 1: Dados das tabelas (${backupType.toUpperCase()})`);
    console.log('─'.repeat(52));

    let result;

    if (doFull) {
        result = await runFullBackup(supabase, tables, backupDir, now, metadata);
    } else {
        const lastFull = findLastFullBackup(backupsDir);
        const lastBackup = findLastBackup(backupsDir);
        console.log(`  📎 Base FULL: ${lastFull.dirName}`);
        console.log(`  📎 Desde: ${lastBackup.metadata.timestamp}`);
        console.log('─'.repeat(52));
        result = await runIncrementalBackup(supabase, tables, backupDir, now, metadata, lastFull, lastBackup);
    }

    // ═══════════════════════════════════════════
    // FASE 2: Schema (DDL) — Só no FULL
    // ═══════════════════════════════════════════
    if (doFull) {
        console.log('\n🏗️  FASE 2: Schema (estrutura das tabelas)');
        console.log('─'.repeat(52));

        try {
            process.stdout.write('  ⏳ Exportar schema DDL...');

            const { data: schemaData, error: schemaError } = await supabase.rpc('get_schema_ddl');

            if (schemaError) {
                console.log(' ⚠️ RPC não disponível, a usar information_schema...');

                const { data: columnsData, error: colError } = await supabase
                    .from('information_schema.columns')
                    .select('*')
                    .in('table_schema', ['public'])
                    .order('table_name', { ascending: true });

                if (colError) {
                    const schemaInfo = {};
                    for (const table of tables) {
                        try {
                            const { data: sample, error: sampleErr } = await supabase
                                .from(table)
                                .select('*')
                                .limit(1);

                            if (!sampleErr && sample && sample.length > 0) {
                                schemaInfo[table] = {
                                    columns: Object.keys(sample[0]).map(col => ({
                                        name: col,
                                        sample_type: typeof sample[0][col],
                                        sample_value: sample[0][col],
                                        is_null: sample[0][col] === null,
                                    }))
                                };
                            }
                        } catch (e) { /* ignorar */ }
                    }

                    const schemaPath = path.join(backupDir, '_infrastructure', 'schema_inferred.json');
                    fs.writeFileSync(schemaPath, JSON.stringify(schemaInfo, null, 2), 'utf-8');
                    metadata.infrastructure.schema = { status: 'inferred', file: '_infrastructure/schema_inferred.json' };
                    console.log('  ✅ Schema inferido (baseado em dados)');
                } else {
                    const schemaPath = path.join(backupDir, '_infrastructure', 'schema_columns.json');
                    fs.writeFileSync(schemaPath, JSON.stringify(columnsData, null, 2), 'utf-8');
                    metadata.infrastructure.schema = { status: 'ok', file: '_infrastructure/schema_columns.json' };
                    console.log(' ✅ Schema exportado (information_schema)');
                }
            } else {
                const schemaPath = path.join(backupDir, '_infrastructure', 'schema_ddl.json');
                fs.writeFileSync(schemaPath, JSON.stringify(schemaData, null, 2), 'utf-8');
                metadata.infrastructure.schema = { status: 'ok', file: '_infrastructure/schema_ddl.json' };
                console.log(' ✅ Schema DDL completo');
            }
        } catch (err) {
            console.log(` ⚠️ Schema parcial: ${err.message}`);
            metadata.infrastructure.schema = { status: 'error', error: err.message };
        }

        // Backup dos tipos TypeScript
        try {
            const typesPath = path.resolve(__dirname, '..', 'src', 'types', 'database.types.ts');
            if (fs.existsSync(typesPath)) {
                const dest = path.join(backupDir, '_infrastructure', 'database.types.ts');
                fs.copyFileSync(typesPath, dest);
                metadata.infrastructure.typescript_types = { status: 'ok', file: '_infrastructure/database.types.ts' };
                console.log('  ✅ TypeScript types copiados');
            }
        } catch (e) { /* não é crítico */ }

        // ═══════════════════════════════════════════
        // FASE 3: Auth Users — Só no FULL
        // ═══════════════════════════════════════════
        console.log('\n🔐 FASE 3: Utilizadores (Auth)');
        console.log('─'.repeat(52));

        try {
            process.stdout.write('  ⏳ Exportar utilizadores...');

            const { data: allUsers, error: rpcError } = await supabase.rpc('get_auth_users_summary');

            if (!rpcError && allUsers && allUsers.length > 0) {
                const authInfo = {
                    backup_type: 'full',
                    total_users: allUsers.length,
                    users: allUsers,
                    backup_date: now.toISOString(),
                };

                const authPath = path.join(backupDir, '_infrastructure', 'auth_users.json');
                fs.writeFileSync(authPath, JSON.stringify(authInfo, null, 2), 'utf-8');
                metadata.infrastructure.auth = {
                    status: 'ok',
                    file: '_infrastructure/auth_users.json',
                    total_users: allUsers.length
                };
                console.log(` ✅ ${allUsers.length} utilizador(es) exportados`);
            } else {
                console.log(' ⚠️ RPC não disponível, a usar fallback...');
                const { data: userData, error: userError } = await supabase.auth.getUser();

                if (!userError && userData?.user) {
                    const authInfo = {
                        backup_type: 'partial',
                        note: 'Apenas o utilizador actual.',
                        current_user: {
                            id: userData.user.id,
                            email: userData.user.email,
                            role: userData.user.role,
                            created_at: userData.user.created_at,
                            last_sign_in_at: userData.user.last_sign_in_at,
                            app_metadata: userData.user.app_metadata,
                            user_metadata: userData.user.user_metadata,
                        },
                        backup_date: now.toISOString(),
                    };

                    const authPath = path.join(backupDir, '_infrastructure', 'auth_users.json');
                    fs.writeFileSync(authPath, JSON.stringify(authInfo, null, 2), 'utf-8');
                    metadata.infrastructure.auth = {
                        status: 'partial',
                        file: '_infrastructure/auth_users.json',
                        note: 'Apenas user actual.'
                    };
                    console.log('  ✅ User actual exportado (parcial)');
                } else {
                    metadata.infrastructure.auth = { status: 'skipped', reason: 'Sem sessão activa' };
                    console.log('  ⚠️ Sem sessão activa — auth ignorado');
                }
            }
        } catch (err) {
            metadata.infrastructure.auth = { status: 'error', error: err.message };
            console.log(` ⚠️ Auth: ${err.message}`);
        }

        // ═══════════════════════════════════════════
        // FASE 4: RLS Policies & Functions — Só no FULL
        // ═══════════════════════════════════════════
        console.log('\n🛡️  FASE 4: RLS Policies & Functions');
        console.log('─'.repeat(52));

        try {
            process.stdout.write('  ⏳ Exportar RLS policies...');
            const { data: rlsData, error: rlsError } = await supabase.rpc('get_rls_policies');

            if (!rlsError && rlsData) {
                const rlsPath = path.join(backupDir, '_infrastructure', 'rls_policies.json');
                fs.writeFileSync(rlsPath, JSON.stringify(rlsData, null, 2), 'utf-8');
                metadata.infrastructure.rls_policies = { status: 'ok', file: '_infrastructure/rls_policies.json' };
                console.log(' ✅ Policies exportadas');
            } else {
                metadata.infrastructure.rls_policies = { status: 'unavailable', note: 'RPC não disponível' };
                console.log(' ⚠️ RPC não disponível');
            }
        } catch (err) {
            metadata.infrastructure.rls_policies = { status: 'error', error: err.message };
            console.log(` ⚠️ RLS: ${err.message}`);
        }

        try {
            process.stdout.write('  ⏳ Exportar DB functions...');
            const { data: fnData, error: fnError } = await supabase.rpc('get_db_functions');

            if (!fnError && fnData) {
                const fnPath = path.join(backupDir, '_infrastructure', 'db_functions.json');
                fs.writeFileSync(fnPath, JSON.stringify(fnData, null, 2), 'utf-8');
                metadata.infrastructure.db_functions = { status: 'ok', file: '_infrastructure/db_functions.json' };
                console.log(' ✅ Functions exportadas');
            } else {
                metadata.infrastructure.db_functions = { status: 'unavailable', note: 'RPC não disponível' };
                console.log(' ⚠️ RPC não disponível');
            }
        } catch (err) {
            metadata.infrastructure.db_functions = { status: 'error', error: err.message };
            console.log(` ⚠️ Functions: ${err.message}`);
        }

        // ═══════════════════════════════════════════
        // FASE 5: README — Só no FULL
        // ═══════════════════════════════════════════
        const readmeContent = `# AsymLAB — Backup FULL do Supabase
## Data: ${now.toISOString()}

### Conteúdo deste backup:

#### 📦 Dados (tabelas JSON — cópia completa)
${tables.map(t => `- ${t}.json`).join('\n')}

#### 🏗️ Infraestrutura (_infrastructure/)
- **schema_inferred.json** — Estrutura das tabelas
- **database.types.ts** — Tipos TypeScript
- **auth_users.json** — Utilizadores de autenticação
- **rls_policies.json** — Políticas RLS (se disponível)
- **db_functions.json** — Funções SQL (se disponível)

### 📋 Metadata
- Ver \`_metadata.json\` para detalhes completos do backup.
`;
        const readmePath = path.join(backupDir, '_infrastructure', 'README.md');
        fs.writeFileSync(readmePath, readmeContent, 'utf-8');

    } else {
        // INCREMENTAL — skip Fases 2-5 (infraestrutura)
        console.log('\n⏭️ Fases 2-5 ignoradas (só executam em backup FULL)');
    }

    // Finalizar metadata
    metadata.status = metadata.errors.length === 0 ? 'success' : 'partial';
    metadata.duration_ms = Date.now() - startTime;
    metadata.total_rows = result.totalRows;
    metadata.tables_ok = result.successCount;
    metadata.tables_failed = tables.length - result.successCount - (result.skippedCount || 0);
    metadata.tables_unchanged = result.skippedCount || 0;

    // Guardar metadata
    const metaPath = path.join(backupDir, '_metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Atualizar apontador "latest"
    const latestPath = path.join(basePath, 'backups', 'latest');
    try {
        if (fs.existsSync(latestPath + '.txt')) {
            fs.rmSync(latestPath + '.txt', { force: true });
        }
        fs.writeFileSync(latestPath + '.txt', backupDir, 'utf-8');
    } catch (e) { /* não é crítico */ }

    // Limpar backups antigos (retenção)
    cleanOldBackups(basePath, config.backup.retention_days);

    // Log final
    console.log('\n' + '═'.repeat(52));
    if (doFull) {
        console.log(`✅ BACKUP FULL COMPLETO!`);
        console.log(`   📊 ${result.totalRows} registos em ${result.successCount}/${tables.length} tabelas`);
        console.log(`   🏗️  Schema: ${metadata.infrastructure.schema?.status || 'n/a'}`);
        console.log(`   🔐 Auth: ${metadata.infrastructure.auth?.status || 'n/a'}`);
        console.log(`   🛡️  RLS: ${metadata.infrastructure.rls_policies?.status || 'n/a'}`);
    } else {
        console.log(`✅ BACKUP INCREMENTAL COMPLETO!`);
        console.log(`   📊 ${result.totalRows} alterações detectadas`);
        console.log(`   📋 ${result.successCount} tabelas com mudanças, ${result.skippedCount} sem alterações`);
        console.log(`   📎 Base: ${metadata.base_backup}`);
    }
    console.log(`   ⏱️  ${metadata.duration_ms}ms`);
    console.log(`   📁 ${backupDir}`);
    if (metadata.errors.length > 0) {
        console.log(`   ⚠️  ${metadata.errors.length} erro(s) — ver _metadata.json`);
    }
    console.log('');

    // Guardar log
    appendLog(basePath, metadata);

    return metadata;
}

// ==================== LIMPEZA ====================

function cleanOldBackups(basePath, retentionDays) {
    const backupsDir = path.join(basePath, 'backups');
    if (!fs.existsSync(backupsDir)) return;

    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);

    try {
        const entries = fs.readdirSync(backupsDir, { withFileTypes: true });
        let cleaned = 0;

        for (const entry of entries) {
            if (!entry.isDirectory()) continue;
            if (entry.name === 'latest') continue;

            // Extrair data do nome da pasta (FULL_YYYY-MM-DD_... ou INCR_YYYY-MM-DD_...)
            const dateMatch = entry.name.match(/(\d{4}-\d{2}-\d{2})/);
            if (!dateMatch) continue;

            const folderDate = new Date(dateMatch[1]);

            if (folderDate < cutoff) {
                const fullPath = path.join(backupsDir, entry.name);
                fs.rmSync(fullPath, { recursive: true, force: true });
                cleaned++;
            }
        }

        if (cleaned > 0) {
            console.log(`   🗑️  ${cleaned} backup(s) antigo(s) removido(s) (>${retentionDays} dias)`);
        }
    } catch (err) {
        console.warn('   ⚠️  Erro na limpeza:', err.message);
    }
}

// ==================== LOGGING ====================

function appendLog(basePath, metadata) {
    const logsDir = path.join(basePath, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });

    const logFile = path.join(logsDir, 'backup.log');
    const typeLabel = metadata.type === 'full' ? 'FULL' : 'INCR';
    const logLine = `[${metadata.timestamp}] type=${typeLabel} status=${metadata.status} tables=${metadata.tables_ok}/${metadata.tables_ok + metadata.tables_failed + (metadata.tables_unchanged || 0)} rows=${metadata.total_rows} duration=${metadata.duration_ms}ms\n`;

    fs.appendFileSync(logFile, logLine, 'utf-8');
}

// ==================== CLI ====================

const args = process.argv.slice(2);
let overridePath = null;
let overrideMode = null;

const pathIndex = args.indexOf('--path');
if (pathIndex !== -1 && args[pathIndex + 1]) {
    overridePath = args[pathIndex + 1];
}

const modeIndex = args.indexOf('--mode');
if (modeIndex !== -1 && args[modeIndex + 1]) {
    const mode = args[modeIndex + 1].toLowerCase();
    if (['full', 'incremental', 'auto'].includes(mode)) {
        overrideMode = mode;
    } else {
        console.error(`❌ Modo inválido: ${mode}. Use: full, incremental, auto`);
        process.exit(1);
    }
}

// Executar
runBackup(overridePath, overrideMode)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('💀 Erro fatal:', err);
        process.exit(1);
    });

// Exportar para uso programático (API route)
module.exports = { runBackup };
