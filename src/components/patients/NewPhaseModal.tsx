'use client';

import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { patientsService } from '@/services/patientsService';

interface NewPhaseModalProps {
    planId: string;
    currentPhaseCount: number;
    onClose: () => void;
    onCreated: () => void;
}

export default function NewPhaseModal({ planId, currentPhaseCount, onClose, onCreated }: NewPhaseModalProps) {
    const [nome, setNome] = useState('');
    const [notas, setNotas] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!nome.trim()) { setError('Nome da fase é obrigatório'); return; }

        try {
            setSubmitting(true);
            setError('');
            await patientsService.createPhase({
                treatment_plan_id: planId,
                nome: nome.trim(),
                ordem: currentPhaseCount + 1,
                notas: notas.trim() || undefined,
            });
            onCreated();
        } catch (err) {
            console.error('Error creating phase:', err);
            setError('Erro ao criar fase. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-lg font-bold text-white">Nova Fase</h2>
                    <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-700 transition-colors">
                        <X className="w-5 h-5 text-gray-400" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">
                            Nome da Fase <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={nome} onChange={(e) => setNome(e.target.value)}
                            placeholder="Ex: Moldagem, Prova Estrutura, Colocação..."
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Ordem</label>
                        <input type="text" readOnly value={`Fase ${currentPhaseCount + 1}`}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-400 cursor-not-allowed" />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-300 mb-1">Notas (opcional)</label>
                        <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
                            placeholder="Observações, instruções..."
                            rows={3}
                            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 resize-none" />
                    </div>

                    {error && (
                        <p className="text-sm text-red-400 bg-red-900/20 rounded-lg p-2">{error}</p>
                    )}

                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={onClose}
                            className="flex-1 px-4 py-2 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors text-sm">
                            Cancelar
                        </button>
                        <button type="submit" disabled={submitting}
                            className="flex-1 px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold hover:bg-amber-400 disabled:opacity-50 transition-colors text-sm flex items-center justify-center gap-2">
                            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                            Criar Fase
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
