import { NextRequest, NextResponse } from 'next/server';

const ZAPI_BASE_URL = 'https://api.z-api.io/instances';

function getZapiConfig() {
    return {
        instanceId: process.env.ZAPI_INSTANCE_ID || '',
        token: process.env.ZAPI_TOKEN || '',
        clientToken: process.env.ZAPI_CLIENT_TOKEN || '',
    };
}

function getHeaders(clientToken: string) {
    return {
        'Content-Type': 'application/json',
        'Client-Token': clientToken,
    };
}

/**
 * Cria um grupo WhatsApp via Z-API
 * POST { patientName, tId, participantPhones: ["351914511165", ...] }
 * → { groupId: "120363...@g.us", groupLink: "https://chat.whatsapp.com/..." }
 */
export async function POST(request: NextRequest) {
    try {
        const { patientName, tId, participantPhones } = await request.json();

        if (!patientName || !tId) {
            return NextResponse.json(
                { error: 'Campos obrigatórios: patientName, tId' },
                { status: 400 }
            );
        }

        const config = getZapiConfig();
        if (!config.instanceId || !config.token || !config.clientToken) {
            return NextResponse.json(
                { error: 'Z-API não configurada' },
                { status: 500 }
            );
        }

        // Nome do grupo: "T-0001 Maria Silva" (max 25 chars)
        const nameParts = patientName.trim().split(/\s+/);
        const shortName = (nameParts[0] + ' ' + (nameParts[1] || '')).trim();
        const groupName = `${tId} ${shortName}`.substring(0, 25);

        // Participantes válidos (limpar caracteres não-numéricos)
        const cleanPhones = (participantPhones || [])
            .map((p: string) => p.replace(/\D/g, ''))
            .filter((p: string) => p.length > 5);

        if (cleanPhones.length === 0) {
            return NextResponse.json(
                { error: 'Nenhum participante com número válido. Verifique os médicos associados.' },
                { status: 400 }
            );
        }

        // 1. Criar grupo via Z-API
        const createRes = await fetch(
            `${ZAPI_BASE_URL}/${config.instanceId}/token/${config.token}/create-group`,
            {
                method: 'POST',
                headers: getHeaders(config.clientToken),
                body: JSON.stringify({
                    groupName,
                    phones: cleanPhones,
                    autoInvite: true,
                }),
            }
        );

        const createData = await createRes.json();

        if (!createRes.ok || !createData.phone) {
            console.error('[WhatsApp] Erro ao criar grupo:', createData);
            return NextResponse.json(
                { error: 'Falha ao criar grupo WhatsApp', details: createData },
                { status: 400 }
            );
        }

        const groupId = createData.phone;
        const groupLink = createData.invitationLink || '';

        // 2. Enviar mensagem de boas-vindas
        try {
            await fetch(
                `${ZAPI_BASE_URL}/${config.instanceId}/token/${config.token}/send-text`,
                {
                    method: 'POST',
                    headers: getHeaders(config.clientToken),
                    body: JSON.stringify({
                        phone: groupId,
                        message: `📋 *AsymLAB*\nGrupo criado para *${patientName}*\nID: ${tId}`,
                    }),
                }
            );
        } catch (welcomeErr) {
            // Não falhar se a mensagem de boas-vindas não enviar
            console.warn('[WhatsApp] Aviso: mensagem de boas-vindas não enviada:', welcomeErr);
        }

        console.log('[WhatsApp] ✅ Grupo criado:', groupId, groupName);
        return NextResponse.json({
            success: true,
            groupId,
            groupLink,
            groupName,
        });

    } catch (error) {
        console.error('[WhatsApp] Erro ao criar grupo:', error);
        return NextResponse.json(
            { error: 'Erro interno', details: error instanceof Error ? error.message : 'Desconhecido' },
            { status: 500 }
        );
    }
}
