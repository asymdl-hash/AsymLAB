'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, X, Edit2, ChevronDown, ChevronUp, FolderOpen, Copy, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { patientsService } from '@/services/patientsService';
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

interface Material {
    id: string;
    nome: string;
    cor: string | null;
    categoria: string | null;
    activo?: boolean;
}

interface NasHierarchy {
    t_id: string;
    patient_name: string;
    whatsapp_group_url: string | null;
    whatsapp_group_id: string | null;
    plan_order: number;
    phase_order: number;
    phase_name: string;
    appt_order: number;
}

export default function TeethWidget({ appointmentId, onReload }: TeethWidgetProps) {
    const [records, setRecords] = useState<TeethRecord[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [hierarchy, setHierarchy] = useState<NasHierarchy | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado temporário para edição
    const [editTeeth, setEditTeeth] = useState<ToothEntry[]>([]);
    const [editNotes, setEditNotes] = useState('');
    const [sendingWa, setSendingWa] = useState<string | null>(null);
    const [waSent, setWaSent] = useState<string | null>(null);

    // Carregar dados
    const loadData = useCallback(async () => {
        try {
            const [recs, mats, hier] = await Promise.all([
                patientsService.getTeethRecords(appointmentId),
                patientsService.getMillingMaterials('widget_dentes'),
                patientsService.getAppointmentHierarchy(appointmentId),
            ]);
            setRecords(recs);
            setMaterials(mats);
            setHierarchy(hier);
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

    // Abrir pasta Dentes no Explorer
    const handleOpenFolder = async () => {
        if (!hierarchy) return;
        try {
            await fetch('/api/patient-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'open_subfolder',
                    t_id: hierarchy.t_id,
                    plan_order: hierarchy.plan_order,
                    phase_order: hierarchy.phase_order,
                    phase_name: hierarchy.phase_name,
                    appt_order: hierarchy.appt_order,
                    subfolder: 'Dentes',
                }),
            });
        } catch (err) {
            console.error('[TeethWidget] Erro ao abrir pasta:', err);
        }
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
                ? 'bg-emerald-100 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30'
                : 'bg-muted/50 border-border'
                }`}>
                <div className="flex items-center justify-between">
                    <button
                        onClick={() => setExpanded(!expanded)}
                        className="flex items-center gap-2 text-left flex-1 min-w-0"
                    >
                        <span className="text-lg">🦷</span>
                        <span className={`text-xs font-medium ${records.length > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground'
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
                            <div key={rec.id} className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5">
                                <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                                    <span className="text-xs text-card-foreground truncate">
                                        {rec.teeth_data?.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ')}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground">V{rec.version_number}</span>
                                </div>
                                <div className="flex items-center gap-0.5">
                                    <button
                                        onClick={() => {
                                            const teeth = rec.teeth_data?.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ');
                                            const text = `🦷 Registo Dentes #${idx + 1} (V${rec.version_number})\nDentes: ${teeth}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
                                            navigator.clipboard.writeText(text);
                                        }}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                        title="Copiar resumo"
                                    >
                                        <Copy className="w-3 h-3" />
                                    </button>
                                    {(hierarchy?.whatsapp_group_id || hierarchy?.whatsapp_group_url) && (
                                        <button
                                            onClick={async () => {
                                                const teeth = rec.teeth_data?.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ');
                                                const msg = `🦷 *AsymLAB* — ${hierarchy.t_id} ${hierarchy.patient_name}\nDentes: ${teeth} (V${rec.version_number})${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;

                                                if (hierarchy.whatsapp_group_id) {
                                                    // Envio directo via Z-API
                                                    setSendingWa(rec.id);
                                                    setWaSent(null);
                                                    try {
                                                        const res = await fetch('/api/whatsapp/send', {
                                                            method: 'POST',
                                                            headers: { 'Content-Type': 'application/json' },
                                                            body: JSON.stringify({ groupId: hierarchy.whatsapp_group_id, message: msg }),
                                                        });
                                                        if (res.ok) {
                                                            setWaSent(rec.id);
                                                            setTimeout(() => setWaSent(null), 3000);
                                                        } else {
                                                            console.error('[WhatsApp] Erro ao enviar');
                                                        }
                                                    } catch (err) {
                                                        console.error('[WhatsApp] Erro:', err);
                                                    } finally {
                                                        setSendingWa(null);
                                                    }
                                                } else {
                                                    // Fallback: abrir grupo e copiar texto
                                                    window.open(`${hierarchy.whatsapp_group_url}`, '_blank');
                                                    navigator.clipboard.writeText(msg);
                                                }
                                            }}
                                            disabled={sendingWa === rec.id}
                                            className={`p-1 rounded transition-all ${waSent === rec.id ? 'text-green-400 bg-green-500/20' : sendingWa === rec.id ? 'text-yellow-400 animate-pulse' : 'hover:bg-green-500/20 text-green-500 hover:text-green-400'}`}
                                            title={hierarchy.whatsapp_group_id ? 'Enviar via WhatsApp' : 'Abrir grupo WhatsApp (texto copiado)'}
                                        >
                                            {waSent === rec.id ? <Check className="w-3 h-3" /> : sendingWa === rec.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MessageCircle className="w-3 h-3" />}
                                        </button>
                                    )}
                                    <button
                                        onClick={handleOpenFolder}
                                        disabled={!hierarchy}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                                        title="Abrir pasta Dentes"
                                    >
                                        <FolderOpen className="w-3 h-3" />
                                    </button>
                                    <button
                                        onClick={() => handleStartEdit(rec)}
                                        className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                        title="Editar registo"
                                    >
                                        <Edit2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Odontograma editor (expandido) */}
            {expanded && isEditing && (
                <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border">
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
                                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {/* Contagem e instrução */}
                    <p className="text-[10px] text-muted-foreground mb-2">
                        {editTeeth.length} dentes atribuídos · 1) Seleccione dentes · 2) Escolha material no painel
                    </p>

                    {/* Odontograma selector */}
                    <OdontogramContent
                        teeth={editTeeth}
                        workTypes={materials.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))}
                        onChange={setEditTeeth}
                        disabled={false}
                        assignLabel="Materiais"
                    />

                    {/* Notas */}
                    <textarea
                        value={editNotes}
                        onChange={(e) => setEditNotes(e.target.value)}
                        rows={2}
                        placeholder="Notas do registo..."
                        className="w-full mt-2 bg-background border border-border rounded px-2 py-1 text-xs text-foreground 
                                   placeholder:text-muted-foreground resize-none"
                    />
                </div>
            )}
        </div>
    );
}
