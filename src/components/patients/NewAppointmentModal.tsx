'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { patientsService } from '@/services/patientsService';

interface NewAppointmentModalProps {
    phaseId: string;
    onClose: () => void;
    onCreated: () => void;
}

const APPOINTMENT_TYPES = [
    { value: 'moldagem', label: 'Moldagem', emoji: '🟤' },
    { value: 'para_prova', label: 'Prova', emoji: '🟥' },
    { value: 'para_colocacao', label: 'Colocação', emoji: '🟣' },
    { value: 'reparacao', label: 'Reparação', emoji: '🔧' },
    { value: 'ajuste', label: 'Ajuste', emoji: '⚙️' },
    { value: 'outro', label: 'Outro', emoji: '📅' },
];

export default function NewAppointmentModal({ phaseId, onClose, onCreated }: NewAppointmentModalProps) {
    const [tipo, setTipo] = useState('moldagem');
    const [dataPrevista, setDataPrevista] = useState('');
    const [horaPrevista, setHoraPrevista] = useState('');
    const [notas, setNotas] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            setSubmitting(true);
            setError('');
            await patientsService.createAppointment({
                phase_id: phaseId,
                tipo,
                data_prevista: dataPrevista || undefined,
                hora_prevista: horaPrevista || undefined,
                notas: notas.trim() || undefined,
            });
            onCreated();
        } catch (err) {
            console.error('Error creating appointment:', err);
            setError('Erro ao criar agendamento. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-muted border border-border rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h2 className="text-lg font-bold text-white">Novo Agendamento</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">
                            Tipo <span className="text-red-400">*</span>
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            {APPOINTMENT_TYPES.map((t) => (
                                <button key={t.value} type="button"
                                    onClick={() => setTipo(t.value)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors
                                        ${tipo === t.value
                                            ? 'border-amber-500 bg-amber-500/10 text-amber-400'
                                            : 'border-gray-600 bg-gray-700 text-foreground/80 hover:border-gray-500'
                                        }`}>
                                    <span>{t.emoji}</span>
                                    <span>{t.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Data Prevista (opcional)</label>
                        <div className="flex gap-2">
                            <input type="date" value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)}
                                className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 [color-scheme:dark]" />
                            <input type="time" value={horaPrevista} onChange={(e) => setHoraPrevista(e.target.value)}
                                placeholder="Hora"
                                className="w-28 bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-amber-500/50 [color-scheme:dark]" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-foreground/80 mb-1">Notas (opcional)</label>
                        <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                            placeholder="Observações sobre o agendamento..."
                            rows={3}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-900/20 rounded-lg p-2">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-foreground/80 hover:bg-muted transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2">
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Criar Agendamento
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
