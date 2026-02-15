'use client';

import { useAuth } from '@/contexts/AuthContext';
import { AppModule } from '@/lib/permissions';
import { ShieldAlert, Lock, Eye } from 'lucide-react';

interface PermissionGuardProps {
    module: AppModule;
    children: React.ReactNode;
    /** Conteúdo alternativo para quando o acesso é apenas leitura */
    readOnlyFallback?: React.ReactNode;
    /** Se true, mostra um banner de "só leitura" no topo em vez de bloquear */
    showReadOnlyBanner?: boolean;
}

/**
 * Componente que protege conteúdo baseado nas permissões do utilizador.
 * - Se o utilizador não tem acesso → mostra mensagem de "sem acesso"
 * - Se o utilizador tem "read" → mostra banner informativo + conteúdo (ou fallback)
 * - Se o utilizador tem "full" → mostra conteúdo normal
 */
export default function PermissionGuard({ module, children, readOnlyFallback, showReadOnlyBanner = true }: PermissionGuardProps) {
    const { hasAccess, isReadOnly, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    // Sem acesso — bloqueado
    if (!hasAccess(module)) {
        return (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
                <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
                    <ShieldAlert className="h-8 w-8 text-red-400" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900 mb-2">Acesso Restrito</h2>
                <p className="text-sm text-gray-500 max-w-sm">
                    Não tem permissão para aceder a este módulo.
                    Contacte o administrador da sua organização para solicitar acesso.
                </p>
            </div>
        );
    }

    // Acesso apenas leitura
    if (isReadOnly(module)) {
        // Se temos um fallback específico para read-only, usá-lo
        if (readOnlyFallback) {
            return <>{readOnlyFallback}</>;
        }

        // Caso contrário, mostrar banner + conteúdo normal
        // Os componentes individuais usam useModulePermission() para
        // esconder/desactivar botões de edição
        return (
            <div className="h-full flex flex-col">
                {showReadOnlyBanner && (
                    <div className="flex items-center gap-2 px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-sm text-amber-800">
                        <Eye className="h-4 w-4 flex-shrink-0 text-amber-500" />
                        <span>
                            <strong>Modo Leitura</strong> — Pode visualizar as informações, mas não fazer alterações.
                        </span>
                    </div>
                )}
                <div className="flex-1 overflow-hidden">
                    {children}
                </div>
            </div>
        );
    }

    // Acesso total
    return <>{children}</>;
}

/**
 * Hook para verificar permissões em componentes específicos
 */
export function useModulePermission(module: AppModule) {
    const { hasAccess: has, canEdit: can, isReadOnly: readOnly, loading } = useAuth();

    return {
        loading,
        hasAccess: has(module),
        canEdit: can(module),
        isReadOnly: readOnly(module),
    };
}
