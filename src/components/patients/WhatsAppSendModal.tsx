'use client';

import { useState } from 'react';
import { X, Send, MessageCircle, Loader2, FileText, Check } from 'lucide-react';

interface WhatsAppSendModalProps {
    isOpen: boolean;
    onClose: () => void;
    groupId: string;
    /** Info header — ex: "T-0042 João Silva" */
    patientInfo: string;
    /** Resumo automático gerado pelo widget (ex: dentes, material, etc.) */
    autoSummary: string;
    /** URL do PDF a enviar (se disponível, será enviado como documento) */
    pdfUrl?: string;
    /** Nome do ficheiro PDF */
    pdfFileName?: string;
}

export default function WhatsAppSendModal({
    isOpen,
    onClose,
    groupId,
    patientInfo,
    autoSummary,
    pdfUrl,
    pdfFileName,
}: WhatsAppSendModalProps) {
    const [description, setDescription] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');

    if (!isOpen) return null;

    const handleSend = async () => {
        setSending(true);
        setError('');
        try {
            // 1. Enviar mensagem de texto com descrição
            const textMessage = [
                `📋 *AsymLAB* — ${patientInfo}`,
                autoSummary,
                description ? `\n💬 ${description}` : '',
            ].filter(Boolean).join('\n');

            const textRes = await fetch('/api/whatsapp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ groupId, message: textMessage }),
            });

            if (!textRes.ok) {
                throw new Error('Falha ao enviar mensagem de texto');
            }

            // 2. Se tiver PDF, enviar como documento
            if (pdfUrl) {
                const docRes = await fetch('/api/whatsapp/send', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        groupId,
                        documentUrl: pdfUrl,
                        fileName: pdfFileName || 'documento.pdf',
                        caption: description || patientInfo,
                    }),
                });

                if (!docRes.ok) {
                    throw new Error('Falha ao enviar PDF');
                }
            }

            setSent(true);
            setTimeout(() => {
                setSent(false);
                setDescription('');
                onClose();
            }, 2000);
        } catch (err) {
            console.error('[WhatsApp Modal] Erro:', err);
            setError(err instanceof Error ? err.message : 'Erro ao enviar');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-[420px] max-w-[95vw] overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-green-500 to-green-600 px-5 py-4 flex items-center gap-3">
                    <MessageCircle className="h-5 w-5 text-white" />
                    <div className="flex-1 min-w-0">
                        <h3 className="text-white font-semibold text-sm">Enviar via WhatsApp</h3>
                        <p className="text-white/80 text-xs truncate">{patientInfo}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-white/70 hover:text-white transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Conteúdo */}
                <div className="p-5 space-y-4">
                    {/* Resumo automático (readonly) */}
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Resumo automático</p>
                        <p className="text-xs text-gray-600 whitespace-pre-line leading-relaxed">{autoSummary}</p>
                    </div>

                    {/* PDF attachment indicator */}
                    {pdfUrl && (
                        <div className="flex items-center gap-2 bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                            <FileText className="h-4 w-4 text-red-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-red-700 truncate">{pdfFileName || 'documento.pdf'}</p>
                                <p className="text-[10px] text-red-400">PDF será enviado como documento</p>
                            </div>
                        </div>
                    )}

                    {/* Descrição do utilizador */}
                    <div>
                        <label className="text-xs font-medium text-gray-600 mb-1.5 block">
                            Mensagem adicional <span className="text-gray-400">(opcional)</span>
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Ex: Favor verificar ajuste oclusal no dente 14..."
                            rows={3}
                            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-500 text-gray-800 placeholder:text-gray-400 resize-none"
                            autoFocus
                            disabled={sending || sent}
                        />
                    </div>

                    {/* Erro */}
                    {error && (
                        <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">⚠️ {error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex gap-2">
                    <button
                        onClick={onClose}
                        disabled={sending}
                        className="flex-1 text-sm px-4 py-2.5 text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-colors disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={sending || sent}
                        className={`flex-1 text-sm px-4 py-2.5 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${sent
                                ? 'bg-green-100 text-green-700'
                                : 'bg-green-500 text-white hover:bg-green-600 shadow-lg shadow-green-500/25'
                            } disabled:opacity-70`}
                    >
                        {sent ? (
                            <>
                                <Check className="h-4 w-4" />
                                Enviado!
                            </>
                        ) : sending ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                A enviar...
                            </>
                        ) : (
                            <>
                                <Send className="h-4 w-4" />
                                Enviar {pdfUrl ? '+ PDF' : ''}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
