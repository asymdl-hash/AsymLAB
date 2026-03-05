'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import {
    ChevronDown,
    Palette,
    ScanLine,
    Camera,
    FileImage,
    Box,
    Layers,
    ClipboardList,
    FileText,
    FolderOpen,
} from 'lucide-react';

interface InfoTecnicaBlockProps {
    plan: {
        id: string;
        nome: string;
        work_type?: { id: string; nome: string; cor: string | null } | null;
        metodo_producao?: string | null;
    } | null;
    phase: {
        id: string;
        nome: string;
        ordem: number;
    } | null;
}

// ── Campos da Info Técnica (layout visual — dados placeholder por agora) ──
const INFO_FIELDS = [
    { key: 'work_type', label: 'Tipo de Trabalho', icon: Layers, hasFile: false },
    { key: 'metodo_producao', label: 'Método de Produção', icon: Box, hasFile: false },
    { key: 'escala_cor', label: 'Escala de Cor', icon: Palette, hasFile: true },
    { key: 'cbct', label: 'CBCT', icon: ScanLine, hasFile: true },
    { key: 'fotos', label: 'Fotos', icon: Camera, hasFile: true },
    { key: 'stls', label: 'STLs', icon: FileImage, hasFile: true },
    { key: 'orto_periapical', label: 'Orto-Periapical', icon: FileText, hasFile: true },
    { key: 'consideracoes_plano', label: 'Considerações Plano', icon: ClipboardList, hasFile: false },
];

export default function InfoTecnicaBlock({ plan, phase }: InfoTecnicaBlockProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!plan) {
        return (
            <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 mb-2">
                <div className="bg-white rounded-lg border border-gray-200 p-4">
                    <div className="text-center text-gray-400 text-sm py-3">
                        <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-40" />
                        <p>Seleccione um plano para ver a informação técnica</p>
                    </div>
                </div>
            </div>
        );
    }

    const planColor = plan.work_type?.cor || '#6b7280';

    return (
        <div className="max-w-6xl mx-auto w-full px-4 sm:px-6 mb-2">
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                {/* Header colapsável */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-gray-50 transition-colors"
                >
                    <div className="flex items-center gap-2">
                        <div
                            className="h-1.5 w-1.5 rounded-full"
                            style={{ backgroundColor: planColor }}
                        />
                        <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
                            Informação Técnica
                        </span>
                        {phase && (
                            <span className="text-[10px] text-gray-400 ml-1">
                                · Fase {phase.ordem}: {phase.nome}
                            </span>
                        )}
                    </div>
                    <ChevronDown className={cn(
                        "h-3.5 w-3.5 text-gray-400 transition-transform duration-200",
                        isCollapsed && "-rotate-90"
                    )} />
                </button>

                {/* Conteúdo */}
                {!isCollapsed && (
                    <div className="px-4 pb-4 pt-1">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {INFO_FIELDS.map(field => {
                                const Icon = field.icon;
                                // Dados placeholder — serão ligados ao Supabase depois
                                let value: string | null = null;
                                if (field.key === 'work_type') {
                                    value = plan.work_type?.nome || null;
                                } else if (field.key === 'metodo_producao') {
                                    value = plan.metodo_producao || null;
                                }

                                return (
                                    <div
                                        key={field.key}
                                        className={cn(
                                            "rounded-lg border p-3 transition-colors",
                                            value
                                                ? "border-gray-200 bg-gray-50"
                                                : "border-dashed border-gray-200 bg-white"
                                        )}
                                    >
                                        <div className="flex items-center gap-2 mb-1.5">
                                            <Icon className="h-3.5 w-3.5 text-gray-400" />
                                            <span className="text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                                                {field.label}
                                            </span>
                                        </div>

                                        {value ? (
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-700 truncate">
                                                    {value}
                                                </span>
                                                {field.hasFile && (
                                                    <button className="text-gray-400 hover:text-amber-500 transition-colors" title="Abrir pasta NAS">
                                                        <FolderOpen className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="text-xs text-gray-400 italic">
                                                {field.hasFile ? (
                                                    <button className="flex items-center gap-1 text-amber-500 hover:text-amber-600 font-medium transition-colors">
                                                        + Anexar
                                                    </button>
                                                ) : (
                                                    <span>Não definido</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
