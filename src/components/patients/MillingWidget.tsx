'use client';

import { useState, useEffect, useCallback } from 'react';
import { Droplets, FolderOpen, RefreshCw, Check, ChevronDown, Loader2 } from 'lucide-react';
import { patientsService } from '@/services/patientsService';

interface MillingWidgetProps {
    appointmentId: string;
    onReload?: () => void;
}

interface MillingMaterial {
    id: string;
    nome: string;
    categoria: string | null;
    cor: string | null;
}

interface MillingRecord {
    id: string;
    appointment_id: string;
    material_id: string | null;
    material_name: string;
    status: string;
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
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
    pendente: { label: 'Pendente', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/30', icon: '⏳' },
    em_curso: { label: 'Em Curso', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-500/15 border-blue-300 dark:border-blue-500/30', icon: '🔄' },
    concluido: { label: 'Concluído', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/30', icon: '✅' },
};

export default function MillingWidget({ appointmentId, onReload }: MillingWidgetProps) {
    const [record, setRecord] = useState<MillingRecord | null>(null);
    const [materials, setMaterials] = useState<MillingMaterial[]>([]);
    const [hierarchy, setHierarchy] = useState<NasHierarchy | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const [checking, setChecking] = useState(false);
    const [hasFiles, setHasFiles] = useState<boolean | null>(null);

    // Carregar dados + resolver hierarquia
    const loadData = useCallback(async () => {
        try {
            const [rec, mats, hier] = await Promise.all([
                patientsService.getMillingRecord(appointmentId),
                patientsService.getMillingMaterials('widget_fresagem'),
                patientsService.getAppointmentHierarchy(appointmentId),
            ]);
            setRecord(rec);
            setMaterials(mats);
            setHierarchy(hier);
        } catch (err) {
            console.error('[MillingWidget] Erro ao carregar:', err);
        } finally {
            setLoading(false);
        }
    }, [appointmentId]);

    useEffect(() => { loadData(); }, [loadData]);

    // Seleccionar material e criar registo
    const handleSelectMaterial = async (mat: MillingMaterial) => {
        setSaving(true);
        setShowDropdown(false);
        try {
            const created = await patientsService.createMillingRecord(appointmentId, mat.id, mat.nome);
            setRecord(created);
            onReload?.();
        } catch (err) {
            console.error('[MillingWidget] Erro ao criar registo:', err);
        } finally {
            setSaving(false);
        }
    };

    // Abrir pasta Fresagem no Explorer
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
                    subfolder: 'Fresagem',
                }),
            });
        } catch (err) {
            console.error('[MillingWidget] Erro ao abrir pasta:', err);
        }
    };

    // Check ficheiros NAS (determina concluido)
    const handleCheckFiles = async () => {
        if (!hierarchy) return;
        setChecking(true);
        try {
            const res = await fetch('/api/patient-folder', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'check_milling_files',
                    t_id: hierarchy.t_id,
                    plan_order: hierarchy.plan_order,
                    phase_order: hierarchy.phase_order,
                    phase_name: hierarchy.phase_name,
                    appt_order: hierarchy.appt_order,
                }),
            });
            const result = await res.json();
            setHasFiles(result.hasFiles);
            if (result.hasFiles && record?.status !== 'concluido') {
                await patientsService.updateMillingRecord(record!.id, { status: 'concluido' });
                setRecord(prev => prev ? { ...prev, status: 'concluido' } : null);
                onReload?.();
            } else if (!result.hasFiles && record?.status === 'concluido') {
                await patientsService.updateMillingRecord(record!.id, { status: 'em_curso' });
                setRecord(prev => prev ? { ...prev, status: 'em_curso' } : null);
                onReload?.();
            }
        } catch (err) {
            console.error('[MillingWidget] Erro ao verificar ficheiros:', err);
        } finally {
            setChecking(false);
        }
    };

    if (loading) {
        return (
            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>A carregar fresagem...</span>
            </div>
        );
    }

    const statusCfg = record ? STATUS_CONFIG[record.status] || STATUS_CONFIG.pendente : STATUS_CONFIG.pendente;

    // ─── Estado: Pendente (sem registo) → mostrar dropdown material ───
    if (!record) {
        return (
            <div className="mt-3 relative">
                <div className={`p-2.5 rounded-lg border ${STATUS_CONFIG.pendente.bg}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Droplets className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-xs font-medium text-amber-400">
                                ⏳ Fresagem Pendente
                            </span>
                        </div>
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
                                    <span>Escolher Material</span>
                                    <ChevronDown className="w-3 h-3" />
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Dropdown de materiais */}
                {showDropdown && (
                    <div className="absolute right-0 mt-1 w-56 bg-card border border-border rounded-lg shadow-xl z-50 
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
                                                <Droplets className="w-3.5 h-3.5 text-blue-400" />
                                                {m.nome}
                                            </button>
                                        ))}
                                    </div>
                                ))}
                            </>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // ─── Estado: Em Curso ou Concluído ───
    return (
        <div className="mt-3">
            <div className={`p-2.5 rounded-lg border ${statusCfg.bg}`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                        <Droplets className={`w-3.5 h-3.5 flex-shrink-0 ${statusCfg.color}`} />
                        <span className={`text-xs font-medium ${statusCfg.color}`}>
                            {statusCfg.icon} {statusCfg.label}
                        </span>
                        <span className="text-xs text-muted-foreground truncate">— {record.material_name}</span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                            onClick={handleCheckFiles}
                            disabled={checking || !hierarchy}
                            title="Verificar ficheiros na pasta"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground 
                                       hover:text-card-foreground transition-all disabled:opacity-50"
                        >
                            {checking ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <RefreshCw className="w-3.5 h-3.5" />
                            )}
                        </button>
                        <button
                            onClick={handleOpenFolder}
                            disabled={!hierarchy}
                            title="Abrir pasta Fresagem no Explorer"
                            className="p-1.5 rounded-md hover:bg-muted text-muted-foreground 
                                       hover:text-card-foreground transition-all disabled:opacity-50"
                        >
                            <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {hasFiles !== null && (
                    <div className={`mt-1.5 flex items-center gap-1.5 text-[10px] ${hasFiles ? 'text-emerald-400' : 'text-amber-400'
                        }`}>
                        <Check className="w-3 h-3" />
                        <span>{hasFiles ? 'Ficheiros detectados na pasta' : 'Sem ficheiros na pasta'}</span>
                    </div>
                )}
            </div>
        </div>
    );
}
