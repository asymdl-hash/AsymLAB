'use client';

import { QueueItem } from '@/services/queueService';
import QueueCard from './QueueCard';
import { cn } from '@/lib/utils';

interface QueueColumnProps {
    title: string;
    color: string;
    icon: string;
    items: QueueItem[];
}

const COLOR_MAP: Record<string, { header: string; border: string; dot: string; count: string }> = {
    emerald: {
        header: 'bg-emerald-50 border-emerald-200',
        border: 'border-emerald-200',
        dot: 'bg-emerald-500',
        count: 'text-emerald-700 bg-emerald-100',
    },
    amber: {
        header: 'bg-amber-50 border-amber-200',
        border: 'border-amber-200',
        dot: 'bg-amber-500',
        count: 'text-amber-700 bg-amber-100',
    },
    blue: {
        header: 'bg-blue-50 border-blue-200',
        border: 'border-blue-200',
        dot: 'bg-blue-500',
        count: 'text-blue-700 bg-blue-100',
    },
    gray: {
        header: 'bg-gray-50 border-gray-200',
        border: 'border-gray-200',
        dot: 'bg-gray-400',
        count: 'text-gray-600 bg-gray-100',
    },
};

export default function QueueColumn({ title, color, icon, items }: QueueColumnProps) {
    const colors = COLOR_MAP[color] || COLOR_MAP.gray;

    return (
        <div className={cn(
            "flex flex-col rounded-xl border min-w-[280px] max-w-[340px] flex-1",
            "bg-gray-50/50 border-gray-200"
        )}>
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
            <div className="flex-1 overflow-y-auto p-2 space-y-2 max-h-[calc(100vh-220px)]">
                {items.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-xs">
                        Sem pedidos
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
