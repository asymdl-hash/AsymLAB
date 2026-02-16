// Sistema de Permissões Granulares — AsymLAB
// 3 níveis de acesso por módulo, configurável por role

export type AccessLevel = 'none' | 'read' | 'full';

export type AppRole = 'admin' | 'doctor' | 'staff_clinic' | 'staff_lab' | 'contabilidade_clinic' | 'contabilidade_lab';

export type AppModule =
    | 'dashboard'
    | 'clinics'
    | 'doctors'
    | 'patients'
    | 'schedule'
    | 'billing'
    | 'reports'
    | 'settings';

// Mapeamento de módulo -> path na sidebar
export const MODULE_PATHS: Record<AppModule, string> = {
    dashboard: '/dashboard',
    clinics: '/dashboard/clinics',
    doctors: '/dashboard/doctors',
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
 * | Módulo      | Admin | Médico | Staff Clínica | Staff Lab | Contab. Clínica | Contab. Lab |
 * |-------------|-------|--------|---------------|-----------|-----------------|-------------|
 * | Dashboard   | full  | none   | none          | read      | none            | read        |
 * | Clínicas    | full  | read   | read          | read      | read            | read        |
 * | Pacientes   | full  | full*  | read          | read      | none            | none        |
 * | Agenda      | full  | none   | none          | none      | none            | none        |
 * | Faturação   | full  | none   | none          | none      | read            | read        |
 * | Relatórios  | full  | none   | none          | none      | read            | read        |
 * | Definições  | full  | none   | none          | none      | none            | none        |
 * 
 * *Médico tem acesso total mas apenas aos seus pacientes (implementado via RLS)
 */
export const PERMISSIONS_MATRIX: Record<AppRole, Record<AppModule, AccessLevel>> = {
    admin: {
        dashboard: 'full',
        clinics: 'full',
        doctors: 'full',
        patients: 'full',
        schedule: 'full',
        billing: 'full',
        reports: 'full',
        settings: 'full',
    },
    doctor: {
        dashboard: 'none',
        clinics: 'read',
        doctors: 'read',
        patients: 'full',
        schedule: 'none',
        billing: 'none',
        reports: 'none',
        settings: 'none',
    },
    staff_clinic: {
        dashboard: 'none',
        clinics: 'read',
        doctors: 'read',
        patients: 'read',
        schedule: 'none',
        billing: 'none',
        reports: 'none',
        settings: 'none',
    },
    staff_lab: {
        dashboard: 'read',
        clinics: 'read',
        doctors: 'read',
        patients: 'read',
        schedule: 'none',
        billing: 'none',
        reports: 'none',
        settings: 'none',
    },
    contabilidade_clinic: {
        dashboard: 'none',
        clinics: 'read',
        doctors: 'none',
        patients: 'none',
        schedule: 'none',
        billing: 'read',
        reports: 'read',
        settings: 'none',
    },
    contabilidade_lab: {
        dashboard: 'read',
        clinics: 'read',
        doctors: 'none',
        patients: 'none',
        schedule: 'none',
        billing: 'read',
        reports: 'read',
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
    staff_clinic: 'Staff Clínica',
    staff_lab: 'Staff Lab',
    contabilidade_clinic: 'Contabilidade Clínica',
    contabilidade_lab: 'Contabilidade Lab',
};
