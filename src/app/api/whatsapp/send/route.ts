import { NextRequest, NextResponse } from 'next/server';

const ZAPI_BASE_URL = 'https://api.z-api.io/instances';

export async function POST(request: NextRequest) {
    try {
        const { groupId, message } = await request.json();

        if (!groupId || !message) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: groupId, message' },
                { status: 400 }
            );
        }

        const instanceId = process.env.ZAPI_INSTANCE_ID;
        const token = process.env.ZAPI_TOKEN;
        const clientToken = process.env.ZAPI_CLIENT_TOKEN;

        if (!instanceId || !token || !clientToken) {
            console.error('[WhatsApp] Credenciais Z-API não configuradas');
            return NextResponse.json(
                { error: 'Z-API não configurada' },
                { status: 500 }
            );
        }

        const response = await fetch(
            `${ZAPI_BASE_URL}/${instanceId}/token/${token}/send-text`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Client-Token': clientToken,
                },
                body: JSON.stringify({
                    phone: groupId,
                    message: message,
                }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error('[WhatsApp] Erro Z-API:', data);
            return NextResponse.json(
                { error: 'Falha ao enviar mensagem', details: data },
                { status: response.status }
            );
        }

        console.log('[WhatsApp] ✅ Mensagem enviada:', data);
        return NextResponse.json({
            success: true,
            messageId: data.messageId || data.id,
            data,
        });

    } catch (error) {
        console.error('[WhatsApp] Erro interno:', error);
        return NextResponse.json(
            { error: 'Erro interno', details: error instanceof Error ? error.message : 'Desconhecido' },
            { status: 500 }
        );
    }
}
