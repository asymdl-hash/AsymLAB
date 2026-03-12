'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToothColorItem = { id: string; codigo: string; nome: string; grupo: string | null };

type ThirdKey = 'cervical' | 'medio' | 'incisal';

interface ToothThirdsSelectorProps {
    toothColors: ToothColorItem[];
    cervicalColorId: string | null;
    medioColorId: string | null;
    incisalColorId: string | null;
    onSelectColor: (third: ThirdKey, colorId: string) => void;
    activeScale?: string | null;
}

const THIRD_LABELS: Record<ThirdKey, string> = {
    cervical: 'Cervical',
    medio: 'Médio',
    incisal: 'Incisal',
};

/* ── Approximate VITA shade → CSS color (for visual feedback) ── */
const SHADE_COLORS: Record<string, string> = {
    A1: '#f5e6c8', A2: '#e8d4a8', A3: '#dbc28e', 'A3.5': '#d0b47a', A4: '#c4a665',
    B1: '#f0e8d0', B2: '#e2d8b8', B3: '#d4c8a0', B4: '#c6b888',
    C1: '#e8dcc0', C2: '#d8ccb0', C3: '#c8bca0', C4: '#b8ac90',
    D2: '#e0d4b8', D3: '#d0c4a8', D4: '#c0b498',
};

function getShadeColor(colorId: string | null, toothColors: ToothColorItem[]): string {
    if (!colorId) return '#f7f3ed';
    const c = toothColors.find(tc => tc.id === colorId);
    if (!c) return '#f7f3ed';
    return SHADE_COLORS[c.codigo] || '#eddfc8';
}

/* SCALE_MAP — same as in NewPlanModal dropdown */
const SCALE_MAP: Record<string, string> = {
    'A': 'VITA Classical', 'B': 'VITA Classical', 'C': 'VITA Classical', 'D': 'VITA Classical', 'Bleach': 'VITA Classical',
    '3D-Master': 'VITA 3D-Master',
    'Chromascop': 'Chromascop',
};

export default function ToothThirdsSelector({
    toothColors, cervicalColorId, medioColorId, incisalColorId, onSelectColor, activeScale,
}: ToothThirdsSelectorProps) {
    const [openThird, setOpenThird] = useState<ThirdKey | null>(null);
    const [dropdownScale, setDropdownScale] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpenThird(null);
                setDropdownScale(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleThirdClick = (third: ThirdKey) => {
        if (openThird === third) {
            setOpenThird(null);
            setDropdownScale(null);
        } else {
            setOpenThird(third);
            // If an active scale is already selected, jump to that scale
            setDropdownScale(activeScale || null);
        }
    };

    const handleSelectColor = (third: ThirdKey, colorId: string) => {
        onSelectColor(third, colorId);
        setOpenThird(null);
        setDropdownScale(null);
    };

    // Build scales from toothColors
    const scales = toothColors.reduce<Record<string, { grupos: Record<string, ToothColorItem[]>; total: number }>>((acc, tc) => {
        const g = tc.grupo || 'Outros';
        const scale = SCALE_MAP[g] || g;
        if (!acc[scale]) acc[scale] = { grupos: {}, total: 0 };
        if (!acc[scale].grupos[g]) acc[scale].grupos[g] = [];
        acc[scale].grupos[g].push(tc);
        acc[scale].total++;
        return acc;
    }, {});

    const thirds: { key: ThirdKey; colorId: string | null; y: number; height: number }[] = [
        { key: 'cervical', colorId: cervicalColorId, y: 0, height: 50 },
        { key: 'medio', colorId: medioColorId, y: 50, height: 50 },
        { key: 'incisal', colorId: incisalColorId, y: 100, height: 50 },
    ];

    const getColorBadge = (colorId: string | null) => {
        if (!colorId) return null;
        const c = toothColors.find(tc => tc.id === colorId);
        return c ? c.codigo : null;
    };

    return (
        <div ref={containerRef} className="relative flex items-start gap-3">
            {/* SVG Tooth Crown — anatomically proportioned upper central incisor */}
            <div className="relative w-20 shrink-0">
                <svg viewBox="0 0 80 100" className="w-full h-auto drop-shadow-sm" xmlns="http://www.w3.org/2000/svg">
                    {/* Subtle gum line (scalloped) */}
                    <path d="M8 12 Q20 4 40 6 Q60 4 72 12" fill="none" stroke="#d4908a" strokeWidth="1.8" opacity="0.5" strokeLinecap="round" />

                    {/* Crown clipPath — realistic central incisor shape */}
                    <defs>
                        <clipPath id="crown-clip">
                            <path d="
                                M22 10
                                Q18 14 16 22
                                Q13 32 12 42
                                Q11 55 12 65
                                Q13 75 16 82
                                Q20 90 28 94
                                Q34 97 40 97
                                Q46 97 52 94
                                Q60 90 64 82
                                Q67 75 68 65
                                Q69 55 68 42
                                Q67 32 64 22
                                Q62 14 58 10
                                Q50 6 40 6
                                Q30 6 22 10
                                Z
                            " />
                        </clipPath>
                        {/* Subtle gradient for depth */}
                        <linearGradient id="tooth-depth" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="rgba(0,0,0,0.06)" />
                            <stop offset="30%" stopColor="rgba(0,0,0,0)" />
                            <stop offset="70%" stopColor="rgba(0,0,0,0)" />
                            <stop offset="100%" stopColor="rgba(0,0,0,0.06)" />
                        </linearGradient>
                    </defs>

                    {/* Cervical third */}
                    <rect
                        x="0" y="4" width="80" height="33"
                        fill={getShadeColor(cervicalColorId, toothColors)}
                        clipPath="url(#crown-clip)"
                        className={cn(
                            "cursor-pointer transition-all duration-200",
                            openThird === 'cervical' ? 'opacity-100' : 'hover:brightness-95'
                        )}
                        onClick={() => handleThirdClick('cervical')}
                    />
                    {/* Medio third */}
                    <rect
                        x="0" y="37" width="80" height="30"
                        fill={getShadeColor(medioColorId, toothColors)}
                        clipPath="url(#crown-clip)"
                        className={cn(
                            "cursor-pointer transition-all duration-200",
                            openThird === 'medio' ? 'opacity-100' : 'hover:brightness-95'
                        )}
                        onClick={() => handleThirdClick('medio')}
                    />
                    {/* Incisal third */}
                    <rect
                        x="0" y="67" width="80" height="34"
                        fill={getShadeColor(incisalColorId, toothColors)}
                        clipPath="url(#crown-clip)"
                        className={cn(
                            "cursor-pointer transition-all duration-200",
                            openThird === 'incisal' ? 'opacity-100' : 'hover:brightness-95'
                        )}
                        onClick={() => handleThirdClick('incisal')}
                    />

                    {/* Depth overlay for 3D effect */}
                    <rect x="0" y="0" width="80" height="100" fill="url(#tooth-depth)" clipPath="url(#crown-clip)" style={{ pointerEvents: 'none' }} />

                    {/* Crown border */}
                    <path
                        d="
                            M22 10
                            Q18 14 16 22
                            Q13 32 12 42
                            Q11 55 12 65
                            Q13 75 16 82
                            Q20 90 28 94
                            Q34 97 40 97
                            Q46 97 52 94
                            Q60 90 64 82
                            Q67 75 68 65
                            Q69 55 68 42
                            Q67 32 64 22
                            Q62 14 58 10
                            Q50 6 40 6
                            Q30 6 22 10
                            Z
                        "
                        fill="none" stroke="#b8a080" strokeWidth="1.2" opacity="0.7"
                    />

                    {/* Division lines (following crown contour) */}
                    <path d="M14 37 Q28 35 40 35 Q52 35 66 37" fill="none" stroke="#b8a080" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5" />
                    <path d="M12 67 Q28 65 40 65 Q52 65 68 67" fill="none" stroke="#b8a080" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5" />

                    {/* Anatomical details — line angles for realism */}
                    <path d="M30 14 Q29 50 30 88" fill="none" stroke="#ccc0a8" strokeWidth="0.4" opacity="0.3" />
                    <path d="M50 14 Q51 50 50 88" fill="none" stroke="#ccc0a8" strokeWidth="0.4" opacity="0.3" />

                    {/* Mamelons at incisal edge */}
                    <path d="M26 90 Q30 95 34 92" fill="none" stroke="#d4c4a8" strokeWidth="0.5" opacity="0.35" />
                    <path d="M35 92 Q40 96 45 92" fill="none" stroke="#d4c4a8" strokeWidth="0.5" opacity="0.35" />
                    <path d="M46 92 Q50 95 54 90" fill="none" stroke="#d4c4a8" strokeWidth="0.5" opacity="0.35" />

                    {/* Active third highlight ring */}
                    {openThird === 'cervical' && <rect x="10" y="6" width="60" height="31" rx="4" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5" clipPath="url(#crown-clip)" />}
                    {openThird === 'medio' && <rect x="10" y="37" width="60" height="30" rx="4" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5" clipPath="url(#crown-clip)" />}
                    {openThird === 'incisal' && <rect x="10" y="67" width="60" height="32" rx="4" fill="none" stroke="#d97706" strokeWidth="1.5" opacity="0.5" clipPath="url(#crown-clip)" />}
                </svg>
            </div>

            {/* Labels + badges */}
            <div className="flex flex-col justify-between h-full py-1 gap-1 min-h-[100px]">
                {thirds.map(t => {
                    const badge = getColorBadge(t.colorId);
                    const isOpen = openThird === t.key;
                    return (
                        <button
                            key={t.key}
                            type="button"
                            onClick={() => handleThirdClick(t.key)}
                            className={cn(
                                "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] uppercase tracking-wider font-semibold transition-all",
                                isOpen
                                    ? "bg-amber-100 text-amber-700 border border-amber-300"
                                    : badge
                                        ? "bg-amber-50/80 text-amber-600 border border-amber-200/60 hover:bg-amber-100"
                                        : "bg-gray-50 text-gray-400 border border-gray-200 hover:bg-gray-100 hover:text-gray-500"
                            )}
                        >
                            {THIRD_LABELS[t.key]}
                            {badge && (
                                <span className="ml-auto text-[8px] bg-amber-200/80 text-amber-800 px-1.5 py-0.5 rounded-full font-bold">
                                    {badge}
                                </span>
                            )}
                            {!badge && <ChevronDown className="ml-auto h-2.5 w-2.5 opacity-50" />}
                        </button>
                    );
                })}
            </div>

            {/* Dropdown popup — fixed for overflow */}
            {openThird && (
                <div
                    className="fixed z-[9999] w-[220px] bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden"
                    style={{
                        top: (() => {
                            const btn = containerRef.current?.querySelector(`button[class*="${openThird === 'cervical' ? 'Cervical' : openThird === 'medio' ? 'Médio' : 'Incisal'}"]`);
                            // Fallback: position near the container
                            if (!btn) {
                                const rect = containerRef.current?.getBoundingClientRect();
                                return rect ? `${rect.top}px` : '0px';
                            }
                            const rect = btn.getBoundingClientRect();
                            return `${rect.top}px`;
                        })(),
                        left: (() => {
                            const rect = containerRef.current?.getBoundingClientRect();
                            return rect ? `${rect.right + 8}px` : '0px';
                        })(),
                    }}
                >
                    {!dropdownScale ? (
                        /* Level 1: Scales */
                        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                            <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1 pb-1">
                                {THIRD_LABELS[openThird]} — Escala
                            </p>
                            {Object.entries(scales).map(([scaleName, scaleData]) => (
                                <button
                                    key={scaleName}
                                    type="button"
                                    onClick={() => setDropdownScale(scaleName)}
                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-amber-50 transition-colors text-left"
                                >
                                    <Palette className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-gray-700 block">{scaleName}</span>
                                        <span className="text-[10px] text-gray-400">{scaleData.total} tons</span>
                                    </div>
                                    <ChevronDown className="h-3 w-3 text-gray-300 -rotate-90" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        /* Level 2: Shades within scale */
                        <div>
                            <button
                                type="button"
                                onClick={() => setDropdownScale(null)}
                                className="w-full flex items-center gap-2 px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                            >
                                <ChevronDown className="h-3 w-3 text-gray-400 rotate-90" />
                                <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{dropdownScale}</span>
                            </button>
                            <div className="max-h-52 overflow-y-auto py-1">
                                {scales[dropdownScale] && Object.entries(scales[dropdownScale].grupos).map(([subGrupo, colors]) => (
                                    <div key={subGrupo}>
                                        {Object.keys(scales[dropdownScale].grupos).length > 1 && (
                                            <div className="px-3 py-1 border-b border-gray-50">
                                                <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{subGrupo}</span>
                                            </div>
                                        )}
                                        {colors.map(tc => {
                                            const currentId = openThird === 'cervical' ? cervicalColorId : openThird === 'medio' ? medioColorId : incisalColorId;
                                            const isSelected = tc.id === currentId;
                                            return (
                                                <div
                                                    key={tc.id}
                                                    onClick={() => handleSelectColor(openThird, tc.id)}
                                                    className={cn(
                                                        "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-amber-50 transition-colors text-xs",
                                                        isSelected && "bg-amber-50"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                        isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                                                    )}>
                                                        {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                                    </div>
                                                    <div
                                                        className="w-4 h-4 rounded-sm border border-gray-200 shrink-0"
                                                        style={{ backgroundColor: SHADE_COLORS[tc.codigo] || '#eddfc8' }}
                                                    />
                                                    <span className="font-mono text-gray-500 w-8">{tc.codigo}</span>
                                                    <span className="text-gray-700 truncate">{tc.nome}</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
