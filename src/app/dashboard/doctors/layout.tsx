'use client';

import DoctorList from '@/components/doctors/DoctorList';
import PermissionGuard from '@/components/PermissionGuard';

export default function DoctorsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <PermissionGuard module="doctors">
            <div className="flex h-full w-full bg-gray-50/50 overflow-hidden relative">
                {/* Sidebar de Navegação Específica (Master List) */}
                <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto z-10">
                    <DoctorList />
                </div>

                {/* Conteúdo Principal (Detail View) */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-gray-50/50 relative">
                    <div className="flex-1 overflow-y-auto scroll-smooth">
                        {children}
                    </div>
                </div>
            </div>
        </PermissionGuard>
    );
}
