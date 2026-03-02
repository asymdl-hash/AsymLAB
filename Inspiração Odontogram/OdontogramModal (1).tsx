import { useState, useEffect } from 'react';
import { X, Check, Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { TOOTH_PATHS } from './tooth_paths_data';
import { FRONTAL_TEETH_PATHS } from './frontal_tooth_paths';
import { TOOTH_CENTERS } from './tooth_centers';


interface OdontogramModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialData?: Record<number, string>;
    onSave: (data: Record<number, string>) => void;
    workTypes: Array<{ label: string; color: string }>;
}



export const OdontogramModal = ({ isOpen, onClose, initialData = {}, onSave, workTypes }: OdontogramModalProps) => {
    const [toothMap, setToothMap] = useState<Record<number, string>>(initialData);
    const [selectedTeeth, setSelectedTeeth] = useState<Set<number>>(new Set());
    const [lastSelected, setLastSelected] = useState<number | null>(null);
    const [scale, setScale] = useState(1);

    // Tooth definitions (ISO 3950)
    // Order matters for Tab/Keyboard nav or logical grouping, but visual position is fixed by SVG paths.
    // We combine them for rendering loop.
    const ALL_TEETH = [
        18, 17, 16, 15, 14, 13, 12, 11,
        21, 22, 23, 24, 25, 26, 27, 28,
        48, 47, 46, 45, 44, 43, 42, 41,
        31, 32, 33, 34, 35, 36, 37, 38
    ];

    useEffect(() => {
        if (isOpen) {
            setToothMap(initialData);
            setSelectedTeeth(new Set());
            setLastSelected(null);
        }
    }, [isOpen, initialData]);

    const handleToothClick = (e: React.MouseEvent, id: number) => {
        e.stopPropagation();

        const newSelection = new Set(selectedTeeth);

        if (e.ctrlKey) {
            if (newSelection.has(id)) newSelection.delete(id);
            else newSelection.add(id);
            setLastSelected(id);
        } else if (e.shiftKey && lastSelected) {
            // Define strict ordering for range selection logic
            const upper = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
            const lower = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];

            let range: number[] = [];

            if (upper.includes(lastSelected) && upper.includes(id)) {
                const start = upper.indexOf(lastSelected);
                const end = upper.indexOf(id);
                range = upper.slice(Math.min(start, end), Math.max(start, end) + 1);
            } else if (lower.includes(lastSelected) && lower.includes(id)) {
                const start = lower.indexOf(lastSelected);
                const end = lower.indexOf(id);
                range = lower.slice(Math.min(start, end), Math.max(start, end) + 1);
            } else {
                range = [id];
            }

            range.forEach(t => newSelection.add(t));
        } else {
            // Toggle logic: If clicking the only selected item, deselect it.
            if (newSelection.has(id) && newSelection.size === 1) {
                newSelection.clear();
                setLastSelected(null);
            } else {
                // Otherwise, select only this one (standard radio behavior)
                newSelection.clear();
                newSelection.add(id);
                setLastSelected(id);
            }
        }

        setSelectedTeeth(newSelection);
    };

    const handleAssignWorkType = (workTypeLabel: string) => {
        const newData = { ...toothMap };
        selectedTeeth.forEach(id => {
            newData[id] = workTypeLabel;
        });
        setToothMap(newData);
    };

    const handleClearSelection = () => {
        const newData = { ...toothMap };
        selectedTeeth.forEach(id => {
            delete newData[id];
        });
        setToothMap(newData);
    };

    const handleSave = () => {
        onSave(toothMap);
        onClose();
    };

    if (!isOpen) return null;

    return createPortal(
        <div
            className="fixed inset-0 z-[100] flex items-stretch justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={onClose}
        >
            <div
                className="bg-white shadow-2xl w-[80vw] h-full flex overflow-hidden border-l border-slate-200 animate-in slide-in-from-right duration-300"
                onClick={(e) => e.stopPropagation()}
            >

                {/* Left: Chart */}
                <div className="flex-1 bg-slate-50 relative overflow-hidden flex flex-col">
                    {/* Toolbar */}
                    <div className="absolute top-4 left-4 flex gap-2 z-10">
                        <div className="bg-white p-1 rounded-lg shadow-sm border border-slate-200 flex flex-col gap-1">
                            <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} className="p-2 hover:bg-slate-100 rounded-md"><ZoomIn className="w-5 h-5 text-slate-600" /></button>
                            <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))} className="p-2 hover:bg-slate-100 rounded-md"><ZoomOut className="w-5 h-5 text-slate-600" /></button>
                            <button onClick={() => { setToothMap(initialData); setSelectedTeeth(new Set()); setScale(1); }} className="p-2 hover:bg-slate-100 rounded-md" title="Reset"><RotateCcw className="w-5 h-5 text-slate-600" /></button>
                        </div>
                    </div>

                    {/* Arch Selection (Top Right) */}
                    <div className="absolute top-4 right-4 flex flex-col gap-3 z-10">
                        {/* Maxilla (100) */}
                        <div
                            className={`w-40 h-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-sm group relative bg-white ${selectedTeeth.has(100) ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'
                                }`}
                            onClick={(e) => handleToothClick(e, 100)}
                        >
                            {/* Sprite: Top Half for Maxilla */}
                            <div
                                className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                                style={{
                                    backgroundImage: 'url(/assets/odontogram/frontal_arches_final.png)',
                                    backgroundSize: '100% 200%',
                                    backgroundPosition: 'top center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            />

                            {/* Overlay for Color */}
                            {toothMap[100] && workTypes.find(w => w.label === toothMap[100]) && (
                                <div className="absolute inset-0 opacity-50" style={{ backgroundColor: workTypes.find(w => w.label === toothMap[100])!.color }}></div>
                            )}

                            {/* Label */}



                            {/* Clear Button (X) */}
                            {toothMap[100] && (
                                <div
                                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-md cursor-pointer hover:opacity-80"
                                    onClick={(e) => { e.stopPropagation(); const d = { ...toothMap }; delete d[100]; setToothMap(d); }}
                                >
                                    <X className="w-3 h-3 text-red-500" />
                                </div>
                            )}
                        </div>

                        {/* Mandible (200) */}
                        <div
                            className={`w-40 h-20 rounded-lg border-2 overflow-hidden cursor-pointer transition-all shadow-sm group relative bg-white ${selectedTeeth.has(200) ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'
                                }`}
                            onClick={(e) => handleToothClick(e, 200)}
                        >
                            {/* Sprite: Bottom Half for Mandible */}
                            <div
                                className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
                                style={{
                                    backgroundImage: 'url(/assets/odontogram/frontal_arches_final.png)',
                                    backgroundSize: '100% 200%',
                                    backgroundPosition: 'bottom center',
                                    backgroundRepeat: 'no-repeat'
                                }}
                            />

                            {/* Overlay for Color */}
                            {toothMap[200] && workTypes.find(w => w.label === toothMap[200]) && (
                                <div className="absolute inset-0 opacity-50" style={{ backgroundColor: workTypes.find(w => w.label === toothMap[200])!.color }}></div>
                            )}

                            {/* Label */}


                            {/* Clear Button (X) */}
                            {toothMap[200] && (
                                <div
                                    className="absolute top-1 right-1 bg-white rounded-full p-0.5 shadow-md cursor-pointer hover:opacity-80"
                                    onClick={(e) => { e.stopPropagation(); const d = { ...toothMap }; delete d[200]; setToothMap(d); }}
                                >
                                    <X className="w-3 h-3 text-red-500" />
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center overflow-auto cursor-move select-none p-10">
                        {/* Native SVG ViewBox: 0 0 290 375 */}
                        <svg
                            viewBox="-10 -20 310 420"
                            className="w-full h-full max-h-[85vh] drop-shadow-sm"
                            style={{ transform: `scale(${scale})`, transition: 'transform 0.2s' }}
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            {ALL_TEETH.map((toothId) => {
                                const toothData = TOOTH_PATHS[toothId as keyof typeof TOOTH_PATHS];
                                if (!toothData) return null;

                                const isSelected = selectedTeeth.has(toothId);
                                const assignedWorkType = toothMap[toothId];

                                // Determine fill color
                                let fill = "white";
                                if (assignedWorkType) {
                                    const wt = workTypes.find(w => w.label === assignedWorkType);
                                    if (wt) fill = wt.color;
                                }
                                if (isSelected && !assignedWorkType) fill = "#e0e7ff"; // Light indigo for selection

                                // Determine stroke
                                const stroke = isSelected ? "#2563eb" : "#4b5563"; // Blue-600 selected, Gray-600 normal
                                const strokeWidth = isSelected ? 1.5 : 0.8;

                                // Helper for X button position (center of tooth)
                                const centerData = TOOTH_CENTERS[toothId as keyof typeof TOOTH_CENTERS] || { x: 0, y: 0 };
                                const labelX = centerData.x;
                                const labelY = centerData.y;




                                return (
                                    <g
                                        key={toothId}
                                        onClick={(e) => handleToothClick(e, toothId)}
                                        className="cursor-pointer hover:opacity-80 transition-opacity"
                                    >
                                        {/* Main Outline */}
                                        <path
                                            d={toothData.outline}
                                            fill={fill}
                                            stroke={stroke}
                                            strokeWidth={strokeWidth}
                                            className="transition-colors duration-200"
                                            vectorEffect="non-scaling-stroke"
                                        />

                                        {/* Inner Details */}
                                        {toothData.details && toothData.details.map((d, i) => (
                                            <path
                                                key={i}
                                                d={d}
                                                fill="none"
                                                stroke={stroke}
                                                strokeWidth="0.3"
                                                opacity="0.5"
                                                vectorEffect="non-scaling-stroke"
                                            />
                                        ))}

                                        {/* Assigned Work Type "X" to remove */}
                                        {assignedWorkType && (
                                            <g
                                                onClick={(e) => { e.stopPropagation(); const d = { ...toothMap }; delete d[toothId]; setToothMap(d); }}
                                                className="cursor-pointer hover:opacity-80"
                                            >
                                                <circle cx={labelX} cy={labelY} r="5" fill="white" stroke="#ef4444" strokeWidth="1" className="shadow-sm" />
                                                <path d={`M${labelX - 2},${labelY - 2} L${labelX + 2},${labelY + 2} M${labelX - 2},${labelY + 2} L${labelX + 2},${labelY - 2}`} stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" />
                                            </g>
                                        )}
                                    </g>
                                );
                            })}
                        </svg>
                    </div>
                </div>

                {/* Right: Controls (Same as before) */}
                <div className="w-[480px] bg-white border-l border-slate-200 flex flex-col">
                    <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <h2 className="font-bold text-slate-800">Odontograma</h2>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4 bg-slate-50 border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Seleção Atual</div>
                        {selectedTeeth.size === 0 ? (
                            <div className="text-sm text-slate-400 italic">Nenhum dente selecionado</div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {Array.from(selectedTeeth).sort().map(id => (
                                    <span key={id} className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-bold border border-blue-200">
                                        {id === 100 ? 'Maxilla' : id === 200 ? 'Mandible' : `#${id}`}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
                        <div className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wider">Tipos de Trabalho</div>
                        <div className="space-y-2">
                            {workTypes.map(wt => (
                                <button
                                    key={wt.label}
                                    onClick={() => handleAssignWorkType(wt.label)}
                                    disabled={selectedTeeth.size === 0}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed group"
                                >
                                    <div className="w-8 h-8 rounded-lg shadow-sm border border-black/5" style={{ backgroundColor: wt.color }} />
                                    <div className="flex-1">
                                        <div className="font-bold text-sm text-slate-700 group-hover:text-slate-900">{wt.label}</div>
                                    </div>
                                    {selectedTeeth.size > 0 && (
                                        <div className="opacity-0 group-hover:opacity-100 text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md transition-opacity">
                                            Aplicar
                                        </div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100">
                            <button
                                onClick={handleClearSelection}
                                disabled={selectedTeeth.size === 0}
                                className="w-full flex items-center justify-center gap-2 p-2 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors font-bold text-sm disabled:opacity-50"
                            >
                                <Trash2 className="w-4 h-4" />
                                Limpar Seleção
                            </button>
                        </div>
                    </div>

                    <div className="p-4 border-t border-slate-100 bg-slate-50">
                        <button
                            onClick={handleSave}
                            className="w-full py-3 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <Check className="w-5 h-5" />
                            Guardar Alterações
                        </button>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};
