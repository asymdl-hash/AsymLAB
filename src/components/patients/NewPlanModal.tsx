'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { patientsService } from '@/services/patientsService';

interface NewPlanModalProps {
    patientId: string;
    patientClinicaId: string | null;
    patientMedicoId: string | null;
    onClose: () => void;
    onCreated: () => void;
}

type WorkTypeItem = { id: string; nome: string; cor: string | null; categoria: string | null };
type DoctorItem = { user_id: string; full_name: string };
type ClinicItem = { id: string; commercial_name: string };

export default function NewPlanModal({ patientId, patientClinicaId, patientMedicoId, onClose, onCreated }: NewPlanModalProps) {
    const [nome, setNome] = useState('');
    const [tipoTrabalhoId, setTipoTrabalhoId] = useState('');
    const [medicoId, setMedicoId] = useState(patientMedicoId || '');
    const [clinicaId, setClinicaId] = useState(patientClinicaId || '');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Dropdown data
    const [workTypes, setWorkTypes] = useState<WorkTypeItem[]>([]);
    const [doctors, setDoctors] = useState<DoctorItem[]>([]);
    const [clinics, setClinics] = useState<ClinicItem[]>([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);

    useEffect(() => {
        async function loadDropdowns() {
            try {
                const [wt, docs, cls] = await Promise.all([
                    patientsService.getWorkTypes(),
                    patientsService.getDoctors(),
                    patientsService.getClinics(),
                ]);
                setWorkTypes(wt);
                setDoctors(docs);
                setClinics(cls);

                // Auto-select first work type if available
                if (wt.length > 0 && !tipoTrabalhoId) {
                    setTipoTrabalhoId(wt[0].id);
                }
            } catch (err) {
                console.error('Erro ao carregar dropdowns:', err);
            } finally {
                setLoadingDropdowns(false);
            }
        }
        loadDropdowns();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!nome.trim()) { setError('O nome é obrigatório'); return; }
        if (!tipoTrabalhoId) { setError('Selecione um tipo de trabalho'); return; }
        if (!medicoId) { setError('Selecione um médico'); return; }
        if (!clinicaId) { setError('Selecione uma clínica'); return; }

        try {
            setSubmitting(true);
            await patientsService.createTreatmentPlan({
                patient_id: patientId,
                nome: nome.trim(),
                tipo_trabalho_id: tipoTrabalhoId,
                medico_id: medicoId,
                clinica_id: clinicaId,
            });
            window.dispatchEvent(new Event('patient-updated'));
            onCreated();
        } catch (err) {
            console.error('Erro ao criar plano:', err);
            setError('Erro ao criar plano. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };

    // Agrupar work types por categoria
    const groupedWorkTypes = workTypes.reduce<Record<string, typeof workTypes>>((acc, wt) => {
        const cat = wt.categoria || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(wt);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-5 border-b border-gray-100">
                    <div>
                        <h2 className="text-base font-semibold text-gray-900">Novo Plano de Tratamento</h2>
                        <p className="text-xs text-gray-400 mt-0.5">Preencha os dados para criar o plano</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Form */}
                {loadingDropdowns ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="p-5 space-y-4">
                        {/* Nome do Plano */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Nome do Plano *</label>
                            <Input
                                value={nome}
                                onChange={(e) => setNome(e.target.value)}
                                placeholder="Ex: Prótese Total Superior"
                                className="mt-1.5"
                                autoFocus
                            />
                        </div>

                        {/* Tipo de Trabalho */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Tipo de Trabalho *</label>
                            <select
                                value={tipoTrabalhoId}
                                onChange={(e) => setTipoTrabalhoId(e.target.value)}
                                className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="">Selecione...</option>
                                {Object.entries(groupedWorkTypes).map(([cat, types]) => (
                                    <optgroup key={cat} label={cat}>
                                        {types.map(wt => (
                                            <option key={wt.id} value={wt.id}>
                                                {wt.nome}
                                            </option>
                                        ))}
                                    </optgroup>
                                ))}
                            </select>
                        </div>

                        {/* Médico */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Médico *</label>
                            <select
                                value={medicoId}
                                onChange={(e) => setMedicoId(e.target.value)}
                                className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="">Selecione...</option>
                                {doctors.map(doc => (
                                    <option key={doc.user_id} value={doc.user_id}>
                                        Dr. {doc.full_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Clínica */}
                        <div>
                            <label className="text-xs font-medium text-gray-600 uppercase tracking-wider">Clínica *</label>
                            <select
                                value={clinicaId}
                                onChange={(e) => setClinicaId(e.target.value)}
                                className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                            >
                                <option value="">Selecione...</option>
                                {clinics.map(cl => (
                                    <option key={cl.id} value={cl.id}>
                                        {cl.commercial_name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg">{error}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <Button type="button" variant="outline" className="flex-1 h-9" onClick={onClose}>
                                Cancelar
                            </Button>
                            <Button type="submit" className="flex-1 h-9 gap-1.5" disabled={submitting}>
                                {submitting ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Plus className="h-3.5 w-3.5" />
                                )}
                                Criar Plano
                            </Button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
