import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import path from 'path';

// Base path — ajustar quando migrar para NAS
const PATIENTS_BASE_PATH = 'F:\\AsymLAB\\DB\\Pacientes';

export async function POST(request: NextRequest) {
    try {
        const { t_id } = await request.json();

        if (!t_id || typeof t_id !== 'string') {
            return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });
        }

        // Sanitizar o T-ID para evitar path traversal
        const safeId = t_id.replace(/[^a-zA-Z0-9\-_]/g, '');
        if (!safeId) {
            return NextResponse.json({ error: 'T-ID inválido após sanitização' }, { status: 400 });
        }

        const folderPath = path.join(PATIENTS_BASE_PATH, safeId);

        // Criar pasta base se não existir
        if (!existsSync(PATIENTS_BASE_PATH)) {
            mkdirSync(PATIENTS_BASE_PATH, { recursive: true });
        }

        // Criar pasta do paciente se não existir
        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        // Abrir no File Explorer (Windows)
        exec(`explorer "${folderPath}"`, (error) => {
            if (error) {
                console.error('Erro ao abrir explorer:', error);
            }
        });

        return NextResponse.json({
            success: true,
            path: folderPath,
            created: !existsSync(folderPath),
        });
    } catch (error) {
        console.error('Erro na API patient-folder:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const t_id = searchParams.get('t_id');

    if (!t_id) {
        return NextResponse.json({ error: 'T-ID obrigatório' }, { status: 400 });
    }

    const safeId = t_id.replace(/[^a-zA-Z0-9\-_]/g, '');
    const folderPath = path.join(PATIENTS_BASE_PATH, safeId);

    return NextResponse.json({
        exists: existsSync(folderPath),
        path: folderPath,
    });
}
