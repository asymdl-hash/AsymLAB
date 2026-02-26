import { AppModule } from '@/lib/permissions';
import { MODULE_PATHS } from '@/lib/permissions';

const HOMEPAGE_KEY = 'asymlab-homepage';

// Labels amigáveis para os módulos
export const MODULE_LABELS: Record<AppModule, string> = {
    dashboard: 'Dashboard',
    clinics: 'Clínicas',
    doctors: 'Médicos',
    patients: 'Pacientes',
    queue: 'Fila de Pedidos',
    schedule: 'Agenda',
    billing: 'Faturação',
    reports: 'Relatórios',
    settings: 'Definições',
};

/**
 * Guardar o módulo homepage preferido do utilizador
 */
export function setUserHomepage(userId: string, module: AppModule): void {
    try {
        localStorage.setItem(`${HOMEPAGE_KEY}-${userId}`, module);
    } catch { /* ignore */ }
}

/**
 * Obter o módulo homepage do utilizador (default: 'dashboard')
 */
export function getUserHomepage(userId: string): AppModule {
    try {
        const stored = localStorage.getItem(`${HOMEPAGE_KEY}-${userId}`);
        if (stored && stored in MODULE_PATHS) {
            return stored as AppModule;
        }
    } catch { /* ignore */ }
    return 'dashboard';
}

/**
 * Obter o path da homepage do utilizador
 */
export function getUserHomepagePath(userId: string): string {
    const module = getUserHomepage(userId);
    return MODULE_PATHS[module] || '/dashboard';
}
