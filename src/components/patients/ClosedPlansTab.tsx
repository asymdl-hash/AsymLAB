'use client';

import { useState } from 'react';
import {
    Archive,
    Check,
    X,
    ChevronDown,
    ChevronUp,
    ClipboardList,
    Calendar,
    Stethoscope,
    Building2,
    Clock,
    Circle,
    Layers,
    AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClosedPlansTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patient: any;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PHASE_STATE_DOT: Record<string, string> = {
    pendente: 'text-gray-400',
    ativa: 'text-amber-500',
    concluida: 'text-emerald-500',
    cancelada: 'text-red-400',
};

export default function ClosedPlansTab({ patient }: ClosedPlansTabProps) {
    const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const closedPlans = (patient.treatment_plans || []).filter(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p: any) => p.estado === 'concluido' || p.estado === 'cancelado'
    );

    if (closedPlans.length === 0) {
        return (
            <div className="text-center py-16 text-gray-400">
                <Archive className="h-12 w-12 mx-auto mb-4 opacity-30" />
                <p className="text-sm font-medium text-gray-500">Sem planos fechados</p>
                <p className="text-xs mt-1.5 text-gray-400 max-w-xs mx-auto">
                    Planos concluídos ou cancelados aparecem aqui automaticamente
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <Archive className="h-4 w-4 text-gray-500" />
                    Planos Fechados
                    <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                        {closedPlans.length}
                    </span>
                </h3>
            </div>

            {/* Cards */}
            <div className="space-y-3">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {closedPlans.map((plan: any) => {
                    const isConcluido = plan.estado === 'concluido';
                    const isExpanded = expandedPlan === plan.id;
                    const planColor = plan.work_type?.cor || '#6b7280';
                    const phases = plan.phases || [];
                    const totalPhases = phases.length;
                    const completedPhases = phases.filter(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (p: any) => p.estado === 'concluida'
                    ).length;
                    const totalAppointments = phases.reduce(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (acc: number, p: any) => acc + (p.appointments?.length || 0), 0
                    );

                    return (
                        <div
                            key={plan.id}
                            className={cn(
                                "rounded-xl border overflow-hidden transition-all duration-200",
                                isConcluido
                                    ? "border-emerald-200 hover:border-emerald-300"
                                    : "border-red-200 hover:border-red-300",
                                isExpanded && "shadow-sm"
                            )}
                        >
                            {/* Card Header — clicável */}
                            <button
                                className={cn(
                                    "w-full text-left px-4 py-3.5 flex items-start gap-3 transition-colors",
                                    isConcluido
                                        ? "bg-emerald-50/60 hover:bg-emerald-50"
                                        : "bg-red-50/60 hover:bg-red-50"
                                )}
                                onClick={() => setExpandedPlan(isExpanded ? null : plan.id)}
                            >
                                {/* Borda lateral colorida simulada com ícone */}
                                <div className={cn(
                                    "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                                    isConcluido ? "bg-emerald-100" : "bg-red-100"
                                )}>
                                    {isConcluido ? (
                                        <Check className="h-4.5 w-4.5 text-emerald-600" />
                                    ) : (
                                        <X className="h-4.5 w-4.5 text-red-500" />
                                    )}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h4 className="font-semibold text-sm text-gray-900 truncate">
                                            {plan.nome}
                                        </h4>
                                        <span className={cn(
                                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                                            isConcluido
                                                ? "bg-emerald-100 text-emerald-700"
                                                : "bg-red-100 text-red-700"
                                        )}>
                                            {isConcluido ? 'Concluído' : 'Cancelado'}
                                        </span>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center gap-3 mt-1 flex-wrap text-[11px] text-gray-500">
                                        {plan.work_type?.nome && (
                                            <span className="flex items-center gap-1">
                                                <ClipboardList className="h-3 w-3" />
                                                {plan.work_type.nome}
                                            </span>
                                        )}
                                        {plan.medico?.full_name && (
                                            <span className="flex items-center gap-1">
                                                <Stethoscope className="h-3 w-3" />
                                                {plan.medico.full_name}
                                            </span>
                                        )}
                                        {plan.clinica?.commercial_name && (
                                            <span className="flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />
                                                {plan.clinica.commercial_name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer stats */}
                                    <div className="flex items-center gap-3 mt-1.5 text-[10px] text-gray-400">
                                        <span>{totalPhases} fases</span>
                                        <span>·</span>
                                        <span>{totalAppointments} agendamentos</span>
                                        {plan.data_conclusao && (
                                            <>
                                                <span>·</span>
                                                <span className="flex items-center gap-0.5">
                                                    <Clock className="h-2.5 w-2.5" />
                                                    {new Date(plan.data_conclusao).toLocaleDateString('pt-PT', {
                                                        day: '2-digit', month: 'short', year: 'numeric'
                                                    })}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                {/* Expand icon */}
                                <div className="shrink-0 self-center">
                                    {isExpanded ? (
                                        <ChevronUp className="h-4 w-4 text-gray-400" />
                                    ) : (
                                        <ChevronDown className="h-4 w-4 text-gray-400" />
                                    )}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isExpanded && (
                                <div className="border-t border-gray-100 bg-white px-4 py-4 space-y-4">
                                    {/* Info grid */}
                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                        <div>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Criado em</span>
                                            <span className="text-xs text-gray-700 font-medium mt-0.5 block">
                                                {plan.created_at ? new Date(plan.created_at).toLocaleDateString('pt-PT', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                                }) : '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                                                {isConcluido ? 'Concluído em' : 'Cancelado em'}
                                            </span>
                                            <span className="text-xs text-gray-700 font-medium mt-0.5 block">
                                                {plan.data_conclusao ? new Date(plan.data_conclusao).toLocaleDateString('pt-PT', {
                                                    day: '2-digit', month: '2-digit', year: 'numeric'
                                                }) : '—'}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Progresso</span>
                                            <span className="text-xs text-gray-700 font-medium mt-0.5 block">
                                                {completedPhases}/{totalPhases} fases
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">Agendamentos</span>
                                            <span className="text-xs text-gray-700 font-medium mt-0.5 block">
                                                {totalAppointments} total
                                            </span>
                                        </div>
                                    </div>

                                    {/* Motivo de cancelamento */}
                                    {!isConcluido && plan.motivo_cancelamento && (
                                        <div className="bg-red-50 rounded-lg px-3 py-2.5 flex items-start gap-2">
                                            <AlertTriangle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                                            <div>
                                                <span className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Motivo do cancelamento</span>
                                                <p className="text-xs text-red-700 mt-0.5">{plan.motivo_cancelamento}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Barra de progresso */}
                                    {totalPhases > 0 && (
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <span className="text-[10px] text-gray-400 font-medium">Progresso do plano</span>
                                                <span className="text-[10px] font-semibold" style={{ color: isConcluido ? '#059669' : planColor }}>
                                                    {totalPhases > 0 ? Math.round((completedPhases / totalPhases) * 100) : 0}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-500"
                                                    style={{
                                                        width: `${totalPhases > 0 ? (completedPhases / totalPhases) * 100 : 0}%`,
                                                        backgroundColor: isConcluido ? '#059669' : '#ef4444',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* Lista de fases */}
                                    {phases.length > 0 && (
                                        <div>
                                            <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                                                <Layers className="h-3 w-3" />
                                                Fases ({phases.length})
                                            </span>
                                            <div className="space-y-1">
                                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                                {phases.sort((a: any, b: any) => a.ordem - b.ordem).map((phase: any) => {
                                                    const dotColor = PHASE_STATE_DOT[phase.estado] || PHASE_STATE_DOT.pendente;
                                                    const appointmentCount = phase.appointments?.length || 0;

                                                    return (
                                                        <div
                                                            key={phase.id}
                                                            className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg bg-gray-50 text-xs"
                                                        >
                                                            <Circle className={cn("h-2.5 w-2.5 fill-current shrink-0", dotColor)} />
                                                            <span className="flex-1 text-gray-700 truncate">{phase.nome}</span>
                                                            <span className="text-[10px] text-gray-400 capitalize">{phase.estado}</span>
                                                            {appointmentCount > 0 && (
                                                                <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                                                                    <Calendar className="h-2.5 w-2.5" />
                                                                    {appointmentCount}
                                                                </span>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
