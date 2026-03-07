'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    SwitchCamera,
    Grid3X3,
    Flashlight,
    ZoomIn,
    ZoomOut,
    Timer,
    Check,
    Image as ImageIcon,
    Settings,
    Sun,
    Focus,
    Ratio,
    ChevronLeft,
    ChevronRight,
    RotateCcw,
    Maximize,
    Minimize,
    Trash2,
    Smartphone,
} from 'lucide-react';

// ---------- Types ----------
interface CameraOverlayProps {
    onCapture: (file: File) => void;
    onClose: () => void;
    /** ID da key do campo para aceder ao input câmara nativa (capture="environment") */
    nativeCamKey?: string;
}

type AspectRatio = '4:3' | '16:9' | '1:1' | 'full';
type Resolution = 'hd' | 'fhd' | '4k';

const ASPECT_RATIOS: Record<AspectRatio, { label: string; cls: string; w: number; h: number }> = {
    '4:3': { label: '4:3', cls: 'aspect-[4/3]', w: 4, h: 3 },
    '16:9': { label: '16:9', cls: 'aspect-[16/9]', w: 16, h: 9 },
    '1:1': { label: '1:1', cls: 'aspect-square', w: 1, h: 1 },
    'full': { label: 'Full', cls: '', w: 0, h: 0 },
};

const RESOLUTIONS: Record<Resolution, { label: string; w: number; h: number }> = {
    'hd': { label: 'HD', w: 1280, h: 720 },
    'fhd': { label: 'Full HD', w: 1920, h: 1080 },
    '4k': { label: '4K', w: 3840, h: 2160 },
};

const TIMER_OPTIONS = [0, 3, 5, 10];

// ---------- Component ----------
export default function CameraOverlay({ onCapture, onClose, nativeCamKey }: CameraOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const burstIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // — Camera state
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [resolution, setResolution] = useState<Resolution>('fhd');
    const [aspectRatio, setAspectRatio] = useState<AspectRatio>('4:3');

    // — Zoom
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(1);
    const [zoomSupported, setZoomSupported] = useState(false);

    // — Exposure
    const [exposure, setExposure] = useState(0);
    const [minExposure, setMinExposure] = useState(0);
    const [maxExposure, setMaxExposure] = useState(0);
    const [exposureSupported, setExposureSupported] = useState(false);

    // — Torch
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);

    // — Focus
    const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);

    // — UI toggles
    const [showGrid, setShowGrid] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [showSettings, setShowSettings] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showGallery, setShowGallery] = useState(false);
    const [galleryIdx, setGalleryIdx] = useState(0);

    // — Capture state
    const [captureCount, setCaptureCount] = useState(0);
    const [previews, setPreviews] = useState<string[]>([]);
    const [flashAnim, setFlashAnim] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [isBursting, setIsBursting] = useState(false);

    // — Pinch-to-zoom
    const lastPinchDist = useRef<number | null>(null);

    // ────────────────── Start camera ──────────────────
    const startCamera = useCallback(async (facing: 'user' | 'environment', res?: Resolution) => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        const r = RESOLUTIONS[res ?? resolution];
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facing,
                    width: { ideal: r.w },
                    height: { ideal: r.h },
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const track = stream.getVideoTracks()[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const caps = track.getCapabilities() as any;

            // Zoom
            if (caps.zoom) {
                setZoomSupported(true);
                setMinZoom(caps.zoom.min ?? 1);
                setMaxZoom(caps.zoom.max ?? 1);
                setZoom(caps.zoom.min ?? 1);
            } else {
                setZoomSupported(false);
            }

            // Exposure
            if (caps.exposureCompensation) {
                setExposureSupported(true);
                setMinExposure(caps.exposureCompensation.min ?? -2);
                setMaxExposure(caps.exposureCompensation.max ?? 2);
                setExposure(0);
            } else {
                setExposureSupported(false);
            }

            // Torch
            setTorchSupported(caps.torch !== undefined);
            setTorchOn(false);
        } catch {
            alert('Não foi possível aceder à câmara. Verifique as permissões.');
            onClose();
        }
    }, [resolution, onClose]);

    useEffect(() => {
        startCamera(facingMode);
        return () => {
            if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
            if (countdownRef.current) clearInterval(countdownRef.current);
            if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ────────────────── Zoom ──────────────────
    const applyZoom = useCallback(async (value: number) => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (track as any).applyConstraints({ advanced: [{ zoom: value }] });
            setZoom(value);
        } catch { /* unsupported */ }
    }, []);

    // Pinch-to-zoom handlers
    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (!zoomSupported || e.touches.length < 2) {
            lastPinchDist.current = null;
            return;
        }
        const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY,
        );
        if (lastPinchDist.current !== null) {
            const delta = (dist - lastPinchDist.current) * 0.01;
            const newZoom = Math.min(maxZoom, Math.max(minZoom, zoom + delta));
            applyZoom(newZoom);
        }
        lastPinchDist.current = dist;
    }, [zoomSupported, maxZoom, minZoom, zoom, applyZoom]);

    const handleTouchEnd = useCallback(() => {
        lastPinchDist.current = null;
    }, []);

    // ────────────────── Exposure ──────────────────
    const applyExposure = useCallback(async (value: number) => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (track as any).applyConstraints({ advanced: [{ exposureCompensation: value }] });
            setExposure(value);
        } catch { /* unsupported */ }
    }, []);

    // ────────────────── Torch ──────────────────
    const toggleTorch = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        const next = !torchOn;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (track as any).applyConstraints({ advanced: [{ torch: next }] });
            setTorchOn(next);
        } catch { /* unsupported */ }
    }, [torchOn]);

    // ────────────────── Switch camera ──────────────────
    const switchCamera = useCallback(() => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
        startCamera(next);
    }, [facingMode, startCamera]);

    // ────────────────── Tap-to-focus ──────────────────
    const handleTapFocus = useCallback((e: React.MouseEvent | React.TouchEvent) => {
        const container = videoContainerRef.current;
        if (!container) return;
        const rect = container.getBoundingClientRect();
        let cx: number, cy: number;
        if ('touches' in e) {
            cx = e.touches[0].clientX;
            cy = e.touches[0].clientY;
        } else {
            cx = e.clientX;
            cy = e.clientY;
        }
        const x = (cx - rect.left) / rect.width;
        const y = (cy - rect.top) / rect.height;
        setFocusPoint({ x: cx - rect.left, y: cy - rect.top });
        setTimeout(() => setFocusPoint(null), 1500);

        // Apply point of interest for focus (if supported)
        const track = streamRef.current?.getVideoTracks()[0];
        if (track) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const caps = track.getCapabilities() as any;
                if (caps.focusMode?.includes('manual')) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (track as any).applyConstraints({
                        advanced: [{ pointsOfInterest: [{ x, y }], focusMode: 'manual' }],
                    });
                    setTimeout(() => {
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (track as any).applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                    }, 2000);
                }
            } catch { /* unsupported */ }
        }
    }, []);

    // ────────────────── Capture ──────────────────
    const doCapture = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        setFlashAnim(true);
        setTimeout(() => setFlashAnim(false), 200);

        const canvas = document.createElement('canvas');

        // Apply aspect ratio crop
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const ar = ASPECT_RATIOS[aspectRatio];
        let sx = 0, sy = 0, sw = vw, sh = vh;

        if (ar.w > 0) {
            const targetRatio = ar.w / ar.h;
            const currentRatio = vw / vh;
            if (currentRatio > targetRatio) {
                sw = Math.round(vh * targetRatio);
                sx = Math.round((vw - sw) / 2);
            } else {
                sh = Math.round(vw / targetRatio);
                sy = Math.round((vh - sh) / 2);
            }
        }

        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            const url = URL.createObjectURL(file);
            setCaptureCount(prev => prev + 1);
            setPreviews(prev => [...prev, url]);
        }, 'image/jpeg', 0.92);
    }, [facingMode, aspectRatio, onCapture]);

    // Timer then capture
    const handleCapture = useCallback(() => {
        if (timerSeconds > 0) {
            let count = timerSeconds;
            setCountdown(count);
            countdownRef.current = setInterval(() => {
                count--;
                if (count <= 0) {
                    clearInterval(countdownRef.current!);
                    countdownRef.current = null;
                    setCountdown(null);
                    doCapture();
                } else {
                    setCountdown(count);
                }
            }, 1000);
        } else {
            doCapture();
        }
    }, [timerSeconds, doCapture]);

    // Burst mode
    const startBurst = useCallback(() => {
        setIsBursting(true);
        doCapture();
        burstIntervalRef.current = setInterval(() => doCapture(), 400);
    }, [doCapture]);

    const stopBurst = useCallback(() => {
        setIsBursting(false);
        if (burstIntervalRef.current) {
            clearInterval(burstIntervalRef.current);
            burstIntervalRef.current = null;
        }
    }, []);

    // ────────────────── Fullscreen ──────────────────
    const toggleFullscreen = useCallback(async () => {
        try {
            if (!document.fullscreenElement) {
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
                await document.exitFullscreen();
                setIsFullscreen(false);
            }
        } catch { /* ignore */ }
    }, []);

    // ────────────────── Resolution change ──────────────────
    const changeResolution = useCallback((res: Resolution) => {
        setResolution(res);
        startCamera(facingMode, res);
    }, [facingMode, startCamera]);

    // ────────────────── Gallery ──────────────────
    const deletePhoto = useCallback((idx: number) => {
        setPreviews(prev => prev.filter((_, i) => i !== idx));
        setCaptureCount(prev => prev - 1);
        if (galleryIdx >= previews.length - 1) setGalleryIdx(Math.max(0, previews.length - 2));
    }, [galleryIdx, previews.length]);

    // ────────────────── Close ──────────────────
    const handleClose = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (countdownRef.current) clearInterval(countdownRef.current);
        if (burstIntervalRef.current) clearInterval(burstIntervalRef.current);
        if (document.fullscreenElement) document.exitFullscreen().catch(() => { });
        onClose();
    }, [onClose]);

    // ────────────────── Settings panel ──────────────────
    const currentTrackSettings = streamRef.current?.getVideoTracks()[0]?.getSettings();
    const actualRes = currentTrackSettings ? `${currentTrackSettings.width}×${currentTrackSettings.height}` : '';

    // ────────────────── RENDER ──────────────────
    if (showGallery && previews.length > 0) {
        return (
            <div className="fixed inset-0 z-[100] bg-black flex flex-col">
                {/* Gallery header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90">
                    <button type="button" onClick={() => setShowGallery(false)} className="text-white">
                        <ChevronLeft className="h-6 w-6" />
                    </button>
                    <span className="text-white text-sm font-medium">{galleryIdx + 1} / {previews.length}</span>
                    <button type="button" onClick={() => deletePhoto(galleryIdx)} className="text-red-400 hover:text-red-300">
                        <Trash2 className="h-5 w-5" />
                    </button>
                </div>
                {/* Gallery image */}
                <div className="flex-1 flex items-center justify-center relative">
                    <img src={previews[galleryIdx]} alt={`Foto ${galleryIdx + 1}`} className="max-w-full max-h-full object-contain" />
                    {galleryIdx > 0 && (
                        <button type="button" onClick={() => setGalleryIdx(galleryIdx - 1)} className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white">
                            <ChevronLeft className="h-5 w-5" />
                        </button>
                    )}
                    {galleryIdx < previews.length - 1 && (
                        <button type="button" onClick={() => setGalleryIdx(galleryIdx + 1)} className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 flex items-center justify-center text-white">
                            <ChevronRight className="h-5 w-5" />
                        </button>
                    )}
                </div>
                {/* Thumbnails strip */}
                <div className="flex gap-1 px-4 py-3 bg-gray-900/90 overflow-x-auto">
                    {previews.map((url, i) => (
                        <button key={i} type="button" onClick={() => setGalleryIdx(i)} className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${i === galleryIdx ? 'border-sky-500' : 'border-transparent'}`}>
                            <img src={url} alt={`Thumb ${i + 1}`} className="w-full h-full object-cover" />
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={e => e.stopPropagation()}>
            {/* ──── Header toolbar ──── */}
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-900/90 backdrop-blur-sm relative z-10">
                <button type="button" onClick={handleClose} className="text-white hover:text-gray-300 transition-colors">
                    <X className="h-6 w-6" />
                </button>

                {/* Center: Aspect ratio pills */}
                <div className="flex items-center gap-1 bg-gray-800 rounded-full px-1 py-0.5">
                    {(Object.entries(ASPECT_RATIOS) as [AspectRatio, typeof ASPECT_RATIOS[AspectRatio]][]).map(([key, v]) => (
                        <button
                            key={key}
                            type="button"
                            onClick={() => setAspectRatio(key)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-semibold transition-all ${aspectRatio === key ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'
                                }`}
                        >
                            {v.label}
                        </button>
                    ))}
                </div>

                {/* Right: toolbar buttons */}
                <div className="flex items-center gap-1.5">
                    <ToolBtn active={showGrid} onClick={() => setShowGrid(!showGrid)} title="Grelha"><Grid3X3 className="h-4.5 w-4.5" /></ToolBtn>
                    <ToolBtn active={timerSeconds > 0} onClick={() => {
                        const idx = TIMER_OPTIONS.indexOf(timerSeconds);
                        setTimerSeconds(TIMER_OPTIONS[(idx + 1) % TIMER_OPTIONS.length]);
                    }} title={`Timer ${timerSeconds}s`}>
                        <div className="relative">
                            <Timer className="h-4.5 w-4.5" />
                            {timerSeconds > 0 && <span className="absolute -bottom-1 -right-1 text-[7px] font-bold bg-sky-500 text-white rounded-full w-3 h-3 flex items-center justify-center">{timerSeconds}</span>}
                        </div>
                    </ToolBtn>
                    {torchSupported && <ToolBtn active={torchOn} onClick={toggleTorch} title="Flash" activeColor="bg-yellow-500"><Flashlight className="h-4.5 w-4.5" /></ToolBtn>}
                    <ToolBtn onClick={switchCamera} title="Trocar câmara"><SwitchCamera className="h-4.5 w-4.5" /></ToolBtn>
                    <ToolBtn active={showSettings} onClick={() => setShowSettings(!showSettings)} title="Definições"><Settings className="h-4.5 w-4.5" /></ToolBtn>
                    <ToolBtn onClick={toggleFullscreen} title="Ecrã inteiro">{isFullscreen ? <Minimize className="h-4.5 w-4.5" /> : <Maximize className="h-4.5 w-4.5" />}</ToolBtn>
                </div>
            </div>

            {/* ──── Settings panel (slide down) ──── */}
            {showSettings && (
                <div className="bg-gray-900/95 backdrop-blur-sm px-5 py-3 space-y-3 border-b border-gray-700/50 animate-in slide-in-from-top duration-200">
                    {/* Resolution */}
                    <div className="flex items-center justify-between">
                        <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold">Resolução</span>
                        <div className="flex gap-1">
                            {(Object.entries(RESOLUTIONS) as [Resolution, typeof RESOLUTIONS[Resolution]][]).map(([key, v]) => (
                                <button
                                    key={key}
                                    type="button"
                                    onClick={() => changeResolution(key)}
                                    className={`px-2.5 py-1 rounded text-[10px] font-semibold transition-all ${resolution === key ? 'bg-sky-500 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                        }`}
                                >
                                    {v.label}
                                </button>
                            ))}
                        </div>
                    </div>
                    {actualRes && <p className="text-[9px] text-gray-500 text-right -mt-2">Actual: {actualRes}</p>}

                    {/* Exposure */}
                    {exposureSupported && (
                        <div className="space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-[11px] text-gray-400 uppercase tracking-wider font-semibold flex items-center gap-1"><Sun className="h-3 w-3" /> Exposição</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-300">{exposure > 0 ? '+' : ''}{exposure.toFixed(1)}</span>
                                    <button type="button" onClick={() => applyExposure(0)} className="text-[9px] text-sky-400 hover:text-sky-300">Reset</button>
                                </div>
                            </div>
                            <input
                                type="range"
                                min={minExposure}
                                max={maxExposure}
                                step={0.1}
                                value={exposure}
                                onChange={e => applyExposure(parseFloat(e.target.value))}
                                className="w-full accent-yellow-500 h-1"
                            />
                        </div>
                    )}

                    {/* Burst mode info */}
                    <p className="text-[9px] text-gray-500 flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" /> Modo Burst: manter pressionado o botão de captura
                    </p>

                    {/* Native camera button (mobile) */}
                    {nativeCamKey && (
                        <button
                            type="button"
                            onClick={() => {
                                const camInput = document.getElementById(`cam-native-${nativeCamKey}`) as HTMLInputElement;
                                if (camInput) camInput.click();
                            }}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-[11px] font-semibold hover:bg-emerald-500/30 transition-colors border border-emerald-500/30"
                        >
                            <Smartphone className="h-3.5 w-3.5" />
                            Foto Nativa (HDR / AI do telemóvel)
                        </button>
                    )}
                </div>
            )}

            {/* ──── Video area ──── */}
            <div
                ref={videoContainerRef}
                className="flex-1 relative flex items-center justify-center overflow-hidden bg-black"
                onClick={handleTapFocus}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`max-w-full max-h-full object-contain ${aspectRatio !== 'full' ? ASPECT_RATIOS[aspectRatio].cls : ''}`}
                    style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : undefined }}
                />

                {/* Aspect ratio mask (darken outside crop) */}
                {aspectRatio !== 'full' && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 bg-black/40" />
                        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${ASPECT_RATIOS[aspectRatio].cls} bg-transparent max-w-full max-h-full`}
                            style={{ boxShadow: '0 0 0 9999px rgba(0,0,0,0.4)', width: '100%' }}
                        />
                    </div>
                )}

                {/* Grid overlay */}
                {showGrid && (
                    <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/25" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/25" />
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/25" />
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/25" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-5 h-px bg-white/40" />
                            <div className="w-px h-5 bg-white/40 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                )}

                {/* Focus ring */}
                {focusPoint && (
                    <div
                        className="absolute w-16 h-16 border-2 border-yellow-400 rounded-lg pointer-events-none animate-ping"
                        style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
                    />
                )}
                {focusPoint && (
                    <div
                        className="absolute pointer-events-none"
                        style={{ left: focusPoint.x - 32, top: focusPoint.y - 32 }}
                    >
                        <Focus className="w-16 h-16 text-yellow-400 drop-shadow-lg" />
                    </div>
                )}

                {/* Flash animation */}
                {flashAnim && <div className="absolute inset-0 bg-white/80 pointer-events-none transition-opacity duration-150" />}

                {/* Countdown */}
                {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/30">
                        <span className="text-9xl font-black text-white drop-shadow-2xl" style={{ animation: 'pulse 1s ease-in-out' }}>
                            {countdown}
                        </span>
                    </div>
                )}

                {/* Burst indicator */}
                {isBursting && (
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-red-500/80 text-white text-xs font-semibold animate-pulse">
                        ● BURST — {captureCount} fotos
                    </div>
                )}

                {/* Zoom level badge */}
                {zoomSupported && zoom > minZoom && (
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[10px] font-medium">
                        {zoom.toFixed(1)}x
                    </div>
                )}
            </div>

            {/* ──── Zoom slider ──── */}
            {zoomSupported && maxZoom > minZoom && (
                <div className="flex items-center gap-3 px-6 py-1.5 bg-gray-900/90">
                    <ZoomOut className="h-3.5 w-3.5 text-gray-500" />
                    <input
                        type="range"
                        min={minZoom}
                        max={maxZoom}
                        step={0.1}
                        value={zoom}
                        onChange={e => applyZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-sky-500 h-1"
                    />
                    <ZoomIn className="h-3.5 w-3.5 text-gray-500" />
                </div>
            )}

            {/* ──── Bottom controls ──── */}
            <div className="flex items-center justify-between px-5 py-4 bg-gray-900/90 backdrop-blur-sm">
                {/* Gallery button / last photo */}
                <button type="button" onClick={() => { if (previews.length > 0) { setGalleryIdx(previews.length - 1); setShowGallery(true); } }} className="w-14 h-14 flex items-center justify-center">
                    {previews.length > 0 ? (
                        <div className="relative">
                            <img src={previews[previews.length - 1]} alt="Última" className="w-14 h-14 rounded-xl object-cover border-2 border-gray-500 shadow-lg" />
                            {previews.length > 1 && (
                                <span className="absolute -top-1.5 -right-1.5 bg-sky-500 text-white text-[9px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center px-1 shadow">
                                    {previews.length}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div className="w-14 h-14 rounded-xl border-2 border-gray-700 flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-gray-600" />
                        </div>
                    )}
                </button>

                {/* Shutter button */}
                <button
                    type="button"
                    onClick={handleCapture}
                    onMouseDown={e => { if (e.button === 0 && timerSeconds === 0) startBurst(); }}
                    onMouseUp={stopBurst}
                    onMouseLeave={stopBurst}
                    onTouchStart={() => { if (timerSeconds === 0) startBurst(); }}
                    onTouchEnd={stopBurst}
                    disabled={countdown !== null}
                    className={`w-20 h-20 rounded-full border-[5px] p-1 transition-all disabled:opacity-50 ${isBursting
                        ? 'border-red-500 bg-red-500/20 scale-110'
                        : 'border-white bg-white/10 hover:scale-105 active:scale-95'
                        }`}
                    title="Capturar foto (manter para burst)"
                >
                    <div className={`w-full h-full rounded-full transition-colors ${isBursting ? 'bg-red-500' : 'bg-white hover:bg-gray-100'
                        }`} />
                </button>

                {/* Done button */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center gap-1.5 px-4 py-3 rounded-xl bg-sky-500 text-white text-sm font-semibold hover:bg-sky-600 transition-colors shadow-lg"
                >
                    <Check className="h-4 w-4" />
                    <span>Concluir{captureCount > 0 && ` (${captureCount})`}</span>
                </button>
            </div>
        </div>
    );
}

// ──── Small toolbar button ────
function ToolBtn({ children, onClick, active, activeColor, title }: {
    children: React.ReactNode;
    onClick: () => void;
    active?: boolean;
    activeColor?: string;
    title: string;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={`p-1.5 rounded-full transition-colors ${active ? (activeColor ?? 'bg-sky-500') + ' text-white' : 'text-gray-400 hover:text-white'
                }`}
            title={title}
        >
            {children}
        </button>
    );
}
