'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    MessageSquare,
    Send,
    Filter,
    Building2,
    Microscope,
    Loader2,
    Clock,
    ChevronDown,
    Paperclip,
    X,
    FileText,
    Download,
    Image as ImageIcon,
} from 'lucide-react';
import { patientsService } from '@/services/patientsService';

interface ConsiderationsTabProps {
    patientId: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plans: any[];
}

const LADO_CONFIG = {
    lab: { label: 'Lab', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', bubble: 'bg-blue-900/40', icon: Microscope, align: 'items-start' },
    clinica: { label: 'Clínica', color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', bubble: 'bg-orange-900/40', icon: Building2, align: 'items-end' },
};

export default function ConsiderationsTab({ patientId, plans }: ConsiderationsTabProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [considerations, setConsiderations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterPhaseId, setFilterPhaseId] = useState<string>('');
    const [showFilter, setShowFilter] = useState(false);

    // Input state
    const [newLado, setNewLado] = useState<'lab' | 'clinica'>('lab');
    const [newConteudo, setNewConteudo] = useState('');
    const [newPhaseId, setNewPhaseId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Attachment state
    const [attachedFile, setAttachedFile] = useState<File | null>(null);
    const [attachedPreview, setAttachedPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);

    // Get all phases from all plans
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

    useEffect(() => {
        if (!loading && considerations.length > 0) {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [loading, considerations.length]);

    const handleSubmit = async () => {
        if ((!newConteudo.trim() && !attachedFile) || !newPhaseId) return;
        try {
            setSubmitting(true);

            let anexo_url: string | undefined;
            let anexo_nome: string | undefined;
            let anexo_tipo: string | undefined;

            // Upload file if attached
            if (attachedFile) {
                setUploading(true);
                try {
                    const result = await patientsService.uploadConsiderationFile(newPhaseId, attachedFile);
                    anexo_url = result.url;
                    anexo_nome = result.nome;
                    anexo_tipo = result.tipo;
                } catch (err) {
                    console.error('Error uploading file:', err);
                } finally {
                    setUploading(false);
                }
            }

            await patientsService.createConsideration({
                phase_id: newPhaseId,
                lado: newLado,
                conteudo: newConteudo.trim() || (anexo_nome ? `📎 ${anexo_nome}` : ''),
                anexo_url,
                anexo_nome,
                anexo_tipo,
            });
            setNewConteudo('');
            clearAttachment();
            loadConsiderations();
        } catch (err) {
            console.error('Error creating consideration:', err);
        } finally {
            setSubmitting(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setAttachedFile(file);
        if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = (ev) => setAttachedPreview(ev.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            setAttachedPreview(null);
        }
    };

    const clearAttachment = () => {
        setAttachedFile(null);
        setAttachedPreview(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const isImage = (tipo: string | null | undefined) => tipo?.startsWith('image/');

    // Group considerations by phase
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const grouped = considerations.reduce<Record<string, { phaseName: string; items: any[] }>>((acc, c) => {
        const phaseId = c.phase_id || '_sem_fase';
        const phaseName = c.appointment?.phase?.nome ||
            allPhases.find(p => p.id === c.phase_id)?.nome ||
            'Sem fase';
        if (!acc[phaseId]) acc[phaseId] = { phaseName, items: [] };
        acc[phaseId].items.push(c);
        return acc;
    }, {});

    // Sort items within each group by date ascending (chat order)
    Object.values(grouped).forEach(g => g.items.sort((a: { created_at: string }, b: { created_at: string }) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    ));

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-700/50">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    Considerações
                    {considerations.length > 0 && (
                        <span className="text-[10px] bg-gray-700 text-gray-400 rounded-full px-2 py-0.5">
                            {considerations.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {allPhases.length > 0 && (
                        <div className="relative">
                            <button
                                onClick={() => setShowFilter(!showFilter)}
                                className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${filterPhaseId
                                    ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                                    : 'border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600'
                                    }`}
                            >
                                <Filter className="h-3 w-3" />
                                {filterPhaseId
                                    ? allPhases.find(p => p.id === filterPhaseId)?.nome || 'Fase'
                                    : 'Filtrar'
                                }
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showFilter && (
                                <div className="absolute right-0 top-full mt-1 w-52 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-50 py-1">
                                    <button
                                        onClick={() => { setFilterPhaseId(''); setShowFilter(false); }}
                                        className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${!filterPhaseId ? 'text-amber-400 font-medium' : 'text-gray-300'
                                            }`}
                                    >
                                        Todas as fases
                                    </button>
                                    {allPhases.map((phase) => (
                                        <button
                                            key={phase.id}
                                            onClick={() => { setFilterPhaseId(phase.id); setShowFilter(false); }}
                                            className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-700 ${filterPhaseId === phase.id ? 'text-amber-400 font-medium' : 'text-gray-300'
                                                }`}
                                        >
                                            {phase.planNome} → F{phase.ordem} {phase.nome}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Chat area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-6 min-h-[200px] max-h-[500px]">
                {loading ? (
                    <div className="flex justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                    </div>
                ) : considerations.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Sem considerações</p>
                        <p className="text-xs mt-1 text-gray-600">Escreva abaixo para iniciar a comunicação</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([phaseId, group]) => (
                        <div key={phaseId}>
                            {/* Phase divider */}
                            <div className="flex items-center gap-3 mb-3">
                                <div className="flex-1 h-px bg-gray-700/50" />
                                <span className="text-[10px] text-gray-500 font-medium uppercase tracking-wider px-2">
                                    📍 {group.phaseName}
                                </span>
                                <div className="flex-1 h-px bg-gray-700/50" />
                            </div>
                            {/* Messages */}
                            <div className="space-y-2">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {group.items.map((c: any) => {
                                    const config = LADO_CONFIG[c.lado as keyof typeof LADO_CONFIG] || LADO_CONFIG.lab;
                                    const isLab = c.lado === 'lab';
                                    const Icon = config.icon;
                                    return (
                                        <div key={c.id} className={`flex flex-col ${config.align}`}>
                                            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${config.bubble} border ${config.border}`}>
                                                <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">
                                                    {c.conteudo}
                                                </p>
                                            </div>
                                            <div className={`flex items-center gap-1.5 mt-1 px-2 ${isLab ? '' : 'flex-row-reverse'}`}>
                                                <Icon className={`h-3 w-3 ${config.color}`} />
                                                <span className={`text-[10px] font-medium ${config.color}`}>{config.label}</span>
                                                {c.autor && (
                                                    <span className="text-[10px] text-gray-500">· {c.autor.full_name}</span>
                                                )}
                                                <span className="text-[10px] text-gray-600 flex items-center gap-0.5">
                                                    · <Clock className="h-2.5 w-2.5" /> {getTimeAgo(c.created_at)}
                                                </span>
                                                {c.versao > 1 && (
                                                    <span className="text-[9px] bg-gray-700 text-gray-400 rounded-full px-1.5 py-0.5">
                                                        v{c.versao}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Attachment preview */}
                                            {c.anexo_url && (
                                                <div className="mt-1.5">
                                                    {isImage(c.anexo_tipo) ? (
                                                        <a href={c.anexo_url} target="_blank" rel="noopener noreferrer">
                                                            <img
                                                                src={c.anexo_url}
                                                                alt={c.anexo_nome || 'Anexo'}
                                                                className="max-w-[220px] max-h-[180px] rounded-lg border border-gray-600 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                                            />
                                                        </a>
                                                    ) : (
                                                        <a
                                                            href={c.anexo_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-2 px-3 py-2 bg-gray-800/60 rounded-lg hover:bg-gray-700 transition-colors text-xs"
                                                        >
                                                            <FileText className="h-4 w-4 text-gray-400" />
                                                            <span className="text-gray-300 truncate max-w-[160px]">{c.anexo_nome || 'Ficheiro'}</span>
                                                            <Download className="h-3 w-3 text-gray-500" />
                                                        </a>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))
                )}
                <div ref={chatEndRef} />
            </div>

            {/* Input area (always visible, like a chat) */}
            <div className="border-t border-gray-700/50 pt-3 space-y-2">
                {/* Phase selector + lado toggle */}
                <div className="flex items-center gap-2">
                    {/* Lado toggle */}
                    <div className="flex rounded-lg overflow-hidden border border-gray-700">
                        {(Object.entries(LADO_CONFIG) as [string, typeof LADO_CONFIG.lab][]).map(([key, config]) => {
                            const Icon = config.icon;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setNewLado(key as 'lab' | 'clinica')}
                                    className={`flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium transition-colors ${newLado === key
                                        ? `${config.bg} ${config.color}`
                                        : 'bg-gray-800 text-gray-500 hover:text-gray-400'
                                        }`}
                                >
                                    <Icon className="h-3 w-3" />
                                    {config.label}
                                </button>
                            );
                        })}
                    </div>
                    {/* Phase selector */}
                    <select
                        value={newPhaseId}
                        onChange={(e) => setNewPhaseId(e.target.value)}
                        className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 appearance-none cursor-pointer"
                    >
                        <option value="">Seleccione a fase...</option>
                        {allPhases.map((p) => (
                            <option key={p.id} value={p.id}>{p.planNome} → F{p.ordem} {p.nome}</option>
                        ))}
                    </select>
                </div>
                {/* Text input + send */}
                <div className="flex gap-2">
                    <div className="flex-1 space-y-1.5">
                        {/* Attachment preview */}
                        {attachedFile && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg border border-gray-700">
                                {attachedPreview ? (
                                    <img src={attachedPreview} alt="" className="w-10 h-10 rounded object-cover" />
                                ) : (
                                    <FileText className="w-5 h-5 text-gray-400" />
                                )}
                                <span className="text-xs text-gray-300 truncate flex-1">{attachedFile.name}</span>
                                <span className="text-[10px] text-gray-500">{(attachedFile.size / 1024).toFixed(0)}KB</span>
                                <button onClick={clearAttachment} className="text-gray-500 hover:text-red-400">
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        )}
                        <div className="flex gap-2">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                disabled={!newPhaseId || uploading}
                                className="px-2.5 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-gray-400 hover:text-amber-400 hover:border-amber-500/40 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                title="Anexar ficheiro"
                            >
                                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                            </button>
                            <input
                                ref={fileInputRef}
                                type="file"
                                onChange={handleFileSelect}
                                accept="image/*,.pdf,.doc,.docx,.stl,.zip,.rar"
                                className="hidden"
                            />
                            <textarea
                                value={newConteudo}
                                onChange={(e) => setNewConteudo(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={newPhaseId ? 'Escreva a consideração... (Enter para enviar)' : 'Seleccione uma fase primeiro...'}
                                rows={1}
                                disabled={!newPhaseId}
                                className="flex-1 text-sm bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-gray-200 placeholder:text-gray-600 resize-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/30 outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                            />
                            <button
                                onClick={handleSubmit}
                                disabled={submitting || (!newConteudo.trim() && !attachedFile) || !newPhaseId}
                                className="px-4 py-2.5 rounded-xl bg-amber-500 text-gray-900 font-medium hover:bg-amber-400 disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
                            >
                                {submitting ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
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
    if (diffMin < 60) return `${diffMin}min`;
    if (diffHrs < 24) return `${diffHrs}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-PT');
}
