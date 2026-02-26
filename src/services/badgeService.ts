'use client';

import { supabase } from '@/lib/supabase';

// === Tipos ===

export interface WorkStatus {
    id: string;
    nome: string;
    emoji: string;
    categoria: 'logistica' | 'producao' | 'componentes' | 'comunicacao' | 'avaliacao' | 'billing';
    ordem: number;
    visivel_para: 'todos' | 'staff_lab';
    activo: boolean;
}

export interface PlanBadge {
    id: string;
    plan_id: string;
    status_id: string;
    added_at: string;
    added_by: string | null;
    status: WorkStatus;
}

// Cores por categoria (dark theme)
export const CATEGORY_COLORS: Record<string, { bg: string; text: string; border: string; label: string; emoji: string }> = {
    logistica: { bg: 'bg-orange-500/15', text: 'text-orange-400', border: 'border-orange-500/30', label: 'Logística', emoji: '📦' },
    producao: { bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Produção', emoji: '🔧' },
    componentes: { bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30', label: 'Componentes', emoji: '🧩' },
    comunicacao: { bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30', label: 'Comunicação', emoji: '💬' },
    avaliacao: { bg: 'bg-pink-500/15', text: 'text-pink-400', border: 'border-pink-500/30', label: 'Avaliação', emoji: '📋' },
    billing: { bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', label: 'Billing', emoji: '💰' },
};

// Cache do catálogo
let catalogCache: WorkStatus[] | null = null;
let catalogExpiry = 0;

export const badgeService = {

    // Buscar catálogo (cached 5 min)
    async getStatusCatalog(forceRefresh = false): Promise<WorkStatus[]> {
        const now = Date.now();
        if (!forceRefresh && catalogCache && now < catalogExpiry) {
            return catalogCache;
        }

        const { data, error } = await supabase
            .from('work_status_catalog')
            .select('*')
            .eq('activo', true)
            .order('ordem', { ascending: true });

        if (error) {
            console.error('Erro ao carregar catálogo de status:', error);
            throw error;
        }

        catalogCache = data || [];
        catalogExpiry = now + 5 * 60 * 1000; // 5 min
        return catalogCache;
    },

    // Badges activos de um plano
    async getPlanBadges(planId: string): Promise<PlanBadge[]> {
        const { data, error } = await supabase
            .from('plan_badges')
            .select(`
                id,
                plan_id,
                status_id,
                added_at,
                added_by,
                status:work_status_catalog (
                    id, nome, emoji, categoria, ordem, visivel_para, activo
                )
            `)
            .eq('plan_id', planId)
            .is('removed_at', null)
            .order('added_at', { ascending: true });

        if (error) {
            console.error('Erro ao carregar badges do plano:', error);
            throw error;
        }

        return (data || []).map((b: any) => ({
            ...b,
            status: b.status,
        }));
    },

    // Badges em batch (para a fila/Kanban) — mais eficiente
    async getBatchPlanBadges(planIds: string[]): Promise<Record<string, PlanBadge[]>> {
        if (planIds.length === 0) return {};

        const { data, error } = await supabase
            .from('plan_badges')
            .select(`
                id,
                plan_id,
                status_id,
                added_at,
                added_by,
                status:work_status_catalog (
                    id, nome, emoji, categoria, ordem, visivel_para, activo
                )
            `)
            .in('plan_id', planIds)
            .is('removed_at', null)
            .order('added_at', { ascending: true });

        if (error) {
            console.error('Erro ao carregar badges em batch:', error);
            throw error;
        }

        // Agrupar por plan_id
        const grouped: Record<string, PlanBadge[]> = {};
        for (const id of planIds) grouped[id] = [];

        for (const badge of (data || [])) {
            const b = badge as any;
            const planBadge: PlanBadge = { ...b, status: b.status };
            if (grouped[planBadge.plan_id]) {
                grouped[planBadge.plan_id].push(planBadge);
            }
        }

        return grouped;
    },

    // Adicionar badge
    async addBadge(planId: string, statusId: string, userId?: string): Promise<void> {
        const insertData: Record<string, any> = {
            plan_id: planId,
            status_id: statusId,
        };
        if (userId) insertData.added_by = userId;

        const { error } = await supabase
            .from('plan_badges')
            .insert(insertData);

        if (error) {
            // Se for duplicado, ignorar
            if (error.code === '23505') return;
            console.error('Erro ao adicionar badge:', error);
            throw error;
        }
    },

    // Remover badge (soft-delete)
    async removeBadge(planId: string, statusId: string, userId?: string): Promise<void> {
        const updateData: Record<string, any> = {
            removed_at: new Date().toISOString(),
        };
        if (userId) updateData.removed_by = userId;

        const { error } = await supabase
            .from('plan_badges')
            .update(updateData)
            .eq('plan_id', planId)
            .eq('status_id', statusId)
            .is('removed_at', null);

        if (error) {
            console.error('Erro ao remover badge:', error);
            throw error;
        }
    },

    // Toggle: se existe remove, se não existe adiciona
    async toggleBadge(planId: string, statusId: string, userId?: string): Promise<boolean> {
        // Verificar se já existe
        const { data } = await supabase
            .from('plan_badges')
            .select('id')
            .eq('plan_id', planId)
            .eq('status_id', statusId)
            .is('removed_at', null)
            .maybeSingle();

        if (data) {
            await this.removeBadge(planId, statusId, userId);
            return false; // foi removido
        } else {
            await this.addBadge(planId, statusId, userId);
            return true; // foi adicionado
        }
    },
};
