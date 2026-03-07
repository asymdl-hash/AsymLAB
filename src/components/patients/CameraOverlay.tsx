'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
    X,
    Camera,
    SwitchCamera,
    Grid3X3,
    Flashlight,
    ZoomIn,
    ZoomOut,
    Timer,
    Check,
    Image as ImageIcon,
} from 'lucide-react';

interface CameraOverlayProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export default function CameraOverlay({ onCapture, onClose }: CameraOverlayProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
    const [zoom, setZoom] = useState(1);
    const [minZoom, setMinZoom] = useState(1);
    const [maxZoom, setMaxZoom] = useState(1);
    const [zoomSupported, setZoomSupported] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [torchSupported, setTorchSupported] = useState(false);
    const [showGrid, setShowGrid] = useState(false);
    const [captureCount, setCaptureCount] = useState(0);
    const [lastPreview, setLastPreview] = useState<string | null>(null);
    const [flashAnim, setFlashAnim] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const [timerEnabled, setTimerEnabled] = useState(false);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);

    // Start camera
    const startCamera = useCallback(async (facing: 'user' | 'environment') => {
        // Stop existing
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: facing,
                    width: { ideal: 1920 },
                    height: { ideal: 1440 },
                },
            });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }

            // Check capabilities (zoom, torch)
            const track = stream.getVideoTracks()[0];
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const caps = track.getCapabilities() as any;
            if (caps.zoom) {
                setZoomSupported(true);
                setMinZoom(caps.zoom.min ?? 1);
                setMaxZoom(caps.zoom.max ?? 1);
                setZoom(caps.zoom.min ?? 1);
            } else {
                setZoomSupported(false);
                setMinZoom(1);
                setMaxZoom(1);
                setZoom(1);
            }
            if (caps.torch !== undefined) {
                setTorchSupported(true);
                setTorchOn(false);
            } else {
                setTorchSupported(false);
            }
        } catch {
            alert('Não foi possível aceder à câmara. Verifique as permissões.');
            onClose();
        }
    }, [onClose]);

    useEffect(() => {
        startCamera(facingMode);
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(t => t.stop());
            }
            if (countdownRef.current) clearInterval(countdownRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Apply zoom
    const applyZoom = useCallback(async (value: number) => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (track as any).applyConstraints({ advanced: [{ zoom: value }] });
            setZoom(value);
        } catch { /* zoom not supported */ }
    }, []);

    // Toggle torch
    const toggleTorch = useCallback(async () => {
        const track = streamRef.current?.getVideoTracks()[0];
        if (!track) return;
        const next = !torchOn;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (track as any).applyConstraints({ advanced: [{ torch: next }] });
            setTorchOn(next);
        } catch { /* torch not supported */ }
    }, [torchOn]);

    // Switch camera
    const switchCamera = useCallback(() => {
        const next = facingMode === 'user' ? 'environment' : 'user';
        setFacingMode(next);
        startCamera(next);
    }, [facingMode, startCamera]);

    // Capture
    const doCapture = useCallback(() => {
        const video = videoRef.current;
        if (!video) return;

        // Flash animation
        setFlashAnim(true);
        setTimeout(() => setFlashAnim(false), 200);

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // If front camera, mirror the capture
        if (facingMode === 'user') {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0);

        canvas.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' });
            onCapture(file);
            setCaptureCount(prev => prev + 1);
            setLastPreview(URL.createObjectURL(file));
        }, 'image/jpeg', 0.92);
    }, [facingMode, onCapture]);

    // Trigger capture (with optional countdown)
    const handleCapture = useCallback(() => {
        if (timerEnabled) {
            setCountdown(3);
            let count = 3;
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
    }, [timerEnabled, doCapture]);

    // Cleanup
    const handleClose = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop());
            streamRef.current = null;
        }
        if (countdownRef.current) clearInterval(countdownRef.current);
        onClose();
    }, [onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Header toolbar */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-900/90 backdrop-blur-sm">
                <button type="button" onClick={handleClose} className="text-white hover:text-gray-300 transition-colors">
                    <X className="h-6 w-6" />
                </button>
                <div className="flex items-center gap-3">
                    {/* Grid */}
                    <button
                        type="button"
                        onClick={() => setShowGrid(!showGrid)}
                        className={`p-2 rounded-full transition-colors ${showGrid ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Grelha de composição"
                    >
                        <Grid3X3 className="h-5 w-5" />
                    </button>
                    {/* Timer */}
                    <button
                        type="button"
                        onClick={() => setTimerEnabled(!timerEnabled)}
                        className={`p-2 rounded-full transition-colors ${timerEnabled ? 'bg-sky-500 text-white' : 'text-gray-400 hover:text-white'}`}
                        title="Temporizador 3s"
                    >
                        <Timer className="h-5 w-5" />
                    </button>
                    {/* Torch */}
                    {torchSupported && (
                        <button
                            type="button"
                            onClick={toggleTorch}
                            className={`p-2 rounded-full transition-colors ${torchOn ? 'bg-yellow-500 text-white' : 'text-gray-400 hover:text-white'}`}
                            title="Flash"
                        >
                            <Flashlight className="h-5 w-5" />
                        </button>
                    )}
                    {/* Switch camera */}
                    <button
                        type="button"
                        onClick={switchCamera}
                        className="p-2 rounded-full text-gray-400 hover:text-white transition-colors"
                        title="Trocar câmara (frente/trás)"
                    >
                        <SwitchCamera className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Video area */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden bg-black">
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="max-w-full max-h-full object-contain"
                    style={{
                        transform: facingMode === 'user' ? 'scaleX(-1)' : undefined,
                    }}
                />

                {/* Grid overlay */}
                {showGrid && (
                    <div className="absolute inset-0 pointer-events-none">
                        {/* Vertical lines */}
                        <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                        <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                        {/* Horizontal lines */}
                        <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                        <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
                        {/* Center crosshair */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <div className="w-6 h-px bg-white/50" />
                            <div className="w-px h-6 bg-white/50 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                        </div>
                    </div>
                )}

                {/* Flash animation */}
                {flashAnim && (
                    <div className="absolute inset-0 bg-white/70 animate-pulse pointer-events-none" />
                )}

                {/* Countdown */}
                {countdown !== null && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-8xl font-bold text-white drop-shadow-2xl animate-pulse">
                            {countdown}
                        </span>
                    </div>
                )}
            </div>

            {/* Zoom slider */}
            {zoomSupported && maxZoom > minZoom && (
                <div className="flex items-center gap-3 px-8 py-2 bg-gray-900/90">
                    <ZoomOut className="h-4 w-4 text-gray-400" />
                    <input
                        type="range"
                        min={minZoom}
                        max={maxZoom}
                        step={0.1}
                        value={zoom}
                        onChange={e => applyZoom(parseFloat(e.target.value))}
                        className="flex-1 accent-sky-500 h-1"
                    />
                    <ZoomIn className="h-4 w-4 text-gray-400" />
                    <span className="text-xs text-gray-400 w-10 text-right">{zoom.toFixed(1)}x</span>
                </div>
            )}

            {/* Bottom controls */}
            <div className="flex items-center justify-between px-6 py-5 bg-gray-900/90 backdrop-blur-sm">
                {/* Last photo thumbnail */}
                <div className="w-12 h-12 flex items-center justify-center">
                    {lastPreview ? (
                        <div className="relative">
                            <img src={lastPreview} alt="Última captura" className="w-12 h-12 rounded-lg object-cover border-2 border-gray-600" />
                            {captureCount > 1 && (
                                <span className="absolute -top-1 -right-1 bg-sky-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                                    {captureCount}
                                </span>
                            )}
                        </div>
                    ) : (
                        <ImageIcon className="h-6 w-6 text-gray-600" />
                    )}
                </div>

                {/* Shutter button */}
                <button
                    type="button"
                    onClick={handleCapture}
                    disabled={countdown !== null}
                    className="w-18 h-18 rounded-full bg-white/10 border-4 border-white p-1 hover:scale-105 active:scale-95 transition-transform disabled:opacity-50"
                    title="Capturar foto"
                >
                    <div className="w-14 h-14 rounded-full bg-white hover:bg-gray-100 transition-colors" />
                </button>

                {/* Done button */}
                <button
                    type="button"
                    onClick={handleClose}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-500 text-white text-sm font-medium hover:bg-sky-600 transition-colors"
                >
                    <Check className="h-4 w-4" />
                    <span>Concluir{captureCount > 0 && ` (${captureCount})`}</span>
                </button>
            </div>
        </div>
    );
}
