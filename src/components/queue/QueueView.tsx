'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, Filter, X, RefreshCw, ListTodo, CheckCircle, AlertCircle } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import {
    queueService,
    QueueItem,
    QueueFilters,
    DEFAULT_QUEUE_FILTERS,
    QUEUE_COLUMNS,
} from '@/services/queueService';
import { patientsService } from '@/services/patientsService';
import QueueColumn from './QueueColumn';

// Estados que requerem motivo
const NEEDS_REASON: Record<string, { label: string; placeholder: string; showTipo?: boolean }> = {
    pausado: { label: 'Motivo da Pausa', placeholder: 'Porque está a pausar este plano?' },
    cancelado: { label: 'Motivo do Cancelamento', placeholder: 'Porque está a cancelar este plano?' },
    reaberto: { label: 'Motivo da Reabertura', placeholder: 'Porque está a reabrir este plano?', showTipo: true },
};

const ESTADO_LABELS: Record<string, string> = {
    activo: 'Activo',
    pausado: 'Pausado',
    reaberto: 'Reaberto',
    concluido: 'Concluído',
};

export default function QueueView() {
    const [items, setItems] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState<QueueFilters>(DEFAULT_QUEUE_FILTERS);
    const [showFilters, setShowFilters] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const { user } = useAuth();

    // Opções para dropdowns
    const [clinics, setClinics] = useState<{ id: string; name: string }[]>([]);
    const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);
    const [workTypes, setWorkTypes] = useState<{ id: string; name: string }[]>([]);

    // Modal de motivo (para drag & drop)
    const [reasonModal, setReasonModal] = useState<{
        planId: string;
        toEstado: string;
        motivo: string;
        tipoReopen: string;
    } | null>(null);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Auto-dismiss toast
    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    // Carregar filtros guardados
    useEffect(() => {
        if (user?.id) {
            const saved = queueService.loadFilters(user.id);
            setFilters(saved);
        }
    }, [user?.id]);

    // Carregar dados
    const loadData = useCallback(async () => {
        try {
            const [queueData, clinicsData, doctorsData, workTypesData] = await Promise.all([
                queueService.getQueueItems(),
                patientsService.getClinics(),
                patientsService.getDoctors(),
                patientsService.getWorkTypes(),
            ]);
            setItems(queueData);
            setClinics((clinicsData || []).map((c: any) => ({ id: c.id, name: c.commercial_name })));
            setDoctors((doctorsData || []).map((d: any) => ({ id: d.user_id, name: d.full_name })));
            setWorkTypes((workTypesData || []).map((w: any) => ({ id: w.id, name: w.nome })));
        } catch (error) {
            console.error('Erro ao carregar fila:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // Refresh manual
    const handleRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    // Actualizar filtro e guardar
    const updateFilter = (key: keyof QueueFilters, value: any) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        if (user?.id) {
            queueService.saveFilters(user.id, newFilters);
        }
    };

    // Reset filtros
    const resetFilters = () => {
        setFilters({ ...DEFAULT_QUEUE_FILTERS });
        if (user?.id) {
            queueService.saveFilters(user.id, DEFAULT_QUEUE_FILTERS);
        }
    };

    // ====== DRAG & DROP HANDLER ======
    const handleDrop = (planId: string, fromEstado: string, toEstado: string) => {
        if (fromEstado === toEstado) return;

        // Se precisa de motivo, mostrar modal
        if (NEEDS_REASON[toEstado]) {
            setReasonModal({ planId, toEstado, motivo: '', tipoReopen: 'correcao' });
            return;
        }

        // Transição directa (activo, concluído)
        executeDrop(planId, toEstado);
    };

    const executeDrop = async (planId: string, toEstado: string, motivo?: string, tipoReopen?: string) => {
        // Optimistic update: mover card imediatamente na UI
        setItems(prev => prev.map(item =>
            item.id === planId ? { ...item, estado: toEstado } : item
        ));

        try {
            await queueService.updatePlanEstado(planId, toEstado, motivo, tipoReopen);
            setToast({ message: `Plano movido para ${ESTADO_LABELS[toEstado] || toEstado}`, type: 'success' });
        } catch {
            // Reverter optimistic update
            loadData();
            setToast({ message: 'Erro ao actualizar estado do plano', type: 'error' });
        }
    };

    const handleReasonSubmit = () => {
        if (!reasonModal) return;
        const { planId, toEstado, motivo, tipoReopen } = reasonModal;
        if (!motivo.trim()) return;
        executeDrop(planId, toEstado, motivo, toEstado === 'reaberto' ? tipoReopen : undefined);
        setReasonModal(null);
    };

    const hasActiveFilters = filters.search || filters.clinica_id || filters.medico_id || filters.tipo_trabalho_id || filters.urgente !== null;

    // Filtrar e agrupar
    const filteredItems = useMemo(() => queueService.filterItems(items, filters), [items, filters]);
    const grouped = useMemo(() => queueService.groupByEstado(filteredItems), [filteredItems]);
    const totalActive = useMemo(() => items.filter(i => i.estado !== 'concluido').length, [items]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-white">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">A carregar fila de pedidos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-white">
            {/* ====== TOAST ====== */}
            {toast && (
                <div className={cn(
                    "fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium animate-in slide-in-from-top-2",
                    toast.type === 'success'
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-red-50 text-red-700 border border-red-200"
                )}>
                    {toast.type === 'success'
                        ? <CheckCircle className="h-4 w-4" />
                        : <AlertCircle className="h-4 w-4" />
                    }
                    {toast.message}
                </div>
            )}

            {/* ====== REASON MODAL ====== */}
            {reasonModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                            {NEEDS_REASON[reasonModal.toEstado]?.label}
                        </h3>
                        <p className="text-xs text-gray-500 mb-4">
                            A mover para <strong>{ESTADO_LABELS[reasonModal.toEstado]}</strong>
                        </p>

                        {/* Tipo de reabertura */}
                        {NEEDS_REASON[reasonModal.toEstado]?.showTipo && (
                            <div className="mb-3">
                                <label className="text-xs text-gray-500 mb-1 block">Tipo de Reabertura</label>
                                <select
                                    className="w-full h-9 rounded-lg border border-gray-300 px-3 text-sm"
                                    value={reasonModal.tipoReopen}
                                    onChange={e => setReasonModal({ ...reasonModal, tipoReopen: e.target.value })}
                                >
                                    <option value="correcao">Correcção</option>
                                    <option value="remake">Remake</option>
                                </select>
                            </div>
                        )}

                        {/* Motivo */}
                        <textarea
                            className="w-full h-24 rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400"
                            placeholder={NEEDS_REASON[reasonModal.toEstado]?.placeholder}
                            value={reasonModal.motivo}
                            onChange={e => setReasonModal({ ...reasonModal, motivo: e.target.value })}
                            autoFocus
                        />

                        <div className="flex items-center gap-2 mt-4 justify-end">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReasonModal(null)}
                            >
                                Cancelar
                            </Button>
                            <Button
                                size="sm"
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                disabled={!reasonModal.motivo.trim()}
                                onClick={handleReasonSubmit}
                            >
                                Confirmar
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ====== HEADER ====== */}
            <div className="px-6 py-4 border-b border-gray-200 bg-white">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
                            <ListTodo className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold text-gray-900">Fila de Pedidos</h1>
                            <p className="text-xs text-gray-500">
                                {totalActive} pedido{totalActive !== 1 ? 's' : ''} activo{totalActive !== 1 ? 's' : ''}
                                {hasActiveFilters && ` · ${filteredItems.length} visíveis`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            variant="ghost"
                            className={cn(
                                "h-8 gap-1.5 text-xs",
                                showFilters ? "text-blue-600 bg-blue-50" : "text-gray-500 hover:text-gray-700"
                            )}
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filtros
                            {hasActiveFilters && (
                                <span className="ml-1 w-4 h-4 rounded-full bg-blue-600 text-white text-[9px] flex items-center justify-center font-bold">
                                    !
                                </span>
                            )}
                        </Button>
                        <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-gray-400 hover:text-gray-600"
                            onClick={handleRefresh}
                            disabled={refreshing}
                        >
                            <RefreshCw className={cn("h-4 w-4", refreshing && "animate-spin")} />
                        </Button>
                    </div>
                </div>

                {/* Contadores por estado */}
                <div className="flex items-center gap-3">
                    {QUEUE_COLUMNS.map(col => (
                        <div key={col.key} className="flex items-center gap-1.5">
                            <span className="text-xs">{col.icon}</span>
                            <span className="text-xs font-medium text-gray-600">
                                {grouped[col.key]?.length || 0}
                            </span>
                        </div>
                    ))}
                </div>

                {/* ====== FILTROS ====== */}
                {showFilters && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
                        {/* Pesquisa */}
                        <div className="relative flex-1 min-w-[200px] max-w-[300px]">
                            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                            <Input
                                placeholder="Pesquisar paciente, T-ID, plano..."
                                className="pl-8 h-8 text-xs bg-gray-50 border-gray-200"
                                value={filters.search}
                                onChange={(e) => updateFilter('search', e.target.value)}
                            />
                        </div>

                        {/* Clínica */}
                        <select
                            className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.clinica_id || ''}
                            onChange={(e) => updateFilter('clinica_id', e.target.value || null)}
                        >
                            <option value="">Todas as Clínicas</option>
                            {clinics.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>

                        {/* Médico */}
                        <select
                            className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.medico_id || ''}
                            onChange={(e) => updateFilter('medico_id', e.target.value || null)}
                        >
                            <option value="">Todos os Médicos</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.name}</option>)}
                        </select>

                        {/* Tipo Trabalho */}
                        <select
                            className="h-8 text-xs border border-gray-200 rounded-md px-2 bg-gray-50 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={filters.tipo_trabalho_id || ''}
                            onChange={(e) => updateFilter('tipo_trabalho_id', e.target.value || null)}
                        >
                            <option value="">Todos os Tipos</option>
                            {workTypes.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                        </select>

                        {/* Urgente toggle */}
                        <button
                            className={cn(
                                "h-8 px-3 text-xs rounded-md border transition-colors font-medium",
                                filters.urgente === true
                                    ? "bg-amber-50 border-amber-300 text-amber-700"
                                    : "bg-gray-50 border-gray-200 text-gray-500 hover:bg-amber-50 hover:text-amber-700"
                            )}
                            onClick={() => updateFilter('urgente', filters.urgente === true ? null : true)}
                        >
                            ⚡ Urgentes
                        </button>

                        {/* Reset */}
                        {hasActiveFilters && (
                            <button
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                                onClick={resetFilters}
                            >
                                <X className="h-3 w-3" />
                                Limpar
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* ====== KANBAN BOARD ====== */}
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-4">
                <div className="flex gap-4 h-full min-w-max">
                    {QUEUE_COLUMNS.map(col => (
                        <QueueColumn
                            key={col.key}
                            title={col.label}
                            color={col.color}
                            icon={col.icon}
                            columnKey={col.key}
                            items={grouped[col.key] || []}
                            onDrop={handleDrop}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
