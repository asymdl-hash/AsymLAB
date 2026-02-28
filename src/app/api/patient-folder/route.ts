import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, renameSync, readdirSync, copyFileSync, statSync } from 'fs';
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

        let token = '';
        if (authHeader?.startsWith('Bearer ')) {
            token = authHeader.replace('Bearer ', '');
        } else if (cookieHeader) {
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

        if (!token) return { authorized: false };

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

function sanitizeId(t_id: string): string {
    return t_id.replace(/[^a-zA-Z0-9\-_]/g, '');
}

// ═══════════════════════════════════════════════════════════
// POST — Criar pasta + opcionalmente abrir no Explorer
// Body: { t_id: string, silent?: boolean }
// ═══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const { t_id, silent } = await request.json();
        if (!t_id || typeof t_id !== 'string') {
            return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });
        }

        const safeId = sanitizeId(t_id);
        if (!safeId) return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });

        const folderPath = path.join(PATIENTS_BASE_PATH, safeId);

        if (!existsSync(PATIENTS_BASE_PATH)) {
            mkdirSync(PATIENTS_BASE_PATH, { recursive: true });
        }

        if (!existsSync(folderPath)) {
            mkdirSync(folderPath, { recursive: true });
        }

        if (!silent) {
            // Usar start para abrir Explorer (mais fiável que exec('explorer'))
            const cmd = `start "" "${folderPath}"`;
            exec(cmd, (error, stdout, stderr) => {
                if (error) console.error('Erro ao abrir pasta:', error.message, stderr);
            });
        }

        return NextResponse.json({ success: true, path: folderPath });
    } catch (error) {
        console.error('Erro POST patient-folder:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════
// DELETE — Arquivar pasta (soft delete → renomeia com _DELETED_)
// Body: { t_id: string }
// ═══════════════════════════════════════════════════════════
export async function DELETE(request: NextRequest) {
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const { t_id } = await request.json();
        if (!t_id || typeof t_id !== 'string') {
            return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });
        }

        const safeId = sanitizeId(t_id);
        if (!safeId) return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });

        const folderPath = path.join(PATIENTS_BASE_PATH, safeId);

        if (!existsSync(folderPath)) {
            return NextResponse.json({ success: true, message: 'Pasta não existia' });
        }

        // Renomear para _DELETED_ (arquivar, não apagar)
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivedName = `_DELETED_${safeId}_${timestamp}`;
        const archivedPath = path.join(PATIENTS_BASE_PATH, archivedName);

        renameSync(folderPath, archivedPath);

        return NextResponse.json({
            success: true,
            message: `Pasta arquivada: ${archivedName}`,
            archivedPath,
        });
    } catch (error) {
        console.error('Erro DELETE patient-folder:', error);
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════
// PATCH — Merge pastas (duplicado → paciente existente)
// Body: { source_t_id: string, target_t_id: string }
// Copia ficheiros da pasta source para target, depois arquiva source
// ═══════════════════════════════════════════════════════════
export async function PATCH(request: NextRequest) {
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const { source_t_id, target_t_id } = await request.json();
        if (!source_t_id || !target_t_id) {
            return NextResponse.json({ error: 'source_t_id e target_t_id obrigatórios' }, { status: 400 });
        }

        const sourceId = sanitizeId(source_t_id);
        const targetId = sanitizeId(target_t_id);
        if (!sourceId || !targetId) return NextResponse.json({ error: 'T-IDs inválidos' }, { status: 400 });

        const sourcePath = path.join(PATIENTS_BASE_PATH, sourceId);
        const targetPath = path.join(PATIENTS_BASE_PATH, targetId);

        // Criar pasta destino se não existir
        if (!existsSync(targetPath)) {
            mkdirSync(targetPath, { recursive: true });
        }

        let filesMoved = 0;

        // Copiar ficheiros da source para target
        if (existsSync(sourcePath)) {
            const copyRecursive = (src: string, dest: string) => {
                const entries = readdirSync(src, { withFileTypes: true });
                for (const entry of entries) {
                    const srcPath = path.join(src, entry.name);
                    const destPath = path.join(dest, entry.name);

                    if (entry.isDirectory()) {
                        if (!existsSync(destPath)) mkdirSync(destPath, { recursive: true });
                        copyRecursive(srcPath, destPath);
                    } else {
                        // Se ficheiro já existe no destino, renomear com sufixo
                        let finalDest = destPath;
                        if (existsSync(destPath)) {
                            const ext = path.extname(entry.name);
                            const base = path.basename(entry.name, ext);
                            finalDest = path.join(dest, `${base}_from_${sourceId}${ext}`);
                        }
                        copyFileSync(srcPath, finalDest);
                        filesMoved++;
                    }
                }
            };

            copyRecursive(sourcePath, targetPath);

            // Arquivar pasta source (não apagar) — pode falhar se pasta aberta
            let archived = false;
            try {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
                const archivedName = `_MERGED_${sourceId}_to_${targetId}_${timestamp}`;
                const archivedPath = path.join(PATIENTS_BASE_PATH, archivedName);
                renameSync(sourcePath, archivedPath);
                archived = true;
            } catch (renameErr: any) {
                console.warn('Aviso: ficheiros copiados mas pasta source não pôde ser arquivada (pode estar aberta):', renameErr.message);
            }

            return NextResponse.json({
                success: true,
                filesMoved,
                archived,
                message: `${filesMoved} ficheiros movidos de ${sourceId} para ${targetId}${archived ? '' : ' (pasta source mantida - fechar Explorer e tentar novamente)'}`,
            });
        }

        return NextResponse.json({
            success: true,
            filesMoved: 0,
            message: `Pasta source ${sourceId} não existia`,
        });
    } catch (error: any) {
        console.error('Erro PATCH patient-folder:', error?.message || error);
        return NextResponse.json({ error: 'Erro interno', details: error?.message || String(error) }, { status: 500 });
    }
}

// ═══════════════════════════════════════════════════════════
// GET — Verificar se pasta existe
// ═══════════════════════════════════════════════════════════
export async function GET(request: NextRequest) {
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const t_id = searchParams.get('t_id');
    if (!t_id) return NextResponse.json({ error: 'T-ID obrigatório' }, { status: 400 });

    const safeId = sanitizeId(t_id);
    const folderPath = path.join(PATIENTS_BASE_PATH, safeId);

    return NextResponse.json({
        exists: existsSync(folderPath),
        path: folderPath,
    });
}
