'use client';

import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DeleteConfirmModalProps {
    patientName: string;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function DeleteConfirmModal({ patientName, onConfirm, onCancel }: DeleteConfirmModalProps) {
    const [confirmText, setConfirmText] = useState('');
    const [deleting, setDeleting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    const isConfirmed = confirmText.toUpperCase() === 'ELIMINAR';

    // Focus no input ao abrir
    useEffect(() => {
        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, []);

    // Fechar com Escape
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onCancel();
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [onCancel]);

    const handleConfirm = async () => {
        if (!isConfirmed || deleting) return;
        setDeleting(true);
        onConfirm();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onCancel}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header vermelho */}
                <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center">
                                <AlertTriangle className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-white font-semibold text-lg">Eliminar Paciente</h3>
                                <p className="text-red-100 text-xs">Esta acção não pode ser desfeita</p>
                            </div>
                        </div>
                        <button
                            onClick={onCancel}
                            className="text-white/70 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="px-6 py-5 space-y-4">
                    <p className="text-sm text-gray-600">
                        Está prestes a eliminar o paciente <strong className="text-gray-900">{patientName}</strong>.
                        Todos os planos de tratamento, fases, agendamentos, ficheiros e considerações
                        associados serão arquivados.
                    </p>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <p className="text-xs text-amber-800 font-medium flex items-center gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            Para confirmar, escreva <span className="font-bold text-amber-900">ELIMINAR</span> no campo abaixo
                        </p>
                    </div>

                    <input
                        ref={inputRef}
                        type="text"
                        value={confirmText}
                        onChange={(e) => setConfirmText(e.target.value)}
                        placeholder="Escreva ELIMINAR"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-sm font-mono
                            focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100
                            transition-all placeholder:text-gray-300"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && isConfirmed) handleConfirm();
                        }}
                        disabled={deleting}
                    />
                </div>

                {/* Footer */}
                <div className="px-6 pb-5 flex gap-3">
                    <Button
                        variant="outline"
                        className="flex-1 h-11 rounded-xl"
                        onClick={onCancel}
                        disabled={deleting}
                    >
                        Cancelar
                    </Button>
                    <Button
                        className="flex-1 h-11 rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                        onClick={handleConfirm}
                        disabled={!isConfirmed || deleting}
                    >
                        {deleting ? (
                            <span className="flex items-center gap-2">
                                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Eliminando...
                            </span>
                        ) : (
                            'Confirmar Eliminação'
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}
