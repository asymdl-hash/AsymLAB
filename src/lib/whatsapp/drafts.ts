/**
 * WhatsApp Draft Plan Notification Helpers
 * Constrói mensagens e envia notificações sobre rascunhos de planos de tratamento
 * via Z-API para o grupo WhatsApp do paciente, mencionando o médico principal.
 */

// ── Construção de Mensagens ──

export function buildDraftReminderMessage(
    patientName: string,
    hoursLeft: number,
    doctorName: string,
): string {
    return [
        `⏰ *Rascunho Pendente*`,
        ``,
        `Paciente: *${patientName}*`,
        `Médico: @${doctorName}`,
        ``,
        `O rascunho do plano de tratamento expira em *${hoursLeft}h*.`,
        `Finalize o plano para evitar perder os dados.`,
    ].join('\n');
}

export function buildDraftExpiredMessage(
    patientName: string,
    doctorName: string,
): string {
    return [
        `🗑️ *Rascunho Expirado*`,
        ``,
        `Paciente: *${patientName}*`,
        `Médico: @${doctorName}`,
        ``,
        `O rascunho do plano de tratamento expirou após 2 dias sem ser finalizado.`,
        `Será necessário criar um novo plano.`,
    ].join('\n');
}

// ── Envio via API interna ──

interface SendDraftNotificationParams {
    groupId: string;
    message: string;
    doctorPhone?: string; // ex: "351912345678" para @mention
}

export async function sendDraftNotification({
    groupId,
    message,
    doctorPhone,
}: SendDraftNotificationParams): Promise<{ success: boolean; error?: string }> {
    try {
        // Enviar com mention do médico se disponível
        const payload: Record<string, unknown> = {
            groupId,
            message,
        };

        // Z-API suporta mentions via campo 'mentioned' em send-text
        if (doctorPhone) {
            payload.mentionedList = [doctorPhone];
        }

        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://asymlab.vercel.app';
        const response = await fetch(`${baseUrl}/api/whatsapp/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[WhatsApp/Drafts] Erro ao enviar:', errorData);
            return { success: false, error: errorData.error || 'Falha no envio' };
        }

        console.log('[WhatsApp/Drafts] ✅ Notificação enviada para grupo:', groupId);
        return { success: true };
    } catch (error) {
        console.error('[WhatsApp/Drafts] Erro interno:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
}
