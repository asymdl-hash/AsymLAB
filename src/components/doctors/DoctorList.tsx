'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { doctorsService, DoctorListItem } from '@/services/doctorsService';
import { cn } from '@/lib/utils';

/** Gera iniciais a partir do nome */
function getInitials(name: string | null | undefined): string {
    if (!name || name.trim() === '') return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

export default function DoctorList() {
    const [doctors, setDoctors] = useState<DoctorListItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const pathname = usePathname();

    useEffect(() => {
        loadDoctors();

        // Listen for updates
        const handleUpdate = () => loadDoctors();
        window.addEventListener('doctor-updated', handleUpdate);
        window.addEventListener('doctor-profile-created', handleUpdate);

        return () => {
            window.removeEventListener('doctor-updated', handleUpdate);
            window.removeEventListener('doctor-profile-created', handleUpdate);
        };
    }, []);

    const loadDoctors = async () => {
        try {
            const data = await doctorsService.getDoctors();
            setDoctors(data || []);
        } catch (error) {
            console.error('Failed to load doctors', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredDoctors = doctors.filter(d =>
        d.full_name.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="w-80 border-r border-gray-200 bg-white flex flex-col h-full">

            {/* Header da Lista */}
            <div className="p-4 border-b border-gray-100 space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Médicos</h2>
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
                ) : filteredDoctors.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Nenhum médico encontrado.</div>
                ) : (
                    filteredDoctors.map((doctor) => {
                        const isActive = pathname?.includes(doctor.user_id);
                        const initials = getInitials(doctor.full_name);

                        return (
                            <Link
                                key={doctor.user_id}
                                href={`/dashboard/doctors/${doctor.user_id}`}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg transition-all group hover:bg-gray-50",
                                    isActive ? "bg-primary/5 border border-primary/20 shadow-sm" : "border border-transparent"
                                )}
                            >
                                {/* Avatar */}
                                {doctor.avatar_url ? (
                                    <img
                                        src={doctor.avatar_url}
                                        alt={doctor.full_name}
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
                                        {doctor.full_name}
                                    </h3>
                                    <p className="text-xs text-gray-400 truncate mt-0.5">
                                        {doctor.phone || 'Sem telefone'}
                                    </p>
                                </div>
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Footer da Lista */}
            <div className="p-3 border-t border-gray-100 text-xs text-center text-gray-400 bg-gray-50/50">
                {filteredDoctors.length} Médicos Registados
            </div>
        </div>
    );
}
