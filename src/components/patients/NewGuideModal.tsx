'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2, Trash2, Package } from 'lucide-react';
import { transportService, GuideItemCatalog, RECEPTION_STATE_CONFIG } from '@/services/transportService';
import { patientsService } from '@/services/patientsService';
import { useAuth } from '@/contexts/AuthContext';

interface NewGuideModalProps {
    patientId: string;
    tipo: 'transporte' | 'recepcao';
    onClose: () => void;
    onCreated: () => void;
}

interface ItemRow {
    nome: string;
    quantidade: number;
    observacao: string;
}

export default function NewGuideModal({ patientId, tipo, onClose, onCreated }: NewGuideModalProps) {
    const { user } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [plans, setPlans] = useState<any[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState('');
    const [notas, setNotas] = useState('');
    const [estadoRecepcao, setEstadoRecepcao] = useState('ok');
    const [items, setItems] = useState<ItemRow[]>([{ nome: '', quantidade: 1, observacao: '' }]);
    const [suggestions, setSuggestions] = useState<GuideItemCatalog[]>([]);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    // Carregar planos e sugestões
    useEffect(() => {
        (async () => {
            try {
                const patient = await patientsService.getPatientDetails(patientId);
                setPlans(patient?.treatment_plans || []);

                // Buscar clínica do primeiro plano para sugestões
                const firstPlan = patient?.treatment_plans?.[0];
                const suggested = await transportService.getSuggestedItems(firstPlan?.clinica_id);
                setSuggestions(suggested);
            } catch { /* silent */ }
        })();
    }, [patientId]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const selectedPlan = plans.find((p: any) => p.id === selectedPlanId);

    const addItem = () => {
        setItems(prev => [...prev, { nome: '', quantidade: 1, observacao: '' }]);
    };

    const removeItem = (index: number) => {
        if (items.length <= 1) return;
        setItems(prev => prev.filter((_, i) => i !== index));
    };

    const updateItem = (index: number, field: keyof ItemRow, value: string | number) => {
        setItems(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
    };

    const addSuggestion = (suggestion: GuideItemCatalog) => {
        const exists = items.some(i => i.nome === suggestion.nome);
        if (exists) return;

        // Substituir primeiro item vazio ou adicionar novo
        const emptyIndex = items.findIndex(i => !i.nome.trim());
        if (emptyIndex >= 0) {
            updateItem(emptyIndex, 'nome', suggestion.nome);
        } else {
            setItems(prev => [...prev, { nome: suggestion.nome, quantidade: 1, observacao: '' }]);
        }
    };

    const handleSubmit = async () => {
        const validItems = items.filter(i => i.nome.trim());
        if (validItems.length === 0) {
            setError('Adicione pelo menos um item');
            return;
        }

        try {
            setSaving(true);
            setError('');

            await transportService.createGuide({
                patient_id: patientId,
                tipo,
                plan_id: selectedPlanId || undefined,
                clinica_id: selectedPlan?.clinica_id || undefined,
                notas: notas || undefined,
                estado_recepcao: tipo === 'recepcao' ? estadoRecepcao : undefined,
                created_by: user?.id,
                items: validItems,
            });

            onCreated();
        } catch (err) {
            console.error('Erro ao criar guia:', err);
            setError('Erro ao criar guia. Tente novamente.');
        } finally {
            setSaving(false);
        }
    };

    const label = tipo === 'transporte' ? '🚚 Nova Guia de Transporte' : '📦 Nova Guia de Recepção';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
            <div className="bg-muted border border-border rounded-2xl w-full max-w-lg mx-4 shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <h3 className="text-base font-semibold text-card-foreground">{label}</h3>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-card-foreground">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
                    {/* Plano */}
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Plano Associado</label>
                        <select
                            value={selectedPlanId}
                            onChange={(e) => setSelectedPlanId(e.target.value)}
                            className="w-full rounded-lg bg-muted border border-gray-600 text-sm text-card-foreground px-3 py-2 focus:border-amber-500 focus:outline-none"
                        >
                            <option value="">Sem plano</option>
                            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                            {plans.map((p: any) => (
                                <option key={p.id} value={p.id}>{p.nome}</option>
                            ))}
                        </select>
                    </div>

                    {/* Estado recepção (só para recepção) */}
                    {tipo === 'recepcao' && (
                        <div>
                            <label className="text-xs text-muted-foreground font-medium mb-1 block">Estado da Recepção</label>
                            <div className="flex gap-2">
                                {Object.entries(RECEPTION_STATE_CONFIG).map(([key, config]) => (
                                    <button
                                        key={key}
                                        onClick={() => setEstadoRecepcao(key)}
                                        className={`flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${estadoRecepcao === key
                                            ? `${config.color} border-current bg-white/5`
                                            : 'text-gray-500 border-border hover:border-muted-foreground'
                                            }`}
                                    >
                                        {config.emoji} {config.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Sugestões de itens */}
                    {suggestions.length > 0 && (
                        <div>
                            <label className="text-xs text-muted-foreground font-medium mb-1 block">💡 Sugestões (baseado no histórico)</label>
                            <div className="flex flex-wrap gap-1">
                                {suggestions.slice(0, 8).map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => addSuggestion(s)}
                                        className="text-[10px] px-2 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 hover:bg-amber-500/20 transition-colors"
                                    >
                                        + {s.nome} <span className="text-muted-foreground ml-0.5">({s.uso_count}×)</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Itens */}
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-2 block">📦 Itens</label>
                        <div className="space-y-2">
                            {items.map((item, i) => (
                                <div key={i} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={item.nome}
                                        onChange={(e) => updateItem(i, 'nome', e.target.value)}
                                        placeholder="Nome do item..."
                                        className="flex-1 rounded-lg bg-muted border border-gray-600 text-xs text-card-foreground px-3 py-2 focus:border-amber-500 focus:outline-none"
                                    />
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantidade}
                                        onChange={(e) => updateItem(i, 'quantidade', parseInt(e.target.value) || 1)}
                                        className="w-14 rounded-lg bg-muted border border-gray-600 text-xs text-card-foreground px-2 py-2 text-center focus:border-amber-500 focus:outline-none"
                                    />
                                    {items.length > 1 && (
                                        <button
                                            onClick={() => removeItem(i)}
                                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-muted-foreground hover:text-red-400 transition-colors"
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={addItem}
                            className="mt-2 flex items-center gap-1 text-[11px] text-gray-500 hover:text-amber-400 transition-colors"
                        >
                            <Plus className="h-3 w-3" /> Adicionar item
                        </button>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="text-xs text-muted-foreground font-medium mb-1 block">Notas</label>
                        <textarea
                            value={notas}
                            onChange={(e) => setNotas(e.target.value)}
                            rows={2}
                            placeholder="Observações..."
                            className="w-full rounded-lg bg-muted border border-gray-600 text-sm text-card-foreground px-3 py-2 focus:border-amber-500 focus:outline-none resize-none"
                        />
                    </div>

                    {/* Error */}
                    {error && (
                        <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">{error}</p>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="px-4 py-2 text-sm text-muted-foreground hover:text-card-foreground transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={saving}
                        className="px-4 py-2 text-sm font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-card-foreground transition-colors disabled:opacity-50 flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Package className="h-3.5 w-3.5" />}
                        {saving ? 'A criar...' : 'Criar Guia'}
                    </button>
                </div>
            </div>
        </div>
    );
}
