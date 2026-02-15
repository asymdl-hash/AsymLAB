import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Admin client para operações que precisam de privilégios
function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    if (!url || !serviceKey) throw new Error('Missing admin credentials');
    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

// GET - Obter dados do utilizador logado
export async function GET(request: NextRequest) {
    try {
        const admin = getAdminClient();

        // Extrair o user_id do token de autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await admin.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        // Buscar profile
        const { data: profile } = await admin
            .from('user_profiles')
            .select('*')
            .eq('user_id', user.id)
            .single();

        // Buscar clínicas
        const { data: clinics } = await admin
            .from('user_clinic_access')
            .select('*, clinics(commercial_name, slug)')
            .eq('user_id', user.id);

        const isUsernameAccount = user.email?.endsWith('@asymlab.app') || false;
        const username = isUsernameAccount
            ? user.email?.replace('@asymlab.app', '') || null
            : null;

        return NextResponse.json({
            id: user.id,
            email: user.email,
            username,
            is_username_account: isUsernameAccount,
            full_name: profile?.full_name || 'Sem nome',
            app_role: profile?.app_role || 'staff',
            avatar_url: profile?.avatar_url || null,
            created_at: user.created_at,
            last_sign_in_at: user.last_sign_in_at,
            clinics: (clinics || []).map(c => ({
                clinic_id: c.clinic_id,
                clinic_name: c.clinics?.commercial_name || 'N/A',
                clinic_role: c.clinic_role
            }))
        });
    } catch (error: any) {
        console.error('Error getting account:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao obter dados da conta' },
            { status: 500 }
        );
    }
}

// PATCH - Atualizar dados do próprio utilizador
export async function PATCH(request: NextRequest) {
    try {
        const admin = getAdminClient();

        // Validar autenticação
        const authHeader = request.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user }, error: authError } = await admin.auth.getUser(token);
        if (authError || !user) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        const body = await request.json();
        const { action, ...data } = body;

        switch (action) {
            case 'update_password': {
                if (!data.new_password || data.new_password.length < 6) {
                    return NextResponse.json(
                        { error: 'Nova password deve ter pelo menos 6 caracteres' },
                        { status: 400 }
                    );
                }

                // Verificar password actual
                const { error: signInError } = await admin.auth.signInWithPassword({
                    email: user.email!,
                    password: data.current_password
                });

                if (signInError) {
                    return NextResponse.json(
                        { error: 'Password actual incorrecta' },
                        { status: 400 }
                    );
                }

                const { error } = await admin.auth.admin.updateUserById(user.id, {
                    password: data.new_password
                });

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Password alterada com sucesso'
                });
            }

            case 'update_username': {
                const isUsernameAccount = user.email?.endsWith('@asymlab.app');
                if (!isUsernameAccount) {
                    return NextResponse.json(
                        { error: 'Apenas contas por username podem alterar o username' },
                        { status: 400 }
                    );
                }

                const newUsername = data.new_username?.toLowerCase().trim().replace(/[^a-z0-9._-]/g, '');
                if (!newUsername || newUsername.length < 3) {
                    return NextResponse.json(
                        { error: 'Username deve ter pelo menos 3 caracteres (só letras, números, pontos e hífens)' },
                        { status: 400 }
                    );
                }

                const newEmail = `${newUsername}@asymlab.app`;

                // Verificar se já existe
                const { data: existingUsers } = await admin.auth.admin.listUsers();
                const emailExists = existingUsers.users.some(u => u.email === newEmail && u.id !== user.id);
                if (emailExists) {
                    return NextResponse.json(
                        { error: `O username "${newUsername}" já está em uso` },
                        { status: 400 }
                    );
                }

                const { error } = await admin.auth.admin.updateUserById(user.id, {
                    email: newEmail,
                    email_confirm: true
                });

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: `Username alterado para "${newUsername}"`,
                    new_username: newUsername
                });
            }

            case 'update_name': {
                if (!data.full_name?.trim()) {
                    return NextResponse.json(
                        { error: 'Nome é obrigatório' },
                        { status: 400 }
                    );
                }

                const { error } = await admin
                    .from('user_profiles')
                    .update({ full_name: data.full_name.trim() })
                    .eq('user_id', user.id);

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Nome atualizado com sucesso'
                });
            }

            case 'update_avatar': {
                if (!data.avatar_url?.trim()) {
                    return NextResponse.json(
                        { error: 'URL do avatar é obrigatório' },
                        { status: 400 }
                    );
                }

                const { error } = await admin
                    .from('user_profiles')
                    .update({ avatar_url: data.avatar_url.trim() })
                    .eq('user_id', user.id);

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Foto de perfil atualizada'
                });
            }

            default:
                return NextResponse.json(
                    { error: `Ação desconhecida: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error updating account:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao atualizar conta' },
            { status: 500 }
        );
    }
}
