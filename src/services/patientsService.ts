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
    async updateRecord(table: 'treatment_plans' | 'phases' | 'appointments', id: string, data: Record<string, unknown>) {
        const { error } = await supabase
            .from(table)
            .update(data)
            .eq('id', id);

        if (error) throw error;
    },
};
