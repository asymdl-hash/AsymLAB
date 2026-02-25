'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft,
    AlertTriangle,
    Save,
    Trash2,
    ClipboardList,
    FolderOpen,
    MessageSquare,
    History,
    Plus,
    ChevronRight,
    Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { patientsService, PatientFullDetails } from '@/services/patientsService';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

// Labels e cores para estados dos planos
const PLAN_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    rascunho: { label: 'Rascunho', color: 'text-gray-500', bg: 'bg-gray-100' },
    activo: { label: 'Activo', color: 'text-blue-700', bg: 'bg-blue-100' },
    pausado: { label: 'Pausado', color: 'text-amber-700', bg: 'bg-amber-100' },
    concluido: { label: 'Concluído', color: 'text-green-700', bg: 'bg-green-100' },
    cancelado: { label: 'Cancelado', color: 'text-red-700', bg: 'bg-red-100' },
    reaberto: { label: 'Reaberto', color: 'text-purple-700', bg: 'bg-purple-100' },
};

const PHASE_STATE_CONFIG: Record<string, { label: string; dot: string }> = {
    pendente: { label: 'Pendente', dot: 'text-gray-400' },
    em_curso: { label: 'Em Curso', dot: 'text-blue-500' },
    concluida: { label: 'Concluída', dot: 'text-green-500' },
    cancelada: { label: 'Cancelada', dot: 'text-red-400' },
};

interface PatientFormProps {
    initialData: PatientFullDetails;
}

export default function PatientForm({ initialData }: PatientFormProps) {
    const [patient, setPatient] = useState(initialData);
    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const router = useRouter();
    const { isAdmin, isReadOnly: checkReadOnly } = useAuth();
    const readOnly = checkReadOnly('patients');
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-save com debounce
    const autoSave = useCallback(async (field: string, value: unknown) => {
        if (readOnly) return;

        if (debounceRef.current) clearTimeout(debounceRef.current);

        debounceRef.current = setTimeout(async () => {
            try {
                setSaving(true);
                await patientsService.updatePatient(patient.id, { [field]: value });
                setLastSaved(new Date());
                window.dispatchEvent(new Event('patient-updated'));
            } catch (error) {
                console.error('Erro ao guardar:', error);
            } finally {
                setSaving(false);
            }
        }, 600);
    }, [patient.id, readOnly]);

    const handleFieldChange = (field: string, value: unknown) => {
        setPatient(prev => ({ ...prev, [field]: value }));
        autoSave(field, value);
    };

    const handleToggleUrgent = async () => {
        if (readOnly) return;
        const newValue = !patient.urgente;
        setPatient(prev => ({ ...prev, urgente: newValue }));
        try {
            await patientsService.toggleUrgent(patient.id, newValue);
            window.dispatchEvent(new Event('patient-updated'));
        } catch (error) {
            console.error('Erro ao toggle urgente:', error);
            setPatient(prev => ({ ...prev, urgente: !newValue }));
        }
    };

    const handleDelete = async () => {
        if (!isAdmin) return;
        if (!confirm('Tem certeza que quer apagar este paciente? Esta acção é irreversível.')) return;
        try {
            await patientsService.softDeletePatient(patient.id);
            window.dispatchEvent(new Event('patient-updated'));
            router.push('/dashboard/patients');
        } catch (error) {
            console.error('Erro ao apagar:', error);
        }
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header fixo */}
            <div className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
                <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Voltar (mobile) */}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden h-8 w-8 shrink-0"
                            onClick={() => router.push('/dashboard/patients')}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>

                        {/* T-ID badge */}
                        <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-1 rounded shrink-0">
                            {patient.t_id}
                        </span>

                        {/* Nome editável */}
                        <Input
                            value={patient.nome}
                            onChange={(e) => handleFieldChange('nome', e.target.value)}
                            className="text-lg font-semibold border-0 p-0 h-auto focus-visible:ring-0 bg-transparent"
                            disabled={readOnly}
                        />
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        {/* Indicador de save */}
                        {saving && (
                            <span className="text-xs text-gray-400 animate-pulse">Guardando...</span>
                        )}
                        {!saving && lastSaved && (
                            <span className="text-xs text-green-500 hidden sm:block">
                                <Save className="h-3 w-3 inline mr-1" />
                                Guardado
                            </span>
                        )}

                        {/* Toggle Urgente */}
                        <Button
                            variant="ghost"
                            size="sm"
                            className={cn(
                                "h-8 gap-1.5 text-xs",
                                patient.urgente
                                    ? "text-amber-600 bg-amber-50 hover:bg-amber-100"
                                    : "text-gray-400 hover:text-amber-600"
                            )}
                            onClick={handleToggleUrgent}
                            disabled={readOnly}
                        >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">
                                {patient.urgente ? 'Urgente' : 'Urgente'}
                            </span>
                        </Button>

                        {/* Delete */}
                        {isAdmin && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-gray-400 hover:text-red-500"
                                onClick={handleDelete}
                                title="Apagar paciente"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>

                {/* Info secundária */}
                <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                    {patient.clinica && (
                        <span>Clínica: <strong>{patient.clinica.commercial_name}</strong></span>
                    )}
                    {patient.medico && (
                        <span>Dr. <strong>{patient.medico.full_name}</strong></span>
                    )}
                    {patient.id_paciente_clinica && (
                        <span>ID Clínica: <strong>{patient.id_paciente_clinica}</strong></span>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="planos" className="flex-1 flex flex-col overflow-hidden">
                <TabsList className="w-full justify-start px-4 sm:px-6 pt-2 bg-white border-b border-gray-100 rounded-none h-auto flex-wrap gap-1">
                    <TabsTrigger value="planos" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                        <ClipboardList className="h-3.5 w-3.5" />
                        <span>Planos</span>
                        <Badge variant="secondary" className="text-[10px] h-4 px-1.5 ml-1">
                            {patient.treatment_plans?.length || 0}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="ficheiros" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                        <FolderOpen className="h-3.5 w-3.5" />
                        <span>Ficheiros</span>
                    </TabsTrigger>
                    <TabsTrigger value="consideracoes" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                        <MessageSquare className="h-3.5 w-3.5" />
                        <span>Considerações</span>
                    </TabsTrigger>
                    <TabsTrigger value="historico" className="gap-1.5 text-xs sm:text-sm data-[state=active]:shadow-none">
                        <History className="h-3.5 w-3.5" />
                        <span>Histórico</span>
                    </TabsTrigger>
                </TabsList>

                {/* === Tab: Planos de Tratamento === */}
                <TabsContent value="planos" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                    {/* Notas do lab */}
                    <div className="mb-6">
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notas do Laboratório</label>
                        <textarea
                            value={patient.notas_lab || ''}
                            onChange={(e) => handleFieldChange('notas_lab', e.target.value)}
                            placeholder="Notas internas sobre o paciente..."
                            className="mt-1 w-full text-sm border border-gray-200 rounded-lg p-3 bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20 resize-none min-h-[60px]"
                            rows={2}
                            disabled={readOnly}
                        />
                    </div>

                    {/* Lista de planos */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-semibold text-gray-700">Planos de Tratamento</h3>
                            {!readOnly && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1.5"
                                    onClick={() => {/* TODO: modal novo plano */ }}
                                >
                                    <Plus className="h-3 w-3" />
                                    Novo Plano
                                </Button>
                            )}
                        </div>

                        {(!patient.treatment_plans || patient.treatment_plans.length === 0) ? (
                            <div className="text-center py-12 text-gray-400">
                                <ClipboardList className="h-10 w-10 mx-auto mb-3 opacity-40" />
                                <p className="text-sm">Sem planos de tratamento</p>
                                <p className="text-xs mt-1">Crie o primeiro plano para começar</p>
                            </div>
                        ) : (
                            patient.treatment_plans.map((plan) => {
                                const stateConfig = PLAN_STATE_CONFIG[plan.estado] || PLAN_STATE_CONFIG.rascunho;
                                const totalPhases = plan.phases?.length || 0;
                                const completedPhases = plan.phases?.filter(p => p.estado === 'concluida').length || 0;

                                return (
                                    <div
                                        key={plan.id}
                                        className="border border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all bg-white"
                                    >
                                        {/* Cabeçalho do plano */}
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <h4 className="font-medium text-sm text-gray-900 truncate">
                                                        {plan.nome}
                                                    </h4>
                                                    <span className={cn(
                                                        "text-[10px] font-medium px-2 py-0.5 rounded-full",
                                                        stateConfig.bg,
                                                        stateConfig.color
                                                    )}>
                                                        {stateConfig.label}
                                                    </span>
                                                    {plan.urgente && (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                                                    {plan.work_type && (
                                                        <span className="flex items-center gap-1">
                                                            {plan.work_type.cor && (
                                                                <span
                                                                    className="h-2 w-2 rounded-full inline-block"
                                                                    style={{ backgroundColor: plan.work_type.cor }}
                                                                />
                                                            )}
                                                            {plan.work_type.nome}
                                                        </span>
                                                    )}
                                                    {plan.medico && (
                                                        <span>Dr. {plan.medico.full_name}</span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            {totalPhases > 0 && (
                                                <div className="text-right shrink-0">
                                                    <span className="text-xs text-gray-500">
                                                        {completedPhases}/{totalPhases}
                                                    </span>
                                                    <div className="w-16 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all"
                                                            style={{ width: `${(completedPhases / totalPhases) * 100}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Fases (collapsed) */}
                                        {plan.phases && plan.phases.length > 0 && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                                                {plan.phases
                                                    .sort((a, b) => a.ordem - b.ordem)
                                                    .map((phase) => {
                                                        const phaseConfig = PHASE_STATE_CONFIG[phase.estado] || PHASE_STATE_CONFIG.pendente;
                                                        const appointmentCount = phase.appointments?.length || 0;

                                                        return (
                                                            <div
                                                                key={phase.id}
                                                                className="flex items-center gap-2 text-xs text-gray-600 py-1 px-2 rounded hover:bg-gray-50"
                                                            >
                                                                <Circle className={cn("h-2.5 w-2.5 fill-current", phaseConfig.dot)} />
                                                                <span className="flex-1 truncate">{phase.nome}</span>
                                                                {appointmentCount > 0 && (
                                                                    <span className="text-gray-400 text-[10px]">
                                                                        {appointmentCount} agend.
                                                                    </span>
                                                                )}
                                                                <ChevronRight className="h-3 w-3 text-gray-300" />
                                                            </div>
                                                        );
                                                    })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </TabsContent>

                {/* === Tab: Ficheiros (placeholder) === */}
                <TabsContent value="ficheiros" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                    <div className="text-center py-16 text-gray-400">
                        <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-medium">Ficheiros</p>
                        <p className="text-xs mt-1">Implementação na próxima iteração</p>
                    </div>
                </TabsContent>

                {/* === Tab: Considerações (placeholder) === */}
                <TabsContent value="consideracoes" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                    <div className="text-center py-16 text-gray-400">
                        <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-medium">Considerações</p>
                        <p className="text-xs mt-1">Implementação na próxima iteração</p>
                    </div>
                </TabsContent>

                {/* === Tab: Histórico (placeholder) === */}
                <TabsContent value="historico" className="flex-1 overflow-y-auto m-0 p-4 sm:p-6">
                    <div className="text-center py-16 text-gray-400">
                        <History className="h-12 w-12 mx-auto mb-3 opacity-40" />
                        <p className="text-sm font-medium">Histórico</p>
                        <p className="text-xs mt-1">Implementação na próxima iteração</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}
