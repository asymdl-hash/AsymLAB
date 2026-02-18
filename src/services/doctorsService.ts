import { supabase } from '@/lib/supabase';

// Tipos
export interface DoctorListItem {
    user_id: string;
    full_name: string;
    avatar_url: string | null;
    phone: string | null;
}

export interface DoctorProfile {
    user_id: string;
    full_name: string;
    phone: string | null;
    avatar_url: string | null;
    app_role: string;
    contact_email: string | null;
    created_at: string;
}

export interface DoctorClinic {
    clinic_id: string;
    clinic_name: string;
    clinic_logo: string | null;
    tags: string[];
    partners: DoctorPartner[];
}

export interface DoctorPartner {
    id: string; // doctor_clinic_partners.id
    partner_id: string;
    partner_name: string;
    partner_role: string;
    partner_phone: string | null;
}

export interface AvailablePartner {
    user_id: string;
    full_name: string;
    app_role: string;
    phone: string | null;
    role_at_clinic: string | null;
}

export const doctorsService = {

    // 1. Listar médicos (para a sidebar/lista)
    async getDoctors(): Promise<DoctorListItem[]> {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, avatar_url, phone')
            .eq('app_role', 'doctor')
            .order('full_name', { ascending: true });

        if (error) throw error;

        return (data || []).map(u => ({
            user_id: u.user_id,
            full_name: u.full_name || '',
            avatar_url: u.avatar_url,
            phone: u.phone,
        }));
    },

    // 2. Obter detalhes completos de um médico
    async getDoctorDetails(userId: string): Promise<DoctorProfile> {
        // Tentar com contact_email (requer migração), fallback sem ela
        let profile: any;
        const { data: d1, error: e1 } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, phone, avatar_url, app_role, contact_email, created_at')
            .eq('user_id', userId)
            .single();

        if (e1 && e1.code === '42703') {
            // Coluna contact_email não existe — fallback
            const { data: d2, error: e2 } = await supabase
                .from('user_profiles')
                .select('user_id, full_name, phone, avatar_url, app_role, created_at')
                .eq('user_id', userId)
                .single();
            if (e2) throw e2;
            profile = { ...d2, contact_email: null };
        } else if (e1) {
            throw e1;
        } else {
            profile = d1;
        }

        return {
            user_id: profile.user_id,
            full_name: profile.full_name || '',
            phone: profile.phone,
            avatar_url: profile.avatar_url,
            app_role: profile.app_role || 'doctor',
            contact_email: profile.contact_email || null,
            created_at: profile.created_at,
        };
    },



    // 4. Buscar clínicas do médico (via user_clinic_access)
    async getDoctorClinics(userId: string): Promise<DoctorClinic[]> {
        const { data: clinicAccess, error } = await supabase
            .from('user_clinic_access')
            .select('clinic_id, tags, clinics(id, commercial_name, logo_url)')
            .eq('user_id', userId);

        if (error) throw error;

        const clinics = (clinicAccess || []).map((ca: any) => ({
            clinic_id: ca.clinic_id,
            clinic_name: ca.clinics?.commercial_name || '',
            clinic_logo: ca.clinics?.logo_url || null,
            tags: ca.tags || [],
        }));

        // Para cada clínica, buscar parceiros (com fallback seguro)
        const result: DoctorClinic[] = [];
        for (const clinic of clinics) {
            let partners: DoctorPartner[] = [];
            try {
                partners = await this.getClinicPartnersForDoctor(userId, clinic.clinic_id);
            } catch {
                // Tabela doctor_clinic_partners pode não existir ainda
            }
            result.push({ ...clinic, partners });
        }

        return result;
    },

    // 5. Buscar parceiros de um médico numa clínica específica
    async getClinicPartnersForDoctor(doctorId: string, clinicId: string): Promise<DoctorPartner[]> {
        const { data, error } = await supabase
            .from('doctor_clinic_partners')
            .select('id, partner_id, user_profiles!doctor_clinic_partners_partner_id_fkey(full_name, app_role, phone)')
            .eq('doctor_id', doctorId)
            .eq('clinic_id', clinicId);

        if (error) throw error;

        return (data || []).map((d: any) => ({
            id: d.id,
            partner_id: d.partner_id,
            partner_name: d.user_profiles?.full_name || '',
            partner_role: d.user_profiles?.app_role || '',
            partner_phone: d.user_profiles?.phone || null,
        }));
    },

    // 6. Adicionar parceiro
    async addPartner(doctorId: string, clinicId: string, partnerId: string) {
        const { data, error } = await supabase
            .from('doctor_clinic_partners')
            .insert({ doctor_id: doctorId, clinic_id: clinicId, partner_id: partnerId })
            .select('id')
            .single();

        if (error) throw error;
        return data;
    },

    // 7. Remover parceiro
    async removePartner(id: string) {
        const { error } = await supabase
            .from('doctor_clinic_partners')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // 8. Utilizadores disponíveis como parceiros numa clínica
    // Exclui: médicos e contabilidade dessa clínica
    async getAvailablePartners(clinicId: string): Promise<AvailablePartner[]> {
        const { data, error } = await supabase
            .from('user_clinic_access')
            .select('user_id, role_at_clinic, user_profiles!user_clinic_access_user_id_profiles_fkey(full_name, app_role, phone)')
            .eq('clinic_id', clinicId);

        if (error) throw error;

        return (data || [])
            .filter((d: any) => {
                const role = d.user_profiles?.app_role || '';
                return role !== 'doctor' && !role.startsWith('contabilidade');
            })
            .map((d: any) => ({
                user_id: d.user_id,
                full_name: d.user_profiles?.full_name || '',
                app_role: d.user_profiles?.app_role || '',
                phone: d.user_profiles?.phone || null,
                role_at_clinic: d.role_at_clinic,
            }));
    },

};
