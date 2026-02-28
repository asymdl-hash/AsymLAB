'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    MessageSquare,
    Plus,
    Filter,
    Building2,
    Microscope,
    Lock,
    Loader2,
    Clock,
    ChevronDown,
    ChevronRight,
    Paperclip,
    FileText,
    Image as ImageIcon,
    Reply,
    Edit3,
    History,
    Share2,
    X,
    Send,
    Printer,
} from 'lucide-react';
import { considerationsService, ConsiderationField, ConsiderationTemplate } from '@/services/considerationsService';
import TemplatePicker from './TemplatePicker';
import VersionHistory from './VersionHistory';
import ShareLinkModal from './ShareLinkModal';

// ===== TYPES =====
interface ConsiderationsTabProps {
    patientId: string;
    plans: any[];
}

const LADO_CONFIG = {
    medico: { label: 'Médico', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: Building2, accent: 'orange' },
    lab: { label: 'Lab', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/30', icon: Microscope, accent: 'blue' },
    lab_inside: { label: 'Inside', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/30', icon: Lock, accent: 'purple' },
    clinica: { label: 'Clínica', color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/30', icon: Building2, accent: 'orange' },
};

type LadoFilter = 'todos' | 'medico' | 'lab' | 'lab_inside';
type CreateStep = 'idle' | 'template' | 'compose';

// ===== MAIN COMPONENT =====
export default function ConsiderationsTab({ patientId, plans }: ConsiderationsTabProps) {
    const [considerations, setConsiderations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState<LadoFilter>('todos');
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    // Create state
    const [createStep, setCreateStep] = useState<CreateStep>('idle');
    const [createLado, setCreateLado] = useState<'medico' | 'lab' | 'lab_inside'>('lab');
    const [selectedTemplate, setSelectedTemplate] = useState<ConsiderationTemplate | null>(null);
    const [fields, setFields] = useState<ConsiderationField[]>([]);
    const [freeText, setFreeText] = useState('');
    const [createPhaseId, setCreatePhaseId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [replyTo, setReplyTo] = useState<any>(null);
    const [historyFor, setHistoryFor] = useState<any>(null);
    const [shareFor, setShareFor] = useState<any>(null);

    const allPhases = plans.flatMap((p: any) =>
        (p.phases || []).map((phase: any) => ({
            id: phase.id,
            nome: phase.nome,
            planNome: p.nome,
        }))
    );

    const loadConsiderations = useCallback(async () => {
        try {
            setLoading(true);
            const data = await considerationsService.getConsiderations(patientId, {
                lado: activeFilter === 'todos' ? undefined : activeFilter,
            });
            setConsiderations(data);
        } catch (err) {
            console.error('Error loading considerations:', err);
        } finally {
            setLoading(false);
        }
    }, [patientId, activeFilter]);

    useEffect(() => { loadConsiderations(); }, [loadConsiderations]);

    // Count by lado
    const countByLado = (lado: string) => considerations.filter(c => c.lado === lado || (lado === 'medico' && c.lado === 'clinica')).length;

    // Group by phase
    const grouped = considerations.reduce<Record<string, { phaseName: string; items: any[] }>>((acc, c) => {
        const phaseId = c.phase_id || '_sem_fase';
        const phaseName = allPhases.find(p => p.id === c.phase_id)?.nome || 'Sem fase';
        if (!acc[phaseId]) acc[phaseId] = { phaseName, items: [] };
        acc[phaseId].items.push(c);
        return acc;
    }, {});

    Object.values(grouped).forEach(g => g.items.sort((a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    ));

    // Toggle card expand
    const toggleCard = (id: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Template selected
    const handleTemplateSelect = (template: ConsiderationTemplate) => {
        setSelectedTemplate(template);
        setFields((template.fields || []).map(f => ({
            subtitulo: f.subtitulo,
            descricao: f.descricao_default || '',
            ordem: f.ordem,
        })));
        setCreateStep('compose');
    };

    // Submit
    const handleSubmit = async () => {
        if (!createPhaseId) return;
        if (!freeText.trim() && fields.every(f => !f.descricao.trim())) return;

        try {
            setSubmitting(true);
            await considerationsService.createConsideration({
                patient_id: patientId,
                phase_id: createPhaseId,
                lado: createLado,
                tipo: replyTo ? 'resposta' : 'original',
                parent_id: replyTo?.id || undefined,
                template_id: selectedTemplate?.id || undefined,
                conteudo: freeText,
                fields: fields.length > 0 ? fields : undefined,
            });

            // Track template usage
            if (selectedTemplate) {
                await considerationsService.trackTemplateUsage(selectedTemplate.id);
            }

            // Reset
            setCreateStep('idle');
            setSelectedTemplate(null);
            setFields([]);
            setFreeText('');
            setReplyTo(null);
            loadConsiderations();
        } catch (err) {
            console.error('Error creating consideration:', err);
        } finally {
            setSubmitting(false);
        }
    };

    // Reply handler
    const startReply = (consideration: any) => {
        setReplyTo(consideration);
        setCreateLado(consideration.lado === 'medico' || consideration.lado === 'clinica' ? 'lab' : 'medico');
        setCreatePhaseId(consideration.phase_id || '');
        setCreateStep('template');
    };

    // Export PDF
    const exportPDF = () => {
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        const now = new Date().toLocaleDateString('pt-PT');
        const patientName = (considerations[0]?.patient?.nome) || 'Paciente';

        // Build considerations HTML grouped by phase
        let considerationsHTML = '';
        for (const [, group] of Object.entries(grouped)) {
            const g = group as { phaseName: string; items: any[] };
            considerationsHTML += `<div class="phase-group">`;
            considerationsHTML += `<h3 class="phase-name">📋 ${g.phaseName}</h3>`;
            for (const c of g.items) {
                const ladoCfg = LADO_CONFIG[c.lado as keyof typeof LADO_CONFIG];
                const dateStr = new Date(c.created_at).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
                considerationsHTML += `<div class="consideration">`;
                considerationsHTML += `<div class="consideration-header">`;
                considerationsHTML += `<span class="lado-badge lado-${c.lado}">${ladoCfg?.label || c.lado}</span>`;
                considerationsHTML += `<span class="date">${dateStr}</span>`;
                considerationsHTML += `</div>`;
                if (c.fields && c.fields.length > 0) {
                    for (const f of c.fields) {
                        considerationsHTML += `<div class="field">`;
                        considerationsHTML += `<strong>${f.subtitulo}</strong>`;
                        considerationsHTML += `<p>${f.descricao || '-'}</p>`;
                        considerationsHTML += `</div>`;
                    }
                }
                if (c.conteudo) {
                    considerationsHTML += `<p class="content">${c.conteudo}</p>`;
                }
                considerationsHTML += `</div>`;
            }
            considerationsHTML += `</div>`;
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Considerações - ${patientName} - ${now}</title>
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
                    .header { border-bottom: 2px solid #d4a017; padding-bottom: 16px; margin-bottom: 24px; }
                    .header h1 { font-size: 20px; margin: 0 0 4px; color: #333; }
                    .header .subtitle { font-size: 12px; color: #888; }
                    .phase-group { margin-bottom: 24px; }
                    .phase-name { font-size: 14px; font-weight: 600; color: #555; border-bottom: 1px solid #eee; padding-bottom: 6px; margin-bottom: 12px; }
                    .consideration { background: #f9f9f9; border: 1px solid #e8e8e8; border-radius: 8px; padding: 12px 16px; margin-bottom: 10px; }
                    .consideration-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
                    .lado-badge { font-size: 10px; font-weight: 600; text-transform: uppercase; padding: 2px 8px; border-radius: 12px; }
                    .lado-medico, .lado-clinica { background: #fff3e0; color: #e65100; }
                    .lado-lab { background: #e3f2fd; color: #1565c0; }
                    .lado-lab_inside { background: #f3e5f5; color: #7b1fa2; }
                    .date { font-size: 11px; color: #999; }
                    .field { margin-bottom: 6px; }
                    .field strong { font-size: 12px; color: #444; display: block; margin-bottom: 2px; }
                    .field p { font-size: 12px; color: #666; margin: 0; }
                    .content { font-size: 12px; color: #555; margin: 4px 0 0; white-space: pre-wrap; }
                    .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; font-size: 10px; color: #bbb; }
                    @media print { body { padding: 20px; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Considerações</h1>
                    <div class="subtitle">${patientName} · ${considerations.length} consideração(ões) · Exportado em ${now}</div>
                </div>
                ${considerationsHTML}
                <div class="footer">AsymLAB · Gerado automaticamente</div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 300);
    };

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border/50">
                <h3 className="text-sm font-semibold text-card-foreground/80 flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-gray-500" />
                    Considerações
                    {considerations.length > 0 && (
                        <span className="text-[10px] bg-muted text-muted-foreground rounded-full px-2 py-0.5">
                            {considerations.length}
                        </span>
                    )}
                </h3>
                <div className="flex items-center gap-2">
                    {considerations.length > 0 && (
                        <button
                            onClick={exportPDF}
                            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-muted/50 text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/80 transition-colors"
                        >
                            <Printer className="h-3 w-3" />
                            PDF
                        </button>
                    )}
                    <button
                        onClick={() => { setCreateStep('template'); setReplyTo(null); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/20 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        Nova
                    </button>
                </div>
            </div>

            {/* Filter tabs */}
            <div className="flex items-center gap-1 py-2 border-b border-border/30">
                {(['todos', 'medico', 'lab', 'lab_inside'] as LadoFilter[]).map(filter => {
                    const isActive = activeFilter === filter;
                    const config = filter === 'todos' ? null : LADO_CONFIG[filter];
                    const count = filter === 'todos' ? considerations.length : countByLado(filter);

                    return (
                        <button
                            key={filter}
                            onClick={() => setActiveFilter(filter)}
                            className={`flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-md transition-colors ${isActive
                                ? config ? `${config.bg} ${config.color} ${config.border} border` : 'bg-muted/50 text-card-foreground/80 border border-gray-600'
                                : 'text-gray-500 hover:text-muted-foreground'
                                }`}
                        >
                            {config && <config.icon className="h-3 w-3" />}
                            {filter === 'todos' ? 'Todos' : config?.label}
                            {count > 0 && (
                                <span className="text-[10px] opacity-60">({count})</span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Create area */}
            {createStep !== 'idle' && (
                <div className="p-3 border-b border-border/50 bg-muted/30">
                    {/* Lado selector */}
                    <div className="flex items-center gap-2 mb-3">
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Lado:</span>
                        {(['medico', 'lab', 'lab_inside'] as const).map(l => {
                            const cfg = LADO_CONFIG[l];
                            return (
                                <button
                                    key={l}
                                    onClick={() => setCreateLado(l)}
                                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors ${createLado === l
                                        ? `${cfg.bg} ${cfg.color} ${cfg.border} border`
                                        : 'text-gray-500 hover:text-muted-foreground'
                                        }`}
                                >
                                    <cfg.icon className="h-3 w-3" />
                                    {cfg.label}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => { setCreateStep('idle'); setReplyTo(null); setSelectedTemplate(null); setFields([]); setFreeText(''); }}
                            className="ml-auto text-muted-foreground hover:text-muted-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Phase selector */}
                    <div className="mb-3">
                        <select
                            value={createPhaseId}
                            onChange={e => setCreatePhaseId(e.target.value)}
                            className="w-full text-xs bg-gray-800/60 border border-border/50 rounded-lg px-3 py-2 text-card-foreground/80"
                        >
                            <option value="">Seleccionar fase...</option>
                            {allPhases.map(p => (
                                <option key={p.id} value={p.id}>{p.planNome} → {p.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Reply indicator */}
                    {replyTo && (
                        <div className="mb-3 flex items-center gap-2 text-xs text-gray-500 bg-gray-800/40 rounded-lg px-3 py-2">
                            <Reply className="h-3 w-3" />
                            Em resposta a: <span className="text-muted-foreground">{replyTo.conteudo?.substring(0, 50)}...</span>
                        </div>
                    )}

                    {/* Template picker or compose */}
                    {createStep === 'template' ? (
                        <TemplatePicker
                            tipo={createLado}
                            onSelect={handleTemplateSelect}
                            onSkip={() => { setSelectedTemplate(null); setFields([]); setCreateStep('compose'); }}
                        />
                    ) : (
                        /* Compose area */
                        <div className="space-y-2">
                            {selectedTemplate && (
                                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                                    <FileText className="h-3 w-3" />
                                    Template: <span className="text-muted-foreground">{selectedTemplate.titulo}</span>
                                </div>
                            )}

                            {/* Fields from template */}
                            {fields.length > 0 && (
                                <div className="space-y-2">
                                    {fields.map((f, i) => (
                                        <div key={i}>
                                            <label className="text-[10px] uppercase tracking-wider text-gray-500 mb-1 block">
                                                {f.subtitulo}
                                            </label>
                                            <textarea
                                                value={f.descricao}
                                                onChange={e => {
                                                    const updated = [...fields];
                                                    updated[i] = { ...updated[i], descricao: e.target.value };
                                                    setFields(updated);
                                                }}
                                                placeholder={`Descrever ${f.subtitulo.toLowerCase()}...`}
                                                rows={2}
                                                className="w-full text-sm bg-gray-800/60 border border-border/50 rounded-lg px-3 py-2 text-card-foreground/80 placeholder:text-muted-foreground resize-none focus:outline-none focus:border-gray-600"
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Free text */}
                            <textarea
                                value={freeText}
                                onChange={e => setFreeText(e.target.value)}
                                placeholder={fields.length > 0 ? 'Notas adicionais (opcional)...' : 'Escrever consideração...'}
                                rows={3}
                                className="w-full text-sm bg-gray-800/60 border border-border/50 rounded-lg px-3 py-2 text-card-foreground/80 placeholder:text-muted-foreground resize-none focus:outline-none focus:border-gray-600"
                            />

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2">
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting || !createPhaseId}
                                    className="flex items-center gap-1.5 text-xs px-4 py-2 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 disabled:opacity-40 transition-colors"
                                >
                                    {submitting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                    {submitting ? 'A enviar...' : 'Enviar'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                ) : considerations.length === 0 ? (
                    <div className="text-center py-12">
                        <MessageSquare className="h-10 w-10 mx-auto mb-3 text-gray-700" />
                        <p className="text-sm text-gray-500">Sem considerações</p>
                        <p className="text-xs text-muted-foreground mt-1">Clique em &quot;+ Nova&quot; para criar</p>
                    </div>
                ) : (
                    Object.entries(grouped).map(([phaseId, group]) => (
                        <div key={phaseId} className="mb-4">
                            {/* Phase header */}
                            <div className="flex items-center gap-2 mb-2">
                                <div className="h-px flex-1 bg-muted/50" />
                                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                                    {group.phaseName}
                                </span>
                                <div className="h-px flex-1 bg-muted/50" />
                            </div>

                            {/* Cards */}
                            {group.items.map(c => (
                                <ConsiderationCard
                                    key={c.id}
                                    consideration={c}
                                    isExpanded={expandedCards.has(c.id)}
                                    onToggle={() => toggleCard(c.id)}
                                    onReply={() => startReply(c)}
                                    onHistory={() => setHistoryFor(c)}
                                    onShare={() => setShareFor(c)}
                                    onForwardInside={() => {
                                        setReplyTo(c);
                                        setCreateLado('lab_inside');
                                        setCreatePhaseId(c.phase_id || '');
                                        setCreateStep('compose');
                                    }}
                                />
                            ))}
                        </div>
                    ))
                )}
            </div>

            {/* Version History Modal */}
            {historyFor && (
                <VersionHistory
                    considerationId={historyFor.id}
                    currentFields={historyFor.fields || []}
                    currentConteudo={historyFor.conteudo || ''}
                    currentVersion={historyFor.versao || 1}
                    onClose={() => setHistoryFor(null)}
                />
            )}

            {/* Share Link Modal */}
            {shareFor && (
                <ShareLinkModal
                    considerationId={shareFor.id}
                    currentToken={shareFor.share_token}
                    currentExpires={shareFor.share_expires_at}
                    onClose={() => setShareFor(null)}
                    onRefresh={loadConsiderations}
                />
            )}
        </div>
    );
}

// ===== CONSIDERATION CARD =====
function ConsiderationCard({ consideration: c, isExpanded, onToggle, onReply, onHistory, onShare, onForwardInside }: {
    consideration: any;
    isExpanded: boolean;
    onToggle: () => void;
    onReply: () => void;
    onHistory: () => void;
    onShare: () => void;
    onForwardInside: () => void;
}) {
    const lado = c.lado || 'lab';
    const config = LADO_CONFIG[lado as keyof typeof LADO_CONFIG] || LADO_CONFIG.lab;
    const hasFields = c.fields && Array.isArray(c.fields) && c.fields.length > 0;
    const isResponse = c.tipo === 'resposta';
    const version = c.versao || 1;

    return (
        <div className={`mb-2 rounded-lg border ${config.border} ${config.bg} overflow-hidden transition-all`}>
            {/* Card header — always visible */}
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:brightness-110 transition-all"
            >
                <config.icon className={`h-3.5 w-3.5 ${config.color} flex-shrink-0`} />

                {isResponse && (
                    <Reply className="h-3 w-3 text-gray-500 flex-shrink-0" />
                )}

                <div className="flex-1 min-w-0">
                    {/* Template title or first line of content */}
                    <p className={`text-sm font-medium ${config.color} truncate`}>
                        {c.template?.titulo || (hasFields ? c.fields[0]?.subtitulo : c.conteudo?.substring(0, 60))}
                    </p>

                    {/* Subtitle: author + time */}
                    <p className="text-[10px] text-gray-500 mt-0.5">
                        {c.autor?.full_name || 'Desconhecido'} · {getTimeAgo(c.created_at)}
                        {version > 1 && <span className="ml-1 text-amber-500/60">v{version}</span>}
                    </p>
                </div>

                {/* Attachment indicator */}
                {c.anexo_url && (
                    <Paperclip className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                )}

                <ChevronDown className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
            </button>

            {/* Expanded content */}
            {isExpanded && (
                <div className="px-3 pb-3 border-t border-border/30">
                    {/* Fields */}
                    {hasFields && (
                        <div className="mt-2 space-y-2">
                            {c.fields.map((f: ConsiderationField, i: number) => (
                                <div key={i}>
                                    <span className="text-[10px] uppercase tracking-wider text-gray-500">
                                        {f.subtitulo}
                                    </span>
                                    <p className="text-sm text-card-foreground/80 mt-0.5">
                                        {f.descricao || <span className="text-muted-foreground italic">Sem descrição</span>}
                                    </p>
                                    {/* Field attachments */}
                                    {f.anexos && f.anexos.length > 0 && (
                                        <div className="flex gap-1.5 mt-1">
                                            {f.anexos.map((path, j) => (
                                                <div key={j} className="rounded bg-gray-800/60 p-1">
                                                    <ImageIcon className="h-4 w-4 text-gray-500" />
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Free text */}
                    {c.conteudo && (
                        <div className={`${hasFields ? 'mt-2 pt-2 border-t border-border/30' : 'mt-2'}`}>
                            <p className="text-sm text-card-foreground/80 whitespace-pre-wrap">{c.conteudo}</p>
                        </div>
                    )}

                    {/* Legacy attachment */}
                    {c.anexo_url && (
                        <div className="mt-2 flex items-center gap-2 p-2 bg-gray-800/40 rounded-lg">
                            {c.anexo_tipo?.startsWith('image') ? (
                                <ImageIcon className="h-4 w-4 text-green-400" />
                            ) : (
                                <FileText className="h-4 w-4 text-blue-400" />
                            )}
                            <span className="text-xs text-muted-foreground truncate">{c.anexo_nome || 'Ficheiro'}</span>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-border/30">
                        <button
                            onClick={onReply}
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-amber-400 transition-colors"
                        >
                            <Reply className="h-3 w-3" />
                            Responder
                        </button>
                        <button
                            onClick={onHistory}
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-blue-400 transition-colors"
                        >
                            <History className="h-3 w-3" />
                            Histórico
                        </button>
                        <button
                            onClick={onShare}
                            className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-green-400 transition-colors"
                        >
                            <Share2 className="h-3 w-3" />
                            Partilhar
                        </button>
                        {c.lado !== 'lab_inside' && (
                            <button
                                onClick={onForwardInside}
                                className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-purple-400 transition-colors ml-auto"
                            >
                                <Lock className="h-3 w-3" />
                                Inside
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ===== HELPERS =====
function getTimeAgo(dateString: string): string {
    const now = new Date();
    const date = new Date(dateString);
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short' });
}
