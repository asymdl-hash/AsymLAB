'use client';

import { useState, useEffect } from 'react';
import { X, Upload, Loader2 } from 'lucide-react';
import { billingService } from '@/services/billingService';
import { patientsService } from '@/services/patientsService';
import { useAuth } from '@/contexts/AuthContext';

interface NewInvoiceModalProps {
    patientId: string;
    onClose: () => void;
    onCreated: () => void;
}

export default function NewInvoiceModal({ patientId, onClose, onCreated }: NewInvoiceModalProps) {
    const { user } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [selectedPhaseId, setSelectedPhaseId] = useState('');
    const [valor, setValor] = useState('');
    const [descricao, setDescricao] = useState('');
    const [notas, setNotas] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Carregar planos do paciente
    useEffect(() => {
        (async () => {
            try {
                const patient = await patientsService.getPatientById(patientId);
                setPlans(patient?.treatment_plans || []);
            } catch { /* silent */ }
        })();
    }, [patientId]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedPlan = plans.find((p: any) => p.id === selectedPlanId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const phases = selectedPlan?.phases?.sort((a: any, b: any) => a.ordem - b.ordem) || [];

    const handleSubmit = async () => {
        if (!valor || parseFloat(valor) <= 0) {
            setError('O valor deve ser maior que 0');
            return;
        }
        try {
            setSaving(true);
            setError('');

            const invoice = await billingService.createInvoice({
                patient_id: patientId,
                plan_id: selectedPlanId || undefined,
                phase_id: selectedPhaseId || undefined,
                clinica_id: selectedPlan?.clinica_id || undefined,
                valor: parseFloat(valor),
                descricao: descricao || undefined,
                notas: notas || undefined,
                emitida_por: user?.id,
            });

            if (pdfFile) {
                await billingService.uploadInvoicePDF(invoice.id, pdfFile);
            }

            onCreated();
        } catch (err) {
            console.error('Erro ao criar factura:', err);
            setError('Erro ao criar factura. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <h3 className="text-base font-semibold text-gray-900">🧾 Nova Factura</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Plano */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Plano</label>
                        <select
                            value={selectedPlanId}
                            onChange={(e) => { setSelectedPlanId(e.target.value); setSelectedPhaseId(''); }}
                            className="w-full rounded-lg bg-white border border-gray-200 text-sm text-gray-900 px-3 py-2 focus:border-amber-500 focus:outline-none"
                        >
                            <option value="">Sem plano associado</option>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {plans.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Fase */}
                    {selectedPlanId && phases.length > 0 && (
                        <div>
                            <label className="text-xs text-gray-500 font-medium mb-1 block">Fase</label>
                            <select
                                value={selectedPhaseId}
                                onChange={(e) => setSelectedPhaseId(e.target.value)}
                                className="w-full rounded-lg bg-white border border-gray-200 text-sm text-gray-900 px-3 py-2 focus:border-amber-500 focus:outline-none"
                            >
                                <option value="">Sem fase específica</option>
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {phases.map((ph: any) => (
                                    <option key={ph.id} value={ph.id}>{ph.nome}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Valor */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Valor (€) *</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={valor}
                            onChange={(e) => setValor(e.target.value)}
                            placeholder="0.00"
                            className="w-full rounded-lg bg-white border border-gray-200 text-sm text-gray-900 px-3 py-2 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Descrição</label>
                        <input
                            type="text"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            placeholder="Ex: Coroa zircónia dente 14"
                            className="w-full rounded-lg bg-white border border-gray-200 text-sm text-gray-900 px-3 py-2 focus:border-amber-500 focus:outline-none"
                        />
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">Notas</label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                            placeholder="Observações internas..."
                            className="w-full rounded-lg bg-white border border-gray-200 text-sm text-gray-900 px-3 py-2 focus:border-amber-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* PDF Upload */}
                    <div>
                        <label className="text-xs text-gray-500 font-medium mb-1 block">PDF da Factura</label>
                        {pdfFile ? (
                            <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                                <span className="text-sm text-emerald-600 truncate flex-1">{pdfFile.name}</span>
                                <button
                                    onClick={() => setPdfFile(null)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ) : (
                            <label className="flex items-center justify-center gap-2 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-400 cursor-pointer transition-colors">
                                <Upload className="h-4 w-4 text-gray-500" />
                                <span className="text-xs text-gray-500">Arraste ou clique para seleccionar PDF</span>
                                <input
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={(e) => e.target.files?.[0] && setPdfFile(e.target.files[0])}
                                />
                            </label>
                        )}
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving || !valor}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '🧾'}
                        {saving ? 'A criar...' : 'Criar Factura'}
                    </button>
                </div>
            </div>
        </div>
    );
}
