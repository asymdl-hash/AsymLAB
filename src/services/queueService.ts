'use client';

import { supabase } from '@/lib/supabase';

// === Tipos para a Fila de Pedidos ===

export interface QueueItem {
    id: string;
    nome: string;
    estado: string;
    urgente: boolean;
    created_at: string;
    updated_at: string;
    data_inicio: string;
    paciente: {
        id: string;
        nome: string;
        t_id: string;
    };
    clinica: {
        id: string;
        commercial_name: string;
    } | null;
    medico: {
        user_id: string;
        full_name: string;
    } | null;
    tipo_trabalho: {
        id: string;
        nome: string;
    } | null;
    progresso: {
        feitas: number;
        total: number;
    };
}

export interface QueueFilters {
    search: string;
    clinica_id: string | null;
    medico_id: string | null;
    tipo_trabalho_id: string | null;
    urgente: boolean | null;
}

export const DEFAULT_QUEUE_FILTERS: QueueFilters = {
    search: '',
    clinica_id: null,
    medico_id: null,
    tipo_trabalho_id: null,
    urgente: null,
};

// Colunas do Kanban (estados visíveis na fila)
export const QUEUE_COLUMNS = [
    { key: 'activo', label: 'Activo', color: 'emerald', icon: '🟢' },
    { key: 'pausado', label: 'Pausado', color: 'amber', icon: '🟡' },
    { key: 'reaberto', label: 'Reaberto', color: 'blue', icon: '🔵' },
    { key: 'concluido', label: 'Concluído', color: 'gray', icon: '✅' },
] as const;

export const queueService = {

    // Buscar todos os planos para a fila (com joins)
    async getQueueItems(): Promise<QueueItem[]> {
        const { data, error } = await supabase
            .from('treatment_plans')
            .select(`
                id,
                nome,
                estado,
                urgente,
                created_at,
                updated_at,
                data_inicio,
                patient:patients!treatment_plans_patient_id_fkey (
                    id,
                    nome,
                    t_id
                ),
                clinica:clinics!treatment_plans_clinica_id_fkey (
                    id,
                    commercial_name
                ),
                medico:user_profiles!treatment_plans_medico_id_fkey (
                    user_id,
                    full_name
                ),
                tipo_trabalho:work_types!treatment_plans_tipo_trabalho_id_fkey (
                    id,
                    nome
                ),
                phases (
                    id,
                    estado
                )
            `)
            .is('deleted_at', null)
            .neq('estado', 'rascunho')
            .order('urgente', { ascending: false })
            .order('updated_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar fila de pedidos:', error);
            throw error;
        }

        // Mapear dados para QueueItem com progresso calculado
        return (data || []).map((plan: any) => ({
            id: plan.id,
            nome: plan.nome,
            estado: plan.estado,
            urgente: plan.urgente,
            created_at: plan.created_at,
            updated_at: plan.updated_at,
            data_inicio: plan.data_inicio,
            paciente: plan.patient || { id: '', nome: 'Desconhecido', t_id: '' },
            clinica: plan.clinica,
            medico: plan.medico,
            tipo_trabalho: plan.tipo_trabalho,
            progresso: {
                feitas: (plan.phases || []).filter((p: any) => p.estado === 'concluida').length,
                total: (plan.phases || []).length,
            },
        }));
    },

    // Filtrar items no client-side
    filterItems(items: QueueItem[], filters: QueueFilters): QueueItem[] {
        let result = items;

        if (filters.search) {
            const q = filters.search.toLowerCase();
            result = result.filter(item =>
                item.paciente.nome.toLowerCase().includes(q) ||
                item.paciente.t_id.toLowerCase().includes(q) ||
                item.nome.toLowerCase().includes(q)
            );
        }

        if (filters.clinica_id) {
            result = result.filter(item => item.clinica?.id === filters.clinica_id);
        }

        if (filters.medico_id) {
            result = result.filter(item => item.medico?.user_id === filters.medico_id);
        }

        if (filters.tipo_trabalho_id) {
            result = result.filter(item => item.tipo_trabalho?.id === filters.tipo_trabalho_id);
        }

        if (filters.urgente !== null) {
            result = result.filter(item => item.urgente === filters.urgente);
        }

        return result;
    },

    // Agrupar por estado para as colunas do Kanban
    groupByEstado(items: QueueItem[]): Record<string, QueueItem[]> {
        const groups: Record<string, QueueItem[]> = {};
        for (const col of QUEUE_COLUMNS) {
            groups[col.key] = [];
        }
        for (const item of items) {
            if (groups[item.estado]) {
                groups[item.estado].push(item);
            }
        }
        return groups;
    },

    // Guardar filtros por utilizador
    saveFilters(userId: string, filters: QueueFilters) {
        try {
            localStorage.setItem(`queue-filters-${userId}`, JSON.stringify(filters));
        } catch { /* ignore */ }
    },

    // Carregar filtros do utilizador
    loadFilters(userId: string): QueueFilters {
        try {
            const stored = localStorage.getItem(`queue-filters-${userId}`);
            if (stored) {
                return { ...DEFAULT_QUEUE_FILTERS, ...JSON.parse(stored) };
            }
        } catch { /* ignore */ }
        return { ...DEFAULT_QUEUE_FILTERS };
    },

    // Actualizar estado de um plano (para drag & drop)
    async updatePlanEstado(
        planId: string,
        novoEstado: string,
        motivo?: string,
        tipo_reopen?: string
    ): Promise<void> {
        const updateData: Record<string, any> = {
            estado: novoEstado,
            updated_at: new Date().toISOString(),
        };

        if (motivo) updateData.motivo_pausa = motivo;
        if (tipo_reopen) updateData.tipo_reopen = tipo_reopen;

        // Se concluir, guardar data_fim
        if (novoEstado === 'concluido') {
            updateData.data_fim = new Date().toISOString();
        }

        const { error } = await supabase
            .from('treatment_plans')
            .update(updateData)
            .eq('id', planId);

        if (error) {
            console.error('Erro ao actualizar estado:', error);
            throw error;
        }
    },
};
