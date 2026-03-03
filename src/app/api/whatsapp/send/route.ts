import { NextRequest, NextResponse } from 'next/server';

const ZAPI_BASE_URL = 'https://api.z-api.io/instances';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { groupId, message, documentUrl, fileName, caption } = body;

        if (!groupId) {
            return NextResponse.json(
                { error: 'Campo obrigatório: groupId' },
                { status: 400 }
            );
        }

        if (!message && !documentUrl) {
            return NextResponse.json(
                { error: 'Necessário: message (texto) ou documentUrl (PDF)' },
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

        // ── Modo 1: Enviar documento (PDF) ──
        if (documentUrl) {
            const docResponse = await fetch(
                `${ZAPI_BASE_URL}/${instanceId}/token/${token}/send-document/pdf`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Client-Token': clientToken,
                    },
                    body: JSON.stringify({
                        phone: groupId,
                        document: documentUrl,
                        fileName: fileName || 'documento.pdf',
                        caption: caption || '',
                    }),
                }
            );

            const docData = await docResponse.json();

            if (!docResponse.ok) {
                console.error('[WhatsApp] Erro Z-API (documento):', docData);
                return NextResponse.json(
                    { error: 'Falha ao enviar documento', details: docData },
                    { status: docResponse.status }
                );
            }

            console.log('[WhatsApp] ✅ Documento enviado:', docData);
            return NextResponse.json({
                success: true,
                type: 'document',
                messageId: docData.messageId || docData.id,
                data: docData,
            });
        }

        // ── Modo 2: Enviar texto simples ──
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
            type: 'text',
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
