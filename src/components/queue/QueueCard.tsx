'use client';

import { QueueItem } from '@/services/queueService';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';
import WorkBadges from '@/components/patients/WorkBadges';

interface QueueCardProps {
    item: QueueItem;
}

function timeAgo(dateStr: string): string {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d`;
    const months = Math.floor(days / 30);
    return `${months}mês`;
}

export default function QueueCard({ item }: QueueCardProps) {
    const router = useRouter();

    const handleClick = (e: React.MouseEvent) => {
        // Não navegar se está a arrastar
        if ((e.target as HTMLElement).closest('.drag-handle')) return;
        router.push(`/dashboard/patients/${item.paciente.id}/plans/${item.id}`);
    };

    const handleDragStart = (e: React.DragEvent) => {
        e.dataTransfer.setData('application/json', JSON.stringify({
            planId: item.id,
            fromEstado: item.estado,
            planNome: item.nome,
            pacienteNome: item.paciente.nome,
        }));
        e.dataTransfer.effectAllowed = 'move';
        // Adicionar classe visual
        (e.currentTarget as HTMLElement).style.opacity = '0.4';
    };

    const handleDragEnd = (e: React.DragEvent) => {
        (e.currentTarget as HTMLElement).style.opacity = '1';
    };

    const progressPct = item.progresso.total > 0
        ? Math.round((item.progresso.feitas / item.progresso.total) * 100)
        : 0;

    return (
        <div
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onClick={handleClick}
            className={cn(
                "w-full text-left p-3 rounded-lg border transition-all duration-200 group cursor-pointer",
                "bg-muted/80 hover:bg-muted border-border hover:border-border hover:shadow-lg hover:shadow-black/20",
                item.urgente && "ring-2 ring-amber-400/30 border-amber-500/50"
            )}
        >
            {/* Drag handle + Urgente */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1">
                    <GripVertical className="h-3 w-3 text-gray-500 drag-handle cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity" />
                    {item.urgente && (
                        <div className="flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Urgente</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Paciente */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-card-foreground truncate group-hover:text-amber-500 transition-colors">
                    {item.paciente.nome}
                </h4>
                <span className="text-[10px] font-mono text-gray-500 shrink-0">{item.paciente.t_id}</span>
            </div>

            {/* Plano */}
            <p className="text-xs text-muted-foreground truncate mb-2">{item.nome}</p>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {item.tipo_trabalho && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-medium border border-blue-200 dark:border-blue-500/30">
                        {item.tipo_trabalho.nome}
                    </span>
                )}
                {item.clinica && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-600/50 text-gray-700 dark:text-gray-300 font-medium">
                        {item.clinica.commercial_name}
                    </span>
                )}
            </div>

            {/* Work Status Badges */}
            <div className="mb-2">
                <WorkBadges planId={item.id} mode="compact" maxVisible={3} />
            </div>

            {/* Footer: progress + time */}
            <div className="flex items-center justify-between">
                {/* Progress */}
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-border rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-gray-500 font-medium">
                        {item.progresso.feitas}/{item.progresso.total}
                    </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-0.5 text-gray-500">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="text-[10px]">{timeAgo(item.updated_at)}</span>
                </div>
            </div>
        </div>
    );
}
