import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Tabelas a exportar (sincronizado com config.json)
const TABLES = [
    'clinics',
    'clinic_contacts',
    'clinic_delivery_points',
    'clinic_staff',
    'clinic_discounts',
    'organization_settings'
];

// Ler config para base_path
function getBasePath(): string {
    try {
        const configPath = path.resolve(process.cwd(), 'DB', 'Supabase', 'config.json');
        const raw = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(raw);
        return config.backup.base_path;
    } catch {
        return path.resolve(process.cwd(), 'DB', 'Supabase');
    }
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

        // Criar pasta com timestamp
        const now = new Date();
        const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const dateStr = now.toISOString().slice(0, 10);
        const backupDir = path.join(basePath, 'backups', `${dateStr}_${timestamp.slice(11)}`);

        fs.mkdirSync(backupDir, { recursive: true });

        const results: Record<string, { rows: number; status: string; error?: string }> = {};
        let totalRows = 0;
        let errors = 0;

        for (const table of TABLES) {
            try {
                let allData: any[] = [];
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

                const filePath = path.join(backupDir, `${table}.json`);
                fs.writeFileSync(filePath, JSON.stringify(allData, null, 2), 'utf-8');

                results[table] = { rows: allData.length, status: 'ok' };
                totalRows += allData.length;
            } catch (err: any) {
                results[table] = { rows: 0, status: 'error', error: err.message };
                errors++;
            }
        }

        // Guardar metadata
        const metadata = {
            timestamp: now.toISOString(),
            date: dateStr,
            trigger: 'manual',
            tables: results,
            total_rows: totalRows,
            tables_ok: TABLES.length - errors,
            tables_failed: errors,
            status: errors === 0 ? 'success' : 'partial'
        };

        fs.writeFileSync(
            path.join(backupDir, '_metadata.json'),
            JSON.stringify(metadata, null, 2),
            'utf-8'
        );

        // Log
        const logsDir = path.join(basePath, 'logs');
        fs.mkdirSync(logsDir, { recursive: true });
        const logLine = `[${metadata.timestamp}] trigger=manual status=${metadata.status} tables=${metadata.tables_ok}/${TABLES.length} rows=${totalRows}\n`;
        fs.appendFileSync(path.join(logsDir, 'backup.log'), logLine, 'utf-8');

        return NextResponse.json({
            success: true,
            message: `Backup concluído: ${totalRows} registos em ${TABLES.length - errors}/${TABLES.length} tabelas`,
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
        const latestFile = path.join(basePath, 'backups', 'latest.txt');

        if (fs.existsSync(latestFile)) {
            const latestDir = fs.readFileSync(latestFile, 'utf-8').trim();
            const metaFile = path.join(latestDir, '_metadata.json');

            if (fs.existsSync(metaFile)) {
                const meta = JSON.parse(fs.readFileSync(metaFile, 'utf-8'));
                return NextResponse.json({ lastBackup: meta });
            }
        }

        // Fallback: procurar a pasta mais recente
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
