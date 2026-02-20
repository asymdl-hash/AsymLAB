import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

// Tipagem forte para os dados da Clínica (incluindo relações)
export type Clinic = Database['public']['Tables']['clinics']['Row'];
export type ClinicContact = Database['public']['Tables']['clinic_contacts']['Row'];
export type ClinicDeliveryPoint = Database['public']['Tables']['clinic_delivery_points']['Row'];
export type ClinicDiscount = Database['public']['Tables']['clinic_discounts']['Row'];

// Membro da equipa = user_profile associado via user_clinic_access
export interface ClinicTeamMember {
    user_id: string;
    full_name: string;
    phone: string | null;
    app_role: string;
    is_contact: boolean;
    role_at_clinic: string | null;
    tags: string[];
}

export type ClinicFullDetails = Clinic & {
    clinic_contacts: ClinicContact[];
    clinic_delivery_points: ClinicDeliveryPoint[];
    clinic_discounts: ClinicDiscount[];
};

export const clinicsService = {
    // 1. Listar Clínicas (Para a Sidebar)
    async getClinics() {
        const { data, error } = await supabase
            .from('clinics')
            .select('id, commercial_name, legal_name, logo_url, is_active, email')
            .order('commercial_name', { ascending: true });

        if (error) throw error;
        return data as Clinic[];
    },

    // 2. Obter Detalhes Completos (Para o Formulário)
    async getClinicDetails(id: string) {
        const { data, error } = await supabase
            .from('clinics')
            .select(`
        *,
        clinic_contacts(*),
        clinic_delivery_points(*),
        clinic_discounts(*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as unknown as ClinicFullDetails;
    },

    // 3. Criar Nova Clínica
    async createClinic(name: string) {
        const { data, error } = await supabase
            .from('clinics')
            .insert({ commercial_name: name })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    // 4. Delete
    async deleteClinic(id: string) {
        const { error } = await supabase.from('clinics').delete().eq('id', id);
        if (error) throw error;
    },

    // 5. UPDATE GENÉRICO (Auto-Save Power)
    async updateRecord(table: any, id: string, data: any) {
        const { data: updated, error } = await supabase
            .from(table)
            .update(data)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return updated;
    },

    // 6. Criar Sub-Registos
    async createRelatedRecord(table: any, data: any) {
        const { data: created, error } = await supabase
            .from(table)
            .insert(data)
            .select()
            .single();

        if (error) throw error;
        return created;
    },

    // 7. Delete Sub-Registos
    async deleteRecord(table: any, id: string) {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
    },

    // 8a. Buscar TODOS os membros da equipa da clínica (user_clinic_access + user_profiles)
    async getClinicTeam(clinicId: string): Promise<ClinicTeamMember[]> {
        const { data, error } = await supabase
            .from('user_clinic_access')
            .select('user_id, is_contact, role_at_clinic, tags, user_profiles!user_clinic_access_user_id_profiles_fkey(full_name, phone, app_role)')
            .eq('clinic_id', clinicId);

        if (error) throw error;
        return (data || []).map((d: any) => ({
            user_id: d.user_id,
            full_name: d.user_profiles?.full_name || '',
            phone: d.user_profiles?.phone || null,
            app_role: d.user_profiles?.app_role || '',
            is_contact: d.is_contact,
            role_at_clinic: d.role_at_clinic,
            tags: d.tags || [],
        }));
    },

    // 8b. Buscar membros da equipa marcados como contacto
    async getClinicTeamContacts(clinicId: string): Promise<ClinicTeamMember[]> {
        const { data, error } = await supabase
            .from('user_clinic_access')
            .select('user_id, is_contact, role_at_clinic, tags, user_profiles!user_clinic_access_user_id_profiles_fkey(full_name, phone, app_role)')
            .eq('clinic_id', clinicId)
            .eq('is_contact', true);

        if (error) throw error;
        return (data || []).map((d: any) => ({
            user_id: d.user_id,
            full_name: d.user_profiles?.full_name || '',
            phone: d.user_profiles?.phone || null,
            app_role: d.user_profiles?.app_role || '',
            is_contact: d.is_contact,
            role_at_clinic: d.role_at_clinic,
            tags: d.tags || [],
        }));
    },

    // 8c. Toggle is_contact num membro da equipa
    async toggleTeamContact(userId: string, clinicId: string, isContact: boolean) {
        const { error } = await supabase
            .from('user_clinic_access')
            .update({ is_contact: isContact })
            .eq('user_id', userId)
            .eq('clinic_id', clinicId);

        if (error) throw error;
    },

    // 8d. Atualizar role_at_clinic
    async updateRoleAtClinic(userId: string, clinicId: string, role: string) {
        const { error } = await supabase
            .from('user_clinic_access')
            .update({ role_at_clinic: role })
            .eq('user_id', userId)
            .eq('clinic_id', clinicId);

        if (error) throw error;
    },

    // 8e. Adicionar membro à equipa da clínica
    async addTeamMember(userId: string, clinicId: string) {
        const { error } = await supabase
            .from('user_clinic_access')
            .insert({ user_id: userId, clinic_id: clinicId });

        if (error) throw error;
    },

    // 8f. Remover membro da equipa da clínica
    async removeTeamMember(userId: string, clinicId: string) {
        const { error } = await supabase
            .from('user_clinic_access')
            .delete()
            .eq('user_id', userId)
            .eq('clinic_id', clinicId);

        if (error) throw error;
    },

    // 9. Buscar contactos associados a um delivery point (membros e externos)
    async getDeliveryPointContacts(deliveryPointId: string) {
        const { data, error } = await supabase
            .from('delivery_point_contacts')
            .select('id, user_id, name, phone, role_label, user_profiles(full_name, phone, app_role)')
            .eq('delivery_point_id', deliveryPointId);

        if (error) throw error;
        return (data || []).map((d: any) => ({
            id: d.id,
            user_id: d.user_id ?? null,
            // Membro: usa dados do perfil; Externo: usa dados directos da tabela
            name: d.user_profiles?.full_name || d.name || '',
            phone: d.user_profiles?.phone || d.phone || null,
            role: d.role_label || d.user_profiles?.app_role || null,
            is_external: !d.user_id,
        }));
    },

    // 10a. Associar membro da equipa a delivery point
    async addDeliveryPointContact(deliveryPointId: string, userId: string) {
        const { data, error } = await supabase
            .from('delivery_point_contacts')
            .insert({ delivery_point_id: deliveryPointId, user_id: userId })
            .select('id, user_id')
            .single();

        if (error) throw error;
        return data;
    },

    // 10b. Adicionar contacto externo a delivery point (sem conta no sistema)
    async addExternalDeliveryPointContact(
        deliveryPointId: string,
        name: string,
        phone: string,
        roleLabel?: string
    ) {
        const { data, error } = await supabase
            .from('delivery_point_contacts')
            .insert({
                delivery_point_id: deliveryPointId,
                name,
                phone,
                role_label: roleLabel || null,
            })
            .select('id, name, phone, role_label')
            .single();

        if (error) throw error;
        return data;
    },

    // 11. Remover contacto de delivery point
    async removeDeliveryPointContact(id: string) {
        const { error } = await supabase
            .from('delivery_point_contacts')
            .delete()
            .eq('id', id);

        if (error) throw error;
    }
};
