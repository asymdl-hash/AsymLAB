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

/* ── Approximate VITA shade → CSS color ── */
const SHADE_COLORS: Record<string, string> = {
    A1: '#f5e6c8', A2: '#e8d4a8', A3: '#dbc28e', 'A3.5': '#d0b47a', A4: '#c4a665',
    B1: '#f0e8d0', B2: '#e2d8b8', B3: '#d4c8a0', B4: '#c6b888',
    C1: '#e8dcc0', C2: '#d8ccb0', C3: '#c8bca0', C4: '#b8ac90',
    D2: '#e0d4b8', D3: '#d0c4a8', D4: '#c0b498',
    '110': '#f5edd8', '120': '#f0e4c8', '130': '#e8d8b4', '140': '#e0cca0',
    '210': '#f2e8d0', '220': '#e8dcc0', '230': '#ddd0b0', '240': '#d2c4a0',
    '310': '#ede0c4', '320': '#e2d4b4', '330': '#d8c8a4', '340': '#cdbc94',
    '410': '#e8dcc0', '420': '#dccfb0', '430': '#d0c2a0', '440': '#c4b690',
    '510': '#e0d8c8', '520': '#d5ccb8', '530': '#cac0a8', '540': '#bfb498',
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
            setDropdownScale(activeScale || null);
        }
    };

    const handleSelectColor = (third: ThirdKey, colorId: string) => {
        onSelectColor(third, colorId);
        setOpenThird(null);
        setDropdownScale(null);
    };

    const scales = toothColors.reduce<Record<string, { grupos: Record<string, ToothColorItem[]>; total: number }>>((acc, tc) => {
        const g = tc.grupo || 'Outros';
        const scale = SCALE_MAP[g] || g;
        if (!acc[scale]) acc[scale] = { grupos: {}, total: 0 };
        if (!acc[scale].grupos[g]) acc[scale].grupos[g] = [];
        acc[scale].grupos[g].push(tc);
        acc[scale].total++;
        return acc;
    }, {});

    const getColorBadge = (colorId: string | null) => {
        if (!colorId) return null;
        const c = toothColors.find(tc => tc.id === colorId);
        return c ? c.codigo : null;
    };

    const cervicalColor = getShadeColor(cervicalColorId, toothColors);
    const medioColor = getShadeColor(medioColorId, toothColors);
    const incisalColor = getShadeColor(incisalColorId, toothColors);

    /* ── Inline dropdown renderer ── */
    const renderDropdown = () => {
        if (!openThird) return null;
        return (
            <div className="absolute left-0 right-0 top-full mt-1 z-50 bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                {!dropdownScale ? (
                    <div className="p-2 space-y-0.5 max-h-44 overflow-y-auto">
                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1 pb-1">
                            {THIRD_LABELS[openThird]} — Escala
                        </p>
                        {Object.entries(scales).map(([scaleName, scaleData]) => (
                            <button
                                key={scaleName}
                                type="button"
                                onClick={() => setDropdownScale(scaleName)}
                                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-amber-50 transition-colors text-left"
                            >
                                <Palette className="h-3 w-3 text-amber-400 shrink-0" />
                                <span className="text-[11px] font-semibold text-gray-700 flex-1">{scaleName}</span>
                                <span className="text-[9px] text-gray-400">{scaleData.total}</span>
                                <ChevronDown className="h-2.5 w-2.5 text-gray-300 -rotate-90" />
                            </button>
                        ))}
                    </div>
                ) : (
                    <div>
                        <button
                            type="button"
                            onClick={() => setDropdownScale(null)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                        >
                            <ChevronDown className="h-2.5 w-2.5 text-gray-400 rotate-90" />
                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{dropdownScale}</span>
                        </button>
                        <div className="max-h-44 overflow-y-auto py-0.5">
                            {scales[dropdownScale] && Object.entries(scales[dropdownScale].grupos).map(([subGrupo, colors]) => (
                                <div key={subGrupo}>
                                    {Object.keys(scales[dropdownScale].grupos).length > 1 && (
                                        <div className="px-3 py-0.5 border-b border-gray-50">
                                            <span className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">{subGrupo}</span>
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
                                                    "flex items-center gap-1.5 px-3 py-1 cursor-pointer hover:bg-amber-50 transition-colors text-[11px]",
                                                    isSelected && "bg-amber-50"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-3.5 h-3.5 rounded border-2 flex items-center justify-center shrink-0",
                                                    isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                                                )}>
                                                    {isSelected && <Check className="h-2 w-2 text-white" />}
                                                </div>
                                                <div
                                                    className="w-3.5 h-3.5 rounded-sm border border-gray-200 shrink-0"
                                                    style={{ backgroundColor: SHADE_COLORS[tc.codigo] || '#eddfc8' }}
                                                />
                                                <span className="font-mono text-gray-500">{tc.codigo}</span>
                                                <span className="text-gray-600 truncate">{tc.nome}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div ref={containerRef} className="flex items-start gap-4">
            {/* SVG Tooth Crown — upper central incisor, trapezoidal */}
            <div className="relative shrink-0" style={{ width: 64 }}>
                <svg viewBox="0 0 80 110" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <clipPath id="crown-clip">
                            {/* Trapezoidal: narrow cervical (top), wider incisal (bottom), flat bottom edge */}
                            <path d="
                                M28 4
                                C24 6 21 10 18 18
                                C14 30 11 42 10 54
                                C9 66 9 78 10 88
                                C11 94 14 98 18 100
                                L24 102
                                L56 102
                                L62 100
                                C66 98 69 94 70 88
                                C71 78 71 66 70 54
                                C69 42 66 30 62 18
                                C59 10 56 6 52 4
                                C46 1 34 1 28 4
                                Z
                            " />
                        </clipPath>
                    </defs>

                    {/* Pink gum tissue at top */}
                    <path d="M20 6 Q30 0 40 2 Q50 0 60 6" fill="none" stroke="#d4908a" strokeWidth="2.5" opacity="0.4" strokeLinecap="round" />

                    {/* Cervical third (top ~34px) */}
                    <rect x="0" y="0" width="80" height="37" fill={cervicalColor} clipPath="url(#crown-clip)"
                        className="cursor-pointer hover:brightness-[0.92] transition-all" onClick={() => handleThirdClick('cervical')} />
                    {/* Medio third (middle ~33px) */}
                    <rect x="0" y="37" width="80" height="33" fill={medioColor} clipPath="url(#crown-clip)"
                        className="cursor-pointer hover:brightness-[0.92] transition-all" onClick={() => handleThirdClick('medio')} />
                    {/* Incisal third (bottom ~40px) */}
                    <rect x="0" y="70" width="80" height="36" fill={incisalColor} clipPath="url(#crown-clip)"
                        className="cursor-pointer hover:brightness-[0.92] transition-all" onClick={() => handleThirdClick('incisal')} />

                    {/* Crown outline */}
                    <path d="
                        M28 4
                        C24 6 21 10 18 18
                        C14 30 11 42 10 54
                        C9 66 9 78 10 88
                        C11 94 14 98 18 100
                        L24 102
                        L56 102
                        L62 100
                        C66 98 69 94 70 88
                        C71 78 71 66 70 54
                        C69 42 66 30 62 18
                        C59 10 56 6 52 4
                        C46 1 34 1 28 4
                        Z
                    " fill="none" stroke="#a08868" strokeWidth="1.2" />

                    {/* Third divider lines */}
                    <path d="M16 37 Q28 35 40 35 Q52 35 64 37" fill="none" stroke="#a08868" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5" />
                    <path d="M11 70 Q26 68 40 68 Q54 68 69 70" fill="none" stroke="#a08868" strokeWidth="0.7" strokeDasharray="3 2" opacity="0.5" />

                    {/* Mamelon hints at incisal */}
                    <path d="M28 96 Q32 100 36 97" fill="none" stroke="#c8b890" strokeWidth="0.6" opacity="0.3" />
                    <path d="M36 97 Q40 101 44 97" fill="none" stroke="#c8b890" strokeWidth="0.6" opacity="0.3" />
                    <path d="M44 97 Q48 100 52 96" fill="none" stroke="#c8b890" strokeWidth="0.6" opacity="0.3" />

                    {/* Active highlight */}
                    {openThird === 'cervical' && <rect x="8" y="2" width="64" height="35" rx="3" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.6" clipPath="url(#crown-clip)" />}
                    {openThird === 'medio' && <rect x="8" y="37" width="64" height="33" rx="3" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.6" clipPath="url(#crown-clip)" />}
                    {openThird === 'incisal' && <rect x="8" y="70" width="64" height="34" rx="3" fill="none" stroke="#d97706" strokeWidth="2" opacity="0.6" clipPath="url(#crown-clip)" />}
                </svg>
            </div>

            {/* Labels + inline dropdown */}
            <div className="relative flex-1 min-w-0">
                <div className="flex flex-col gap-1">
                    {(['cervical', 'medio', 'incisal'] as ThirdKey[]).map(key => {
                        const badge = getColorBadge(key === 'cervical' ? cervicalColorId : key === 'medio' ? medioColorId : incisalColorId);
                        const bgColor = key === 'cervical' ? cervicalColor : key === 'medio' ? medioColor : incisalColor;
                        const isOpen = openThird === key;
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => handleThirdClick(key)}
                                className={cn(
                                    "flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] uppercase tracking-wider font-semibold transition-all border",
                                    isOpen
                                        ? "border-amber-400 ring-1 ring-amber-300 text-amber-700"
                                        : "border-gray-200/80 text-gray-500 hover:border-amber-300 hover:text-amber-600"
                                )}
                                style={{
                                    backgroundColor: badge ? `${bgColor}40` : undefined,
                                }}
                            >
                                {badge && (
                                    <div className="w-3 h-3 rounded-sm border border-gray-300/60 shrink-0" style={{ backgroundColor: bgColor }} />
                                )}
                                {THIRD_LABELS[key]}
                                {badge ? (
                                    <span className="ml-auto text-[8px] bg-amber-600/10 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                                        {badge}
                                    </span>
                                ) : (
                                    <ChevronDown className={cn("ml-auto h-2.5 w-2.5 opacity-40 transition-transform", isOpen && "rotate-180")} />
                                )}
                            </button>
                        );
                    })}
                </div>

                {/* Dropdown — positioned inline below buttons */}
                {renderDropdown()}
            </div>
        </div>
    );
}
