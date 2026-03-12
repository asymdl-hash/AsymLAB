'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X, Camera, Sun, Aperture, Zap, Focus, Ruler } from 'lucide-react';

// ─────────── Types ───────────
export interface PhotoGuidePage {
    title: string;
    type: 'positioning' | 'settings';
    // Positioning page
    diagram?: React.ReactNode;
    notes?: string[];
    // Settings page
    settings?: { icon: React.ReactNode; label: string; value: string }[];
}

export interface PhotoGuideData {
    pages: PhotoGuidePage[];
}

// ─────────── Default guide data factory ───────────
export function getDefaultGuide(cardKey: string): PhotoGuideData {
    // Positioning notes per card
    const positioningMap: Record<string, { notes: string[]; distance: string; angle: string; lights: string }> = {
        repouso: { notes: ['Lábios juntos em posição natural', 'Olhar direito para a câmara'], distance: '1.5m', angle: 'Frontal', lights: '45° bilateral' },
        sorrisoNatural: { notes: ['Sorriso relaxado e natural', 'Não forçar a expressão'], distance: '1.5m', angle: 'Frontal', lights: '45° bilateral' },
        sorrisoAlto: { notes: ['Sorriso máximo mostrando gengivas', 'Lábios afastados ao máximo'], distance: '1.5m', angle: 'Frontal', lights: '45° bilateral' },
        '45': { notes: ['Rosto virado 45° para a esquerda', 'Repetir para o lado direito'], distance: '1.5m', angle: '45° lateral', lights: '45° + reflector lateral' },
        perfil: { notes: ['Perfil completo — 90° lateral', 'Orelha visível, nariz livre'], distance: '1.5m', angle: '90° lateral', lights: 'Lateral + preenchimento' },
        'cu-repouso': { notes: ['Close-up dos lábios em repouso', 'Foco na linha do sorriso'], distance: '0.5m', angle: 'Frontal', lights: 'Ring flash' },
        'cu-sorrisoNatural': { notes: ['Close-up do sorriso natural', 'Mostrar relação labial'], distance: '0.5m', angle: 'Frontal', lights: 'Ring flash' },
        'cu-sorrisoAlto': { notes: ['Close-up do sorriso máximo', 'Gengivas e dentes visíveis'], distance: '0.5m', angle: 'Frontal', lights: 'Ring flash' },
        'cu-retractores': { notes: ['Retractores colocados', 'Dentes em oclusão'], distance: '0.3m', angle: 'Frontal', lights: 'Twin flash lateral' },
        'cu-45': { notes: ['Retractores com vista 45°', 'Mostrar caninos e relação molar'], distance: '0.3m', angle: '45° lateral', lights: 'Twin flash lateral' },
        intraoralSup: { notes: ['Espelho oclusal superior', 'Paciente boca aberta, cabeça inclinada para trás'], distance: '0.3m', angle: 'Espelho 45° sup.', lights: 'Twin flash' },
        intraoralInf: { notes: ['Espelho oclusal inferior', 'Paciente boca aberta, cabeça inclinada para frente'], distance: '0.3m', angle: 'Espelho 45° inf.', lights: 'Twin flash' },
        foto45: { notes: ['Fotografia frontal com inclinação de 45º', 'Captar dentes superiores em relação ao lábio superior', 'Sorriso natural do paciente'], distance: '0.5m', angle: '45° descend.', lights: 'Flash direto' },
        outros: { notes: ['Fotografias complementares', 'Composição livre'], distance: 'Variável', angle: 'Variável', lights: 'Variável' },
    };

    // Camera settings per card type
    const settingsMap: Record<string, { iso: string; speed: string; aperture: string; wb: string; flash: string; focal: string }> = {
        repouso: { iso: '200', speed: '1/200s', aperture: 'f/8', wb: 'Flash (5500K)', flash: 'TTL -0.3', focal: '85-105mm' },
        sorrisoNatural: { iso: '200', speed: '1/200s', aperture: 'f/8', wb: 'Flash (5500K)', flash: 'TTL -0.3', focal: '85-105mm' },
        sorrisoAlto: { iso: '200', speed: '1/200s', aperture: 'f/8', wb: 'Flash (5500K)', flash: 'TTL -0.3', focal: '85-105mm' },
        '45': { iso: '200', speed: '1/200s', aperture: 'f/8', wb: 'Flash (5500K)', flash: 'TTL -0.3', focal: '85-105mm' },
        perfil: { iso: '200', speed: '1/200s', aperture: 'f/8', wb: 'Flash (5500K)', flash: 'TTL -0.3', focal: '85-105mm' },
        'cu-repouso': { iso: '200', speed: '1/200s', aperture: 'f/22', wb: 'Flash (5500K)', flash: 'TTL -0.7', focal: '100mm macro' },
        'cu-sorrisoNatural': { iso: '200', speed: '1/200s', aperture: 'f/22', wb: 'Flash (5500K)', flash: 'TTL -0.7', focal: '100mm macro' },
        'cu-sorrisoAlto': { iso: '200', speed: '1/200s', aperture: 'f/22', wb: 'Flash (5500K)', flash: 'TTL -0.7', focal: '100mm macro' },
        'cu-retractores': { iso: '200', speed: '1/200s', aperture: 'f/29', wb: 'Flash (5500K)', flash: 'TTL', focal: '100mm macro' },
        'cu-45': { iso: '200', speed: '1/200s', aperture: 'f/29', wb: 'Flash (5500K)', flash: 'TTL', focal: '100mm macro' },
        intraoralSup: { iso: '200', speed: '1/200s', aperture: 'f/29', wb: 'Flash (5500K)', flash: 'TTL +0.3', focal: '100mm macro' },
        intraoralInf: { iso: '200', speed: '1/200s', aperture: 'f/29', wb: 'Flash (5500K)', flash: 'TTL +0.3', focal: '100mm macro' },
        foto45: { iso: '200', speed: '1/200s', aperture: 'f/29', wb: 'Flash (5500K)', flash: 'TTL', focal: '100mm macro' },
        outros: { iso: '200', speed: '1/200s', aperture: 'f/16', wb: 'Auto', flash: 'TTL', focal: 'Variável' },
    };

    const pos = positioningMap[cardKey] || positioningMap.outros!;
    const set = settingsMap[cardKey] || settingsMap.outros!;

    return {
        pages: [
            {
                title: 'Posicionamento da Câmara',
                type: 'positioning',
                notes: pos.notes,
                diagram: (
                    <div className="flex flex-col items-center gap-3 py-2">
                        {/* Diagram: camera → face with lights */}
                        <div className="relative w-full max-w-[220px] h-[120px]">
                            {/* Left light */}
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
                                <div className="w-6 h-8 rounded-sm bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-500/30 flex items-center justify-center">
                                    <Sun className="h-3 w-3 text-amber-700" />
                                </div>
                                <span className="text-[7px] text-gray-400 mt-0.5">Luz</span>
                            </div>
                            {/* Right light */}
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
                                <div className="w-6 h-8 rounded-sm bg-gradient-to-b from-amber-200 to-amber-400 border border-amber-500/30 flex items-center justify-center">
                                    <Sun className="h-3 w-3 text-amber-700" />
                                </div>
                                <span className="text-[7px] text-gray-400 mt-0.5">Luz</span>
                            </div>
                            {/* Face silhouette */}
                            <div className="absolute left-1/2 -translate-x-1/2 top-0 flex flex-col items-center">
                                <div className="w-12 h-14 rounded-full bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300 flex items-center justify-center">
                                    <span className="text-lg">🙂</span>
                                </div>
                                <span className="text-[7px] text-gray-400 mt-0.5">Paciente</span>
                            </div>
                            {/* Camera */}
                            <div className="absolute left-1/2 -translate-x-1/2 bottom-0 flex flex-col items-center">
                                <div className="w-8 h-6 rounded bg-gradient-to-b from-gray-600 to-gray-800 border border-gray-500 flex items-center justify-center">
                                    <Camera className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-[7px] text-gray-400 mt-0.5">Câmara</span>
                            </div>
                            {/* Dotted line from camera to face */}
                            <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 220 120">
                                <line x1="110" y1="55" x2="110" y2="95" stroke="#94a3b8" strokeWidth="1" strokeDasharray="4 3" />
                                {/* Angle lines to lights */}
                                <line x1="35" y1="60" x2="95" y2="25" stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.5" />
                                <line x1="185" y1="60" x2="125" y2="25" stroke="#f59e0b" strokeWidth="0.7" strokeDasharray="3 3" opacity="0.5" />
                            </svg>
                        </div>
                        {/* Info pills */}
                        <div className="flex flex-wrap justify-center gap-1.5">
                            <span className="px-2 py-0.5 rounded-full bg-sky-50 border border-sky-200 text-[9px] text-sky-700 font-medium">📏 {pos.distance}</span>
                            <span className="px-2 py-0.5 rounded-full bg-violet-50 border border-violet-200 text-[9px] text-violet-700 font-medium">📐 {pos.angle}</span>
                            <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-[9px] text-amber-700 font-medium">💡 {pos.lights}</span>
                        </div>
                    </div>
                ),
            },
            {
                title: 'Settings da Câmara',
                type: 'settings',
                settings: [
                    { icon: <Camera className="h-3.5 w-3.5 text-gray-500" />, label: 'ISO', value: set.iso },
                    { icon: <Focus className="h-3.5 w-3.5 text-gray-500" />, label: 'Velocidade', value: set.speed },
                    { icon: <Aperture className="h-3.5 w-3.5 text-gray-500" />, label: 'Abertura', value: set.aperture },
                    { icon: <Sun className="h-3.5 w-3.5 text-gray-500" />, label: 'Balanço Brancos', value: set.wb },
                    { icon: <Zap className="h-3.5 w-3.5 text-gray-500" />, label: 'Flash', value: set.flash },
                    { icon: <Ruler className="h-3.5 w-3.5 text-gray-500" />, label: 'Focal', value: set.focal },
                ],
            },
        ],
    };
}

// ─────────── Component ───────────
interface PhotoGuidePopoverProps {
    guide: PhotoGuideData;
    onClose: () => void;
    anchorRef?: React.RefObject<HTMLElement | null>;
}

export default function PhotoGuidePopover({ guide, onClose, anchorRef }: PhotoGuidePopoverProps) {
    const [page, setPage] = useState(0);
    const popoverRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);
    const totalPages = guide.pages.length;
    const [pos, setPos] = useState<{ top: number; left: number; openUp: boolean }>({ top: 0, left: 0, openUp: false });

    // ── Calculate fixed position from parent ──
    useEffect(() => {
        const calculate = () => {
            const parent = popoverRef.current?.parentElement;
            if (!parent) return;
            const rect = parent.getBoundingClientRect();
            const popoverH = 380; // approximate popover height
            const spaceBelow = window.innerHeight - rect.bottom;
            const openUp = spaceBelow < popoverH && rect.top > popoverH;
            setPos({
                left: rect.left + rect.width / 2,
                top: openUp ? rect.top - 8 : rect.bottom + 8,
                openUp,
            });
        };
        calculate();
        window.addEventListener('scroll', calculate, true);
        window.addEventListener('resize', calculate);
        return () => { window.removeEventListener('scroll', calculate, true); window.removeEventListener('resize', calculate); };
    }, []);

    // ── Click outside to close ──
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (
                popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
                (!anchorRef?.current || !anchorRef.current.contains(e.target as Node))
            ) {
                onClose();
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [onClose, anchorRef]);

    // ── Keyboard navigation ──
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') setPage(p => Math.max(0, p - 1));
            if (e.key === 'ArrowRight') setPage(p => Math.min(totalPages - 1, p + 1));
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, [onClose, totalPages]);

    // ── Swipe support ──
    const onTouchStart = useCallback((e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    }, []);
    const onTouchEnd = useCallback((e: React.TouchEvent) => {
        if (touchStartX.current === null) return;
        const diff = e.changedTouches[0].clientX - touchStartX.current;
        if (Math.abs(diff) > 50) {
            if (diff < 0 && page < totalPages - 1) setPage(p => p + 1);
            if (diff > 0 && page > 0) setPage(p => p - 1);
        }
        touchStartX.current = null;
    }, [page, totalPages]);

    const currentPage = guide.pages[page];

    return (
        <div
            ref={popoverRef}
            className="fixed z-[9999] w-[300px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-gray-200/80 overflow-hidden"
            style={{
                top: pos.openUp ? undefined : `${pos.top}px`,
                bottom: pos.openUp ? `${window.innerHeight - pos.top}px` : undefined,
                left: `${pos.left}px`,
                transform: 'translateX(-50%)',
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
        >
            {/* ── Header with dots ── */}
            <div className="flex items-center justify-between px-3 pt-3 pb-1">
                <div className="w-6" />
                <div className="flex items-center gap-1.5">
                    {guide.pages.map((_, i) => (
                        <button
                            key={i}
                            type="button"
                            onClick={() => setPage(i)}
                            className={`rounded-full transition-all ${i === page
                                ? 'w-2 h-2 bg-amber-500'
                                : 'w-1.5 h-1.5 bg-gray-300 hover:bg-gray-400'
                                }`}
                        />
                    ))}
                </div>
                <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* ── Title ── */}
            <div className="px-4 pb-2">
                <h4 className="text-[13px] font-bold text-gray-800">{currentPage.title}</h4>
            </div>

            {/* ── Content ── */}
            <div className="px-4 pb-3 min-h-[200px]">
                {currentPage.type === 'positioning' && (
                    <div className="space-y-2">
                        {currentPage.diagram}
                        {currentPage.notes && (
                            <ul className="space-y-1">
                                {currentPage.notes.map((note, i) => (
                                    <li key={i} className="flex items-start gap-1.5 text-[10px] text-gray-600">
                                        <span className="text-amber-500 mt-0.5">•</span>
                                        {note}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {currentPage.type === 'settings' && currentPage.settings && (
                    <div className="space-y-1.5">
                        {currentPage.settings.map((s, i) => (
                            <div key={i} className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-gray-50/80 border border-gray-100">
                                <div className="w-5 h-5 rounded-md bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                                    {s.icon}
                                </div>
                                <span className="text-[10px] text-gray-500 flex-1">{s.label}</span>
                                <span className="text-[11px] font-semibold text-gray-800">{s.value}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Footer with arrows ── */}
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50/50">
                <button
                    type="button"
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <span className="text-[10px] text-gray-400 font-medium">
                    {page + 1} / {totalPages}
                </span>
                <button
                    type="button"
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page === totalPages - 1}
                    className="w-7 h-7 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <ChevronRight className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
