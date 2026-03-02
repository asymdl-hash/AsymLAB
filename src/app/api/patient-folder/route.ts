import { NextRequest, NextResponse } from 'next/server';
import { existsSync, mkdirSync, readdirSync, copyFileSync } from 'fs';
import { rename } from 'fs/promises';
import { spawn } from 'child_process';
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

function sanitizeFolderName(name: string): string {
    // Permitir caracteres UTF-8 comuns mas remover chars perigosos para filesystem
    return name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '').trim() || 'Sem Info';
}

// ═══════════════════════════════════════════════════════════
// Hierarquias de subpastas conforme PACIENTES_NAS.md
// ═══════════════════════════════════════════════════════════

const PATIENT_SUBFOLDERS = [
    'Chat Interno',
    'Chat Interno/Galeria',
    'Historico',
    'Info',
    'Info/Alertas',
    'Info/Logo',
];

const PLAN_SUBFOLDERS = [
    'Info Plano',
    'Info Plano/CBCT',
    'Info Plano/Considerações',
    'Info Plano/Escala de Cor',
    'Info Plano/Face',
    'Info Plano/Face/Natural',
    'Info Plano/Face/Repouso',
    'Info Plano/Face/Sorriso Alto',
    'Info Plano/Intra-Orais',
    'Info Plano/Orto-Periapical',
    'Info Plano/Outras Fotos',
    'Info Plano/Relatório Plano',
    "Info Plano/Stl's",
];

const PHASE_SUBFOLDERS = [
    'Documentação',
    'Documentação/Faturas',
    'Documentação/Recibos',
    'Documentação/Outros Documentos',
];

const APPOINTMENT_SUBFOLDERS = [
    'Componentes',
    'Dentes',
    'Fresagem',
    'Guias',
    'Guias/Guia Recepção',
    'Guias/Guia Transporte',
];

function ensureDirs(basePath: string, subfolders: string[]) {
    if (!existsSync(basePath)) {
        mkdirSync(basePath, { recursive: true });
    }
    for (const sub of subfolders) {
        const fullPath = path.join(basePath, sub);
        if (!existsSync(fullPath)) {
            mkdirSync(fullPath, { recursive: true });
        }
    }
}

function openInExplorer(folderPath: string) {
    const child = spawn('explorer.exe', [folderPath], {
        detached: true,
        stdio: 'ignore',
    });
    child.unref();
}

async function retryRename(oldPath: string, newPath: string, maxRetries = 3): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
        try {
            await rename(oldPath, newPath);
            return;
        } catch (err: unknown) {
            const code = (err as NodeJS.ErrnoException).code;
            if (code === 'EPERM' && i < maxRetries - 1) {
                console.warn(`[NAS] EPERM ao renomear (tentativa ${i + 1}/${maxRetries}), a tentar novamente...`);
                await new Promise(r => setTimeout(r, 500 * (i + 1)));
                continue;
            }
            // Fallback: copiar recursivamente + apagar original
            if (code === 'EPERM') {
                console.warn('[NAS] EPERM persistente — usando fallback copy+delete');
                const { cpSync, rmSync } = await import('fs');
                cpSync(oldPath, newPath, { recursive: true });
                try { rmSync(oldPath, { recursive: true, force: true }); }
                catch { console.warn('[NAS] Não foi possível apagar pasta original (será limpa mais tarde)'); }
                return;
            }
            throw err;
        }
    }
}

// Regras de nomeação conforme PACIENTES_NAS.md §2
const APPT_TYPE_LABELS: Record<string, string> = {
    moldagem: 'Moldagem',
    para_prova: 'Prova',
    para_colocacao: 'Colocação',
    reparacao: 'Reparação',
    ajuste: 'Ajuste',
    outro: 'Outro',
};

// ═══════════════════════════════════════════════════════════
// POST — Criar pastas com hierarquia completa
// Suporta múltiplas acções:
//   { action: "create_patient", t_id }
//   { action: "create_plan", t_id, plan_order }
//   { action: "create_phase", t_id, plan_order, phase_order, phase_name }
//   { action: "create_appointment", t_id, plan_order, phase_order, phase_name,
//     appt_order, appt_type, appt_date }
//   { action: "open", t_id }  — apenas abre no Explorer
//   { t_id, silent? }         — backward compatible (cria raiz + abre)
// ═══════════════════════════════════════════════════════════
export async function POST(request: NextRequest) {
    const auth = await verifyLabStaff(request);
    if (!auth.authorized) {
        return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    try {
        const body = await request.json();
        const { action, t_id, silent } = body;

        if (!t_id || typeof t_id !== 'string') {
            return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });
        }

        const safeId = sanitizeId(t_id);
        if (!safeId) return NextResponse.json({ error: 'T-ID inválido' }, { status: 400 });

        const patientPath = path.join(PATIENTS_BASE_PATH, safeId);

        // Garantir que a pasta base de pacientes existe
        if (!existsSync(PATIENTS_BASE_PATH)) {
            mkdirSync(PATIENTS_BASE_PATH, { recursive: true });
        }

        switch (action) {
            // ─── Criar paciente com subpastas ───
            case 'create_patient': {
                ensureDirs(patientPath, PATIENT_SUBFOLDERS);
                return NextResponse.json({
                    success: true,
                    path: patientPath,
                    created: PATIENT_SUBFOLDERS,
                });
            }

            // ─── Criar plano com subpastas ───
            case 'create_plan': {
                const planOrder = body.plan_order || 1;
                const planFolderName = `Plano ${planOrder}`;
                const planPath = path.join(patientPath, planFolderName);

                ensureDirs(planPath, PLAN_SUBFOLDERS);
                return NextResponse.json({
                    success: true,
                    path: planPath,
                    created: PLAN_SUBFOLDERS,
                });
            }

            // ─── Criar fase com subpastas ───
            case 'create_phase': {
                const pOrder = body.plan_order || 1;
                const phOrder = body.phase_order || 1;
                const phName = sanitizeFolderName(body.phase_name || 'Sem Info');
                const phaseFolderName = `Fase ${phOrder} + ${phName}`;
                const phasePath = path.join(patientPath, `Plano ${pOrder}`, phaseFolderName);

                ensureDirs(phasePath, PHASE_SUBFOLDERS);
                return NextResponse.json({
                    success: true,
                    path: phasePath,
                    created: PHASE_SUBFOLDERS,
                });
            }

            // ─── Criar agendamento com subpastas ───
            case 'create_appointment': {
                const plOrder = body.plan_order || 1;
                const fOrder = body.phase_order || 1;
                const fName = sanitizeFolderName(body.phase_name || 'Sem Info');
                const aOrder = body.appt_order || 1;
                const aType = APPT_TYPE_LABELS[body.appt_type] || 'Outro';
                const aDate = body.appt_date
                    ? new Date(body.appt_date).toLocaleDateString('pt-PT', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                    }).replace(/\//g, '-')
                    : 'Sem Info';
                const apptFolderName = `Ag ${aOrder} + ${aType} + ${aDate}`;
                const apptPath = path.join(
                    patientPath,
                    `Plano ${plOrder}`,
                    `Fase ${fOrder} + ${fName}`,
                    apptFolderName
                );

                ensureDirs(apptPath, APPOINTMENT_SUBFOLDERS);
                return NextResponse.json({
                    success: true,
                    path: apptPath,
                    created: APPOINTMENT_SUBFOLDERS,
                });
            }

            // ─── Renomear pasta de agendamento (tipo ou data mudou) ───
            case 'rename_appointment': {
                const rPlOrder = body.plan_order || 1;
                const rFOrder = body.phase_order || 1;
                const rFName = sanitizeFolderName(body.phase_name || 'Sem Info');
                const rAOrder = body.appt_order || 1;
                const rAType = APPT_TYPE_LABELS[body.appt_type] || 'Outro';
                const rADate = body.appt_date
                    ? new Date(body.appt_date).toLocaleDateString('pt-PT', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                    }).replace(/\//g, '-')
                    : 'Sem Info';

                const phaseDirPath = path.join(
                    patientPath,
                    `Plano ${rPlOrder}`,
                    `Fase ${rFOrder} + ${rFName}`
                );

                const newApptName = `Ag ${rAOrder} + ${rAType} + ${rADate}`;

                // Procurar pasta existente com prefixo "Ag {order} + "
                if (existsSync(phaseDirPath)) {
                    const entries = readdirSync(phaseDirPath, { withFileTypes: true });
                    const prefix = `Ag ${rAOrder} + `;
                    const existing = entries.find(e => e.isDirectory() && e.name.startsWith(prefix));

                    if (existing && existing.name !== newApptName) {
                        const oldPath = path.join(phaseDirPath, existing.name);
                        const newPath = path.join(phaseDirPath, newApptName);
                        await retryRename(oldPath, newPath);
                        return NextResponse.json({
                            success: true,
                            renamed: true,
                            from: existing.name,
                            to: newApptName,
                            path: newPath,
                        });
                    }

                    // Se não existe, criar a pasta (fallback)
                    if (!existing) {
                        const newPath = path.join(phaseDirPath, newApptName);
                        ensureDirs(newPath, APPOINTMENT_SUBFOLDERS);
                        return NextResponse.json({
                            success: true,
                            renamed: false,
                            created: true,
                            path: newPath,
                        });
                    }
                }

                return NextResponse.json({
                    success: true,
                    renamed: false,
                    message: 'Pasta já tem o nome correcto ou fase não existe',
                });
            }

            // ─── Verificar ficheiros na pasta Fresagem ───
            case 'check_milling_files': {
                const cmPlOrder = body.plan_order || 1;
                const cmFOrder = body.phase_order || 1;
                const cmFName = sanitizeFolderName(body.phase_name || 'Sem Info');
                const cmAOrder = body.appt_order || 1;

                const cmPhasePath = path.join(
                    patientPath,
                    `Plano ${cmPlOrder}`,
                    `Fase ${cmFOrder} + ${cmFName}`
                );

                // Encontrar pasta do agendamento pelo prefixo
                if (existsSync(cmPhasePath)) {
                    const entries = readdirSync(cmPhasePath, { withFileTypes: true });
                    const prefix = `Ag ${cmAOrder} + `;
                    const apptDir = entries.find(e => e.isDirectory() && e.name.startsWith(prefix));

                    if (apptDir) {
                        const fresagemPath = path.join(cmPhasePath, apptDir.name, 'Fresagem');
                        if (existsSync(fresagemPath)) {
                            const files = readdirSync(fresagemPath);
                            // Ignorar PDFs automáticos e pastas
                            const designFiles = files.filter(f => {
                                const ext = f.toLowerCase().split('.').pop() || '';
                                return !['pdf'].includes(ext) && f !== '.gitkeep';
                            });
                            return NextResponse.json({
                                success: true,
                                hasFiles: designFiles.length > 0,
                                fileCount: designFiles.length,
                                files: designFiles.slice(0, 10), // primeiros 10 para debug
                                path: fresagemPath,
                            });
                        }
                        return NextResponse.json({ success: true, hasFiles: false, path: fresagemPath });
                    }
                }
                return NextResponse.json({ success: true, hasFiles: false });
            }

            // ─── Abrir subpasta específica no Explorer ───
            case 'open_subfolder': {
                const osPlOrder = body.plan_order || 1;
                const osFOrder = body.phase_order || 1;
                const osFName = sanitizeFolderName(body.phase_name || 'Sem Info');
                const osAOrder = body.appt_order || 1;
                const subfolder = body.subfolder || 'Fresagem';

                const osPhasePath = path.join(
                    patientPath,
                    `Plano ${osPlOrder}`,
                    `Fase ${osFOrder} + ${osFName}`
                );

                if (existsSync(osPhasePath)) {
                    const entries = readdirSync(osPhasePath, { withFileTypes: true });
                    const prefix = `Ag ${osAOrder} + `;
                    const apptDir = entries.find(e => e.isDirectory() && e.name.startsWith(prefix));

                    if (apptDir) {
                        const targetPath = path.join(osPhasePath, apptDir.name, String(subfolder));
                        if (existsSync(targetPath)) {
                            openInExplorer(targetPath);
                            return NextResponse.json({ success: true, path: targetPath });
                        }
                        // Criar se não existir
                        mkdirSync(targetPath, { recursive: true });
                        openInExplorer(targetPath);
                        return NextResponse.json({ success: true, path: targetPath, created: true });
                    }
                }
                return NextResponse.json({ error: 'Pasta não encontrada' }, { status: 404 });
            }

            // ─── Apenas abrir no Explorer ───
            case 'open': {
                if (existsSync(patientPath)) {
                    openInExplorer(patientPath);
                    return NextResponse.json({ success: true, path: patientPath });
                }
                return NextResponse.json({ error: 'Pasta não existe' }, { status: 404 });
            }

            // ─── Backward compatible (sem action) ───
            default: {
                // Cria pasta raiz + subpastas do paciente
                ensureDirs(patientPath, PATIENT_SUBFOLDERS);

                if (!silent) {
                    openInExplorer(patientPath);
                }

                return NextResponse.json({ success: true, path: patientPath });
            }
        }
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const stack = error instanceof Error ? error.stack : '';
        console.error('Erro POST patient-folder:', msg, stack);
        return NextResponse.json({ error: 'Erro interno', detail: msg }, { status: 500 });
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

        await retryRename(folderPath, archivedPath);

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
                await retryRename(sourcePath, archivedPath);
                archived = true;
            } catch (renameErr: unknown) {
                const msg = renameErr instanceof Error ? renameErr.message : String(renameErr);
                console.warn('Aviso: ficheiros copiados mas pasta source não pôde ser arquivada (pode estar aberta):', msg);
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
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('Erro PATCH patient-folder:', msg);
        return NextResponse.json({ error: 'Erro interno', details: msg }, { status: 500 });
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
