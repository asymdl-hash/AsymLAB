'use client';

import PatientList from '@/components/patients/PatientList';
import PermissionGuard from '@/components/PermissionGuard';

export default function PatientsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PermissionGuard module="patients">
            <div className="flex h-full w-full bg-[#0B0F1A] overflow-hidden relative">
                {/* Lista de Pacientes (Master) — escondida em mobile quando há detail */}
                <div className="hidden md:flex w-80 flex-shrink-0 border-r border-border bg-card h-full overflow-y-auto z-10">
                    <PatientList />
                </div>

                {/* Conteúdo Principal (Detail View) */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-[#0B0F1A] relative">
                    <div className="flex-1 overflow-y-auto scroll-smooth">
                        {children}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
