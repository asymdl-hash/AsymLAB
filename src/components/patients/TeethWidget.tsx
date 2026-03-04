'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, X, Edit2, ChevronDown, ChevronRight, FolderOpen, Copy, MessageCircle, Check, AlertCircle } from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import { OdontogramContent } from './Odontogram';
import WhatsAppSendModal from './WhatsAppSendModal';
import { supabase } from '@/lib/supabase';

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
    material_id: string | null;
    material_name: string;
    marca: string;
    fornecedor: string;
    ref_fabricante: string;
    ref_fornecedor: string;
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
    marca: string | null;
    fornecedor: string | null;
    ref_fabricante: string | null;
    ref_fornecedor: string | null;
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
    appt_type: string;
    appt_date: string;
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

    // Estado para cards colapsáveis individuais
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    // Estado temporário para edição
    const [editTeeth, setEditTeeth] = useState<ToothEntry[]>([]);
    const [editNotes, setEditNotes] = useState('');
    const [editMaterialId, setEditMaterialId] = useState('');
    const [editMaterialName, setEditMaterialName] = useState('');
    const [editMarca, setEditMarca] = useState('');
    const [editFornecedor, setEditFornecedor] = useState('');
    const [editRefFab, setEditRefFab] = useState('');
    const [editRefForn, setEditRefForn] = useState('');
    const [waModalData, setWaModalData] = useState<{ autoSummary: string; recId: string } | null>(null);

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

    const toggleCard = (id: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    // Iniciar novo registo
    const handleStartCreate = () => {
        setCreating(true);
        setEditTeeth([]);
        setEditNotes('');
        setEditMaterialId('');
        setEditMaterialName('');
        setEditMarca('');
        setEditFornecedor('');
        setEditRefFab('');
        setEditRefForn('');
        setEditingId(null);
        setExpanded(true);
    };

    // Iniciar edição
    const handleStartEdit = (rec: TeethRecord) => {
        setEditingId(rec.id);
        setEditTeeth(rec.teeth_data || []);
        setEditNotes(rec.notas || '');
        setEditMaterialId(rec.material_id || '');
        setEditMaterialName(rec.material_name || '');
        setEditMarca(rec.marca || '');
        setEditFornecedor(rec.fornecedor || '');
        setEditRefFab(rec.ref_fabricante || '');
        setEditRefForn(rec.ref_fornecedor || '');
        setCreating(false);
        setExpanded(true);
    };

    // Cancelar
    const handleCancel = () => {
        setCreating(false);
        setEditingId(null);
        setEditTeeth([]);
        setEditNotes('');
        setEditMaterialId('');
        setEditMaterialName('');
        setEditMarca('');
        setEditFornecedor('');
        setEditRefFab('');
        setEditRefForn('');
    };

    // Abrir pasta Dentes no Explorer
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
                    appt_type: hierarchy.appt_type,
                    appt_date: hierarchy.appt_date,
                    subfolder: 'Dentes',
                }),
            });
        } catch (err) {
            console.error('[TeethWidget] Erro ao abrir pasta:', err);
        }
    };

    // Seleccionar material do catálogo (auto-fill)
    const handleSelectMaterial = (materialId: string) => {
        const mat = materials.find(m => m.id === materialId);
        if (mat) {
            setEditMaterialId(mat.id);
            setEditMaterialName(mat.nome);
            setEditMarca(mat.marca || '');
            setEditFornecedor(mat.fornecedor || '');
            setEditRefFab(mat.ref_fabricante || '');
            setEditRefForn(mat.ref_fornecedor || '');
        } else {
            setEditMaterialId('');
            setEditMaterialName('');
            setEditMarca('');
            setEditFornecedor('');
            setEditRefFab('');
            setEditRefForn('');
        }
    };

    // Guardar (criar ou actualizar)
    const handleSave = async () => {
        if (editTeeth.length === 0) return;
        setSaving(true);
        try {
            const materialData = {
                material_id: editMaterialId || null,
                material_name: editMaterialName,
                marca: editMarca,
                fornecedor: editFornecedor,
                ref_fabricante: editRefFab,
                ref_fornecedor: editRefForn,
            };
            if (creating) {
                await patientsService.createTeethRecord(appointmentId, editTeeth, editNotes, materialData);
            } else if (editingId) {
                await patientsService.updateTeethRecord(editingId, editTeeth, editNotes, materialData);
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

    // Dentes já usados noutros registos
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

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
        catch { return ''; }
    };

    return (
        <>
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
                                ? <ChevronDown className="w-3 h-3 text-muted-foreground rotate-180" />
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

                    {/* Lista de registos como cards colapsáveis */}
                    {expanded && records.length > 0 && !isEditing && (
                        <div className="mt-2 space-y-1.5">
                            {records.map((rec, idx) => {
                                const isCardExpanded = expandedCards.has(rec.id);
                                const teeth = rec.teeth_data?.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ');
                                return (
                                    <div key={rec.id} className="bg-muted/50 rounded-md border border-border/50 overflow-hidden">
                                        {/* Card header — clicável para expandir */}
                                        <div className="flex items-center justify-between px-2.5 py-1.5">
                                            <button
                                                onClick={() => toggleCard(rec.id)}
                                                className="flex items-center gap-1.5 text-left flex-1 min-w-0"
                                            >
                                                {isCardExpanded
                                                    ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                    : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                                }
                                                <span className="text-[10px] font-mono text-muted-foreground cursor-pointer hover:text-foreground">#{idx + 1}</span>
                                                <span className="text-[10px] text-muted-foreground">{formatDate(rec.created_at)}</span>
                                                {!isCardExpanded && (
                                                    <span className="text-[10px] text-muted-foreground/60 truncate">· {teeth}</span>
                                                )}
                                            </button>
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        const text = `🦷 Registo Dentes #${idx + 1} (V${rec.version_number})\nDentes: ${teeth}${rec.material_name ? `\nProduto: ${rec.material_name}` : ''}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
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
                                                            alert('⚠️ Este paciente não tem grupo WhatsApp criado.');
                                                            return;
                                                        }
                                                        const summary = `🦷 Dentes: ${teeth} (V${rec.version_number})${rec.material_name ? `\nProduto: ${rec.material_name}` : ''}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
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

                                        {/* Card body — expandido */}
                                        {isCardExpanded && (
                                            <div className="px-3 pb-2.5 pt-0.5 border-t border-border/30 space-y-1.5">
                                                {/* Dentes + Versão */}
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">🦷 Dentes:</span>
                                                    <span className="text-xs text-card-foreground">{teeth}</span>
                                                    <span className="text-[10px] text-muted-foreground ml-auto">V{rec.version_number}</span>
                                                </div>

                                                {/* Tabela de material */}
                                                {(rec.material_name || rec.marca || rec.fornecedor || rec.ref_fabricante || rec.ref_fornecedor) && (
                                                    <div className="overflow-x-auto">
                                                        <table className="w-full text-[10px]">
                                                            <thead>
                                                                <tr className="text-muted-foreground uppercase tracking-wider">
                                                                    <th className="text-left py-0.5 pr-2 font-medium">Produto</th>
                                                                    <th className="text-left py-0.5 pr-2 font-medium">Marca</th>
                                                                    <th className="text-left py-0.5 pr-2 font-medium">Fornecedor</th>
                                                                    <th className="text-left py-0.5 pr-2 font-medium">Ref. Fab</th>
                                                                    <th className="text-left py-0.5 font-medium">Ref</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                <tr className="text-card-foreground">
                                                                    <td className="py-0.5 pr-2">{rec.material_name || '-'}</td>
                                                                    <td className="py-0.5 pr-2">{rec.marca || '-'}</td>
                                                                    <td className="py-0.5 pr-2">{rec.fornecedor || '-'}</td>
                                                                    <td className="py-0.5 pr-2">{rec.ref_fabricante || '-'}</td>
                                                                    <td className="py-0.5">{rec.ref_fornecedor || '-'}</td>
                                                                </tr>
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                )}

                                                {/* Notas */}
                                                {rec.notas && (
                                                    <p className="text-[10px] text-muted-foreground italic">📝 {rec.notas}</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
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

                        {/* Selector de material do catálogo */}
                        <div className="mt-3 space-y-2">
                            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Material</label>
                            <select
                                value={editMaterialId}
                                onChange={(e) => handleSelectMaterial(e.target.value)}
                                className="w-full bg-background border border-border rounded px-2 py-1.5 text-xs text-foreground"
                            >
                                <option value="">— Seleccionar material —</option>
                                {materials.map(m => (
                                    <option key={m.id} value={m.id}>
                                        {m.nome}{m.marca ? ` · ${m.marca}` : ''}{m.fornecedor ? ` (${m.fornecedor})` : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Campos de material (editáveis após auto-fill) */}
                            {editMaterialName && (
                                <div className="grid grid-cols-5 gap-1.5">
                                    <div>
                                        <label className="text-[9px] text-muted-foreground">Produto</label>
                                        <input value={editMaterialName} onChange={e => setEditMaterialName(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-muted-foreground">Marca</label>
                                        <input value={editMarca} onChange={e => setEditMarca(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-muted-foreground">Fornecedor</label>
                                        <input value={editFornecedor} onChange={e => setEditFornecedor(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-muted-foreground">Ref. Fab</label>
                                        <input value={editRefFab} onChange={e => setEditRefFab(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] text-muted-foreground">Ref</label>
                                        <input value={editRefForn} onChange={e => setEditRefForn(e.target.value)}
                                            className="w-full bg-background border border-border rounded px-1.5 py-1 text-[10px] text-foreground" />
                                    </div>
                                </div>
                            )}
                        </div>

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

            {/* WhatsApp Send Modal */}
            {
                waModalData && hierarchy?.whatsapp_group_id && (
                    <WhatsAppSendModal
                        isOpen={true}
                        onClose={() => setWaModalData(null)}
                        groupId={hierarchy.whatsapp_group_id}
                        patientInfo={`${hierarchy.t_id} ${hierarchy.patient_name}`}
                        autoSummary={waModalData.autoSummary}
                    />
                )
            }
        </>
    );
}
