'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { badgeService, PlanBadge, WorkStatus, CATEGORY_COLORS } from '@/services/badgeService';
import { useAuth } from '@/contexts/AuthContext';

interface WorkBadgesProps {
    planId: string;
    mode?: 'compact' | 'full';
    maxVisible?: number;
    onBadgesChange?: () => void;
}

export default function WorkBadges({ planId, mode = 'compact', maxVisible = 4, onBadgesChange }: WorkBadgesProps) {
    const [badges, setBadges] = useState<PlanBadge[]>([]);
    const [catalog, setCatalog] = useState<WorkStatus[]>([]);
    const [showPicker, setShowPicker] = useState(false);
    const [loading, setLoading] = useState(true);
    const [filterCat, setFilterCat] = useState<string | null>(null);
    const pickerRef = useRef<HTMLDivElement>(null);
    const { user } = useAuth();

    const loadBadges = useCallback(async () => {
        try {
            const data = await badgeService.getPlanBadges(planId);
            setBadges(data);
        } catch { /* silent */ }
        setLoading(false);
    }, [planId]);

    useEffect(() => {
        loadBadges();
    }, [loadBadges]);

    // Carregar catálogo quando abre picker
    const openPicker = async () => {
        if (catalog.length === 0) {
            try {
                const data = await badgeService.getStatusCatalog();
                setCatalog(data);
            } catch { /* silent */ }
        }
        setShowPicker(true);
    };

    // Click outside fecha picker
    useEffect(() => {
        if (!showPicker) return;
        const handler = (e: MouseEvent) => {
            if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
                setShowPicker(false);
                setFilterCat(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showPicker]);

    const handleToggle = async (statusId: string) => {
        const wasAdded = await badgeService.toggleBadge(planId, statusId, user?.id);
        // Optimistic update
        if (wasAdded) {
            const status = catalog.find(s => s.id === statusId);
            if (status) {
                setBadges(prev => [...prev, {
                    id: 'temp-' + statusId,
                    plan_id: planId,
                    status_id: statusId,
                    added_at: new Date().toISOString(),
                    added_by: user?.id || null,
                    status,
                }]);
            }
        } else {
            setBadges(prev => prev.filter(b => b.status_id !== statusId));
        }
        onBadgesChange?.();
    };

    const handleRemove = async (statusId: string) => {
        await badgeService.removeBadge(planId, statusId, user?.id);
        setBadges(prev => prev.filter(b => b.status_id !== statusId));
        onBadgesChange?.();
    };

    if (loading || badges.length === 0 && mode === 'compact') return null;

    // Status já activos (para marcar no picker)
    const activeStatusIds = new Set(badges.map(b => b.status_id));

    // Filtrar catálogo por categoria
    const filteredCatalog = filterCat
        ? catalog.filter(s => s.categoria === filterCat)
        : catalog;

    // Categorias únicas
    const categories = [...new Set(catalog.map(s => s.categoria))];

    const visibleBadges = mode === 'compact' ? badges.slice(0, maxVisible) : badges;
    const extraCount = badges.length - maxVisible;

    return (
        <div className="relative">
            {/* === BADGES DISPLAY === */}
            <div className="flex items-center gap-1 flex-wrap">
                {visibleBadges.map(badge => {
                    const colors = CATEGORY_COLORS[badge.status.categoria] || CATEGORY_COLORS.producao;
                    return (
                        <span
                            key={badge.id}
                            className={cn(
                                "inline-flex items-center gap-0.5 rounded-full border transition-all",
                                colors.bg, colors.text, colors.border,
                                mode === 'compact'
                                    ? "text-[9px] px-1.5 py-0.5"
                                    : "text-[11px] px-2 py-0.5 group cursor-pointer hover:opacity-80"
                            )}
                            onClick={mode === 'full' ? () => handleRemove(badge.status_id) : undefined}
                            title={mode === 'full' ? `Clique para remover: ${badge.status.nome}` : badge.status.nome}
                        >
                            <span>{badge.status.emoji}</span>
                            {mode === 'full' && (
                                <>
                                    <span className="font-medium">{badge.status.nome}</span>
                                    <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity ml-0.5" />
                                </>
                            )}
                        </span>
                    );
                })}

                {/* Overflow indicator (compact) */}
                {mode === 'compact' && extraCount > 0 && (
                    <span className="text-[9px] text-gray-500 font-medium">
                        +{extraCount}
                    </span>
                )}

                {/* Add button (full mode) */}
                {mode === 'full' && (
                    <button
                        onClick={openPicker}
                        className="inline-flex items-center gap-0.5 text-[11px] px-2 py-0.5 rounded-full border border-dashed border-gray-600 text-muted-foreground hover:text-white hover:border-gray-400 transition-colors"
                    >
                        <Plus className="h-3 w-3" />
                        Badge
                    </button>
                )}
            </div>

            {/* === PICKER DROPDOWN === */}
            {showPicker && (
                <div
                    ref={pickerRef}
                    className="absolute top-full left-0 mt-1 z-50 w-72 bg-muted border border-border rounded-xl shadow-2xl overflow-hidden"
                >
                    {/* Category tabs */}
                    <div className="flex items-center gap-1 p-2 border-b border-border overflow-x-auto">
                        <button
                            onClick={() => setFilterCat(null)}
                            className={cn(
                                "text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors font-medium",
                                !filterCat
                                    ? "bg-amber-500/20 text-amber-400"
                                    : "text-muted-foreground hover:text-white"
                            )}
                        >
                            Todos
                        </button>
                        {categories.map(cat => {
                            const colors = CATEGORY_COLORS[cat];
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setFilterCat(cat)}
                                    className={cn(
                                        "text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors font-medium",
                                        filterCat === cat
                                            ? `${colors.bg} ${colors.text}`
                                            : "text-muted-foreground hover:text-white"
                                    )}
                                >
                                    {colors.emoji} {colors.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Status list */}
                    <div className="max-h-60 overflow-y-auto p-1">
                        {filteredCatalog.map(status => {
                            const isActive = activeStatusIds.has(status.id);
                            const colors = CATEGORY_COLORS[status.categoria];
                            return (
                                <button
                                    key={status.id}
                                    onClick={() => handleToggle(status.id)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left transition-colors text-sm",
                                        isActive
                                            ? `${colors.bg} ${colors.text}`
                                            : "text-foreground/80 hover:bg-muted/50"
                                    )}
                                >
                                    <span className="w-5 text-center">{status.emoji}</span>
                                    <span className="flex-1 text-xs font-medium">{status.nome}</span>
                                    {isActive && (
                                        <span className="text-[10px] font-bold text-emerald-400">✓</span>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Close */}
                    <div className="p-2 border-t border-border">
                        <button
                            onClick={() => { setShowPicker(false); setFilterCat(null); }}
                            className="w-full text-[11px] text-muted-foreground hover:text-white py-1 transition-colors"
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
