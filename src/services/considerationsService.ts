'use client';

import { supabase } from '@/lib/supabase';

// ===== TYPES =====
export interface ConsiderationTemplate {
    id: string;
    titulo: string;
    tipo: 'medico' | 'lab' | 'lab_inside';
    created_by: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
    fields?: TemplateField[];
}

export interface TemplateField {
    id: string;
    template_id: string;
    subtitulo: string;
    descricao_default: string;
    ordem: number;
}

export interface TemplateUsage {
    id: string;
    template_id: string;
    user_id: string;
    tipo_trabalho_id: string | null;
    phase_id: string | null;
    uso_count: number;
    last_used_at: string;
}

export interface ConsiderationField {
    subtitulo: string;
    descricao: string;
    ordem: number;
    anexos?: string[];  // paths na NAS
}

export interface ConsiderationVersion {
    id: string;
    consideration_id: string;
    version_number: number;
    fields_snapshot: ConsiderationField[];
    conteudo_snapshot: string | null;
    edited_by: string;
    edited_at: string;
}

// ===== SERVICE =====
export const considerationsService = {

    // ─── TEMPLATES ────────────────────────────────────────────

    /** Buscar templates disponíveis (defaults + próprios + partilhados) */
    async getTemplates(tipo?: string) {
        let query = supabase
            .from('consideration_templates')
            .select(`
                *,
                fields:consideration_template_fields(*)
            `)
            .order('created_at', { ascending: false });

        if (tipo) query = query.eq('tipo', tipo);

        const { data, error } = await query;
        if (error) throw error;

        // Ordenar fields por ordem
        return (data || []).map(t => ({
            ...t,
            fields: (t.fields || []).sort((a: TemplateField, b: TemplateField) => a.ordem - b.ordem),
        }));
    },

    /** Buscar templates sugeridos por contexto (user × trabalho × fase) */
    async getSuggestedTemplates(userId: string, tipoTrabalhoId?: string, phaseId?: string) {
        let query = supabase
            .from('consideration_template_usage')
            .select(`
                *,
                template:consideration_templates(
                    *,
                    fields:consideration_template_fields(*)
                )
            `)
            .eq('user_id', userId)
            .order('uso_count', { ascending: false })
            .limit(10);

        if (tipoTrabalhoId) query = query.eq('tipo_trabalho_id', tipoTrabalhoId);
        if (phaseId) query = query.eq('phase_id', phaseId);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /** Criar template novo */
    async createTemplate(data: {
        titulo: string;
        tipo: 'medico' | 'lab' | 'lab_inside';
        fields: { subtitulo: string; descricao_default?: string }[];
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Criar template
        const { data: template, error: tErr } = await supabase
            .from('consideration_templates')
            .insert({
                titulo: data.titulo,
                tipo: data.tipo,
                created_by: user.id,
            })
            .select('*')
            .single();

        if (tErr) throw tErr;

        // 2. Criar fields
        if (data.fields.length > 0) {
            const fieldsToInsert = data.fields.map((f, i) => ({
                template_id: template.id,
                subtitulo: f.subtitulo,
                descricao_default: f.descricao_default || '',
                ordem: i,
            }));

            const { error: fErr } = await supabase
                .from('consideration_template_fields')
                .insert(fieldsToInsert);

            if (fErr) throw fErr;
        }

        return template;
    },

    /** Actualizar template (título + reordenar/editar/adicionar/remover fields) */
    async updateTemplate(templateId: string, data: {
        titulo?: string;
        fields: { id?: string; subtitulo: string; descricao_default?: string }[];
    }) {
        // 1. Update título
        if (data.titulo) {
            const { error } = await supabase
                .from('consideration_templates')
                .update({ titulo: data.titulo, updated_at: new Date().toISOString() })
                .eq('id', templateId);
            if (error) throw error;
        }

        // 2. Apagar fields existentes e re-inserir (simpler que merge)
        const { error: delErr } = await supabase
            .from('consideration_template_fields')
            .delete()
            .eq('template_id', templateId);
        if (delErr) throw delErr;

        if (data.fields.length > 0) {
            const { error: insErr } = await supabase
                .from('consideration_template_fields')
                .insert(data.fields.map((f, i) => ({
                    template_id: templateId,
                    subtitulo: f.subtitulo,
                    descricao_default: f.descricao_default || '',
                    ordem: i,
                })));
            if (insErr) throw insErr;
        }
    },

    /** Eliminar template */
    async deleteTemplate(templateId: string) {
        const { error } = await supabase
            .from('consideration_templates')
            .delete()
            .eq('id', templateId);
        if (error) throw error;
    },

    /** Duplicar template (guardar como novo) */
    async duplicateTemplate(templateId: string, newTitulo?: string) {
        const templates = await this.getTemplates();
        const original = templates.find(t => t.id === templateId);
        if (!original) throw new Error('Template não encontrado');

        return this.createTemplate({
            titulo: newTitulo || `${original.titulo} (cópia)`,
            tipo: original.tipo,
            fields: (original.fields || []).map(f => ({
                subtitulo: f.subtitulo,
                descricao_default: f.descricao_default,
            })),
        });
    },

    // ─── USAGE TRACKING ───────────────────────────────────────

    /** Registrar uso de template (incrementa contador de sugestão) */
    async trackTemplateUsage(templateId: string, tipoTrabalhoId?: string, phaseId?: string) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Upsert: se já existe, incrementa; se não, cria
        const { data: existing } = await supabase
            .from('consideration_template_usage')
            .select('id, uso_count')
            .eq('template_id', templateId)
            .eq('user_id', user.id)
            .eq('tipo_trabalho_id', tipoTrabalhoId || '')
            .eq('phase_id', phaseId || '')
            .maybeSingle();

        if (existing) {
            await supabase
                .from('consideration_template_usage')
                .update({
                    uso_count: existing.uso_count + 1,
                    last_used_at: new Date().toISOString(),
                })
                .eq('id', existing.id);
        } else {
            await supabase
                .from('consideration_template_usage')
                .insert({
                    template_id: templateId,
                    user_id: user.id,
                    tipo_trabalho_id: tipoTrabalhoId || null,
                    phase_id: phaseId || null,
                });
        }
    },

    // ─── SHARES ───────────────────────────────────────────────

    /** Partilhar template com outros utilizadores */
    async shareTemplate(templateId: string, userIds: string[]) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        const inserts = userIds.map(uid => ({
            template_id: templateId,
            shared_by: user.id,
            shared_with: uid,
        }));

        const { error } = await supabase
            .from('consideration_template_shares')
            .upsert(inserts, { onConflict: 'template_id,shared_with' });

        if (error) throw error;
    },

    /** Remover partilha */
    async unshareTemplate(templateId: string, userId: string) {
        const { error } = await supabase
            .from('consideration_template_shares')
            .delete()
            .eq('template_id', templateId)
            .eq('shared_with', userId);
        if (error) throw error;
    },

    // ─── CONSIDERAÇÕES V2 ─────────────────────────────────────

    /** Buscar considerações de um paciente (todos os tipos ou filtro) */
    async getConsiderations(patientId: string, opts?: {
        lado?: string;
        phaseId?: string;
        tipo?: string;
    }) {
        let query = supabase
            .from('considerations')
            .select(`
                *,
                autor:user_profiles!considerations_autor_id_fkey(user_id, full_name, app_role),
                template:consideration_templates(titulo, tipo),
                parent:considerations!considerations_parent_id_fkey(id, conteudo, lado, fields),
                responses:considerations!considerations_parent_id_fkey(id, lado, tipo, fields, conteudo, created_at)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (opts?.lado) query = query.eq('lado', opts.lado);
        if (opts?.phaseId) query = query.eq('phase_id', opts.phaseId);
        if (opts?.tipo) query = query.eq('tipo', opts.tipo);

        const { data, error } = await query;
        if (error) throw error;
        return data || [];
    },

    /** Criar consideração V2 (com template, fields, tipo) */
    async createConsideration(data: {
        patient_id: string;
        phase_id?: string;
        appointment_id?: string;
        lado: 'medico' | 'lab' | 'lab_inside';
        tipo?: 'original' | 'resposta' | 'reencaminhamento';
        parent_id?: string;
        template_id?: string;
        conteudo?: string;
        fields?: ConsiderationField[];
        report_html_path?: string;
        anexo_url?: string;
        anexo_nome?: string;
        anexo_tipo?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        const insertData = {
            patient_id: data.patient_id,
            phase_id: data.phase_id || null,
            appointment_id: data.appointment_id || null,
            lado: data.lado,
            tipo: data.tipo || 'original',
            parent_id: data.parent_id || null,
            template_id: data.template_id || null,
            conteudo: data.conteudo || '',
            fields: data.fields || [],
            report_html_path: data.report_html_path || null,
            versao: 1,
            autor_id: user.id,
            anexo_url: data.anexo_url || null,
            anexo_nome: data.anexo_nome || null,
            anexo_tipo: data.anexo_tipo || null,
        };

        const { data: consideration, error } = await supabase
            .from('considerations')
            .insert(insertData)
            .select('*')
            .single();

        if (error) throw error;

        // Track template usage
        if (data.template_id) {
            await this.trackTemplateUsage(data.template_id);
        }

        return consideration;
    },

    /** Editar consideração (cria versão antes de editar) */
    async updateConsideration(considerationId: string, updates: {
        conteudo?: string;
        fields?: ConsiderationField[];
        report_html_path?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Não autenticado');

        // 1. Buscar estado actual para guardar snapshot
        const { data: current, error: fetchErr } = await supabase
            .from('considerations')
            .select('versao, fields, conteudo')
            .eq('id', considerationId)
            .single();

        if (fetchErr) throw fetchErr;

        // 2. Guardar versão anterior
        await supabase
            .from('consideration_versions')
            .insert({
                consideration_id: considerationId,
                version_number: current.versao || 1,
                fields_snapshot: current.fields || [],
                conteudo_snapshot: current.conteudo,
                edited_by: user.id,
            });

        // 3. Actualizar
        const { data: updated, error: updateErr } = await supabase
            .from('considerations')
            .update({
                ...updates,
                versao: (current.versao || 1) + 1,
            })
            .eq('id', considerationId)
            .select('*')
            .single();

        if (updateErr) throw updateErr;
        return updated;
    },

    // ─── VERSIONING ───────────────────────────────────────────

    /** Buscar histórico de versões de uma consideração */
    async getVersions(considerationId: string) {
        const { data, error } = await supabase
            .from('consideration_versions')
            .select(`
                *,
                editor:user_profiles!consideration_versions_edited_by_fkey(full_name)
            `)
            .eq('consideration_id', considerationId)
            .order('version_number', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // ─── SHARE LINK ───────────────────────────────────────────

    /** Gerar/refrescar link públido de partilha */
    async generateShareLink(considerationId: string, expiresInDays: number = 90) {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + expiresInDays);

        const { data, error } = await supabase
            .from('considerations')
            .update({
                share_token: crypto.randomUUID(),
                share_expires_at: expiresAt.toISOString(),
            })
            .eq('id', considerationId)
            .select('share_token')
            .single();

        if (error) throw error;
        return data?.share_token;
    },

    /** Buscar consideração por share token (público, sem auth) */
    async getByShareToken(token: string) {
        const { data, error } = await supabase
            .from('considerations')
            .select(`
                *,
                autor:user_profiles!considerations_autor_id_fkey(full_name),
                template:consideration_templates(titulo),
                parent:considerations!considerations_parent_id_fkey(id, conteudo, lado, fields)
            `)
            .eq('share_token', token)
            .gt('share_expires_at', new Date().toISOString())
            .single();

        if (error) throw error;
        return data;
    },
};
