'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, Plus, Save, X, Edit2, ChevronDown, ChevronRight, FolderOpen, Package, Copy, MessageCircle, Check, AlertCircle } from 'lucide-react';
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
    marca: string;
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
    marca: string | null;
    fornecedor: string | null;
    ref_fabricante: string | null;
    ref_fornecedor: string | null;
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

export default function ComponentsWidget({ appointmentId, onReload }: ComponentsWidgetProps) {
    const [records, setRecords] = useState<ComponentRecord[]>([]);
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
    const [editMaterialId, setEditMaterialId] = useState<string>('');
    const [editMaterialName, setEditMaterialName] = useState('');
    const [editMarca, setEditMarca] = useState('');
    const [editQuantidade, setEditQuantidade] = useState(1);
    const [editRefFab, setEditRefFab] = useState('');
    const [editRefForn, setEditRefForn] = useState('');
    const [editFornecedor, setEditFornecedor] = useState('');
    const [editNotes, setEditNotes] = useState('');
    const [showOdontogram, setShowOdontogram] = useState(false);
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
        setEditMaterialId('');
        setEditMaterialName('');
        setEditMarca('');
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
        setEditMarca(rec.marca || '');
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

    // Seleccionar material do dropdown (auto-fill)
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

    // Guardar
    const handleSave = async () => {
        if (!editMaterialName.trim()) return;
        setSaving(true);
        try {
            const record = {
                teeth_data: editTeeth,
                material_id: editMaterialId || undefined,
                material_name: editMaterialName,
                marca: editMarca,
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
                    appt_type: hierarchy.appt_type,
                    appt_date: hierarchy.appt_date,
                    subfolder: 'Componentes',
                }),
            });
        } catch (err) {
            console.error('[ComponentsWidget] Erro ao abrir pasta:', err);
        }
    };

    const totalComponents = records.reduce((acc, r) => acc + r.quantidade, 0);

    if (loading) {
        return (
            <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>A carregar componentes...</span>
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
                    ? 'bg-purple-50 border-purple-200'
                    : 'bg-gray-50 border-gray-200'
                    }`}>
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setExpanded(!expanded)}
                            className="flex items-center gap-2 text-left flex-1 min-w-0"
                        >
                            <Package className="w-4 h-4 text-purple-600" />
                            <span className={`text-xs font-medium ${records.length > 0 ? 'text-purple-600' : 'text-gray-400'
                                }`}>
                                {records.length > 0
                                    ? `${totalComponents} componente${totalComponents > 1 ? 's' : ''} · ${records.length} registo${records.length > 1 ? 's' : ''}`
                                    : 'Sem registos de componentes'
                                }
                            </span>
                            {expanded
                                ? <ChevronDown className="w-3 h-3 text-gray-400 rotate-180" />
                                : <ChevronDown className="w-3 h-3 text-gray-400" />
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

                    {/* Lista de registos como cards colapsáveis */}
                    {expanded && records.length > 0 && !isEditing && (
                        <div className="mt-2 space-y-1.5">
                            {records.map((rec, idx) => {
                                const isCardExpanded = expandedCards.has(rec.id);
                                const teeth = rec.teeth_data?.map((t: ToothEntry) => t.tooth_number).sort((a: number, b: number) => a - b).join(', ');
                                return (
                                    <div key={rec.id} className="bg-gray-50 rounded-md border border-gray-200/50 overflow-hidden">
                                        {/* Card header — clicável para expandir */}
                                        <div className="flex items-center justify-between px-2.5 py-1.5">
                                            <button
                                                onClick={() => toggleCard(rec.id)}
                                                className="flex items-center gap-1.5 text-left flex-1 min-w-0"
                                            >
                                                {isCardExpanded
                                                    ? <ChevronDown className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                    : <ChevronRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                                }
                                                <span className="text-[10px] font-mono text-gray-400 cursor-pointer hover:text-gray-700">#{idx + 1}</span>
                                                <span className="text-[10px] text-gray-400">{formatDate(rec.created_at)}</span>
                                                {!isCardExpanded && (
                                                    <span className="text-[10px] text-gray-300 truncate">· {rec.material_name || '—'} ×{rec.quantidade}</span>
                                                )}
                                            </button>
                                            <div className="flex items-center gap-0.5 flex-shrink-0">
                                                <button
                                                    onClick={() => {
                                                        const teethStr = rec.teeth_data?.length > 0 ? `\nDentes: ${teeth}` : '';
                                                        const refs = [rec.ref_fabricante && `Ref.Fab: ${rec.ref_fabricante}`, rec.ref_fornecedor && `Ref.Forn: ${rec.ref_fornecedor}`, rec.fornecedor && `Fornecedor: ${rec.fornecedor}`].filter(Boolean).join(' · ');
                                                        const text = `📦 Componente: ${rec.material_name || '—'} ×${rec.quantidade}${refs ? `\n${refs}` : ''}${teethStr}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
                                                        navigator.clipboard.writeText(text);
                                                    }}
                                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
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
                                                        const teethStr = rec.teeth_data?.length > 0 ? ` · Dentes: ${teeth}` : '';
                                                        const summary = `📦 ${rec.material_name || '—'} ×${rec.quantidade}${teethStr}${rec.notas ? `\nNotas: ${rec.notas}` : ''}`;
                                                        setWaModalData({ autoSummary: summary, recId: rec.id });
                                                    }}
                                                    className="p-1 rounded transition-all hover:bg-green-50 text-green-600 hover:text-green-500"
                                                    title="Enviar via WhatsApp"
                                                >
                                                    <MessageCircle className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={handleOpenFolder}
                                                    disabled={!hierarchy}
                                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all disabled:opacity-50"
                                                    title="Abrir pasta Componentes"
                                                >
                                                    <FolderOpen className="w-3 h-3" />
                                                </button>
                                                <button
                                                    onClick={() => handleStartEdit(rec)}
                                                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                                                    title="Editar registo"
                                                >
                                                    <Edit2 className="w-3 h-3" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Card body — expandido */}
                                        {isCardExpanded && (
                                            <div className="px-3 pb-2.5 pt-0.5 border-t border-gray-200/30 space-y-1.5">
                                                {/* Tabela de material + dentes */}
                                                <div className="overflow-x-auto">
                                                    <table className="w-full text-[10px]">
                                                        <thead>
                                                            <tr className="text-gray-400 uppercase tracking-wider">
                                                                <th className="text-left py-0.5 pr-2 font-medium">Dentes</th>
                                                                <th className="text-left py-0.5 pr-2 font-medium">Produto</th>
                                                                <th className="text-left py-0.5 pr-2 font-medium">Marca</th>
                                                                <th className="text-left py-0.5 pr-2 font-medium">Fornecedor</th>
                                                                <th className="text-left py-0.5 pr-2 font-medium">Ref. Fab</th>
                                                                <th className="text-left py-0.5 pr-2 font-medium">Ref</th>
                                                                <th className="text-left py-0.5 font-medium">Qtd</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr className="text-gray-900">
                                                                <td className="py-0.5 pr-2">{teeth || '-'}</td>
                                                                <td className="py-0.5 pr-2">{rec.material_name || '-'}</td>
                                                                <td className="py-0.5 pr-2">{rec.marca || '-'}</td>
                                                                <td className="py-0.5 pr-2">{rec.fornecedor || '-'}</td>
                                                                <td className="py-0.5 pr-2">{rec.ref_fabricante || '-'}</td>
                                                                <td className="py-0.5 pr-2">{rec.ref_fornecedor || '-'}</td>
                                                                <td className="py-0.5">{rec.quantidade}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>

                                                {/* Notas */}
                                                {rec.notas && (
                                                    <p className="text-[10px] text-gray-400 italic">📝 {rec.notas}</p>
                                                )}

                                                <span className="text-[10px] text-gray-400">V{rec.version_number}</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Editor (expandido) */}
                {expanded && isEditing && (
                    <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                            <h4 className="text-xs font-semibold text-gray-900">
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
                                    className="p-1.5 rounded-md hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-all"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Material selector + Quantidade */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Material</label>
                                <select
                                    value={editMaterialId}
                                    onChange={(e) => handleSelectMaterial(e.target.value)}
                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900"
                                >
                                    <option value="">— Seleccionar material —</option>
                                    {materials.map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.nome}{m.marca ? ` · ${m.marca}` : ''}{m.fornecedor ? ` (${m.fornecedor})` : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">Quantidade</label>
                                <input
                                    type="number"
                                    min={1}
                                    value={editQuantidade}
                                    onChange={(e) => setEditQuantidade(parseInt(e.target.value) || 1)}
                                    className="w-full bg-white border border-gray-200 rounded px-2 py-1.5 text-xs text-gray-900"
                                />
                            </div>
                        </div>

                        {/* Campos de material (editáveis após auto-fill) */}
                        {editMaterialName && (
                            <div className="grid grid-cols-5 gap-1.5 mb-3">
                                <div>
                                    <label className="text-[9px] text-gray-400">Produto</label>
                                    <input value={editMaterialName} onChange={e => setEditMaterialName(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-400">Marca</label>
                                    <input value={editMarca} onChange={e => setEditMarca(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-400">Fornecedor</label>
                                    <input value={editFornecedor} onChange={e => setEditFornecedor(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-400">Ref. Fab</label>
                                    <input value={editRefFab} onChange={e => setEditRefFab(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-900" />
                                </div>
                                <div>
                                    <label className="text-[9px] text-gray-400">Ref</label>
                                    <input value={editRefForn} onChange={e => setEditRefForn(e.target.value)}
                                        className="w-full bg-white border border-gray-200 rounded px-1.5 py-1 text-[10px] text-gray-900" />
                                </div>
                            </div>
                        )}

                        {/* Odontograma toggle */}
                        <div className="mb-3">
                            <button
                                onClick={() => setShowOdontogram(!showOdontogram)}
                                className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wider hover:text-gray-700 transition-colors"
                            >
                                {showOdontogram ? <ChevronDown className="w-3 h-3 rotate-180" /> : <ChevronDown className="w-3 h-3" />}
                                Dentes associados ({editTeeth.length})
                            </button>
                            {showOdontogram && (
                                <div className="mt-2">
                                    <p className="text-[10px] text-gray-400 mb-2">
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
                            className="w-full bg-white border border-gray-200 rounded px-2 py-1 text-xs text-gray-900 
                                   placeholder:text-gray-400 resize-none"
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
