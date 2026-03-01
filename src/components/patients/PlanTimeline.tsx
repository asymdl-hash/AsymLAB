'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, Package, ChevronDown } from 'lucide-react';
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

// ──── Cores dos estados de appointment ────
const APT_STATE_COLOR: Record<string, string> = {
    concluido: 'bg-emerald-400',
    em_curso: 'bg-blue-400',
    pendente: 'bg-gray-300 dark:bg-gray-600',
    cancelado: 'bg-red-400',
    reagendado: 'bg-amber-400',
};

// ──── Componente ────
export default function PlanTimeline({ plans, onPhaseClick }: PlanTimelineProps) {
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);

    if (!plans || plans.length === 0) return null;

    const plan = plans[selectedPlanIdx] || plans[0];
    const phases = [...(plan.phases || [])].sort((a, b) => a.ordem - b.ordem);

    if (phases.length === 0) return null;

    // Progresso global
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.estado === 'concluida').length;
    const activeIdx = phases.findIndex(p => p.estado === 'em_curso');
    const hasRecolhaPronta = phases.some(p =>
        p.appointments?.some(a => a.recolha_pronta && a.estado !== 'concluido')
    );

    // Barra de progresso — percentagem
    const progressPct = totalPhases > 1
        ? ((activeIdx >= 0 ? activeIdx : completedPhases) / (totalPhases - 1)) * 100
        : completedPhases > 0 ? 100 : 0;

    return (
        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6 -mt-4 mb-2 z-20">
            <div className="bg-card/95 dark:bg-[#111827]/95 backdrop-blur-xl rounded-xl border border-border/50 shadow-lg px-5 pt-3 pb-5">
                {/* Título + selector de plano + progresso */}
                <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/60 mr-3 shrink-0">Timeline</span>
                    <div className="flex items-center gap-2.5 min-w-0">
                        {plans.length > 1 ? (
                            <div className="relative">
                                <button
                                    onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                                    className="flex items-center gap-1.5 text-xs font-semibold text-foreground/80 hover:text-foreground transition-colors"
                                >
                                    <div
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: plan.work_type?.cor || '#6b7280' }}
                                    />
                                    <span className="truncate max-w-[180px]">
                                        {plan.work_type?.nome || `Plano ${selectedPlanIdx + 1}`}
                                    </span>
                                    <ChevronDown className={cn("h-3 w-3 text-muted-foreground transition-transform shrink-0", showPlanDropdown && "rotate-180")} />
                                </button>
                                {showPlanDropdown && (
                                    <div className="absolute top-full left-0 mt-1 bg-popover border border-border rounded-lg shadow-xl z-50 min-w-[200px] py-1">
                                        {plans.map((p, i) => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setSelectedPlanIdx(i); setShowPlanDropdown(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-xs hover:bg-accent transition-colors flex items-center gap-2",
                                                    i === selectedPlanIdx ? "text-primary font-semibold bg-accent/50" : "text-foreground/70"
                                                )}
                                            >
                                                <div
                                                    className="h-2 w-2 rounded-full shrink-0"
                                                    style={{ backgroundColor: p.work_type?.cor || '#6b7280' }}
                                                />
                                                {p.work_type?.nome || `Plano ${i + 1}`}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <div
                                    className="h-2.5 w-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: plan.work_type?.cor || '#6b7280' }}
                                />
                                <span className="text-xs font-semibold text-foreground/80 truncate max-w-[180px]">
                                    {plan.work_type?.nome || 'Plano de Tratamento'}
                                </span>
                            </div>
                        )}

                        {hasRecolhaPronta && (
                            <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 animate-pulse">
                                <Package className="h-3 w-3" />
                                Recolha
                            </span>
                        )}
                    </div>

                    <span className="text-[10px] font-medium text-muted-foreground shrink-0 tabular-nums bg-muted/50 px-2 py-0.5 rounded-full">
                        {completedPhases}/{totalPhases} fases
                    </span>
                </div>

                {/* Timeline horizontal */}
                <div className="relative">
                    {/* Linha de fundo */}
                    <div className="absolute top-[14px] left-[14px] right-[14px] h-[2px] bg-border rounded-full" />

                    {/* Linha de progresso animada */}
                    <div
                        className="absolute top-[14px] left-[14px] h-[2px] rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `calc(${progressPct}% * (100% - 28px) / 100%)`,
                            background: 'linear-gradient(90deg, #10b981, #3b82f6)',
                        }}
                    />

                    {/* Fases */}
                    <div className="relative flex items-start justify-between">
                        {phases.map((phase) => {
                            const isCompleted = phase.estado === 'concluida';
                            const isActive = phase.estado === 'em_curso';
                            const isCancelled = phase.estado === 'cancelada';
                            const apts = [...(phase.appointments || [])].sort((a, b) => a.ordem - b.ordem);
                            const completedApts = apts.filter(a => a.estado === 'concluido').length;

                            return (
                                <button
                                    key={phase.id}
                                    onClick={() => onPhaseClick?.(plan.id, phase.id)}
                                    className="flex flex-col items-center gap-1.5 group cursor-pointer flex-1 min-w-0"
                                >
                                    {/* Nódulo */}
                                    <div className="relative">
                                        <div className={cn(
                                            "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300 border-2",
                                            isCompleted && "bg-emerald-500 border-emerald-500 text-white shadow-md shadow-emerald-500/25",
                                            isActive && "bg-blue-500/15 border-blue-500 text-blue-500 dark:bg-blue-500/20",
                                            isCancelled && "bg-red-500/15 border-red-500/50 text-red-400",
                                            !isCompleted && !isActive && !isCancelled && "bg-card dark:bg-gray-800 border-border text-muted-foreground",
                                            "group-hover:scale-110"
                                        )}>
                                            {isCompleted && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                                            {isActive && <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                                            {isCancelled && <X className="h-3 w-3" />}
                                            {!isCompleted && !isActive && !isCancelled && (
                                                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                                            )}
                                        </div>

                                        {/* Anel suave para fase activa — SEM spinner/rotação */}
                                        {isActive && (
                                            <div className="absolute -inset-[5px] rounded-full border-2 border-amber-500/40 animate-[pulse_2.5s_ease-in-out_infinite]" />
                                        )}
                                    </div>

                                    {/* Nome */}
                                    <span className={cn(
                                        "text-[10px] leading-tight text-center max-w-[72px] sm:max-w-[100px] truncate transition-colors",
                                        isActive ? "text-foreground font-semibold" : "text-muted-foreground font-medium",
                                        "group-hover:text-foreground"
                                    )}>
                                        {phase.nome}
                                    </span>

                                    {/* Dots de agendamentos */}
                                    {apts.length > 0 && (
                                        <div className="flex items-center gap-[3px]">
                                            {apts.slice(0, 5).map((apt) => (
                                                <div
                                                    key={apt.id}
                                                    className={cn(
                                                        "h-[5px] w-[5px] rounded-full",
                                                        APT_STATE_COLOR[apt.estado] || APT_STATE_COLOR.pendente
                                                    )}
                                                    title={`${apt.tipo} · ${apt.estado}`}
                                                />
                                            ))}
                                            {apts.length > 5 && (
                                                <span className="text-[8px] text-muted-foreground ml-0.5">+{apts.length - 5}</span>
                                            )}
                                        </div>
                                    )}

                                    {/* Fracção */}
                                    {apts.length > 0 && (
                                        <span className="text-[9px] text-muted-foreground/70 tabular-nums">
                                            {completedApts}/{apts.length}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
