'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Plus, Minus, Loader2, ChevronDown, Check, Stethoscope, Users, UserPlus, Building2, Hash, Phone, Copy, Layers, ClipboardList } from 'lucide-react';
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

interface WorkTypeSelection {
    work_type_id: string;
    quantity: number;
    assigned_teeth: number[];
}

export default function NewPlanModal({ patientId, patientClinicaId, patientMedicoId, associatedDoctors: initialTeam, onClose, onCreated }: NewPlanModalProps) {
    const [nome, setNome] = useState('');
    const [workTypeSelections, setWorkTypeSelections] = useState<WorkTypeSelection[]>([]);
    const [medicoId, setMedicoId] = useState(patientMedicoId || '');
    const [clinicaId, setClinicaId] = useState(patientClinicaId || '');
    const [team, setTeam] = useState<{ doctor_id: string; full_name: string }[]>(initialTeam);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showOdontogram, setShowOdontogram] = useState(false);
    const [showWtDropdown, setShowWtDropdown] = useState(false);
    const wtDropdownRef = useRef<HTMLDivElement>(null);
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

    // Close work type dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => { if (wtDropdownRef.current && !wtDropdownRef.current.contains(e.target as Node)) setShowWtDropdown(false); };
        if (showWtDropdown) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showWtDropdown]);

    // ── Odontogram teeth derived from workTypeSelections ──
    const odontogramTeeth = useMemo(() => {
        const teeth: { tooth_number: number; work_type_id: string | null }[] = [];
        workTypeSelections.forEach(sel => {
            sel.assigned_teeth.forEach(t => teeth.push({ tooth_number: t, work_type_id: sel.work_type_id }));
        });
        return teeth;
    }, [workTypeSelections]);

    // Total de dentes atribuídos
    const totalAssignedTeeth = odontogramTeeth.length;

    // Pendentes por tipo de trabalho — para o Odontograma
    const pendingAssignments = useMemo(() =>
        workTypeSelections.map(sel => ({
            work_type_id: sel.work_type_id,
            total: sel.quantity,
            assigned: sel.assigned_teeth.length,
        })),
        [workTypeSelections]);

    // ── Sync: Odontogram → WorkTypeSelections ──
    const handleOdontogramChange = useCallback((newTeeth: { tooth_number: number; work_type_id: string | null }[]) => {
        setWorkTypeSelections(prev => {
            // Agrupar novos dentes por work_type_id
            const teethByWt = new Map<string, number[]>();
            newTeeth.forEach(t => {
                if (t.work_type_id) {
                    const list = teethByWt.get(t.work_type_id) || [];
                    list.push(t.tooth_number);
                    teethByWt.set(t.work_type_id, list);
                }
            });

            // Começar com cópia das selecções existentes
            const updated = prev.map(sel => {
                const newAssigned = teethByWt.get(sel.work_type_id) || [];
                teethByWt.delete(sel.work_type_id);
                return {
                    ...sel,
                    assigned_teeth: newAssigned,
                    // Se mais dentes que quantidade, aumentar quantidade
                    quantity: Math.max(sel.quantity, newAssigned.length),
                };
            });

            // Tipos novos que vieram do odontograma (não existiam na lista)
            teethByWt.forEach((teeth, wtId) => {
                updated.push({
                    work_type_id: wtId,
                    quantity: teeth.length,
                    assigned_teeth: teeth,
                });
            });

            return updated;
        });
    }, []);

    // ── Adicionar tipo via dropdown ──
    const addWorkType = useCallback((wtId: string) => {
        setWorkTypeSelections(prev => {
            if (prev.some(s => s.work_type_id === wtId)) return prev;
            return [...prev, { work_type_id: wtId, quantity: 1, assigned_teeth: [] }];
        });
        setShowWtDropdown(false);
    }, []);

    // ── Remover tipo ──
    const removeWorkType = useCallback((wtId: string) => {
        setWorkTypeSelections(prev => prev.filter(s => s.work_type_id !== wtId));
    }, []);

    // ── Ajustar quantidade ──
    const adjustQty = useCallback((wtId: string, delta: number) => {
        setWorkTypeSelections(prev => prev.map(sel => {
            if (sel.work_type_id !== wtId) return sel;
            const newQty = sel.quantity + delta;
            // Mínimo = número de dentes atribuídos (não pode ir abaixo)
            if (newQty < Math.max(1, sel.assigned_teeth.length)) return sel;
            return { ...sel, quantity: newQty };
        }));
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nome.trim()) { setError('O nome é obrigatório'); return; }
        if (workTypeSelections.length === 0) { setError('Selecione pelo menos um tipo de trabalho'); return; }
        if (!medicoId) { setError('Selecione um médico'); return; }
        if (!clinicaId) { setError('Selecione uma clínica'); return; }

        try {
            setSubmitting(true);
            // Criar plano com primeiro tipo (compatibilidade DB)
            const plan = await patientsService.createTreatmentPlan({
                patient_id: patientId,
                nome: nome.trim(),
                tipo_trabalho_id: workTypeSelections[0].work_type_id,
                medico_id: medicoId,
                clinica_id: clinicaId,
            });

            // Guardar todos os work types na tabela plan_work_types
            if (plan?.id) {
                const rows = workTypeSelections.map(sel => ({
                    plan_id: plan.id,
                    work_type_id: sel.work_type_id,
                    quantity: sel.quantity,
                    assigned_teeth: sel.assigned_teeth,
                }));
                await supabase.from('plan_work_types').insert(rows);
            }

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
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">
                            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">
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
                                        {workTypeSelections.length > 0 && (
                                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold ml-auto">
                                                {workTypeSelections.reduce((a, s) => a + s.quantity, 0)} trabalho{workTypeSelections.reduce((a, s) => a + s.quantity, 0) !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="p-4 space-y-3">
                                        {/* Linha: Dropdown + Odontograma */}
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {/* Dropdown multi-select */}
                                            <div className="relative" ref={wtDropdownRef}>
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    Tipo de Trabalho *
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowWtDropdown(!showWtDropdown)}
                                                    className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                                >
                                                    <span className="text-gray-400 text-xs">Adicionar tipo de trabalho...</span>
                                                    <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", showWtDropdown && "rotate-180")} />
                                                </button>

                                                {showWtDropdown && (
                                                    <div className="mt-1 bg-white rounded-xl shadow-inner border border-gray-200 py-1 max-h-40 overflow-y-auto">
                                                        {Object.entries(groupedWorkTypes).map(([cat, types]) => {
                                                            const available = types.filter(wt => !workTypeSelections.some(s => s.work_type_id === wt.id));
                                                            if (available.length === 0) return null;
                                                            return (
                                                                <div key={cat}>
                                                                    <div className="px-3 py-1.5 border-b border-gray-100">
                                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{cat}</span>
                                                                    </div>
                                                                    {available.map(wt => (
                                                                        <div
                                                                            key={wt.id}
                                                                            onClick={() => addWorkType(wt.id)}
                                                                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt.cor || '#6b7280' }} />
                                                                            <span className="text-xs text-gray-700">{wt.nome}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })}
                                                        {workTypes.length > 0 && workTypes.every(wt => workTypeSelections.some(s => s.work_type_id === wt.id)) && (
                                                            <p className="text-[10px] text-gray-400 text-center py-3">Todos os tipos já foram adicionados</p>
                                                        )}
                                                    </div>
                                                )}
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
                                                        totalAssignedTeeth > 0
                                                            ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                                                            : "border-dashed border-gray-300 bg-white text-gray-400 hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                                                    )}
                                                >
                                                    <span className="text-xs font-medium">
                                                        {totalAssignedTeeth > 0
                                                            ? `${totalAssignedTeeth} dente${totalAssignedTeeth !== 1 ? 's' : ''} atribuído${totalAssignedTeeth !== 1 ? 's' : ''}`
                                                            : 'Configurar dentes'
                                                        }
                                                    </span>
                                                </button>
                                            </div>
                                        </div>

                                        {/* Lista de tipos seleccionados */}
                                        {workTypeSelections.length > 0 && (
                                            <div className="space-y-1.5">
                                                {workTypeSelections.map(sel => {
                                                    const wt = workTypes.find(w => w.id === sel.work_type_id);
                                                    if (!wt) return null;
                                                    const unassigned = sel.quantity - sel.assigned_teeth.length;
                                                    return (
                                                        <div key={sel.work_type_id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white group">
                                                            {/* Cor + Nome */}
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt.cor || '#6b7280' }} />
                                                            <span className="text-xs font-medium text-gray-700 min-w-0 truncate">{wt.nome}</span>

                                                            {/* Qty controls */}
                                                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                                                <button type="button" onClick={() => adjustQty(sel.work_type_id, -1)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                                                    disabled={sel.quantity <= Math.max(1, sel.assigned_teeth.length)}
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-xs font-bold text-gray-700 w-5 text-center">{sel.quantity}</span>
                                                                <button type="button" onClick={() => adjustQty(sel.work_type_id, 1)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>

                                                            {/* Separator */}
                                                            <div className="w-px h-4 bg-gray-200 shrink-0" />

                                                            {/* Dentes atribuídos */}
                                                            <div className="flex items-center gap-1 flex-wrap min-w-0 max-w-[180px]">
                                                                {sel.assigned_teeth.sort((a, b) => a - b).map(t => (
                                                                    <span key={t} className="text-[9px] font-mono bg-primary/10 text-primary px-1 py-0.5 rounded font-medium">#{t}</span>
                                                                ))}
                                                                {unassigned > 0 && (
                                                                    <span className="text-[9px] text-gray-400 italic">
                                                                        {sel.assigned_teeth.length > 0 ? '' : ''}{unassigned}× por atribuir
                                                                    </span>
                                                                )}
                                                                {sel.assigned_teeth.length === 0 && unassigned === 0 && (
                                                                    <span className="text-[9px] text-gray-400 italic">por atribuir</span>
                                                                )}
                                                            </div>

                                                            {/* Remove */}
                                                            <button type="button" onClick={() => removeWorkType(sel.work_type_id)}
                                                                className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Error */}
                                {error && (
                                    <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg">{error}</p>
                                )}
                            </div>

                            {/* Actions — fixed at bottom */}
                            <div className="flex gap-3 p-4 border-t border-gray-100 shrink-0 bg-white">
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
                onChange={handleOdontogramChange}
                pendingAssignments={pendingAssignments}
            />
        </>
    );
}
