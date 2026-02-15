import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';

// Tipagem forte para os dados da Clínica (incluindo relações)
export type Clinic = Database['public']['Tables']['clinics']['Row'];
export type ClinicContact = Database['public']['Tables']['clinic_contacts']['Row'];
export type ClinicDeliveryPoint = Database['public']['Tables']['clinic_delivery_points']['Row'];
export type ClinicStaff = Database['public']['Tables']['clinic_staff']['Row'];
export type ClinicDiscount = Database['public']['Tables']['clinic_discounts']['Row'];

export type ClinicFullDetails = Clinic & {
    clinic_contacts: ClinicContact[];
    clinic_delivery_points: ClinicDeliveryPoint[];
    clinic_staff: ClinicStaff[];
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
        return data as Clinic[]; // Casting explícito para garantir tipo
    },

    // 2. Obter Detalhes Completos (Para o Formulário)
    async getClinicDetails(id: string) {
        const { data, error } = await supabase
            .from('clinics')
            .select(`
        *,
        clinic_contacts(*),
        clinic_delivery_points(*),
        clinic_staff(*),
        clinic_discounts(*)
      `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as unknown as ClinicFullDetails; // Supabase typing workaround
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

    // 8a. Buscar TODOS os membros da equipa (para dropdown entregas)
    async getClinicStaffAll(clinicId: string) {
        const { data, error } = await supabase
            .from('clinic_staff')
            .select('id, name, phone, role, is_contact')
            .eq('clinic_id', clinicId)
            .order('name');

        if (error) throw error;
        return data || [];
    },

    // 8b. Buscar membros da equipa marcados como contacto
    async getClinicTeamContacts(clinicId: string) {
        const { data, error } = await supabase
            .from('clinic_staff')
            .select('id, name, phone, role, is_contact')
            .eq('clinic_id', clinicId)
            .eq('is_contact', true);

        if (error) throw error;
        return data || [];
    },

    // 9. Buscar contactos associados a um delivery point
    async getDeliveryPointContacts(deliveryPointId: string) {
        const { data, error } = await supabase
            .from('delivery_point_contacts')
            .select('id, staff_id, clinic_staff(id, name, phone, role)')
            .eq('delivery_point_id', deliveryPointId);

        if (error) throw error;
        return (data || []).map((d: any) => ({
            id: d.id,
            staff_id: d.staff_id,
            name: d.clinic_staff?.name || '',
            phone: d.clinic_staff?.phone || null,
            role: d.clinic_staff?.role || null,
        }));
    },

    // 10. Associar contacto a delivery point
    async addDeliveryPointContact(deliveryPointId: string, staffId: string) {
        const { data, error } = await supabase
            .from('delivery_point_contacts')
            .insert({ delivery_point_id: deliveryPointId, staff_id: staffId })
            .select('id, staff_id')
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
