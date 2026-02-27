'use client';

import { useState } from 'react';
import { QueueItem } from '@/services/queueService';
import QueueCard from './QueueCard';
import { cn } from '@/lib/utils';

interface QueueColumnProps {
    title: string;
    color: string;
    icon: string;
    columnKey: string;
    items: QueueItem[];
    onDrop: (planId: string, fromEstado: string, toEstado: string) => void;
}

const COLOR_MAP: Record<string, { header: string; border: string; dot: string; count: string; dropHighlight: string }> = {
    emerald: {
        header: 'bg-emerald-900/30 border-emerald-700',
        border: 'border-emerald-700',
        dot: 'bg-emerald-500',
        count: 'text-emerald-400 bg-emerald-500/20',
        dropHighlight: 'bg-emerald-900/30 border-emerald-500',
    },
    amber: {
        header: 'bg-amber-900/30 border-amber-700',
        border: 'border-amber-700',
        dot: 'bg-amber-500',
        count: 'text-amber-400 bg-amber-500/20',
        dropHighlight: 'bg-amber-900/30 border-amber-500',
    },
    blue: {
        header: 'bg-blue-900/30 border-blue-700',
        border: 'border-blue-700',
        dot: 'bg-blue-500',
        count: 'text-blue-400 bg-blue-500/20',
        dropHighlight: 'bg-blue-900/30 border-blue-500',
    },
    gray: {
        header: 'bg-muted/50 border-border',
        border: 'border-border',
        dot: 'bg-gray-500',
        count: 'text-muted-foreground bg-gray-600/30',
        dropHighlight: 'bg-muted/60 border-border',
    },
};

export default function QueueColumn({ title, color, icon, columnKey, items, onDrop }: QueueColumnProps) {
    const colors = COLOR_MAP[color] || COLOR_MAP.gray;
    const [isDragOver, setIsDragOver] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (!isDragOver) setIsDragOver(true);
    };

    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        // Só esconder se realmente saiu da coluna
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const { clientX, clientY } = e;
        if (
            clientX < rect.left || clientX > rect.right ||
            clientY < rect.top || clientY > rect.bottom
        ) {
            setIsDragOver(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        try {
            const rawData = e.dataTransfer.getData('application/json');
            if (!rawData) return;
            const data = JSON.parse(rawData);
            if (data.planId && data.fromEstado !== columnKey) {
                onDrop(data.planId, data.fromEstado, columnKey);
            }
        } catch (err) {
            console.error('Erro ao processar drop:', err);
        }
    };

    return (
        <div
            onDragOver={handleDragOver}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={cn(
                "flex flex-col rounded-xl border min-w-[280px] max-w-[340px] flex-1 transition-all duration-200",
                isDragOver
                    ? colors.dropHighlight + " border-dashed border-2 scale-[1.01]"
                    : "bg-muted/50 border-border"
            )}
        >
            {/* Header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 rounded-t-xl border-b",
                colors.header
            )}>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <h3 className="text-sm font-semibold text-card-foreground">{title}</h3>
                </div>
                <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    colors.count
                )}>
                    {items.length}
                </span>
            </div>

            {/* Cards */}
            <div className={cn(
                "flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-220px)] transition-colors",
                isDragOver && "min-h-[100px]"
            )}>
                {items.length === 0 ? (
                    <div className={cn(
                        "text-center py-8 text-xs rounded-lg border-2 border-dashed transition-all",
                        isDragOver
                            ? "text-card-foreground/80 border-border bg-muted/60"
                            : "text-gray-500 border-transparent"
                    )}>
                        {isDragOver ? '⬇ Largar aqui' : 'Sem pedidos'}
                    </div>
                ) : (
                    items.map(item => (
                        <QueueCard key={item.id} item={item} />
                    ))
                )}
            </div>

            {/* Footer count */}
            {items.length > 10 && (
                <div className="px-4 py-2 border-t border-border text-center">
                    <span className="text-[10px] text-gray-500">
                        {items.length} pedido{items.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
        </div>
    );
}
