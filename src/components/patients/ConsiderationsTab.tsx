'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare,
    Plus,
    X,
    Loader2,
    Send,
    Filter,
    Building2,
    Microscope,
    Paperclip,
    Clock,
} from 'lucide-react';
import { patientsService } from '@/services/patientsService';

interface ConsiderationsTabProps {
    patientId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plans: any[];
}

const TIPO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Microscope }> = {
    lab: { label: 'Lab', color: 'text-blue-400', bg: 'bg-blue-500/15', icon: Microscope },
    clinica: { label: 'Clínica', color: 'text-orange-400', bg: 'bg-orange-500/15', icon: Building2 },
};

export default function ConsiderationsTab({ patientId, plans }: ConsiderationsTabProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [considerations, setConsiderations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showNewForm, setShowNewForm] = useState(false);
    const [filterPhaseId, setFilterPhaseId] = useState<string>('');

    // Novo form state
    const [newTipo, setNewTipo] = useState('lab');
    const [newConteudo, setNewConteudo] = useState('');
    const [newPhaseId, setNewPhaseId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Todas as fases de todos os planos
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allPhases = plans.flatMap((p: any) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (p.phases || []).map((phase: any) => ({
            id: phase.id,
            nome: phase.nome,
            planNome: p.nome,
            ordem: phase.ordem,
        }))
    );

    const loadConsiderations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await patientsService.getConsiderations(patientId, filterPhaseId || undefined);
            setConsiderations(data);
        } catch (err) {
            console.error('Error loading considerations:', err);
        } finally {
            setLoading(false);
        }
    }, [patientId, filterPhaseId]);

    useEffect(() => {
        loadConsiderations();
    }, [loadConsiderations]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newConteudo.trim()) return;

        try {
            setSubmitting(true);
            setError('');
            if (!newPhaseId) {
                setError('Selecione uma fase.');
                setSubmitting(false);
                return;
            }
            await patientsService.createConsideration({
                phase_id: newPhaseId,
                lado: newTipo,
                conteudo: newConteudo.trim(),
            });
            setNewConteudo('');
            setNewPhaseId('');
            setShowNewForm(false);
            loadConsiderations();
        } catch (err) {
            console.error('Error creating consideration:', err);
            setError('Erro ao criar. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    Considerações
                    {considerations.length > 0 && (
                        <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                            {considerations.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {/* Filtro por fase */}
                    {allPhases.length > 0 && (
                        <div className="relative">
                            <select
                                value={filterPhaseId}
                                onChange={(e) => setFilterPhaseId(e.target.value)}
                                className="text-xs bg-white border border-gray-200 rounded-lg pl-7 pr-3 py-1.5 text-gray-600 appearance-none cursor-pointer hover:border-gray-300"
                            >
                                <option value="">Todas as fases</option>
                                {allPhases.map((phase) => (
                                    <option key={phase.id} value={phase.id}>
                                        {phase.planNome} → F{phase.ordem} {phase.nome}
                                    </option>
                                ))}
                            </select>
                            <Filter className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                        </div>
                    )}
                    <button
                        onClick={() => setShowNewForm(!showNewForm)}
                        className="text-xs bg-primary text-white rounded-lg px-3 py-1.5 font-medium hover:bg-primary/90 transition-colors flex items-center gap-1"
                    >
                        <Plus className="h-3 w-3" />
                        Nova
                    </button>
                </div>
            </div>

            {/* Novo form (inline) */}
            {showNewForm && (
                <form onSubmit={handleSubmit} className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
                    {/* Tipo selector */}
                    <div className="flex gap-2">
                        {Object.entries(TIPO_CONFIG).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                                <button key={key} type="button"
                                    onClick={() => setNewTipo(key)}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border
                                        ${newTipo === key
                                            ? `${config.bg} ${config.color} border-current`
                                            : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                        }`}>
                                    <Icon className="h-3.5 w-3.5" />
                                    {config.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Fase (opcional) */}
                    {allPhases.length > 0 && (
                        <select value={newPhaseId} onChange={(e) => setNewPhaseId(e.target.value)}
                            className="w-full text-xs bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-600">
                            <option value="">Sem fase associada</option>
                            {allPhases.map((p) => (
                                <option key={p.id} value={p.id}>{p.planNome} → F{p.ordem} {p.nome}</option>
                            ))}
                        </select>
                    )}

                    {/* Conteúdo */}
                    <textarea
                        value={newConteudo}
                        onChange={(e) => setNewConteudo(e.target.value)}
                        placeholder="Escreva aqui a consideração..."
                        rows={3}
                        className="w-full text-sm bg-white border border-gray-200 rounded-lg px-3 py-2 text-gray-700 placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-primary/30 focus:border-primary outline-none"
                    />

                    {error && <p className="text-xs text-red-500">{error}</p>}

                    <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => setShowNewForm(false)}
                            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 transition-colors">
                            Cancelar
                        </button>
                        <button type="submit" disabled={submitting || !newConteudo.trim()}
                            className="text-xs px-3 py-1.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors flex items-center gap-1">
                            {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                            Enviar
                        </button>
                    </div>
                </form>
            )}

            {/* Lista de considerações */}
            {loading ? (
                <div className="flex justify-center py-12">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-300" />
                </div>
            ) : considerations.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                    <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Sem considerações</p>
                    <p className="text-xs mt-1">Crie a primeira para iniciar a comunicação</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {considerations.map((c: any) => {
                        const tipoConfig = TIPO_CONFIG[c.lado] || TIPO_CONFIG.lab;
                        const TipoIcon = tipoConfig.icon;
                        const timeAgo = getTimeAgo(c.created_at);

                        return (
                            <div key={c.id}
                                className={`border rounded-xl p-4 transition-colors ${c.lado === 'lab'
                                    ? 'border-blue-100 bg-blue-50/30'
                                    : 'border-orange-100 bg-orange-50/30'
                                    }`}>
                                {/* Header */}
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className={`flex items-center gap-1 text-xs font-semibold ${tipoConfig.color}`}>
                                            <TipoIcon className="h-3.5 w-3.5" />
                                            {tipoConfig.label}
                                        </span>
                                        {c.autor && (
                                            <span className="text-xs text-gray-500">{c.autor.full_name}</span>
                                        )}
                                        {c.versao > 1 && (
                                            <span className="text-[10px] bg-gray-200 text-gray-500 rounded-full px-1.5 py-0.5">
                                                v{c.versao}
                                            </span>
                                        )}
                                    </div>
                                    <span className="text-[10px] text-gray-400 flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {timeAgo}
                                    </span>
                                </div>

                                {/* Conteúdo */}
                                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{c.conteudo}</p>

                                {/* Fase associada */}
                                {c.appointment?.phase && (
                                    <div className="mt-2 text-[10px] text-gray-400">
                                        📍 {c.appointment.phase.nome}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin}min`;
    if (diffHrs < 24) return `Há ${diffHrs}h`;
    if (diffDays < 7) return `Há ${diffDays}d`;
    return date.toLocaleDateString('pt-PT');
}
