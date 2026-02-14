/**
 * AsymLAB — Supabase Backup Script
 * 
 * Exporta todas as tabelas do Supabase para ficheiros JSON locais.
 * Organização: DB/Supabase/backups/YYYY-MM-DD_HH-MM-SS/
 * 
 * Uso:
 *   node scripts/backup-supabase.js
 *   node scripts/backup-supabase.js --path "Z:\NAS\DB\Supabase"   (override do path)
 * 
 * Preparado para transição NAS: basta alterar o base_path em DB/Supabase/config.json
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// ==================== CONFIGURAÇÃO ====================

// Carregar configuração
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

// Carregar .env.local
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

// ==================== BACKUP ====================

async function runBackup(overridePath) {
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

    // Determinar path base (pode ser overridden via CLI ou config)
    const basePath = overridePath || config.backup.base_path;

    // Criar pasta com timestamp
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const dateStr = now.toISOString().slice(0, 10);
    const backupDir = path.join(basePath, 'backups', `${dateStr}_${timestamp.slice(11)}`);

    // Criar directórios
    fs.mkdirSync(backupDir, { recursive: true });
    fs.mkdirSync(path.join(backupDir, '_infrastructure'), { recursive: true });

    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║    AsymLAB — Supabase Full Backup                ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log(`📅 Data: ${now.toLocaleString('pt-PT')}`);
    console.log(`📁 Destino: ${backupDir}`);
    console.log(`📊 Tabelas: ${tables.length}`);
    console.log('─'.repeat(52));

    const metadata = {
        version: '2.0',
        timestamp: now.toISOString(),
        date: dateStr,
        supabase_url: supabaseUrl,
        tables: {},
        infrastructure: {},
        status: 'in_progress',
        duration_ms: 0,
        errors: []
    };

    const startTime = Date.now();
    let totalRows = 0;
    let successCount = 0;

    // ═══════════════════════════════════════════
    // FASE 1: Dados das tabelas
    // ═══════════════════════════════════════════
    console.log('\n📦 FASE 1: Dados das tabelas');
    console.log('─'.repeat(52));

    for (const table of tables) {
        try {
            process.stdout.write(`  ⏳ ${table}...`);

            // Exportar todos os registos (paginação de 1000 em 1000)
            let allData = [];
            let from = 0;
            const pageSize = 1000;
            let hasMore = true;

            while (hasMore) {
                const { data, error } = await supabase
                    .from(table)
                    .select('*')
                    .range(from, from + pageSize - 1)
                    .order('created_at', { ascending: true });

                if (error) throw error;

                if (data && data.length > 0) {
                    allData = allData.concat(data);
                    from += pageSize;
                    hasMore = data.length === pageSize;
                } else {
                    hasMore = false;
                }
            }

            // Guardar ficheiro JSON
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
            metadata.tables[table] = {
                rows: 0,
                status: 'error',
                error: errorMsg
            };
            metadata.errors.push({ table, error: errorMsg });
            console.log(` ❌ ERRO: ${errorMsg}`);
        }
    }

    // ═══════════════════════════════════════════
    // FASE 2: Schema (DDL) — Estrutura completa
    // ═══════════════════════════════════════════
    console.log('\n🏗️  FASE 2: Schema (estrutura das tabelas)');
    console.log('─'.repeat(52));

    try {
        process.stdout.write('  ⏳ Exportar schema DDL...');

        const { data: schemaData, error: schemaError } = await supabase.rpc('get_schema_ddl');

        if (schemaError) {
            // Fallback: usar information_schema se a função RPC não existir
            console.log(' ⚠️ RPC não disponível, a usar information_schema...');

            const { data: columnsData, error: colError } = await supabase
                .from('information_schema.columns')
                .select('*')
                .in('table_schema', ['public'])
                .order('table_name', { ascending: true });

            if (colError) {
                // Segundo fallback: query directa via REST
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
                    } catch (e) {
                        // Ignorar tabelas com erro
                    }
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
            const schemaPath = path.join(backupDir, '_infrastructure', 'schema_ddl.sql');
            fs.writeFileSync(schemaPath, schemaData, 'utf-8');
            metadata.infrastructure.schema = { status: 'ok', file: '_infrastructure/schema_ddl.sql' };
            console.log(' ✅ Schema DDL completo');
        }
    } catch (err) {
        console.log(` ⚠️ Schema parcial: ${err.message}`);
        metadata.infrastructure.schema = { status: 'error', error: err.message };
    }

    // Backup dos tipos TypeScript (cópia local do ficheiro de tipos)
    try {
        const typesPath = path.resolve(__dirname, '..', 'src', 'types', 'database.types.ts');
        if (fs.existsSync(typesPath)) {
            const dest = path.join(backupDir, '_infrastructure', 'database.types.ts');
            fs.copyFileSync(typesPath, dest);
            metadata.infrastructure.typescript_types = { status: 'ok', file: '_infrastructure/database.types.ts' };
            console.log('  ✅ TypeScript types copiados');
        }
    } catch (e) {
        // Não é crítico
    }

    // ═══════════════════════════════════════════
    // FASE 3: Auth Users
    // ═══════════════════════════════════════════
    console.log('\n🔐 FASE 3: Utilizadores (Auth)');
    console.log('─'.repeat(52));

    try {
        process.stdout.write('  ⏳ Exportar utilizadores...');

        // Nota: Com a anon key, não temos acesso admin à auth.
        // Guardamos o que podemos via API pública + info do utilizador actual
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (!userError && userData?.user) {
            const authInfo = {
                note: 'Backup parcial — apenas o utilizador actual. Para backup completo de todos os users, usar Service Role Key.',
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
                note: 'Apenas user actual. Para todos os users, configurar Service Role Key.'
            };
            console.log(' ✅ User actual exportado');
        } else {
            metadata.infrastructure.auth = { status: 'skipped', reason: 'Sem sessão activa' };
            console.log(' ⚠️ Sem sessão activa — auth ignorado');
        }
    } catch (err) {
        metadata.infrastructure.auth = { status: 'error', error: err.message };
        console.log(` ⚠️ Auth: ${err.message}`);
    }

    // ═══════════════════════════════════════════
    // FASE 4: RLS Policies & Functions
    // ═══════════════════════════════════════════
    console.log('\n🛡️  FASE 4: RLS Policies & Functions');
    console.log('─'.repeat(52));

    // RLS Policies — tentar via REST query
    try {
        process.stdout.write('  ⏳ Exportar RLS policies...');

        const { data: rlsData, error: rlsError } = await supabase
            .rpc('get_rls_policies');

        if (!rlsError && rlsData) {
            const rlsPath = path.join(backupDir, '_infrastructure', 'rls_policies.json');
            fs.writeFileSync(rlsPath, JSON.stringify(rlsData, null, 2), 'utf-8');
            metadata.infrastructure.rls_policies = { status: 'ok', file: '_infrastructure/rls_policies.json' };
            console.log(' ✅ Policies exportadas');
        } else {
            // RPC não existe — exportar aviso
            metadata.infrastructure.rls_policies = {
                status: 'unavailable',
                note: 'Criar função RPC get_rls_policies no Supabase para backup completo. Ver docs em _infrastructure/README.md'
            };
            console.log(' ⚠️ RPC não disponível (ver README)');
        }
    } catch (err) {
        metadata.infrastructure.rls_policies = { status: 'error', error: err.message };
        console.log(` ⚠️ RLS: ${err.message}`);
    }

    // DB Functions
    try {
        process.stdout.write('  ⏳ Exportar DB functions...');

        const { data: fnData, error: fnError } = await supabase
            .rpc('get_db_functions');

        if (!fnError && fnData) {
            const fnPath = path.join(backupDir, '_infrastructure', 'db_functions.json');
            fs.writeFileSync(fnPath, JSON.stringify(fnData, null, 2), 'utf-8');
            metadata.infrastructure.db_functions = { status: 'ok', file: '_infrastructure/db_functions.json' };
            console.log(' ✅ Functions exportadas');
        } else {
            metadata.infrastructure.db_functions = {
                status: 'unavailable',
                note: 'Criar função RPC get_db_functions no Supabase para backup completo.'
            };
            console.log(' ⚠️ RPC não disponível');
        }
    } catch (err) {
        metadata.infrastructure.db_functions = { status: 'error', error: err.message };
        console.log(` ⚠️ Functions: ${err.message}`);
    }

    // ═══════════════════════════════════════════
    // FASE 5: Gerar README de migração
    // ═══════════════════════════════════════════

    const readmeContent = `# AsymLAB — Backup Completo do Supabase
## Data: ${now.toISOString()}

### Conteúdo deste backup:

#### 📦 Dados (tabelas JSON)
${tables.map(t => `- ${t}.json`).join('\n')}

#### 🏗️ Infraestrutura (_infrastructure/)
- **schema_inferred.json** — Estrutura das tabelas (tipos e colunas)
- **database.types.ts** — Tipos TypeScript (cópia do código fonte)
- **auth_users.json** — Utilizadores de autenticação
- **rls_policies.json** — Políticas de segurança por linha (se disponível)
- **db_functions.json** — Funções SQL personalizadas (se disponível)

### 🔄 Para migração completa, adicionalmente precisa de:

1. **Backup completo de Auth** — Requer Service Role Key:
   - Ir ao Supabase Dashboard → Settings → API → Service Role Key
   - Adicionar como SUPABASE_SERVICE_ROLE_KEY ao .env.local
   
2. **RLS Policies** — Criar estas funções SQL no Supabase SQL Editor:

\`\`\`sql
-- Função para exportar RLS policies
CREATE OR REPLACE FUNCTION get_rls_policies()
RETURNS json AS $$
  SELECT json_agg(row_to_json(p))
  FROM pg_policies p
  WHERE p.schemaname = 'public';
$$ LANGUAGE sql SECURITY DEFINER;

-- Função para exportar schema DDL
CREATE OR REPLACE FUNCTION get_schema_ddl()
RETURNS text AS $$
DECLARE
  result text := '';
  rec record;
BEGIN
  FOR rec IN
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  LOOP
    result := result || pg_catalog.pg_get_tabledef(rec.table_name) || E'\\n\\n';
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para exportar DB functions
CREATE OR REPLACE FUNCTION get_db_functions()
RETURNS json AS $$
  SELECT json_agg(json_build_object(
    'name', p.proname,
    'schema', n.nspname,
    'language', l.lanname,
    'definition', pg_get_functiondef(p.oid)
  ))
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  JOIN pg_language l ON p.prolang = l.oid
  WHERE n.nspname = 'public';
$$ LANGUAGE sql SECURITY DEFINER;
\`\`\`

3. **Storage** — Se usar Supabase Storage no futuro, adicionar backup de buckets/ficheiros.

### 📋 Metadata
- Ver \`_metadata.json\` para detalhes completos do backup.
`;

    const readmePath = path.join(backupDir, '_infrastructure', 'README.md');
    fs.writeFileSync(readmePath, readmeContent, 'utf-8');

    // Finalizar metadata
    metadata.status = metadata.errors.length === 0 ? 'success' : 'partial';
    metadata.duration_ms = Date.now() - startTime;
    metadata.total_rows = totalRows;
    metadata.tables_ok = successCount;
    metadata.tables_failed = tables.length - successCount;

    // Guardar metadata
    const metaPath = path.join(backupDir, '_metadata.json');
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2), 'utf-8');

    // Atualizar symlink "latest"
    const latestPath = path.join(basePath, 'backups', 'latest');
    try {
        if (fs.existsSync(latestPath)) {
            fs.rmSync(latestPath, { recursive: true, force: true });
        }
        fs.writeFileSync(latestPath + '.txt', backupDir, 'utf-8');
    } catch (e) {
        // Não é crítico
    }

    // Limpar backups antigos (retenção)
    cleanOldBackups(basePath, config.backup.retention_days);

    // Log final
    console.log('\n' + '═'.repeat(52));
    console.log(`✅ BACKUP COMPLETO!`);
    console.log(`   📊 ${totalRows} registos em ${successCount}/${tables.length} tabelas`);
    console.log(`   🏗️  Schema: ${metadata.infrastructure.schema?.status || 'n/a'}`);
    console.log(`   🔐 Auth: ${metadata.infrastructure.auth?.status || 'n/a'}`);
    console.log(`   🛡️  RLS: ${metadata.infrastructure.rls_policies?.status || 'n/a'}`);
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

            // Extrair data do nome da pasta (YYYY-MM-DD_HH-MM-SS)
            const dateStr = entry.name.slice(0, 10);
            const folderDate = new Date(dateStr);

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
    const logLine = `[${metadata.timestamp}] status=${metadata.status} tables=${metadata.tables_ok}/${metadata.tables_ok + metadata.tables_failed} rows=${metadata.total_rows} duration=${metadata.duration_ms}ms\n`;

    fs.appendFileSync(logFile, logLine, 'utf-8');
}

// ==================== CLI ====================

// Verificar argumentos CLI
const args = process.argv.slice(2);
let overridePath = null;

const pathIndex = args.indexOf('--path');
if (pathIndex !== -1 && args[pathIndex + 1]) {
    overridePath = args[pathIndex + 1];
}

// Executar
runBackup(overridePath)
    .then(() => process.exit(0))
    .catch(err => {
        console.error('💀 Erro fatal:', err);
        process.exit(1);
    });

// Exportar para uso programático (API route)
module.exports = { runBackup };
