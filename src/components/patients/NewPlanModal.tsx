'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { X, Plus, Minus, Loader2, ChevronDown, ChevronUp, Check, Stethoscope, Users, UserPlus, Building2, Hash, Phone, Copy, Layers, ClipboardList, Palette, ImagePlus, MessageSquarePlus, Camera, Upload } from 'lucide-react';
import CameraOverlay from './CameraOverlay';
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
type ToothColorItem = { id: string; codigo: string; nome: string; grupo: string | null };

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
    const [toothColors, setToothColors] = useState<ToothColorItem[]>([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);

    // Método + Escala de Cor
    const [metodo, setMetodo] = useState('');
    const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
    const [colorScalePhotos, setColorScalePhotos] = useState<File[]>([]);
    const [colorScalePreviews, setColorScalePreviews] = useState<string[]>([]);
    const [colorDragOver, setColorDragOver] = useState(false);
    const [showColorDropdown, setShowColorDropdown] = useState(false);
    const [activeColorGroup, setActiveColorGroup] = useState<string | null>(null);
    const [photoNotes, setPhotoNotes] = useState<Record<number, string>>({});
    const [editingNoteIdx, setEditingNoteIdx] = useState<number | null>(null);
    const colorDropdownRef = useRef<HTMLDivElement>(null);
    const colorFileRef = useRef<HTMLInputElement>(null);
    // Escala de Cor — Fotos Polarizadas
    const [polarizedPhotos, setPolarizedPhotos] = useState<File[]>([]);
    const [polarizedPreviews, setPolarizedPreviews] = useState<string[]>([]);
    const [polarizedDragOver, setPolarizedDragOver] = useState(false);
    const polarizedFileRef = useRef<HTMLInputElement>(null);

    // Registos Fotográficos — Face (multi-ficheiro por campo)
    const [faceRepouso, setFaceRepouso] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [faceSorrisoNatural, setFaceSorrisoNatural] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [faceSorrisoAlto, setFaceSorrisoAlto] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [face45Esq, setFace45Esq] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [face45Dir, setFace45Dir] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const faceRepousoRef = useRef<HTMLInputElement>(null);
    const faceSorrisoNaturalRef = useRef<HTMLInputElement>(null);
    const faceSorrisoAltoRef = useRef<HTMLInputElement>(null);
    const face45EsqRef = useRef<HTMLInputElement>(null);
    const face45DirRef = useRef<HTMLInputElement>(null);
    const [faceDragOver, setFaceDragOver] = useState<string | null>(null);
    // Registos Fotográficos — Close-up (multi-ficheiro por campo)
    const [closeupRepouso, setCloseupRepouso] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeupSorrisoNatural, setCloseupSorrisoNatural] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeupSorrisoAlto, setCloseupSorrisoAlto] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeup45Esq, setCloseup45Esq] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeup45Dir, setCloseup45Dir] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const closeupRepousoRef = useRef<HTMLInputElement>(null);
    const closeupSorrisoNaturalRef = useRef<HTMLInputElement>(null);
    const closeupSorrisoAltoRef = useRef<HTMLInputElement>(null);
    const closeup45EsqRef = useRef<HTMLInputElement>(null);
    const closeup45DirRef = useRef<HTMLInputElement>(null);
    const [closeupDragOver, setCloseupDragOver] = useState<string | null>(null);
    // Câmara (overlay avançado — todos os dispositivos)
    const [cameraTarget, setCameraTarget] = useState<{ setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; key: string } | null>(null);
    // Registos Fotográficos — Introrais (Superior + Inferior)
    const [intraoralSupPhotos, setIntraoralSupPhotos] = useState<File[]>([]);
    const [intraoralSupPreviews, setIntraoralSupPreviews] = useState<string[]>([]);
    const intraoralSupFileRef = useRef<HTMLInputElement>(null);
    const [intraoralSupDragOver, setIntraoralSupDragOver] = useState(false);
    const [intraoralInfPhotos, setIntraoralInfPhotos] = useState<File[]>([]);
    const [intraoralInfPreviews, setIntraoralInfPreviews] = useState<string[]>([]);
    const intraoralInfFileRef = useRef<HTMLInputElement>(null);
    const [intraoralInfDragOver, setIntraoralInfDragOver] = useState(false);
    // Lightbox para imagens-guia

    // Registos Fotográficos — 45º
    const [photos45, setphotos45] = useState<File[]>([]);
    const [previews45, setpreviews45] = useState<string[]>([]);
    const fileRef45 = useRef<HTMLInputElement>(null);
    const [dragOver45, setdragOver45] = useState(false);
    // Registos Fotográficos — Outros
    const [photosOutros, setPhotosOutros] = useState<File[]>([]);
    const [previewsOutros, setPreviewsOutros] = useState<string[]>([]);
    const fileRefOutros = useRef<HTMLInputElement>(null);
    const [dragOverOutros, setDragOverOutros] = useState(false);
    const [photosCollapsed, setPhotosCollapsed] = useState(false);
    const [photoSetup, setPhotoSetup] = useState<'basic' | 'complete'>('basic');
    const [expandEscalaCor, setExpandEscalaCor] = useState(true);
    const [expandRegistos, setExpandRegistos] = useState(true);

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
                const [wt, docs, cls, tc] = await Promise.all([
                    patientsService.getWorkTypes(),
                    patientsService.getDoctors(),
                    patientsService.getClinics(),
                    patientsService.getToothColors(),
                ]);
                setWorkTypes(wt);
                setDoctors(docs);
                setClinics(cls);
                setToothColors(tc);

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

    // Close color dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => { if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) setShowColorDropdown(false); };
        if (showColorDropdown) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showColorDropdown]);

    // Cleanup preview URLs
    useEffect(() => {
        return () => { colorScalePreviews.forEach(u => URL.revokeObjectURL(u)); };
    }, []);

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

        // Auto-gerar nome a partir dos tipos de trabalho se vazio
        const finalNome = nome.trim() || workTypeSelections
            .map(sel => workTypes.find(wt => wt.id === sel.work_type_id)?.nome)
            .filter(Boolean)
            .join(' + ') || 'Plano sem nome';
        if (workTypeSelections.length === 0) { setError('Selecione pelo menos um tipo de trabalho'); return; }
        if (!medicoId) { setError('Selecione um médico'); return; }
        if (!clinicaId) { setError('Selecione uma clínica'); return; }

        try {
            setSubmitting(true);
            // Criar plano com primeiro tipo (compatibilidade DB)
            const plan = await patientsService.createTreatmentPlan({
                patient_id: patientId,
                nome: finalNome,
                tipo_trabalho_id: workTypeSelections[0].work_type_id,
                medico_id: medicoId,
                clinica_id: clinicaId,
                metodo: metodo.trim() || undefined,
                escala_cor_id: selectedColorIds.length > 0 ? selectedColorIds[0] : undefined,
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

                // Upload fotos de escala de cor (se houver)
                for (const photo of colorScalePhotos) {
                    try {
                        await patientsService.uploadFile({
                            file: photo,
                            patient_id: patientId,
                            plan_id: plan.id,
                        });
                    } catch (err) {
                        console.error('Erro ao enviar foto de escala:', err);
                    }
                }
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
                    {/* ============ HERO HEADER ============ */}
                    <div className="bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] px-5 sm:px-8 pt-5 pb-5 relative rounded-t-2xl">
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 rounded-t-2xl opacity-5 pointer-events-none" style={{
                            backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(245,158,11,0.15) 0%, transparent 50%)'
                        }} />

                        <div className="relative z-10">
                            {/* Top row: Badge + Close */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20 tracking-wide">
                                    {nextPlanNumber !== null ? `PT-${String(nextPlanNumber).padStart(4, '0')}` : '...'}
                                </span>
                                <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Title + Name input */}
                            <div className="flex items-center gap-4 mb-3">
                                <div className="h-12 w-12 rounded-full bg-white/5 ring-2 ring-primary/30 flex items-center justify-center shrink-0">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-semibold text-white mb-1">Novo Plano de Tratamento</h2>
                                    <Input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex: Prótese Total Superior"
                                        className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-primary/20"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Clínica + Médicos + Equipa — inline style like PatientForm */}
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-500 text-xs">Clínica:</span>
                                    <select
                                        value={clinicaId}
                                        onChange={(e) => setClinicaId(e.target.value)}
                                        className="text-xs font-medium border-0 bg-transparent text-white focus:outline-none cursor-pointer [&>option]:text-black [&>option]:bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {clinics.map(cl => (
                                            <option key={cl.id} value={cl.id}>
                                                {cl.commercial_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative" ref={doctorPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowDoctorPicker(!showDoctorPicker); setShowTeamPicker(false); }}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-white transition-colors"
                                    >
                                        <span className="text-gray-500">Médicos:</span>
                                        <span className="font-medium text-white">
                                            {medicoId ? (
                                                <>
                                                    {doctors.find(d => d.user_id === medicoId)?.full_name || 'Selecionar'}
                                                    {team.length > 1 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/15 text-gray-300 font-medium ml-1">+{team.length - 1}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-500">Selecionar...</span>
                                            )}
                                        </span>
                                        <ChevronDown className={cn("h-3 w-3 text-gray-500 transition-transform", showDoctorPicker && "rotate-180")} />
                                        <ChevronDown className={cn("h-3 w-3 text-gray-500 transition-transform", showDoctorPicker && "rotate-180")} />

                                    </button>



                                    {showDoctorPicker && (

                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-1 max-h-48 overflow-y-auto min-w-[280px]">

                                            <div className="px-3 py-1.5 border-b border-gray-100">

                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">MÃ©dicos do Caso</span>

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

                                                                â˜… Tornar principal

                                                            </button>

                                                        ) : null}

                                                    </div>

                                                );

                                            })}

                                        </div>

                                    )}

                                </div>



                                {/* Equipa â€” inline */}

                                <div className="relative" ref={teamPickerRef}>

                                    <button

                                        type="button"

                                        onClick={() => { setShowTeamPicker(!showTeamPicker); setShowDoctorPicker(false); }}

                                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"

                                    >

                                        <Users className="h-3 w-3" />

                                        <span>Equipa</span>

                                        {(team.length + clinicTeam.length) > 0 && (

                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">{team.length + clinicTeam.length}</span>

                                        )}

                                        <ChevronDown className={cn("h-3 w-3 transition-transform", showTeamPicker && "rotate-180")} />

                                    </button>

                                    {showTeamPicker && (

                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl z-50 p-3 min-w-[300px] max-w-sm border border-gray-200">

                                            {team.length > 0 && (

                                                <>

                                                    <div className="px-1 pb-1.5 mb-1.5 border-b border-gray-100">

                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">MÃ©dicos</span>

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

                                                                                <button type="button" onClick={() => navigator.clipboard.writeText((docProfile as any).phone)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Copiar telefone">

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

                                                                            <button type="button" onClick={() => navigator.clipboard.writeText(member.phone!)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Copiar telefone">

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

                        </div>

                    </div>



                    {/* Form */}

                    {loadingDropdowns ? (

                        <div className="flex items-center justify-center py-16">

                            <Loader2 className="h-6 w-6 animate-spin text-primary" />

                        </div>

                    ) : (

                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">

                            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">



                                {/* â”€â”€ Bloco InformaÃ§Ã£o TÃ©cnica â”€â”€ */}

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
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                                                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 max-h-40 overflow-y-auto">
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

                                            {/* Método */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                    <ClipboardList className="h-3 w-3" />
                                                    Método
                                                </label>
                                                <Input
                                                    value={metodo}
                                                    onChange={e => setMetodo(e.target.value)}
                                                    placeholder="Ex: CAD/CAM..."
                                                    className="mt-1.5 h-9 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Lista de tipos seleccionados — logo após o dropdown */}
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
                                                                        {unassigned}× por atribuir
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



                                        {/* ── Sub-secção: Escala de Cor ── */}
                                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 space-y-2.5">
                                            <button type="button" onClick={() => setExpandEscalaCor(prev => !prev)} className="flex items-center gap-2 w-full cursor-pointer">
                                                <Palette className="h-3.5 w-3.5 text-amber-500" />
                                                <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-600">
                                                    Escala de Cor
                                                </span>
                                                <ChevronDown className={cn("h-3.5 w-3.5 text-amber-400 transition-transform", expandEscalaCor && "rotate-180")} />
                                            </button>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: expandEscalaCor ? undefined : 'none' }}>
                                                {/* Dropdown Escala de Cor — 2 níveis + multi-select */}
                                                <div className="relative" ref={colorDropdownRef}>
                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Cor
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowColorDropdown(!showColorDropdown); if (showColorDropdown) setActiveColorGroup(null); }}
                                                        className="mt-1 w-full min-h-[36px] rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                                    >
                                                        {selectedColorIds.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {selectedColorIds.map(cid => {
                                                                    const c = toothColors.find(tc => tc.id === cid);
                                                                    return c ? (
                                                                        <span key={cid} className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                            {c.codigo}
                                                                            <button type="button" onClick={e => { e.stopPropagation(); setSelectedColorIds(prev => prev.filter(id => id !== cid)); }} className="hover:text-red-500">
                                                                                <X className="h-2.5 w-2.5" />
                                                                            </button>
                                                                        </span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">Seleccionar cor...</span>
                                                        )}
                                                        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ml-1", showColorDropdown && "rotate-180")} />
                                                    </button>

                                                    {showColorDropdown && (() => {
                                                        /* Mapeamento grupo DB → escala real */
                                                        const SCALE_MAP: Record<string, string> = {
                                                            'A': 'VITA Classical', 'B': 'VITA Classical', 'C': 'VITA Classical', 'D': 'VITA Classical', 'Bleach': 'VITA Classical',
                                                            '3D-Master': 'VITA 3D-Master',
                                                            'Chromascop': 'Chromascop',
                                                        };
                                                        const scales = toothColors.reduce<Record<string, { grupos: Record<string, ToothColorItem[]>; total: number }>>((acc, tc) => {
                                                            const g = tc.grupo || 'Outros';
                                                            const scale = SCALE_MAP[g] || g;
                                                            if (!acc[scale]) acc[scale] = { grupos: {}, total: 0 };
                                                            if (!acc[scale].grupos[g]) acc[scale].grupos[g] = [];
                                                            acc[scale].grupos[g].push(tc);
                                                            acc[scale].total++;
                                                            return acc;
                                                        }, {});

                                                        return (
                                                            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                                                {!activeColorGroup ? (
                                                                    /* Nível 1: 3 Escalas reais */
                                                                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                                                                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1 pb-1">Escolha a escala</p>
                                                                        {Object.entries(scales).map(([scaleName, scaleData]) => {
                                                                            const allColors = Object.values(scaleData.grupos).flat();
                                                                            const selectedCount = allColors.filter(tc => selectedColorIds.includes(tc.id)).length;
                                                                            return (
                                                                                <button
                                                                                    key={scaleName}
                                                                                    type="button"
                                                                                    onClick={() => setActiveColorGroup(scaleName)}
                                                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors text-left"
                                                                                >
                                                                                    <Palette className="h-4 w-4 text-amber-400 shrink-0" />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <span className="text-xs font-semibold text-gray-700 block">{scaleName}</span>
                                                                                        <span className="text-[10px] text-gray-400">{scaleData.total} tonalidades</span>
                                                                                    </div>
                                                                                    {selectedCount > 0 && (
                                                                                        <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">{selectedCount}</span>
                                                                                    )}
                                                                                    <ChevronDown className="h-3 w-3 text-gray-300 -rotate-90" />
                                                                                </button>
                                                                            );
                                                                        })}
                                                                        {toothColors.length === 0 && (
                                                                            <p className="text-[10px] text-gray-400 text-center py-3">Sem cores no catálogo</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    /* Nível 2: Tonalidades dentro da escala seleccionada */
                                                                    <div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveColorGroup(null)}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <ChevronDown className="h-3 w-3 text-gray-400 rotate-90" />
                                                                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{activeColorGroup}</span>
                                                                        </button>
                                                                        <div className="max-h-52 overflow-y-auto py-1">
                                                                            {scales[activeColorGroup] && Object.entries(scales[activeColorGroup].grupos).map(([subGrupo, colors]) => (
                                                                                <div key={subGrupo}>
                                                                                    {/* Sub-grupo header (ex: A, B, C, D dentro de VITA Classical) */}
                                                                                    {Object.keys(scales[activeColorGroup].grupos).length > 1 && (
                                                                                        <div className="px-3 py-1 border-b border-gray-50">
                                                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{subGrupo}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {colors.map(tc => {
                                                                                        const isSelected = selectedColorIds.includes(tc.id);
                                                                                        return (
                                                                                            <div
                                                                                                key={tc.id}
                                                                                                onClick={() => {
                                                                                                    setSelectedColorIds(prev =>
                                                                                                        isSelected ? prev.filter(id => id !== tc.id) : [...prev, tc.id]
                                                                                                    );
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-amber-50 transition-colors text-xs",
                                                                                                    isSelected && "bg-amber-50"
                                                                                                )}
                                                                                            >
                                                                                                <div className={cn(
                                                                                                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                                                    isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                                                                                                )}>
                                                                                                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                                                                                </div>
                                                                                                <span className="font-mono text-gray-500 w-8">{tc.codigo}</span>
                                                                                                <span className="text-gray-700">{tc.nome}</span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Fotos — coluna esquerda */}
                                                    <div
                                                        className={`rounded-lg border-2 border-dashed p-1.5 transition-colors ${colorDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                        onDragOver={e => { e.preventDefault(); setColorDragOver(true); }}
                                                        onDragLeave={() => setColorDragOver(false)}
                                                        onDrop={e => { e.preventDefault(); setColorDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setColorScalePhotos(prev => [...prev, ...files]); setColorScalePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                    >
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fotos</label>
                                                        <img src="/images/guides/escala-de-cor.png" alt="Guia Escala de Cor" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains('object-cover')) { img.classList.remove('object-cover', 'max-h-24'); img.classList.add('object-contain'); } else { img.classList.add('object-cover', 'max-h-24'); img.classList.remove('object-contain'); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        <div className="mt-1.5 grid grid-cols-1 gap-1">
                                                            <button type="button" onClick={() => colorFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro"><Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span></button>
                                                            <button type="button" onClick={() => { const colorSetter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (action) => { if (typeof action === 'function') { const virtualPrev = { files: colorScalePhotos, previews: colorScalePreviews }; const result = action(virtualPrev); setColorScalePhotos(result.files); setColorScalePreviews(result.previews); } }; setCameraTarget({ setter: colorSetter, key: 'escalaCor' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia"><Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span></button>
                                                            {!photosCollapsed && colorScalePreviews.length > 0 && (<div className="grid grid-cols-2 gap-1">{colorScalePreviews.map((url, i) => (<div key={i} className="relative group"><img src={url} alt={`Cor ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" /><button type="button" onClick={() => { URL.revokeObjectURL(url); setColorScalePhotos(p => p.filter((_, idx) => idx !== i)); setColorScalePreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button></div>))}</div>)}
                                                            {photosCollapsed && colorScalePreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center">📷 {colorScalePreviews.length} foto(s)</p>)}
                                                            <input ref={colorFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setColorScalePhotos(p => [...p, ...nf]); setColorScalePreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            <input id="cam-native-escalaCor" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setColorScalePhotos(p => [...p, ...nf]); setColorScalePreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                        </div>
                                                        {colorScalePreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                    </div>
                                                    {/* Polarizadas — coluna direita */}
                                                    <div
                                                        className={`rounded-lg border-2 border-dashed p-1.5 transition-colors ${polarizedDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                        onDragOver={e => { e.preventDefault(); setPolarizedDragOver(true); }}
                                                        onDragLeave={() => setPolarizedDragOver(false)}
                                                        onDrop={e => { e.preventDefault(); setPolarizedDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setPolarizedPhotos(prev => [...prev, ...files]); setPolarizedPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                    >
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Polarizadas</label>
                                                        <img src="/images/guides/escala-de-cor-polarizada.png" alt="Guia Polarizada" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains('object-cover')) { img.classList.remove('object-cover', 'max-h-24'); img.classList.add('object-contain'); } else { img.classList.add('object-cover', 'max-h-24'); img.classList.remove('object-contain'); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        <div className="mt-1.5 grid grid-cols-1 gap-1">
                                                            <button type="button" onClick={() => polarizedFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro"><Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span></button>
                                                            <button type="button" onClick={() => { const polSetter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (action) => { if (typeof action === 'function') { const virtualPrev = { files: polarizedPhotos, previews: polarizedPreviews }; const result = action(virtualPrev); setPolarizedPhotos(result.files); setPolarizedPreviews(result.previews); } }; setCameraTarget({ setter: polSetter, key: 'polarizada' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia"><Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span></button>
                                                            {!photosCollapsed && polarizedPreviews.length > 0 && (<div className="grid grid-cols-2 gap-1">{polarizedPreviews.map((url, i) => (<div key={i} className="relative group"><img src={url} alt={`Polarizada ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" /><button type="button" onClick={() => { URL.revokeObjectURL(url); setPolarizedPhotos(p => p.filter((_, idx) => idx !== i)); setPolarizedPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button></div>))}</div>)}
                                                            {photosCollapsed && polarizedPreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center">📷 {polarizedPreviews.length} foto(s)</p>)}
                                                            <input ref={polarizedFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setPolarizedPhotos(p => [...p, ...nf]); setPolarizedPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            <input id="cam-native-polarizada" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setPolarizedPhotos(p => [...p, ...nf]); setPolarizedPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                        </div>
                                                        {polarizedPreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                        {/* ── Sub-secção: Registos Fotográficos ── */}
                                        <div className="rounded-lg border border-sky-200/60 bg-sky-50/30 p-3 space-y-2.5">
                                            <div className="flex items-center justify-between">
                                                <button type="button" onClick={() => setExpandRegistos(prev => !prev)} className="flex items-center gap-2 cursor-pointer">
                                                    <Camera className="h-3.5 w-3.5 text-sky-500" />
                                                    <span className="text-[10px] uppercase tracking-widest font-semibold text-sky-600">
                                                        Registos Fotográficos
                                                    </span>
                                                    <ChevronDown className={cn("h-3.5 w-3.5 text-sky-400 transition-transform", expandRegistos && "rotate-180")} />
                                                </button>
                                                <div className="flex items-center gap-2" style={{ display: expandRegistos ? undefined : 'none' }}>
                                                    <div className="flex gap-1 ml-2">
                                                        <button type="button" onClick={() => setPhotoSetup('basic')} className={cn('px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all', photoSetup === 'basic' ? 'bg-sky-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600')}>
                                                            Setup Básico
                                                        </button>
                                                        <button type="button" onClick={() => setPhotoSetup('complete')} className={cn('px-2 py-0.5 rounded-full text-[9px] font-semibold transition-all', photoSetup === 'complete' ? 'bg-sky-500 text-white shadow-sm' : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600')}>
                                                            Setup Completo
                                                        </button>
                                                    </div>
                                                </div>
                                                {(faceRepouso.previews.length > 0 || faceSorrisoNatural.previews.length > 0 || faceSorrisoAlto.previews.length > 0 || closeupRepouso.previews.length > 0 || closeupSorrisoNatural.previews.length > 0 || closeupSorrisoAlto.previews.length > 0 || colorScalePreviews.length > 0 || intraoralSupPreviews.length > 0 || intraoralInfPreviews.length > 0 || previews45.length > 0 || previewsOutros.length > 0) && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setPhotosCollapsed(prev => !prev)}
                                                        className="flex items-center gap-1 text-[9px] text-sky-500 hover:text-sky-700 font-medium transition-colors"
                                                    >
                                                        {photosCollapsed ? (
                                                            <><ChevronDown className="h-3 w-3" /> Mostrar fotos</>
                                                        ) : (
                                                            <><ChevronUp className="h-3 w-3" /> Minimizar fotos</>
                                                        )}
                                                    </button>
                                                )}
                                            </div>

                                            <div className="space-y-3" style={{ display: expandRegistos ? undefined : 'none' }}>
                                                {/* Retrato — linha inteira */}
                                                <fieldset className="border border-gray-200 rounded-lg p-2">
                                                    <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Retrato</legend>
                                                    <div className={cn('grid grid-cols-1 gap-2', photoSetup === 'basic' ? 'sm:grid-cols-3' : 'sm:grid-cols-5')}>
                                                        {(() => {
                                                            const allFaceFields: { label: string; state: { files: File[]; previews: string[] }; setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; ref: React.RefObject<HTMLInputElement>; key: string; guideImages?: string[] }[] = [
                                                                { label: 'Repouso', state: faceRepouso, setter: setFaceRepouso, ref: faceRepousoRef, key: 'repouso', guideImages: ['/images/guides/retrato-repouso.png'] },
                                                                { label: 'Sorriso Natural', state: faceSorrisoNatural, setter: setFaceSorrisoNatural, ref: faceSorrisoNaturalRef, key: 'sorrisoNatural', guideImages: ['/images/guides/retrato-sorriso-natural.png'] },
                                                                { label: 'Sorriso Máximo', state: faceSorrisoAlto, setter: setFaceSorrisoAlto, ref: faceSorrisoAltoRef, key: 'sorrisoAlto', guideImages: ['/images/guides/retrato-sorriso-maximo.png'] },
                                                                { label: '45º', state: face45Esq, setter: setFace45Esq, ref: face45EsqRef, key: '45', guideImages: ['/images/guides/retrato-45-esquerda.png', '/images/guides/retrato-45-direita.png'] },
                                                                { label: 'Perfil', state: face45Dir, setter: setFace45Dir, ref: face45DirRef, key: 'perfil', guideImages: ['/images/guides/retrato-perfil-esquerda.png', '/images/guides/retrato-perfil-direita.png'] },
                                                            ];
                                                            const faceFields = photoSetup === 'basic' ? allFaceFields.filter(f => ['repouso', 'sorrisoNatural', 'sorrisoAlto'].includes(f.key)) : allFaceFields;

                                                            const addFiles = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, newFiles: File[]) => {
                                                                setter(prev => ({
                                                                    files: [...prev.files, ...newFiles],
                                                                    previews: [...prev.previews, ...newFiles.map(f => URL.createObjectURL(f))],
                                                                }));
                                                            };

                                                            const removeFile = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, idx: number) => {
                                                                setter(prev => ({
                                                                    files: prev.files.filter((_, i) => i !== idx),
                                                                    previews: prev.previews.filter((_, i) => i !== idx),
                                                                }));
                                                            };

                                                            return faceFields.map(({ label, state, setter, ref, key, guideImages }) => (
                                                                <div
                                                                    key={key}
                                                                    className={cn(
                                                                        "text-center rounded-lg border-2 border-dashed p-1.5 transition-colors",
                                                                        faceDragOver === key
                                                                            ? "border-sky-400 bg-sky-100/50"
                                                                            : "border-gray-200 bg-white"
                                                                    )}
                                                                    onDragOver={e => { e.preventDefault(); setFaceDragOver(key); }}
                                                                    onDragLeave={() => setFaceDragOver(null)}
                                                                    onDrop={e => {
                                                                        e.preventDefault();
                                                                        setFaceDragOver(null);
                                                                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                                                        if (files.length > 0) addFiles(setter, files);
                                                                    }}
                                                                >
                                                                    <span className="text-[8px] font-semibold text-gray-500 block mb-1">{label}</span>

                                                                    {/* Guide images — referência visual */}
                                                                    {guideImages && guideImages.length > 0 && (
                                                                        <div className={guideImages.length > 1 ? 'grid grid-cols-2 gap-0.5 mb-1' : 'mb-1'}>
                                                                            {guideImages.map((gi, idx) => (
                                                                                <img
                                                                                    key={idx}
                                                                                    src={gi}
                                                                                    alt={`Guia ${label} ${idx + 1}`}
                                                                                    className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                                                                                    onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }}
                                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {/* Action buttons — always visible */}
                                                                    <div className="grid grid-cols-1 gap-1">
                                                                        {/* Ficheiro */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => ref.current?.click()}
                                                                            className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2"
                                                                            title="Anexar ficheiro"
                                                                        >
                                                                            <Upload className="h-3 w-3" />
                                                                            <span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                        </button>
                                                                        {/* Câmara */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setCameraTarget({ setter, key })}
                                                                            className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2"
                                                                            title="Tirar fotografia"
                                                                        >
                                                                            <Camera className="h-3 w-3" />
                                                                            <span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                        </button>
                                                                    </div>

                                                                    {/* Preview grid — abaixo dos botões, colapsável */}
                                                                    {!photosCollapsed && state.previews.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                                                            {state.previews.map((url, i) => (
                                                                                <div key={i} className="relative group">
                                                                                    <img src={url} alt={`${label} ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded border border-gray-200" />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={() => removeFile(setter, i)}
                                                                                        className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                    >
                                                                                        <X className="h-2 w-2 text-white" />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {photosCollapsed && state.previews.length > 0 && (
                                                                        <p className="text-[8px] text-gray-400 text-center mt-1">📷 {state.previews.length} foto(s)</p>
                                                                    )}

                                                                    {state.previews.length === 0 && (
                                                                        <p className="text-[7px] text-gray-300 mt-1">ou arraste fotos aqui</p>
                                                                    )}

                                                                    {/* Hidden inputs */}
                                                                    <input
                                                                        ref={ref}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        multiple
                                                                        className="hidden"
                                                                        onChange={e => {
                                                                            const files = e.target.files;
                                                                            if (files && files.length > 0) addFiles(setter, Array.from(files));
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                    {/* Input câmara nativa (opc. qualidade máxima — fotografia computacional) */}
                                                                    <input
                                                                        id={`cam-native-${key}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        capture="environment"
                                                                        className="hidden"
                                                                        onChange={e => {
                                                                            const files = e.target.files;
                                                                            if (files && files.length > 0) addFiles(setter, Array.from(files));
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </fieldset>
                                                {/* Close-up — linha inteira, clone do Face (apenas Setup Completo) */}
                                                {photoSetup === 'complete' && (<fieldset className="border border-gray-200 rounded-lg p-2">
                                                    <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Close-up</legend>
                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                                        {(() => {
                                                            const closeupFields: { label: string; state: { files: File[]; previews: string[] }; setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; ref: React.RefObject<HTMLInputElement>; key: string; guideImages?: string[] }[] = [
                                                                { label: 'Repouso', state: closeupRepouso, setter: setCloseupRepouso, ref: closeupRepousoRef, key: 'cu-repouso', guideImages: ['/images/guides/close-up-repouso.png'] },
                                                                { label: 'Sorriso Natural', state: closeupSorrisoNatural, setter: setCloseupSorrisoNatural, ref: closeupSorrisoNaturalRef, key: 'cu-sorrisoNatural', guideImages: ['/images/guides/close-up-sorriso-natural.png'] },
                                                                { label: 'Sorriso Máximo', state: closeupSorrisoAlto, setter: setCloseupSorrisoAlto, ref: closeupSorrisoAltoRef, key: 'cu-sorrisoAlto', guideImages: ['/images/guides/close-up-sorriso-maximo.png'] },
                                                                { label: 'Retractores Frontal', state: closeup45Dir, setter: setCloseup45Dir, ref: closeup45DirRef, key: 'cu-retractores', guideImages: ['/images/guides/close-up-retractores-frontal.png'] },
                                                                { label: 'Retractores 45º', state: closeup45Esq, setter: setCloseup45Esq, ref: closeup45EsqRef, key: 'cu-45', guideImages: ['/images/guides/close-up-45-esquerda.png', '/images/guides/close-up-45-direita.png'] },
                                                            ];

                                                            const addFiles = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, newFiles: File[]) => {
                                                                setter(prev => ({
                                                                    files: [...prev.files, ...newFiles],
                                                                    previews: [...prev.previews, ...newFiles.map(f => URL.createObjectURL(f))],
                                                                }));
                                                            };

                                                            const removeFile = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, idx: number) => {
                                                                setter(prev => ({
                                                                    files: prev.files.filter((_, i) => i !== idx),
                                                                    previews: prev.previews.filter((_, i) => i !== idx),
                                                                }));
                                                            };

                                                            return closeupFields.map(({ label, state, setter, ref, key, guideImages }) => (
                                                                <div
                                                                    key={key}
                                                                    className={cn(
                                                                        "text-center rounded-lg border-2 border-dashed p-1.5 transition-colors",
                                                                        closeupDragOver === key
                                                                            ? "border-sky-400 bg-sky-100/50"
                                                                            : "border-gray-200 bg-white"
                                                                    )}
                                                                    onDragOver={e => { e.preventDefault(); setCloseupDragOver(key); }}
                                                                    onDragLeave={() => setCloseupDragOver(null)}
                                                                    onDrop={e => {
                                                                        e.preventDefault();
                                                                        setCloseupDragOver(null);
                                                                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                                                        if (files.length > 0) addFiles(setter, files);
                                                                    }}
                                                                >
                                                                    <span className="text-[8px] font-semibold text-gray-500 block mb-1">{label}</span>

                                                                    {guideImages && guideImages.length > 0 && (
                                                                        <div className={guideImages.length > 1 ? 'grid grid-cols-2 gap-0.5 mb-1' : 'mb-1'}>
                                                                            {guideImages.map((gi: string, idx: number) => (
                                                                                <img
                                                                                    key={idx}
                                                                                    src={gi}
                                                                                    alt={`Guia ${label} ${idx + 1}`}
                                                                                    className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                                                                                    onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }}
                                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <div className="grid grid-cols-1 gap-1">
                                                                        <button type="button" onClick={() => ref.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                            <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                        </button>
                                                                        <button type="button" onClick={() => setCameraTarget({ setter, key })} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                            <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                        </button>
                                                                    </div>

                                                                    {!photosCollapsed && state.previews.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                                                            {state.previews.map((url, i) => (
                                                                                <div key={i} className="relative group">
                                                                                    <img src={url} alt={`${label} ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                                    <button type="button" onClick={() => removeFile(setter, i)} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <X className="h-2 w-2 text-white" />
                                                                                    </button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {photosCollapsed && state.previews.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {state.previews.length} foto(s)</p>)}
                                                                    {state.previews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}

                                                                    <input ref={ref} type="file" accept="image/*" multiple className="hidden" onChange={e => { const files = e.target.files; if (files && files.length > 0) addFiles(setter, Array.from(files)); e.target.value = ''; }} />
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </fieldset>)}
                                                {/* Vista Oclusal + 45º + Outros — grid */}
                                                <div className={cn('grid grid-cols-1 gap-2', photoSetup === 'basic' ? 'sm:grid-cols-1' : 'sm:grid-cols-4')}>
                                                    {/* --- Vista Oclusal (Intraoral Superior + Inferior) — apenas Setup Completo --- */}
                                                    {photoSetup === 'complete' && (<fieldset className="border border-gray-200 rounded-lg p-2 sm:col-span-2">
                                                        <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Vista Oclusal</legend>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div
                                                                className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${intraoralSupDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                                onDragOver={e => { e.preventDefault(); setIntraoralSupDragOver(true); }}
                                                                onDragLeave={() => setIntraoralSupDragOver(false)}
                                                                onDrop={e => { e.preventDefault(); setIntraoralSupDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setIntraoralSupPhotos(prev => [...prev, ...files]); setIntraoralSupPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                            >
                                                                <span className="text-[8px] font-semibold text-gray-500 block mb-1">Intraoral Superior</span>
                                                                <img src="/images/guides/intraoral-superior.png" alt="Guia Intraoral Superior" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                <div className="grid grid-cols-1 gap-1">
                                                                    <button type="button" onClick={() => intraoralSupFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                        <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                    </button>
                                                                    <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: intraoralSupPhotos, previews: intraoralSupPreviews }); setIntraoralSupPhotos(r.files); setIntraoralSupPreviews(r.previews); } }; setCameraTarget({ setter: s, key: 'intraoralSup' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                        <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                    </button>
                                                                    <input ref={intraoralSupFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setIntraoralSupPhotos(p => [...p, ...nf]); setIntraoralSupPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                </div>
                                                                {!photosCollapsed && intraoralSupPreviews.length > 0 && (
                                                                    <div className="grid grid-cols-1 gap-1 mt-1">
                                                                        {intraoralSupPreviews.map((url, i) => (
                                                                            <div key={i} className="relative group">
                                                                                <img src={url} alt={`Intraoral Sup ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                                <button type="button" onClick={() => { setIntraoralSupPhotos(p => p.filter((_, idx) => idx !== i)); setIntraoralSupPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {photosCollapsed && intraoralSupPreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {intraoralSupPreviews.length} foto(s)</p>)}
                                                                {intraoralSupPreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                            </div>

                                                            {/* --- Intraoral Inferior --- */}
                                                            <div
                                                                className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${intraoralInfDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                                onDragOver={e => { e.preventDefault(); setIntraoralInfDragOver(true); }}
                                                                onDragLeave={() => setIntraoralInfDragOver(false)}
                                                                onDrop={e => { e.preventDefault(); setIntraoralInfDragOver(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setIntraoralInfPhotos(prev => [...prev, ...files]); setIntraoralInfPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                            >
                                                                <span className="text-[8px] font-semibold text-gray-500 block mb-1">Intraoral Inferior</span>
                                                                <img src="/images/guides/intraoral-inferior.png" alt="Guia Intraoral Inferior" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                <div className="grid grid-cols-1 gap-1">
                                                                    <button type="button" onClick={() => intraoralInfFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                        <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                    </button>
                                                                    <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: intraoralInfPhotos, previews: intraoralInfPreviews }); setIntraoralInfPhotos(r.files); setIntraoralInfPreviews(r.previews); } }; setCameraTarget({ setter: s, key: 'intraoralInf' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                        <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                    </button>
                                                                    <input ref={intraoralInfFileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setIntraoralInfPhotos(p => [...p, ...nf]); setIntraoralInfPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                </div>
                                                                {!photosCollapsed && intraoralInfPreviews.length > 0 && (
                                                                    <div className="grid grid-cols-1 gap-1 mt-1">
                                                                        {intraoralInfPreviews.map((url, i) => (
                                                                            <div key={i} className="relative group">
                                                                                <img src={url} alt={`Intraoral Inf ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                                <button type="button" onClick={() => { setIntraoralInfPhotos(p => p.filter((_, idx) => idx !== i)); setIntraoralInfPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {photosCollapsed && intraoralInfPreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {intraoralInfPreviews.length} foto(s)</p>)}
                                                                {intraoralInfPreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                            </div>
                                                        </div>
                                                    </fieldset>)}

                                                    {/* --- 45º — apenas Setup Completo --- */}
                                                    {photoSetup === 'complete' && (<fieldset className="border border-gray-200 rounded-lg p-2">
                                                        <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">45º</legend>
                                                        <div
                                                            className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${dragOver45 ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                            onDragOver={e => { e.preventDefault(); setdragOver45(true); }}
                                                            onDragLeave={() => setdragOver45(false)}
                                                            onDrop={e => { e.preventDefault(); setdragOver45(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setphotos45(prev => [...prev, ...files]); setpreviews45(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                        >
                                                            <span className="text-[8px] font-semibold text-gray-500 block mb-1">45º</span>
                                                            <img src="/images/guides/45.png" alt="Guia 45º" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            <div className="grid grid-cols-1 gap-1">
                                                                <button type="button" onClick={() => fileRef45.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                    <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                </button>
                                                                <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: photos45, previews: previews45 }); setphotos45(r.files); setpreviews45(r.previews); } }; setCameraTarget({ setter: s, key: 'foto45' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                    <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                </button>
                                                                <input ref={fileRef45} type="file" accept="image/*" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setphotos45(p => [...p, ...nf]); setpreviews45(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                <input id="cam-native-45" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setphotos45(p => [...p, ...nf]); setpreviews45(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            </div>
                                                            {!photosCollapsed && previews45.length > 0 && (
                                                                <div className="grid grid-cols-1 gap-1 mt-1">
                                                                    {previews45.map((url, i) => (
                                                                        <div key={i} className="relative group">
                                                                            <img src={url} alt={`45º ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                            <button type="button" onClick={() => { setphotos45(p => p.filter((_, idx) => idx !== i)); setpreviews45(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {photosCollapsed && previews45.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {previews45.length} foto(s)</p>)}
                                                            {previews45.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                        </div>
                                                    </fieldset>)}

                                                    {/* --- Outros --- */}
                                                    <fieldset className="border border-gray-200 rounded-lg p-2">
                                                        <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Outros</legend>
                                                        <div
                                                            className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${dragOverOutros ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                            onDragOver={e => { e.preventDefault(); setDragOverOutros(true); }}
                                                            onDragLeave={() => setDragOverOutros(false)}
                                                            onDrop={e => { e.preventDefault(); setDragOverOutros(false); const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setPhotosOutros(prev => [...prev, ...files]); setPreviewsOutros(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                        >
                                                            <span className="text-[8px] font-semibold text-gray-500 block mb-1">Outros</span>
                                                            <img src="/images/guides/outros.png" alt="Guia Outros" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            <div className="grid grid-cols-1 gap-1">
                                                                <button type="button" onClick={() => fileRefOutros.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                    <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                </button>
                                                                <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: photosOutros, previews: previewsOutros }); setPhotosOutros(r.files); setPreviewsOutros(r.previews); } }; setCameraTarget({ setter: s, key: 'outros' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                    <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                </button>
                                                                <input ref={fileRefOutros} type="file" accept="image/*" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setPhotosOutros(p => [...p, ...nf]); setPreviewsOutros(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                <input id="cam-native-outros" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setPhotosOutros(p => [...p, ...nf]); setPreviewsOutros(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            </div>
                                                            {!photosCollapsed && previewsOutros.length > 0 && (
                                                                <div className="grid grid-cols-1 gap-1 mt-1">
                                                                    {previewsOutros.map((url, i) => (
                                                                        <div key={i} className="relative group">
                                                                            <img src={url} alt={`Outros ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                            <button type="button" onClick={() => { setPhotosOutros(p => p.filter((_, idx) => idx !== i)); setPreviewsOutros(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {photosCollapsed && previewsOutros.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {previewsOutros.length} foto(s)</p>)}
                                                            {previewsOutros.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            </div>
                                        </div>


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
            </div >

            {/* Odontograma Modal — renderizado fora do modal principal */}
            < OdontogramModal
                open={showOdontogram}
                onClose={() => setShowOdontogram(false)
                }
                teeth={odontogramTeeth}
                workTypes={workTypes.map(wt => ({ id: wt.id, nome: wt.nome, cor: wt.cor }))}
                onChange={handleOdontogramChange}
                pendingAssignments={pendingAssignments}
            />
            {cameraTarget && (
                <CameraOverlay
                    onCapture={(file: File) => {
                        cameraTarget.setter(prev => ({
                            files: [...prev.files, file],
                            previews: [...prev.previews, URL.createObjectURL(file)],
                        }));
                    }}
                    onClose={() => setCameraTarget(null)}
                    nativeCamKey={cameraTarget.key}
                />
            )}
        </>
    );
}
