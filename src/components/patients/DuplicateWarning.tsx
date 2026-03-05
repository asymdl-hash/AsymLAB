'use client';

import { AlertTriangle, ShieldAlert, X, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';

interface DuplicateWarningProps {
    status: 'ok' | 'warning' | 'block';
    message: string;
    matches: { id: string; nome: string; t_id: string; id_paciente_clinica: string | null; similarity?: number }[];
    onDismiss: () => void;
}

const STATUS_CONFIG = {
    ok: {
        icon: ShieldAlert,
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        iconColor: 'text-green-500',
        badgeBg: 'bg-green-100 text-green-700',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-800',
        iconColor: 'text-amber-500',
        badgeBg: 'bg-amber-100 text-amber-700',
    },
    block: {
        icon: ShieldAlert,
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        iconColor: 'text-red-500',
        badgeBg: 'bg-red-100 text-red-700',
    },
};

export default function DuplicateWarning({ status, message, matches, onDismiss }: DuplicateWarningProps) {
    const router = useRouter();

    if (status === 'ok') return null;

    const config = STATUS_CONFIG[status];
    const Icon = config.icon;

    return (
        <div className={cn(
            "mx-4 sm:mx-6 mt-3 p-3 rounded-lg border flex items-start gap-3 animate-in slide-in-from-top-2 duration-300",
            config.bg
        )}>
            <Icon className={cn("h-5 w-5 shrink-0 mt-0.5", config.iconColor)} />
            <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", config.text)}>
                    {status === 'block' ? '🚫 Duplicação detectada' : '⚠️ Possível duplicado'}
                </p>
                <p className={cn("text-xs mt-1 opacity-80", config.text)}>
                    {message}
                </p>
                {matches.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                        {matches.slice(0, 3).map(m => (
                            <div key={m.id} className="flex items-center gap-2 text-xs">
                                <span className="text-gray-500">{m.t_id}</span>
                                <span className={cn("font-medium", config.text)}>{m.nome}</span>
                                {m.similarity != null && m.similarity < 100 && (
                                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", config.badgeBg)}>
                                        {m.similarity}%
                                    </span>
                                )}
                                {m.id_paciente_clinica && (
                                    <span className="text-gray-500">ID: {m.id_paciente_clinica}</span>
                                )}
                                <button
                                    onClick={() => router.push(`/dashboard/patients/${m.id}`)}
                                    className="ml-auto flex items-center gap-1 text-blue-500 hover:text-blue-400 transition-colors"
                                    title="Ver paciente"
                                >
                                    <ExternalLink className="h-3 w-3" />
                                    <span>Ver</span>
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
            {/* Block não permite dismiss — obriga a resolver */}
            {status !== 'block' && (
                <button
                    onClick={onDismiss}
                    className="text-gray-400 hover:text-gray-600 shrink-0"
                >
                    <X className="h-4 w-4" />
                </button>
            )}
        </div>
    );
}
