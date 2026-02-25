'use client';

import { useState, useMemo } from 'react';
import {
    History,
    ClipboardList,
    Layers,
    Calendar,
    MessageSquare,
    File,
    Clock,
    User,
    ArrowRight,
} from 'lucide-react';

interface HistoryTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patient: any;
}

interface HistoryEvent {
    id: string;
    tipo: 'plano' | 'fase' | 'agendamento' | 'consideracao' | 'ficheiro';
    acao: string;
    descricao: string;
    data: string;
    autor?: string;
    icon: typeof ClipboardList;
    color: string;
}

const TIPO_CONFIG = {
    plano: { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50' },
    fase: { icon: Layers, color: 'text-purple-500', bg: 'bg-purple-50' },
    agendamento: { icon: Calendar, color: 'text-green-500', bg: 'bg-green-50' },
    consideracao: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50' },
    ficheiro: { icon: File, color: 'text-gray-500', bg: 'bg-gray-100' },
};

export default function HistoryTab({ patient }: HistoryTabProps) {
    const [filterTipo, setFilterTipo] = useState('');

    // Gerar timeline a partir dos dados existentes
    const events = useMemo(() => {
        const items: HistoryEvent[] = [];

        // Planos
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (patient.treatment_plans || []).forEach((plan: any) => {
            items.push({
                id: `plan-${plan.id}`,
                tipo: 'plano',
                acao: 'Criação',
                descricao: `Plano "${plan.nome}" criado`,
                data: plan.created_at,
                icon: TIPO_CONFIG.plano.icon,
                color: TIPO_CONFIG.plano.color,
            });

            if (plan.data_conclusao) {
                items.push({
                    id: `plan-done-${plan.id}`,
                    tipo: 'plano',
                    acao: 'Conclusão',
                    descricao: `Plano "${plan.nome}" concluído`,
                    data: plan.data_conclusao,
                    icon: TIPO_CONFIG.plano.icon,
                    color: TIPO_CONFIG.plano.color,
                });
            }

            // Fases
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (plan.phases || []).forEach((phase: any) => {
                items.push({
                    id: `phase-${phase.id}`,
                    tipo: 'fase',
                    acao: 'Criação',
                    descricao: `Fase "${phase.nome}" em "${plan.nome}"`,
                    data: phase.created_at,
                    icon: TIPO_CONFIG.fase.icon,
                    color: TIPO_CONFIG.fase.color,
                });

                // Agendamentos
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (phase.appointments || []).forEach((appt: any) => {
                    items.push({
                        id: `appt-${appt.id}`,
                        tipo: 'agendamento',
                        acao: 'Criação',
                        descricao: `Agendamento (${appt.tipo}) em "${phase.nome}"`,
                        data: appt.created_at,
                        icon: TIPO_CONFIG.agendamento.icon,
                        color: TIPO_CONFIG.agendamento.color,
                    });
                });
            });
        });

        // Ordenar por data (mais recente primeiro)
        items.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        return items;
    }, [patient]);

    const filteredEvents = filterTipo
        ? events.filter(e => e.tipo === filterTipo)
        : events;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-500" />
                    Histórico
                    {events.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                            {events.length}
                        </span>
                    )}
                </h3>
                <div className="flex gap-1.5">
                    {['', 'plano', 'fase', 'agendamento'].map(tipo => {
                        const active = filterTipo === tipo;
                        const label = tipo === '' ? 'Tudo' : tipo.charAt(0).toUpperCase() + tipo.slice(1) + 's';
                        return (
                            <button key={tipo} onClick={() => setFilterTipo(tipo)}
                                className={`text-[10px] px-2 py-1 rounded-full transition-colors font-medium
                                    ${active ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                                {label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Timeline */}
            {filteredEvents.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <History className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Sem histórico</p>
                    <p className="text-xs mt-1">O histórico aparece à medida que cria planos, fases e agendamentos</p>
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

                    <div className="space-y-0">
                        {filteredEvents.map((event, idx) => {
                            const Icon = event.icon;
                            const config = TIPO_CONFIG[event.tipo];
                            const isFirst = idx === 0;

                            return (
                                <div key={event.id} className="flex gap-3 py-2.5 relative">
                                    {/* Icon */}
                                    <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${config.bg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${config.color}`}>
                                                {event.acao}
                                            </span>
                                            {isFirst && (
                                                <span className="text-[10px] bg-green-100 text-green-700 rounded-full px-1.5 py-0.5 font-medium">
                                                    Último
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-700 mt-0.5">{event.descricao}</p>
                                        <div className="flex items-center gap-2 mt-1 text-[10px] text-gray-400">
                                            <Clock className="h-3 w-3" />
                                            <span>{formatDateTime(event.data)}</span>
                                            {event.autor && (
                                                <>
                                                    <User className="h-3 w-3 ml-1" />
                                                    <span>{event.autor}</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / 3600000;

    if (diffHrs < 24) {
        return `Hoje, ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffHrs < 48) {
        return `Ontem, ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleString('pt-PT', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
}
