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
    rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bg: 'bg-muted/50', dot: 'bg-gray-500' },
    activo: { label: 'Activo', color: 'text-emerald-400', bg: 'bg-emerald-900/30', dot: 'bg-emerald-500' },
    inactivo: { label: 'Inactivo', color: 'text-amber-400', bg: 'bg-amber-900/30', dot: 'bg-amber-500' },
    arquivado: { label: 'Arquivado', color: 'text-red-400', bg: 'bg-red-900/30', dot: 'bg-red-500' },
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
        <div className="w-full md:w-80 border-r border-border bg-card flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-border space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="font-semibold text-card-foreground">Pacientes</h2>
                    <div className="flex items-center gap-1">
                        <Button
                            size="icon"
                            variant="ghost"
                            className={cn(
                                "h-8 w-8 transition-colors",
                                showFilters ? "text-amber-400 bg-amber-900/20" : "text-gray-500 hover:text-card-foreground/80"
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
                                className="h-8 w-8 text-amber-400 hover:text-amber-300 hover:bg-amber-900/20"
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
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Pesquisar por nome ou T-ID..."
                        className="pl-9 bg-muted border-border text-card-foreground placeholder:text-gray-500 focus:bg-muted focus:border-amber-500/30 transition-all text-sm"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Filtro por Clínica */}
                {showFilters && (
                    <div className="space-y-2 pt-1">
                        <select
                            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-muted text-card-foreground/80 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            value={clinicFilter || ''}
                            onChange={(e) => setClinicFilter(e.target.value || null)}
                        >
                            <option value="">Todas as Clínicas</option>
                            {uniqueClinics.map(([id, name]) => (
                                <option key={id} value={id}>{name}</option>
                            ))}
                        </select>
                        <select
                            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-muted text-card-foreground/80 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            value={doctorFilter || ''}
                            onChange={(e) => setDoctorFilter(e.target.value || null)}
                        >
                            <option value="">Todos os Médicos</option>
                            {uniqueDoctors.map(([id, name]) => (
                                <option key={id} value={id}>Dr. {name}</option>
                            ))}
                        </select>
                        <select
                            className="w-full text-sm border border-border rounded-md px-3 py-2 bg-muted text-card-foreground/80 focus:bg-muted focus:outline-none focus:ring-2 focus:ring-amber-500/20"
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
                                className="text-xs text-amber-400 hover:underline flex items-center gap-1"
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
                    <div className="text-center py-8 text-gray-500 text-sm">Carregando...</div>
                ) : sortedPatients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 text-sm">
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
                                    "flex items-center gap-3 p-3 rounded-lg transition-all group hover:bg-muted",
                                    isActive ? "bg-amber-500/10 border border-amber-500/20 shadow-sm" : "border border-transparent",
                                    patient.urgente && "ring-1 ring-amber-500/30"
                                )}
                            >
                                {/* Avatar com iniciais */}
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center shrink-0 text-sm font-bold transition-colors relative",
                                    patient.urgente
                                        ? "bg-amber-900/30 text-amber-400"
                                        : isActive
                                            ? "bg-amber-500/15 text-amber-400"
                                            : "bg-gradient-to-br from-gray-700 to-gray-800 text-muted-foreground group-hover:from-amber-900/20 group-hover:to-amber-900/10 group-hover:text-amber-400"
                                )}>
                                    {initials}
                                    {patient.urgente && (
                                        <AlertTriangle className="absolute -top-1 -right-1 h-3.5 w-3.5 text-amber-500" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className={cn(
                                            "text-[10px] font-bold font-mono px-1.5 py-0.5 rounded",
                                            isActive ? "bg-amber-500/20 text-amber-400" : "bg-muted text-gray-400 group-hover:bg-amber-500/10 group-hover:text-amber-400"
                                        )}>
                                            {patient.t_id}
                                        </span>
                                        {/* Status badge */}
                                        {(() => {
                                            const estado = (patient as any).estado || 'rascunho';
                                            const cfg = PATIENT_STATUS_CONFIG[estado] || PATIENT_STATUS_CONFIG.rascunho;
                                            return estado !== 'activo' ? (
                                                <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded-full', cfg.bg, cfg.color)}>
                                                    {cfg.label}
                                                </span>
                                            ) : null;
                                        })()}
                                    </div>
                                    <h3 className={cn(
                                        "font-semibold text-sm mt-0.5 leading-tight",
                                        isActive ? "text-gray-100" : "text-card-foreground/80"
                                    )}>
                                        {patient.nome}
                                    </h3>
                                    {patient.clinica && (
                                        <span className="text-[11px] text-gray-500 truncate block mt-0.5">
                                            {patient.clinica.commercial_name}
                                        </span>
                                    )}
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
            <div className="p-3 border-t border-border text-xs text-center text-gray-500 bg-card">
                {filteredPatients.length} {filteredPatients.length === 1 ? 'Paciente' : 'Pacientes'}
                {(clinicFilter || doctorFilter || statusFilter) && ' (filtrado)'}
            </div>
        </div>
    );
}
