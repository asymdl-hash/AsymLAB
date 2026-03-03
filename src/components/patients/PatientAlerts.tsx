'use client';

import { useState, useMemo } from 'react';
import { AlertTriangle, CalendarClock, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PatientFullDetails } from '@/services/patientsService';

interface Alert {
    id: string;
    type: 'urgent' | 'overdue';
    icon: React.ReactNode;
    message: string;
    color: {
        bg: string;
        border: string;
        text: string;
        iconColor: string;
        dismissHover: string;
    };
}

const ALERT_STYLES = {
    urgent: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/25',
        text: 'text-amber-300',
        iconColor: 'text-amber-400',
        dismissHover: 'hover:bg-amber-500/20 hover:text-amber-200',
    },
    overdue: {
        bg: 'bg-red-500/10',
        border: 'border-red-500/25',
        text: 'text-red-300',
        iconColor: 'text-red-400',
        dismissHover: 'hover:bg-red-500/20 hover:text-red-200',
    },
};

interface PatientAlertsProps {
    patient: PatientFullDetails;
}

export default function PatientAlerts({ patient }: PatientAlertsProps) {
    const [dismissed, setDismissed] = useState<Set<string>>(new Set());

    const alerts = useMemo(() => {
        const result: Alert[] = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // 1. Paciente urgente sem plano activo
        if (patient.urgente) {
            const hasActivePlan = (patient.treatment_plans || []).some(
                (p) => p.estado === 'activo'
            );
            if (!hasActivePlan) {
                result.push({
                    id: 'urgent-no-plan',
                    type: 'urgent',
                    icon: <AlertTriangle className="h-3.5 w-3.5" />,
                    message: 'Paciente marcado como urgente mas sem plano de tratamento activo.',
                    color: ALERT_STYLES.urgent,
                });
            }
        }

        // 2. Agendamentos atrasados (data_prevista < hoje e estado = agendado)
        const overdue: string[] = [];
        for (const plan of patient.treatment_plans || []) {
            if (plan.estado === 'cancelado' || plan.estado === 'concluido') continue;
            for (const phase of plan.phases || []) {
                if (phase.estado === 'cancelada' || phase.estado === 'concluida') continue;
                for (const appt of phase.appointments || []) {
                    if (
                        appt.estado === 'agendado' &&
                        appt.data_prevista
                    ) {
                        const apptDate = new Date(appt.data_prevista);
                        apptDate.setHours(0, 0, 0, 0);
                        if (apptDate < today) {
                            overdue.push(appt.data_prevista);
                        }
                    }
                }
            }
        }

        if (overdue.length > 0) {
            const oldest = overdue.sort()[0];
            const daysLate = Math.floor(
                (today.getTime() - new Date(oldest).getTime()) / (1000 * 60 * 60 * 24)
            );
            result.push({
                id: 'overdue-appointments',
                type: 'overdue',
                icon: <CalendarClock className="h-3.5 w-3.5" />,
                message:
                    overdue.length === 1
                        ? `1 agendamento atrasado (${daysLate} dia${daysLate !== 1 ? 's' : ''}).`
                        : `${overdue.length} agendamentos atrasados — o mais antigo há ${daysLate} dia${daysLate !== 1 ? 's' : ''}.`,
                color: ALERT_STYLES.overdue,
            });
        }

        return result;
    }, [patient]);

    // Filtrar alertas dismissed
    const visible = alerts.filter((a) => !dismissed.has(a.id));

    if (visible.length === 0) return null;

    return (
        <div className="flex flex-col">
            {visible.map((alert) => (
                <div
                    key={alert.id}
                    className={cn(
                        'flex items-center gap-2 px-4 sm:px-8 py-2 border-b transition-all animate-in slide-in-from-top-1 duration-300',
                        alert.color.bg,
                        alert.color.border
                    )}
                >
                    <span className={cn('shrink-0', alert.color.iconColor)}>
                        {alert.icon}
                    </span>
                    <span className={cn('text-xs font-medium flex-1 truncate', alert.color.text)}>
                        {alert.message}
                    </span>
                    <button
                        onClick={() => setDismissed((prev) => new Set(prev).add(alert.id))}
                        className={cn(
                            'shrink-0 p-0.5 rounded text-white/40 transition-colors',
                            alert.color.dismissHover
                        )}
                        title="Dispensar alerta"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ))}
        </div>
    );
}
