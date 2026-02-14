import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

function execAsync(cmd: string): Promise<{ stdout: string; stderr: string }> {
    return new Promise((resolve, reject) => {
        exec(cmd, (error, stdout, stderr) => {
            if (error) reject(error);
            else resolve({ stdout, stderr });
        });
    });
}

// POST — Validar path e/ou agendar backup
export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { action } = body;

        if (action === 'validate-path') {
            return await validatePath(body.path);
        }

        if (action === 'schedule') {
            return await scheduleBackup(body.time, body.batPath);
        }

        if (action === 'unschedule') {
            return await unscheduleBackup();
        }

        if (action === 'check-schedule') {
            return await checkSchedule();
        }

        if (action === 'copy-to-nas') {
            return await copyToNas(body.targetPath);
        }

        return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

// Validar se um path é acessível e tem permissão de escrita
async function validatePath(targetPath: string) {
    try {
        // Criar pasta de teste
        const testDir = path.join(targetPath, '.asymlab_test');
        fs.mkdirSync(testDir, { recursive: true });

        // Escrever ficheiro de teste
        const testFile = path.join(testDir, 'write_test.tmp');
        fs.writeFileSync(testFile, 'test', 'utf-8');

        // Limpar
        fs.unlinkSync(testFile);
        fs.rmdirSync(testDir);

        return NextResponse.json({
            valid: true,
            message: 'Diretório acessível com permissão de escrita'
        });
    } catch (err: any) {
        return NextResponse.json({
            valid: false,
            message: `Diretório inacessível: ${err.message}`
        });
    }
}

// Agendar no Windows Task Scheduler
async function scheduleBackup(time: string, batPath: string) {
    try {
        const cmd = `schtasks /create /tn "AsymLAB_Backup_Supabase" /tr "${batPath}" /sc daily /st ${time} /f`;

        const { stdout, stderr } = await execAsync(cmd);

        return NextResponse.json({
            success: true,
            message: 'Agendamento criado com sucesso!',
            output: stdout || stderr
        });
    } catch (err: any) {
        // Provavelmente precisa de admin
        const manualCommand = `schtasks /create /tn "AsymLAB_Backup_Supabase" /tr "${batPath}" /sc daily /st ${time} /f /rl HIGHEST`;
        return NextResponse.json({
            success: false,
            needs_admin: true,
            message: 'Necessita de permissão de administrador.',
            manual_command: manualCommand
        });
    }
}

// Verificar se já existe agendamento
async function checkSchedule() {
    try {
        const { stdout } = await execAsync('schtasks /query /tn "AsymLAB_Backup_Supabase" /fo csv /nh 2>&1');
        const isScheduled = stdout.includes('AsymLAB_Backup_Supabase');

        return NextResponse.json({
            scheduled: isScheduled,
            details: isScheduled ? stdout.trim() : null
        });
    } catch {
        return NextResponse.json({ scheduled: false });
    }
}

// Remover agendamento
async function unscheduleBackup() {
    try {
        await execAsync('schtasks /delete /tn "AsymLAB_Backup_Supabase" /f');
        return NextResponse.json({ success: true, message: 'Agendamento removido' });
    } catch (err: any) {
        return NextResponse.json({ success: false, message: err.message });
    }
}

// Copiar script e config para NAS
async function copyToNas(targetPath: string) {
    try {
        const projectRoot = process.cwd();

        // Criar estrutura na NAS
        const nasScriptsDir = path.join(targetPath, 'scripts');
        const nasConfigDir = path.join(targetPath, 'config');
        fs.mkdirSync(nasScriptsDir, { recursive: true });
        fs.mkdirSync(nasConfigDir, { recursive: true });

        // Copiar script de backup
        const scriptSrc = path.join(projectRoot, 'scripts', 'backup-supabase.js');
        const scriptDst = path.join(nasScriptsDir, 'backup-supabase.js');
        fs.copyFileSync(scriptSrc, scriptDst);

        // Copiar config (com path atualizado)
        const configSrc = path.join(projectRoot, 'DB', 'Supabase', 'config.json');
        const config = JSON.parse(fs.readFileSync(configSrc, 'utf-8'));
        config.backup.base_path = path.join(targetPath, 'DB', 'Supabase');
        fs.writeFileSync(path.join(nasConfigDir, 'config.json'), JSON.stringify(config, null, 4), 'utf-8');

        // Criar .env para NAS
        const envSrc = path.join(projectRoot, '.env.local');
        const envContent = fs.readFileSync(envSrc, 'utf-8');
        // Extrair apenas as variáveis do Supabase
        const supabaseVars = envContent
            .split('\n')
            .filter(l => l.includes('SUPABASE'))
            .join('\n');
        fs.writeFileSync(path.join(nasConfigDir, '.env.local'), supabaseVars + '\n', 'utf-8');

        // Criar script de arranque para NAS (bash)
        const bashScript = `#!/bin/bash
# AsymLAB Backup — Script para NAS
cd "$(dirname "$0")"
export $(cat ../config/.env.local | xargs)
node backup-supabase.js --path "${config.backup.base_path}"
`;
        fs.writeFileSync(path.join(nasScriptsDir, 'run-backup.sh'), bashScript, 'utf-8');

        return NextResponse.json({
            success: true,
            message: 'Ficheiros copiados para a NAS com sucesso!',
            files: [
                scriptDst,
                path.join(nasConfigDir, 'config.json'),
                path.join(nasConfigDir, '.env.local'),
                path.join(nasScriptsDir, 'run-backup.sh')
            ]
        });
    } catch (err: any) {
        return NextResponse.json({
            success: false,
            message: `Erro ao copiar: ${err.message}`
        });
    }
}
