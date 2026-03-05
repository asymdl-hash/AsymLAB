'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Check, X, ChevronDown, ChevronLeft, ChevronRight, Plus, Package } from 'lucide-react';
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
    onAppointmentClick?: (appointment: Tables<'appointments'>, phase: Phase) => void;
    selectedAppointmentId?: string | null;
}

// ──── Estados das fases (Mockup V5 §3.2) ────
type PhaseVisualState = 'criada' | 'em_andamento' | 'por_fechar' | 'fechada' | 'cancelada';

function getPhaseVisualState(phase: Phase): PhaseVisualState {
    if (phase.estado === 'cancelada') return 'cancelada';
    if (phase.estado === 'concluida') {
        // "Por Fechar": concluída mas nº recibos ≠ nº faturas (simplificado: verificar flag)
        // Por agora, todas as concluídas são "fechadas" — lógica de faturas será adicionada em F4
        return 'fechada';
    }
    if (phase.estado === 'em_curso') return 'em_andamento';
    return 'criada'; // pendente
}

// ──── Cores dos estados de agendamento (enum: appointment_state_type) ────
const APT_STATE_STYLES: Record<string, { bg: string; ring: string }> = {
    concluido: { bg: 'bg-emerald-500', ring: 'ring-emerald-300' },
    agendado: { bg: 'bg-blue-500', ring: 'ring-blue-300' },
    prova_entregue: { bg: 'bg-indigo-400', ring: 'ring-indigo-200' },
    colocacao_entregue: { bg: 'bg-purple-400', ring: 'ring-purple-200' },
    recolhido: { bg: 'bg-teal-400', ring: 'ring-teal-200' },
    cancelado: { bg: 'bg-red-400', ring: 'ring-red-200' },
    remarcado: { bg: 'bg-amber-400', ring: 'ring-amber-200' },
};

// ──── Componente ────
export default function PlanTimeline({ plans, onPhaseClick, onAppointmentClick, selectedAppointmentId }: PlanTimelineProps) {
    const [selectedPlanIdx, setSelectedPlanIdx] = useState(0);
    const [showPlanDropdown, setShowPlanDropdown] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollLeft, setCanScrollLeft] = useState(false);
    const [canScrollRight, setCanScrollRight] = useState(false);

    if (!plans || plans.length === 0) return null;

    const plan = plans[selectedPlanIdx] || plans[0];
    const phases = [...(plan.phases || [])].sort((a, b) => a.ordem - b.ordem);

    if (phases.length === 0) return null;

    // Progresso global
    const totalPhases = phases.length;
    const completedPhases = phases.filter(p => p.estado === 'concluida').length;
    const hasRecolhaPronta = phases.some(p =>
        p.appointments?.some(a => a.recolha_pronta && a.estado !== 'concluido')
    );

    // Encontrar próximo agendamento (primeiro agendado/não concluído)
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
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm px-5 pt-3 pb-4">

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
                                        className="h-2.5 w-2.5 rounded-full shrink-0"
                                        style={{ backgroundColor: plan.work_type?.cor || '#6b7280' }}
                                    />
                                    <span className="truncate max-w-[180px]">
                                        {plan.work_type?.nome || `Plano ${selectedPlanIdx + 1}`}
                                    </span>
                                    <ChevronDown className={cn("h-3 w-3 text-gray-400 transition-transform shrink-0", showPlanDropdown && "rotate-180")} />
                                </button>
                                {showPlanDropdown && (
                                    <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-50 min-w-[200px] py-1">
                                        {plans.map((p, i) => (
                                            <button
                                                key={p.id}
                                                onClick={() => { setSelectedPlanIdx(i); setShowPlanDropdown(false); }}
                                                className={cn(
                                                    "w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors flex items-center gap-2",
                                                    i === selectedPlanIdx ? "text-amber-600 font-semibold bg-amber-50" : "text-gray-600"
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

                    <span className="text-[10px] font-medium text-gray-500 shrink-0 tabular-nums bg-gray-100 px-2 py-0.5 rounded-full">
                        {completedPhases}/{totalPhases} fases
                    </span>
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

                                return (
                                    <div key={phase.id} className="flex items-center">
                                        {/* ── Fase (nódulo numerado) ── */}
                                        <button
                                            onClick={() => onPhaseClick?.(plan.id, phase.id)}
                                            className="flex flex-col items-center gap-1 group cursor-pointer relative"
                                            title={`${phase.nome} · ${phase.estado}`}
                                        >
                                            <div className="relative">
                                                <div className={cn(
                                                    "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300 text-xs font-bold",
                                                    // Fechada: sólido preenchido
                                                    visualState === 'fechada' && "bg-emerald-500 text-white shadow-md shadow-emerald-200",
                                                    // Em Andamento: anel/contorno
                                                    visualState === 'em_andamento' && "bg-blue-50 border-2 border-blue-500 text-blue-600",
                                                    // Por Fechar: contorno dourado
                                                    visualState === 'por_fechar' && "bg-amber-50 border-2 border-amber-500 text-amber-600",
                                                    // Criada: pontilhado
                                                    visualState === 'criada' && "bg-white border-2 border-dashed border-gray-300 text-gray-400",
                                                    // Cancelada
                                                    visualState === 'cancelada' && "bg-red-50 border-2 border-red-300 text-red-400",
                                                    "group-hover:scale-110"
                                                )}>
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
                                                    <div className="absolute -inset-[4px] rounded-full border-2 border-blue-400/40 animate-[pulse_2.5s_ease-in-out_infinite]" />
                                                )}
                                            </div>

                                            {/* Nome da fase */}
                                            <span className={cn(
                                                "text-[9px] leading-tight text-center max-w-[64px] truncate transition-colors font-medium",
                                                visualState === 'em_andamento' ? "text-blue-600 font-semibold" :
                                                    visualState === 'fechada' ? "text-emerald-600" :
                                                        "text-gray-500",
                                                "group-hover:text-gray-800"
                                            )}>
                                                {phase.nome}
                                            </span>
                                        </button>

                                        {/* ── Agendamentos (pontos entre fases) ── */}
                                        {apts.length > 0 && (
                                            <div className="flex items-center mx-1">
                                                {/* Linha conectora antes dos pontos */}
                                                <div className="w-3 h-[2px] bg-gray-200" />

                                                {apts.map((apt, aptIdx) => {
                                                    const aptStyle = APT_STATE_STYLES[apt.estado] || APT_STATE_STYLES.pendente;
                                                    const isNext = apt.id === nextAptId;
                                                    const isSelected = apt.id === selectedAppointmentId;

                                                    return (
                                                        <div key={apt.id} className="flex items-center">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    onAppointmentClick?.(apt, phase);
                                                                }}
                                                                className={cn(
                                                                    "relative transition-all duration-200 rounded-full cursor-pointer",
                                                                    isSelected
                                                                        ? "h-3.5 w-3.5 ring-2 ring-offset-1 ring-offset-white " + aptStyle.ring
                                                                        : isNext
                                                                            ? "h-3 w-3"
                                                                            : "h-2.5 w-2.5 hover:scale-125",
                                                                    aptStyle.bg
                                                                )}
                                                                title={`${apt.tipo || 'Agendamento'} · ${apt.estado}${apt.data_prevista ? ' · ' + new Date(apt.data_prevista).toLocaleDateString('pt-PT') : ''}`}
                                                            >
                                                                {/* Amber pulse para próximo agendamento */}
                                                                {isNext && !isSelected && (
                                                                    <span className="absolute -inset-[3px] rounded-full border-2 border-amber-400/60 animate-[pulse_2s_ease-in-out_infinite]" />
                                                                )}
                                                            </button>
                                                            {/* Linha entre pontos */}
                                                            {aptIdx < apts.length - 1 && (
                                                                <div className="w-2 h-[2px] bg-gray-200" />
                                                            )}
                                                        </div>
                                                    );
                                                })}

                                                {/* Linha conectora depois dos pontos */}
                                                {!isLastPhase && (
                                                    <div className="w-3 h-[2px] bg-gray-200" />
                                                )}
                                            </div>
                                        )}

                                        {/* Se não tem agendamentos, linha directa entre fases */}
                                        {apts.length === 0 && !isLastPhase && (
                                            <div className="w-8 h-[2px] bg-gray-200 mx-1" />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
