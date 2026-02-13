
import React from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
}

export function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    variant = 'default'
}: ConfirmModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Dialog Content */}
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md p-6 border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                        <p className="text-sm text-gray-500">
                            {description}
                        </p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={onClose}>
                            {cancelText}
                        </Button>
                        <Button
                            variant={variant as any} // Cast because variant names match button variants
                            onClick={() => {
                                onConfirm();
                                onClose();
                            }}
                            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
                        >
                            {confirmText}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
