'use client';

import { QueueItem } from '@/services/queueService';
import { useRouter } from 'next/navigation';
import { AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

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

    const handleClick = () => {
        router.push(`/dashboard/patients/${item.paciente.id}/plans/${item.id}`);
    };

    const progressPct = item.progresso.total > 0
        ? Math.round((item.progresso.feitas / item.progresso.total) * 100)
        : 0;

    return (
        <button
            onClick={handleClick}
            className={cn(
                "w-full text-left p-3 rounded-lg border transition-all duration-200 group cursor-pointer",
                "bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-md",
                item.urgente && "ring-2 ring-amber-400/40 border-amber-300"
            )}
        >
            {/* Urgente badge */}
            {item.urgente && (
                <div className="flex items-center gap-1 mb-1.5">
                    <AlertTriangle className="h-3 w-3 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Urgente</span>
                </div>
            )}

            {/* Paciente */}
            <div className="flex items-center justify-between gap-2 mb-1">
                <h4 className="text-sm font-semibold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                    {item.paciente.nome}
                </h4>
                <span className="text-[10px] font-mono text-gray-400 shrink-0">{item.paciente.t_id}</span>
            </div>

            {/* Plano */}
            <p className="text-xs text-gray-600 truncate mb-2">{item.nome}</p>

            {/* Badges row */}
            <div className="flex items-center gap-1.5 flex-wrap mb-2">
                {item.tipo_trabalho && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-100">
                        {item.tipo_trabalho.nome}
                    </span>
                )}
                {item.clinica && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                        {item.clinica.commercial_name}
                    </span>
                )}
            </div>

            {/* Footer: progress + time */}
            <div className="flex items-center justify-between">
                {/* Progress */}
                <div className="flex items-center gap-2">
                    <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${progressPct}%` }}
                        />
                    </div>
                    <span className="text-[10px] text-gray-400 font-medium">
                        {item.progresso.feitas}/{item.progresso.total}
                    </span>
                </div>

                {/* Time */}
                <div className="flex items-center gap-0.5 text-gray-400">
                    <Clock className="h-2.5 w-2.5" />
                    <span className="text-[10px]">{timeAgo(item.updated_at)}</span>
                </div>
            </div>
        </button>
    );
}
