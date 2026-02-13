'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Search, Building2, MapPin } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { clinicsService, Clinic } from '@/services/clinicsService';
import { cn } from '@/lib/utils'; // Assumindo utils do shadcn

export default function ClinicList() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    const router = useRouter();


    useEffect(() => {
        loadClinics();

        // Listen for updates from ClinicForm
        const handleUpdate = () => loadClinics();
        window.addEventListener('clinic-updated', handleUpdate);

        return () => {
            window.removeEventListener('clinic-updated', handleUpdate);
        };
    }, []);

    const loadClinics = async () => {
        try {
            const data = await clinicsService.getClinics();
            setClinics(data || []);
        } catch (error) {
            console.error('Failed to load clinics', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNew = async () => {
        try {
            // Optimistic update or just loading state
            // setLoading(true); // Se bloquearmos a UI toda é chato, melhor só um spinner no botão
            const newClinic = await clinicsService.createClinic('Nova Clínica (Rascunho)');
            if (newClinic) {
                router.push(`/dashboard/clinics/${newClinic.id}`);
                // loadClinics(); // O router push vai provavelmente desencadear refresh se mudarmos a route
                // Mas por segurança podemos recarregar a lista localmente
                setClinics(prev => [...prev, newClinic].sort((a, b) => a.commercial_name.localeCompare(b.commercial_name)));
            }
        } catch (error) {
            console.error('Failed to create clinic', error);
        }
    };

    const filteredClinics = clinics.filter(c =>
        c.commercial_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">

            {/* Header da Lista */}
            <div className="p-4 border-b border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Clínicas</h2>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" title="Nova Clínica" onClick={handleCreateNew}>
                        <Plus className="h-5 w-5" />
                    </Button>
                </div>
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Pesquisar..."
                        className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            {/* Lista Scrollable */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
                ) : filteredClinics.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhuma clínica encontrada.</div>
                ) : (
                    filteredClinics.map((clinic) => {
                        const isActive = pathname?.includes(clinic.id);
                        return (
                            <Link
                                key={clinic.id}
                                href={`/dashboard/clinics/${clinic.id}`}
                                className={cn(
                                    "flex items-start gap-3 p-3 rounded-lg transition-all group hover:bg-gray-50",
                                    isActive ? "bg-primary/5 border border-primary/20 shadow-sm" : "border border-transparent"
                                )}
                            >
                                <div className={cn(
                                    "h-10 w-10 rounded-md flex items-center justify-center shrink-0 transition-colors",
                                    isActive ? "bg-primary/10 text-primary" : "bg-gray-100 text-gray-400 group-hover:bg-white group-hover:shadow-sm"
                                )}>
                                    <Building2 className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn(
                                        "font-medium text-sm truncate",
                                        isActive ? "text-primary-900" : "text-gray-700"
                                    )}>
                                        {clinic.commercial_name}
                                    </h3>
                                    <p className="text-xs text-gray-400 truncate mt-0.5 flex items-center gap-1">
                                        {clinic.email || 'Sem email'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Footer da Lista (Opcional - Totalizadores) */}
            <div className="p-3 border-t border-gray-100 text-xs text-center text-gray-400 bg-gray-50/50">
                {filteredClinics.length} Clínicas Registadas
            </div>
        </div>
    );
}
