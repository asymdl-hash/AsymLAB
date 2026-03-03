import { NextRequest, NextResponse } from 'next/server';

const ZAPI_BASE_URL = 'https://api.z-api.io/instances';

/**
 * Resolve um link de convite WhatsApp para o Group ID (formato 120363...@g.us)
 * POST { inviteUrl: "https://chat.whatsapp.com/F16ip6oWTleHFmrNZI7P3X" }
 * → { groupId: "120363352719653076@g.us", subject: "Paciente Maria Silva" }
 */
export async function POST(request: NextRequest) {
    try {
        const { inviteUrl } = await request.json();

        if (!inviteUrl) {
            return NextResponse.json(
                { error: 'Campo obrigatório: inviteUrl' },
                { status: 400 }
            );
        }

        // Extrair invite code do URL
        const match = inviteUrl.match(/chat\.whatsapp\.com\/([A-Za-z0-9]+)/);
        if (!match) {
            return NextResponse.json(
                { error: 'URL de convite inválido. Formato esperado: https://chat.whatsapp.com/XXXXX' },
                { status: 400 }
            );
        }

        const inviteCode = match[1];

        const instanceId = process.env.ZAPI_INSTANCE_ID;
        const token = process.env.ZAPI_TOKEN;
        const clientToken = process.env.ZAPI_CLIENT_TOKEN;

        if (!instanceId || !token || !clientToken) {
            return NextResponse.json(
                { error: 'Z-API não configurada' },
                { status: 500 }
            );
        }

        // Chamar Z-API para obter metadata do grupo via invite code
        const response = await fetch(
            `${ZAPI_BASE_URL}/${instanceId}/token/${token}/group-invite-metadata/${inviteCode}`,
            {
                method: 'GET',
                headers: {
                    'Client-Token': clientToken,
                },
            }
        );

        const data = await response.json();

        if (!response.ok || !data.phone) {
            console.error('[WhatsApp] Erro ao resolver grupo:', data);
            return NextResponse.json(
                { error: 'Não foi possível resolver o grupo. Verifique se o link é válido e a instância Z-API está conectada.', details: data },
                { status: 400 }
            );
        }

        console.log('[WhatsApp] ✅ Grupo resolvido:', data.phone, data.subject);
        return NextResponse.json({
            success: true,
            groupId: data.phone,
            subject: data.subject || '',
            size: data.size || 0,
        });

    } catch (error) {
        console.error('[WhatsApp] Erro ao resolver grupo:', error);
        return NextResponse.json(
            { error: 'Erro interno', details: error instanceof Error ? error.message : 'Desconhecido' },
            { status: 500 }
        );
    }
}
