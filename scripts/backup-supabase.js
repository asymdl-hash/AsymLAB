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

    console.log('');
    console.log('╔══════════════════════════════════════════════╗');
    console.log('║        AsymLAB — Supabase Backup             ║');
    console.log('╚══════════════════════════════════════════════╝');
    console.log(`📅 Data: ${now.toLocaleString('pt-PT')}`);
    console.log(`📁 Destino: ${backupDir}`);
    console.log(`📊 Tabelas: ${tables.length}`);
    console.log('─'.repeat(48));

    const metadata = {
        timestamp: now.toISOString(),
        date: dateStr,
        supabase_url: supabaseUrl,
        tables: {},
        status: 'in_progress',
        duration_ms: 0,
        errors: []
    };

    const startTime = Date.now();
    let totalRows = 0;
    let successCount = 0;

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
            // Em Windows, ler e re-escrever ficheiro de referência
            fs.rmSync(latestPath, { recursive: true, force: true });
        }
        // Usar ficheiro de referência em vez de symlink (compatibilidade Windows)
        fs.writeFileSync(latestPath + '.txt', backupDir, 'utf-8');
    } catch (e) {
        // Não é crítico
    }

    // Limpar backups antigos (retenção)
    cleanOldBackups(basePath, config.backup.retention_days);

    // Log final
    console.log('─'.repeat(48));
    console.log(`✅ Backup completo!`);
    console.log(`   📊 ${totalRows} registos em ${successCount}/${tables.length} tabelas`);
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
