'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Loader2, ChevronDown, Check, Stethoscope, Users, UserPlus, Building2, Hash, Phone, Copy, Layers, ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { patientsService } from '@/services/patientsService';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { OdontogramModal } from './Odontogram';

interface NewPlanModalProps {
    patientId: string;
    patientClinicaId: string | null;
    patientMedicoId: string | null;
    associatedDoctors: { doctor_id: string; full_name: string }[];
    onClose: () => void;
    onCreated: () => void;
}

type WorkTypeItem = { id: string; nome: string; cor: string | null; categoria: string | null };
type DoctorItem = { user_id: string; full_name: string };
type ClinicItem = { id: string; commercial_name: string };

export default function NewPlanModal({ patientId, patientClinicaId, patientMedicoId, associatedDoctors: initialTeam, onClose, onCreated }: NewPlanModalProps) {
    const [nome, setNome] = useState('');
    const [tipoTrabalhoId, setTipoTrabalhoId] = useState('');
    const [medicoId, setMedicoId] = useState(patientMedicoId || '');
    const [clinicaId, setClinicaId] = useState(patientClinicaId || '');
    const [team, setTeam] = useState<{ doctor_id: string; full_name: string }[]>(initialTeam);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [odontogramTeeth, setOdontogramTeeth] = useState<{ tooth_number: number; work_type_id: string | null }[]>([]);
    const [showOdontogram, setShowOdontogram] = useState(false);
    const [nextPlanNumber, setNextPlanNumber] = useState<number | null>(null);

    // Dropdown data
    const [workTypes, setWorkTypes] = useState<WorkTypeItem[]>([]);
    const [doctors, setDoctors] = useState<DoctorItem[]>([]);
    const [clinics, setClinics] = useState<ClinicItem[]>([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);

    // Pickers
    const [showDoctorPicker, setShowDoctorPicker] = useState(false);
    const [showTeamPicker, setShowTeamPicker] = useState(false);
    const doctorPickerRef = useRef<HTMLDivElement>(null);
    const teamPickerRef = useRef<HTMLDivElement>(null);

    // Colaboradores da clínica
    const [clinicTeam, setClinicTeam] = useState<{ user_id: string; full_name: string; phone: string | null; role: string | null }[]>([]);

    useEffect(() => {
        async function loadDropdowns() {
            try {
                const [wt, docs, cls] = await Promise.all([
                    patientsService.getWorkTypes(),
                    patientsService.getDoctors(),
                    patientsService.getClinics(),
                ]);
                setWorkTypes(wt);
                setDoctors(docs);
                setClinics(cls);

                // Auto-select first work type if available
                if (wt.length > 0 && !tipoTrabalhoId) {
                    setTipoTrabalhoId(wt[0].id);
                }

                // Calcular próximo número de plano (por paciente)
                const { count } = await supabase
                    .from('treatment_plans')
                    .select('id', { count: 'exact', head: true })
                    .eq('patient_id', patientId);
                setNextPlanNumber((count || 0) + 1);
            } catch (err) {
                console.error('Erro ao carregar dropdowns:', err);
            } finally {
                setLoadingDropdowns(false);
            }
        }
        loadDropdowns();
    }, []);

    // Carregar colaboradores quando a clínica muda
    useEffect(() => {
        async function loadClinicTeam() {
            if (!clinicaId) { setClinicTeam([]); return; }
            try {
                const { data, error } = await supabase
                    .from('user_clinic_access')
                    .select('user_id, user_profiles!inner(full_name, phone, app_role)')
                    .eq('clinic_id', clinicaId);
                if (!error && data) {
                    setClinicTeam(data.map((d: any) => ({
                        user_id: d.user_id,
                        full_name: d.user_profiles.full_name,
                        phone: d.user_profiles.phone,
                        role: d.user_profiles.app_role,
                    })).filter((d: any) => d.role !== 'doctor'));
                }
            } catch { /* ignore */ }
        }
        loadClinicTeam();
    }, [clinicaId]);

    // Click outside to close pickers
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (showDoctorPicker && doctorPickerRef.current && !doctorPickerRef.current.contains(e.target as Node)) {
                setShowDoctorPicker(false);
            }
            if (showTeamPicker && teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) {
                setShowTeamPicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDoctorPicker, showTeamPicker]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nome.trim()) { setError('O nome é obrigatório'); return; }
        if (!tipoTrabalhoId) { setError('Selecione um tipo de trabalho'); return; }
        if (!medicoId) { setError('Selecione um médico'); return; }
        if (!clinicaId) { setError('Selecione uma clínica'); return; }

        try {
            setSubmitting(true);
            await patientsService.createTreatmentPlan({
                patient_id: patientId,
                nome: nome.trim(),
                tipo_trabalho_id: tipoTrabalhoId,
                medico_id: medicoId,
                clinica_id: clinicaId,
            });
            window.dispatchEvent(new Event('patient-updated'));
            onCreated();
        } catch (err) {
            console.error('Erro ao criar plano:', err);
            setError('Erro ao criar plano. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };



    // Agrupar work types por categoria
    const groupedWorkTypes = workTypes.reduce<Record<string, typeof workTypes>>((acc, wt) => {
        const cat = wt.categoria || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(wt);
        return acc;
    }, {});

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-5 border-b border-gray-100">
                        <div>
                            <h2 className="text-base font-semibold text-gray-900">Novo Plano de Tratamento</h2>
                            <p className="text-xs text-gray-500 mt-0.5">Preencha os dados para criar o plano</p>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Form */}
                    {loadingDropdowns ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto flex-1">
                            {/* Nº Plano + Nome do Plano */}
                            <div className="grid grid-cols-[100px_1fr] gap-3">
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Hash className="h-3 w-3" />
                                        Nº Plano
                                    </label>
                                    <div className="mt-1.5 h-9 rounded-md border border-gray-200 bg-gray-50 px-3 text-sm flex items-center font-semibold text-primary">
                                        {nextPlanNumber !== null ? `PT-${String(nextPlanNumber).padStart(4, '0')}` : '...'}
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Nome do Plano *</label>
                                    <Input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex: Prótese Total Superior"
                                        className="mt-1.5"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Clínica + Médicos + Equipa em linha */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Clínica */}
                                <div>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Building2 className="h-3 w-3" />
                                        Clínica *
                                    </label>
                                    <select
                                        value={clinicaId}
                                        onChange={(e) => setClinicaId(e.target.value)}
                                        className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                    >
                                        <option value="">Selecione...</option>
                                        {clinics.map(cl => (
                                            <option key={cl.id} value={cl.id}>
                                                {cl.commercial_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Médicos — Multi-select com checkboxes */}
                                <div className="relative" ref={doctorPickerRef}>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Stethoscope className="h-3 w-3" />
                                        Médicos *
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setShowDoctorPicker(!showDoctorPicker); setShowTeamPicker(false); }}
                                        className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-gray-700 truncate">
                                            {medicoId ? (
                                                <>
                                                    <span className="font-medium">{doctors.find(d => d.user_id === medicoId)?.full_name || 'Selecionar'}</span>
                                                    {team.length > 1 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">+{team.length - 1}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-400">Selecionar médico...</span>
                                            )}
                                        </span>
                                        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", showDoctorPicker && "rotate-180")} />
                                    </button>

                                    {showDoctorPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-10 py-1 max-h-48 overflow-y-auto">
                                            <div className="px-3 py-1.5 border-b border-gray-100">
                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Médicos do Caso</span>
                                            </div>
                                            {doctors.map(doc => {
                                                const isInTeam = team.some(t => t.doctor_id === doc.user_id);
                                                const isPrincipal = doc.user_id === medicoId;
                                                return (
                                                    <div
                                                        key={doc.user_id}
                                                        onClick={() => {
                                                            if (isInTeam && !isPrincipal) {
                                                                setTeam(prev => prev.filter(t => t.doctor_id !== doc.user_id));
                                                            } else if (!isInTeam) {
                                                                setTeam(prev => [...prev, { doctor_id: doc.user_id, full_name: doc.full_name }]);
                                                                if (!medicoId) setMedicoId(doc.user_id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group",
                                                            isInTeam ? "bg-primary/5" : "hover:bg-gray-50"
                                                        )}
                                                    >
                                                        <button
                                                            type="button"
                                                            onClick={(e) => e.stopPropagation()}
                                                            className={cn(
                                                                "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                isInTeam ? "bg-primary border-primary text-white" : "border-gray-300 hover:border-primary/50",
                                                                isPrincipal && "cursor-default"
                                                            )}
                                                            disabled={isPrincipal}
                                                        >
                                                            {isInTeam && <Check className="h-2.5 w-2.5" />}
                                                        </button>
                                                        <Stethoscope className={cn("h-3 w-3 shrink-0", isInTeam ? "text-primary" : "text-gray-400")} />
                                                        <span className={cn("text-xs flex-1 truncate", isInTeam ? "text-gray-900 font-medium" : "text-gray-600")}>
                                                            {doc.full_name}
                                                        </span>
                                                        {isPrincipal ? (
                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">Principal</span>
                                                        ) : isInTeam ? (
                                                            <button
                                                                type="button"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setMedicoId(doc.user_id);
                                                                }}
                                                                className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 hover:bg-primary/10 hover:text-primary font-medium opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                            >
                                                                ★ Tornar principal
                                                            </button>
                                                        ) : null}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Equipa — Informativa (como Hero Header) */}
                                <div className="relative" ref={teamPickerRef}>
                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                        <Users className="h-3 w-3" />
                                        Equipa
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => { setShowTeamPicker(!showTeamPicker); setShowDoctorPicker(false); }}
                                        className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                    >
                                        <span className="flex items-center gap-2 text-gray-700 truncate">
                                            {(team.length + clinicTeam.length) > 0 ? (
                                                <>
                                                    <span>{team.length + clinicTeam.length} {(team.length + clinicTeam.length) === 1 ? 'membro' : 'membros'}</span>
                                                </>
                                            ) : (
                                                <span className="text-gray-400">Nenhum membro</span>
                                            )}
                                        </span>
                                        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", showTeamPicker && "rotate-180")} />
                                    </button>

                                    {showTeamPicker && (
                                        <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-200 z-10 p-3 max-h-64 overflow-y-auto min-w-[280px]">
                                            {/* Médicos */}
                                            {team.length > 0 && (
                                                <>
                                                    <div className="px-1 pb-1.5 mb-1.5 border-b border-gray-100">
                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Médicos</span>
                                                    </div>
                                                    <div className="space-y-1 mb-3">
                                                        {team.map(doc => {
                                                            const isPrincipal = doc.doctor_id === medicoId;
                                                            const docProfile = doctors.find(d => d.user_id === doc.doctor_id);
                                                            return (
                                                                <div key={doc.doctor_id} className={cn(
                                                                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",
                                                                    isPrincipal ? "bg-primary/5" : "hover:bg-gray-50"
                                                                )}>
                                                                    <Stethoscope className={cn("h-3 w-3 shrink-0", isPrincipal ? "text-primary" : "text-gray-400")} />
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className={cn("font-medium block truncate text-[11px]", isPrincipal ? "text-primary" : "text-gray-800")}>
                                                                            {doc.full_name}
                                                                        </span>
                                                                        {(docProfile as any)?.phone && (
                                                                            <div className="flex items-center gap-1 mt-0.5">
                                                                                <Phone className="h-2.5 w-2.5 text-gray-400" />
                                                                                <span className="text-[10px] text-gray-500 font-mono">{(docProfile as any).phone}</span>
                                                                                <button
                                                                                    type="button"
                                                                                    onClick={() => navigator.clipboard.writeText((docProfile as any).phone)}
                                                                                    className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                                                                    title="Copiar telefone"
                                                                                >
                                                                                    <Copy className="h-2.5 w-2.5" />
                                                                                </button>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    {isPrincipal && (
                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">Principal</span>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </>
                                            )}
                                            {/* Colaboradores da Clínica */}
                                            {clinicTeam.length > 0 && (
                                                <>
                                                    <div className="px-1 pb-1.5 mb-1.5 border-b border-gray-100">
                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Colaboradores</span>
                                                    </div>
                                                    <div className="space-y-1">
                                                        {clinicTeam.map(member => (
                                                            <div key={member.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-50">
                                                                <Users className="h-3 w-3 shrink-0 text-gray-400" />
                                                                <div className="flex-1 min-w-0">
                                                                    <span className="font-medium block truncate text-[11px] text-gray-800">{member.full_name}</span>
                                                                    {member.phone && (
                                                                        <div className="flex items-center gap-1 mt-0.5">
                                                                            <Phone className="h-2.5 w-2.5 text-gray-400" />
                                                                            <span className="text-[10px] text-gray-500 font-mono">{member.phone}</span>
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => navigator.clipboard.writeText(member.phone!)}
                                                                                className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                                                                title="Copiar telefone"
                                                                            >
                                                                                <Copy className="h-2.5 w-2.5" />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                            {team.length === 0 && clinicTeam.length === 0 && (
                                                <p className="text-[10px] text-gray-400 italic">Nenhum membro na equipa</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* ── Bloco Informação Técnica ── */}
                            <div className="bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden">
                                {/* Header do bloco */}
                                <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200/60">
                                    <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
                                        Informação Técnica
                                    </span>
                                </div>

                                {/* Conteúdo */}
                                <div className="p-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {/* Tipo de Trabalho */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                <Layers className="h-3 w-3" />
                                                Tipo de Trabalho *
                                            </label>
                                            <select
                                                value={tipoTrabalhoId}
                                                onChange={(e) => setTipoTrabalhoId(e.target.value)}
                                                className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                                            >
                                                <option value="">Selecione...</option>
                                                {Object.entries(groupedWorkTypes).map(([cat, types]) => (
                                                    <optgroup key={cat} label={cat}>
                                                        {types.map(wt => (
                                                            <option key={wt.id} value={wt.id}>
                                                                {wt.nome}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Odontograma */}
                                        <div>
                                            <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                🦷 Odontograma
                                            </label>
                                            <button
                                                type="button"
                                                onClick={() => setShowOdontogram(true)}
                                                className={cn(
                                                    "mt-1.5 w-full h-9 rounded-md border px-3 text-sm transition-all flex items-center gap-2 justify-center",
                                                    odontogramTeeth.length > 0
                                                        ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                                                        : "border-dashed border-gray-300 bg-white text-gray-400 hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                                                )}
                                            >
                                                <span className="text-xs font-medium">
                                                    {odontogramTeeth.length > 0
                                                        ? `${odontogramTeeth.length} dente${odontogramTeeth.length !== 1 ? 's' : ''} seleccionado${odontogramTeeth.length !== 1 ? 's' : ''}`
                                                        : 'Configurar dentes'
                                                    }
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Error */}
                            {error && (
                                <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg">{error}</p>
                            )}

                            {/* Actions */}
                            <div className="flex gap-3 pt-2">
                                <Button type="button" variant="outline" className="flex-1 h-9" onClick={onClose}>
                                    Cancelar
                                </Button>
                                <Button type="submit" className="flex-1 h-9 gap-1.5" disabled={submitting}>
                                    {submitting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <Plus className="h-3.5 w-3.5" />
                                    )}
                                    Criar Plano
                                </Button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Odontograma Modal — renderizado fora do modal principal */}
            <OdontogramModal
                open={showOdontogram}
                onClose={() => setShowOdontogram(false)}
                teeth={odontogramTeeth}
                workTypes={workTypes.map(wt => ({ id: wt.id, nome: wt.nome, cor: wt.cor }))}
                onChange={setOdontogramTeeth}
            />
        </>
    );
}
