'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, X, Edit2, ChevronDown, ChevronUp } from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import { catalogService } from '@/services/catalogService';
import { OdontogramContent } from './Odontogram';

interface TeethWidgetProps {
    appointmentId: string;
    onReload?: () => void;
}

interface TeethRecord {
    id: string;
    appointment_id: string;
    teeth_data: ToothEntry[];
    version_number: number;
    notas: string | null;
    created_at: string;
    updated_at: string;
}

interface ToothEntry {
    tooth_number: number;
    work_type_id: string | null;
}

interface WorkType {
    id: string;
    nome: string;
    cor: string | null;
    activo?: boolean;
}

export default function TeethWidget({ appointmentId, onReload }: TeethWidgetProps) {
    const [records, setRecords] = useState<TeethRecord[]>([]);
    const [workTypes, setWorkTypes] = useState<WorkType[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado temporário para edição
    const [editTeeth, setEditTeeth] = useState<ToothEntry[]>([]);
    const [editNotes, setEditNotes] = useState('');

    // Carregar dados
    const loadData = useCallback(async () => {
        try {
            const [recs, wts] = await Promise.all([
                patientsService.getTeethRecords(appointmentId),
                catalogService.getWorkTypes(),
            ]);
            setRecords(recs);
            setWorkTypes(wts.filter((w: WorkType) => w.activo !== false));
        } catch (err) {
            console.error('[TeethWidget] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }, [appointmentId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Iniciar novo registo
    const handleStartCreate = () => {
        setCreating(true);
        setEditTeeth([]);
        setEditNotes('');
        setEditingId(null);
        setExpanded(true);
    };

    // Iniciar edição
    const handleStartEdit = (rec: TeethRecord) => {
        setEditingId(rec.id);
        setEditTeeth(rec.teeth_data || []);
        setEditNotes(rec.notas || '');
        setCreating(false);
        setExpanded(true);
    };

    // Cancelar
    const handleCancel = () => {
        setCreating(false);
        setEditingId(null);
        setEditTeeth([]);
        setEditNotes('');
    };

    // Guardar (criar ou actualizar)
    const handleSave = async () => {
        if (editTeeth.length === 0) return;
        setSaving(true);
        try {
            if (creating) {
                await patientsService.createTeethRecord(appointmentId, editTeeth, editNotes);
            } else if (editingId) {
                await patientsService.updateTeethRecord(editingId, editTeeth, editNotes);
            }
            handleCancel();
            await loadData();
            onReload?.();
        } catch (err) {
            console.error('[TeethWidget] Erro ao guardar:', err);
        } finally {
            setSaving(false);
        }
    };

    // Contar total de dentes em todos os registos
    const totalTeeth = records.reduce((acc, r) => acc + (r.teeth_data?.length || 0), 0);

    // Dentes já usados noutros registos (para marcar no odontograma)
    const usedTeeth = new Set<number>();
    records.forEach(r => {
        if (r.id !== editingId) {
            r.teeth_data?.forEach((t: ToothEntry) => usedTeeth.add(t.tooth_number));
        }
    });

    if (loading) {
        return (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>A carregar dentes...</span>
            </div>
        );
    }

    const isEditing = creating || editingId !== null;

    return (
        <div className="mt-3">
            {/* Header compacto */}
            <div className={`p-2.5 rounded-lg border ${records.length > 0
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-gray-500/10 border-gray-500/30'
                }`}>
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                        <span className="text-lg">🦷</span>
                        <span className={`text-xs font-medium ${records.length > 0 ? 'text-emerald-400' : 'text-muted-foreground'
                            }`}>
                            {records.length > 0
                                ? `${totalTeeth} dentes · ${records.length} registo${records.length > 1 ? 's' : ''}`
                                : 'Sem registos de dentes'
                            }
                        </span>
                        {expanded
                            ? <ChevronUp className="w-3 h-3 text-muted-foreground" />
                            : <ChevronDown className="w-3 h-3 text-muted-foreground" />
                        }
                    </button>

                    {!isEditing && (
                        <button
                            onClick={handleStartCreate}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 
                                       text-xs font-medium text-white transition-all"
                        >
                            <Plus className="w-3 h-3" />
                            <span>Novo</span>
                        </button>
                    )}
                </div>

                {/* Lista de registos (colapsada) */}
                {expanded && records.length > 0 && !isEditing && (
                    <div className="mt-2 space-y-1.5">
                        {records.map((rec, idx) => (
                            <div key={rec.id} className="flex items-center justify-between bg-black/20 rounded-md px-2.5 py-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                                    <span className="text-xs text-card-foreground truncate">
                                        {rec.teeth_data?.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ')}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">V{rec.version_number}</span>
                                </div>
                                <button
                                    onClick={() => handleStartEdit(rec)}
                                    className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-card-foreground transition-all"
                                    title="Editar registo"
                                >
                                    <Edit2 className="w-3 h-3" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Odontograma editor (expandido) */}
            {expanded && isEditing && (
                <div className="mt-2 p-3 bg-black/20 rounded-lg border border-border">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-card-foreground">
                            {creating ? '➕ Novo Registo de Dentes' : `✏️ Editar Registo (V${records.find(r => r.id === editingId)?.version_number || 1})`}
                        </h4>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleSave}
                                disabled={saving || editTeeth.length === 0}
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-600 hover:bg-green-500 
                                           text-xs font-medium text-white transition-all disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Guardar
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-1.5 rounded-md hover:bg-white/10 text-muted-foreground hover:text-card-foreground transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Contagem e instrução */}
                    <p className="text-[10px] text-muted-foreground mb-2">
                        {editTeeth.length} dentes seleccionados · Click para seleccionar · Shift+Click para range · Ctrl+Click para multi
                    </p>

                    {/* Odontograma selector */}
                    <OdontogramContent
                        teeth={editTeeth}
                        workTypes={workTypes}
                        onChange={setEditTeeth}
                        disabled={false}
                        selectionMode="toggle"
                    />

                    {/* Notas */}
                    <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Notas do registo..."
                        className="w-full mt-2 bg-muted border border-gray-600 rounded px-2 py-1 text-xs text-card-foreground 
                                   placeholder:text-gray-500 resize-none"
                    />
                </div>
            )}
        </div>
    );
}
