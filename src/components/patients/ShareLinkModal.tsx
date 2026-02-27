'use client';

import { useState } from 'react';
import { Share2, Copy, CheckCheck, Clock, ExternalLink, X, RefreshCw } from 'lucide-react';
import { considerationsService } from '@/services/considerationsService';

interface ShareLinkModalProps {
    considerationId: string;
    currentToken?: string;
    currentExpires?: string;
    onClose: () => void;
    onRefresh: () => void;
}

export default function ShareLinkModal({
    considerationId,
    currentToken,
    currentExpires,
    onClose,
    onRefresh,
}: ShareLinkModalProps) {
    const [token, setToken] = useState(currentToken || '');
    const [expires, setExpires] = useState(currentExpires || '');
    const [expiryDays, setExpiryDays] = useState(90);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const shareUrl = token
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/share/c/${token}`
        : '';

    const isExpired = expires ? new Date(expires) < new Date() : false;

    const handleGenerate = async () => {
        try {
            setGenerating(true);
            const newToken = await considerationsService.generateShareLink(considerationId, expiryDays);
            if (newToken) {
                setToken(newToken);
                const newExpiry = new Date();
                newExpiry.setDate(newExpiry.getDate() + expiryDays);
                setExpires(newExpiry.toISOString());
            }
            onRefresh();
        } catch (err) {
            console.error('Error generating share link:', err);
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = async () => {
        if (!shareUrl) return;
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // Fallback
            const textarea = document.createElement('textarea');
            textarea.value = shareUrl;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-card border border-border/50 rounded-xl w-full max-w-md overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border/50">
                    <h3 className="text-sm font-semibold text-foreground/80 flex items-center gap-2">
                        <Share2 className="h-4 w-4 text-green-400" />
                        Link de Partilha
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-foreground/80 text-xs">
                        Fechar ✕
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Info */}
                    <p className="text-xs text-gray-500">
                        Gera um link público que permite ver esta consideração sem login — com fotos, vídeos e viewer 3D interactivo.
                    </p>

                    {/* Expiry selector */}
                    <div>
                        <label className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 block">Expiração</label>
                        <div className="flex gap-2">
                            {[30, 60, 90, 180].map(d => (
                                <button
                                    key={d}
                                    onClick={() => setExpiryDays(d)}
                                    className={`text-xs px-3 py-1.5 rounded-md transition-colors ${expiryDays === d
                                        ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                                        : 'text-gray-500 hover:text-muted-foreground border border-border/50'
                                        }`}
                                >
                                    {d}d
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Generate / Regenerate */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className="w-full flex items-center justify-center gap-2 text-sm px-4 py-2.5 bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/20 disabled:opacity-40 transition-colors"
                    >
                        <RefreshCw className={`h-4 w-4 ${generating ? 'animate-spin' : ''}`} />
                        {token ? 'Regenerar Link' : 'Gerar Link'}
                    </button>

                    {/* Link display */}
                    {token && (
                        <>
                            <div className="bg-gray-800/60 rounded-lg p-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={shareUrl}
                                        readOnly
                                        className="flex-1 text-xs bg-transparent text-foreground/80 outline-none"
                                    />
                                    <button
                                        onClick={handleCopy}
                                        className="flex-shrink-0 text-gray-500 hover:text-green-400 transition-colors"
                                    >
                                        {copied ? <CheckCheck className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                                    </button>
                                </div>

                                {/* Status */}
                                <div className="flex items-center gap-2 mt-2 text-[10px]">
                                    <Clock className="h-3 w-3" />
                                    {isExpired ? (
                                        <span className="text-red-400">Expirado — regenere o link</span>
                                    ) : (
                                        <span className="text-gray-500">
                                            Expira {new Date(expires).toLocaleDateString('pt-PT', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Quick share buttons */}
                            <div className="flex gap-2">
                                <a
                                    href={`https://wa.me/?text=${encodeURIComponent(`📋 Consideração — ver detalhes:\n${shareUrl}`)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-green-600/10 text-green-400 border border-green-600/30 rounded-lg hover:bg-green-600/20 transition-colors"
                                >
                                    📲 WhatsApp
                                </a>
                                <a
                                    href={`mailto:?subject=Consideração&body=${encodeURIComponent(`Veja os detalhes da consideração:\n${shareUrl}`)}`}
                                    className="flex-1 flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-blue-500/10 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/20 transition-colors"
                                >
                                    ✉️ Email
                                </a>
                                <a
                                    href={shareUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center justify-center gap-1.5 text-xs px-3 py-2 bg-gray-700/30 text-muted-foreground border border-border/50 rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
