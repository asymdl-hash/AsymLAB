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
        header: 'bg-emerald-50 border-emerald-200',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        count: 'text-emerald-700 bg-emerald-100',
        dropHighlight: 'bg-emerald-100/60 border-emerald-400',
    },
    amber: {
        header: 'bg-amber-50 border-amber-200',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        count: 'text-amber-700 bg-amber-100',
        dropHighlight: 'bg-amber-100/60 border-amber-400',
    },
    blue: {
        header: 'bg-blue-50 border-blue-200',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        count: 'text-blue-700 bg-blue-100',
        dropHighlight: 'bg-blue-100/60 border-blue-400',
    },
    gray: {
        header: 'bg-gray-50 border-gray-200',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        count: 'text-gray-600 bg-gray-100',
        dropHighlight: 'bg-gray-200/60 border-gray-400',
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
                    : "bg-gray-50/50 border-gray-200"
            )}
        >
            {/* Header */}
            <div className={cn(
                "flex items-center justify-between px-4 py-3 rounded-t-xl border-b",
                colors.header
            )}>
                <div className="flex items-center gap-2">
                    <span className="text-sm">{icon}</span>
                    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
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
                            ? "text-gray-600 border-gray-400 bg-white/60"
                            : "text-gray-400 border-transparent"
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
                <div className="px-4 py-2 border-t border-gray-200 text-center">
                    <span className="text-[10px] text-gray-400">
                        {items.length} pedido{items.length !== 1 ? 's' : ''}
                    </span>
                </div>
            )}
        </div>
    );
}
