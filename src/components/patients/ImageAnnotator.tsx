'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage, Transformer, Group } from 'react-konva';
import Konva from 'konva';
import { X, FlipHorizontal, FlipVertical, Copy, Trash2, Download, ChevronLeft, RotateCw } from 'lucide-react';

/* ─────────────────────── Types ─────────────────────── */
interface AnnotationElement {
    id: string;
    elementType: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    rotation: number;
}

interface DentalElementDef {
    type: string;
    label: string;
    icon: string;
    src: string;
}

const DENTAL_ELEMENTS: DentalElementDef[] = [
    { type: 'coroa', label: 'Coroa', icon: '👑', src: '/images/dental-elements/exocad-coroa.svg' },
    { type: 'pontico', label: 'Pôntico', icon: '🌉', src: '/images/dental-elements/exocad-bridge.svg' },
    { type: 'faceta', label: 'Faceta', icon: '🪟', src: '/images/dental-elements/exocad-faceta.svg' },
    { type: 'implante', label: 'Implante', icon: '🔩', src: '/images/dental-elements/exocad-implante.svg' },
    { type: 'onlay', label: 'Onlay', icon: '🦴', src: '/images/dental-elements/exocad-inlay.svg' },
];

/* ─────────────────── Props ─────────────────── */
interface ImageAnnotatorProps {
    imageSrc: string;
    onSave: (dataUrl: string) => void;
    onClose: () => void;
}

/* ─────────────── Helper: load image ─────────────── */
function useImage(src: string): HTMLImageElement | null {
    const [image, setImage] = useState<HTMLImageElement | null>(null);
    useEffect(() => {
        if (!src) return;
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => setImage(img);
        img.src = src;
    }, [src]);
    return image;
}

/* ─────────────── Annotation Node ─────────────── */
interface AnnotationNodeProps {
    el: AnnotationElement;
    isSelected: boolean;
    shiftHeld: boolean;
    onSelect: () => void;
    onChange: (newAttrs: Partial<AnnotationElement>) => void;
}

function AnnotationNode({ el, isSelected, shiftHeld, onSelect, onChange }: AnnotationNodeProps) {
    const shapeRef = useRef<Konva.Image>(null);
    const trRef = useRef<Konva.Transformer>(null);
    const dragStartRef = useRef<{ x: number; y: number; w: number; h: number; ptrX: number; ptrY: number; mode: 'move' | 'scale' | 'scaleHV' } | null>(null);
    const image = useImage(
        DENTAL_ELEMENTS.find(d => d.type === el.elementType)?.src || ''
    );

    useEffect(() => {
        if (isSelected && trRef.current && shapeRef.current) {
            trRef.current.nodes([shapeRef.current]);
            trRef.current.getLayer()?.batchDraw();
        }
    }, [isSelected]);

    if (!image) return null;

    return (
        <>
            <KonvaImage
                ref={shapeRef}
                image={image}
                x={el.x}
                y={el.y}
                width={el.width}
                height={el.height}
                offsetX={el.width / 2}
                offsetY={el.height / 2}
                scaleX={el.scaleX}
                scaleY={el.scaleY}
                rotation={el.rotation}
                shadowColor="#ffffff"
                shadowBlur={6}
                shadowOpacity={0.5}
                draggable
                onClick={onSelect}
                onTap={onSelect}
                onDragStart={(e) => {
                    const evt = e.evt as MouseEvent;
                    if (evt.shiftKey || evt.ctrlKey || evt.metaKey) {
                        const stage = e.target.getStage();
                        const pointer = stage?.getPointerPosition();
                        dragStartRef.current = {
                            x: e.target.x(),
                            y: e.target.y(),
                            w: el.width,
                            h: el.height,
                            ptrX: pointer?.x || 0,
                            ptrY: pointer?.y || 0,
                            mode: evt.shiftKey ? 'scale' : 'scaleHV',
                        };
                    } else {
                        dragStartRef.current = null;
                    }
                }}
                onDragMove={(e) => {
                    const ds = dragStartRef.current;
                    if (!ds) return; // normal drag — Konva handles it
                    // Cancel the visual drag, keep position fixed
                    e.target.x(ds.x);
                    e.target.y(ds.y);
                    const pointer = e.target.getStage()?.getPointerPosition();
                    if (!pointer) return;
                    // Center of element (x,y with offset = center)
                    const cx = ds.x;
                    const cy = ds.y;
                    if (ds.mode === 'scale') {
                        // Proportional: distance from center
                        const initDist = Math.sqrt((ds.ptrX - cx) ** 2 + (ds.ptrY - cy) ** 2);
                        const currDist = Math.sqrt((pointer.x - cx) ** 2 + (pointer.y - cy) ** 2);
                        const scaleFactor = initDist > 5 ? currDist / initDist : 1;
                        const clamped = Math.max(0.2, Math.min(5, scaleFactor));
                        onChange({ width: Math.max(10, ds.w * clamped), height: Math.max(10, ds.h * clamped) });
                    } else {
                        // H/V: dominant axis from total movement
                        const totalDx = Math.abs(pointer.x - ds.ptrX);
                        const totalDy = Math.abs(pointer.y - ds.ptrY);
                        if (totalDx > totalDy) {
                            // Horizontal: distance from center X
                            const initDistX = Math.abs(ds.ptrX - cx);
                            const currDistX = Math.abs(pointer.x - cx);
                            const scaleFactor = initDistX > 5 ? currDistX / initDistX : 1;
                            const clamped = Math.max(0.2, Math.min(5, scaleFactor));
                            onChange({ width: Math.max(10, ds.w * clamped) });
                        } else {
                            // Vertical: distance from center Y
                            const initDistY = Math.abs(ds.ptrY - cy);
                            const currDistY = Math.abs(pointer.y - cy);
                            const scaleFactor = initDistY > 5 ? currDistY / initDistY : 1;
                            const clamped = Math.max(0.2, Math.min(5, scaleFactor));
                            onChange({ height: Math.max(10, ds.h * clamped) });
                        }
                    }
                }}
                onDragEnd={(e) => {
                    const ds = dragStartRef.current;
                    if (ds) {
                        // Restore position (was already fixed during drag)
                        dragStartRef.current = null;
                        return;
                    }
                    onChange({ x: e.target.x(), y: e.target.y() });
                }}
                onTransformEnd={() => {
                    const node = shapeRef.current;
                    if (!node) return;
                    const sx = node.scaleX();
                    const sy = node.scaleY();
                    const flipX = el.scaleX < 0 ? -1 : 1;
                    const flipY = el.scaleY < 0 ? -1 : 1;
                    const newWidth = Math.max(10, node.width() * Math.abs(sx));
                    const newHeight = Math.max(10, node.height() * Math.abs(sy));
                    onChange({
                        x: node.x(),
                        y: node.y(),
                        rotation: node.rotation(),
                        width: newWidth,
                        height: newHeight,
                        scaleX: flipX,
                        scaleY: flipY,
                    });
                    node.width(newWidth);
                    node.height(newHeight);
                    node.offsetX(newWidth / 2);
                    node.offsetY(newHeight / 2);
                    node.scaleX(flipX);
                    node.scaleY(flipY);
                }}
            />
            {isSelected && (
                <Transformer
                    ref={trRef}
                    rotateEnabled={false}
                    enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
                    keepRatio={shiftHeld}
                    anchorSize={10}
                    anchorCornerRadius={2}
                    anchorStroke="#8b5cf6"
                    anchorFill="#1e1b4b"
                    anchorStrokeWidth={1.5}
                    borderStroke="#8b5cf6"
                    borderStrokeWidth={1}
                    borderDash={[4, 3]}
                    boundBoxFunc={(oldBox, newBox) => {
                        if (Math.abs(newBox.width) < 10 || Math.abs(newBox.height) < 10) return oldBox;
                        return newBox;
                    }}
                />
            )}
        </>
    );
}

/* ════════════════════════════════════════════════════════
   ██  MAIN: ImageAnnotator
   ════════════════════════════════════════════════════════ */
export default function ImageAnnotator({ imageSrc, onSave, onClose }: ImageAnnotatorProps) {
    const bgImage = useImage(imageSrc);
    const stageRef = useRef<Konva.Stage>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [elements, setElements] = useState<AnnotationElement[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [clipboard, setClipboard] = useState<AnnotationElement | null>(null);
    const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [shiftHeld, setShiftHeld] = useState(false);

    // ─── Track Shift key state ───
    useEffect(() => {
        const down = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(true); };
        const up = (e: KeyboardEvent) => { if (e.key === 'Shift') setShiftHeld(false); };
        window.addEventListener('keydown', down);
        window.addEventListener('keyup', up);
        return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); };
    }, []);

    // ─── Responsive sizing ───
    useEffect(() => {
        const mobile = window.innerWidth < 768;
        setIsMobile(mobile);

        const updateSize = () => {
            if (!containerRef.current || !bgImage) return;
            const cw = containerRef.current.clientWidth;
            const ch = containerRef.current.clientHeight;
            const imgRatio = bgImage.naturalWidth / bgImage.naturalHeight;
            const containerRatio = cw / ch;
            let w: number, h: number;
            if (containerRatio > imgRatio) {
                h = ch;
                w = h * imgRatio;
            } else {
                w = cw;
                h = w / imgRatio;
            }
            setStageSize({ width: Math.round(w), height: Math.round(h) });
        };

        updateSize();
        window.addEventListener('resize', updateSize);
        return () => window.removeEventListener('resize', updateSize);
    }, [bgImage]);

    // ─── Helpers ───
    const addElement = useCallback((type: string) => {
        const def = DENTAL_ELEMENTS.find(d => d.type === type);
        if (!def) return;
        const baseSize = Math.min(stageSize.width, stageSize.height) * 0.12;
        const newEl: AnnotationElement = {
            id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            elementType: type,
            x: stageSize.width / 2,
            y: stageSize.height / 2,
            width: baseSize,
            height: baseSize,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
        if (isMobile) setSidebarOpen(false);
    }, [stageSize, isMobile]);

    const updateElement = useCallback((id: string, attrs: Partial<AnnotationElement>) => {
        setElements(prev => prev.map(el => el.id === id ? { ...el, ...attrs } : el));
    }, []);

    const deleteSelected = useCallback(() => {
        if (!selectedId) return;
        setElements(prev => prev.filter(el => el.id !== selectedId));
        setSelectedId(null);
    }, [selectedId]);

    const flipH = useCallback(() => {
        if (!selectedId) return;
        setElements(prev => prev.map(el =>
            el.id === selectedId ? { ...el, scaleX: el.scaleX * -1 } : el
        ));
    }, [selectedId]);

    const flipV = useCallback(() => {
        if (!selectedId) return;
        setElements(prev => prev.map(el =>
            el.id === selectedId ? { ...el, scaleY: el.scaleY * -1 } : el
        ));
    }, [selectedId]);

    const copySelected = useCallback(() => {
        if (!selectedId) return;
        const el = elements.find(e => e.id === selectedId);
        if (el) setClipboard({ ...el });
    }, [selectedId, elements]);

    const paste = useCallback(() => {
        if (!clipboard) return;
        const newEl: AnnotationElement = {
            ...clipboard,
            id: `${clipboard.elementType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            x: clipboard.x + 20,
            y: clipboard.y + 20,
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    }, [clipboard]);

    const duplicate = useCallback(() => {
        if (!selectedId) return;
        const el = elements.find(e => e.id === selectedId);
        if (!el) return;
        const newEl: AnnotationElement = {
            ...el,
            id: `${el.elementType}-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            x: el.x + 20,
            y: el.y + 20,
        };
        setElements(prev => [...prev, newEl]);
        setSelectedId(newEl.id);
    }, [selectedId, elements]);

    const exportImage = useCallback(() => {
        if (!stageRef.current) return;
        // Deselect to hide transformer
        setSelectedId(null);
        setTimeout(() => {
            if (!stageRef.current) return;
            const dataUrl = stageRef.current.toDataURL({ pixelRatio: 2 });
            onSave(dataUrl);
        }, 100);
    }, [onSave]);

    const rotate90 = useCallback(() => {
        if (!selectedId) return;
        setElements(prev => prev.map(el =>
            el.id === selectedId ? { ...el, rotation: (el.rotation + 90) % 360 } : el
        ));
    }, [selectedId]);

    // ─── Keyboard shortcuts ───
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Delete' || e.key === 'Backspace') {
                e.preventDefault();
                deleteSelected();
            }
            if (e.key === 'h' || e.key === 'H') flipH();
            if (e.key === 'v' && !e.ctrlKey && !e.metaKey) flipV();
            if (e.key === 'r' || e.key === 'R') rotate90();
            if ((e.ctrlKey || e.metaKey) && e.key === 'c') {
                e.preventDefault();
                copySelected();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
                e.preventDefault();
                paste();
            }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [deleteSelected, flipH, flipV, copySelected, paste, rotate90]);

    const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
        const target = e.target;
        if (target === target.getStage() || (target.getClassName() === 'Image' && !target.draggable())) {
            setSelectedId(null);
        }
    };

    const selectedEl = elements.find(e => e.id === selectedId);

    // Calculate position for floating action buttons — always BELOW the rotated element
    const getFloatingButtonPos = () => {
        if (!selectedEl || !stageRef.current) return null;
        const stage = stageRef.current;
        const stageBox = stage.container().getBoundingClientRect();
        const w = selectedEl.width * Math.abs(selectedEl.scaleX);
        const h = selectedEl.height * Math.abs(selectedEl.scaleY);
        const rad = (selectedEl.rotation * Math.PI) / 180;
        // Bounding box after rotation
        const bbH = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
        // x,y is now center (with offset)
        const centerX = stageBox.left + selectedEl.x;
        const centerY = stageBox.top + selectedEl.y;
        // Position buttons below the bounding box bottom
        const belowY = centerY + bbH / 2 + 8;
        return { x: centerX, y: belowY };
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-black flex flex-col">
            {/* ── Top Bar ── */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-white/10 shrink-0">
                <button onClick={onClose} className="flex items-center gap-1.5 text-white/70 hover:text-white transition-colors text-sm">
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden sm:inline">Cancelar</span>
                </button>
                <h2 className="text-white text-sm font-semibold tracking-wide">✏️ Anotar Imagem</h2>
                <button
                    onClick={exportImage}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Exportar</span>
                </button>
            </div>

            {/* ── Main Layout ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* ── Sidebar ── */}
                <div className={`${sidebarOpen ? 'w-20 sm:w-24' : 'w-0'} shrink-0 bg-slate-900/95 border-r border-white/10 flex flex-col transition-all duration-200 overflow-hidden`}>
                    <div className="p-2 space-y-1.5 overflow-y-auto flex-1">
                        <p className="text-[8px] uppercase tracking-widest text-white/30 text-center mb-2 font-semibold">Elementos</p>
                        {DENTAL_ELEMENTS.map(def => (
                            <button
                                key={def.type}
                                onClick={() => addElement(def.type)}
                                className="w-full flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 active:bg-white/20 transition-colors cursor-grab active:cursor-grabbing group"
                                title={`Arrastar: ${def.label}`}
                            >
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white/5 rounded-lg border border-white/10 group-hover:border-white/30 flex items-center justify-center p-1.5 transition-colors">
                                    <img src={def.src} alt={def.label} className="w-full h-full object-contain" draggable={false} />
                                </div>
                                <span className="text-[9px] text-white/60 group-hover:text-white/90 font-medium">{def.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Sidebar toggle ── */}
                <button
                    onClick={() => setSidebarOpen(s => !s)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 z-10 bg-slate-800 border border-white/10 rounded-r-lg px-1 py-3 text-white/50 hover:text-white transition-colors"
                    style={{ left: sidebarOpen ? (isMobile ? '80px' : '96px') : '0' }}
                >
                    <ChevronLeft className={`h-3 w-3 transition-transform ${!sidebarOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* ── Canvas Area ── */}
                <div ref={containerRef} className="flex-1 flex items-center justify-center bg-black/95 overflow-hidden relative">
                    {bgImage && (
                        <Stage
                            ref={stageRef}
                            width={stageSize.width}
                            height={stageSize.height}
                            onClick={handleStageClick}
                            onTap={handleStageClick}
                            style={{ cursor: 'crosshair' }}
                        >
                            <Layer>
                                {/* Background image */}
                                <KonvaImage
                                    image={bgImage}
                                    width={stageSize.width}
                                    height={stageSize.height}
                                    listening={false}
                                />
                                {/* Annotation elements */}
                                {elements.map(el => (
                                    <AnnotationNode
                                        key={el.id}
                                        el={el}
                                        isSelected={el.id === selectedId}
                                        shiftHeld={shiftHeld}
                                        onSelect={() => setSelectedId(el.id)}
                                        onChange={attrs => updateElement(el.id, attrs)}
                                    />
                                ))}
                            </Layer>
                        </Stage>
                    )}

                    {!bgImage && (
                        <div className="text-white/40 text-sm">A carregar imagem...</div>
                    )}

                    {/* ── Floating contextual buttons near selected element ── */}
                    {selectedId && (() => {
                        const pos = getFloatingButtonPos();
                        if (!pos) return null;
                        return (
                            <div
                                className="fixed z-[10000] flex items-center gap-0.5 bg-slate-800/95 backdrop-blur-sm border border-white/15 rounded-lg px-1 py-0.5 shadow-xl"
                                style={{ left: `${pos.x}px`, top: `${pos.y}px`, transform: 'translateX(-50%)' }}
                            >
                                <button onClick={flipH} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors" title="Flip H">
                                    <FlipHorizontal className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={flipV} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors" title="Flip V">
                                    <FlipVertical className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={rotate90} className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded transition-colors" title="Rodar 90°">
                                    <RotateCw className="h-3.5 w-3.5" />
                                </button>
                                <div className="w-px h-4 bg-white/10 mx-0.5" />
                                <button onClick={deleteSelected} className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/15 rounded transition-colors" title="Eliminar">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* ── Mobile contextual toolbar ── */}
            {isMobile && selectedId && (
                <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-slate-900 border-t border-white/10 shrink-0">
                    <button onClick={flipH} className="flex flex-col items-center gap-0.5 text-white/70 active:text-white p-1.5">
                        <FlipHorizontal className="h-5 w-5" />
                        <span className="text-[8px]">Flip H</span>
                    </button>
                    <button onClick={flipV} className="flex flex-col items-center gap-0.5 text-white/70 active:text-white p-1.5">
                        <FlipVertical className="h-5 w-5" />
                        <span className="text-[8px]">Flip V</span>
                    </button>
                    <button onClick={duplicate} className="flex flex-col items-center gap-0.5 text-white/70 active:text-white p-1.5">
                        <Copy className="h-5 w-5" />
                        <span className="text-[8px]">Duplicar</span>
                    </button>
                    <button onClick={deleteSelected} className="flex flex-col items-center gap-0.5 text-red-400 active:text-red-300 p-1.5">
                        <Trash2 className="h-5 w-5" />
                        <span className="text-[8px]">Eliminar</span>
                    </button>
                </div>
            )}
        </div>
    );
}
