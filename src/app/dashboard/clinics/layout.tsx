import ClinicList from '@/components/clinics/ClinicList';

export default function ClinicsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="flex h-full w-full bg-gray-50/50 overflow-hidden relative">
            {/* Sidebar de Navegação Específica (Master List) */}
            <div className="w-80 flex-shrink-0 border-r border-gray-200 bg-white h-full overflow-y-auto z-10">
                <ClinicList />
            </div>

            {/* Conteúdo Principal (Detail View) */}
            <div className="flex-1 flex flex-col overflow-hidden min-w-0 bg-gray-50/50 relative">
                <div className="flex-1 overflow-y-auto px-6 py-6 scroll-smooth">
                    {children}
                </div>
            </div>
        </div>
    );
}
