import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database.types';

// === Tipos para o módulo Pacientes ===

// Paciente na lista (com dados join)
export type PatientListItem = Tables<'patients'> & {
    clinica: { id: string; commercial_name: string } | null;
    medico: { user_id: string; full_name: string } | null;
    treatment_plans: { id: string; estado: string }[];
};

// Paciente completo (para a ficha)
export type PatientFullDetails = Tables<'patients'> & {
    clinica: { id: string; commercial_name: string } | null;
    medico: { user_id: string; full_name: string } | null;
    treatment_plans: (Tables<'treatment_plans'> & {
        work_type: { id: string; nome: string; cor: string | null } | null;
        medico: { user_id: string; full_name: string } | null;
        clinica: { id: string; commercial_name: string } | null;
        phases: (Tables<'phases'> & {
            appointments: Tables<'appointments'>[];
        })[];
    })[];
};

export const patientsService = {
    // 1. Listar pacientes (para a sidebar/lista)
    async getPatients(): Promise<PatientListItem[]> {
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinica:clinics!patients_clinica_id_fkey(id, commercial_name),
                medico:user_profiles!patients_medico_principal_id_fkey(user_id, full_name),
                treatment_plans(id, estado)
            `)
            .is('deleted_at', null)
            .is('merged_into_id', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as PatientListItem[];
    },

    // 2. Obter detalhes completos de um paciente
    async getPatientDetails(id: string): Promise<PatientFullDetails | null> {
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinica:clinics!patients_clinica_id_fkey(id, commercial_name),
                medico:user_profiles!patients_medico_principal_id_fkey(user_id, full_name),
                treatment_plans(
                    *,
                    work_type:work_types!treatment_plans_tipo_trabalho_id_fkey(id, nome, cor),
                    medico:user_profiles!treatment_plans_medico_id_fkey(user_id, full_name),
                    clinica:clinics!treatment_plans_clinica_id_fkey(id, commercial_name),
                    phases(
                        *,
                        appointments(*)
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as PatientFullDetails;
    },

    // 3. Criar novo paciente
    async createPatient(data: {
        nome: string;
        clinica_id: string;
        medico_principal_id: string;
    }) {
        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                nome: data.nome,
                clinica_id: data.clinica_id,
                medico_principal_id: data.medico_principal_id,
                origem: 'app' as const,
            })
            .select('id, t_id, nome')
            .single();

        if (error) throw error;
        return patient;
    },

    // 4. Update genérico (auto-save)
    async updatePatient(id: string, data: Record<string, unknown>) {
        const { error } = await supabase
            .from('patients')
            .update(data)
            .eq('id', id);

        if (error) throw error;
    },

    // 5. Soft delete
    async softDeletePatient(id: string) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('patients')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id || null,
            })
            .eq('id', id);

        if (error) throw error;
    },

    // 6. Toggle urgente
    async toggleUrgent(id: string, urgente: boolean) {
        const { error } = await supabase
            .from('patients')
            .update({ urgente })
            .eq('id', id);

        if (error) throw error;
    },

    // 7. Buscar clínicas para dropdown
    async getClinics() {
        const { data, error } = await supabase
            .from('clinics')
            .select('id, commercial_name')
            .eq('is_active', true)
            .order('commercial_name');

        if (error) throw error;
        return data || [];
    },

    // 8. Buscar médicos para dropdown
    async getDoctors() {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, full_name')
            .eq('app_role', 'doctor')
            .order('full_name');

        if (error) throw error;
        return data || [];
    },

    // 9. Buscar work types para dropdown
    async getWorkTypes() {
        const { data, error } = await supabase
            .from('work_types')
            .select('id, nome, cor, categoria')
            .eq('activo', true)
            .order('ordem');

        if (error) throw error;
        return data || [];
    },

    // 10. Criar plano de tratamento
    async createTreatmentPlan(data: {
        patient_id: string;
        nome: string;
        tipo_trabalho_id: string;
        medico_id: string;
        clinica_id: string;
    }) {
        const { data: plan, error } = await supabase
            .from('treatment_plans')
            .insert({
                patient_id: data.patient_id,
                nome: data.nome,
                tipo_trabalho_id: data.tipo_trabalho_id,
                medico_id: data.medico_id,
                clinica_id: data.clinica_id,
                origem: 'app' as const,
            })
            .select('*')
            .single();

        if (error) throw error;
        return plan;
    },

    // 11. Update genérico para qualquer tabela
    async updateRecord(table: 'treatment_plans' | 'phases' | 'appointments' | 'considerations', id: string, data: Record<string, unknown>) {
        const { error } = await supabase
            .from(table)
            .update(data)
            .eq('id', id);

        if (error) throw error;
    },

    // 12. Criar fase dentro de um plano
    async createPhase(data: {
        treatment_plan_id: string;
        nome: string;
        ordem: number;
        notas?: string;
    }) {
        const { data: phase, error } = await supabase
            .from('phases')
            .insert({
                plan_id: data.treatment_plan_id,
                nome: data.nome,
                ordem: data.ordem,
                notas: data.notas || null,
            })
            .select('*')
            .single();

        if (error) throw error;
        return phase;
    },

    // 13. Criar agendamento dentro de uma fase
    async createAppointment(data: {
        phase_id: string;
        tipo: string;
        data_prevista?: string;
        notas?: string;
    }) {
        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert({
                phase_id: data.phase_id,
                tipo: data.tipo,
                agendada_para: data.data_prevista || null,
                notas: data.notas || null,
            })
            .select('*')
            .single();

        if (error) throw error;
        return appointment;
    },

    // 14. Alterar estado do plano
    async updatePlanState(planId: string, estado: string) {
        const updates: Record<string, unknown> = { estado };
        if (estado === 'concluido') {
            updates.data_conclusao = new Date().toISOString();
        }
        const { error } = await supabase
            .from('treatment_plans')
            .update(updates)
            .eq('id', planId);

        if (error) throw error;
    },

    // 15. Obter detalhes de um plano específico (com fases e agendamentos)
    async getPlanDetails(planId: string) {
        const { data, error } = await supabase
            .from('treatment_plans')
            .select(`
                *,
                work_type:work_types!treatment_plans_tipo_trabalho_id_fkey(id, nome, cor),
                medico:user_profiles!treatment_plans_medico_id_fkey(user_id, full_name),
                clinica:clinics!treatment_plans_clinica_id_fkey(id, commercial_name),
                patient:patients!treatment_plans_patient_id_fkey(id, nome, t_id),
                phases(
                    *,
                    appointments(*)
                )
            `)
            .eq('id', planId)
            .single();

        if (error) throw error;
        return data;
    },

    // 16. Listar considerações de um paciente (com filtro por fase opcional)
    async getConsiderations(patientId: string, phaseId?: string) {
        // Considerations liga-se via phase_id, não tem patient_id directo
        if (phaseId) {
            // Filtro directo numa fase
            const { data, error } = await supabase
                .from('considerations')
                .select(`
                    *,
                    autor:user_profiles!considerations_autor_id_fkey(user_id, full_name, app_role)
                `)
                .eq('phase_id', phaseId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }

        // Buscar todas as fases do paciente via planos
        const { data: plans } = await supabase
            .from('treatment_plans')
            .select('id')
            .eq('patient_id', patientId);

        if (!plans || plans.length === 0) return [];

        const { data: phases } = await supabase
            .from('phases')
            .select('id')
            .in('plan_id', plans.map(p => p.id));

        if (!phases || phases.length === 0) return [];

        const { data, error } = await supabase
            .from('considerations')
            .select(`
                *,
                autor:user_profiles!considerations_autor_id_fkey(user_id, full_name, app_role)
            `)
            .in('phase_id', phases.map(p => p.id))
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // 17. Criar consideração
    async createConsideration(data: {
        phase_id: string;
        appointment_id?: string;
        lado: string;
        conteudo: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        const { data: consideration, error } = await supabase
            .from('considerations')
            .insert({
                appointment_id: data.appointment_id || null,
                phase_id: data.phase_id,
                lado: data.lado,
                conteudo: data.conteudo,
                autor_id: user?.id || '',
                versao: 1,
            })
            .select('*')
            .single();

        if (error) throw error;
        return consideration;
    },

    // 18. Listar ficheiros de um paciente
    async getFiles(patientId: string) {
        const { data, error } = await supabase
            .from('files')
            .select(`
                *,
                enviado_por:user_profiles!files_enviado_por_fkey(user_id, full_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // 19. Upload de ficheiro (Storage + metadata)
    async uploadFile(data: {
        file: File;
        patient_id: string;
        plan_id?: string;
        phase_id?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilizador não autenticado');

        // Determinar tipo com base no mime_type
        const mimeType = data.file.type;
        let tipo = 'outro';
        if (mimeType.startsWith('image/')) tipo = 'foto';
        else if (mimeType.startsWith('video/')) tipo = 'video';
        else if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.includes('text/')) tipo = 'documento';
        else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('compressed')) tipo = 'comprimido';
        else if (data.file.name.toLowerCase().endsWith('.stl')) tipo = 'stl';

        // Gerar path único no storage
        const timestamp = Date.now();
        const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${data.patient_id}/${timestamp}_${safeName}`;

        // 1. Upload para Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('patient-files')
            .upload(storagePath, data.file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // 2. Inserir metadata na tabela files
        const { data: fileRecord, error: dbError } = await supabase
            .from('files')
            .insert({
                patient_id: data.patient_id,
                plan_id: data.plan_id || null,
                phase_id: data.phase_id || null,
                nome_original: data.file.name,
                nome_nas: safeName,
                tipo,
                mime_type: mimeType,
                caminho_nas: storagePath,
                tamanho: data.file.size,
                enviado_por: user.id,
                versao: 1,
                origem: 'app',
            })
            .select('*')
            .single();

        if (dbError) {
            // Rollback: apagar ficheiro do storage se falhou o insert
            await supabase.storage.from('patient-files').remove([storagePath]);
            throw dbError;
        }

        return fileRecord;
    },

    // 20. Obter URL signed para download
    async getFileUrl(storagePath: string) {
        const { data, error } = await supabase.storage
            .from('patient-files')
            .createSignedUrl(storagePath, 3600); // 1h

        if (error) throw error;
        return data.signedUrl;
    },

    // 21. Eliminar ficheiro (storage + metadata)
    async deleteFile(fileId: string, storagePath: string) {
        // 1. Apagar do storage
        await supabase.storage.from('patient-files').remove([storagePath]);

        // 2. Apagar metadata
        const { error } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId);

        if (error) throw error;
    },

    // 22. Delete genérico (soft ou hard dependendo da tabela)
    async deleteRecord(table: 'phases' | 'appointments' | 'considerations', id: string) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },
};
