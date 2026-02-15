import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

function getAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!url || !serviceKey) {
        throw new Error('Missing Supabase admin credentials');
    }

    return createClient(url, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
}

// DELETE - Remover acesso de um utilizador a uma clínica
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        const { user_id, clinic_id } = body;

        if (!user_id || !clinic_id) {
            return NextResponse.json(
                { error: 'user_id e clinic_id são obrigatórios' },
                { status: 400 }
            );
        }

        const admin = getAdminClient();

        // Verificar se o user não é admin (admin não pode ser removido)
        const { data: profile } = await admin
            .from('user_profiles')
            .select('app_role')
            .eq('user_id', user_id)
            .single();

        if (profile?.app_role === 'admin') {
            return NextResponse.json(
                { error: 'Não é possível remover o acesso de um administrador' },
                { status: 403 }
            );
        }

        // Remover a associação user <-> clinic
        const { error: deleteError } = await admin
            .from('user_clinic_access')
            .delete()
            .eq('user_id', user_id)
            .eq('clinic_id', clinic_id);

        if (deleteError) throw deleteError;

        return NextResponse.json({
            success: true,
            message: 'Acesso removido com sucesso'
        });
    } catch (error: any) {
        console.error('Error removing clinic access:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao remover acesso' },
            { status: 500 }
        );
    }
}
