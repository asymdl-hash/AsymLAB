'use client';

import { supabase } from '@/lib/supabase';

// === Tipos ===

export interface TransportGuide {
    id: string;
    patient_id: string;
    plan_id: string | null;
    clinica_id: string | null;
    tipo: 'transporte' | 'recepcao';
    numero: string;
    data_envio: string;
    estado: 'rascunho' | 'enviado' | 'entregue' | 'recebido';
    estado_recepcao: 'ok' | 'danificado' | 'incompleto' | null;
    notas: string | null;
    fotos: string[];
    created_by: string | null;
    created_at: string;
    updated_at: string;
    // joins
    patient?: { id: string; nome: string; t_id: string } | null;
    plan?: { id: string; nome: string } | null;
    clinica?: { id: string; commercial_name: string } | null;
    items?: GuideItem[];
}

export interface GuideItem {
    id: string;
    guide_id: string;
    nome: string;
    quantidade: number;
    observacao: string | null;
    ordem: number;
}

export interface GuideItemCatalog {
    id: string;
    nome: string;
    clinica_id: string | null;
    tipo_trabalho_id: string | null;
    uso_count: number;
    last_used_at: string;
}

// Configurações visuais
export const GUIDE_TYPE_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
    transporte: { label: 'Transporte', emoji: '🚚', color: 'text-amber-400', bg: 'bg-amber-500/15' },
    recepcao: { label: 'Recepção', emoji: '📦', color: 'text-blue-400', bg: 'bg-blue-500/15' },
};

export const GUIDE_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-gray-400', bg: 'bg-gray-500/20' },
    enviado: { label: 'Enviado', color: 'text-amber-400', bg: 'bg-amber-500/20' },
    entregue: { label: 'Entregue', color: 'text-emerald-400', bg: 'bg-emerald-500/20' },
    recebido: { label: 'Recebido', color: 'text-blue-400', bg: 'bg-blue-500/20' },
};

export const RECEPTION_STATE_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
    ok: { label: 'OK', emoji: '✅', color: 'text-emerald-400' },
    danificado: { label: 'Danificado', emoji: '⚠️', color: 'text-red-400' },
    incompleto: { label: 'Incompleto', emoji: '🟠', color: 'text-orange-400' },
};

export const transportService = {

    // =================== GUIAS ===================

    async getGuides(patientId: string): Promise<TransportGuide[]> {
        const { data, error } = await supabase
            .from('transport_guides')
            .select(`
                *,
                patient:patients!transport_guides_patient_id_fkey (id, nome, t_id),
                plan:treatment_plans!transport_guides_plan_id_fkey (id, nome),
                clinica:clinics!transport_guides_clinica_id_fkey (id, commercial_name),
                items:guide_items (*)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Erro ao carregar guias:', error);
            throw error;
        }
        return (data || []) as TransportGuide[];
    },

    async createGuide(data: {
        patient_id: string;
        tipo: 'transporte' | 'recepcao';
        plan_id?: string;
        clinica_id?: string;
        data_envio?: string;
        notas?: string;
        estado_recepcao?: string;
        created_by?: string;
        items: { nome: string; quantidade: number; observacao?: string }[];
    }): Promise<TransportGuide> {
        // Auto-número
        const { data: numData } = await supabase.rpc('generate_guide_number', { guide_tipo: data.tipo });
        const numero = numData || `G-${new Date().getFullYear()}/0000`;

        const { items, ...guideData } = data;

        // Criar guia
        const { data: guide, error } = await supabase
            .from('transport_guides')
            .insert({
                ...guideData,
                numero,
                estado: data.tipo === 'transporte' ? 'enviado' : 'recebido',
            })
            .select()
            .single();

        if (error) {
            console.error('Erro ao criar guia:', error);
            throw error;
        }

        // Inserir itens
        if (items.length > 0) {
            const itemsToInsert = items.map((item, i) => ({
                guide_id: guide.id,
                nome: item.nome,
                quantidade: item.quantidade,
                observacao: item.observacao || null,
                ordem: i,
            }));

            const { error: itemsError } = await supabase
                .from('guide_items')
                .insert(itemsToInsert);

            if (itemsError) {
                console.error('Erro ao inserir itens:', itemsError);
            }

            // Actualizar catálogo de itens (contagem de uso)
            for (const item of items) {
                await this.updateItemCatalog(item.nome, data.clinica_id);
            }
        }

        return guide as TransportGuide;
    },

    async updateGuide(id: string, updates: Partial<TransportGuide>): Promise<void> {
        const { error } = await supabase
            .from('transport_guides')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Erro ao actualizar guia:', error);
            throw error;
        }
    },

    async uploadGuidePhoto(guideId: string, file: File): Promise<string> {
        const timestamp = Date.now();
        const ext = file.name.split('.').pop() || 'jpg';
        const path = `guides/${guideId}/${timestamp}.${ext}`;

        const { error: uploadError } = await supabase.storage
            .from('billing-files')
            .upload(path, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('billing-files')
            .getPublicUrl(path);

        // Append foto ao array
        const { data: guide } = await supabase
            .from('transport_guides')
            .select('fotos')
            .eq('id', guideId)
            .single();

        const currentFotos = (guide?.fotos as string[]) || [];
        await this.updateGuide(guideId, { fotos: [...currentFotos, urlData.publicUrl] } as Partial<TransportGuide>);

        return urlData.publicUrl;
    },

    // =================== CATÁLOGO DE ITENS ===================

    async getSuggestedItems(clinicaId?: string): Promise<GuideItemCatalog[]> {
        let query = supabase
            .from('guide_item_catalog')
            .select('*')
            .order('uso_count', { ascending: false })
            .limit(20);

        if (clinicaId) {
            query = query.or(`clinica_id.eq.${clinicaId},clinica_id.is.null`);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Erro ao carregar sugestões:', error);
            return [];
        }
        return (data || []) as GuideItemCatalog[];
    },

    async updateItemCatalog(nome: string, clinicaId?: string): Promise<void> {
        // Verificar se já existe
        let query = supabase
            .from('guide_item_catalog')
            .select('id, uso_count')
            .eq('nome', nome);

        if (clinicaId) {
            query = query.eq('clinica_id', clinicaId);
        } else {
            query = query.is('clinica_id', null);
        }

        const { data: existing } = await query.maybeSingle();

        if (existing) {
            // Incrementar contagem
            await supabase
                .from('guide_item_catalog')
                .update({
                    uso_count: existing.uso_count + 1,
                    last_used_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
        } else {
            // Criar novo
            await supabase
                .from('guide_item_catalog')
                .insert({
                    nome,
                    clinica_id: clinicaId || null,
                    uso_count: 1,
                });
        }
    },
};
