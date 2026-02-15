export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[]

export interface Database {
    public: {
        Tables: {
            clinics: {
                Row: {
                    id: string
                    created_at: string
                    commercial_name: string
                    legal_name: string | null
                    nif: string | null
                    email: string | null
                    phone: string | null
                    logo_url: string | null
                    website: string | null
                    hq_address: string | null
                    hq_zip_code: string | null
                    hq_city: string | null
                    hq_country: string | null
                    hq_maps_link: string | null
                    whatsapp_permission: 'ignore' | 'warn' | 'execute' | null
                    is_active: boolean | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    commercial_name: string
                    legal_name?: string | null
                    nif?: string | null
                    email?: string | null
                    phone?: string | null
                    logo_url?: string | null
                    website?: string | null
                    hq_address?: string | null
                    hq_zip_code?: string | null
                    hq_city?: string | null
                    hq_country?: string | null
                    hq_maps_link?: string | null
                    whatsapp_permission?: 'ignore' | 'warn' | 'execute' | null
                    is_active?: boolean | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    commercial_name?: string
                    legal_name?: string | null
                    nif?: string | null
                    email?: string | null
                    phone?: string | null
                    logo_url?: string | null
                    website?: string | null
                    hq_address?: string | null
                    hq_zip_code?: string | null
                    hq_city?: string | null
                    hq_country?: string | null
                    hq_maps_link?: string | null
                    whatsapp_permission?: 'ignore' | 'warn' | 'execute' | null
                    is_active?: boolean | null
                }
            }
            clinic_contacts: {
                Row: {
                    id: string
                    clinic_id: string
                    created_at: string
                    name: string | null
                    phone: string | null
                    type: string | null
                    updated_at: string | null
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    created_at?: string
                    name?: string | null
                    phone?: string | null
                    type?: string | null
                    updated_at?: string | null
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    created_at?: string
                    name?: string | null
                    phone?: string | null
                    type?: string | null
                    updated_at?: string | null
                }
            }
            clinic_delivery_points: {
                Row: {
                    id: string
                    clinic_id: string
                    created_at: string
                    name: string
                    address: string | null
                    zip_code: string | null
                    city: string | null
                    maps_link: string | null
                    distance_km: number | null
                    is_hq: boolean | null
                    contact_name: string | null
                    contact_phone: string | null
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    created_at?: string
                    name: string
                    address?: string | null
                    zip_code?: string | null
                    city?: string | null
                    maps_link?: string | null
                    distance_km?: number | null
                    is_hq?: boolean | null
                    contact_name?: string | null
                    contact_phone?: string | null
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    created_at?: string
                    name?: string
                    address?: string | null
                    zip_code?: string | null
                    city?: string | null
                    maps_link?: string | null
                    distance_km?: number | null
                    is_hq?: boolean | null
                    contact_name?: string | null
                    contact_phone?: string | null
                }
            }
            clinic_staff: {
                Row: {
                    id: string
                    clinic_id: string
                    created_at: string
                    name: string
                    role: 'assistant' | 'receptionist' | 'accounting' | 'manager' | 'other' | null
                    phone: string | null
                    email: string | null
                    is_contact: boolean
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    created_at?: string
                    name: string
                    role?: 'assistant' | 'receptionist' | 'accounting' | 'manager' | 'other' | null
                    phone?: string | null
                    email?: string | null
                    is_contact?: boolean
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    created_at?: string
                    name?: string
                    role?: 'assistant' | 'receptionist' | 'accounting' | 'manager' | 'other' | null
                    phone?: string | null
                    email?: string | null
                    is_contact?: boolean
                }
            }
            delivery_point_contacts: {
                Row: {
                    id: string
                    delivery_point_id: string
                    staff_id: string
                    created_at: string
                }
                Insert: {
                    id?: string
                    delivery_point_id: string
                    staff_id: string
                    created_at?: string
                }
                Update: {
                    id?: string
                    delivery_point_id?: string
                    staff_id?: string
                    created_at?: string
                }
            }
            clinic_discounts: {
                Row: {
                    id: string
                    clinic_id: string
                    created_at: string
                    name: string
                    value: number
                    is_percentage: boolean | null
                    scope: 'global' | 'specific' | null
                    target_product_ids: string[] | null
                }
                Insert: {
                    id?: string
                    clinic_id: string
                    created_at?: string
                    name: string
                    value: number
                    is_percentage?: boolean | null
                    scope?: 'global' | 'specific' | null
                    target_product_ids?: string[] | null
                }
                Update: {
                    id?: string
                    clinic_id?: string
                    created_at?: string
                    name?: string
                    value?: number
                    is_percentage?: boolean | null
                    scope?: 'global' | 'specific' | null
                    target_product_ids?: string[] | null
                }
            }
            organization_settings: {
                Row: {
                    id: string
                    created_at: string
                    setting_key: string
                    hq_maps_link: string | null
                    hq_coordinates: string | null
                    cost_per_km: number | null
                }
                Insert: {
                    id?: string
                    created_at?: string
                    setting_key: string
                    hq_maps_link?: string | null
                    hq_coordinates?: string | null
                    cost_per_km?: number | null
                }
                Update: {
                    id?: string
                    created_at?: string
                    setting_key?: string
                    hq_maps_link?: string | null
                    hq_coordinates?: string | null
                    cost_per_km?: number | null
                }
            }
        }
    }
}
