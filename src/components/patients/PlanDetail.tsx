'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    Plus,
    Calendar,
    CheckCircle2,
    Circle,
    Clock,
    MoreVertical,
    ChevronRight,
    ChevronUp,
    ChevronDown,
    AlertTriangle,
    XCircle,
    Pause,
    RotateCcw,
    X,
} from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import NewPhaseModal from './NewPhaseModal';
import NewAppointmentModal from './NewAppointmentModal';

// === Config de estados ===
const PLAN_STATE_CONFIG: Record<string, { label: string; color: string; bg: string; darkColor: string; darkBg: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-yellow-700', bg: 'bg-yellow-100', darkColor: 'text-yellow-400', darkBg: 'bg-yellow-900/30' },
    activo: { label: 'Activo', color: 'text-green-700', bg: 'bg-green-100', darkColor: 'text-green-400', darkBg: 'bg-green-900/30' },
    pausado: { label: 'Pausado', color: 'text-orange-700', bg: 'bg-orange-100', darkColor: 'text-orange-400', darkBg: 'bg-orange-900/30' },
    concluido: { label: 'Concluído', color: 'text-blue-700', bg: 'bg-blue-100', darkColor: 'text-blue-400', darkBg: 'bg-blue-900/30' },
    cancelado: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100', darkColor: 'text-red-400', darkBg: 'bg-red-900/30' },
    reaberto: { label: 'Reaberto', color: 'text-purple-700', bg: 'bg-purple-100', darkColor: 'text-purple-400', darkBg: 'bg-purple-900/30' },
};

const PHASE_STATE_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
    pendente: { label: 'Pendente', icon: Circle, color: 'text-gray-400' },
    em_curso: { label: 'Em Curso', icon: Clock, color: 'text-amber-500' },
    concluida: { label: 'Concluída', icon: CheckCircle2, color: 'text-green-500' },
    cancelada: { label: 'Cancelada', icon: XCircle, color: 'text-red-400' },
};

const APPOINTMENT_TYPE_CONFIG: Record<string, { label: string; emoji: string }> = {
    moldagem: { label: 'Moldagem', emoji: '🟤' },
    para_prova: { label: 'Prova', emoji: '🔵' },
    para_colocacao: { label: 'Colocação', emoji: '🟣' },
    reparacao: { label: 'Reparação', emoji: '🔧' },
    ajuste: { label: 'Ajuste', emoji: '⚙️' },
    outro: { label: 'Outro', emoji: '📅' },
};

const APPOINTMENT_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    agendado: { label: 'Agendado', color: 'text-blue-700', bg: 'bg-blue-100' },
    prova_entregue: { label: 'Prova Entregue', color: 'text-indigo-700', bg: 'bg-indigo-100' },
    colocacao_entregue: { label: 'Colocação Entregue', color: 'text-purple-700', bg: 'bg-purple-100' },
    recolhido: { label: 'Recolhido', color: 'text-teal-700', bg: 'bg-teal-100' },
    concluido: { label: 'Concluído', color: 'text-green-700', bg: 'bg-green-100' },
    cancelado: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
    remarcado: { label: 'Remarcado', color: 'text-orange-700', bg: 'bg-orange-100' },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface PlanDetailProps { plan: any; patientId: string; onReload: () => void; }

export default function PlanDetail({ plan, patientId, onReload }: PlanDetailProps) {
    const router = useRouter();
    const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(
        plan.phases?.sort((a: { ordem: number }, b: { ordem: number }) => a.ordem - b.ordem)[0]?.id || null
    );
    const [showPhaseModal, setShowPhaseModal] = useState(false);
    const [showAppointmentModal, setShowAppointmentModal] = useState(false);
    const [showActionsMenu, setShowActionsMenu] = useState(false);
    const [changingState, setChangingState] = useState(false);
    const [reordering, setReordering] = useState(false);
    const [reasonModal, setReasonModal] = useState<{ action: 'pausar' | 'cancelar' | 'reabrir'; planId: string } | null>(null);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sortedPhases = [...(plan.phases || [])].sort((a: any, b: any) => a.ordem - b.ordem);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedPhase = sortedPhases.find((p: any) => p.id === selectedPhaseId) || null;

    const planState = PLAN_STATE_CONFIG[plan.estado] || PLAN_STATE_CONFIG.rascunho;

    const handleStateChange = useCallback(async (newState: string, extra?: Record<string, unknown>) => {
        try {
            setChangingState(true);
            if (extra) {
                await patientsService.updateRecord('treatment_plans', plan.id, { estado: newState, ...extra });
            } else {
                await patientsService.updatePlanState(plan.id, newState);
            }
            setShowActionsMenu(false);
            onReload();
        } catch (err) {
            console.error('Error changing state:', err);
        } finally {
            setChangingState(false);
        }
    }, [plan.id, onReload]);

    const handleReasonSubmit = useCallback(async (reason: string, reopenType?: string) => {
        if (!reasonModal) return;
        const { action } = reasonModal;
        if (action === 'pausar') {
            await handleStateChange('pausado', { motivo_pausa: reason });
        } else if (action === 'cancelar') {
            await handleStateChange('cancelado', { motivo_cancelamento: reason });
        } else if (action === 'reabrir') {
            await handleStateChange('reaberto', { tipo_reopen: reopenType || 'correcao' });
        }
        setReasonModal(null);
    }, [reasonModal, handleStateChange]);

    const handlePhaseStateChange = useCallback(async (phaseId: string, newState: string) => {
        try {
            await patientsService.updateRecord('phases', phaseId, { estado: newState });
            onReload();
        } catch (err) {
            console.error('Error changing phase state:', err);
        }
    }, [onReload]);

    const handleAppointmentStateChange = useCallback(async (appointmentId: string, newState: string) => {
        try {
            await patientsService.updateRecord('appointments', appointmentId, { estado: newState });
            onReload();
        } catch (err) {
            console.error('Error changing appointment state:', err);
        }
    }, [onReload]);

    const handleSwapPhase = useCallback(async (index: number, direction: 'up' | 'down') => {
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= sortedPhases.length) return;
        try {
            setReordering(true);
            await patientsService.swapPhaseOrder(
                { id: sortedPhases[index].id, ordem: sortedPhases[index].ordem },
                { id: sortedPhases[targetIndex].id, ordem: sortedPhases[targetIndex].ordem }
            );
            onReload();
        } catch (err) {
            console.error('Error reordering phases:', err);
        } finally {
            setReordering(false);
        }
    }, [sortedPhases, onReload]);

    const completedPhases = sortedPhases.filter((p: { estado: string }) => p.estado === 'concluida').length;
    const totalPhases = sortedPhases.length;

    return (
        <div className="h-full flex flex-col bg-gray-900 text-white overflow-hidden">
            {/* === HEADER === */}
            <div className="p-4 md:p-6 border-b border-gray-700 bg-gray-800/50 flex-shrink-0">
                <div className="flex items-center gap-3 mb-2">
                    <button
                        onClick={() => router.push(`/dashboard/patients/${patientId}`)}
                        className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-400">
                        {plan.patient?.t_id} {plan.patient?.nome}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500" />
                    <h1 className="text-lg font-bold truncate">{plan.nome}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-9">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${planState.darkBg} ${planState.darkColor}`}>
                        {planState.label}
                    </span>
                    {plan.work_type && (
                        <span className="text-sm text-gray-400 flex items-center gap-1.5">
                            {plan.work_type.cor && (
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plan.work_type.cor }} />
                            )}
                            {plan.work_type.nome}
                        </span>
                    )}
                    {plan.medico && (
                        <span className="text-sm text-gray-400">· {plan.medico.full_name}</span>
                    )}
                    {totalPhases > 0 && (
                        <span className="text-sm text-gray-400">· {completedPhases}/{totalPhases} fases</span>
                    )}
                    {/* Actions menu */}
                    <div className="relative ml-auto">
                        <button
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {showActionsMenu && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                {plan.estado === 'rascunho' && (
                                    <button onClick={() => handleStateChange('activo')} disabled={changingState}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-green-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Activar Plano
                                    </button>
                                )}
                                {(plan.estado === 'activo' || plan.estado === 'reaberto') && (
                                    <>
                                        <button onClick={() => { setReasonModal({ action: 'pausar', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-orange-400 flex items-center gap-2">
                                            <Pause className="w-4 h-4" /> Pausar Plano
                                        </button>
                                        <button onClick={() => handleStateChange('concluido')} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-blue-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Concluir Plano
                                        </button>
                                        <div className="border-t border-gray-700 my-1" />
                                        <button onClick={() => { setReasonModal({ action: 'cancelar', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-400 flex items-center gap-2">
                                            <XCircle className="w-4 h-4" /> Cancelar Plano
                                        </button>
                                    </>
                                )}
                                {plan.estado === 'pausado' && (
                                    <>
                                        <button onClick={() => handleStateChange('activo', { motivo_pausa: null })} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-green-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Retomar Plano
                                        </button>
                                        <div className="border-t border-gray-700 my-1" />
                                        <button onClick={() => { setReasonModal({ action: 'cancelar', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-400 flex items-center gap-2">
                                            <XCircle className="w-4 h-4" /> Cancelar Plano
                                        </button>
                                    </>
                                )}
                                {(plan.estado === 'concluido' || plan.estado === 'cancelado') && (
                                    <button onClick={() => { setReasonModal({ action: 'reabrir', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-purple-400 flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4" /> Reabrir Plano
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === BODY: Timeline + Detail === */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* LEFT: Timeline de fases */}
                <div className="md:w-[280px] lg:w-[320px] border-r border-gray-700 overflow-y-auto flex-shrink-0 bg-gray-800/30">
                    {/* Mobile: horizontal chips */}
                    <div className="md:hidden flex gap-2 p-3 overflow-x-auto">
                        {sortedPhases.map((phase: { id: string; nome: string; estado: string }) => {
                            const s = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
                            const Icon = s.icon;
                            return (
                                <button key={phase.id}
                                    onClick={() => setSelectedPhaseId(phase.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
                                        ${selectedPhaseId === phase.id ? 'bg-amber-500/20 text-amber-400 ring-1 ring-amber-500' : 'bg-gray-700 text-gray-300'}`}>
                                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                                    {phase.nome}
                                </button>
                            );
                        })}
                        <button onClick={() => setShowPhaseModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap bg-gray-700 text-gray-400 hover:text-amber-400 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Fase
                        </button>
                    </div>

                    {/* Desktop: vertical timeline */}
                    <div className="hidden md:block p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Fases</h2>
                            <button onClick={() => setShowPhaseModal(true)}
                                className="p-1 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-amber-400 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative">
                            {/* Vertical line */}
                            {sortedPhases.length > 1 && (
                                <div className="absolute left-[15px] top-[20px] bottom-[20px] w-0.5 bg-gray-700" />
                            )}
                            <div className="space-y-1">
                                {sortedPhases.map((phase: { id: string; nome: string; estado: string; ordem: number }, idx: number) => {
                                    const s = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
                                    const Icon = s.icon;
                                    const isSelected = selectedPhaseId === phase.id;
                                    return (
                                        <div key={phase.id} className="flex items-center gap-1">
                                            <button
                                                onClick={() => setSelectedPhaseId(phase.id)}
                                                className={`flex-1 flex items-center gap-3 p-3 rounded-lg transition-colors text-left relative
                                                    ${isSelected ? 'bg-gray-700/70 ring-1 ring-amber-500/40' : 'hover:bg-gray-700/40'}`}>
                                                <div className="relative z-10 flex-shrink-0">
                                                    <Icon className={`w-[30px] h-[30px] ${s.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                                        F{phase.ordem} · {phase.nome}
                                                    </p>
                                                    <p className="text-xs text-gray-500">{s.label}</p>
                                                </div>
                                                {isSelected && (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 flex-shrink-0" />
                                                )}
                                            </button>
                                            {/* Reorder buttons */}
                                            {isSelected && sortedPhases.length > 1 && (
                                                <div className="flex flex-col gap-0.5">
                                                    <button
                                                        onClick={() => handleSwapPhase(idx, 'up')}
                                                        disabled={idx === 0 || reordering}
                                                        className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                                                        title="Mover para cima"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSwapPhase(idx, 'down')}
                                                        disabled={idx === sortedPhases.length - 1 || reordering}
                                                        className="p-0.5 rounded hover:bg-gray-700 text-gray-500 hover:text-amber-400 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                                                        title="Mover para baixo"
                                                    >
                                                        <ChevronDown className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                        {sortedPhases.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-8">Sem fases. Clique + para criar.</p>
                        )}
                    </div>
                </div>

                {/* RIGHT: Detalhe da fase */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6">
                    {selectedPhase ? (
                        <PhaseDetail
                            phase={selectedPhase}
                            onReload={onReload}
                            onAddAppointment={() => setShowAppointmentModal(true)}
                            onStateChange={handlePhaseStateChange}
                            onAppointmentStateChange={handleAppointmentStateChange}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Calendar className="w-12 h-12 mb-3 text-gray-600" />
                            <p className="text-lg font-medium">Nenhuma fase seleccionada</p>
                            <p className="text-sm mt-1">Crie a primeira fase para começar.</p>
                            <button onClick={() => setShowPhaseModal(true)}
                                className="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-black font-medium hover:bg-amber-400 transition-colors flex items-center gap-2">
                                <Plus className="w-4 h-4" /> Nova Fase
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            {showPhaseModal && (
                <NewPhaseModal
                    planId={plan.id}
                    currentPhaseCount={sortedPhases.length}
                    onClose={() => setShowPhaseModal(false)}
                    onCreated={() => { setShowPhaseModal(false); onReload(); }}
                />
            )}
            {showAppointmentModal && selectedPhaseId && (
                <NewAppointmentModal
                    phaseId={selectedPhaseId}
                    onClose={() => setShowAppointmentModal(false)}
                    onCreated={() => { setShowAppointmentModal(false); onReload(); }}
                />
            )}
            {reasonModal && (
                <ReasonModal
                    action={reasonModal.action}
                    onSubmit={handleReasonSubmit}
                    onClose={() => setReasonModal(null)}
                />
            )}
        </div>
    );
}

// === Sub-componente: Detalhe da Fase ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PhaseDetail({ phase, onReload, onAddAppointment, onStateChange, onAppointmentStateChange }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phase: any;
    onReload: () => void;
    onAddAppointment: () => void;
    onStateChange: (phaseId: string, newState: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAppointmentStateChange: (appointmentId: string, newState: string) => void;
}) {
    const [showPhaseMenu, setShowPhaseMenu] = useState(false);
    const phaseState = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
    const PhaseIcon = phaseState.icon;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appointments = phase.appointments || [];

    // Suppress unused var lint
    void onReload;

    return (
        <div>
            {/* Phase header */}
            <div className="flex items-start justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <PhaseIcon className={`w-5 h-5 ${phaseState.color}`} />
                        <h2 className="text-xl font-bold">F{phase.ordem} · {phase.nome}</h2>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phase.estado === 'concluida' ? 'bg-green-900/40 text-green-400' :
                            phase.estado === 'em_curso' ? 'bg-amber-900/40 text-amber-400' :
                                phase.estado === 'cancelada' ? 'bg-red-900/40 text-red-400' :
                                    'bg-gray-700 text-gray-400'
                            }`}>
                            {phaseState.label}
                        </span>
                        <span>· {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}</span>
                    </div>
                    {phase.notas && (
                        <p className="mt-2 text-sm text-gray-400 italic">{phase.notas}</p>
                    )}
                </div>
                <div className="relative">
                    <button onClick={() => setShowPhaseMenu(!showPhaseMenu)}
                        className="p-1.5 rounded-lg hover:bg-gray-700 transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                    </button>
                    {showPhaseMenu && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                            {phase.estado !== 'em_curso' && (
                                <button onClick={() => { onStateChange(phase.id, 'em_curso'); setShowPhaseMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-amber-400">
                                    🔄 Em Curso
                                </button>
                            )}
                            {phase.estado !== 'concluida' && (
                                <button onClick={() => { onStateChange(phase.id, 'concluida'); setShowPhaseMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-green-400">
                                    ✅ Concluída
                                </button>
                            )}
                            {phase.estado !== 'cancelada' && (
                                <button onClick={() => { onStateChange(phase.id, 'cancelada'); setShowPhaseMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-700 text-red-400">
                                    ❌ Cancelada
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Agendamentos */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Agendamentos</h3>
                    <button onClick={onAddAppointment}
                        className="text-sm text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Novo
                    </button>
                </div>

                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 border border-dashed border-gray-700 rounded-lg">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-600" />
                        <p className="text-sm">Nenhum agendamento</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {appointments.map((appt: any) => {
                            const typeConfig = APPOINTMENT_TYPE_CONFIG[appt.tipo] || APPOINTMENT_TYPE_CONFIG.outro;
                            const stateConfig = APPOINTMENT_STATE_CONFIG[appt.estado] || APPOINTMENT_STATE_CONFIG.agendado;
                            return (
                                <AppointmentCard
                                    key={appt.id}
                                    appointment={appt}
                                    typeConfig={typeConfig}
                                    stateConfig={stateConfig}
                                    onStateChange={onAppointmentStateChange}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Placeholder for materiais */}
            {phase.notas && (
                <div className="border border-gray-700 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Notas da Fase</h3>
                    <p className="text-sm text-gray-300">{phase.notas}</p>
                </div>
            )}
        </div>
    );
}

// === Sub-componente: Card de Agendamento ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AppointmentCard({ appointment, typeConfig, stateConfig, onStateChange }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appointment: any;
    typeConfig: { label: string; emoji: string };
    stateConfig: { label: string; color: string; bg: string };
    onStateChange: (id: string, state: string) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);

    return (
        <div className="bg-gray-800/60 border border-gray-700 rounded-lg p-3 hover:border-gray-600 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{typeConfig.emoji}</span>
                    <div>
                        <p className="text-sm font-medium">{typeConfig.label}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stateConfig.bg} ${stateConfig.color}`}>
                                {stateConfig.label}
                            </span>
                            {appointment.agendada_para && (
                                <span className="text-xs text-gray-400 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(appointment.agendada_para).toLocaleDateString('pt-PT')}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded hover:bg-gray-700 transition-colors">
                        <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                            {(appointment.tipo === 'para_prova' || appointment.tipo === 'moldagem') && appointment.estado === 'agendado' && (
                                <button onClick={() => { onStateChange(appointment.id, 'prova_entregue'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 text-indigo-400">
                                    📦 Prova Entregue
                                </button>
                            )}
                            {appointment.tipo === 'para_colocacao' && appointment.estado === 'agendado' && (
                                <button onClick={() => { onStateChange(appointment.id, 'colocacao_entregue'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 text-purple-400">
                                    📦 Col. Entregue
                                </button>
                            )}
                            {(appointment.estado === 'prova_entregue' || appointment.estado === 'colocacao_entregue') && (
                                <button onClick={() => { onStateChange(appointment.id, 'recolhido'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 text-teal-400">
                                    ✅ Recolhido
                                </button>
                            )}
                            {appointment.estado !== 'concluido' && (
                                <button onClick={() => { onStateChange(appointment.id, 'concluido'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 text-green-400">
                                    ✅ Concluído
                                </button>
                            )}
                            {appointment.estado !== 'remarcado' && appointment.estado !== 'concluido' && (
                                <button onClick={() => { onStateChange(appointment.id, 'remarcado'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 text-orange-400">
                                    🔄 Remarcado
                                </button>
                            )}
                            {appointment.estado !== 'cancelado' && appointment.estado !== 'concluido' && (
                                <button onClick={() => { onStateChange(appointment.id, 'cancelado'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-700 text-red-400">
                                    ❌ Cancelado
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            {appointment.notas && (
                <p className="mt-2 text-xs text-gray-400 italic">{appointment.notas}</p>
            )}
        </div>
    );
}

// === Modal de Motivo para Pausar/Cancelar/Reabrir ===

function ReasonModal({ action, onSubmit, onClose }: {
    action: 'pausar' | 'cancelar' | 'reabrir';
    onSubmit: (reason: string, reopenType?: string) => void;
    onClose: () => void;
}) {
    const [reason, setReason] = useState('');
    const [reopenType, setReopenType] = useState<'correcao' | 'remake'>('correcao');
    const [submitting, setSubmitting] = useState(false);

    const config = {
        pausar: {
            title: '⏸️ Pausar Plano',
            label: 'Motivo da pausa',
            placeholder: 'Ex: A aguardar componentes, paciente em viagem...',
            color: 'bg-orange-500 hover:bg-orange-600',
            required: true,
        },
        cancelar: {
            title: '❌ Cancelar Plano',
            label: 'Motivo do cancelamento',
            placeholder: 'Ex: Paciente desistiu, plano incorreto...',
            color: 'bg-red-600 hover:bg-red-700',
            required: true,
        },
        reabrir: {
            title: '🔄 Reabrir Plano',
            label: 'Motivo da reabertura (opcional)',
            placeholder: 'Ex: Necessidade de ajuste, reclamação...',
            color: 'bg-purple-600 hover:bg-purple-700',
            required: false,
        },
    }[action];

    const handleSubmit = async () => {
        if (config.required && !reason.trim()) return;
        setSubmitting(true);
        try {
            await onSubmit(reason.trim(), action === 'reabrir' ? reopenType : undefined);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 rounded-2xl border border-gray-700 w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-gray-700">
                    <h3 className="text-lg font-bold text-white">{config.title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 text-gray-400">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {action === 'reabrir' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-2">Tipo de reabertura</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReopenType('correcao')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${reopenType === 'correcao'
                                        ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                                        : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    🔧 Correcção
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReopenType('remake')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${reopenType === 'remake'
                                        ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                                        : 'bg-gray-700/50 border-gray-600 text-gray-400 hover:border-gray-500'
                                        }`}
                                >
                                    🔄 Remake
                                </button>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">{config.label}</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={config.placeholder}
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-lg bg-gray-700/50 border border-gray-600 text-white placeholder-gray-500 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none text-sm"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-gray-700">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-700 transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (config.required && !reason.trim())}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.color}`}
                    >
                        {submitting ? 'A processar...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}
