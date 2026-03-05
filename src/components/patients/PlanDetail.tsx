'use client';

import { useState, useCallback, useEffect } from 'react';
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
    Trash2,
    Pencil,
    Check,
    Package,
} from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import { billingService } from '@/services/billingService';
import { catalogService } from '@/services/catalogService';
import NewPhaseModal from './NewPhaseModal';
import NewAppointmentModal from './NewAppointmentModal';
import WorkBadges from './WorkBadges';
import Odontogram from './Odontogram';
import MillingWidget from './MillingWidget';
import TeethWidget from './TeethWidget';
import ComponentsWidget from './ComponentsWidget';

// === Config de estados ===
const PLAN_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-yellow-700', bg: 'bg-yellow-100' },
    activo: { label: 'Activo', color: 'text-green-700', bg: 'bg-green-100' },
    pausado: { label: 'Pausado', color: 'text-orange-700', bg: 'bg-orange-100' },
    concluido: { label: 'Concluído', color: 'text-blue-700', bg: 'bg-blue-100' },
    cancelado: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
    reaberto: { label: 'Reaberto', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const PHASE_STATE_CONFIG: Record<string, { label: string; icon: typeof CheckCircle2; color: string }> = {
    pendente: { label: 'Pendente', icon: Circle, color: 'text-muted-foreground' },
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
    const [invoiceModal, setInvoiceModal] = useState<{ phaseId: string; phaseName: string } | null>(null);

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
        // Intercept: when concluding a phase, show invoice modal first
        if (newState === 'concluida') {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const phase = sortedPhases.find((p: any) => p.id === phaseId);
            setInvoiceModal({ phaseId, phaseName: phase?.nome || 'Fase' });
            return;
        }

        try {
            await patientsService.updateRecord('phases', phaseId, { estado: newState });
            onReload();
        } catch (err) {
            console.error('Error changing phase state:', err);
        }
    }, [onReload, sortedPhases]);

    const concludePhaseAfterInvoice = useCallback(async (phaseId: string) => {
        try {
            await patientsService.updateRecord('phases', phaseId, { estado: 'concluida' });

            // Lógica sequencial: ao concluir uma fase, activar a próxima pendente
            const currentIndex = sortedPhases.findIndex((p: { id: string }) => p.id === phaseId);
            const nextPhase = sortedPhases.slice(currentIndex + 1).find(
                (p: { estado: string }) => p.estado === 'pendente'
            );
            if (nextPhase) {
                await patientsService.updateRecord('phases', nextPhase.id, { estado: 'em_curso' });
                setSelectedPhaseId(nextPhase.id);
            }

            onReload();
        } catch (err) {
            console.error('Error concluding phase:', err);
        }
    }, [onReload, sortedPhases]);

    const handleAppointmentStateChange = useCallback(async (appointmentId: string, newState: string) => {
        try {
            await patientsService.updateRecord('appointments', appointmentId, { estado: newState });
            onReload();
        } catch (err) {
            console.error('Error changing appointment state:', err);
        }
    }, [onReload]);

    const handleAppointmentDelete = useCallback(async (appointmentId: string) => {
        try {
            await patientsService.deleteRecord('appointments', appointmentId);
            onReload();
        } catch (err) {
            console.error('Error deleting appointment:', err);
        }
    }, [onReload]);

    const handleAppointmentUpdate = useCallback(async (appointmentId: string, data: Record<string, unknown>) => {
        try {
            await patientsService.updateRecord('appointments', appointmentId, data);
            onReload();
        } catch (err) {
            console.error('Error updating appointment:', err);
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
        <div className="h-full flex flex-col bg-white text-gray-900 overflow-hidden">
            {/* === HEADER === */}
            <div className="p-4 md:p-6 border-b border-gray-200 bg-gray-50 flex-shrink-0">
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <button
                        onClick={() => router.push(`/dashboard/patients/${patientId}`)}
                        className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <span className="text-sm text-gray-500 truncate max-w-[40%] sm:max-w-none">
                        {plan.patient?.t_id} {plan.patient?.nome}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
                    <h1 className="text-base sm:text-lg font-bold break-words min-w-0">{plan.nome}</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3 ml-9">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${planState.bg} ${planState.color}`}>
                        {planState.label}
                    </span>
                    {plan.work_type && (
                        <span className="text-sm text-gray-500 flex items-center gap-1.5">
                            {plan.work_type.cor && (
                                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: plan.work_type.cor }} />
                            )}
                            {plan.work_type.nome}
                        </span>
                    )}
                    {plan.medico && (
                        <span className="text-sm text-gray-500">· {plan.medico.full_name}</span>
                    )}
                    {totalPhases > 0 && (
                        <span className="text-sm text-gray-500">· {completedPhases}/{totalPhases} fases</span>
                    )}
                    {/* Actions menu */}
                    <div className="relative ml-auto">
                        <button
                            onClick={() => setShowActionsMenu(!showActionsMenu)}
                            className="p-1.5 rounded-lg hover:bg-gray-200 transition-colors"
                        >
                            <MoreVertical className="w-5 h-5" />
                        </button>
                        {showActionsMenu && (
                            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                                {plan.estado === 'rascunho' && (
                                    <button onClick={() => handleStateChange('activo')} disabled={changingState}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-green-400 flex items-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" /> Activar Plano
                                    </button>
                                )}
                                {(plan.estado === 'activo' || plan.estado === 'reaberto') && (
                                    <>
                                        <button onClick={() => { setReasonModal({ action: 'pausar', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-orange-400 flex items-center gap-2">
                                            <Pause className="w-4 h-4" /> Pausar Plano
                                        </button>
                                        <button onClick={() => handleStateChange('concluido')} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-blue-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Concluir Plano
                                        </button>
                                        <div className="border-t border-border my-1" />
                                        <button onClick={() => { setReasonModal({ action: 'cancelar', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-400 flex items-center gap-2">
                                            <XCircle className="w-4 h-4" /> Cancelar Plano
                                        </button>
                                    </>
                                )}
                                {plan.estado === 'pausado' && (
                                    <>
                                        <button onClick={() => handleStateChange('activo', { motivo_pausa: null })} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-green-400 flex items-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Retomar Plano
                                        </button>
                                        <div className="border-t border-border my-1" />
                                        <button onClick={() => { setReasonModal({ action: 'cancelar', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                            className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-400 flex items-center gap-2">
                                            <XCircle className="w-4 h-4" /> Cancelar Plano
                                        </button>
                                    </>
                                )}
                                {(plan.estado === 'concluido' || plan.estado === 'cancelado') && (
                                    <button onClick={() => { setReasonModal({ action: 'reabrir', planId: plan.id }); setShowActionsMenu(false); }} disabled={changingState}
                                        className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-purple-400 flex items-center gap-2">
                                        <RotateCcw className="w-4 h-4" /> Reabrir Plano
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* === WORK BADGES === */}
            <div className="px-4 md:px-6 py-2 border-b border-gray-200 bg-gray-100/50 flex-shrink-0">
                <WorkBadges planId={plan.id} mode="full" />
            </div>

            {/* === BODY: Timeline + Detail === */}
            <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
                {/* LEFT: Timeline de fases */}
                <div className="md:w-[280px] lg:w-[320px] border-r border-gray-200 overflow-y-auto flex-shrink-0 bg-gray-50/50">
                    {/* Mobile: horizontal chips */}
                    <div className="md:hidden flex gap-2 p-3 overflow-x-auto">
                        {sortedPhases.map((phase: { id: string; nome: string; estado: string }) => {
                            const s = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
                            const Icon = s.icon;
                            return (
                                <button key={phase.id}
                                    onClick={() => setSelectedPhaseId(phase.id)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors
                                        ${selectedPhaseId === phase.id ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400' : 'bg-gray-100 text-gray-700'}`}>
                                    <Icon className={`w-3.5 h-3.5 ${s.color}`} />
                                    {phase.nome}
                                </button>
                            );
                        })}
                        <button onClick={() => setShowPhaseModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors">
                            <Plus className="w-3.5 h-3.5" /> Fase
                        </button>
                    </div>

                    {/* Desktop: vertical timeline */}
                    <div className="hidden md:block p-4">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Fases</h2>
                            <button onClick={() => setShowPhaseModal(true)}
                                className="p-1 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-amber-600 transition-colors">
                                <Plus className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative">
                            {/* Vertical line */}
                            {sortedPhases.length > 1 && (
                                <div className="absolute left-[15px] top-[20px] bottom-[20px] w-0.5 bg-gray-200" />
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
                                                    ${isSelected ? 'bg-gray-100 ring-1 ring-amber-400/40' : 'hover:bg-gray-100/60'}`}>
                                                <div className="relative z-10 flex-shrink-0">
                                                    <Icon className={`w-[30px] h-[30px] ${s.color}`} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium truncate ${isSelected ? 'text-gray-900' : 'text-gray-700'}`}>
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
                                                        className="p-0.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
                                                        title="Mover para cima"
                                                    >
                                                        <ChevronUp className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleSwapPhase(idx, 'down')}
                                                        disabled={idx === sortedPhases.length - 1 || reordering}
                                                        className="p-0.5 rounded hover:bg-gray-100 text-gray-500 hover:text-amber-600 disabled:opacity-20 disabled:hover:bg-transparent disabled:hover:text-gray-500 transition-colors"
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
                            onAppointmentDelete={handleAppointmentDelete}
                            onAppointmentUpdate={handleAppointmentUpdate}
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-gray-500">
                            <Calendar className="w-12 h-12 mb-3 text-muted-foreground" />
                            <p className="text-lg font-medium">Nenhuma fase seleccionada</p>
                            <p className="text-sm mt-1">Crie a primeira fase para começar.</p>
                            <button onClick={() => setShowPhaseModal(true)}
                                className="mt-4 px-4 py-2 rounded-lg bg-amber-500 text-white font-medium hover:bg-amber-400 transition-colors flex items-center gap-2">
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
            {invoiceModal && (
                <InvoicePhaseModal
                    phaseId={invoiceModal.phaseId}
                    phaseName={invoiceModal.phaseName}
                    patientId={patientId}
                    planId={plan.id}
                    onClose={() => setInvoiceModal(null)}
                    onConclude={concludePhaseAfterInvoice}
                />
            )}
        </div>
    );
}

// === Sub-componente: Detalhe da Fase ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PhaseDetail({ phase, onReload, onAddAppointment, onStateChange, onAppointmentStateChange, onAppointmentDelete, onAppointmentUpdate }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    phase: any;
    onReload: () => void;
    onAddAppointment: () => void;
    onStateChange: (phaseId: string, newState: string) => void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onAppointmentStateChange: (appointmentId: string, newState: string) => void;
    onAppointmentDelete: (appointmentId: string) => void;
    onAppointmentUpdate: (appointmentId: string, data: Record<string, unknown>) => void;
}) {
    const [showPhaseMenu, setShowPhaseMenu] = useState(false);
    const phaseState = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
    const PhaseIcon = phaseState.icon;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const appointments = phase.appointments || [];

    // Materials state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [materials, setMaterials] = useState<any[]>([]);
    const [showAddMaterial, setShowAddMaterial] = useState(false);
    const [newMatNome, setNewMatNome] = useState('');
    const [newMatQty, setNewMatQty] = useState('1');
    const [newMatUnit, setNewMatUnit] = useState('un');
    const [addingMat, setAddingMat] = useState(false);

    // Odontogram state
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [phaseTeeth, setPhaseTeeth] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [workTypes, setWorkTypes] = useState<any[]>([]);

    // Load materials + teeth + work types
    useEffect(() => {
        patientsService.getPhaseMaterials(phase.id)
            .then(setMaterials)
            .catch(err => console.error('Erro materiais:', err));
        patientsService.getPhaseTeeth(phase.id)
            .then(setPhaseTeeth)
            .catch(err => console.error('Erro teeth:', err));
        catalogService.getWorkTypes()
            .then(setWorkTypes)
            .catch(err => console.error('Erro work types:', err));
    }, [phase.id]);

    const handleAddMaterial = async () => {
        if (!newMatNome.trim() || addingMat) return;
        setAddingMat(true);
        try {
            const mat = await patientsService.addPhaseMaterial({
                phase_id: phase.id,
                nome: newMatNome.trim(),
                quantidade: parseInt(newMatQty) || 1,
                unidade: newMatUnit,
            });
            setMaterials(prev => [...prev, mat]);
            setNewMatNome('');
            setNewMatQty('1');
            setNewMatUnit('un');
            setShowAddMaterial(false);
        } catch (err) {
            console.error('Erro ao adicionar material:', err);
        } finally {
            setAddingMat(false);
        }
    };

    const handleRemoveMaterial = async (matId: string) => {
        const prev = [...materials];
        setMaterials(m => m.filter(x => x.id !== matId));
        try {
            await patientsService.removePhaseMaterial(matId);
        } catch (err) {
            console.error('Erro ao remover material:', err);
            setMaterials(prev);
        }
    };

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
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${phase.estado === 'concluida' ? 'bg-green-100 text-green-700' :
                            phase.estado === 'em_curso' ? 'bg-amber-100 text-amber-700' :
                                phase.estado === 'cancelada' ? 'bg-red-100 text-red-700' :
                                    'bg-gray-100 text-gray-500'
                            }`}>
                            {phaseState.label}
                        </span>
                        <span>· {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}</span>
                    </div>
                    {phase.notas && (
                        <p className="mt-2 text-sm text-gray-500 italic">{phase.notas}</p>
                    )}
                </div>
                <div className="relative">
                    <button onClick={() => setShowPhaseMenu(!showPhaseMenu)}
                        className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
                        <MoreVertical className="w-4 h-4 text-gray-500" />
                    </button>
                    {showPhaseMenu && (
                        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                            {phase.estado !== 'em_curso' && (
                                <button onClick={() => { onStateChange(phase.id, 'em_curso'); setShowPhaseMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-amber-400">
                                    🔄 Em Curso
                                </button>
                            )}
                            {phase.estado !== 'concluida' && (
                                <button onClick={() => { onStateChange(phase.id, 'concluida'); setShowPhaseMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-green-400">
                                    ✅ Concluída
                                </button>
                            )}
                            {phase.estado !== 'cancelada' && (
                                <button onClick={() => { onStateChange(phase.id, 'cancelada'); setShowPhaseMenu(false); }}
                                    className="w-full text-left px-4 py-2 text-sm hover:bg-gray-100 text-red-400">
                                    ❌ Cancelada
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Odontograma */}
            <div className="mb-6">
                <Odontogram
                    teeth={phaseTeeth.map((t: { tooth_number: number; work_type_id: string | null }) => ({
                        tooth_number: t.tooth_number,
                        work_type_id: t.work_type_id,
                    }))}
                    workTypes={workTypes}
                    onChange={async (newTeeth) => {
                        try {
                            await patientsService.syncPhaseTeeth(phase.id, newTeeth);
                            setPhaseTeeth(newTeeth);
                        } catch (err) {
                            console.error('Erro ao guardar odontograma:', err);
                        }
                    }}
                />
            </div>

            {/* Agendamentos */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Agendamentos</h3>
                    <button onClick={onAddAppointment}
                        className="text-sm text-amber-600 hover:text-amber-500 transition-colors flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Novo
                    </button>
                </div>

                {appointments.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                        <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-400" />
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
                                    onDelete={onAppointmentDelete}
                                    onUpdate={onAppointmentUpdate}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* === Materiais da Fase === */}
            <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        Materiais
                        {materials.length > 0 && (
                            <span className="text-[10px] font-normal bg-muted px-1.5 py-0.5 rounded-full">{materials.length}</span>
                        )}
                    </h3>
                    <button onClick={() => setShowAddMaterial(!showAddMaterial)}
                        className="text-sm text-amber-600 hover:text-amber-500 transition-colors flex items-center gap-1">
                        <Plus className="w-3.5 h-3.5" /> Adicionar
                    </button>
                </div>

                {/* Inline add form */}
                {showAddMaterial && (
                    <div className="flex flex-wrap items-center gap-2 mb-3 p-2 border border-dashed border-gray-200 rounded-lg bg-gray-50">
                        <input
                            value={newMatNome}
                            onChange={(e) => setNewMatNome(e.target.value)}
                            placeholder="Nome do material..."
                            className="flex-1 min-w-[120px] bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 placeholder:text-gray-400 focus:border-amber-500 focus:outline-none"
                            autoFocus
                            onKeyDown={(e) => e.key === 'Enter' && handleAddMaterial()}
                        />
                        <input
                            type="number"
                            value={newMatQty}
                            onChange={(e) => setNewMatQty(e.target.value)}
                            min="1"
                            className="w-14 bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700 text-center"
                        />
                        <select
                            value={newMatUnit}
                            onChange={(e) => setNewMatUnit(e.target.value)}
                            className="bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-700"
                        >
                            <option value="un">un</option>
                            <option value="g">g</option>
                            <option value="ml">ml</option>
                            <option value="pcs">pcs</option>
                            <option value="kit">kit</option>
                        </select>
                        <button onClick={handleAddMaterial} disabled={!newMatNome.trim() || addingMat}
                            className="p-1.5 rounded bg-green-600 hover:bg-green-500 text-white disabled:opacity-40">
                            <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setShowAddMaterial(false)}
                            className="p-1.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-500">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}

                {materials.length === 0 && !showAddMaterial ? (
                    <div className="text-center py-4 text-gray-400 border border-dashed border-gray-200 rounded-lg">
                        <Package className="w-6 h-6 mx-auto mb-1 opacity-40" />
                        <p className="text-xs">Sem materiais associados</p>
                    </div>
                ) : materials.length > 0 && (
                    <div className="space-y-1">
                        {materials.map((mat) => (
                            <div key={mat.id} className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg group hover:border-gray-300">
                                <Package className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                                <span className="flex-1 text-sm text-gray-900">{mat.nome}</span>
                                <span className="text-xs text-gray-500 font-mono">{mat.quantidade} {mat.unidade || 'un'}</span>
                                <button
                                    onClick={() => handleRemoveMaterial(mat.id)}
                                    className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-600 text-gray-400 transition-all"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Notas da Fase */}
            {phase.notas && (
                <div className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Notas da Fase</h3>
                    <p className="text-sm text-gray-700">{phase.notas}</p>
                </div>
            )}

            {/* Acções Rápidas da Fase */}
            {phase.estado !== 'concluida' && phase.estado !== 'cancelada' && (
                <div className="mt-6 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-2 pt-4 border-t border-gray-200">
                    {phase.estado === 'pendente' && (
                        <button
                            onClick={() => onStateChange(phase.id, 'em_curso')}
                            className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <Clock className="w-4 h-4" />
                            Iniciar Fase
                        </button>
                    )}
                    {phase.estado === 'em_curso' && (
                        <button
                            onClick={() => onStateChange(phase.id, 'concluida')}
                            className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex items-center justify-center gap-2"
                        >
                            <CheckCircle2 className="w-4 h-4" />
                            Concluir Fase
                        </button>
                    )}
                    <button
                        onClick={() => onStateChange(phase.id, 'cancelada')}
                        className="px-4 py-2.5 sm:py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center justify-center gap-2 sm:ml-auto"
                    >
                        <XCircle className="w-4 h-4" />
                        Cancelar
                    </button>
                </div>
            )}
            {(phase.estado === 'concluida' || phase.estado === 'cancelada') && (
                <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-gray-200">
                    <button
                        onClick={() => onStateChange(phase.id, 'pendente')}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                        <Circle className="w-4 h-4" />
                        Reabrir como Pendente
                    </button>
                </div>
            )}
        </div>
    );
}

// === Sub-componente: Card de Agendamento ===

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function AppointmentCard({ appointment, typeConfig, stateConfig, onStateChange, onDelete, onUpdate }: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    appointment: any;
    typeConfig: { label: string; emoji: string };
    stateConfig: { label: string; color: string; bg: string };
    onStateChange: (id: string, state: string) => void;
    onDelete: (id: string) => void;
    onUpdate: (id: string, data: Record<string, unknown>) => void;
}) {
    const [showMenu, setShowMenu] = useState(false);
    const [editingDate, setEditingDate] = useState(false);
    const [editingNotes, setEditingNotes] = useState(false);
    const [dateValue, setDateValue] = useState(appointment.data_prevista || '');
    const [timeValue, setTimeValue] = useState(appointment.hora_prevista || '');
    const [notesValue, setNotesValue] = useState(appointment.notas || '');
    const [confirmDelete, setConfirmDelete] = useState(false);

    const handleSaveDate = () => {
        onUpdate(appointment.id, {
            data_prevista: dateValue || null,
            hora_prevista: timeValue || null,
        });
        setEditingDate(false);
    };

    const handleSaveNotes = () => {
        onUpdate(appointment.id, { notas: notesValue.trim() || null });
        setEditingNotes(false);
    };

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 hover:border-gray-300 transition-colors">
            <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">{typeConfig.emoji}</span>
                    <div>
                        <p className="text-sm font-medium">{typeConfig.label}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stateConfig.bg} ${stateConfig.color}`}>
                                {stateConfig.label}
                            </span>
                            {!editingDate && appointment.data_prevista && (
                                <button onClick={() => setEditingDate(true)}
                                    className="text-xs text-gray-500 flex items-center gap-1 hover:text-amber-600 transition-colors">
                                    <Calendar className="w-3 h-3" />
                                    {new Date(appointment.data_prevista).toLocaleDateString('pt-PT', { day: 'numeric', month: 'short' })}
                                    {appointment.hora_prevista && (
                                        <span className="text-gray-500"> · {appointment.hora_prevista.substring(0, 5)}</span>
                                    )}
                                    <Pencil className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100" />
                                </button>
                            )}
                            {!editingDate && !appointment.data_prevista && (
                                <button onClick={() => setEditingDate(true)}
                                    className="text-[10px] text-gray-500 hover:text-amber-400 transition-colors flex items-center gap-1">
                                    <Calendar className="w-3 h-3" /> Definir data
                                </button>
                            )}
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <button onClick={() => setShowMenu(!showMenu)}
                        className="p-1 rounded hover:bg-gray-100 transition-colors">
                        <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
                    </button>
                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-50 py-1">
                            {/* Transições de estado */}
                            {(appointment.tipo === 'para_prova' || appointment.tipo === 'moldagem') && appointment.estado === 'agendado' && (
                                <button onClick={() => { onStateChange(appointment.id, 'prova_entregue'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-indigo-400">
                                    📦 Prova Entregue
                                </button>
                            )}
                            {appointment.tipo === 'para_colocacao' && appointment.estado === 'agendado' && (
                                <button onClick={() => { onStateChange(appointment.id, 'colocacao_entregue'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-purple-400">
                                    📦 Col. Entregue
                                </button>
                            )}
                            {(appointment.estado === 'prova_entregue' || appointment.estado === 'colocacao_entregue') && (
                                <button onClick={() => { onStateChange(appointment.id, 'recolhido'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-teal-400">
                                    ✅ Recolhido
                                </button>
                            )}
                            {appointment.estado !== 'concluido' && (
                                <button onClick={() => { onStateChange(appointment.id, 'concluido'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-green-400">
                                    ✅ Concluído
                                </button>
                            )}
                            {appointment.estado !== 'remarcado' && appointment.estado !== 'concluido' && (
                                <button onClick={() => { onStateChange(appointment.id, 'remarcado'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-orange-400">
                                    🔄 Remarcado
                                </button>
                            )}
                            {appointment.estado !== 'cancelado' && appointment.estado !== 'concluido' && (
                                <button onClick={() => { onStateChange(appointment.id, 'cancelado'); setShowMenu(false); }}
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-red-400">
                                    ❌ Cancelado
                                </button>
                            )}
                            {/* Editar */}
                            <div className="border-t border-gray-200 my-1" />
                            <button onClick={() => { setEditingDate(true); setShowMenu(false); }}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-card-foreground/80 flex items-center gap-2">
                                <Pencil className="w-3.5 h-3.5" /> Editar Data
                            </button>
                            <button onClick={() => { setEditingNotes(true); setShowMenu(false); }}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-card-foreground/80 flex items-center gap-2">
                                <Pencil className="w-3.5 h-3.5" /> Editar Notas
                            </button>
                            {/* Apagar */}
                            <div className="border-t border-gray-200 my-1" />
                            <button onClick={() => { setConfirmDelete(true); setShowMenu(false); }}
                                className="w-full text-left px-3 py-1.5 text-sm hover:bg-gray-100 text-red-400 flex items-center gap-2">
                                <Trash2 className="w-3.5 h-3.5" /> Apagar
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Edição inline de data */}
            {editingDate && (
                <div className="mt-2 flex items-center gap-2">
                    <input type="date" value={dateValue} onChange={(e) => setDateValue(e.target.value)}
                        className="flex-1 bg-muted border border-gray-600 rounded px-2 py-1 text-xs text-card-foreground [color-scheme:dark]" />
                    <input type="time" value={timeValue} onChange={(e) => setTimeValue(e.target.value)}
                        className="w-24 bg-muted border border-gray-600 rounded px-2 py-1 text-xs text-card-foreground [color-scheme:dark]" />
                    <button onClick={handleSaveDate} className="p-1 rounded bg-green-600 hover:bg-green-500 text-card-foreground">
                        <Check className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setEditingDate(false)} className="p-1 rounded bg-gray-600 hover:bg-gray-500 text-card-foreground">
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>
            )}

            {/* Notas - modo visualização ou edição */}
            {editingNotes ? (
                <div className="mt-2">
                    <textarea value={notesValue} onChange={(e) => setNotesValue(e.target.value)}
                        rows={2} placeholder="Notas do agendamento..."
                        className="w-full bg-muted border border-gray-600 rounded px-2 py-1 text-xs text-card-foreground placeholder:text-gray-500 resize-none" />
                    <div className="flex gap-1 mt-1">
                        <button onClick={handleSaveNotes} className="px-2 py-0.5 rounded bg-green-600 hover:bg-green-500 text-card-foreground text-[10px]">
                            Guardar
                        </button>
                        <button onClick={() => setEditingNotes(false)} className="px-2 py-0.5 rounded bg-gray-600 hover:bg-gray-500 text-card-foreground text-[10px]">
                            Cancelar
                        </button>
                    </div>
                </div>
            ) : appointment.notas && (
                <p className="mt-2 text-xs text-muted-foreground italic cursor-pointer hover:text-card-foreground/80" onClick={() => setEditingNotes(true)}>
                    {appointment.notas}
                </p>
            )}

            {/* Widget Fresagem */}
            <MillingWidget appointmentId={appointment.id} />

            {/* Widget Dentes */}
            <TeethWidget appointmentId={appointment.id} />

            {/* Widget Componentes */}
            <ComponentsWidget appointmentId={appointment.id} />

            {/* Confirmação de delete */}
            {confirmDelete && (
                <div className="mt-2 p-2 bg-red-900/20 border border-red-700/50 rounded-lg">
                    <p className="text-xs text-red-300">Tem a certeza que quer apagar este agendamento?</p>
                    <div className="flex gap-2 mt-2">
                        <button onClick={() => onDelete(appointment.id)}
                            className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-card-foreground text-xs font-medium">
                            Sim, apagar
                        </button>
                        <button onClick={() => setConfirmDelete(false)}
                            className="px-3 py-1 rounded bg-muted hover:bg-muted text-card-foreground/80 text-xs">
                            Cancelar
                        </button>
                    </div>
                </div>
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
            <div className="bg-muted rounded-2xl border border-border w-full max-w-md shadow-2xl">
                <div className="flex items-center justify-between p-5 border-b border-border">
                    <h3 className="text-lg font-bold text-card-foreground">{config.title}</h3>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted text-muted-foreground">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-5 space-y-4">
                    {action === 'reabrir' && (
                        <div>
                            <label className="block text-sm font-medium text-card-foreground/80 mb-2">Tipo de reabertura</label>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setReopenType('correcao')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${reopenType === 'correcao'
                                        ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                                        : 'bg-muted/50 border-gray-600 text-muted-foreground hover:border-gray-500'
                                        }`}
                                >
                                    🔧 Correcção
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setReopenType('remake')}
                                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${reopenType === 'remake'
                                        ? 'bg-purple-900/40 border-purple-500 text-purple-300'
                                        : 'bg-muted/50 border-gray-600 text-muted-foreground hover:border-gray-500'
                                        }`}
                                >
                                    🔄 Remake
                                </button>
                            </div>
                        </div>
                    )}
                    <div>
                        <label className="block text-sm font-medium text-card-foreground/80 mb-2">{config.label}</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={config.placeholder}
                            rows={3}
                            className="w-full px-3 py-2.5 rounded-lg bg-muted/50 border border-gray-600 text-card-foreground placeholder-muted-foreground focus:border-amber-500 focus:ring-1 focus:ring-amber-500 resize-none text-sm"
                            autoFocus
                        />
                    </div>
                </div>
                <div className="flex justify-end gap-3 p-5 border-t border-border">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors">
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={submitting || (config.required && !reason.trim())}
                        className={`px-4 py-2 rounded-lg text-sm font-medium text-card-foreground transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${config.color}`}
                    >
                        {submitting ? 'A processar...' : 'Confirmar'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// === Sub-componente: InvoicePhaseModal ===
function InvoicePhaseModal({ phaseId, phaseName, patientId, planId, onClose, onConclude }: {
    phaseId: string;
    phaseName: string;
    patientId: string;
    planId: string;
    onClose: () => void;
    onConclude: (phaseId: string) => void;
}) {
    const [mode, setMode] = useState<'choose' | 'invoice' | 'skip'>('choose');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [motivo, setMotivo] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleGenerateInvoice = async () => {
        if (!valor || submitting) return;
        try {
            setSubmitting(true);
            await billingService.createInvoice({
                patient_id: patientId,
                plan_id: planId,
                phase_id: phaseId,
                valor: parseFloat(valor),
                descricao: descricao || `Fase: ${phaseName}`,
            });
            onClose();
            await onConclude(phaseId);
        } catch (err) {
            console.error('Erro ao gerar factura:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkipInvoice = async () => {
        if (submitting) return;
        try {
            setSubmitting(true);
            await patientsService.updateRecord('phases', phaseId, {
                sem_factura: true,
                sem_factura_em: new Date().toISOString(),
            });
            onClose();
            await onConclude(phaseId);
        } catch (err) {
            console.error('Erro ao saltar factura:', err);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-md">
                <div className="p-5 border-b border-border">
                    <h3 className="text-lg font-semibold text-card-foreground">Concluir Fase: {phaseName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">Deseja gerar uma factura para esta fase?</p>
                </div>

                <div className="p-5">
                    {mode === 'choose' && (
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => setMode('invoice')}
                                className="flex items-center gap-3 p-4 rounded-xl border border-green-500/30 bg-green-500/5 hover:bg-green-500/10 transition-colors text-left"
                            >
                                <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                                    <CheckCircle2 className="h-5 w-5 text-green-400" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-card-foreground">Gerar Factura</p>
                                    <p className="text-xs text-muted-foreground">Criar factura associada a esta fase</p>
                                </div>
                            </button>
                            <button
                                onClick={() => setMode('skip')}
                                className="flex items-center gap-3 p-4 rounded-xl border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left"
                            >
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                    <XCircle className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-card-foreground">Sem Factura</p>
                                    <p className="text-xs text-muted-foreground">Concluir sem gerar factura</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {mode === 'invoice' && (
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Valor (€) *</label>
                                <input
                                    type="number"
                                    value={valor}
                                    onChange={e => setValor(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    min="0"
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-card-foreground"
                                    autoFocus
                                />
                            </div>
                            <div>
                                <label className="text-xs text-muted-foreground mb-1 block">Descrição</label>
                                <input
                                    value={descricao}
                                    onChange={e => setDescricao(e.target.value)}
                                    placeholder={`Fase: ${phaseName}`}
                                    className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-card-foreground"
                                />
                            </div>
                        </div>
                    )}

                    {mode === 'skip' && (
                        <div>
                            <label className="text-xs text-muted-foreground mb-1 block">Motivo (opcional)</label>
                            <textarea
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                                placeholder="Porque não será gerada factura..."
                                rows={2}
                                className="w-full bg-muted border border-border rounded-lg px-3 py-2 text-sm text-card-foreground resize-none"
                                autoFocus
                            />
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3 p-5 border-t border-border">
                    <button
                        onClick={() => { if (mode === 'choose') onClose(); else setMode('choose'); }}
                        className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:bg-muted transition-colors"
                    >
                        {mode === 'choose' ? 'Cancelar' : 'Voltar'}
                    </button>
                    {mode === 'invoice' && (
                        <button
                            onClick={handleGenerateInvoice}
                            disabled={!valor || submitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 disabled:opacity-40 transition-colors"
                        >
                            {submitting ? 'A gerar...' : 'Gerar Factura e Concluir'}
                        </button>
                    )}
                    {mode === 'skip' && (
                        <button
                            onClick={handleSkipInvoice}
                            disabled={submitting}
                            className="px-4 py-2 rounded-lg text-sm font-medium bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
                        >
                            {submitting ? 'A processar...' : 'Concluir Sem Factura'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

