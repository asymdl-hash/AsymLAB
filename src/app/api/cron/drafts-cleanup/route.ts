import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import {
    buildDraftReminderMessage,
    buildDraftExpiredMessage,
    sendDraftNotification,
} from '@/lib/whatsapp/drafts';

/**
 * Cron Job: Limpeza de Rascunhos de Planos de Tratamento
 *
 * Executa a cada 6 horas (configurado em vercel.json):
 * 1. Elimina rascunhos expirados e notifica via WhatsApp
 * 2. Envia lembretes para rascunhos que expiram nas próximas 24h
 *
 * Protegido por CRON_SECRET (Vercel Cron injecta automaticamente).
 */

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function GET(request: NextRequest) {
    // ── Autenticação ──
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
        console.warn('[Cron/Drafts] Acesso não autorizado');
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const now = new Date().toISOString();
    const stats = { expired_deleted: 0, reminders_sent: 0, errors: [] as string[] };

    try {
        // ── 1. Eliminar rascunhos expirados ──
        const { data: expiredDrafts, error: expiredErr } = await supabaseAdmin
            .from('treatment_plan_drafts')
            .select(`
                id, patient_id, created_by,
                patients!inner(nome, whatsapp_group_id),
                profiles:created_by(full_name, phone)
            `)
            .lt('expires_at', now);

        if (expiredErr) {
            console.error('[Cron/Drafts] Erro ao buscar expirados:', expiredErr);
            stats.errors.push('Erro ao buscar expirados: ' + expiredErr.message);
        }

        if (expiredDrafts && expiredDrafts.length > 0) {
            for (const draft of expiredDrafts) {
                // Extrair dados do paciente e médico
                const patient = draft.patients as unknown as { nome: string; whatsapp_group_id?: string };
                const doctor = draft.profiles as unknown as { full_name?: string; phone?: string };

                // Enviar WhatsApp de expiração (se grupo existe)
                if (patient?.whatsapp_group_id) {
                    const message = buildDraftExpiredMessage(
                        patient.nome || 'Paciente',
                        doctor?.full_name || 'Médico',
                    );
                    await sendDraftNotification({
                        groupId: patient.whatsapp_group_id,
                        message,
                        doctorPhone: doctor?.phone,
                    });
                }

                // Eliminar o rascunho
                const { error: deleteErr } = await supabaseAdmin
                    .from('treatment_plan_drafts')
                    .delete()
                    .eq('id', draft.id);

                if (deleteErr) {
                    stats.errors.push(`Erro ao eliminar ${draft.id}: ${deleteErr.message}`);
                } else {
                    stats.expired_deleted++;
                }
            }
        }

        // ── 2. Enviar lembretes (24h antes da expiração) ──
        const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

        const { data: soonExpiring, error: soonErr } = await supabaseAdmin
            .from('treatment_plan_drafts')
            .select(`
                id, patient_id, created_by, expires_at,
                patients!inner(nome, whatsapp_group_id),
                profiles:created_by(full_name, phone)
            `)
            .gte('expires_at', now)      // ainda não expirou
            .lte('expires_at', in24h)    // expira nas próximas 24h
            .eq('reminder_sent', false); // lembrete ainda não foi enviado

        if (soonErr) {
            console.error('[Cron/Drafts] Erro ao buscar quase-expirados:', soonErr);
            stats.errors.push('Erro ao buscar quase-expirados: ' + soonErr.message);
        }

        if (soonExpiring && soonExpiring.length > 0) {
            for (const draft of soonExpiring) {
                const patient = draft.patients as unknown as { nome: string; whatsapp_group_id?: string };
                const doctor = draft.profiles as unknown as { full_name?: string; phone?: string };

                const hoursLeft = Math.round(
                    (new Date(draft.expires_at).getTime() - Date.now()) / (1000 * 60 * 60)
                );

                // Enviar lembrete WhatsApp
                if (patient?.whatsapp_group_id) {
                    const message = buildDraftReminderMessage(
                        patient.nome || 'Paciente',
                        hoursLeft,
                        doctor?.full_name || 'Médico',
                    );
                    await sendDraftNotification({
                        groupId: patient.whatsapp_group_id,
                        message,
                        doctorPhone: doctor?.phone,
                    });
                }

                // Marcar lembrete como enviado
                const { error: updateErr } = await supabaseAdmin
                    .from('treatment_plan_drafts')
                    .update({ reminder_sent: true })
                    .eq('id', draft.id);

                if (updateErr) {
                    stats.errors.push(`Erro ao marcar lembrete ${draft.id}: ${updateErr.message}`);
                } else {
                    stats.reminders_sent++;
                }
            }
        }

        console.log('[Cron/Drafts] ✅ Concluído:', stats);

        return NextResponse.json({
            success: true,
            timestamp: now,
            ...stats,
        });

    } catch (error) {
        console.error('[Cron/Drafts] Erro fatal:', error);
        return NextResponse.json(
            { error: 'Erro interno no cron', details: error instanceof Error ? error.message : 'Desconhecido' },
            { status: 500 }
        );
    }
}
