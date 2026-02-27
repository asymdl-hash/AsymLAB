'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    FileText,
    Receipt,
    FileCheck,
    Plus,
    Loader2,
    Download,
    ExternalLink,
    Trash2,
    Upload,
    X,
    MoreVertical,
    ChevronDown,
    ChevronUp,
    Check,
    Image,
    Edit3,
} from 'lucide-react';
import { billingService, Invoice, Receipt as ReceiptType, PatientDocument, INVOICE_STATE_CONFIG, DOC_TYPE_CONFIG, PAYMENT_METHODS } from '@/services/billingService';
import { transportService, TransportGuide, GUIDE_TYPE_CONFIG, GUIDE_STATE_CONFIG, RECEPTION_STATE_CONFIG } from '@/services/transportService';
import { useAuth } from '@/contexts/AuthContext';
import NewInvoiceModal from './NewInvoiceModal';
import NewGuideModal from './NewGuideModal';

interface DocumentsTabProps {
    patientId: string;
}

const DOC_CATEGORIES = [
    { key: 'facturas', label: 'Facturas', icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { key: 'recibos', label: 'Recibos', icon: FileCheck, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { key: 'guias', label: 'Guias', icon: FileText, color: 'text-amber-400', bg: 'bg-amber-500/15' },
    { key: 'documentos', label: 'Documentos', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/15' },
];

export default function DocumentsTab({ patientId }: DocumentsTabProps) {
    const { user } = useAuth();
    const [activeCategory, setActiveCategory] = useState('facturas');
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [receipts, setReceipts] = useState<ReceiptType[]>([]);
    const [documents, setDocuments] = useState<PatientDocument[]>([]);
    const [guides, setGuides] = useState<TransportGuide[]>([]);
    const [loading, setLoading] = useState(true);
    const [showInvoiceModal, setShowInvoiceModal] = useState(false);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const [showGuideModal, setShowGuideModal] = useState<'transporte' | 'recepcao' | null>(null);
    const [showReceiptForm, setShowReceiptForm] = useState<string | null>(null);
    const [receiptValor, setReceiptValor] = useState('');
    const [receiptMetodo, setReceiptMetodo] = useState('transferencia');
    const [savingReceipt, setSavingReceipt] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    // Guide interactions
    const [guideMenuOpen, setGuideMenuOpen] = useState<string | null>(null);
    const [guideExpanded, setGuideExpanded] = useState<string | null>(null);
    const [guideEditNotes, setGuideEditNotes] = useState<string | null>(null);
    const [guideNotesText, setGuideNotesText] = useState('');
    const [guideDeleting, setGuideDeleting] = useState<string | null>(null);
    const [guideSaving, setGuideSaving] = useState(false);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const [inv, rec, docs, gds] = await Promise.all([
                billingService.getInvoices(patientId),
                billingService.getReceipts(patientId),
                billingService.getDocuments(patientId),
                transportService.getGuides(patientId),
            ]);
            setInvoices(inv);
            setReceipts(rec);
            setDocuments(docs);
            setGuides(gds);
        } catch (err) {
            console.error('Erro ao carregar documentos:', err);
        } finally {
            setLoading(false);
        }
    }, [patientId]);

    useEffect(() => { loadData(); }, [loadData]);

    const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        try {
            setUploadingDoc(true);
            await billingService.uploadDocument(patientId, file, {
                nome: file.name,
                tipo: 'outro',
                uploaded_by: user?.id,
            });
            loadData();
        } catch (err) {
            console.error('Erro no upload:', err);
        } finally {
            setUploadingDoc(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleDeleteDoc = async (id: string) => {
        if (!confirm('Apagar este documento?')) return;
        try {
            await billingService.deleteDocument(id);
            setDocuments(prev => prev.filter(d => d.id !== id));
        } catch (err) {
            console.error('Erro ao apagar:', err);
        }
    };

    const handleCreateReceipt = async (invoiceId: string) => {
        if (!receiptValor || parseFloat(receiptValor) <= 0) return;
        try {
            setSavingReceipt(true);
            await billingService.createReceipt({
                invoice_id: invoiceId,
                patient_id: patientId,
                valor: parseFloat(receiptValor),
                metodo_pagamento: receiptMetodo,
                emitido_por: user?.id,
            });
            setShowReceiptForm(null);
            setReceiptValor('');
            loadData();
        } catch (err) {
            console.error('Erro ao criar recibo:', err);
        } finally {
            setSavingReceipt(false);
        }
    };

    const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const formatCurrency = (v: number) => `${v.toFixed(2)} €`;

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-card-foreground/80 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Documentação
                </h3>
                <div className="flex items-center gap-2">
                    {activeCategory === 'facturas' && (
                        <button
                            onClick={() => setShowInvoiceModal(true)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-card-foreground text-xs font-medium transition-colors"
                        >
                            <Plus className="h-3 w-3" /> Factura
                        </button>
                    )}
                    {activeCategory === 'guias' && (
                        <div className="flex gap-1">
                            <button
                                onClick={() => setShowGuideModal('transporte')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-card-foreground text-xs font-medium transition-colors"
                            >
                                🚚 Transporte
                            </button>
                            <button
                                onClick={() => setShowGuideModal('recepcao')}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-card-foreground text-xs font-medium transition-colors"
                            >
                                📦 Recepção
                            </button>
                        </div>
                    )}
                    {activeCategory === 'documentos' && (
                        <label className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-card-foreground text-xs font-medium transition-colors cursor-pointer">
                            {uploadingDoc ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
                            Upload
                            <input ref={fileInputRef} type="file" className="hidden" onChange={handleDocUpload} disabled={uploadingDoc} />
                        </label>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
                {DOC_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    const count = cat.key === 'facturas' ? invoices.length
                        : cat.key === 'recibos' ? receipts.length
                            : documents.length;
                    return (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${activeCategory === cat.key
                                ? `${cat.bg} ${cat.color} border-current`
                                : 'bg-muted/50 border-border text-gray-500 hover:text-muted-foreground hover:border-muted-foreground'
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {cat.label}
                            {count > 0 && (
                                <span className="text-[9px] bg-gray-600/50 rounded-full px-1.5 py-0.5 ml-0.5">
                                    {count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="rounded-xl border border-border/50 bg-muted/30 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-5 w-5 animate-spin text-gray-500" />
                    </div>
                ) : (
                    <>
                        {/* ===== FACTURAS ===== */}
                        {activeCategory === 'facturas' && (
                            invoices.length === 0 ? (
                                <div className="text-center py-12">
                                    <Receipt className="h-10 w-10 mx-auto mb-3 text-emerald-500/20" />
                                    <p className="text-sm text-gray-500">Sem facturas</p>
                                    <p className="text-xs text-muted-foreground mt-1">Clique em &quot;+ Factura&quot; para criar</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700/50">
                                    {invoices.map(inv => {
                                        const state = INVOICE_STATE_CONFIG[inv.estado] || INVOICE_STATE_CONFIG.rascunho;
                                        return (
                                            <div key={inv.id} className="p-4 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-semibold text-card-foreground">{inv.numero}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${state.bg} ${state.color}`}>
                                                                {state.label}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground truncate">
                                                            {inv.descricao || 'Sem descrição'}
                                                            {inv.plan && <span className="text-muted-foreground"> · {inv.plan.nome}</span>}
                                                            {inv.phase && <span className="text-muted-foreground"> · {inv.phase.nome}</span>}
                                                        </p>
                                                        <p className="text-[10px] text-muted-foreground mt-1">{formatDate(inv.created_at)}</p>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-bold text-emerald-400">{formatCurrency(inv.valor)}</span>
                                                        {inv.pdf_url && (
                                                            <a href={inv.pdf_url} target="_blank" rel="noreferrer"
                                                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors">
                                                                <Download className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}
                                                        {inv.estado === 'emitida' && (
                                                            <button
                                                                onClick={() => { setShowReceiptForm(inv.id); setReceiptValor(String(inv.valor)); }}
                                                                className="text-[10px] px-2 py-1 rounded-lg bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 transition-colors font-medium"
                                                            >
                                                                + Recibo
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Inline receipt form */}
                                                {showReceiptForm === inv.id && (
                                                    <div className="mt-3 flex items-center gap-2 p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                                                        <input
                                                            type="number"
                                                            step="0.01"
                                                            value={receiptValor}
                                                            onChange={(e) => setReceiptValor(e.target.value)}
                                                            placeholder="Valor €"
                                                            className="w-24 rounded bg-muted border border-gray-600 text-xs text-card-foreground px-2 py-1.5"
                                                        />
                                                        <select
                                                            value={receiptMetodo}
                                                            onChange={(e) => setReceiptMetodo(e.target.value)}
                                                            className="rounded bg-muted border border-gray-600 text-xs text-card-foreground px-2 py-1.5"
                                                        >
                                                            {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                                                                <option key={k} value={k}>{v}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            onClick={() => handleCreateReceipt(inv.id)}
                                                            disabled={savingReceipt}
                                                            className="px-3 py-1.5 rounded-lg bg-blue-600 text-card-foreground text-xs font-medium hover:bg-blue-500 disabled:opacity-50"
                                                        >
                                                            {savingReceipt ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Emitir'}
                                                        </button>
                                                        <button onClick={() => setShowReceiptForm(null)} className="text-gray-500 hover:text-card-foreground">
                                                            <X className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* ===== RECIBOS ===== */}
                        {activeCategory === 'recibos' && (
                            receipts.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileCheck className="h-10 w-10 mx-auto mb-3 text-blue-500/20" />
                                    <p className="text-sm text-gray-500">Sem recibos</p>
                                    <p className="text-xs text-muted-foreground mt-1">Os recibos são criados a partir das facturas</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700/50">
                                    {receipts.map(rec => (
                                        <div key={rec.id} className="p-4 hover:bg-muted/20 transition-colors">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="text-sm font-semibold text-card-foreground">{rec.numero}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                                                            Pago
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">
                                                        {rec.invoice && `Factura ${rec.invoice.numero}`}
                                                        <span className="text-muted-foreground"> · {PAYMENT_METHODS[rec.metodo_pagamento] || rec.metodo_pagamento}</span>
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-1">{formatDate(rec.emitido_at)}</p>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-blue-400">{formatCurrency(rec.valor)}</span>
                                                    {rec.pdf_url && (
                                                        <a href={rec.pdf_url} target="_blank" rel="noreferrer"
                                                            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors">
                                                            <Download className="h-3.5 w-3.5" />
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* ===== GUIAS ===== */}
                        {activeCategory === 'guias' && (
                            guides.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-amber-500/20" />
                                    <p className="text-sm text-gray-500">Sem guias</p>
                                    <p className="text-xs text-muted-foreground mt-1">Crie uma guia de transporte ou recepção</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700/50">
                                    {guides.map(g => {
                                        const tipo = GUIDE_TYPE_CONFIG[g.tipo] || GUIDE_TYPE_CONFIG.transporte;
                                        const state = GUIDE_STATE_CONFIG[g.estado] || GUIDE_STATE_CONFIG.rascunho;
                                        const recState = g.estado_recepcao ? RECEPTION_STATE_CONFIG[g.estado_recepcao] : null;
                                        const isExpanded = guideExpanded === g.id;
                                        const isMenuOpen = guideMenuOpen === g.id;
                                        const isEditingNotes = guideEditNotes === g.id;
                                        const isConfirmDelete = guideDeleting === g.id;

                                        const handleGuideStateChange = async (newState: string) => {
                                            setGuideSaving(true);
                                            try {
                                                await transportService.updateGuide(g.id, { estado: newState } as Partial<TransportGuide>);
                                                loadData();
                                            } catch (e) { console.error(e); }
                                            setGuideSaving(false);
                                            setGuideMenuOpen(null);
                                        };

                                        const handleReceptionState = async (recState: string) => {
                                            setGuideSaving(true);
                                            try {
                                                await transportService.updateGuide(g.id, { estado: 'recebido', estado_recepcao: recState } as Partial<TransportGuide>);
                                                loadData();
                                            } catch (e) { console.error(e); }
                                            setGuideSaving(false);
                                            setGuideMenuOpen(null);
                                        };

                                        const handleSaveNotes = async () => {
                                            setGuideSaving(true);
                                            try {
                                                await transportService.updateGuide(g.id, { notas: guideNotesText } as Partial<TransportGuide>);
                                                loadData();
                                            } catch (e) { console.error(e); }
                                            setGuideSaving(false);
                                            setGuideEditNotes(null);
                                        };

                                        const handleDeleteGuide = async () => {
                                            setGuideSaving(true);
                                            try {
                                                const { error } = await (await import('@/lib/supabase')).supabase
                                                    .from('transport_guides').delete().eq('id', g.id);
                                                if (!error) loadData();
                                            } catch (e) { console.error(e); }
                                            setGuideSaving(false);
                                            setGuideDeleting(null);
                                        };

                                        return (
                                            <div key={g.id} className="hover:bg-muted/20 transition-colors">
                                                {/* Card header */}
                                                <div className="p-4">
                                                    <div className="flex items-start justify-between gap-3">
                                                        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setGuideExpanded(isExpanded ? null : g.id)}>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-base">{tipo.emoji}</span>
                                                                <span className="text-sm font-semibold text-card-foreground">{g.numero}</span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${tipo.bg} ${tipo.color}`}>
                                                                    {tipo.label}
                                                                </span>
                                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${state.bg} ${state.color}`}>
                                                                    {state.label}
                                                                </span>
                                                                {recState && (
                                                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${recState.color === 'text-emerald-400' ? 'bg-emerald-900/40 text-emerald-300' : recState.color === 'text-red-400' ? 'bg-red-900/40 text-red-300' : 'bg-orange-900/40 text-orange-300'}`}>
                                                                        {recState.emoji} {recState.label}
                                                                    </span>
                                                                )}
                                                                {isExpanded ? <ChevronUp className="h-3 w-3 text-gray-500" /> : <ChevronDown className="h-3 w-3 text-gray-500" />}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground">
                                                                {g.plan && g.plan.nome}
                                                                {g.clinica && <span className="text-muted-foreground"> · {g.clinica.commercial_name}</span>}
                                                            </p>
                                                            {!isExpanded && g.items && g.items.length > 0 && (
                                                                <p className="text-[10px] text-muted-foreground mt-1">
                                                                    {g.items.map(it => `${it.nome}${it.quantidade > 1 ? ` (${it.quantidade})` : ''}`).join(', ')}
                                                                </p>
                                                            )}
                                                            <p className="text-[10px] text-muted-foreground mt-0.5">{formatDate(g.created_at)}</p>
                                                        </div>

                                                        {/* Menu ⋮ */}
                                                        <div className="relative">
                                                            <button
                                                                onClick={() => setGuideMenuOpen(isMenuOpen ? null : g.id)}
                                                                className="p-1 rounded hover:bg-muted text-gray-500 hover:text-card-foreground/80 transition-colors"
                                                            >
                                                                <MoreVertical className="h-4 w-4" />
                                                            </button>
                                                            {isMenuOpen && (
                                                                <div className="absolute right-0 top-8 z-20 bg-muted border border-border rounded-lg shadow-xl py-1 min-w-[180px]">
                                                                    {/* Estado transitions */}
                                                                    {g.estado !== 'enviado' && (
                                                                        <button onClick={() => handleGuideStateChange('enviado')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-amber-400 flex items-center gap-2">
                                                                            📤 Marcar Enviado
                                                                        </button>
                                                                    )}
                                                                    {g.estado !== 'entregue' && (
                                                                        <button onClick={() => handleGuideStateChange('entregue')} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-emerald-400 flex items-center gap-2">
                                                                            ✅ Marcar Entregue
                                                                        </button>
                                                                    )}
                                                                    {g.estado !== 'recebido' && (
                                                                        <>
                                                                            <div className="border-t border-border my-1" />
                                                                            <p className="px-3 py-1 text-[10px] text-gray-500 uppercase tracking-wider">Confirmar Recepção</p>
                                                                            {Object.entries(RECEPTION_STATE_CONFIG).map(([key, cfg]) => (
                                                                                <button key={key} onClick={() => handleReceptionState(key)} className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted ${cfg.color} flex items-center gap-2`}>
                                                                                    {cfg.emoji} {cfg.label}
                                                                                </button>
                                                                            ))}
                                                                        </>
                                                                    )}
                                                                    <div className="border-t border-border my-1" />
                                                                    <button onClick={() => { setGuideEditNotes(g.id); setGuideNotesText(g.notas || ''); setGuideMenuOpen(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-card-foreground/80 flex items-center gap-2">
                                                                        <Edit3 className="h-3 w-3" /> Editar Notas
                                                                    </button>
                                                                    <button onClick={() => { setGuideDeleting(g.id); setGuideMenuOpen(null); }} className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-red-400 flex items-center gap-2">
                                                                        <Trash2 className="h-3 w-3" /> Apagar
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Delete confirmation */}
                                                {isConfirmDelete && (
                                                    <div className="mx-4 mb-3 p-3 bg-red-900/20 border border-red-800/40 rounded-lg">
                                                        <p className="text-xs text-red-300 mb-2">Tem a certeza que quer apagar esta guia?</p>
                                                        <div className="flex gap-2">
                                                            <button onClick={handleDeleteGuide} disabled={guideSaving} className="px-3 py-1 text-xs bg-red-600 hover:bg-red-500 text-card-foreground rounded transition-colors">
                                                                {guideSaving ? 'A apagar...' : 'Apagar'}
                                                            </button>
                                                            <button onClick={() => setGuideDeleting(null)} className="px-3 py-1 text-xs bg-muted hover:bg-muted text-card-foreground/80 rounded transition-colors">
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Edit notes inline */}
                                                {isEditingNotes && (
                                                    <div className="mx-4 mb-3 p-3 bg-gray-800/60 border border-border rounded-lg">
                                                        <textarea
                                                            value={guideNotesText}
                                                            onChange={(e) => setGuideNotesText(e.target.value)}
                                                            placeholder="Notas..."
                                                            rows={3}
                                                            className="w-full bg-card border border-border rounded px-2 py-1.5 text-xs text-card-foreground placeholder-gray-600 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                                        />
                                                        <div className="flex gap-2 mt-2">
                                                            <button onClick={handleSaveNotes} disabled={guideSaving} className="px-3 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-card-foreground rounded transition-colors">
                                                                {guideSaving ? 'A guardar...' : 'Guardar'}
                                                            </button>
                                                            <button onClick={() => setGuideEditNotes(null)} className="px-3 py-1 text-xs bg-muted hover:bg-muted text-card-foreground/80 rounded transition-colors">
                                                                Cancelar
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Expanded details */}
                                                {isExpanded && (
                                                    <div className="mx-4 mb-3 space-y-3">
                                                        {/* Items */}
                                                        {g.items && g.items.length > 0 && (
                                                            <div className="bg-gray-800/40 rounded-lg p-3">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">Itens ({g.items.length})</p>
                                                                <div className="space-y-1">
                                                                    {g.items.map((item, idx) => (
                                                                        <div key={idx} className="flex items-center justify-between text-xs">
                                                                            <span className="text-card-foreground/80">{item.nome}</span>
                                                                            <div className="flex items-center gap-2">
                                                                                {item.quantidade > 1 && (
                                                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">×{item.quantidade}</span>
                                                                                )}
                                                                                {item.observacao && (
                                                                                    <span className="text-[10px] text-muted-foreground italic">{item.observacao}</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Notas */}
                                                        {g.notas && (
                                                            <div className="bg-gray-800/40 rounded-lg p-3">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-1">Notas</p>
                                                                <p className="text-xs text-card-foreground/80 whitespace-pre-wrap">{g.notas}</p>
                                                            </div>
                                                        )}

                                                        {/* Fotos */}
                                                        {g.fotos && g.fotos.length > 0 && (
                                                            <div className="bg-gray-800/40 rounded-lg p-3">
                                                                <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
                                                                    <Image className="h-3 w-3 inline mr-1" /> Fotos ({g.fotos.length})
                                                                </p>
                                                                <div className="flex gap-2 flex-wrap">
                                                                    {g.fotos.map((url, idx) => (
                                                                        <a key={idx} href={url} target="_blank" rel="noreferrer"
                                                                            className="w-16 h-16 rounded-lg overflow-hidden border border-border hover:border-blue-500 transition-colors">
                                                                            <img src={url} alt={`Foto ${idx + 1}`} className="w-full h-full object-cover" />
                                                                        </a>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}

                        {/* ===== DOCUMENTOS ===== */}
                        {activeCategory === 'documentos' && (
                            documents.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="h-10 w-10 mx-auto mb-3 text-purple-500/20" />
                                    <p className="text-sm text-gray-500">Sem documentos</p>
                                    <p className="text-xs text-muted-foreground mt-1">Clique em &quot;Upload&quot; para adicionar</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-700/50">
                                    {documents.map(doc => {
                                        const typeConfig = DOC_TYPE_CONFIG[doc.tipo] || DOC_TYPE_CONFIG.outro;
                                        return (
                                            <div key={doc.id} className="p-4 hover:bg-muted/20 transition-colors">
                                                <div className="flex items-center justify-between gap-3">
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <span className="text-base">{typeConfig.emoji}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-sm text-card-foreground truncate">{doc.nome}</p>
                                                            <p className="text-[10px] text-muted-foreground">{typeConfig.label} · {formatDate(doc.uploaded_at)}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        {doc.file_url && (
                                                            <a href={doc.file_url} target="_blank" rel="noreferrer"
                                                                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-card-foreground transition-colors">
                                                                <ExternalLink className="h-3.5 w-3.5" />
                                                            </a>
                                                        )}
                                                        <button
                                                            onClick={() => handleDeleteDoc(doc.id)}
                                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )
                        )}
                    </>
                )}
            </div>

            {/* Invoice Modal */}
            {showInvoiceModal && (
                <NewInvoiceModal
                    patientId={patientId}
                    onClose={() => setShowInvoiceModal(false)}
                    onCreated={() => { setShowInvoiceModal(false); loadData(); }}
                />
            )}

            {/* Guide Modal */}
            {showGuideModal && (
                <NewGuideModal
                    patientId={patientId}
                    tipo={showGuideModal}
                    onClose={() => setShowGuideModal(null)}
                    onCreated={() => { setShowGuideModal(null); loadData(); }}
                />
            )}
        </div>
    );
}
