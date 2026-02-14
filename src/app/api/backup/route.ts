import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Ler config.json para obter tabelas e base_path
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

export async function POST() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (!supabaseUrl || !supabaseKey) {
            return NextResponse.json({ error: 'Variáveis Supabase não configuradas' }, { status: 500 });
        }

        const supabase = createClient(supabaseUrl, supabaseKey);
        const basePath = getBasePath();
        const tables = getTables();

        // Criar pasta com timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const dateStr = now.toISOString().slice(0, 10);
        const backupDir = path.join(basePath, 'backups', `${dateStr}_${timestamp.slice(11)}`);
        const infraDir = path.join(backupDir, '_infrastructure');

        fs.mkdirSync(infraDir, { recursive: true });

        const results: Record<string, { rows: number; status: string; error?: string }> = {};
        const infrastructure: Record<string, any> = {};
        let totalRows = 0;
        let errors = 0;

        // ═══════════════════════════════════════════
        // FASE 1: Dados das tabelas
        // ═══════════════════════════════════════════
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

                results[table] = { rows: allData.length, status: 'ok' };
                totalRows += allData.length;
            } catch (err: any) {
                results[table] = { rows: 0, status: 'error', error: err.message };
                errors++;
            }
        }

        // ═══════════════════════════════════════════
        // FASE 2: Schema DDL
        // ═══════════════════════════════════════════
        try {
            const { data: schemaData, error: schemaError } = await supabase.rpc('get_schema_ddl');

            if (!schemaError && schemaData) {
                const schemaPath = path.join(infraDir, 'schema_ddl.json');
                fs.writeFileSync(schemaPath, JSON.stringify(schemaData, null, 2), 'utf-8');
                infrastructure.schema = { status: 'ok', file: '_infrastructure/schema_ddl.json' };
            } else {
                // Fallback: inferir schema a partir dos dados
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
                const schemaPath = path.join(infraDir, 'schema_inferred.json');
                fs.writeFileSync(schemaPath, JSON.stringify(schemaInfo, null, 2), 'utf-8');
                infrastructure.schema = { status: 'inferred', file: '_infrastructure/schema_inferred.json' };
            }
        } catch (err: any) {
            infrastructure.schema = { status: 'error', error: err.message };
        }

        // TypeScript types
        try {
            const typesPath = path.resolve(process.cwd(), 'src', 'types', 'database.types.ts');
            if (fs.existsSync(typesPath)) {
                const dest = path.join(infraDir, 'database.types.ts');
                fs.copyFileSync(typesPath, dest);
                infrastructure.typescript_types = { status: 'ok', file: '_infrastructure/database.types.ts' };
            }
        } catch { /* não crítico */ }

        // ═══════════════════════════════════════════
        // FASE 3: Auth Users
        // ═══════════════════════════════════════════
        try {
            const { data: allUsers, error: rpcError } = await supabase.rpc('get_auth_users_summary');

            if (!rpcError && allUsers && allUsers.length > 0) {
                const authInfo = {
                    backup_type: 'full',
                    total_users: allUsers.length,
                    users: allUsers,
                    backup_date: now.toISOString(),
                };
                fs.writeFileSync(path.join(infraDir, 'auth_users.json'), JSON.stringify(authInfo, null, 2), 'utf-8');
                infrastructure.auth = { status: 'ok', file: '_infrastructure/auth_users.json', total_users: allUsers.length };
            } else {
                // Fallback
                const { data: userData } = await supabase.auth.getUser();
                if (userData?.user) {
                    const authInfo = {
                        backup_type: 'partial',
                        note: 'Apenas user actual. Executar setup-backup-functions.sql para todos.',
                        current_user: {
                            id: userData.user.id,
                            email: userData.user.email,
                            role: userData.user.role,
                            created_at: userData.user.created_at,
                        },
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

        // ═══════════════════════════════════════════
        // FASE 4: RLS Policies & Functions
        // ═══════════════════════════════════════════
        try {
            const { data: rlsData, error: rlsError } = await supabase.rpc('get_rls_policies');
            if (!rlsError && rlsData) {
                fs.writeFileSync(path.join(infraDir, 'rls_policies.json'), JSON.stringify(rlsData, null, 2), 'utf-8');
                infrastructure.rls_policies = { status: 'ok', file: '_infrastructure/rls_policies.json' };
            } else {
                infrastructure.rls_policies = { status: 'unavailable', reason: rlsError?.message || 'RPC não disponível' };
            }
        } catch (err: any) {
            infrastructure.rls_policies = { status: 'error', error: err.message };
        }

        try {
            const { data: fnData, error: fnError } = await supabase.rpc('get_db_functions');
            if (!fnError && fnData) {
                fs.writeFileSync(path.join(infraDir, 'db_functions.json'), JSON.stringify(fnData, null, 2), 'utf-8');
                infrastructure.db_functions = { status: 'ok', file: '_infrastructure/db_functions.json' };
            } else {
                infrastructure.db_functions = { status: 'unavailable', reason: fnError?.message || 'RPC não disponível' };
            }
        } catch (err: any) {
            infrastructure.db_functions = { status: 'error', error: err.message };
        }

        // ═══════════════════════════════════════════
        // FASE 5: README de migração
        // ═══════════════════════════════════════════
        const readmeContent = `# AsymLAB — Backup Completo do Supabase
## Data: ${now.toISOString()}

### Conteúdo deste backup:

#### 📦 Dados (tabelas JSON)
${tables.map(t => `- ${t}.json`).join('\n')}

#### 🏗️ Infraestrutura (_infrastructure/)
- **schema_ddl.json** — Estrutura completa das tabelas (colunas, tipos, PKs, FKs, indexes)
- **database.types.ts** — Tipos TypeScript (cópia do código fonte)
- **auth_users.json** — Utilizadores de autenticação
- **rls_policies.json** — Políticas de segurança por linha
- **db_functions.json** — Funções SQL personalizadas

### 📋 Metadata
Ver \`_metadata.json\` para detalhes completos do backup.
`;
        fs.writeFileSync(path.join(infraDir, 'README.md'), readmeContent, 'utf-8');

        // ═══════════════════════════════════════════
        // Metadata final
        // ═══════════════════════════════════════════
        const metadata = {
            version: '2.0',
            timestamp: now.toISOString(),
            date: dateStr,
            trigger: 'manual',
            supabase_url: supabaseUrl,
            tables: results,
            infrastructure,
            total_rows: totalRows,
            tables_ok: tables.length - errors,
            tables_failed: errors,
            status: errors === 0 ? 'success' : 'partial',
            errors: [] as string[]
        };

        fs.writeFileSync(
            path.join(backupDir, '_metadata.json'),
            JSON.stringify(metadata, null, 2),
            'utf-8'
        );

        // Log (não-crítico — se falhar, o backup já está guardado)
        try {
            const logsDir = path.join(basePath, 'logs');
            fs.mkdirSync(logsDir, { recursive: true });
            const logLine = `[${metadata.timestamp}] trigger=manual status=${metadata.status} tables=${metadata.tables_ok}/${tables.length} rows=${totalRows} schema=${infrastructure.schema?.status || 'n/a'} auth=${infrastructure.auth?.status || 'n/a'} rls=${infrastructure.rls_policies?.status || 'n/a'}\n`;
            fs.appendFileSync(path.join(logsDir, 'backup.log'), logLine, 'utf-8');
        } catch { /* log não é crítico */ }

        return NextResponse.json({
            success: true,
            message: `Backup completo: ${totalRows} registos em ${tables.length - errors}/${tables.length} tabelas | Schema: ${infrastructure.schema?.status} | Auth: ${infrastructure.auth?.status} | RLS: ${infrastructure.rls_policies?.status}`,
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

// GET — verificar último backup
export async function GET() {
    try {
        const basePath = getBasePath();

        // Procurar a pasta mais recente
        const backupsDir = path.join(basePath, 'backups');
        if (fs.existsSync(backupsDir)) {
            const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
                .filter(e => e.isDirectory() && e.name !== 'latest')
                .sort((a, b) => b.name.localeCompare(a.name));

            if (entries.length > 0) {
                const latestDir = path.join(backupsDir, entries[0].name);
                const metaFile = path.join(latestDir, '_metadata.json');
                if (fs.existsSync(metaFile)) {
                    const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                    return NextResponse.json({ lastBackup: meta });
                }
            }
        }

        return NextResponse.json({ lastBackup: null, message: 'Nenhum backup encontrado' });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
