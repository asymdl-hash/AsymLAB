// Sistema de Permissões Granulares — AsymLAB
// 3 níveis de acesso por módulo, configurável por role

export type AccessLevel = 'none' | 'read' | 'full';

export type AppRole = 'admin' | 'doctor' | 'clinic_user' | 'staff';

export type AppModule =
    | 'dashboard'
    | 'clinics'
    | 'patients'
    | 'schedule'
    | 'billing'
    | 'reports'
    | 'settings';

// Mapeamento de módulo -> path na sidebar
export const MODULE_PATHS: Record<AppModule, string> = {
    dashboard: '/dashboard',
    clinics: '/dashboard/clinics',
    patients: '/dashboard/patients',
    schedule: '/dashboard/schedule',
    billing: '/dashboard/billing',
    reports: '/dashboard/reports',
    settings: '/dashboard/settings',
};

// Mapeamento reverso: path -> módulo
export function getModuleFromPath(pathname: string): AppModule | null {
    // Ordenar por comprimento descendente para matching mais específico primeiro
    const sortedEntries = Object.entries(MODULE_PATHS)
        .sort(([, a], [, b]) => b.length - a.length);

    for (const [module, path] of sortedEntries) {
        if (pathname === path || pathname.startsWith(path + '/')) {
            return module as AppModule;
        }
    }

    // Paths especiais que não pertencem a módulos com restrição
    // ex: /dashboard/minha-conta — sempre acessível
    return null;
}

/**
 * Matriz de permissões por role
 * 
 * | Módulo      | Admin    | Médico   | Staff Clínica | Utilizador |
 * |-------------|----------|----------|---------------|------------|
 * | Dashboard   | full     | full     | read          | read       |
 * | Clínicas    | full     | read     | read          | read       |
 * | Pacientes   | full     | full*    | read          | read       |
 * | Agenda      | full     | full     | full          | read       |
 * | Faturação   | full     | read     | full          | none       |
 * | Relatórios  | full     | read     | read          | none       |
 * | Definições  | full     | none     | none          | none       |
 * 
 * *Médico tem acesso total mas apenas aos seus pacientes (implementado via RLS)
 */
export const PERMISSIONS_MATRIX: Record<AppRole, Record<AppModule, AccessLevel>> = {
    admin: {
        dashboard: 'full',
        clinics: 'full',
        patients: 'full',
        schedule: 'full',
        billing: 'full',
        reports: 'full',
        settings: 'full',
    },
    doctor: {
        dashboard: 'full',
        clinics: 'read',
        patients: 'full',
        schedule: 'full',
        billing: 'read',
        reports: 'read',
        settings: 'none',
    },
    clinic_user: {
        dashboard: 'read',
        clinics: 'read',
        patients: 'read',
        schedule: 'full',
        billing: 'full',
        reports: 'read',
        settings: 'none',
    },
    staff: {
        dashboard: 'read',
        clinics: 'read',
        patients: 'read',
        schedule: 'read',
        billing: 'none',
        reports: 'none',
        settings: 'none',
    },
};

/**
 * Obter nível de acesso para um role e módulo específico
 */
export function getAccessLevel(role: AppRole, module: AppModule): AccessLevel {
    return PERMISSIONS_MATRIX[role]?.[module] ?? 'none';
}

/**
 * Verificar se um role tem pelo menos um nível de acesso a um módulo
 */
export function hasAccess(role: AppRole, module: AppModule): boolean {
    return getAccessLevel(role, module) !== 'none';
}

/**
 * Verificar se um role pode editar num módulo
 */
export function canEdit(role: AppRole, module: AppModule): boolean {
    return getAccessLevel(role, module) === 'full';
}

/**
 * Verificar se um role tem apenas leitura num módulo
 */
export function isReadOnly(role: AppRole, module: AppModule): boolean {
    return getAccessLevel(role, module) === 'read';
}

/**
 * Obter módulos visíveis para um role (todos exceto 'none')
 */
export function getVisibleModules(role: AppRole): AppModule[] {
    return (Object.keys(PERMISSIONS_MATRIX[role] || {}) as AppModule[])
        .filter(module => PERMISSIONS_MATRIX[role][module] !== 'none');
}

/**
 * Labels legíveis dos níveis de acesso
 */
export const ACCESS_LABELS: Record<AccessLevel, string> = {
    none: 'Sem Acesso',
    read: 'Só Leitura',
    full: 'Acesso Total',
};

/**
 * Labels dos roles
 */
export const ROLE_LABELS: Record<AppRole, string> = {
    admin: 'Administrador',
    doctor: 'Médico',
    clinic_user: 'Utilizador Clínica',
    staff: 'Staff',
};
