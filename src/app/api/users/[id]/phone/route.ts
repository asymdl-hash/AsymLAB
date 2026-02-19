import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// API route para gerir o phone de um utilizador
// GET: verifica se auth.users.phone existe (sem expor o número)
// POST: actualiza auth.users.phone + user_profiles.phone (só admin)
//
// REGRA ARQUITECTURAL (future_features_plan.md §11):
// auth.users.phone = MASTER (fonte de verdade)
// user_profiles.phone = MIRROR (cópia automática via trigger)
// Nunca editar user_profiles.phone directamente — usar sempre esta API.

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

// GET /api/users/[id]/phone
// Devolve: { hasAuthPhone: boolean }
// O número em si nunca é exposto ao frontend — apenas se existe ou não.
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(params.id);

        if (error || !user) {
            return NextResponse.json({ error: 'Utilizador não encontrado' }, { status: 404 });
        }

        return NextResponse.json({
            hasAuthPhone: !!(user.phone && user.phone.trim() !== ''),
        });
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}

// POST /api/users/[id]/phone
// Body: { phone: string }
// Actualiza auth.users.phone + user_profiles.phone (só admin)
// O trigger `sync_auth_phone_to_profile` sincroniza user_profiles automaticamente.
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Verificar se o utilizador que faz o pedido é admin
        const authHeader = request.headers.get('Authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
        }

        const token = authHeader.replace('Bearer ', '');
        const { data: { user: requester }, error: authError } = await supabaseAdmin.auth.getUser(token);

        if (authError || !requester) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        // Verificar role do utilizador que faz o pedido
        const { data: profile } = await supabaseAdmin
            .from('user_profiles')
            .select('app_role')
            .eq('user_id', requester.id)
            .single();

        if (profile?.app_role !== 'admin') {
            return NextResponse.json({ error: 'Sem permissão. Apenas administradores podem alterar o telefone.' }, { status: 403 });
        }

        // Obter o novo telefone do body
        const body = await request.json();
        const { phone } = body;

        if (!phone || typeof phone !== 'string' || phone.trim() === '') {
            return NextResponse.json({ error: 'Telefone inválido' }, { status: 400 });
        }

        // Actualizar auth.users.phone (o trigger trata do user_profiles.phone automaticamente)
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            params.id,
            { phone: phone.trim() }
        );

        if (updateError) {
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, message: 'Telefone actualizado com sucesso.' });
    } catch {
        return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
    }
}
