'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { clinicsService, Clinic } from '@/services/clinicsService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

/** Gera iniciais a partir da razão social (primeira e última palavra) */
function getInitials(name: string | null | undefined): string {
    if (!name || name.trim() === '') return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default function ClinicList() {
    const [clinics, setClinics] = useState<Clinic[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    const router = useRouter();
    const { isAdmin } = useAuth();


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
            const newClinic = await clinicsService.createClinic('Nova Clínica (Rascunho)');
            if (newClinic) {
                router.push(`/dashboard/clinics/${newClinic.id}`);
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
                    {isAdmin && (
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10" title="Nova Clínica" onClick={handleCreateNew}>
                            <Plus className="h-5 w-5" />
                        </Button>
                    )}
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
                        const initials = getInitials((clinic as any).legal_name || clinic.commercial_name);
                        const logoUrl = (clinic as any).logo_url;

                        return (
                            <Link
                                key={clinic.id}
                                href={`/dashboard/clinics/${clinic.id}`}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg transition-all group hover:bg-gray-50",
                                    isActive ? "bg-primary/5 border border-primary/20 shadow-sm" : "border border-transparent"
                                )}
                            >
                                {/* Avatar: Logo ou Iniciais */}
                                {logoUrl ? (
                                    <img
                                        src={logoUrl}
                                        alt={clinic.commercial_name}
                                        className="h-10 w-10 rounded-full object-cover shrink-0 border border-gray-100"
                                    />
                                ) : (
                                    <div className={cn(
                                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors",
                                        isActive
                                            ? "bg-primary/15 text-primary"
                                            : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 group-hover:from-primary/10 group-hover:to-primary/5 group-hover:text-primary"
                                    )}>
                                        {initials}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <h3 className={cn(
                                        "font-medium text-sm truncate",
                                        isActive ? "text-gray-900" : "text-gray-700"
                                    )}>
                                        {clinic.commercial_name}
                                    </h3>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {clinic.email || 'Sem email'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Footer da Lista */}
            <div className="p-3 border-t border-gray-100 text-xs text-center text-gray-400 bg-gray-50/50">
                {filteredClinics.length} Clínicas Registadas
            </div>
        </div>
    );
}
