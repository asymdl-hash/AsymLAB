'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, ChevronDown, ChevronLeft, ChevronRight, Package, Calendar, Clock } from 'lucide-react';
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
    onPhaseSelect?: (planId: string, phaseId: string, phase: Phase) => void;
    selectedPhaseId?: string | null;
    onAppointmentClick?: (appointment: Tables<'appointments'>, phase: Phase) => void;
    selectedAppointmentId?: string | null;
}

// ──── Estados das fases ────
type PhaseVisualState = 'criada' | 'em_andamento' | 'por_fechar' | 'fechada' | 'cancelada';

function getPhaseVisualState(phase: Phase): PhaseVisualState {
    if (phase.estado === 'cancelada') return 'cancelada';
    if (phase.estado === 'concluida') return 'fechada';
    if (phase.estado === 'em_curso') return 'em_andamento';
    return 'criada';
}

// ──── Cores dos estados de agendamento ────
const APT_STATE_STYLES: Record<string, { bg: string; ring: string; label: string }> = {
    concluido: { bg: 'bg-emerald-500', ring: 'ring-emerald-300', label: 'Concluído' },
    agendado: { bg: 'bg-blue-500', ring: 'ring-blue-300', label: 'Agendado' },
    prova_entregue: { bg: 'bg-indigo-400', ring: 'ring-indigo-200', label: 'Prova Entregue' },
    colocacao_entregue: { bg: 'bg-purple-400', ring: 'ring-purple-200', label: 'Colocação Entregue' },
    recolhido: { bg: 'bg-teal-400', ring: 'ring-teal-200', label: 'Recolhido' },
    cancelado: { bg: 'bg-red-400', ring: 'ring-red-200', label: 'Cancelado' },
    remarcado: { bg: 'bg-amber-400', ring: 'ring-amber-200', label: 'Remarcado' },
};

// ──── Legenda visual dos estados de fase ────
const PHASE_LEGEND = [
    { state: 'fechada', label: 'Fechada', color: 'bg-emerald-500' },
    { state: 'em_andamento', label: 'Ativa', color: 'bg-blue-500' },
    { state: 'criada', label: 'Pendente', color: 'bg-gray-300' },
    { state: 'cancelada', label: 'Cancelada', color: 'bg-red-400' },
];

// ──── Componente ────
export default function PlanTimeline({ plans, onPhaseClick, onPhaseSelect, selectedPhaseId, onAppointmentClick, selectedAppointmentId }: PlanTimelineProps) {
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
    const [hoveredApt, setHoveredApt] = useState<string | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    if (!plans || plans.length === 0) return null;

    const plan = plans[selectedPlanIdx] || plans[0];
    const phases = [...(plan.phases || [])].sort((a, b) => a.ordem - b.ordem);
    const planColor = plan.work_type?.cor || '#6b7280';

    if (phases.length === 0) return null;

    // Progresso global
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.estado === 'concluida').length;
    const progressPct = totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0;
    const hasRecolhaPronta = phases.some(p =>
        p.appointments?.some(a => a.recolha_pronta && a.estado !== 'concluido')
    );

    // Próximo agendamento
    const findNextAppointment = useCallback((): string | null => {
        for (const phase of phases) {
            const apts = [...(phase.appointments || [])].sort((a, b) => a.ordem - b.ordem);
            for (const apt of apts) {
                if (apt.estado === 'agendado') return apt.id;
            }
        }
        return null;
    }, [phases]);

    const nextAptId = findNextAppointment();

    // ── Scroll detection ──
    const checkScroll = useCallback(() => {
        const el = scrollRef.current;
        if (!el) return;
        setCanScrollLeft(el.scrollLeft > 4);
        setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
    }, []);

    useEffect(() => {
        checkScroll();
        const el = scrollRef.current;
        if (el) {
            el.addEventListener('scroll', checkScroll, { passive: true });
            const ro = new ResizeObserver(checkScroll);
            ro.observe(el);
            return () => {
                el.removeEventListener('scroll', checkScroll);
                ro.disconnect();
            };
        }
    }, [checkScroll, phases]);

    const scroll = (dir: 'left' | 'right') => {
        scrollRef.current?.scrollBy({ left: dir === 'left' ? -160 : 160, behavior: 'smooth' });
    };

    return (
        <div className="relative max-w-6xl mx-auto w-full px-4 sm:px-6 -mt-4 mb-2 z-20">
            <div className="bg-white rounded-xl border border-gray-200 shadow-md hover:shadow-lg transition-shadow duration-300 overflow-hidden">

                {/* ── Progress bar micro (topo) ── */}
                <div className="h-1 bg-gray-100 w-full">
                    <div
                        className="h-full rounded-r-full transition-all duration-700 ease-out"
                        style={{
                            width: `${progressPct}%`,
                            background: `linear-gradient(90deg, ${planColor}88, ${planColor})`,
                        }}
                    />
                </div>

                <div className="px-5 pt-3 pb-4">
                    {/* ── Header: Label + Selector + Progresso ── */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2.5">
                            <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400 shrink-0">
                                Timeline Plano Tratamento
                            </span>

                            {/* Plan selector */}
                            {plans.length > 1 ? (
                                <div className="relative">
                                    <button
                                        onClick={() => setShowPlanDropdown(!showPlanDropdown)}
                                        className="flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                                    >
                                        <div
                                            className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                                            style={{ backgroundColor: planColor }}
                                        />
                                        <span className="truncate max-w-[180px]">
                                            {plan.work_type?.nome || `Plano ${selectedPlanIdx + 1}`}
                                        </span>
                                        <ChevronDown className={cn("h-3 w-3 text-gray-400 transition-transform shrink-0", showPlanDropdown && "rotate-180")} />
                                    </button>
                                    {showPlanDropdown && (
                                        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 min-w-[220px] py-1 backdrop-blur-sm">
                                            {plans.map((p, i) => (
                                                <button
                                                    key={p.id}
                                                    onClick={() => { setSelectedPlanIdx(i); setShowPlanDropdown(false); }}
                                                    className={cn(
                                                        "w-full text-left px-3 py-2.5 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2.5",
                                                        i === selectedPlanIdx ? "text-amber-600 font-semibold bg-amber-50/80" : "text-gray-600"
                                                    )}
                                                >
                                                    <div
                                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                                        style={{ backgroundColor: p.work_type?.cor || '#6b7280' }}
                                                    />
                                                    <span className="flex-1 truncate">{p.work_type?.nome || `Plano ${i + 1}`}</span>
                                                    {i === selectedPlanIdx && (
                                                        <Check className="h-3 w-3 text-amber-500" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    <div
                                        className="h-2.5 w-2.5 rounded-full shrink-0 ring-2 ring-white shadow-sm"
                                        style={{ backgroundColor: planColor }}
                                    />
                                    <span className="text-xs font-semibold text-gray-700 truncate max-w-[180px]">
                                        {plan.work_type?.nome || 'Plano de Tratamento'}
                                    </span>
                                </div>
                            )}

                            {hasRecolhaPronta && (
                                <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 animate-pulse">
                                    <Package className="h-3 w-3" />
                                    Recolha
                                </span>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            {/* Legenda compacta */}
                            <div className="hidden sm:flex items-center gap-2">
                                {PHASE_LEGEND.map(l => (
                                    <span key={l.state} className="flex items-center gap-1 text-[9px] text-gray-400">
                                        <span className={cn("h-1.5 w-1.5 rounded-full", l.color)} />
                                        {l.label}
                                    </span>
                                ))}
                            </div>
                            <span className="text-[10px] font-semibold text-gray-500 shrink-0 tabular-nums bg-gray-100 px-2.5 py-1 rounded-full">
                                {completedPhases}/{totalPhases} fases
                            </span>
                        </div>
                    </div>

                    {/* ── Timeline Horizontal com Scroll ── */}
                    <div className="relative group/timeline">
                        {/* Seta esquerda */}
                        {canScrollLeft && (
                            <button
                                onClick={() => scroll('left')}
                                className="absolute -left-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all opacity-0 group-hover/timeline:opacity-100"
                            >
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                        )}

                        {/* Seta direita */}
                        {canScrollRight && (
                            <button
                                onClick={() => scroll('right')}
                                className="absolute -right-1 top-1/2 -translate-y-1/2 z-10 h-7 w-7 rounded-full bg-white border border-gray-200 shadow-md flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 transition-all opacity-0 group-hover/timeline:opacity-100"
                            >
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        )}

                        {/* Scrollable container */}
                        <div
                            ref={scrollRef}
                            className="overflow-x-auto scrollbar-hide scroll-smooth"
                        >
                            <div className="flex items-center gap-0 min-w-max py-2 px-1">
                                {phases.map((phase, phaseIdx) => {
                                    const visualState = getPhaseVisualState(phase);
                                    const apts = [...(phase.appointments || [])].sort((a, b) => a.ordem - b.ordem);
                                    const isLastPhase = phaseIdx === phases.length - 1;
                                    const isHovered = hoveredPhase === phase.id;
                                    const isSelected = selectedPhaseId === phase.id;

                                    return (
                                        <div
                                            key={phase.id}
                                            className="flex items-center"
                                            style={{ animationDelay: `${phaseIdx * 80}ms` }}
                                        >
                                            {/* ── Fase (nódulo numerado) ── */}
                                            <div
                                                className="relative"
                                                onMouseEnter={() => setHoveredPhase(phase.id)}
                                                onMouseLeave={() => setHoveredPhase(null)}
                                            >
                                                <button
                                                    onClick={() => {
                                                        onPhaseSelect?.(plan.id, phase.id, phase);
                                                        onPhaseClick?.(plan.id, phase.id);
                                                    }}
                                                    className={cn(
                                                        "flex flex-col items-center gap-1.5 group cursor-pointer relative rounded-xl px-1 py-1 transition-all duration-200",
                                                        isSelected && "bg-amber-50 ring-2 ring-amber-400/50"
                                                    )}
                                                    title={`${phase.nome} · ${phase.estado}`}
                                                >
                                                    <div className="relative">
                                                        <div className={cn(
                                                            "h-9 w-9 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold",
                                                            visualState === 'fechada' && "text-white shadow-lg",
                                                            visualState === 'em_andamento' && "bg-blue-50 border-[2.5px] border-blue-500 text-blue-600 shadow-md shadow-blue-100",
                                                            visualState === 'por_fechar' && "bg-amber-50 border-[2.5px] border-amber-500 text-amber-600",
                                                            visualState === 'criada' && "bg-white border-2 border-dashed border-gray-300 text-gray-400",
                                                            visualState === 'cancelada' && "bg-red-50 border-2 border-red-300 text-red-400",
                                                            "group-hover:scale-110 group-hover:shadow-lg"
                                                        )}
                                                            style={visualState === 'fechada' ? {
                                                                background: `linear-gradient(135deg, #059669, #10b981)`,
                                                            } : undefined}
                                                        >
                                                            {visualState === 'fechada' ? (
                                                                <Check className="h-4 w-4" strokeWidth={3} />
                                                            ) : visualState === 'cancelada' ? (
                                                                <X className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <span>{phaseIdx + 1}</span>
                                                            )}
                                                        </div>

                                                        {/* Anel pulse para fase ativa */}
                                                        {visualState === 'em_andamento' && (
                                                            <div className="absolute -inset-[5px] rounded-full border-2 border-blue-400/30 animate-[pulse_2.5s_ease-in-out_infinite]" />
                                                        )}
                                                    </div>

                                                    {/* Nome da fase */}
                                                    <span className={cn(
                                                        "text-[9px] leading-tight text-center max-w-[72px] truncate transition-all duration-200 font-medium",
                                                        visualState === 'em_andamento' ? "text-blue-600 font-semibold" :
                                                            visualState === 'fechada' ? "text-emerald-600" :
                                                                "text-gray-500",
                                                        "group-hover:text-gray-800 group-hover:font-semibold"
                                                    )}>
                                                        {phase.nome}
                                                    </span>
                                                </button>

                                                {/* ── Tooltip flutuante ── */}
                                                {isHovered && (
                                                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                                        <div className="bg-gray-900 text-white rounded-lg px-3 py-2 text-[11px] shadow-xl min-w-[140px] max-w-[200px]">
                                                            <div className="font-semibold truncate">{phase.nome}</div>
                                                            <div className="flex items-center gap-1.5 mt-1 text-gray-300">
                                                                <span className={cn(
                                                                    "h-1.5 w-1.5 rounded-full",
                                                                    visualState === 'fechada' && "bg-emerald-400",
                                                                    visualState === 'em_andamento' && "bg-blue-400",
                                                                    visualState === 'criada' && "bg-gray-400",
                                                                    visualState === 'cancelada' && "bg-red-400",
                                                                )} />
                                                                <span className="capitalize">{phase.estado?.replace('_', ' ')}</span>
                                                            </div>
                                                            {apts.length > 0 && (
                                                                <div className="flex items-center gap-1 mt-1 text-gray-400">
                                                                    <Calendar className="h-2.5 w-2.5" />
                                                                    <span>{apts.length} agendamento{apts.length > 1 ? 's' : ''}</span>
                                                                </div>
                                                            )}
                                                            {/* Seta do tooltip */}
                                                            <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[5px] border-t-gray-900" />
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ── Agendamentos (pontos entre fases) ── */}
                                            {apts.length > 0 && (
                                                <div className="flex items-center mx-1.5">
                                                    {/* Linha conectora (gradient) */}
                                                    <div
                                                        className="w-4 h-[2px] rounded-full"
                                                        style={{
                                                            background: `linear-gradient(90deg, ${planColor}40, ${planColor}80)`,
                                                        }}
                                                    />

                                                    {apts.map((apt, aptIdx) => {
                                                        const aptStyle = APT_STATE_STYLES[apt.estado] || APT_STATE_STYLES.agendado;
                                                        const isNext = apt.id === nextAptId;
                                                        const isSelected = apt.id === selectedAppointmentId;
                                                        const isAptHovered = hoveredApt === apt.id;

                                                        return (
                                                            <div key={apt.id} className="flex items-center relative">
                                                                <div
                                                                    onMouseEnter={() => setHoveredApt(apt.id)}
                                                                    onMouseLeave={() => setHoveredApt(null)}
                                                                >
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            onAppointmentClick?.(apt, phase);
                                                                        }}
                                                                        className={cn(
                                                                            "relative transition-all duration-200 rounded-full cursor-pointer",
                                                                            isSelected
                                                                                ? "h-4 w-4 ring-2 ring-offset-1 ring-offset-white " + aptStyle.ring
                                                                                : isNext
                                                                                    ? "h-3 w-3"
                                                                                    : "h-2.5 w-2.5 hover:scale-150",
                                                                            aptStyle.bg
                                                                        )}
                                                                    >
                                                                        {isNext && !isSelected && (
                                                                            <span className="absolute -inset-[3px] rounded-full border-2 border-amber-400/60 animate-[pulse_2s_ease-in-out_infinite]" />
                                                                        )}
                                                                    </button>

                                                                    {/* Tooltip de agendamento */}
                                                                    {isAptHovered && (
                                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
                                                                            <div className="bg-gray-900 text-white rounded-lg px-2.5 py-1.5 text-[10px] shadow-xl whitespace-nowrap">
                                                                                <div className="font-semibold">{apt.tipo || 'Agendamento'}</div>
                                                                                <div className="text-gray-300 flex items-center gap-1 mt-0.5">
                                                                                    <span className={cn("h-1.5 w-1.5 rounded-full", aptStyle.bg)} />
                                                                                    {aptStyle.label}
                                                                                </div>
                                                                                {apt.data_prevista && (
                                                                                    <div className="text-gray-400 flex items-center gap-1 mt-0.5">
                                                                                        <Clock className="h-2.5 w-2.5" />
                                                                                        {new Date(apt.data_prevista).toLocaleDateString('pt-PT')}
                                                                                    </div>
                                                                                )}
                                                                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-gray-900" />
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Linha entre pontos (gradient) */}
                                                                {aptIdx < apts.length - 1 && (
                                                                    <div
                                                                        className="w-2.5 h-[2px] rounded-full"
                                                                        style={{
                                                                            background: `linear-gradient(90deg, ${planColor}60, ${planColor}80)`,
                                                                        }}
                                                                    />
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    {/* Linha conectora depois dos pontos (gradient) */}
                                                    {!isLastPhase && (
                                                        <div
                                                            className="w-4 h-[2px] rounded-full"
                                                            style={{
                                                                background: `linear-gradient(90deg, ${planColor}80, ${planColor}40)`,
                                                            }}
                                                        />
                                                    )}
                                                </div>
                                            )}

                                            {/* Se não tem agendamentos, linha directa entre fases */}
                                            {apts.length === 0 && !isLastPhase && (
                                                <div
                                                    className="w-10 h-[2px] mx-1.5 rounded-full"
                                                    style={{
                                                        background: `linear-gradient(90deg, ${planColor}30, ${planColor}60, ${planColor}30)`,
                                                    }}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
