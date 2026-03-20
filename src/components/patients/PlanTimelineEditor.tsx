'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Plus, X, ChevronDown, ChevronUp, Calendar, Clock, Layers, GripVertical } from 'lucide-react';
import { catalogService } from '@/services/catalogService';

// ──── Tipos (modo draft — sem IDs reais) ────
export interface TimelineAppointment {
    tempId: string;
    tipo: string;
    data_prevista?: string;
    hora_prevista?: string;
    notas?: string;
}

export interface TimelinePhase {
    tempId: string;
    nome: string;
    ordem: number;
    appointments: TimelineAppointment[];
}

interface PlanTimelineEditorProps {
    phases: TimelinePhase[];
    onChange: (phases: TimelinePhase[]) => void;
}

// ──── Tipo local para dropdown ────
interface AppointmentTypeOption {
    value: string;
    label: string;
    emoji: string;
}

// Fallback estático caso a DB falhe
const FALLBACK_TYPES: AppointmentTypeOption[] = [
    { value: 'Moldagem', label: 'Moldagem', emoji: '🦷' },
    { value: 'Para Prova', label: 'Para Prova', emoji: '🔍' },
    { value: 'Para Colocação', label: 'Para Colocação', emoji: '✅' },
    { value: 'Reparação', label: 'Reparação', emoji: '🔧' },
    { value: 'Ajuste', label: 'Ajuste', emoji: '⚙️' },
    { value: 'Outro', label: 'Outro', emoji: '📋' },
];

function genId() {
    return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

// ──── Componente ────
export default function PlanTimelineEditor({ phases, onChange }: PlanTimelineEditorProps) {
    const [collapsed, setCollapsed] = useState(false);
    const [addingPhase, setAddingPhase] = useState(false);
    const [newPhaseName, setNewPhaseName] = useState('');
    const [addingAptForPhase, setAddingAptForPhase] = useState<string | null>(null);
    const [newAptType, setNewAptType] = useState('');
    const [newAptDate, setNewAptDate] = useState('');
    const [newAptHora, setNewAptHora] = useState('');
    const [editingPhase, setEditingPhase] = useState<string | null>(null);
    const [editPhaseName, setEditPhaseName] = useState('');
    const phaseInputRef = useRef<HTMLInputElement>(null);
    const aptTypeRef = useRef<HTMLSelectElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // ── Tipos de agendamento dinâmicos ──
    const [appointmentTypes, setAppointmentTypes] = useState<AppointmentTypeOption[]>(FALLBACK_TYPES);

    useEffect(() => {
        catalogService.getAppointmentTypes().then(data => {
            const active = (data || []).filter((t: any) => t.activo);
            if (active.length > 0) {
                setAppointmentTypes(active.map((t: any) => ({
                    value: t.nome,
                    label: t.nome,
                    emoji: t.emoji || '📋',
                })));
                setNewAptType(active[0].nome);
            }
        }).catch(() => { /* usa fallback */ });
    }, []);

    // ── Fases do plano (sugestões do catálogo) ──
    const [phaseOptions, setPhaseOptions] = useState<{ nome: string; emoji: string }[]>([]);

    useEffect(() => {
        catalogService.getPlanPhases().then(data => {
            const active = (data || []).filter((t: any) => t.activo);
            setPhaseOptions(active.map((t: any) => ({ nome: t.nome, emoji: t.emoji || '📋' })));
        }).catch(() => { /* sem sugestões */ });
    }, []);

    // Auto-focus nos inputs
    useEffect(() => {
        if (addingPhase && phaseInputRef.current) phaseInputRef.current.focus();
    }, [addingPhase]);

    useEffect(() => {
        if (addingAptForPhase && aptTypeRef.current) aptTypeRef.current.focus();
    }, [addingAptForPhase]);

    // ── Adicionar Fase ──
    const handleAddPhase = useCallback(() => {
        const name = newPhaseName.trim();
        if (!name) return;
        const newPhase: TimelinePhase = {
            tempId: genId(),
            nome: name,
            ordem: phases.length + 1,
            appointments: [],
        };
        onChange([...phases, newPhase]);
        setNewPhaseName('');
        setAddingPhase(false);
        // Scroll para o final
        setTimeout(() => scrollRef.current?.scrollTo({ left: scrollRef.current.scrollWidth, behavior: 'smooth' }), 100);
    }, [newPhaseName, phases, onChange]);

    // ── Remover Fase ──
    const handleRemovePhase = useCallback((tempId: string) => {
        onChange(phases.filter(p => p.tempId !== tempId).map((p, i) => ({ ...p, ordem: i + 1 })));
    }, [phases, onChange]);

    // ── Renomear Fase ──
    const handleRenamePhase = useCallback((tempId: string) => {
        const name = editPhaseName.trim();
        if (!name) { setEditingPhase(null); return; }
        onChange(phases.map(p => p.tempId === tempId ? { ...p, nome: name } : p));
        setEditingPhase(null);
        setEditPhaseName('');
    }, [editPhaseName, phases, onChange]);

    // ── Adicionar Agendamento ──
    const handleAddAppointment = useCallback((phaseId: string) => {
        const newApt: TimelineAppointment = {
            tempId: genId(),
            tipo: newAptType,
            data_prevista: newAptDate || undefined,
            hora_prevista: newAptHora || undefined,
        };
        onChange(phases.map(p =>
            p.tempId === phaseId
                ? { ...p, appointments: [...p.appointments, newApt] }
                : p
        ));
        setNewAptType(appointmentTypes[0]?.value || '');
        setNewAptDate('');
        setNewAptHora('');
        setAddingAptForPhase(null);
    }, [newAptType, newAptDate, newAptHora, phases, onChange]);

    // ── Remover Agendamento ──
    const handleRemoveAppointment = useCallback((phaseId: string, aptTempId: string) => {
        onChange(phases.map(p =>
            p.tempId === phaseId
                ? { ...p, appointments: p.appointments.filter(a => a.tempId !== aptTempId) }
                : p
        ));
    }, [phases, onChange]);

    const totalAppts = phases.reduce((sum, p) => sum + p.appointments.length, 0);

    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {/* ── Header ── */}
            <button
                type="button"
                onClick={() => setCollapsed(!collapsed)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gradient-to-r from-gray-50 to-white hover:from-gray-100 hover:to-gray-50 transition-colors group"
            >
                <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-amber-50 flex items-center justify-center ring-1 ring-amber-200/50">
                        <Layers className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="text-left">
                        <span className="text-sm font-semibold text-gray-800">Timeline do Plano</span>
                        <span className="text-[10px] text-gray-400 ml-2">
                            {phases.length} fase{phases.length !== 1 ? 's' : ''} · {totalAppts} agendamento{totalAppts !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
                {collapsed ? (
                    <ChevronDown className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                ) : (
                    <ChevronUp className="h-4 w-4 text-gray-400 group-hover:text-gray-600 transition-colors" />
                )}
            </button>

            {/* ── Conteúdo ── */}
            {!collapsed && (
                <div className="px-5 py-4 border-t border-gray-100">
                    {phases.length === 0 && !addingPhase ? (
                        /* ── Estado vazio ── */
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <div className="h-14 w-14 rounded-2xl bg-gray-50 flex items-center justify-center mb-3 ring-1 ring-gray-200/50">
                                <Calendar className="h-6 w-6 text-gray-300" />
                            </div>
                            <p className="text-sm text-gray-500 mb-1">Nenhuma fase definida</p>
                            <p className="text-xs text-gray-400 mb-4">Crie fases para organizar os agendamentos do plano</p>
                            <button
                                type="button"
                                onClick={() => setAddingPhase(true)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 hover:text-amber-700 bg-amber-50 hover:bg-amber-100 px-4 py-2 rounded-lg transition-colors"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Criar Primeira Fase
                            </button>
                        </div>
                    ) : (
                        /* ── Timeline Horizontal ── */
                        <div className="relative">
                            <div ref={scrollRef} className="overflow-x-auto scrollbar-hide scroll-smooth pb-2">
                                <div className="flex items-start gap-3 min-w-max">
                                    {phases.map((phase, phaseIdx) => (
                                        <div key={phase.tempId} className="flex items-start gap-3">
                                            {/* ── Card da Fase ── */}
                                            <div className="relative group/phase">
                                                <div className={cn(
                                                    "w-[200px] bg-white border rounded-xl shadow-sm hover:shadow-md transition-all duration-200",
                                                    "border-gray-200 hover:border-amber-300"
                                                )}>
                                                    {/* Header da fase */}
                                                    <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-100">
                                                        <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                            <span className="text-[10px] font-bold text-amber-700">{phaseIdx + 1}</span>
                                                        </div>
                                                        {editingPhase === phase.tempId ? (
                                                            <input
                                                                type="text"
                                                                value={editPhaseName}
                                                                onChange={e => setEditPhaseName(e.target.value)}
                                                                onKeyDown={e => {
                                                                    if (e.key === 'Enter') handleRenamePhase(phase.tempId);
                                                                    if (e.key === 'Escape') setEditingPhase(null);
                                                                }}
                                                                onBlur={() => handleRenamePhase(phase.tempId)}
                                                                autoFocus
                                                                className="flex-1 text-xs font-semibold text-gray-800 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-amber-400 min-w-0"
                                                            />
                                                        ) : (
                                                            <span
                                                                className="flex-1 text-xs font-semibold text-gray-800 truncate cursor-pointer hover:text-amber-700"
                                                                onClick={() => { setEditingPhase(phase.tempId); setEditPhaseName(phase.nome); }}
                                                                title="Clique para renomear"
                                                            >
                                                                {phase.nome}
                                                            </span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemovePhase(phase.tempId)}
                                                            className="opacity-0 group-hover/phase:opacity-100 h-5 w-5 rounded flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-all"
                                                            title="Remover fase"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    {/* Lista de agendamentos */}
                                                    <div className="px-3 py-2 space-y-1.5 min-h-[40px]">
                                                        {phase.appointments.length === 0 && addingAptForPhase !== phase.tempId && (
                                                            <p className="text-[10px] text-gray-400 italic text-center py-1">Sem agendamentos</p>
                                                        )}
                                                        {phase.appointments.map(apt => {
                                                            const aptType = appointmentTypes.find(t => t.value === apt.tipo);
                                                            return (
                                                                <div
                                                                    key={apt.tempId}
                                                                    className="group/apt flex items-center gap-1.5 px-2 py-1.5 bg-gray-50 rounded-lg hover:bg-blue-50 transition-colors"
                                                                >
                                                                    <span className="text-xs">{aptType?.emoji || '📋'}</span>
                                                                    <div className="flex-1 min-w-0">
                                                                        <span className="text-[11px] font-medium text-gray-700 truncate block">
                                                                            {aptType?.label || apt.tipo}
                                                                        </span>
                                                                        {apt.data_prevista && (
                                                                            <span className="text-[9px] text-gray-400 flex items-center gap-0.5">
                                                                                <Clock className="h-2.5 w-2.5" />
                                                                                {new Date(apt.data_prevista).toLocaleDateString('pt-PT')}
                                                                                {apt.hora_prevista ? ` ${apt.hora_prevista}` : ''}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleRemoveAppointment(phase.tempId, apt.tempId)}
                                                                        className="opacity-0 group-hover/apt:opacity-100 h-4 w-4 rounded flex items-center justify-center text-gray-400 hover:text-red-500 transition-all shrink-0"
                                                                    >
                                                                        <X className="h-2.5 w-2.5" />
                                                                    </button>
                                                                </div>
                                                            );
                                                        })}

                                                        {/* Inline form para novo agendamento */}
                                                        {addingAptForPhase === phase.tempId && (
                                                            <div className="border border-blue-200 rounded-lg p-2 bg-blue-50/50 space-y-1.5">
                                                                <select
                                                                    ref={aptTypeRef}
                                                                    value={newAptType}
                                                                    onChange={e => setNewAptType(e.target.value)}
                                                                    className="w-full text-[11px] border border-gray-200 rounded-md px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
                                                                >
                                                                    {appointmentTypes.map(t => (
                                                                        <option key={t.value} value={t.value}>{t.emoji} {t.label}</option>
                                                                    ))}
                                                                </select>
                                                                <div className="flex gap-1.5">
                                                                    <input
                                                                        type="date"
                                                                        value={newAptDate}
                                                                        onChange={e => setNewAptDate(e.target.value)}
                                                                        className="flex-1 text-[10px] border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400 min-w-0"
                                                                        placeholder="Data"
                                                                    />
                                                                    <input
                                                                        type="time"
                                                                        value={newAptHora}
                                                                        onChange={e => setNewAptHora(e.target.value)}
                                                                        className="w-[70px] text-[10px] border border-gray-200 rounded-md px-1.5 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                        placeholder="Hora"
                                                                    />
                                                                </div>
                                                                <div className="flex gap-1.5">
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => handleAddAppointment(phase.tempId)}
                                                                        className="flex-1 text-[10px] font-semibold text-white bg-blue-500 hover:bg-blue-600 rounded-md py-1 transition-colors"
                                                                    >
                                                                        Adicionar
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setAddingAptForPhase(null)}
                                                                        className="text-[10px] text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 transition-colors"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Botão + Agendamento */}
                                                    {addingAptForPhase !== phase.tempId && (
                                                        <div className="px-3 pb-2.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setAddingAptForPhase(phase.tempId);
                                                                    setNewAptType(appointmentTypes[0]?.value || '');
                                                                    setNewAptDate('');
                                                                    setNewAptHora('');
                                                                }}
                                                                className="w-full flex items-center justify-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg py-1.5 transition-colors border border-dashed border-blue-200 hover:border-blue-300"
                                                            >
                                                                <Plus className="h-3 w-3" />
                                                                Agendamento
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Linha conectora entre fases */}
                                            {phaseIdx < phases.length - 1 && (
                                                <div className="flex items-center self-center mt-4">
                                                    <div className="w-6 h-[2px] rounded-full bg-gradient-to-r from-amber-300 to-amber-200" />
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* ── Botão "+ Nova Fase" ── */}
                                    {!addingPhase ? (
                                        <div className="flex items-start">
                                            {phases.length > 0 && (
                                                <div className="flex items-center self-center mt-4 mr-3">
                                                    <div className="w-6 h-[2px] rounded-full bg-gradient-to-r from-amber-200 to-gray-200" />
                                                </div>
                                            )}
                                            <button
                                                type="button"
                                                onClick={() => setAddingPhase(true)}
                                                className="w-[160px] min-h-[100px] flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 hover:border-amber-400 rounded-xl text-gray-400 hover:text-amber-600 hover:bg-amber-50/50 transition-all duration-200 group/add"
                                            >
                                                <div className="h-8 w-8 rounded-full border-2 border-dashed border-gray-300 group-hover/add:border-amber-400 flex items-center justify-center transition-colors">
                                                    <Plus className="h-4 w-4" />
                                                </div>
                                                <span className="text-[11px] font-medium">Nova Fase</span>
                                            </button>
                                        </div>
                                    ) : (
                                        /* ── Inline form para nova fase ── */
                                        <div className="flex items-start">
                                            {phases.length > 0 && (
                                                <div className="flex items-center self-center mt-4 mr-3">
                                                    <div className="w-6 h-[2px] rounded-full bg-gradient-to-r from-amber-200 to-gray-200" />
                                                </div>
                                            )}
                                            <div className="w-[200px] border-2 border-amber-300 rounded-xl bg-amber-50/30 p-3 space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-6 w-6 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                                                        <span className="text-[10px] font-bold text-amber-700">{phases.length + 1}</span>
                                                    </div>
                                                    <span className="text-xs font-semibold text-amber-700">Nova Fase</span>
                                                </div>
                                                <input
                                                    ref={phaseInputRef}
                                                    type="text"
                                                    list="phase-suggestions"
                                                    value={newPhaseName}
                                                    onChange={e => setNewPhaseName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') handleAddPhase();
                                                        if (e.key === 'Escape') { setAddingPhase(false); setNewPhaseName(''); }
                                                    }}
                                                    placeholder="Escolha ou escreva..."
                                                    className="w-full text-xs border border-amber-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-amber-400 placeholder:text-gray-400"
                                                />
                                                <datalist id="phase-suggestions">
                                                    {phaseOptions.map(opt => (
                                                        <option key={opt.nome} value={opt.nome}>{opt.emoji} {opt.nome}</option>
                                                    ))}
                                                </datalist>
                                                <div className="flex gap-1.5">
                                                    <button
                                                        type="button"
                                                        onClick={handleAddPhase}
                                                        disabled={!newPhaseName.trim()}
                                                        className="flex-1 text-[11px] font-semibold text-white bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg py-1.5 transition-colors"
                                                    >
                                                        Criar
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setAddingPhase(false); setNewPhaseName(''); }}
                                                        className="text-[11px] text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                                                    >
                                                        Cancelar
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
