'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import {
    AppRole, AppModule, AccessLevel,
    getAccessLevel, hasAccess, canEdit, isReadOnly, getVisibleModules
} from '@/lib/permissions';

interface UserProfile {
    id: string;
    email: string;
    username: string | null;
    is_username_account: boolean;
    full_name: string;
    app_role: AppRole;
    avatar_url: string | null;
    clinics: { clinic_id: string; clinic_name: string; clinic_role: string }[];
}

interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    role: AppRole;

    // Permissões
    getAccess: (module: AppModule) => AccessLevel;
    hasAccess: (module: AppModule) => boolean;
    canEdit: (module: AppModule) => boolean;
    isReadOnly: (module: AppModule) => boolean;
    visibleModules: AppModule[];
    isAdmin: boolean;

    // Refrescar dados
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchUserProfile = useCallback(async () => {
        try {
            const { data: { session } } = await supabase.auth.getSession();

            if (!session?.user) {
                setUser(null);
                setLoading(false);
                return;
            }

            const authUser = session.user;

            // Buscar o profile do utilizador
            const { data: profile } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('user_id', authUser.id)
                .single();

            // Buscar as clínicas associadas
            const { data: clinicAccess } = await supabase
                .from('user_clinic_access')
                .select('clinic_id, clinic_role, clinics(commercial_name)')
                .eq('user_id', authUser.id);

            const isUsernameAccount = authUser.email?.endsWith('@asymlab.app') || false;

            setUser({
                id: authUser.id,
                email: authUser.email || '',
                username: isUsernameAccount
                    ? (authUser.email?.replace('@asymlab.app', '') || null)
                    : null,
                is_username_account: isUsernameAccount,
                full_name: profile?.full_name || authUser.user_metadata?.full_name || 'Utilizador',
                app_role: (profile?.app_role as AppRole) || 'staff_lab',
                avatar_url: profile?.avatar_url || null,
                clinics: (clinicAccess || []).map((ca: any) => ({
                    clinic_id: ca.clinic_id,
                    clinic_name: ca.clinics?.commercial_name || 'N/A',
                    clinic_role: ca.clinic_role
                }))
            });
        } catch (error) {
            console.error('Erro ao carregar perfil:', error);
            setUser(null);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchUserProfile();

        // Escutar mudanças de auth (login/logout)
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            if (session) {
                fetchUserProfile();
            } else {
                setUser(null);
                setLoading(false);
            }
        });

        return () => subscription.unsubscribe();
    }, [fetchUserProfile]);

    const role: AppRole = user?.app_role || 'staff_lab';

    const contextValue: AuthContextType = {
        user,
        loading,
        role,

        // Permissões
        getAccess: (module: AppModule) => getAccessLevel(role, module),
        hasAccess: (module: AppModule) => hasAccess(role, module),
        canEdit: (module: AppModule) => canEdit(role, module),
        isReadOnly: (module: AppModule) => isReadOnly(role, module),
        visibleModules: getVisibleModules(role),
        isAdmin: role === 'admin',

        // Refrescar
        refreshUser: fetchUserProfile,
    };

    return (
        <AuthContext.Provider value={contextValue}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
