import { NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const CONFIG_PATH = path.resolve(process.cwd(), 'DB', 'Supabase', 'config.json');

function readConfig() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function writeConfig(config: any) {
    fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 4), 'utf-8');
}

// GET — Ler configuração atual + lista de backups
export async function GET() {
    try {
        const config = readConfig();
        if (!config) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
        }

        // Listar backups existentes
        const backupsDir = path.join(config.backup.base_path, 'backups');
        let backups: any[] = [];

        if (fs.existsSync(backupsDir)) {
            const entries = fs.readdirSync(backupsDir, { withFileTypes: true })
                .filter(e => e.isDirectory() && (e.name.startsWith('FULL_') || e.name.startsWith('INCR_')))
                .sort((a, b) => b.name.localeCompare(a.name));

            for (const entry of entries.slice(0, 10)) { // Últimos 10 backups
                const metaPath = path.join(backupsDir, entry.name, '_metadata.json');
                if (fs.existsSync(metaPath)) {
                    try {
                        const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
                        backups.push({
                            folder: entry.name,
                            ...meta
                        });
                    } catch {
                        backups.push({ folder: entry.name, status: 'unknown' });
                    }
                }
            }
        }

        // Contar total de backups
        let totalBackups = 0;
        let totalFull = 0;
        let totalIncremental = 0;
        if (fs.existsSync(backupsDir)) {
            const allEntries = fs.readdirSync(backupsDir, { withFileTypes: true })
                .filter(e => e.isDirectory() && (e.name.startsWith('FULL_') || e.name.startsWith('INCR_')));
            totalBackups = allEntries.length;
            totalFull = allEntries.filter(e => e.name.startsWith('FULL_')).length;
            totalIncremental = allEntries.filter(e => e.name.startsWith('INCR_')).length;
        }

        // Calcular tamanho total
        let totalSizeBytes = 0;
        if (fs.existsSync(backupsDir)) {
            totalSizeBytes = getDirSize(backupsDir);
        }

        return NextResponse.json({
            config: {
                base_path: config.backup.base_path,
                retention_days: config.backup.retention_days,
                default_mode: config.backup.default_mode || 'auto',
                full_backup_interval_days: config.backup.full_backup_interval_days || 7,
                schedule_time: config.backup.schedule?.time || '23:30',
                schedule_enabled: config.backup.schedule?.enabled ?? true,
                tables: config.supabase.tables
            },
            backups,
            stats: {
                total_backups: totalBackups,
                total_full: totalFull,
                total_incremental: totalIncremental,
                total_size_bytes: totalSizeBytes,
                total_size_display: formatBytes(totalSizeBytes)
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// PUT — Atualizar configuração
export async function PUT(request: Request) {
    try {
        const body = await request.json();
        const config = readConfig();

        if (!config) {
            return NextResponse.json({ error: 'Configuração não encontrada' }, { status: 404 });
        }

        // Atualizar campos permitidos
        if (body.base_path !== undefined) {
            // Validar se o path novo é acessível
            try {
                fs.mkdirSync(body.base_path, { recursive: true });
                config.backup.base_path = body.base_path;
            } catch (err: any) {
                return NextResponse.json({
                    error: `Caminho inválido ou inacessível: ${err.message}`
                }, { status: 400 });
            }
        }

        if (body.retention_days !== undefined) {
            const days = parseInt(body.retention_days);
            if (isNaN(days) || days < 1 || days > 365) {
                return NextResponse.json({ error: 'Retenção deve ser entre 1 e 365 dias' }, { status: 400 });
            }
            config.backup.retention_days = days;
        }

        if (body.schedule_time !== undefined) {
            // Validar formato HH:MM
            if (!/^\d{2}:\d{2}$/.test(body.schedule_time)) {
                return NextResponse.json({ error: 'Horário deve estar no formato HH:MM' }, { status: 400 });
            }
            config.backup.schedule.time = body.schedule_time;
        }

        if (body.schedule_enabled !== undefined) {
            config.backup.schedule.enabled = !!body.schedule_enabled;
        }

        if (body.default_mode !== undefined) {
            if (!['auto', 'full', 'incremental'].includes(body.default_mode)) {
                return NextResponse.json({ error: 'Modo deve ser: auto, full ou incremental' }, { status: 400 });
            }
            config.backup.default_mode = body.default_mode;
        }

        if (body.full_backup_interval_days !== undefined) {
            const days = parseInt(body.full_backup_interval_days);
            if (isNaN(days) || days < 1 || days > 30) {
                return NextResponse.json({ error: 'Intervalo FULL deve ser entre 1 e 30 dias' }, { status: 400 });
            }
            config.backup.full_backup_interval_days = days;
        }

        writeConfig(config);

        return NextResponse.json({
            success: true,
            message: 'Configuração atualizada com sucesso',
            config: {
                base_path: config.backup.base_path,
                retention_days: config.backup.retention_days,
                default_mode: config.backup.default_mode,
                full_backup_interval_days: config.backup.full_backup_interval_days,
                schedule_time: config.backup.schedule.time,
                schedule_enabled: config.backup.schedule.enabled
            }
        });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Helpers
function getDirSize(dirPath: string): number {
    let size = 0;
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isFile()) {
                size += fs.statSync(fullPath).size;
            } else if (entry.isDirectory()) {
                size += getDirSize(fullPath);
            }
        }
    } catch { /* ignore */ }
    return size;
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
