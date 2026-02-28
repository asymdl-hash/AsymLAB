import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync } from 'fs';
import { exec } from 'child_process';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Base path — ajustar quando migrar para NAS
const PATIENTS_BASE_PATH = 'F:\\AsymLAB\\DB\\Pacientes';

// Roles autorizados a aceder ao filesystem
const ALLOWED_ROLES = ['admin', 'staff_lab'];

async function verifyLabStaff(request: NextRequest): Promise<{ authorized: boolean; role?: string }> {
    try {
        const authHeader = request.headers.get('authorization');
        const cookieHeader = request.headers.get('cookie');

        // Extrair token do cookie sb-access-token ou Authorization header
        let token = '';
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        } else if (cookieHeader) {
            // Procurar cookie de sessão Supabase
            const match = cookieHeader.match(/sb-[^=]+-auth-token[^=]*=([^;]+)/);
            if (match) {
                try {
                    const decoded = decodeURIComponent(match[1]);
                    const parsed = JSON.parse(decoded);
                    token = Array.isArray(parsed) ? parsed[0] : parsed.access_token || '';
                } catch {
                    token = match[1];
                }
            }
        }

        if (!token) {
            return { authorized: false };
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        const { data: { user }, error } = await supabase.auth.getUser(token);
        if (error || !user) return { authorized: false };

        const { data: profile } = await supabase
            .from('user_profiles')
            .select('app_role')
            .eq('user_id', user.id)
            .single();

        const role = profile?.app_role || 'staff_lab';
        return { authorized: ALLOWED_ROLES.includes(role), role };
    } catch {
        return { authorized: false };
    }
}

export async function POST(request: NextRequest) {
    // 🔒 Verificação de role — só admin e staff_lab
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado — apenas staff do laboratório' }, { status: 403 });
    }

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
        });
    } catch (error) {
        console.error('Erro na API patient-folder:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

export async function GET(request: NextRequest) {
    // 🔒 Verificação de role — só admin e staff_lab
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

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
