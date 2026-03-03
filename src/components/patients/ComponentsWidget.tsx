'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, X, Edit2, ChevronDown, ChevronUp, FolderOpen, Package, Copy, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import { OdontogramContent } from './Odontogram';
import WhatsAppSendModal from './WhatsAppSendModal';
import { supabase } from '@/lib/supabase';

interface ComponentsWidgetProps {
    appointmentId: string;
    onReload?: () => void;
}

interface ComponentRecord {
    id: string;
    appointment_id: string;
    teeth_data: ToothEntry[];
    material_id: string | null;
    material_name: string;
    quantidade: number;
    ref_fabricante: string;
    ref_fornecedor: string;
    fornecedor: string;
    notas: string | null;
    version_number: number;
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

export default function ComponentsWidget({ appointmentId, onReload }: ComponentsWidgetProps) {
    const [records, setRecords] = useState<ComponentRecord[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [hierarchy, setHierarchy] = useState<NasHierarchy | null>(null);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [creating, setCreating] = useState(false);
    const [saving, setSaving] = useState(false);

    // Estado temporário para edição
    const [editTeeth, setEditTeeth] = useState<ToothEntry[]>([]);
    const [editMaterialId, setEditMaterialId] = useState<string>('');
    const [editMaterialName, setEditMaterialName] = useState('');
    const [editQuantidade, setEditQuantidade] = useState(1);
    const [editRefFab, setEditRefFab] = useState('');
    const [editRefForn, setEditRefForn] = useState('');
    const [editFornecedor, setEditFornecedor] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [showOdontogram, setShowOdontogram] = useState(false);
    const [sendingWa, setSendingWa] = useState<string | null>(null);
    const [waSent, setWaSent] = useState<string | null>(null);
    const [waModalData, setWaModalData] = useState<{ autoSummary: string; recId: string } | null>(null);

    // Carregar dados
    const loadData = useCallback(async () => {
        try {
            const [recs, mats, hier] = await Promise.all([
                patientsService.getComponentRecords(appointmentId),
                patientsService.getMillingMaterials('widget_componentes'),
                patientsService.getAppointmentHierarchy(appointmentId),
            ]);
            setRecords(recs);
            setMaterials(mats);
            setHierarchy(hier);
        } catch (err) {
            console.error('[ComponentsWidget] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }, [appointmentId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Iniciar novo registo
    const handleStartCreate = () => {
        setCreating(true);
        setEditTeeth([]);
        setEditMaterialId('');
        setEditMaterialName('');
        setEditQuantidade(1);
        setEditRefFab('');
        setEditRefForn('');
        setEditFornecedor('');
        setEditNotes('');
        setEditingId(null);
        setExpanded(true);
        setShowOdontogram(false);
    };

    // Iniciar edição
    const handleStartEdit = (rec: ComponentRecord) => {
        setEditingId(rec.id);
        setEditTeeth(rec.teeth_data || []);
        setEditMaterialId(rec.material_id || '');
        setEditMaterialName(rec.material_name || '');
        setEditQuantidade(rec.quantidade || 1);
        setEditRefFab(rec.ref_fabricante || '');
        setEditRefForn(rec.ref_fornecedor || '');
        setEditFornecedor(rec.fornecedor || '');
        setEditNotes(rec.notas || '');
        setCreating(false);
        setExpanded(true);
        setShowOdontogram(false);
    };

    // Cancelar
    const handleCancel = () => {
        setCreating(false);
        setEditingId(null);
        setShowOdontogram(false);
    };

    // Guardar
    const handleSave = async () => {
        if (!editMaterialName.trim()) return;
        setSaving(true);
        try {
            const record = {
                teeth_data: editTeeth,
                material_id: editMaterialId || undefined,
                material_name: editMaterialName,
                quantidade: editQuantidade,
                ref_fabricante: editRefFab,
                ref_fornecedor: editRefForn,
                fornecedor: editFornecedor,
                notas: editNotes,
            };

            if (creating) {
                await patientsService.createComponentRecord(appointmentId, record);
            } else if (editingId) {
                await patientsService.updateComponentRecord(editingId, record);
            }
            handleCancel();
            await loadData();
            onReload?.();
        } catch (err) {
            console.error('[ComponentsWidget] Erro ao guardar:', err);
        } finally {
            setSaving(false);
        }
    };

    // Abrir pasta Componentes no Explorer
    const handleOpenFolder = async () => {
        if (!hierarchy) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await fetch('/api/patient-folder', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`,
                },
                body: JSON.stringify({
                    action: 'open_subfolder',
                    t_id: hierarchy.t_id,
                    plan_order: hierarchy.plan_order,
                    phase_order: hierarchy.phase_order,
                    phase_name: hierarchy.phase_name,
                    appt_order: hierarchy.appt_order,
                    subfolder: 'Componentes',
                }),
            });
        } catch (err) {
            console.error('[ComponentsWidget] Erro ao abrir pasta:', err);
        }
    };

    // Seleccionar material do dropdown
    const handleSelectMaterial = (mat: Material) => {
        setEditMaterialId(mat.id);
        setEditMaterialName(mat.nome);
    };

    const totalComponents = records.reduce((acc, r) => acc + r.quantidade, 0);

    if (loading) {
        return (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>A carregar componentes...</span>
            </div>
        );
    }

    const isEditing = creating || editingId !== null;

    return (
        <>
            <div className="mt-3">
                {/* Header compacto */}
                <div className={`p-2.5 rounded-lg border ${records.length > 0
                    ? 'bg-purple-100 dark:bg-purple-500/10 border-purple-300 dark:border-purple-500/30'
                    : 'bg-muted/50 border-border'
                    }`}>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                            <Package className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className={`text-xs font-medium ${records.length > 0 ? 'text-purple-600 dark:text-purple-400' : 'text-muted-foreground'
                                }`}>
                                {records.length > 0
                                    ? `${totalComponents} componente${totalComponents > 1 ? 's' : ''} · ${records.length} registo${records.length > 1 ? 's' : ''}`
                                    : 'Sem registos de componentes'
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
                                className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-purple-600 hover:bg-purple-500 
                                       text-xs font-medium text-white transition-all"
                            >
                                <Plus className="w-3 h-3" />
                                <span>Novo</span>
                            </button>
                        )}
                    </div>

                    {/* Lista de registos */}
                    {expanded && records.length > 0 && !isEditing && (
                        <div className="mt-2 space-y-1.5">
                            {records.map((rec, idx) => (
                                <div key={rec.id} className="flex items-center justify-between bg-muted/50 rounded-md px-2.5 py-1.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-mono text-muted-foreground">#{idx + 1}</span>
                                        <span className="text-xs text-foreground font-medium truncate">
                                            {rec.material_name || '—'}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">×{rec.quantidade}</span>
                                        {rec.teeth_data?.length > 0 && (
                                            <span className="text-[10px] text-muted-foreground">
                                                · {rec.teeth_data.length} dentes
                                            </span>
                                        )}
                                        <span className="text-[10px] text-muted-foreground">V{rec.version_number}</span>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        <button
                                            onClick={() => {
                                                const teeth = rec.teeth_data?.length > 0 ? `\nDentes: ${rec.teeth_data.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ')}` : '';
                                                const refs = [rec.ref_fabricante && `Ref.Fab: ${rec.ref_fabricante}`, rec.ref_fornecedor && `Ref.Forn: ${rec.ref_fornecedor}`, rec.fornecedor && `Fornecedor: ${rec.fornecedor}`].filter(Boolean).join(' · ');
                                                const text = `📦 Componente: ${rec.material_name || '—'} ×${rec.quantidade}${refs ? `\n${refs}` : ''}${teeth}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
                                                navigator.clipboard.writeText(text);
                                            }}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all"
                                            title="Copiar resumo"
                                        >
                                            <Copy className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (!hierarchy?.whatsapp_group_id) {
                                                    alert('⚠️ Este paciente não tem grupo WhatsApp criado. Crie o grupo na ficha do paciente.');
                                                    return;
                                                }
                                                const teeth = rec.teeth_data?.length > 0 ? ` · Dentes: ${rec.teeth_data.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ')}` : '';
                                                const summary = `📦 ${rec.material_name || '—'} ×${rec.quantidade}${teeth}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
                                                setWaModalData({ autoSummary: summary, recId: rec.id });
                                            }}
                                            className="p-1 rounded transition-all hover:bg-green-500/20 text-green-500 hover:text-green-400"
                                            title="Enviar via WhatsApp"
                                        >
                                            <MessageCircle className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={handleOpenFolder}
                                            disabled={!hierarchy}
                                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-all disabled:opacity-50"
                                            title="Abrir pasta Componentes"
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

                {/* Editor (expandido) */}
                {expanded && isEditing && (
                    <div className="mt-2 p-3 bg-muted/30 rounded-lg border border-border">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-foreground">
                                {creating ? '➕ Novo Componente' : `✏️ Editar Componente (V${records.find(r => r.id === editingId)?.version_number || 1})`}
                            </h4>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={handleSave}
                                    disabled={saving || !editMaterialName.trim()}
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

                        {/* Material */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Material</label>
                                {materials.length > 0 ? (
                                    <select
                                        value={editMaterialId}
                                        onChange={(e) => {
                                            const mat = materials.find(m => m.id === e.target.value);
                                            if (mat) handleSelectMaterial(mat);
                                        }}
                                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground"
                                    >
                                        <option value="">Seleccionar material...</option>
                                        {materials.map(m => (
                                            <option key={m.id} value={m.id}>{m.nome}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        value={editMaterialName}
                                        onChange={(e) => setEditMaterialName(e.target.value)}
                                        placeholder="Nome do material"
                                        className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                                    />
                                )}
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Quantidade</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={editQuantidade}
                                    onChange={(e) => setEditQuantidade(parseInt(e.target.value) || 1)}
                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground"
                                />
                            </div>
                        </div>

                        {/* Referências */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3">
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Ref. Fabricante</label>
                                <input
                                    value={editRefFab}
                                    onChange={(e) => setEditRefFab(e.target.value)}
                                    placeholder="Ex: ABC-123"
                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Ref. Fornecedor</label>
                                <input
                                    value={editRefForn}
                                    onChange={(e) => setEditRefForn(e.target.value)}
                                    placeholder="Ex: FRN-456"
                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1">Fornecedor</label>
                                <input
                                    value={editFornecedor}
                                    onChange={(e) => setEditFornecedor(e.target.value)}
                                    placeholder="Ex: Nobel Biocare"
                                    className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground"
                                />
                            </div>
                        </div>

                        {/* Odontograma toggle */}
                        <div className="mb-3">
                            <button
                                onClick={() => setShowOdontogram(!showOdontogram)}
                                className="flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                            >
                                {showOdontogram ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                Dentes associados ({editTeeth.length})
                            </button>
                            {showOdontogram && (
                                <div className="mt-2">
                                    <p className="text-[10px] text-muted-foreground mb-2">
                                        1) Seleccione dentes · 2) Escolha material no painel
                                    </p>
                                    <OdontogramContent
                                        teeth={editTeeth}
                                        workTypes={materials.map(m => ({ id: m.id, nome: m.nome, cor: m.cor }))}
                                        onChange={setEditTeeth}
                                        disabled={false}
                                        assignLabel="Materiais"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Notas */}
                        <textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            rows={2}
                            placeholder="Notas do componente..."
                            className="w-full bg-background border border-border rounded px-2 py-1 text-xs text-foreground 
                                   placeholder:text-muted-foreground resize-none"
                        />
                    </div>
                )}
            </div>

            {/* WhatsApp Send Modal */}
            {waModalData && hierarchy?.whatsapp_group_id && (
                <WhatsAppSendModal
                    isOpen={true}
                    onClose={() => setWaModalData(null)}
                    groupId={hierarchy.whatsapp_group_id}
                    patientInfo={`${hierarchy.t_id} ${hierarchy.patient_name}`}
                    autoSummary={waModalData.autoSummary}
                />
            )}
        </>
    );
}
