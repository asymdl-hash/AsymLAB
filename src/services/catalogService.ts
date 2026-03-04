'use client';

import { supabase } from '@/lib/supabase';

// ===== GENERIC CATALOG CRUD =====

export interface CatalogItem {
    id: string;
    [key: string]: any;
}

export const catalogService = {

    // ─── WORK TYPES ───────────────────────────────────────────

    async getWorkTypes() {
        const { data, error } = await supabase
            .from('work_types')
            .select('*')
            .order('ordem', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createWorkType(item: { nome: string; cor?: string; categoria?: string }) {
        const { data: maxOrdem } = await supabase
            .from('work_types')
            .select('ordem')
            .order('ordem', { ascending: false })
            .limit(1)
            .single();

        const { data, error } = await supabase
            .from('work_types')
            .insert({
                nome: item.nome,
                cor: item.cor || '#6366f1',
                categoria: item.categoria || 'geral',
                activo: true,
                ordem: (maxOrdem?.ordem || 0) + 1,
            })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateWorkType(id: string, updates: Partial<{ nome: string; cor: string; categoria: string; activo: boolean; ordem: number; codigo: string | null; preco: number; iva_percent: number; materiais: string[]; fases_producao: string[]; tempo_estimado: number; notas_producao: string | null }>) {
        const { data, error } = await supabase
            .from('work_types')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteWorkType(id: string) {
        const { error } = await supabase
            .from('work_types')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ─── MATERIALS ────────────────────────────────────────────

    async getMaterials() {
        const { data, error } = await supabase
            .from('materials_catalog')
            .select('*')
            .order('nome', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createMaterial(item: { nome: string; categoria?: string; cor?: string }) {
        const { data, error } = await supabase
            .from('materials_catalog')
            .insert({
                nome: item.nome,
                categoria: item.categoria || 'geral',
                cor: item.cor || '#94a3b8',
                activo: true,
            })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateMaterial(id: string, updates: Partial<{ nome: string; categoria: string; cor: string; activo: boolean }>) {
        const { data, error } = await supabase
            .from('materials_catalog')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteMaterial(id: string) {
        const { error } = await supabase
            .from('materials_catalog')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ─── TOOTH COLORS ─────────────────────────────────────────

    async getToothColors() {
        const { data, error } = await supabase
            .from('tooth_colors')
            .select('*')
            .order('codigo', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createToothColor(item: { codigo: string; nome: string; grupo?: string }) {
        const { data, error } = await supabase
            .from('tooth_colors')
            .insert({
                codigo: item.codigo,
                nome: item.nome,
                grupo: item.grupo || 'A',
                activo: true,
            })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateToothColor(id: string, updates: Partial<{ codigo: string; nome: string; grupo: string; activo: boolean }>) {
        const { data, error } = await supabase
            .from('tooth_colors')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteToothColor(id: string) {
        const { error } = await supabase
            .from('tooth_colors')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ─── TEMPLATES (usa considerationsService, mas expõe lista simples) ──

    async getTemplates() {
        const { data, error } = await supabase
            .from('consideration_templates')
            .select(`
                *,
                fields:consideration_template_fields(*)
            `)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return (data || []).map(t => ({
            ...t,
            fields: (t.fields || []).sort((a: any, b: any) => a.ordem - b.ordem),
        }));
    },

    async deleteTemplate(id: string) {
        const { error } = await supabase
            .from('consideration_templates')
            .delete()
            .eq('id', id);
        if (error) throw error;
    },

    // ─── WORK STATUS CATALOG ──────────────────────────────────

    async getWorkStatuses() {
        const { data, error } = await supabase
            .from('work_status_catalog')
            .select('*')
            .order('ordem', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async updateWorkStatus(id: string, updates: Partial<{ nome: string; emoji: string; categoria: string; activo: boolean }>) {
        const { data, error } = await supabase
            .from('work_status_catalog')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    // ─── SUPPLIERS (Fornecedores) ─────────────────────────────

    async getSuppliers() {
        const { data, error } = await supabase
            .from('suppliers')
            .select('*')
            .order('nome', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createSupplier(item: {
        nome: string; razao_social?: string; nif?: string; website?: string;
        iban?: string; telefone?: string; morada?: string; codigo_postal?: string;
        localidade?: string; google_maps_url?: string; contactos?: any[];
        cor?: string;
    }) {
        const { data, error } = await supabase
            .from('suppliers')
            .insert({ ...item, activo: true })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateSupplier(id: string, updates: Partial<{
        nome: string; razao_social: string; nif: string; website: string;
        iban: string; telefone: string; morada: string; codigo_postal: string;
        localidade: string; google_maps_url: string; contactos: any[];
        cor: string; activo: boolean;
    }>) {
        const { data, error } = await supabase
            .from('suppliers')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteSupplier(id: string) {
        const { error } = await supabase.from('suppliers').delete().eq('id', id);
        if (error) throw error;
    },

    // ─── BRANDS (Marcas) ──────────────────────────────────────

    async getBrands() {
        const { data, error } = await supabase
            .from('brands')
            .select('*')
            .order('nome', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createBrand(nome: string) {
        const { data, error } = await supabase
            .from('brands')
            .insert({ nome, activo: true })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateBrand(id: string, updates: Partial<{ nome: string; activo: boolean }>) {
        const { data, error } = await supabase
            .from('brands')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteBrand(id: string) {
        const { error } = await supabase.from('brands').delete().eq('id', id);
        if (error) throw error;
    },

    // ─── PRODUCTION PHASES (Fases de Produção) ────────────────

    async getProductionPhases() {
        const { data, error } = await supabase
            .from('production_phases')
            .select('*')
            .order('ordem', { ascending: true });
        if (error) throw error;
        return data || [];
    },

    async createProductionPhase(item: { nome: string; cor?: string }) {
        const { data: maxOrdem } = await supabase
            .from('production_phases')
            .select('ordem')
            .order('ordem', { ascending: false })
            .limit(1)
            .single();

        const { data, error } = await supabase
            .from('production_phases')
            .insert({
                nome: item.nome,
                cor: item.cor || '#6366f1',
                ordem: (maxOrdem?.ordem || 0) + 1,
                activo: true,
            })
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async updateProductionPhase(id: string, updates: Partial<{ nome: string; cor: string; ordem: number; activo: boolean }>) {
        const { data, error } = await supabase
            .from('production_phases')
            .update(updates)
            .eq('id', id)
            .select('*')
            .single();
        if (error) throw error;
        return data;
    },

    async deleteProductionPhase(id: string) {
        const { error } = await supabase.from('production_phases').delete().eq('id', id);
        if (error) throw error;
    },
};
