'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, Circle, Loader2, X, Package, ChevronDown } from 'lucide-react';
import { Tables } from '@/types/database.types';

// ──── Tipos ────
type Phase = Tables<'phases'> & {
    appointments: Tables<'appointments'>[];
};

type Plan = Tables<'treatment_plans'> & {
    work_type: { id: string; nome: string; cor: string | null } | null;
    medico: { user_id: string; full_name: string } | null;
    clinica: { id: string; commercial_name: string } | null;
    phases: Phase[];
};

interface PlanTimelineProps {
    plans: Plan[];
    onPhaseClick?: (planId: string, phaseId: string) => void;
}

// ──── Configs ────
const PHASE_STATE = {
    concluida: { icon: Check, color: 'text-emerald-400', bg: 'bg-emerald-500', ring: 'ring-emerald-500/30', line: 'bg-emerald-500', label: 'Concluída' },
    em_curso: { icon: Loader2, color: 'text-blue-400', bg: 'bg-blue-500', ring: 'ring-blue-500/40', line: 'bg-blue-500/50', label: 'Em Curso' },
    pendente: { icon: Circle, color: 'text-gray-500 dark:text-gray-500', bg: 'bg-gray-400 dark:bg-gray-600', ring: 'ring-gray-400/20', line: 'bg-gray-300 dark:bg-gray-700', label: 'Pendente' },
    cancelada: { icon: X, color: 'text-red-400', bg: 'bg-red-500', ring: 'ring-red-500/30', line: 'bg-red-500/30', label: 'Cancelada' },
} as const;

const APT_STATE = {
    concluido: 'bg-emerald-400',
    em_curso: 'bg-blue-400 animate-pulse',
    pendente: 'bg-gray-400 dark:bg-gray-600',
    cancelado: 'bg-red-400',
    reagendado: 'bg-amber-400',
} as const;

// ──── Componente ────
export default function PlanTimeline({ plans, onPhaseClick }: PlanTimelineProps) {
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);

    if (!plans || plans.length === 0) return null;

    const plan = plans[selectedPlanIdx] || plans[0];
    const phases = [...(plan.phases || [])].sort((a, b) => a.ordem - b.ordem);

    if (phases.length === 0) return null;

    // Calcular progresso global do plano
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.estado === 'concluida').length;
    const hasRecolhaPronta = phases.some(p =>
        p.appointments?.some(a => a.recolha_pronta && a.estado !== 'concluido')
    );

    return (
        <div className="relative px-4 sm:px-8 py-3 border-b border-border/30 bg-card/50 dark:bg-gray-900/50 backdrop-blur-sm">
            {/* Linha topo: selector de plano + progresso */}
            <div className="flex items-center justify-between mb-2.5 max-w-6xl mx-auto">
                <div className="flex items-center gap-2 min-w-0">
                    {/* Selector de plano (se > 1) */}
                    {plans.length > 1 ? (
                        <div className="relative">
                            <button
                                onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                                className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 hover:text-foreground transition-colors"
                            >
                                <span className="truncate max-w-[200px]">
                                    {plan.work_type?.nome || `Plano ${selectedPlanIdx + 1}`}
                                </span>
                                <ChevronDown className={cn("h-3 w-3 transition-transform shrink-0", showPlanDropdown && "rotate-180")} />
                            </button>
                            {showPlanDropdown && (
                                <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 min-w-[200px] py-1">
                                    {plans.map((p, i) => (
                                        <button
                                            key={p.id}
                                            onClick={() => { setSelectedPlanIdx(i); setShowPlanDropdown(false); }}
                                            className={cn(
                                                "w-full text-left px-3 py-1.5 text-xs hover:bg-accent transition-colors",
                                                i === selectedPlanIdx ? "text-primary font-semibold" : "text-foreground/70"
                                            )}
                                        >
                                            {p.work_type?.nome || `Plano ${i + 1}`}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <span className="text-xs font-semibold text-foreground/80 truncate max-w-[200px]">
                            {plan.work_type?.nome || 'Plano de Tratamento'}
                        </span>
                    )}

                    {/* Badge de recolha pendente */}
                    {hasRecolhaPronta && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse">
                            <Package className="h-3 w-3" />
                            Recolha
                        </span>
                    )}
                </div>

                {/* Progresso fraccionário */}
                <span className="text-[10px] font-mono text-foreground/50 shrink-0">
                    {completedPhases}/{totalPhases} fases
                </span>
            </div>

            {/* Timeline horizontal */}
            <div className="flex items-start gap-0 overflow-x-auto scrollbar-hide max-w-6xl mx-auto pb-1">
                {phases.map((phase, idx) => {
                    const state = PHASE_STATE[phase.estado as keyof typeof PHASE_STATE] || PHASE_STATE.pendente;
                    const StateIcon = state.icon;
                    const isActive = phase.estado === 'em_curso';
                    const isLast = idx === phases.length - 1;
                    const apts = [...(phase.appointments || [])].sort((a, b) => a.ordem - b.ordem);
                    const completedApts = apts.filter(a => a.estado === 'concluido').length;

                    return (
                        <div
                            key={phase.id}
                            className="flex items-start flex-shrink-0"
                            style={{ minWidth: phases.length <= 3 ? `${100 / phases.length}%` : 'auto' }}
                        >
                            {/* Fase node */}
                            <button
                                onClick={() => onPhaseClick?.(plan.id, phase.id)}
                                className={cn(
                                    "flex flex-col items-center gap-1 px-3 py-1 rounded-lg transition-all group cursor-pointer",
                                    "hover:bg-accent/50",
                                    isActive && "bg-primary/5 dark:bg-amber-500/5"
                                )}
                            >
                                {/* Círculo do estado */}
                                <div className={cn(
                                    "relative h-7 w-7 rounded-full flex items-center justify-center transition-all",
                                    phase.estado === 'concluida' && "bg-emerald-500 text-white",
                                    phase.estado === 'em_curso' && "bg-blue-500/20 text-blue-400 ring-2 ring-blue-500/40",
                                    phase.estado === 'pendente' && "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-500",
                                    phase.estado === 'cancelada' && "bg-red-500/20 text-red-400",
                                    isActive && "ring-2 ring-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                                )}>
                                    <StateIcon className={cn(
                                        "h-3.5 w-3.5",
                                        phase.estado === 'em_curso' && "animate-spin"
                                    )} />
                                    {/* Pulse para fase activa */}
                                    {isActive && (
                                        <span className="absolute inset-0 rounded-full animate-ping bg-amber-500/20" />
                                    )}
                                </div>

                                {/* Nome da fase */}
                                <span className={cn(
                                    "text-[10px] font-medium text-center leading-tight max-w-[80px] truncate",
                                    isActive ? "text-foreground font-semibold" : "text-foreground/60",
                                    "group-hover:text-foreground"
                                )}>
                                    {phase.nome}
                                </span>

                                {/* Dots dos agendamentos */}
                                {apts.length > 0 && (
                                    <div className="flex items-center gap-0.5 mt-0.5">
                                        {apts.slice(0, 6).map((apt) => {
                                            const aptColor = APT_STATE[apt.estado as keyof typeof APT_STATE] || APT_STATE.pendente;
                                            return (
                                                <div
                                                    key={apt.id}
                                                    className={cn("h-1.5 w-1.5 rounded-full", aptColor)}
                                                    title={`${apt.tipo} · ${apt.estado}${apt.recolha_pronta ? ' · 📦 Recolha pronta' : ''}`}
                                                />
                                            );
                                        })}
                                        {apts.length > 6 && (
                                            <span className="text-[8px] text-foreground/40 ml-0.5">+{apts.length - 6}</span>
                                        )}
                                    </div>
                                )}

                                {/* Progresso agendamentos em texto */}
                                {apts.length > 0 && (
                                    <span className="text-[9px] text-foreground/40 font-mono">
                                        {completedApts}/{apts.length}
                                    </span>
                                )}
                            </button>

                            {/* Linha de conexão */}
                            {!isLast && (
                                <div className="flex items-center self-center mt-3 px-0.5">
                                    <div className={cn(
                                        "h-[2px] w-6 sm:w-10 rounded-full transition-colors",
                                        phase.estado === 'concluida' ? 'bg-emerald-500' : 'bg-border'
                                    )} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
