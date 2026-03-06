'use client';

import { useState, useCallback, useRef, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { TOOTH_PATHS } from './tooth_paths_data';
import { TOOTH_CENTERS } from './tooth_centers';

// ═══════════════════════════════════════════════════════════
// FDI ISO 3950 — Odontograma V7
// Usa paths SVG originais pré-posicionados (viewBox ~290×380)
// com formas dentárias detalhadas e anatomicamente correctas.
// ═══════════════════════════════════════════════════════════

interface WorkType { id: string; nome: string; cor: string | null; activo?: boolean; }
interface ToothData { tooth_number: number; work_type_id: string | null; }
interface PendingAssignment { work_type_id: string; total: number; assigned: number; }
interface OdontogramProps { teeth: ToothData[]; workTypes: WorkType[]; onChange: (teeth: ToothData[]) => void; disabled?: boolean; selectionMode?: 'assign' | 'toggle'; assignLabel?: string; pendingAssignments?: PendingAssignment[]; }
interface OdontogramModalProps extends OdontogramProps { open: boolean; onClose: () => void; }

// Ordem das arcadas
const UPPER = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const LOWER = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const ALL_TEETH = [...UPPER, ...LOWER];

// ═══════════════════════════════════════════════════════════
// Odontogram Content — SVG com paths pré-posicionados
// ═══════════════════════════════════════════════════════════

export function OdontogramContent({ teeth, workTypes, onChange, disabled = false, selectionMode = 'assign', assignLabel = 'Tipos de Trabalho', pendingAssignments }: OdontogramProps) {
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [showAssign, setShowAssign] = useState(true);
    const lastRef = useRef<number | null>(null);

    const tMap = useMemo(() => {
        const m = new Map<number, string | null>();
        teeth.forEach(t => m.set(t.tooth_number, t.work_type_id));
        return m;
    }, [teeth]);
    const wtMap = useMemo(() => {
        const m = new Map<string, WorkType>();
        workTypes.forEach(wt => m.set(wt.id, wt));
        return m;
    }, [workTypes]);

    // Modo toggle: click directo adiciona/remove do array
    const toggleTooth = useCallback((e: React.MouseEvent, num: number) => {
        if (disabled) return;
        e.stopPropagation();

        // Calcular dentes a toggle
        const toToggle = new Set<number>();

        if (e.shiftKey && lastRef.current !== null) {
            const last = lastRef.current;
            const a1 = UPPER.includes(last), a2 = UPPER.includes(num);
            if (a1 === a2) {
                const ar = a2 ? UPPER : LOWER;
                const [i, j] = [ar.indexOf(last), ar.indexOf(num)].sort((a, b) => a - b);
                for (let k = i; k <= j; k++) toToggle.add(ar[k]);
            } else {
                toToggle.add(num);
            }
        } else {
            toToggle.add(num);
        }

        // Aplicar toggle
        const updated = [...teeth];
        toToggle.forEach(t => {
            const idx = updated.findIndex(x => x.tooth_number === t);
            if (idx >= 0) {
                // Se shift, não remover — só adicionar
                if (!e.shiftKey) updated.splice(idx, 1);
            } else {
                updated.push({ tooth_number: t, work_type_id: null });
            }
        });
        onChange(updated);
        lastRef.current = num;
    }, [disabled, teeth, onChange]);

    const click = useCallback((e: React.MouseEvent, num: number) => {
        if (disabled) return;
        if (selectionMode === 'toggle') return toggleTooth(e, num);
        e.stopPropagation();
        e.preventDefault();

        // Extrair propriedades do evento ANTES do callback assíncrono
        const isShift = e.shiftKey;
        const isCtrl = e.ctrlKey || e.metaKey;
        const last = lastRef.current;

        setSelected(prev => {
            const n = new Set(prev);
            if (isShift && last !== null) {
                const a1 = UPPER.includes(last), a2 = UPPER.includes(num);
                if (a1 === a2) {
                    const ar = a2 ? UPPER : LOWER;
                    const [i, j] = [ar.indexOf(last), ar.indexOf(num)].sort((a, b) => a - b);
                    for (let k = i; k <= j; k++) n.add(ar[k]);
                } else { n.has(num) ? n.delete(num) : n.add(num); }
            } else if (isCtrl) {
                n.has(num) ? n.delete(num) : n.add(num);
            } else {
                if (n.size === 1 && n.has(num)) n.clear();
                else { n.clear(); n.add(num); }
            }
            return n;
        });
        lastRef.current = num;
    }, [disabled, selectionMode, toggleTooth]);

    const assign = useCallback((wtId: string | null) => {
        if (selected.size === 0) return;
        const up = [...teeth];
        selected.forEach(num => {
            const idx = up.findIndex(t => t.tooth_number === num);
            if (wtId === null) { if (idx >= 0) up.splice(idx, 1); }
            else if (idx >= 0) up[idx] = { ...up[idx], work_type_id: wtId };
            else up.push({ tooth_number: num, work_type_id: wtId });
        });
        onChange(up);
        setSelected(new Set());
    }, [selected, teeth, onChange]);

    const grouped = useMemo(() => {
        const g = new Map<string, number[]>();
        teeth.forEach(t => { if (t.work_type_id) { const l = g.get(t.work_type_id) || []; l.push(t.tooth_number); g.set(t.work_type_id, l); } });
        g.forEach((v, k) => g.set(k, v.sort((a, b) => a - b)));
        return g;
    }, [teeth]);

    // Tipos de trabalho com dentes pendentes
    const pendingItems = useMemo(() => {
        if (!pendingAssignments) return [];
        return pendingAssignments
            .map(pa => ({ ...pa, remaining: pa.total - pa.assigned }))
            .filter(pa => pa.remaining > 0);
    }, [pendingAssignments]);

    return (
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6">
            {/* ── Arco Dental SVG — paths pré-posicionados ── */}
            <div className="flex-1 flex flex-col items-center">
                <svg
                    viewBox="-10 -20 310 420"
                    className="w-full max-w-[520px]"
                    style={{ minHeight: 380 }}
                    xmlns="http://www.w3.org/2000/svg"
                >
                    {ALL_TEETH.map((toothId) => {
                        const toothData = TOOTH_PATHS[toothId as keyof typeof TOOTH_PATHS];
                        if (!toothData) return null;

                        const isSel = selected.has(toothId);
                        const wtId = tMap.get(toothId);
                        const wt = wtId ? wtMap.get(wtId) ?? null : null;
                        const hasWt = !!wt;

                        // Cores — light theme
                        const fill = isSel ? 'rgba(59,130,246,0.12)' : hasWt ? `${wt.cor || '#6b7280'}18` : '#f9fafb';
                        const stroke = isSel ? '#3b82f6' : hasWt ? (wt.cor || '#6b7280') : '#d1d5db';
                        const strokeWidth = isSel ? 1.5 : 0.7;

                        // Posição do label (número FDI) — usa centro do dente
                        const labelPos = TOOTH_CENTERS[toothId as keyof typeof TOOTH_CENTERS];
                        const lx = labelPos?.x ?? 0;
                        const ly = labelPos?.y ?? 0;

                        return (
                            <g
                                key={toothId}
                                onClick={e => click(e, toothId)}
                                className={cn('cursor-pointer hover:opacity-80 transition-opacity', disabled && 'cursor-not-allowed opacity-40')}
                                style={{ filter: isSel ? 'drop-shadow(0 0 6px rgba(59,130,246,0.25))' : undefined }}
                            >
                                {/* Glow de seleção */}
                                {isSel && (
                                    <path d={toothData.outline} fill="none" stroke="#3b82f6"
                                        strokeWidth={4} opacity={0.15} vectorEffect="non-scaling-stroke" />
                                )}

                                {/* Contorno principal */}
                                <path
                                    d={toothData.outline}
                                    fill={fill}
                                    stroke={stroke}
                                    strokeWidth={strokeWidth}
                                    strokeLinejoin="round"
                                    strokeLinecap="round"
                                    className="transition-all duration-150"
                                    vectorEffect="non-scaling-stroke"
                                />

                                {/* Detalhes internos (sulcos) */}
                                {toothData.details && toothData.details.map((d, i) => (
                                    <path
                                        key={i}
                                        d={d}
                                        fill="none"
                                        stroke={isSel ? 'rgba(59,130,246,0.25)' : hasWt ? `${wt.cor || '#6b7280'}30` : '#e5e7eb'}
                                        strokeWidth={0.4}
                                        strokeLinecap="round"
                                        opacity={0.6}
                                        vectorEffect="non-scaling-stroke"
                                    />
                                ))}

                                {/* Número FDI */}
                                <text
                                    x={lx}
                                    y={ly + 4}
                                    textAnchor="middle"
                                    fill={isSel ? '#2563eb' : hasWt ? (wt.cor || '#6b7280') : '#6b7280'}
                                    fontSize="9"
                                    fontWeight={isSel || hasWt ? '700' : '500'}
                                    fontFamily="Inter, system-ui, sans-serif"
                                    className="select-none pointer-events-none"
                                >
                                    {toothId}
                                </text>
                            </g>
                        );
                    })}
                </svg>
                {!disabled && (
                    <p className="text-[10px] text-gray-400 text-center mt-1">
                        Click · Ctrl+Click · Shift+Click
                    </p>
                )}
            </div>

            {/* ── Painel Lateral ── */}
            <div className="w-full lg:w-56 shrink-0 space-y-3">
                {selected.size > 0 && !disabled && (
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Selecção</span>
                            <button onClick={() => setSelected(new Set())} className="text-blue-400 hover:text-blue-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-xs text-blue-700/80 mb-3 font-mono">
                            {Array.from(selected).sort((a, b) => a - b).map(n => `#${n}`).join('  ')}
                        </p>
                        <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-1.5">{assignLabel}</p>
                        <div className="flex flex-col gap-1">
                            {workTypes.filter(wt => wt.activo !== false).map(wt => (
                                <button key={wt.id} onClick={() => assign(wt.id)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-gray-200 bg-white hover:bg-gray-50 transition-all text-left">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt.cor || '#6b7280' }} />
                                    <span className="truncate text-gray-700">{wt.nome}</span>
                                </button>
                            ))}
                            {teeth.some(t => selected.has(t.tooth_number)) && (
                                <button onClick={() => assign(null)}
                                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[11px] font-medium border border-red-500/20 text-red-400/80 bg-red-500/5 hover:bg-red-500/10 transition-all">
                                    <X className="w-3 h-3" /><span>Remover</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Secção: Por Atribuir ── */}
                {pendingItems.length > 0 && (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
                        <div className="flex items-center gap-1.5 mb-2">
                            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Por Atribuir</span>
                            <span className="text-[9px] bg-amber-200 text-amber-700 px-1.5 rounded-full font-bold ml-auto">
                                {pendingItems.reduce((a, p) => a + p.remaining, 0)}
                            </span>
                        </div>
                        <div className="space-y-1.5">
                            {pendingItems.map(pa => {
                                const wt = wtMap.get(pa.work_type_id);
                                return (
                                    <div key={pa.work_type_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/70 border border-amber-100">
                                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt?.cor || '#6b7280' }} />
                                        <span className="text-[11px] font-medium text-gray-700 truncate flex-1">{wt?.nome || '—'}</span>
                                        <span className="text-[10px] font-bold text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full shrink-0">
                                            {pa.remaining}×
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {grouped.size > 0 && (
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
                        <button onClick={() => setShowAssign(!showAssign)} className="flex items-center gap-1.5 w-full mb-2">
                            {showAssign ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Atribuições</span>
                            <span className="text-[9px] bg-gray-200 text-gray-500 px-1.5 rounded ml-auto">{teeth.length}</span>
                        </button>
                        {showAssign && (
                            <div className="space-y-2">
                                {Array.from(grouped.entries()).map(([id, nums]) => {
                                    const wt = wtMap.get(id);
                                    return (
                                        <div key={id} className="flex items-start gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full shrink-0 mt-0.5" style={{ backgroundColor: wt?.cor || '#6b7280' }} />
                                            <div className="min-w-0">
                                                <span className="text-[11px] font-semibold text-gray-700 block">{wt?.nome || '—'}</span>
                                                <span className="text-[10px] text-gray-400 font-mono">{nums.map(n => `#${n}`).join(', ')}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {grouped.size === 0 && selected.size === 0 && pendingItems.length === 0 && (
                    <div className="text-center py-8 text-gray-400">
                        <p className="text-xs">Seleccione dentes</p>
                        <p className="text-[10px] mt-0.5">para atribuir trabalhos</p>
                    </div>
                )}
            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════
// Modal & Trigger
// ═══════════════════════════════════════════════════════════

export function OdontogramModal({ open, onClose, teeth, workTypes, onChange, disabled, pendingAssignments }: OdontogramModalProps) {
    if (!open) return null;
    const totalPending = pendingAssignments ? pendingAssignments.reduce((a, p) => a + Math.max(0, p.total - p.assigned), 0) : 0;
    return (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-white border border-gray-200 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2.5">
                        <span className="text-lg">🦷</span>
                        <div>
                            <h2 className="text-sm font-bold text-gray-900">Odontograma</h2>
                            <p className="text-[10px] text-gray-400">
                                {teeth.length} dente{teeth.length !== 1 ? 's' : ''} · FDI ISO 3950
                                {totalPending > 0 && (
                                    <span className="text-amber-500 font-semibold"> · {totalPending}× por atribuir</span>
                                )}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5">
                    <OdontogramContent teeth={teeth} workTypes={workTypes} onChange={onChange} disabled={disabled} pendingAssignments={pendingAssignments} />
                </div>
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-[9px] text-gray-400 hidden sm:inline">Click · Ctrl+Click · Shift+Click</span>
                    <span className="text-[9px] text-gray-400 sm:hidden">Toque para seleccionar</span>
                    <button onClick={onClose} className="px-4 py-1.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-lg transition-colors">Guardar e Fechar</button>
                </div>
            </div>
        </div>
    );
}

export default function OdontogramTrigger({ teeth, workTypes, onChange, disabled }: OdontogramProps) {
    const [open, setOpen] = useState(false);
    const wtMap = new Map<string, WorkType>(); workTypes.forEach(wt => wtMap.set(wt.id, wt));
    const grouped = new Map<string, number[]>();
    teeth.forEach(t => { if (t.work_type_id) { const l = grouped.get(t.work_type_id) || []; l.push(t.tooth_number); grouped.set(t.work_type_id, l); } });
    return (
        <>
            <button onClick={() => !disabled && setOpen(true)}
                className={cn('flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-all text-left w-full group',
                    teeth.length > 0 ? 'border-primary/20 bg-primary/5 hover:bg-primary/10' : 'border-gray-200 bg-white hover:bg-gray-50',
                    disabled && 'opacity-50 cursor-not-allowed')}>
                <span className="text-base">🦷</span>
                <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-gray-900">Odontograma</span>
                    {teeth.length > 0 ? (
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[10px] text-gray-500">{teeth.length} dente{teeth.length !== 1 ? 's' : ''}</span>
                            <span className="text-gray-300">·</span>
                            <div className="flex gap-0.5">
                                {Array.from(grouped.entries()).slice(0, 4).map(([id, nums]) => {
                                    const wt = wtMap.get(id);
                                    return (<span key={id} className="inline-flex items-center gap-0.5 text-[9px] text-gray-500 bg-gray-100 px-1 py-0.5 rounded">
                                        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: wt?.cor || '#6b7280' }} />{nums.length}
                                    </span>);
                                })}
                            </div>
                        </div>
                    ) : <span className="text-[10px] text-gray-400 block">Toque para configurar</span>}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
            </button>
            <OdontogramModal open={open} onClose={() => setOpen(false)} teeth={teeth} workTypes={workTypes} onChange={onChange} disabled={disabled} />
        </>
    );
}
