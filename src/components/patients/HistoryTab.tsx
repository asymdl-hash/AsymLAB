'use client';

import { useState, useMemo, useEffect } from 'react';
import {
    History,
    ClipboardList,
    Layers,
    Calendar,
    MessageSquare,
    File,
    Clock,
    User,
    Search,
    Loader2,
    RefreshCw,
    AlertCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

interface HistoryTabProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    patient: any;
}

interface HistoryEvent {
    id: string;
    tipo: string;
    acao: string;
    descricao: string;
    data: string;
    autor?: string;
    source: 'derived' | 'activity_log';
}

const TIPO_CONFIG: Record<string, { icon: typeof ClipboardList; color: string; bg: string; label: string }> = {
    plano: { icon: ClipboardList, color: 'text-blue-500', bg: 'bg-blue-50', label: 'Planos' },
    fase: { icon: Layers, color: 'text-purple-500', bg: 'bg-purple-50', label: 'Fases' },
    agendamento: { icon: Calendar, color: 'text-green-500', bg: 'bg-green-50', label: 'Agendamentos' },
    consideracao: { icon: MessageSquare, color: 'text-orange-500', bg: 'bg-orange-50', label: 'Considerações' },
    ficheiro: { icon: File, color: 'text-gray-500', bg: 'bg-gray-100', label: 'Ficheiros' },
    chat: { icon: MessageSquare, color: 'text-sky-500', bg: 'bg-sky-50', label: 'Chat' },
    sistema: { icon: AlertCircle, color: 'text-slate-500', bg: 'bg-slate-50', label: 'Sistema' },
};

const FILTER_TIPOS = ['', 'plano', 'fase', 'agendamento', 'consideracao', 'chat', 'sistema'];

export default function HistoryTab({ patient }: HistoryTabProps) {
    const [filterTipo, setFilterTipo] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activityLogs, setActivityLogs] = useState<HistoryEvent[]>([]);
    const [loadingLogs, setLoadingLogs] = useState(false);
    const [visibleCount, setVisibleCount] = useState(50);

    // Carregar activity_log do Supabase
    useEffect(() => {
        if (!patient?.id) return;

        const fetchActivityLogs = async () => {
            setLoadingLogs(true);
            try {
                const { data, error } = await supabase
                    .from('activity_log')
                    .select('id, action, category, description, created_at, user_id')
                    .eq('patient_id', patient.id)
                    .order('created_at', { ascending: false })
                    .limit(200);

                if (error) {
                    console.error('Erro ao carregar activity_log:', error);
                    return;
                }

                if (data && data.length > 0) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const mapped: HistoryEvent[] = data.map((log: any) => {
                        const tipoMap: Record<string, string> = {
                            patient: 'sistema',
                            plan: 'plano',
                            phase: 'fase',
                            appointment: 'agendamento',
                            consideration: 'consideracao',
                            file: 'ficheiro',
                            chat: 'chat',
                            milling: 'sistema',
                            teeth: 'sistema',
                            component: 'sistema',
                            guide: 'sistema',
                            invoice: 'sistema',
                            badge: 'sistema',
                            status: 'sistema',
                        };

                        return {
                            id: `log-${log.id}`,
                            tipo: tipoMap[log.category] || 'sistema',
                            acao: log.action || 'Registo',
                            descricao: log.description || `${log.category}: ${log.action}`,
                            data: log.created_at,
                            source: 'activity_log' as const,
                        };
                    });
                    setActivityLogs(mapped);
                }
            } catch (err) {
                console.error('Erro ao carregar activity_log:', err);
            } finally {
                setLoadingLogs(false);
            }
        };

        fetchActivityLogs();
    }, [patient?.id]);

    // Gerar timeline a partir dos dados existentes (derivados)
    const derivedEvents = useMemo(() => {
        const items: HistoryEvent[] = [];

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (patient.treatment_plans || []).forEach((plan: any) => {
            items.push({
                id: `plan-created-${plan.id}`,
                tipo: 'plano',
                acao: 'Criação',
                descricao: `Plano "${plan.nome}" criado`,
                data: plan.created_at,
                source: 'derived',
            });

            if (plan.data_conclusao) {
                items.push({
                    id: `plan-done-${plan.id}`,
                    tipo: 'plano',
                    acao: plan.estado === 'cancelado' ? 'Cancelamento' : 'Conclusão',
                    descricao: `Plano "${plan.nome}" ${plan.estado === 'cancelado' ? 'cancelado' : 'concluído'}`,
                    data: plan.data_conclusao,
                    source: 'derived',
                });
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (plan.phases || []).forEach((phase: any) => {
                items.push({
                    id: `phase-created-${phase.id}`,
                    tipo: 'fase',
                    acao: 'Criação',
                    descricao: `Fase "${phase.nome}" em "${plan.nome}"`,
                    data: phase.created_at,
                    source: 'derived',
                });

                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (phase.appointments || []).forEach((appt: any) => {
                    items.push({
                        id: `appt-created-${appt.id}`,
                        tipo: 'agendamento',
                        acao: 'Criação',
                        descricao: `Agendamento (${appt.tipo}) em "${phase.nome}"`,
                        data: appt.created_at,
                        source: 'derived',
                    });
                });
            });
        });

        return items;
    }, [patient]);

    // Combinar ambas as fontes, deduplicar e ordenar
    const allEvents = useMemo(() => {
        // Se activity_log tem dados, priorizar esses
        // Deduplicar: se um evento derivado tem um equivalente no activity_log, manter o activity_log
        const logIds = new Set(activityLogs.map(e => e.id));
        const combined = [...activityLogs];

        // Adicionar eventos derivados que não existem no activity_log
        derivedEvents.forEach(event => {
            if (!logIds.has(event.id)) {
                combined.push(event);
            }
        });

        // Ordenar por data (mais recente primeiro)
        combined.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
        return combined;
    }, [derivedEvents, activityLogs]);

    // Aplicar filtros
    const filteredEvents = useMemo(() => {
        let filtered = allEvents;

        if (filterTipo) {
            filtered = filtered.filter(e => e.tipo === filterTipo);
        }

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(e =>
                e.descricao.toLowerCase().includes(q) ||
                e.acao.toLowerCase().includes(q) ||
                (e.autor && e.autor.toLowerCase().includes(q))
            );
        }

        return filtered;
    }, [allEvents, filterTipo, searchQuery]);

    const visibleEvents = filteredEvents.slice(0, visibleCount);
    const hasMore = filteredEvents.length > visibleCount;

    // Contadores por tipo
    const countsByType = useMemo(() => {
        const counts: Record<string, number> = {};
        allEvents.forEach(e => {
            counts[e.tipo] = (counts[e.tipo] || 0) + 1;
        });
        return counts;
    }, [allEvents]);

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-gray-800 flex items-center gap-2">
                    <History className="h-4 w-4 text-gray-500" />
                    Histórico
                    {allEvents.length > 0 && (
                        <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5 font-medium">
                            {allEvents.length}
                        </span>
                    )}
                    {loadingLogs && (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    )}
                </h3>

                {/* Pesquisa */}
                <div className="relative w-full sm:w-56">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Pesquisar no histórico..."
                        className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400/40 focus:bg-white"
                    />
                </div>
            </div>

            {/* Filtros por tipo */}
            <div className="flex gap-1.5 flex-wrap">
                {FILTER_TIPOS.map(tipo => {
                    const active = filterTipo === tipo;
                    const config = tipo ? TIPO_CONFIG[tipo] : null;
                    const label = tipo === '' ? 'Tudo' : config?.label || tipo;
                    const count = tipo === '' ? allEvents.length : (countsByType[tipo] || 0);

                    return (
                        <button
                            key={tipo || 'all'}
                            onClick={() => setFilterTipo(tipo)}
                            className={`text-[10px] px-2.5 py-1 rounded-full transition-colors font-medium flex items-center gap-1
                                ${active
                                    ? 'bg-gray-800 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {label}
                            {count > 0 && (
                                <span className={cn(
                                    "text-[9px] px-1 py-0 rounded-full",
                                    active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-500"
                                )}>
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Timeline */}
            {filteredEvents.length === 0 ? (
                <div className="text-center py-16 text-gray-400">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-30" />
                    <p className="text-sm font-medium text-gray-500">
                        {searchQuery ? 'Sem resultados' : 'Sem histórico'}
                    </p>
                    <p className="text-xs mt-1.5 text-gray-400 max-w-xs mx-auto">
                        {searchQuery
                            ? `Nenhum evento encontrado para "${searchQuery}"`
                            : 'O histórico aparece à medida que cria planos, fases e agendamentos'
                        }
                    </p>
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-3 text-xs text-amber-600 hover:text-amber-700 font-medium"
                        >
                            Limpar pesquisa
                        </button>
                    )}
                </div>
            ) : (
                <div className="relative">
                    {/* Vertical line */}
                    <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gray-200" />

                    <div className="space-y-0">
                        {visibleEvents.map((event, idx) => {
                            const config = TIPO_CONFIG[event.tipo] || TIPO_CONFIG.sistema;
                            const Icon = config.icon;
                            const isFirst = idx === 0;

                            return (
                                <div key={event.id} className="flex gap-3 py-2.5 relative group">
                                    {/* Icon */}
                                    <div className={`relative z-10 flex-shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center ${config.bg} ring-2 ring-white`}>
                                        <Icon className={`h-3.5 w-3.5 ${config.color}`} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className={`text-[10px] font-semibold uppercase tracking-wide ${config.color}`}>
                                                {event.acao}
                                            </span>
                                            {isFirst && (
                                                <span className="text-[10px] bg-emerald-100 text-emerald-700 rounded-full px-1.5 py-0.5 font-medium">
                                                    Último
                                                </span>
                                            )}
                                            {event.source === 'activity_log' && (
                                                <span className="text-[9px] bg-blue-50 text-blue-500 rounded px-1 py-0 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                                                    log
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

                    {/* Carregar mais */}
                    {hasMore && (
                        <div className="text-center pt-4">
                            <button
                                onClick={() => setVisibleCount(prev => prev + 50)}
                                className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1.5 mx-auto px-4 py-2 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors"
                            >
                                <RefreshCw className="h-3 w-3" />
                                Carregar mais ({filteredEvents.length - visibleCount} restantes)
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function formatDateTime(dateString: string): string {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHrs = diffMs / 3600000;

    if (diffHrs < 24 && diffHrs >= 0) {
        return `Hoje, ${date.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}`;
    }
    if (diffHrs < 48 && diffHrs >= 24) {
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
