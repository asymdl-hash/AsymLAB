import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Admin client com Service Role Key para operações administrativas
function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials (SUPABASE_SERVICE_ROLE_KEY)');
    }

    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

// GET - Listar todos os users com profiles
export async function GET() {
    try {
        const admin = getAdminClient();

        // Buscar users do auth
        const { data: authData, error: authError } = await admin.auth.admin.listUsers();
        if (authError) throw authError;

        // Buscar profiles
        const { data: profiles, error: profileError } = await admin
            .from('user_profiles')
            .select('*');
        if (profileError) throw profileError;

        // Buscar clinic access
        const { data: clinicAccess, error: caError } = await admin
            .from('user_clinic_access')
            .select('*, clinics(commercial_name)');
        if (caError) throw caError;

        // Combinar dados
        const users = authData.users.map(u => {
            const profile = profiles?.find(p => p.user_id === u.id);
            const clinics = clinicAccess?.filter(ca => ca.user_id === u.id) || [];

            return {
                id: u.id,
                email: u.email,
                phone: u.phone,
                created_at: u.created_at,
                last_sign_in_at: u.last_sign_in_at,
                // Username: extrair do email se for @asymlab.app
                username: u.email?.endsWith('@asymlab.app')
                    ? u.email.replace('@asymlab.app', '')
                    : null,
                is_username_account: u.email?.endsWith('@asymlab.app') || false,
                // Profile
                app_role: profile?.app_role || 'staff',
                full_name: profile?.full_name || 'Sem nome',
                // Clinics
                clinics: clinics.map(ca => ({
                    clinic_id: ca.clinic_id,
                    clinic_name: ca.clinics?.commercial_name || 'N/A',
                    clinic_role: ca.clinic_role
                }))
            };
        });

        return NextResponse.json({ users, count: users.length });
    } catch (error: any) {
        console.error('Error listing users:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao listar utilizadores' },
            { status: 500 }
        );
    }
}

// POST - Criar novo user (com email ou username)
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { username, email, password, full_name, app_role, clinic_ids } = body;

        // Validações
        if (!password || password.length < 6) {
            return NextResponse.json(
                { error: 'Password deve ter pelo menos 6 caracteres' },
                { status: 400 }
            );
        }

        if (!full_name) {
            return NextResponse.json(
                { error: 'Nome completo é obrigatório' },
                { status: 400 }
            );
        }

        if (!username && !email) {
            return NextResponse.json(
                { error: 'Username ou email é obrigatório' },
                { status: 400 }
            );
        }

        // Determinar o email para o Supabase Auth
        const authEmail = email || `${username!.toLowerCase().trim()}@asymlab.app`;
        const validRole = ['admin', 'clinic_user', 'doctor', 'staff'].includes(app_role)
            ? app_role
            : 'staff';

        const admin = getAdminClient();

        // Criar user no Auth
        const { data: newUser, error: createError } = await admin.auth.admin.createUser({
            email: authEmail,
            password,
            email_confirm: true, // Auto-confirmar (sem email de verificação)
            user_metadata: {
                full_name,
                app_role: validRole,
            }
        });

        if (createError) throw createError;

        // O trigger on_auth_user_created deve criar o user_profile automaticamente
        // Mas vamos garantir que o role está correcto
        await admin
            .from('user_profiles')
            .upsert({
                user_id: newUser.user.id,
                app_role: validRole,
                full_name
            }, { onConflict: 'user_id' });

        // Associar às clínicas (se fornecidas)
        if (clinic_ids && clinic_ids.length > 0) {
            const clinicRows = clinic_ids.map((cid: string) => ({
                user_id: newUser.user.id,
                clinic_id: cid,
                clinic_role: validRole === 'doctor' ? 'doctor' : 'staff'
            }));

            await admin.from('user_clinic_access').insert(clinicRows);
        }

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.user.id,
                email: authEmail,
                username: username || null,
                full_name,
                app_role: validRole
            },
            message: username
                ? `Utilizador "${username}" criado com sucesso`
                : `Utilizador "${email}" criado com sucesso`
        });
    } catch (error: any) {
        console.error('Error creating user:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao criar utilizador' },
            { status: 500 }
        );
    }
}

// PATCH - Atualizar user (reset password, alterar role, etc.)
export async function PATCH(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, action, ...data } = body;

        if (!user_id) {
            return NextResponse.json(
                { error: 'user_id é obrigatório' },
                { status: 400 }
            );
        }

        const admin = getAdminClient();

        switch (action) {
            case 'reset_password': {
                if (!data.new_password || data.new_password.length < 6) {
                    return NextResponse.json(
                        { error: 'Nova password deve ter pelo menos 6 caracteres' },
                        { status: 400 }
                    );
                }

                const { error } = await admin.auth.admin.updateUserById(user_id, {
                    password: data.new_password
                });

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Password resetada com sucesso'
                });
            }

            case 'update_role': {
                const validRole = ['admin', 'clinic_user', 'doctor', 'staff'].includes(data.app_role)
                    ? data.app_role
                    : 'staff';

                const { error } = await admin
                    .from('user_profiles')
                    .update({ app_role: validRole })
                    .eq('user_id', user_id);

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: `Role atualizado para "${validRole}"`
                });
            }

            case 'update_name': {
                const { error } = await admin
                    .from('user_profiles')
                    .update({ full_name: data.full_name })
                    .eq('user_id', user_id);

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Nome atualizado com sucesso'
                });
            }

            case 'delete': {
                // Remover clinic access
                await admin.from('user_clinic_access').delete().eq('user_id', user_id);
                // Remover profile
                await admin.from('user_profiles').delete().eq('user_id', user_id);
                // Remover auth user
                const { error } = await admin.auth.admin.deleteUser(user_id);

                if (error) throw error;

                return NextResponse.json({
                    success: true,
                    message: 'Utilizador eliminado com sucesso'
                });
            }

            default:
                return NextResponse.json(
                    { error: `Ação desconhecida: ${action}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Error updating user:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao atualizar utilizador' },
            { status: 500 }
        );
    }
}
