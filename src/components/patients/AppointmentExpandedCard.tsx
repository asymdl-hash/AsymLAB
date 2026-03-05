'use client';

import { cn } from '@/lib/utils';
import { Calendar, Trash2, Check, ChevronDown, X } from 'lucide-react';
import { Tables } from '@/types/database.types';

// ──── Tipos ────
interface AppointmentExpandedCardProps {
    appointment: Tables<'appointments'>;
    phaseName: string;
    onClose: () => void;
    onStateChange?: (appointmentId: string, newState: string) => void;
    onDelete?: (appointmentId: string) => void;
}

// ──── Config de tipos de agendamento ────
const APT_TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    moldagem: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' },
    para_prova: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
    para_colocacao: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
    reparacao: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    ajuste: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200' },
    outro: { bg: 'bg-gray-50', text: 'text-gray-700', border: 'border-gray-200' },
};

const APT_TYPE_LABELS: Record<string, string> = {
    moldagem: 'Moldagem',
    para_prova: 'Prova',
    para_colocacao: 'Colocação',
    reparacao: 'Reparação',
    ajuste: 'Ajuste',
    outro: 'Outro',
};

const APT_STATE_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
    agendado: { label: 'Agendado', color: 'text-blue-600', bg: 'bg-blue-50' },
    concluido: { label: 'Concluído', color: 'text-emerald-600', bg: 'bg-emerald-50' },
    prova_entregue: { label: 'Prova Entregue', color: 'text-indigo-600', bg: 'bg-indigo-50' },
    colocacao_entregue: { label: 'Colocação Entregue', color: 'text-purple-600', bg: 'bg-purple-50' },
    recolhido: { label: 'Recolhido', color: 'text-teal-600', bg: 'bg-teal-50' },
    cancelado: { label: 'Cancelado', color: 'text-red-600', bg: 'bg-red-50' },
    remarcado: { label: 'Remarcado', color: 'text-orange-600', bg: 'bg-orange-50' },
};

export default function AppointmentExpandedCard({
    appointment,
    phaseName,
    onClose,
    onStateChange,
    onDelete,
}: AppointmentExpandedCardProps) {
    const apt = appointment;
    const hasDate = !!apt.data_prevista;
    const date = hasDate ? new Date(apt.data_prevista!) : null;
    const typeStyle = APT_TYPE_COLORS[apt.tipo || 'outro'] || APT_TYPE_COLORS.outro;
    const typeLabel = APT_TYPE_LABELS[apt.tipo || 'outro'] || apt.tipo || 'Agendamento';
    const stateConfig = APT_STATE_CONFIG[apt.estado] || APT_STATE_CONFIG.pendente;
    const isCompleted = apt.estado === 'concluido';

    // Mês abreviado em português
    const monthShort = date ? date.toLocaleDateString('pt-PT', { month: 'short' }).toUpperCase().replace('.', '') : '?';
    const day = date ? date.getDate() : '?';

    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-4 min-w-[280px] max-w-[340px] animate-in fade-in slide-in-from-top-2 duration-200">
            {/* Header: Data + Título + Fechar */}
            <div className="flex items-start gap-3">
                {/* Badge de data */}
                <div className={cn(
                    "flex flex-col items-center justify-center rounded-lg px-2.5 py-1.5 min-w-[48px] shrink-0",
                    hasDate ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-400"
                )}>
                    <span className="text-[9px] font-bold uppercase tracking-wider leading-none">
                        {monthShort}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                        {day}
                    </span>
                </div>

                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800 uppercase tracking-wide">
                            Agendamento
                        </span>
                        <span className={cn(
                            "text-[9px] font-medium px-1.5 py-0.5 rounded-full",
                            stateConfig.bg, stateConfig.color
                        )}>
                            {stateConfig.label}
                        </span>
                    </div>
                    {hasDate && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <Calendar className="h-3 w-3 text-gray-400" />
                            <span className="text-[11px] text-gray-500">
                                {date!.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                {apt.hora_prevista && ` • ${apt.hora_prevista}`}
                            </span>
                        </div>
                    )}
                    <span className="text-[10px] text-gray-400 mt-0.5 block truncate">
                        Fase: {phaseName}
                    </span>
                </div>

                {/* Botões de acção */}
                <div className="flex items-center gap-1 shrink-0">
                    {!isCompleted && onStateChange && (
                        <button
                            onClick={() => onStateChange(apt.id, 'concluido')}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors"
                            title="Marcar como concluído"
                        >
                            <Check className="h-3.5 w-3.5" />
                        </button>
                    )}
                    {onDelete && (
                        <button
                            onClick={() => onDelete(apt.id)}
                            className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Eliminar agendamento"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                    <button
                        onClick={onClose}
                        className="h-6 w-6 rounded-md flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Fechar"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            </div>

            {/* Tipo de agendamento (badge) */}
            <div className="flex flex-wrap gap-1.5 mt-3">
                <span className={cn(
                    "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md border",
                    typeStyle.bg, typeStyle.text, typeStyle.border
                )}>
                    {typeLabel}
                </span>
                {apt.recolha_pronta && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
                        📦 Recolha Pronta
                    </span>
                )}
            </div>

            {/* Notas (se existirem) */}
            {apt.notas && (
                <p className="text-[11px] text-gray-500 mt-2 bg-gray-50 rounded-lg px-2.5 py-2 leading-relaxed">
                    {apt.notas}
                </p>
            )}

            {/* Guias (preparado para futuro) */}
            {/* 
            <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                <button className="flex-1 text-[10px] font-medium px-2 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                    🚚 Guia Transporte
                </button>
                <button className="flex-1 text-[10px] font-medium px-2 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors">
                    📦 Guia Recepção
                </button>
            </div>
            */}
        </div>
    );
}
