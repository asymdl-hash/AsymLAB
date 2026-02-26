'use client';

import { AlertTriangle, ShieldAlert, CheckCircle2, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DuplicateWarningProps {
    status: 'ok' | 'warning' | 'block';
    message: string;
    matches: { id: string; nome: string; t_id: string; id_paciente_clinica: string | null }[];
    onDismiss: () => void;
}

const STATUS_CONFIG = {
    ok: {
        icon: CheckCircle2,
        bg: 'bg-green-50 border-green-200',
        text: 'text-green-800',
        iconColor: 'text-green-500',
    },
    warning: {
        icon: AlertTriangle,
        bg: 'bg-amber-50 border-amber-200',
        text: 'text-amber-800',
        iconColor: 'text-amber-500',
    },
    block: {
        icon: ShieldAlert,
        bg: 'bg-red-50 border-red-200',
        text: 'text-red-800',
        iconColor: 'text-red-500',
    },
};

export default function DuplicateWarning({ status, message, matches, onDismiss }: DuplicateWarningProps) {
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
                    {status === 'block' ? '❌ Duplicação detectada' : '⚠️ Possível duplicado'}
                </p>
                <p className={cn("text-xs mt-1", config.text, "opacity-80")}>
                    {message}
                </p>
                {matches.length > 0 && (
                    <div className="mt-2 space-y-1">
                        {matches.slice(0, 3).map(m => (
                            <div key={m.id} className="flex items-center gap-2 text-xs">
                                <span className="font-mono text-gray-500">{m.t_id}</span>
                                <span className={cn("font-medium", config.text)}>{m.nome}</span>
                                {m.id_paciente_clinica && (
                                    <span className="text-gray-400">ID: {m.id_paciente_clinica}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
            <button
                onClick={onDismiss}
                className="text-gray-400 hover:text-gray-600 shrink-0"
            >
                <X className="h-4 w-4" />
            </button>
        </div>
    );
}
