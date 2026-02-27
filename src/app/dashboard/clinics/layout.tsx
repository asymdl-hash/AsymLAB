'use client';

import ClinicList from '@/components/clinics/ClinicList';
import PermissionGuard from '@/components/PermissionGuard';

export default function ClinicsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PermissionGuard module="clinics">
            <div className="flex h-full w-full bg-background overflow-hidden relative">
                {/* Sidebar de Navegação Específica (Master List) */}
                <div className="w-80 flex-shrink-0 border-r border-border bg-card h-full overflow-y-auto z-10">
                    <ClinicList />
                </div>

                {/* Conteúdo Principal (Detail View) */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background relative">
                    <div className="flex-1 overflow-y-auto scroll-smooth">
                        {children}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
