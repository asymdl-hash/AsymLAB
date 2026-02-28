'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    ArrowLeft,
    AlertTriangle,
    Save,
    Trash2,
    ClipboardList,
    FolderOpen,
    MessageSquare,
    History,
    FileText,
    Plus,
    ChevronRight,
    Circle,
    X,
    UserPlus,
    Users,
    Stethoscope,
    Copy,
    ChevronDown,
    Check,
    Phone,
    MessageCircle,
    Printer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { patientsService, PatientFullDetails } from '@/services/patientsService';
import { useOptimisticLock } from '@/hooks/useOptimisticLock';
import NewPlanModal from '@/components/patients/NewPlanModal';
import DeleteConfirmModal from '@/components/patients/DeleteConfirmModal';
import DuplicateWarning from '@/components/patients/DuplicateWarning';
import ConsiderationsTab from '@/components/patients/ConsiderationsTab';
import FilesTab from '@/components/patients/FilesTab';
import DocumentsTab from '@/components/patients/DocumentsTab';
import HistoryTab from '@/components/patients/HistoryTab';
import PatientPrintSheet from '@/components/patients/PatientPrintSheet';
import { useAuth } from '@/contexts/AuthContext';

// Status do paciente
const PATIENT_STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bg: 'bg-muted/50', border: 'border-gray-600' },
    activo: { label: 'Activo', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-700/50' },
    inactivo: { label: 'Inactivo', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-700/50' },
    arquivado: { label: 'Arquivado', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700/50' },
};

// Labels e cores para estados dos planos
const PLAN_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-muted-foreground', bg: 'bg-muted/50' },
    activo: { label: 'Activo', color: 'text-blue-400', bg: 'bg-blue-900/30' },
    pausado: { label: 'Pausado', color: 'text-amber-400', bg: 'bg-amber-900/30' },
    concluido: { label: 'Concluído', color: 'text-green-400', bg: 'bg-green-900/30' },
    cancelado: { label: 'Cancelado', color: 'text-red-400', bg: 'bg-red-900/30' },
    reaberto: { label: 'Reaberto', color: 'text-purple-400', bg: 'bg-purple-900/30' },
};

const PHASE_STATE_CONFIG: Record<string, { label: string; dot: string }> = {
    pendente: { label: 'Pendente', dot: 'text-gray-500' },
    em_curso: { label: 'Em Curso', dot: 'text-blue-400' },
    concluida: { label: 'Concluída', dot: 'text-green-400' },
    cancelada: { label: 'Cancelada', dot: 'text-red-400' },
};

interface PatientFormProps {
    initialData: PatientFullDetails;
}

export default function PatientForm({ initialData }: PatientFormProps) {
    const [patient, setPatient] = useState(initialData);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showNewPlan, setShowNewPlan] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showPrint, setShowPrint] = useState(false);
    const [clinics, setClinics] = useState<{ id: string; commercial_name: string }[]>([]);
    const [doctors, setDoctors] = useState<{ user_id: string; full_name: string }[]>([]);
    const router = useRouter();
    const { isAdmin, isReadOnly: checkReadOnly, role } = useAuth();
    const readOnly = checkReadOnly('patients');
    const isLabStaff = role === 'admin' || role === 'staff_lab';
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    const dupCheckRef = useRef<NodeJS.Timeout | null>(null);

    // Lock optimista
    const lock = useOptimisticLock('patients', patient.id);
    useEffect(() => {
        if ((initialData as any).updated_at) {
            lock.setLoadedAt((initialData as any).updated_at);
        }
    }, [initialData]);

    // Estado anti-duplicação
    const [dupResult, setDupResult] = useState<{
        status: 'ok' | 'warning' | 'block';
        message: string;
        matches: { id: string; nome: string; t_id: string; id_paciente_clinica: string | null; similarity?: number }[];
    }>({ status: 'ok', message: '', matches: [] });

    // Estado médicos associados N:N
    const [associatedDoctors, setAssociatedDoctors] = useState<{ doctor_id: string; full_name: string }[]>([]);
    const [showDoctorPicker, setShowDoctorPicker] = useState(false);
    const [showDoctorMulti, setShowDoctorMulti] = useState(false);
    const [showTeam, setShowTeam] = useState(false);
    const [clinicTeam, setClinicTeam] = useState<{ user_id: string; full_name: string; phone: string | null; role: string | null }[]>([]);
    const [showWhatsApp, setShowWhatsApp] = useState(false);
    const [whatsappUrl, setWhatsappUrl] = useState(initialData.whatsapp_group_url || '');
    const doctorMultiRef = useRef<HTMLDivElement>(null);
    const teamRef = useRef<HTMLDivElement>(null);
    const whatsappRef = useRef<HTMLDivElement>(null);
    const whatsappPopupRef = useRef<HTMLDivElement | null>(null);

    // Click-outside para fechar popups sem overlay
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (showDoctorMulti && doctorMultiRef.current && !doctorMultiRef.current.contains(e.target as Node)) {
                setShowDoctorMulti(false);
            }
            if (showTeam && teamRef.current && !teamRef.current.contains(e.target as Node)) {
                setShowTeam(false);
            }
            if (showWhatsApp && whatsappRef.current && !whatsappRef.current.contains(e.target as Node) && (!whatsappPopupRef.current || !whatsappPopupRef.current.contains(e.target as Node))) {
                setShowWhatsApp(false);
                // Save directo ao fechar (sem debounce)
                if (whatsappUrl !== (patient.whatsapp_group_url || '')) {
                    const url = whatsappUrl || null;
                    setPatient(prev => ({ ...prev, whatsapp_group_url: url }));
                    patientsService.updatePatient(patient.id, { whatsapp_group_url: url })
                        .then(() => {
                            lock.setLoadedAt(new Date().toISOString());
                            setLastSaved(new Date());
                        })
                        .catch(err => console.error('Erro ao guardar WhatsApp URL:', err));
                }
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDoctorMulti, showTeam, showWhatsApp, whatsappUrl, patient.whatsapp_group_url]);

    // Carregar dropdowns
    useEffect(() => {
        async function loadDropdowns() {
            try {
                const [cls, docs, assocDocs] = await Promise.all([
                    patientsService.getClinics(),
                    patientsService.getDoctors(),
                    patientsService.getPatientDoctors(initialData.id),
                ]);
                setClinics(cls);
                setDoctors(docs);
                setAssociatedDoctors(assocDocs);
            } catch (err) {
                console.error('Erro ao carregar dropdowns:', err);
            }
        }
        loadDropdowns();
    }, [initialData.id]);

    // Carregar equipa da clínica
    useEffect(() => {
        async function loadClinicTeam() {
            if (!patient.clinica_id) return;
            try {
                const { data, error } = await (await import('@/lib/supabase')).supabase
                    .from('user_clinic_access')
                    .select('user_id, user_profiles!inner(full_name, phone, app_role)')
                    .eq('clinic_id', patient.clinica_id);
                if (!error && data) {
                    setClinicTeam(data.map((d: any) => ({
                        user_id: d.user_id,
                        full_name: d.user_profiles.full_name,
                        phone: d.user_profiles.phone,
                        role: d.user_profiles.app_role,
                    })).filter((d: any) => d.role !== 'doctor')); // Só colaboradores (não médicos)
                }
            } catch { /* ignore */ }
        }
        loadClinicTeam();
    }, [patient.clinica_id]);

    // Auto-save com debounce + lock optimista
    const autoSave = useCallback(async (field: string, value: unknown) => {
        if (readOnly) return;
        // Bloquear auto-save do nome se houver duplicação block
        if (field === 'nome' && dupResult.status === 'block') return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                setSaving(true);
                // Verificar lock optimista antes de salvar
                const canSave = await lock.checkBeforeSave();
                if (!canSave) {
                    setSaving(false);
                    return; // Conflito detectado — banner será mostrado
                }
                await patientsService.updatePatient(patient.id, { [field]: value });
                // Actualizar loadedAt após save bem-sucedido
                lock.setLoadedAt(new Date().toISOString());
                setLastSaved(new Date());
                window.dispatchEvent(new Event('patient-updated'));
            } catch (error) {
                console.error('Erro ao guardar:', error);
            } finally {
                setSaving(false);
            }
        }, 600);
    }, [patient.id, readOnly, lock]);

    const handleFieldChange = (field: string, value: unknown) => {
        setPatient(prev => ({ ...prev, [field]: value }));
        autoSave(field, value);

        // Trigger anti-duplicação quando nome ou ID Paciente Clínica mudam
        if (field === 'nome' || field === 'id_paciente_clinica') {
            if (dupCheckRef.current) clearTimeout(dupCheckRef.current);
            dupCheckRef.current = setTimeout(async () => {
                const updatedPatient = { ...patient, [field]: value };
                try {
                    const result = await patientsService.checkDuplicates(
                        patient.id,
                        String(updatedPatient.nome || ''),
                        String(updatedPatient.clinica_id || ''),
                        updatedPatient.id_paciente_clinica as string | null
                    );
                    setDupResult(result);
                } catch (err) {
                    console.error('Erro na verificação de duplicados:', err);
                }
            }, 800);
        }
    };

    const handleToggleUrgent = async () => {
        if (readOnly) return;
        const newValue = !patient.urgente;
        setPatient(prev => ({ ...prev, urgente: newValue }));
        try {
            await patientsService.toggleUrgent(patient.id, newValue);
            window.dispatchEvent(new Event('patient-updated'));
        } catch (error) {
            console.error('Erro ao toggle urgente:', error);
            setPatient(prev => ({ ...prev, urgente: !newValue }));
        }
    };

    const handleDeleteConfirm = async () => {
        try {
            await patientsService.softDeletePatient(patient.id);

            // Arquivar pasta do paciente (silencioso, não bloqueia)
            fetch('/api/patient-folder', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ t_id: patient.t_id }),
            }).catch(() => { });

            window.dispatchEvent(new Event('patient-updated'));
            router.push('/dashboard/patients');
        } catch (error) {
            console.error('Erro ao apagar:', error);
            setShowDeleteModal(false);
        }
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        const clean = name.replace(/\s*\(.*\)\s*$/, '').trim();
        const words = clean.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return '?';
        if (words.length === 1) return words[0].charAt(0).toUpperCase();
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    // Handlers médicos associados
    const handleAddDoctor = async (doctorId: string) => {
        if (readOnly) return;
        const doc = doctors.find(d => d.user_id === doctorId);
        if (!doc || associatedDoctors.some(d => d.doctor_id === doctorId)) return;

        const updated = [...associatedDoctors, { doctor_id: doctorId, full_name: doc.full_name }];
        setAssociatedDoctors(updated);
        setShowDoctorPicker(false);
        try {
            await patientsService.syncDoctors(patient.id, updated.map(d => d.doctor_id));
        } catch (err) {
            console.error('Erro ao sincronizar médicos:', err);
            setAssociatedDoctors(associatedDoctors); // rollback
        }
    };

    const handleRemoveDoctor = async (doctorId: string) => {
        if (readOnly) return;
        // Não permitir remover o médico principal
        if (doctorId === patient.medico_principal_id) return;

        const updated = associatedDoctors.filter(d => d.doctor_id !== doctorId);
        setAssociatedDoctors(updated);
        try {
            await patientsService.syncDoctors(patient.id, updated.map(d => d.doctor_id));
        } catch (err) {
            console.error('Erro ao sincronizar médicos:', err);
            setAssociatedDoctors(associatedDoctors); // rollback
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Conflict Banner */}
            {lock.hasConflict && (
                <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2.5 flex items-center justify-between gap-3 animate-in slide-in-from-top">
                    <div className="flex items-center gap-2 text-amber-400 text-xs">
                        <span className="text-base">⚠️</span>
                        <span>Este paciente foi alterado por outro utilizador. As suas alterações podem não ser guardadas.</span>
                    </div>
                    <button
                        onClick={async () => {
                            await lock.refreshLoadedAt();
                            window.location.reload();
                        }}
                        className="px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 text-xs font-medium hover:bg-amber-500/30 transition-colors whitespace-nowrap"
                    >
                        ↻ Recarregar
                    </button>
                </div>
            )}
            {/* ============ HERO HEADER ============ */}
            <div className="bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] px-4 sm:px-8 pt-6 sm:pt-8 pb-14 sm:pb-16 relative">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(245,158,11,0.15) 0%, transparent 50%)'
                }} />

                {/* Voltar (mobile) */}
                <Button
                    variant="ghost"
                    size="icon"
                    className="md:hidden h-8 w-8 shrink-0 absolute top-3 left-3 text-white/70 hover:text-white z-20"
                    onClick={() => router.push('/dashboard/patients')}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>

                <div className="relative z-10 flex flex-col sm:flex-row items-center sm:items-center gap-3 sm:gap-6">
                    {/* Avatar com iniciais + WhatsApp badge */}
                    <div className="relative flex-shrink-0" ref={whatsappRef}>
                        <div className="h-16 w-16 sm:h-24 sm:w-24 md:h-28 md:w-28 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 ring-[3px] ring-primary/30 flex items-center justify-center shadow-xl shadow-primary/10">
                            <span className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">
                                {getInitials(patient.nome)}
                            </span>
                        </div>
                        {/* WhatsApp badge */}
                        <button
                            onClick={() => setShowWhatsApp(!showWhatsApp)}
                            className={cn(
                                "absolute -bottom-1 -right-1 h-7 w-7 sm:h-8 sm:w-8 rounded-full flex items-center justify-center shadow-lg border-2 border-[#1a2332] transition-colors cursor-pointer",
                                patient.whatsapp_group_url
                                    ? "bg-green-500 hover:bg-green-400 text-white"
                                    : "bg-gray-600 hover:bg-gray-500 text-gray-300"
                            )}
                            title={patient.whatsapp_group_url ? 'Grupo WhatsApp associado' : 'Adicionar grupo WhatsApp'}
                        >
                            <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </button>
                        {/* WhatsApp popup */}
                        {showWhatsApp && createPortal(
                            <div ref={el => { whatsappPopupRef.current = el; if (el && whatsappRef.current) { const r = whatsappRef.current.getBoundingClientRect(); el.style.top = `${r.bottom + 8}px`; el.style.left = `${Math.max(8, r.left - 80)}px`; } }} className="fixed bg-white rounded-xl shadow-2xl z-[9999] p-4 w-[320px] border border-gray-200">
                                <div className="flex items-center gap-2 mb-3">
                                    <MessageCircle className={cn("h-4 w-4", patient.whatsapp_group_url ? "text-green-500" : "text-gray-400")} />
                                    <span className="text-xs font-semibold text-gray-700">Grupo WhatsApp</span>
                                </div>
                                <input
                                    type="url"
                                    value={whatsappUrl}
                                    onChange={(e) => setWhatsappUrl(e.target.value)}
                                    placeholder="https://chat.whatsapp.com/..."
                                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-800 placeholder:text-gray-400"
                                />
                                <div className="flex items-center justify-between mt-3">
                                    <span className={cn("text-[10px] font-medium", patient.whatsapp_group_url ? "text-green-600" : "text-gray-400")}>
                                        {patient.whatsapp_group_url ? '✓ Grupo associado' : 'Sem grupo associado'}
                                    </span>
                                    <button
                                        onClick={async () => {
                                            const url = whatsappUrl || null;
                                            setPatient(prev => ({ ...prev, whatsapp_group_url: url }));
                                            setShowWhatsApp(false);
                                            try {
                                                await patientsService.updatePatient(patient.id, { whatsapp_group_url: url });
                                                lock.setLoadedAt(new Date().toISOString());
                                                setLastSaved(new Date());
                                            } catch (err) {
                                                console.error('Erro ao guardar WhatsApp URL:', err);
                                            }
                                        }}
                                        className="text-xs px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 font-medium transition-colors"
                                    >
                                        Guardar
                                    </button>
                                </div>
                            </div>,
                            document.body
                        )}
                    </div>

                    <div className="flex flex-col gap-1.5 min-w-0 flex-1 w-full sm:w-auto">
                        {/* ID + Nome editável + Status */}
                        <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center sm:justify-start">
                            <span className="text-sm sm:text-base font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-md border border-primary/20 shrink-0 tracking-wide">{patient.t_id}</span>
                            {isLabStaff && (
                                <button
                                    onClick={async () => {
                                        try {
                                            const res = await fetch('/api/patient-folder', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({ t_id: patient.t_id }),
                                            });
                                            if (!res.ok) throw new Error('Erro ao abrir pasta');
                                        } catch (err) {
                                            console.error('Erro ao abrir pasta:', err);
                                        }
                                    }}
                                    className="h-7 w-7 rounded-md flex items-center justify-center text-gray-400 hover:text-primary hover:bg-primary/10 transition-colors shrink-0"
                                    title="Abrir pasta do paciente"
                                >
                                    <FolderOpen className="h-4 w-4" />
                                </button>
                            )}
                            {patient.created_at && (
                                <span className="text-[10px] text-gray-500 hidden sm:inline">
                                    Criado em {new Date(patient.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </span>
                            )}
                            <Input
                                value={patient.nome}
                                onChange={(e) => handleFieldChange('nome', e.target.value)}
                                className={cn(
                                    "text-xl sm:text-2xl md:text-3xl font-bold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent text-white tracking-tight text-center sm:text-left",
                                    dupResult.status === 'block' && "!border !border-red-500 !ring-1 !ring-red-500/30 px-2 rounded"
                                )}
                                disabled={readOnly}
                            />
                            {/* Status badge */}
                            {(() => {
                                const statusConfig = PATIENT_STATUS_CONFIG[patient.estado || 'rascunho'] || PATIENT_STATUS_CONFIG.rascunho;
                                return (
                                    <select
                                        value={patient.estado || 'rascunho'}
                                        onChange={(e) => handleFieldChange('estado', e.target.value)}
                                        disabled={readOnly}
                                        className={cn(
                                            'text-[10px] font-semibold px-3 py-1 rounded-full border cursor-pointer shrink-0 appearance-none text-center',
                                            statusConfig.bg, statusConfig.color, statusConfig.border,
                                            readOnly && 'cursor-default opacity-70'
                                        )}
                                    >
                                        {Object.entries(PATIENT_STATUS_CONFIG).map(([key, cfg]) => (
                                            <option key={key} value={key}>{cfg.label}</option>
                                        ))}
                                    </select>
                                );
                            })()}
                            {patient.urgente && (
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/20">
                                    <AlertTriangle className="h-3 w-3" />
                                    Urgente
                                </span>
                            )}
                        </div>

                        {/* Linha: Clínica | Médicos | Equipa Associada */}
                        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 text-sm text-gray-400 mt-0.5">
                            <div className="flex items-center gap-1.5">
                                <span className="text-gray-500">Clínica:</span>
                                <select
                                    value={patient.clinica_id || ''}
                                    onChange={(e) => {
                                        const sel = clinics.find(c => c.id === e.target.value);
                                        setPatient(prev => ({
                                            ...prev,
                                            clinica_id: e.target.value,
                                            clinica: sel ? { id: sel.id, commercial_name: sel.commercial_name } : prev.clinica,
                                        }));
                                        autoSave('clinica_id', e.target.value);
                                    }}
                                    disabled={readOnly}
                                    className="text-xs font-medium border-0 bg-transparent text-white focus:outline-none cursor-pointer [&>option]:text-black [&>option]:bg-white"
                                >
                                    {clinics.map(c => (
                                        <option key={c.id} value={c.id}>{c.commercial_name}</option>
                                    ))}
                                </select>
                            </div>
                            {/* Médicos — Multi-select dropdown */}
                            <div className="relative" ref={doctorMultiRef}>
                                <button
                                    onClick={() => setShowDoctorMulti(!showDoctorMulti)}
                                    className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-white transition-colors"
                                >
                                    <span className="text-gray-500">Médicos:</span>
                                    <span className="font-medium text-white">
                                        {doctors.find(d => d.user_id === patient.medico_principal_id)?.full_name || 'Selecionar'}
                                    </span>
                                    {associatedDoctors.length > 1 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/15 text-gray-300 font-medium">+{associatedDoctors.length - 1}</span>
                                    )}
                                    <ChevronDown className={cn("h-3 w-3 text-gray-500 transition-transform", showDoctorMulti && "rotate-180")} />
                                </button>
                                {showDoctorMulti && createPortal(
                                    <div ref={el => { if (el && doctorMultiRef.current) { const r = doctorMultiRef.current.getBoundingClientRect(); el.style.top = `${r.bottom + 8}px`; el.style.left = `${r.left}px`; } }} className="fixed bg-white rounded-xl shadow-2xl z-[9999] py-2 min-w-[280px] border border-gray-200">
                                        <div className="px-3 py-1.5 border-b border-gray-100">
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Médicos do Caso</span>
                                        </div>
                                        {doctors.map(d => {
                                            const isSelected = associatedDoctors.some(ad => ad.doctor_id === d.user_id);
                                            const isPrincipal = d.user_id === patient.medico_principal_id;
                                            return (
                                                <div key={d.user_id} className={cn(
                                                    "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group",
                                                    isSelected ? "bg-primary/5" : "hover:bg-gray-50"
                                                )}>
                                                    <button
                                                        onClick={() => {
                                                            if (isSelected && !isPrincipal) {
                                                                handleRemoveDoctor(d.user_id);
                                                            } else if (!isSelected) {
                                                                handleAddDoctor(d.user_id);
                                                            }
                                                        }}
                                                        className={cn(
                                                            "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                            isSelected ? "bg-primary border-primary text-white" : "border-gray-300 hover:border-primary/50",
                                                            isPrincipal && "cursor-default"
                                                        )}
                                                        disabled={isPrincipal}
                                                    >
                                                        {isSelected && <Check className="h-2.5 w-2.5" />}
                                                    </button>
                                                    <span className={cn("text-xs flex-1 truncate", isSelected ? "text-gray-900 font-medium" : "text-gray-600")}>
                                                        {d.full_name}
                                                    </span>
                                                    {isPrincipal ? (
                                                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">Principal</span>
                                                    ) : isSelected && !readOnly ? (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setPatient(prev => ({ ...prev, medico_principal_id: d.user_id }));
                                                                autoSave('medico_principal_id', d.user_id);
                                                            }}
                                                            className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 hover:bg-primary/10 hover:text-primary font-medium opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            ★ Tornar principal
                                                        </button>
                                                    ) : null}
                                                </div>
                                            );
                                        })}
                                    </div>,
                                    document.body
                                )}
                            </div>
                            {patient.id_paciente_clinica && (
                                <span className="text-xs text-gray-500">ID Clínica: <span className="text-gray-300">{patient.id_paciente_clinica}</span></span>
                            )}
                            {/* Equipa Associada — inline, popup flutuante */}
                            <div className="relative" ref={teamRef}>
                                <button
                                    onClick={() => setShowTeam(!showTeam)}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"
                                >
                                    <Users className="h-3 w-3" />
                                    <span>Equipa</span>
                                    {(associatedDoctors.length + clinicTeam.length) > 0 && (
                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">{associatedDoctors.length + clinicTeam.length}</span>
                                    )}
                                    <ChevronDown className={cn("h-3 w-3 transition-transform", showTeam && "rotate-180")} />
                                </button>
                                {showTeam && createPortal(
                                    <div ref={el => { if (el && teamRef.current) { const r = teamRef.current.getBoundingClientRect(); el.style.top = `${r.bottom + 8}px`; el.style.left = `${Math.min(r.left, window.innerWidth - 320)}px`; } }} className="fixed bg-white rounded-xl shadow-2xl z-[9999] p-3 min-w-[300px] max-w-sm border border-gray-200">
                                        {/* Médicos */}
                                        {associatedDoctors.length > 0 && (
                                            <>
                                                <div className="px-1 pb-1.5 mb-1.5 border-b border-gray-100">
                                                    <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Médicos</span>
                                                </div>
                                                <div className="space-y-1 mb-3">
                                                    {associatedDoctors.map(doc => {
                                                        const isPrincipal = doc.doctor_id === patient.medico_principal_id;
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
                                        {associatedDoctors.length === 0 && clinicTeam.length === 0 && (
                                            <p className="text-[10px] text-gray-400 italic">Nenhum membro na equipa</p>
                                        )}
                                    </div>,
                                    document.body
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Ações (direita) */}
                    <div className="flex items-center gap-2 shrink-0 self-center sm:self-start mt-1">
                        {saving && (
                            <span className="text-xs text-gray-400 animate-pulse">Guardando...</span>
                        )}
                        {!saving && lastSaved && (
                            <span className="text-xs text-green-400 hidden sm:flex items-center gap-1">
                                <Save className="h-3 w-3" />
                                Guardado
                            </span>
                        )}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 gap-1.5 text-xs",
                                patient.urgente
                                    ? "text-amber-400 bg-amber-500/15 hover:bg-amber-500/25"
                                    : "text-gray-500 hover:text-amber-400"
                            )}
                            onClick={handleToggleUrgent}
                            disabled={readOnly}
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Urgente</span>
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-gray-400 hover:text-white hover:bg-white/10"
                            onClick={() => setShowPrint(true)}
                            title="Imprimir ficha clínica"
                        >
                            <Printer className="h-4 w-4" />
                        </Button>
                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-500 hover:text-red-400"
                                onClick={() => setShowDeleteModal(true)}
                                title="Apagar paciente"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div >

            {/* Content Card com overlap negativo */}
            < div className="max-w-6xl mx-auto w-full px-4 sm:px-6 -mt-8 relative z-20 flex-1 flex flex-col pb-4 overflow-hidden" >
                <div className="bg-card rounded-xl shadow-lg border border-border overflow-hidden flex-1 flex flex-col">
                    {/* Anti-duplicação warning */}
                    <DuplicateWarning
                        status={dupResult.status}
                        message={dupResult.message}
                        matches={dupResult.matches}
                        onDismiss={() => setDupResult({ status: 'ok', message: '', matches: [] })}
                    />


                    {/* Tabs */}
                    <Tabs defaultValue="planos" className="flex-1 flex flex-col overflow-hidden">
                        <TabsList className="w-full justify-start px-4 sm:px-6 pt-2 bg-card border-b border-border/50 rounded-none h-auto overflow-x-auto flex-nowrap gap-1 scrollbar-hide">
                            <TabsTrigger value="planos" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                                <ClipboardList className="h-3.5 w-3.5" />
                                <span>Planos</span>
                                <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                                    {patient.treatment_plans?.length || 0}
                                </Badge>
                            </TabsTrigger>
                            <TabsTrigger value="ficheiros" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                                <FolderOpen className="h-3.5 w-3.5" />
                                <span>Ficheiros</span>
                            </TabsTrigger>
                            <TabsTrigger value="consideracoes" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                                <MessageSquare className="h-3.5 w-3.5" />
                                <span>Considerações</span>
                            </TabsTrigger>
                            <TabsTrigger value="documentacao" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                                <FileText className="h-3.5 w-3.5" />
                                <span>Documentação</span>
                            </TabsTrigger>
                            <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                                <History className="h-3.5 w-3.5" />
                                <span>Histórico</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* === Tab: Planos de Tratamento === */}
                        <TabsContent value="planos" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                            {/* Notas do lab */}
                            <div className="mb-6">
                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notas do Laboratório</label>
                                <textarea
                                    value={patient.notas_lab || ''}
                                    onChange={(e) => handleFieldChange('notas_lab', e.target.value)}
                                    placeholder="Notas internas sobre o paciente..."
                                    className="mt-1 w-full text-sm border border-border rounded-lg p-3 bg-muted/50 text-card-foreground/80 placeholder:text-muted-foreground focus:bg-muted focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500/30 resize-none min-h-[60px]"
                                    rows={2}
                                    disabled={readOnly}
                                />
                            </div>

                            {/* Lista de planos */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-card-foreground/80">Planos de Tratamento</h3>
                                    {!readOnly && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-7 text-xs gap-1.5 border-border text-card-foreground/80 hover:bg-muted hover:text-amber-400 hover:border-amber-500/30"
                                            onClick={() => setShowNewPlan(true)}
                                        >
                                            <Plus className="h-3 w-3" />
                                            Novo Plano
                                        </Button>
                                    )}
                                </div>

                                {(!patient.treatment_plans || patient.treatment_plans.length === 0) ? (
                                    <div className="text-center py-12 text-muted-foreground">
                                        <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                        <p className="text-sm">Sem planos de tratamento</p>
                                        <p className="text-xs mt-1">Crie o primeiro plano para começar</p>
                                    </div>
                                ) : (
                                    patient.treatment_plans.map((plan) => {
                                        const stateConfig = PLAN_STATE_CONFIG[plan.estado] || PLAN_STATE_CONFIG.rascunho;
                                        const totalPhases = plan.phases?.length || 0;
                                        const completedPhases = plan.phases?.filter(p => p.estado === 'concluida').length || 0;

                                        return (
                                            <div
                                                key={plan.id}
                                                className="border border-border/50 rounded-xl p-4 hover:border-muted-foreground transition-all bg-muted/50 cursor-pointer hover:bg-muted"
                                                onClick={() => router.push(`/dashboard/patients/${patient.id}/plans/${plan.id}`)}
                                            >
                                                {/* Cabeçalho do plano */}
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <h4 className="font-medium text-sm text-card-foreground truncate">
                                                                {plan.nome}
                                                            </h4>
                                                            <span className={cn(
                                                                "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                                stateConfig.bg,
                                                                stateConfig.color
                                                            )}>
                                                                {stateConfig.label}
                                                            </span>
                                                            {plan.urgente && (
                                                                <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                                                            {plan.work_type && (
                                                                <span className="flex items-center gap-1">
                                                                    {plan.work_type.cor && (
                                                                        <span
                                                                            className="h-2 w-2 rounded-full inline-block"
                                                                            style={{ backgroundColor: plan.work_type.cor }}
                                                                        />
                                                                    )}
                                                                    {plan.work_type.nome}
                                                                </span>
                                                            )}
                                                            {plan.medico && (
                                                                <span>Dr. {plan.medico.full_name}</span>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Progress */}
                                                    {totalPhases > 0 && (
                                                        <div className="text-right shrink-0">
                                                            <span className="text-xs text-gray-500">
                                                                {completedPhases}/{totalPhases}
                                                            </span>
                                                            <div className="w-16 h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
                                                                <div
                                                                    className="h-full bg-primary rounded-full transition-all"
                                                                    style={{ width: `${(completedPhases / totalPhases) * 100}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Fases (collapsed) */}
                                                {plan.phases && plan.phases.length > 0 && (
                                                    <div className="mt-3 pt-3 border-t border-border/50 space-y-1.5">
                                                        {plan.phases
                                                            .sort((a, b) => a.ordem - b.ordem)
                                                            .map((phase) => {
                                                                const phaseConfig = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
                                                                const appointmentCount = phase.appointments?.length || 0;

                                                                return (
                                                                    <div
                                                                        key={phase.id}
                                                                        className="flex items-center gap-2 text-xs text-muted-foreground py-1 px-2 rounded hover:bg-muted/50"
                                                                    >
                                                                        <Circle className={cn("h-2.5 w-2.5 fill-current", phaseConfig.dot)} />
                                                                        <span className="flex-1 truncate">{phase.nome}</span>
                                                                        {appointmentCount > 0 && (
                                                                            <span className="text-gray-500 text-[10px]">
                                                                                {appointmentCount} agend.
                                                                            </span>
                                                                        )}
                                                                        <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                                    </div>
                                                                );
                                                            })}
                                                    </div>
                                                )}

                                                {/* Ver detalhes link */}
                                                <div className="mt-3 pt-2 border-t border-border/50 text-right">
                                                    <span className="text-xs text-primary font-medium hover:underline">
                                                        Ver detalhes →
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </TabsContent>

                        {/* === Tab: Ficheiros === */}
                        <TabsContent value="ficheiros" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                            <FilesTab patientId={patient.id} plans={patient.treatment_plans || []} />
                        </TabsContent>

                        {/* === Tab: Considerações === */}
                        <TabsContent value="consideracoes" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                            <ConsiderationsTab patientId={patient.id} plans={patient.treatment_plans || []} />
                        </TabsContent>

                        {/* === Tab: Documentação === */}
                        <TabsContent value="documentacao" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                            <DocumentsTab patientId={patient.id} />
                        </TabsContent>

                        {/* === Tab: Histórico === */}
                        <TabsContent value="historico" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                            <HistoryTab patient={patient} />
                        </TabsContent>
                    </Tabs>

                    {/* Modal Novo Plano */}
                    {showNewPlan && (
                        <NewPlanModal
                            patientId={patient.id}
                            patientClinicaId={patient.clinica_id}
                            patientMedicoId={patient.medico_principal_id}
                            onClose={() => setShowNewPlan(false)}
                            onCreated={async () => {
                                setShowNewPlan(false);
                                try {
                                    const updated = await patientsService.getPatientDetails(patient.id);
                                    if (updated) setPatient(updated);
                                } catch (err) {
                                    console.error('Erro ao recarregar:', err);
                                }
                            }}
                        />
                    )}

                    {/* Modal Confirmar Eliminação */}
                    {showDeleteModal && (
                        <DeleteConfirmModal
                            patientName={patient.nome}
                            onConfirm={handleDeleteConfirm}
                            onCancel={() => setShowDeleteModal(false)}
                        />
                    )}

                    {/* Modal Impressão Ficha Clínica */}
                    {showPrint && (
                        <PatientPrintSheet
                            patient={patient}
                            onClose={() => setShowPrint(false)}
                        />
                    )}
                </div>
            </div >
        </div >
    );
}

