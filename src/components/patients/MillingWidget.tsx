'use client';

import { useState, useEffect, useCallback } from 'react';
import { Droplets, FolderOpen, RefreshCw, Check, ChevronDown, ChevronRight, Loader2, Plus } from 'lucide-react';
import { patientsService } from '@/services/patientsService';
import { supabase } from '@/lib/supabase';

interface MillingWidgetProps {
    appointmentId: string;
    onReload?: () => void;
}

interface MillingMaterial {
    id: string;
    nome: string;
    categoria: string | null;
    cor: string | null;
    marca: string | null;
    fornecedor: string | null;
    ref_fabricante: string | null;
    ref_fornecedor: string | null;
}

interface MillingRecord {
    id: string;
    appointment_id: string;
    material_id: string | null;
    material_name: string;
    marca: string;
    fornecedor: string;
    ref_fabricante: string;
    ref_fornecedor: string;
    status: string;
    sequence_number: number;
    nas_folder_path: string | null;
    notas: string | null;
    created_at: string;
}

interface NasHierarchy {
    t_id: string;
    plan_order: number;
    phase_order: number;
    phase_name: string;
    appt_order: number;
    appt_type: string;
    appt_date: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pendente: { label: 'Pendente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30', icon: '⏳' },
    material_escolhido: { label: 'Material Escolhido', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30', icon: '🔵' },
    em_fresagem: { label: 'Em Fresagem', color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-100 dark:bg-purple-500/15 border-purple-300 dark:border-purple-500/30', icon: '🔄' },
    concluido: { label: 'Concluído', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30', icon: '✅' },
};

export default function MillingWidget({ appointmentId, onReload }: MillingWidgetProps) {
    const [records, setRecords] = useState<MillingRecord[]>([]);
    const [materials, setMaterials] = useState<MillingMaterial[]>([]);
    const [hierarchy, setHierarchy] = useState<NasHierarchy | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

    // Carregar dados + resolver hierarquia
    const loadData = useCallback(async () => {
        try {
            const [recs, mats, hier] = await Promise.all([
                patientsService.getMillingRecords(appointmentId),
                patientsService.getMillingMaterials('widget_fresagem'),
                patientsService.getAppointmentHierarchy(appointmentId),
            ]);
            setRecords(recs);
            setMaterials(mats);
            setHierarchy(hier);
        } catch (err) {
            console.error('[MillingWidget] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }, [appointmentId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Seleccionar material e criar registo (com auto-fill de marca/fornecedor/refs)
    const handleSelectMaterial = async (mat: MillingMaterial) => {
        setSaving(true);
        setShowDropdown(false);
        try {
            const created = await patientsService.createMillingRecord(appointmentId, mat.id, mat.nome);
            // Adicionar ao array de registos
            const newRecord: MillingRecord = {
                ...created,
                marca: mat.marca || '',
                fornecedor: mat.fornecedor || '',
                ref_fabricante: mat.ref_fabricante || '',
                ref_fornecedor: mat.ref_fornecedor || '',
            };
            setRecords(prev => [...prev, newRecord]);
            onReload?.();
            // Criar pasta CNC individual no NAS
            if (hierarchy) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    await fetch('/api/patient-folder', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${session?.access_token}`,
                        },
                        body: JSON.stringify({
                            action: 'open_cnc_folder',
                            t_id: hierarchy.t_id,
                            plan_order: hierarchy.plan_order,
                            phase_order: hierarchy.phase_order,
                            phase_name: hierarchy.phase_name,
                            appt_order: hierarchy.appt_order,
                            appt_type: hierarchy.appt_type,
                            appt_date: hierarchy.appt_date,
                            sequence_number: created.sequence_number || newRecord.sequence_number || 1,
                            material_name: mat.nome,
                        }),
                    });
                } catch (folderErr) {
                    console.warn('[MillingWidget] Pasta CNC não criada:', folderErr);
                }
            }
            // Tentar actualizar campos de material extra (não bloqueia se falhar)
            if (mat.marca || mat.fornecedor || mat.ref_fabricante || mat.ref_fornecedor) {
                try {
                    await patientsService.updateMillingRecord(created.id, {
                        marca: mat.marca || '',
                        fornecedor: mat.fornecedor || '',
                        ref_fabricante: mat.ref_fabricante || '',
                        ref_fornecedor: mat.ref_fornecedor || '',
                    });
                } catch (updateErr) {
                    console.warn('[MillingWidget] Campos extra não actualizados:', updateErr);
                }
            }
        } catch (err) {
            console.error('[MillingWidget] Erro ao criar registo:', err);
        } finally {
            setSaving(false);
        }
    };

    // Abrir pasta Fresagem genérica no Explorer
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
                    subfolder: 'Fresagem',
                }),
            });
        } catch (err) {
            console.error('[MillingWidget] Erro ao abrir pasta:', err);
        }
    };

    // Abrir pasta CNC individual de um registo específico
    const handleOpenCncFolder = async (rec: MillingRecord) => {
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
                    action: 'open_cnc_folder',
                    t_id: hierarchy.t_id,
                    plan_order: hierarchy.plan_order,
                    phase_order: hierarchy.phase_order,
                    phase_name: hierarchy.phase_name,
                    appt_order: hierarchy.appt_order,
                    appt_type: hierarchy.appt_type,
                    appt_date: hierarchy.appt_date,
                    sequence_number: rec.sequence_number || 1,
                    material_name: rec.material_name,
                }),
            });
        } catch (err) {
            console.error('[MillingWidget] Erro ao abrir pasta CNC:', err);
        }
    };

    const toggleCard = (id: string) => {
        setExpandedCards(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const formatDate = (d: string) => {
        try { return new Date(d).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
        catch { return ''; }
    };

    if (loading) {
        return (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>A carregar fresagem...</span>
            </div>
        );
    }

    // Contagem de estados
    const totalRecords = records.length;
    const completedCount = records.filter(r => r.status === 'concluido').length;

    // Gerar label resumido
    const getSummaryLabel = () => {
        if (totalRecords === 0) return '⏳ Fresagem Pendente';
        if (completedCount === totalRecords) return `✅ ${totalRecords} ${totalRecords > 1 ? 'fresagens' : 'fresagem'} concluída${totalRecords > 1 ? 's' : ''}`;
        return `🔄 ${totalRecords} ${totalRecords > 1 ? 'fresagens' : 'fresagem'} · ${completedCount} concluída${completedCount !== 1 ? 's' : ''}`;
    };

    const getSummaryColor = () => {
        if (totalRecords === 0) return 'text-amber-400';
        if (completedCount === totalRecords) return 'text-emerald-400';
        return 'text-blue-400';
    };

    const getSummaryBg = () => {
        if (totalRecords === 0) return STATUS_CONFIG.pendente.bg;
        if (completedCount === totalRecords) return STATUS_CONFIG.concluido.bg;
        return STATUS_CONFIG.material_escolhido.bg;
    };

    // ─── Dropdown de materiais ───
    const renderDropdown = () => (
        showDropdown && (
            <div className="absolute right-0 mt-1 w-64 bg-card border border-border rounded-lg shadow-xl z-50 
                            max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-200">
                {materials.length === 0 ? (
                    <p className="px-3 py-2 text-xs text-muted-foreground">Sem materiais configurados</p>
                ) : (
                    <>
                        {Object.entries(
                            materials.reduce((acc, m) => {
                                const cat = m.categoria || 'Outros';
                                if (!acc[cat]) acc[cat] = [];
                                acc[cat].push(m);
                                return acc;
                            }, {} as Record<string, MillingMaterial[]>)
                        ).map(([cat, mats]) => (
                            <div key={cat}>
                                <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                                    {cat}
                                </div>
                                {mats.map(m => (
                                    <button
                                        key={m.id}
                                        onClick={() => handleSelectMaterial(m)}
                                        className="w-full text-left px-3 py-2 text-sm hover:bg-muted 
                                                   text-card-foreground transition-colors flex items-center gap-2"
                                    >
                                        <Droplets className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                                        <div className="min-w-0">
                                            <span className="text-xs">{m.nome}</span>
                                            {m.marca && <span className="text-[10px] text-muted-foreground ml-1">· {m.marca}</span>}
                                            {m.fornecedor && <span className="text-[10px] text-muted-foreground ml-1">({m.fornecedor})</span>}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ))}
                    </>
                )}
            </div>
        )
    );

    // ─── Render de um registo individual ───
    const renderRecord = (rec: MillingRecord) => {
        const cfg = STATUS_CONFIG[rec.status] || STATUS_CONFIG.pendente;
        const expanded = expandedCards.has(rec.id);

        return (
            <div key={rec.id} className={`rounded-lg border overflow-hidden ${cfg.bg}`}>
                {/* Card header */}
                <div className="flex items-center justify-between px-2.5 py-2">
                    <button
                        onClick={() => toggleCard(rec.id)}
                        className="flex items-center gap-1.5 text-left flex-1 min-w-0"
                    >
                        {expanded
                            ? <ChevronDown className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            : <ChevronRight className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        }
                        <Droplets className={`w-3.5 h-3.5 flex-shrink-0 ${cfg.color}`} />
                        <span className={`text-xs font-medium ${cfg.color}`}>
                            {cfg.icon} {cfg.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(rec.created_at)}</span>
                        {!expanded && (
                            <span className="text-xs text-muted-foreground/60 truncate">— {rec.material_name}</span>
                        )}
                    </button>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={() => handleOpenCncFolder(rec)}
                            disabled={!hierarchy}
                            title={`Abrir pasta CNC nº${rec.sequence_number} ${rec.material_name}`}
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground 
                                       hover:text-card-foreground transition-all disabled:opacity-50"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Card body — expandido */}
                {expanded && (
                    <div className="px-3 pb-2.5 pt-0.5 border-t border-border/30 space-y-1.5">
                        {/* Tabela de material */}
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

                        {/* Notas */}
                        {rec.notas && (
                            <p className="text-[10px] text-muted-foreground italic">📝 {rec.notas}</p>
                        )}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="mt-3 relative">
            {/* Header com resumo */}
            <div className={`p-2.5 rounded-lg border ${getSummaryBg()}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Droplets className={`w-3.5 h-3.5 ${getSummaryColor()}`} />
                        <span className={`text-xs font-medium ${getSummaryColor()}`}>
                            {getSummaryLabel()}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={handleOpenFolder}
                            disabled={!hierarchy}
                            title="Abrir pasta Fresagem"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground 
                                       hover:text-card-foreground transition-all disabled:opacity-50"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                            onClick={() => setShowDropdown(!showDropdown)}
                            disabled={saving}
                            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 hover:bg-blue-500 
                                       text-xs font-medium text-white transition-all disabled:opacity-50"
                        >
                            {saving ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                                <>
                                    <Plus className="w-3 h-3" />
                                    <span>Escolher Material</span>
                                    <ChevronDown className="w-3 h-3" />
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Dropdown de materiais */}
            {renderDropdown()}

            {/* Lista de registos */}
            {records.length > 0 && (
                <div className="mt-2 space-y-1.5">
                    {records.map(rec => renderRecord(rec))}
                </div>
            )}
        </div>
    );
}
