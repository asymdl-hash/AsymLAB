'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    MessageSquare,
    Send,
    Paperclip,
    X,
    Minimize2,
    Maximize2,
    Image as ImageIcon,
    Loader2,
    ChevronDown,
    ChevronUp,
    Reply,
    ZoomIn,
    ChevronLeft,
    ChevronRight,
    Search,
} from 'lucide-react';
import { chatService, ChatMessage, ChatAttachment } from '@/services/chatService';

// ===== TYPES =====
interface ChatDrawerProps {
    patientId: string;
    patientName: string;
    isOpen: boolean;
    onClose: () => void;
    activePlanName?: string;
    activePhaseName?: string;
}

// ===== GALLERY MODAL =====
function ChatGallery({
    images,
    initialIndex,
    onClose,
    onGoToMessage,
}: {
    images: { url: string; messageId: string; senderName: string; date: string }[];
    initialIndex: number;
    onClose: () => void;
    onGoToMessage: (messageId: string) => void;
}) {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const current = images[currentIndex];

    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft' && currentIndex > 0) setCurrentIndex(currentIndex - 1);
            if (e.key === 'ArrowRight' && currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [currentIndex, images.length, onClose]);

    return (
        <div className="fixed inset-0 bg-black/90 z-[9999] flex flex-col" onClick={onClose}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 text-white" onClick={(e) => e.stopPropagation()}>
                <div>
                    <p className="text-sm font-medium">{current?.senderName}</p>
                    <p className="text-xs text-gray-400">{current?.date}</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-400">{currentIndex + 1} / {images.length}</span>
                    <button
                        onClick={() => { onGoToMessage(current?.messageId); onClose(); }}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        Ir para mensagem
                    </button>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Image */}
            <div className="flex-1 flex items-center justify-center px-16 relative" onClick={(e) => e.stopPropagation()}>
                {currentIndex > 0 && (
                    <button
                        onClick={() => setCurrentIndex(currentIndex - 1)}
                        className="absolute left-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ChevronLeft className="h-6 w-6 text-white" />
                    </button>
                )}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={current?.url}
                    alt={`Imagem ${currentIndex + 1}`}
                    className="max-h-[80vh] max-w-full object-contain rounded-lg"
                />
                {currentIndex < images.length - 1 && (
                    <button
                        onClick={() => setCurrentIndex(currentIndex + 1)}
                        className="absolute right-4 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                    >
                        <ChevronRight className="h-6 w-6 text-white" />
                    </button>
                )}
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
                <div className="flex items-center justify-center gap-2 px-6 py-4 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
                    {images.map((img, i) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                            key={i}
                            src={img.url}
                            alt={`Thumb ${i + 1}`}
                            onClick={() => setCurrentIndex(i)}
                            className={`h-14 w-14 object-cover rounded-lg cursor-pointer transition-all ${i === currentIndex ? 'ring-2 ring-amber-500 opacity-100' : 'opacity-50 hover:opacity-75'
                                }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// ===== MESSAGE CARD =====
function MessageCard({
    message,
    isOwn,
    onReply,
    onImageClick,
}: {
    message: ChatMessage;
    isOwn: boolean;
    onReply: (msg: ChatMessage) => void;
    onImageClick: (url: string) => void;
}) {
    const timeStr = new Date(message.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });

    // Cores por role
    const roleColors: Record<string, { bg: string; accent: string; text: string }> = {
        admin: { bg: 'bg-amber-50', accent: 'border-l-amber-400', text: 'text-amber-700' },
        staff_lab: { bg: 'bg-blue-50', accent: 'border-l-blue-400', text: 'text-blue-700' },
        staff_clinic: { bg: 'bg-orange-50', accent: 'border-l-orange-400', text: 'text-orange-700' },
    };
    const colors = roleColors[message.sender_role] || roleColors.staff_lab;

    if (message.message_type === 'system') {
        return (
            <div className="flex justify-center my-2">
                <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{message.content}</span>
            </div>
        );
    }

    return (
        <div className={`group flex flex-col ${isOwn ? 'items-end' : 'items-start'} mb-3`}>
            <div
                className={`max-w-[85%] rounded-xl px-3 py-2 border-l-3 ${colors.bg} ${colors.accent} shadow-sm`}
            >
                {/* Sender name */}
                {!isOwn && (
                    <p className={`text-[10px] font-semibold ${colors.text} mb-0.5`}>{message.sender_name}</p>
                )}

                {/* Reply indicator */}
                {message.reply_to && (
                    <div className="text-[10px] text-gray-400 bg-gray-100 rounded px-2 py-1 mb-1 border-l-2 border-gray-300 italic truncate">
                        Resposta a mensagem
                    </div>
                )}

                {/* Content */}
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">{message.content}</p>

                {/* Attachments */}
                {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                        {message.attachments.map((att, i) => (
                            att.type?.startsWith('image/') ? (
                                <button key={i} onClick={() => onImageClick(att.url)} className="relative group/img">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src={att.url}
                                        alt={att.filename}
                                        className="h-20 w-20 object-cover rounded-lg border border-gray-200 hover:border-amber-300 transition-colors"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover/img:bg-black/20 rounded-lg transition-colors">
                                        <ZoomIn className="h-4 w-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                                    </div>
                                </button>
                            ) : (
                                <a key={i} href={att.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 underline">
                                    📎 {att.filename}
                                </a>
                            )
                        ))}
                    </div>
                )}

                {/* Time + actions */}
                <div className="flex items-center justify-between mt-1">
                    <span className="text-[9px] text-gray-400">{timeStr}</span>
                    <button
                        onClick={() => onReply(message)}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 rounded transition-all"
                        title="Responder"
                    >
                        <Reply className="h-3 w-3 text-gray-400" />
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===== MAIN CHAT DRAWER =====
export default function ChatDrawer({ patientId, patientName, isOpen, onClose, activePlanName, activePhaseName }: ChatDrawerProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<ChatAttachment[]>([]);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [galleryIndex, setGalleryIndex] = useState(0);
    const [minimized, setMinimized] = useState(false);
    const [messageCount, setMessageCount] = useState(0);
    // F5b: Search
    const [searchMode, setSearchMode] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    // F5b: Mobile
    const [isMobile, setIsMobile] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // F5b: Detect mobile viewport
    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    // F5b: Search handler with debounce
    useEffect(() => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setSearchResults([]);
            setActiveSearchIndex(0);
            return;
        }
        const timer = setTimeout(async () => {
            const results = await chatService.searchMessages(patientId, searchQuery);
            setSearchResults(results);
            setActiveSearchIndex(0);
            // Scroll to first result
            if (results.length > 0) {
                const el = document.getElementById(`msg-${results[0].id}`);
                el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }, 300);
        return () => clearTimeout(timer);
    }, [searchQuery, patientId]);

    // F5b: Navigate search results
    const navigateSearch = useCallback((direction: 'up' | 'down') => {
        if (searchResults.length === 0) return;
        const newIndex = direction === 'down'
            ? Math.min(activeSearchIndex + 1, searchResults.length - 1)
            : Math.max(activeSearchIndex - 1, 0);
        setActiveSearchIndex(newIndex);
        const msg = searchResults[newIndex];
        const el = document.getElementById(`msg-${msg.id}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2000);
        }
    }, [searchResults, activeSearchIndex]);

    // F5b: Context label
    const contextLabel = useMemo(() => {
        const parts: string[] = [];
        if (activePlanName) parts.push(activePlanName);
        if (activePhaseName) parts.push(activePhaseName);
        return parts.length > 0 ? parts.join(' · ') : null;
    }, [activePlanName, activePhaseName]);

    // Scroll to bottom
    const scrollToBottom = useCallback(() => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
    }, []);

    // Load messages
    useEffect(() => {
        if (!isOpen || !patientId) return;

        const loadMessages = async () => {
            setLoading(true);
            const msgs = await chatService.getMessages(patientId);
            setMessages(msgs);
            setMessageCount(msgs.length);
            setLoading(false);
            scrollToBottom();
        };

        loadMessages();

        // Realtime subscription
        const unsubscribe = chatService.subscribeToMessages(patientId, (newMsg) => {
            setMessages(prev => {
                // Evitar duplicados
                if (prev.some(m => m.id === newMsg.id)) return prev;
                return [...prev, newMsg];
            });
            setMessageCount(prev => prev + 1);
            scrollToBottom();
        });

        return unsubscribe;
    }, [isOpen, patientId, scrollToBottom]);

    // Scroll to message (from gallery)
    const scrollToMessage = useCallback((messageId: string) => {
        const el = document.getElementById(`msg-${messageId}`);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-2', 'ring-amber-400');
            setTimeout(() => el.classList.remove('ring-2', 'ring-amber-400'), 2000);
        }
    }, []);

    // All images for gallery
    const allImages = messages.flatMap(msg =>
        (msg.attachments || [])
            .filter(a => a.type?.startsWith('image/'))
            .map(a => ({
                url: a.url,
                messageId: msg.id,
                senderName: msg.sender_name,
                date: new Date(msg.created_at).toLocaleDateString('pt-PT'),
            }))
    );

    // Send message
    const handleSend = async () => {
        const trimmed = input.trim();
        if (!trimmed && pendingAttachments.length === 0) return;

        setSending(true);
        const msg = await chatService.sendMessage({
            patientId,
            content: trimmed || (pendingAttachments.length > 0 ? '📎' : ''),
            messageType: pendingAttachments.some(a => a.type?.startsWith('image/')) ? 'image' : 'text',
            attachments: pendingAttachments,
            replyTo: replyTo?.id,
        });

        if (msg) {
            setInput('');
            setReplyTo(null);
            setPendingAttachments([]);
            scrollToBottom();
        }
        setSending(false);
        inputRef.current?.focus();
    };

    // File upload
    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files || []);
        if (files.length === 0) return;

        setUploading(true);
        for (const file of files) {
            const attachment = await chatService.uploadAttachment(patientId, file);
            if (attachment) {
                setPendingAttachments(prev => [...prev, attachment]);
            }
        }
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    // Key handler
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Date grouping
    const getDateLabel = (dateStr: string) => {
        const date = new Date(dateStr);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) return 'Hoje';
        if (date.toDateString() === yesterday.toDateString()) return 'Ontem';
        return date.toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
    };

    if (!isOpen) return null;

    // Minimized state
    if (minimized) {
        return (
            <div className="fixed bottom-4 right-4 z-50">
                <button
                    onClick={() => setMinimized(false)}
                    className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-2xl shadow-lg hover:bg-blue-700 transition-colors"
                >
                    <MessageSquare className="h-5 w-5" />
                    <span className="text-sm font-medium">Chat</span>
                    {messageCount > 0 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/20">{messageCount}</span>
                    )}
                </button>
            </div>
        );
    }

    // F5b: Mobile-specific classes
    const drawerClasses = isMobile
        ? 'fixed bottom-0 left-0 right-0 h-[85vh] z-50 border-t border-gray-200 bg-white flex flex-col shadow-2xl rounded-t-2xl'
        : 'fixed right-0 top-0 h-screen w-[370px] z-50 border-l border-gray-200 bg-white flex flex-col shadow-2xl';

    return (
        <>
            {/* Backdrop — click to close */}
            <div
                className="fixed inset-0 bg-black/10 z-40"
                onClick={onClose}
            />

            {/* Drawer — fixed panel (right on desktop, bottom on mobile) */}
            <div className={drawerClasses}>
                {/* Mobile drag handle */}
                {isMobile && (
                    <div className="flex justify-center py-2 cursor-grab" onClick={onClose}>
                        <div className="w-10 h-1 bg-gray-300 rounded-full" />
                    </div>
                )}
                {/* Header */}
                <div className="flex flex-col border-b border-gray-200 bg-gradient-to-r from-blue-50 to-sky-50">
                    <div className="flex items-center justify-between px-4 py-3">
                        <div className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4 text-blue-600" />
                            <div>
                                <h3 className="text-sm font-semibold text-gray-800">Chat Interno</h3>
                                <p className="text-[10px] text-gray-500">{messageCount} mensagens</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={() => { setSearchMode(!searchMode); if (!searchMode) setTimeout(() => searchInputRef.current?.focus(), 100); }}
                                className={`p-1.5 rounded-lg transition-colors ${searchMode ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-500'}`}
                                title="Pesquisar"
                            >
                                <Search className="h-4 w-4" />
                            </button>
                            {!isMobile && (
                                <button
                                    onClick={() => setMinimized(true)}
                                    className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                    title="Minimizar"
                                >
                                    <Minimize2 className="h-4 w-4 text-gray-500" />
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Fechar"
                            >
                                <X className="h-4 w-4 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* F5b: Context badge */}
                    {contextLabel && (
                        <div className="px-4 pb-2">
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-medium">
                                📋 {contextLabel}
                            </span>
                        </div>
                    )}

                    {/* F5b: Search bar */}
                    {searchMode && (
                        <div className="px-3 pb-2 flex items-center gap-2">
                            <input
                                ref={searchInputRef}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Pesquisar mensagens..."
                                className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 bg-white placeholder:text-gray-400"
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') navigateSearch('down');
                                    if (e.key === 'Escape') { setSearchMode(false); setSearchQuery(''); setSearchResults([]); }
                                }}
                            />
                            {searchResults.length > 0 && (
                                <>
                                    <span className="text-[10px] text-gray-500 whitespace-nowrap">
                                        {activeSearchIndex + 1}/{searchResults.length}
                                    </span>
                                    <button onClick={() => navigateSearch('up')} className="p-1 hover:bg-gray-100 rounded" title="Anterior">
                                        <ChevronUp className="h-3.5 w-3.5 text-gray-500" />
                                    </button>
                                    <button onClick={() => navigateSearch('down')} className="p-1 hover:bg-gray-100 rounded" title="Seguinte">
                                        <ChevronDown className="h-3.5 w-3.5 text-gray-500" />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={() => { setSearchMode(false); setSearchQuery(''); setSearchResults([]); }}
                                className="p-1 hover:bg-gray-100 rounded"
                            >
                                <X className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Messages area */}
                <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
                        </div>
                    ) : messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <MessageSquare className="h-10 w-10 text-gray-300 mb-3" />
                            <p className="text-sm font-medium text-gray-500">Sem mensagens</p>
                            <p className="text-xs text-gray-400 mt-1">Inicie uma conversa sobre {patientName}</p>
                        </div>
                    ) : (
                        <>
                            {messages.map((msg, i) => {
                                // Date separator
                                const showDate = i === 0 ||
                                    getDateLabel(msg.created_at) !== getDateLabel(messages[i - 1].created_at);

                                return (
                                    <div key={msg.id} id={`msg-${msg.id}`}>
                                        {showDate && (
                                            <div className="flex justify-center my-3">
                                                <span className="text-[10px] text-gray-400 bg-gray-100 px-3 py-1 rounded-full font-medium">
                                                    {getDateLabel(msg.created_at)}
                                                </span>
                                            </div>
                                        )}
                                        <MessageCard
                                            message={msg}
                                            isOwn={false} // TODO: compare with current user id
                                            onReply={setReplyTo}
                                            onImageClick={(url) => {
                                                const idx = allImages.findIndex(img => img.url === url);
                                                setGalleryIndex(idx >= 0 ? idx : 0);
                                                setGalleryOpen(true);
                                            }}
                                        />
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Reply indicator */}
                {replyTo && (
                    <div className="px-3 py-2 border-t border-gray-100 bg-blue-50/50 flex items-center gap-2">
                        <Reply className="h-3 w-3 text-blue-400 shrink-0" />
                        <p className="text-xs text-gray-500 truncate flex-1">
                            Responder a <span className="font-medium">{replyTo.sender_name}</span>: {replyTo.content.substring(0, 50)}
                        </p>
                        <button onClick={() => setReplyTo(null)} className="p-1 hover:bg-blue-100 rounded">
                            <X className="h-3 w-3 text-gray-400" />
                        </button>
                    </div>
                )}

                {/* Pending attachments */}
                {pendingAttachments.length > 0 && (
                    <div className="px-3 py-2 border-t border-gray-100 flex gap-2 overflow-x-auto">
                        {pendingAttachments.map((att, i) => (
                            <div key={i} className="relative shrink-0">
                                {att.type?.startsWith('image/') ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img src={att.url} alt={att.filename} className="h-14 w-14 object-cover rounded-lg border border-gray-200" />
                                ) : (
                                    <div className="h-14 w-14 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-200">
                                        <Paperclip className="h-4 w-4 text-gray-400" />
                                    </div>
                                )}
                                <button
                                    onClick={() => setPendingAttachments(prev => prev.filter((_, idx) => idx !== i))}
                                    className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5"
                                >
                                    <X className="h-2.5 w-2.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Input area */}
                <div className="border-t border-gray-200 px-3 py-3 bg-gray-50">
                    <div className="flex items-end gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileSelect}
                            accept="image/*,.pdf"
                            multiple
                            className="hidden"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="p-2 hover:bg-gray-200 rounded-lg transition-colors shrink-0"
                            title="Anexar ficheiro"
                        >
                            {uploading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-400" />
                            ) : (
                                <Paperclip className="h-4 w-4 text-gray-500" />
                            )}
                        </button>

                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Escrever mensagem..."
                            rows={1}
                            className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2 resize-none focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-300 bg-white max-h-24 placeholder:text-gray-400"
                        />

                        <button
                            onClick={handleSend}
                            disabled={sending || (!input.trim() && pendingAttachments.length === 0)}
                            className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            title="Enviar"
                        >
                            {sending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4" />
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Gallery Modal */}
            {galleryOpen && allImages.length > 0 && (
                <ChatGallery
                    images={allImages}
                    initialIndex={galleryIndex}
                    onClose={() => setGalleryOpen(false)}
                    onGoToMessage={scrollToMessage}
                />
            )}
        </>
    );
}
