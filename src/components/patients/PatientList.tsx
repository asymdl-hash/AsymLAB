'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Plus, Search, AlertTriangle, Filter, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { patientsService, PatientListItem } from '@/services/patientsService';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const PATIENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; dot: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-gray-600', bg: 'bg-gray-100', dot: 'bg-gray-400' },
    activo: { label: 'Activo', color: 'text-emerald-700', bg: 'bg-emerald-50', dot: 'bg-emerald-500' },
    inactivo: { label: 'Inactivo', color: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
    arquivado: { label: 'Arquivado', color: 'text-red-600', bg: 'bg-red-50', dot: 'bg-red-500' },
};

/** Gera iniciais a partir do nome (primeira e última palavra) */
function getInitials(name: string | null | undefined): string {
    if (!name || name.trim() === '') return '?';
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].charAt(0).toUpperCase();
    return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
}

/** Conta planos activos (não rascunho, cancelado ou concluído) */
function countActivePlans(plans: { estado: string }[]): number {
    return plans.filter(p => ['activo', 'pausado', 'reaberto'].includes(p.estado)).length;
}

export default function PatientList() {
    const [patients, setPatients] = useState<PatientListItem[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [clinicFilter, setClinicFilter] = useState<string | null>(null);
    const [doctorFilter, setDoctorFilter] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<string | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const { isAdmin } = useAuth();

    useEffect(() => {
        loadPatients();

        const handleUpdate = () => loadPatients();
        window.addEventListener('patient-updated', handleUpdate);
        return () => window.removeEventListener('patient-updated', handleUpdate);
    }, []);

    const loadPatients = async () => {
        try {
            const data = await patientsService.getPatients();
            setPatients(data || []);
        } catch (error) {
            console.error('Failed to load patients', error);
        } finally {
            setLoading(false);
        }
    };

    // Clínicas únicas para o filtro
    const uniqueClinics = useMemo(() => {
        const clinicMap = new Map<string, string>();
        patients.forEach(p => {
            if (p.clinica) clinicMap.set(p.clinica.id, p.clinica.commercial_name);
        });
        return Array.from(clinicMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [patients]);

    // Médicos únicos para o filtro
    const uniqueDoctors = useMemo(() => {
        const docMap = new Map<string, string>();
        patients.forEach(p => {
            if (p.medico) docMap.set(p.medico.user_id, p.medico.full_name);
        });
        return Array.from(docMap.entries()).sort((a, b) => a[1].localeCompare(b[1]));
    }, [patients]);

    // Filtros aplicados
    const filteredPatients = useMemo(() => {
        let result = patients;

        // Filtro de pesquisa por nome ou T-ID
        if (search) {
            const q = search.toLowerCase();
            result = result.filter(p =>
                p.nome.toLowerCase().includes(q) ||
                p.t_id.toLowerCase().includes(q) ||
                (p.id_paciente_clinica && p.id_paciente_clinica.toLowerCase().includes(q))
            );
        }

        // Filtro por clínica
        if (clinicFilter) {
            result = result.filter(p => p.clinica?.id === clinicFilter);
        }

        // Filtro por médico
        if (doctorFilter) {
            result = result.filter(p => p.medico?.user_id === doctorFilter);
        }

        // Filtro por status
        if (statusFilter) {
            result = result.filter(p => (p as any).estado === statusFilter);
        }

        return result;
    }, [patients, search, clinicFilter, doctorFilter, statusFilter]);

    // Separar urgentes no topo
    const sortedPatients = useMemo(() => {
        return [...filteredPatients].sort((a, b) => {
            if (a.urgente && !b.urgente) return -1;
            if (!a.urgente && b.urgente) return 1;
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [filteredPatients]);

    const handleCreateNew = () => {
        router.push('/dashboard/patients/new');
    };

    return (
        <div className="w-full md:w-80 border-r border-gray-200 bg-white flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-gray-800">Pacientes</h2>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "h-8 w-8 transition-colors",
                                showFilters ? "text-primary bg-primary/10" : "text-gray-400 hover:text-gray-600"
                            )}
                            title="Filtros"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-primary hover:text-primary hover:bg-primary/10"
                                title="Novo Paciente"
                                onClick={handleCreateNew}
                            >
                                <Plus className="h-5 w-5" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Pesquisa */}
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Pesquisar por nome ou T-ID..."
                        className="pl-9 bg-gray-50 border-gray-200 focus:bg-white transition-all text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filtro por Clínica */}
                {showFilters && (
                    <div className="space-y-2 pt-1">
                        <select
                            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={clinicFilter || ''}
                            onChange={(e) => setClinicFilter(e.target.value || null)}
                        >
                            <option value="">Todas as Clínicas</option>
                            {uniqueClinics.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        <select
                            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={doctorFilter || ''}
                            onChange={(e) => setDoctorFilter(e.target.value || null)}
                        >
                            <option value="">Todos os Médicos</option>
                            {uniqueDoctors.map(([id, name]) => (
                                <option key={id} value={id}>Dr. {name}</option>
                            ))}
                        </select>
                        <select
                            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
                            value={statusFilter || ''}
                            onChange={(e) => setStatusFilter(e.target.value || null)}
                        >
                            <option value="">Todos os Estados</option>
                            {Object.entries(PATIENT_STATUS_CONFIG).map(([key, cfg]) => (
                                <option key={key} value={key}>{cfg.label}</option>
                            ))}
                        </select>
                        {(clinicFilter || doctorFilter || statusFilter) && (
                            <button
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                                onClick={() => { setClinicFilter(null); setDoctorFilter(null); setStatusFilter(null); }}
                            >
                                <X className="h-3 w-3" /> Limpar filtros
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
                {loading ? (
                    <div className="text-center py-8 text-gray-400 text-sm">Carregando...</div>
                ) : sortedPatients.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        {search || clinicFilter ? 'Nenhum paciente encontrado.' : 'Sem pacientes registados.'}
                    </div>
                ) : (
                    sortedPatients.map((patient) => {
                        const isActive = pathname?.includes(patient.id);
                        const initials = getInitials(patient.nome);
                        const activePlans = countActivePlans(patient.treatment_plans || []);

                        return (
                            <Link
                                key={patient.id}
                                href={`/dashboard/patients/${patient.id}`}
                                className={cn(
                                    "flex items-center gap-3 p-3 rounded-lg transition-all group hover:bg-gray-50",
                                    isActive ? "bg-primary/5 border border-primary/20 shadow-sm" : "border border-transparent",
                                    patient.urgente && "ring-1 ring-amber-300/50"
                                )}
                            >
                                {/* Avatar com iniciais */}
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors relative",
                                    patient.urgente
                                        ? "bg-amber-100 text-amber-700"
                                        : isActive
                                            ? "bg-primary/15 text-primary"
                                            : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-500 group-hover:from-primary/10 group-hover:to-primary/5 group-hover:text-primary"
                                )}>
                                    {initials}
                                    {patient.urgente && (
                                        <AlertTriangle className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h3 className={cn(
                                            "font-medium text-sm truncate",
                                            isActive ? "text-gray-900" : "text-gray-700"
                                        )}>
                                            {patient.nome}
                                        </h3>
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        <span className="text-xs font-mono text-gray-400">
                                            {patient.t_id}
                                        </span>
                                        {patient.clinica && (
                                            <span className="text-xs text-gray-400 truncate">
                                                · {patient.clinica.commercial_name}
                                            </span>
                                        )}
                                    </div>
                                    {/* Status badge */}
                                    {(() => {
                                        const estado = (patient as any).estado || 'rascunho';
                                        const cfg = PATIENT_STATUS_CONFIG[estado] || PATIENT_STATUS_CONFIG.rascunho;
                                        return estado !== 'activo' ? (
                                            <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block w-fit', cfg.bg, cfg.color)}>
                                                {cfg.label}
                                            </span>
                                        ) : null;
                                    })()}
                                </div>

                                {/* Badge de planos activos */}
                                {activePlans > 0 && (
                                    <Badge variant="secondary" className="text-xs shrink-0">
                                        {activePlans}
                                    </Badge>
                                )}
                            </Link>
                        );
                    })
                )}
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-gray-100 text-xs text-center text-gray-400 bg-gray-50/50">
                {filteredPatients.length} {filteredPatients.length === 1 ? 'Paciente' : 'Pacientes'}
                {(clinicFilter || doctorFilter || statusFilter) && ' (filtrado)'}
            </div>
        </div>
    );
}
