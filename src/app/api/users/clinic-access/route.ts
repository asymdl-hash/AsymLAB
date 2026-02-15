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

// POST - Associar um utilizador a uma clínica
export async function POST(request: NextRequest) {
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

        const { error: insertError } = await admin
            .from('user_clinic_access')
            .upsert(
                { user_id, clinic_id, can_edit: true },
                { onConflict: 'user_id,clinic_id' }
            );

        if (insertError) throw insertError;

        return NextResponse.json({
            success: true,
            message: 'Acesso à clínica adicionado com sucesso'
        });
    } catch (error: any) {
        console.error('Error adding clinic access:', error);
        return NextResponse.json(
            { error: error.message || 'Erro ao adicionar acesso' },
            { status: 500 }
        );
    }
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
