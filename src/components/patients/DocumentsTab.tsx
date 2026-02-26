'use client';

import { useState } from 'react';
import {
    FileText,
    Receipt,
    FileCheck,
    FilePlus,
    Loader2,
    ExternalLink,
    Clock,
} from 'lucide-react';

interface DocumentsTabProps {
    patientId: string;
}

// Categories of documents — placeholder for future billing/receipts integration
const DOC_CATEGORIES = [
    { key: 'facturas', label: 'Facturas', icon: Receipt, color: 'text-emerald-400', bg: 'bg-emerald-500/15' },
    { key: 'recibos', label: 'Recibos', icon: FileCheck, color: 'text-blue-400', bg: 'bg-blue-500/15' },
    { key: 'documentos', label: 'Documentos', icon: FileText, color: 'text-purple-400', bg: 'bg-purple-500/15' },
];

export default function DocumentsTab({ patientId }: DocumentsTabProps) {
    const [activeCategory, setActiveCategory] = useState('facturas');

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    Documentação
                </h3>
            </div>

            {/* Categorias */}
            <div className="flex gap-2">
                {DOC_CATEGORIES.map((cat) => {
                    const Icon = cat.icon;
                    return (
                        <button
                            key={cat.key}
                            onClick={() => setActiveCategory(cat.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all border ${activeCategory === cat.key
                                    ? `${cat.bg} ${cat.color} border-current`
                                    : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:text-gray-400 hover:border-gray-600'
                                }`}
                        >
                            <Icon className="h-3.5 w-3.5" />
                            {cat.label}
                        </button>
                    );
                })}
            </div>

            {/* Content area — placeholder */}
            <div className="rounded-xl border border-gray-700/50 bg-gray-800/30 p-8">
                <div className="text-center py-8">
                    {activeCategory === 'facturas' && (
                        <>
                            <Receipt className="h-12 w-12 mx-auto mb-4 text-emerald-500/30" />
                            <p className="text-sm text-gray-400 font-medium">Sem facturas</p>
                            <p className="text-xs text-gray-600 mt-1">
                                As facturas serão integradas com o módulo de Faturação
                            </p>
                        </>
                    )}
                    {activeCategory === 'recibos' && (
                        <>
                            <FileCheck className="h-12 w-12 mx-auto mb-4 text-blue-500/30" />
                            <p className="text-sm text-gray-400 font-medium">Sem recibos</p>
                            <p className="text-xs text-gray-600 mt-1">
                                Os recibos aparecerão automaticamente após pagamentos
                            </p>
                        </>
                    )}
                    {activeCategory === 'documentos' && (
                        <>
                            <FileText className="h-12 w-12 mx-auto mb-4 text-purple-500/30" />
                            <p className="text-sm text-gray-400 font-medium">Sem documentos</p>
                            <p className="text-xs text-gray-600 mt-1 mb-4">
                                Guias de transporte, declarações e outros documentos
                            </p>
                            <button
                                disabled
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-medium opacity-50 cursor-not-allowed"
                            >
                                <FilePlus className="h-3.5 w-3.5" />
                                Adicionar Documento
                                <span className="text-[9px] bg-purple-500/20 rounded px-1.5 py-0.5 ml-1">Em breve</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            {/* Future integration hint */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-800/50 border border-gray-700/30">
                <Clock className="h-3.5 w-3.5 text-gray-600 flex-shrink-0" />
                <p className="text-[10px] text-gray-600">
                    Esta secção será automaticamente populada quando os módulos de Faturação e Guias de Transporte estiverem activos.
                </p>
            </div>
        </div>
    );
}
