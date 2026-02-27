'use client';

import { useState, useEffect } from 'react';
import { History, Clock, User, ChevronDown, ChevronRight, ArrowRight } from 'lucide-react';
import { considerationsService, ConsiderationField, ConsiderationVersion } from '@/services/considerationsService';

interface VersionHistoryProps {
    considerationId: string;
    currentFields: ConsiderationField[];
    currentConteudo: string;
    currentVersion: number;
    onClose: () => void;
}

export default function VersionHistory({
    considerationId,
    currentFields,
    currentConteudo,
    currentVersion,
    onClose,
}: VersionHistoryProps) {
    const [versions, setVersions] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedVersion, setExpandedVersion] = useState<number | null>(null);

    useEffect(() => {
        (async () => {
            try {
                const data = await considerationsService.getVersions(considerationId);
                setVersions(data);
            } catch (err) {
                console.error('Error loading versions:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [considerationId]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-gray-900 border border-gray-700/50 rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                    <h3 className="text-sm font-semibold text-gray-300 flex items-center gap-2">
                        <History className="h-4 w-4 text-amber-400" />
                        Histórico de Versões
                        <span className="text-[10px] bg-gray-700 text-gray-400 rounded-full px-2 py-0.5">
                            v{currentVersion}
                        </span>
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-300 text-xs">
                        Fechar ✕
                    </button>
                </div>

                {/* Content */}
                <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2">
                    {/* Current version */}
                    <VersionCard
                        label={`v${currentVersion} (actual)`}
                        fields={currentFields}
                        conteudo={currentConteudo}
                        editorName="Versão actual"
                        editedAt=""
                        isExpanded={expandedVersion === currentVersion}
                        onToggle={() => setExpandedVersion(expandedVersion === currentVersion ? null : currentVersion)}
                        isCurrent
                    />

                    {loading ? (
                        <div className="text-center py-6 text-gray-500 text-sm">A carregar...</div>
                    ) : versions.length === 0 ? (
                        <div className="text-center py-6 text-gray-600 text-sm">
                            Sem versões anteriores
                        </div>
                    ) : (
                        versions.map(v => (
                            <VersionCard
                                key={v.id}
                                label={`v${v.version_number}`}
                                fields={v.fields_snapshot || []}
                                conteudo={v.conteudo_snapshot}
                                editorName={v.editor?.full_name || 'Desconhecido'}
                                editedAt={v.edited_at}
                                isExpanded={expandedVersion === v.version_number}
                                onToggle={() => setExpandedVersion(expandedVersion === v.version_number ? null : v.version_number)}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

function VersionCard({ label, fields, conteudo, editorName, editedAt, isExpanded, onToggle, isCurrent }: {
    label: string;
    fields: ConsiderationField[];
    conteudo: string | null;
    editorName: string;
    editedAt: string;
    isExpanded: boolean;
    onToggle: () => void;
    isCurrent?: boolean;
}) {
    return (
        <div className={`border rounded-lg overflow-hidden ${isCurrent ? 'border-amber-500/30 bg-amber-500/5' : 'border-gray-700/50 bg-gray-800/30'}`}>
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:brightness-110 transition-all"
            >
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                <span className={`text-xs font-medium ${isCurrent ? 'text-amber-400' : 'text-gray-400'}`}>{label}</span>
                <span className="text-[10px] text-gray-600 flex items-center gap-1 ml-auto">
                    <User className="h-3 w-3" />
                    {editorName}
                    {editedAt && (
                        <>
                            <Clock className="h-3 w-3 ml-2" />
                            {new Date(editedAt).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </>
                    )}
                </span>
            </button>

            {isExpanded && (
                <div className="px-3 pb-3 border-t border-gray-700/30 space-y-2 mt-0">
                    {fields.length > 0 && fields.map((f, i) => (
                        <div key={i} className="mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">{f.subtitulo}</span>
                            <p className="text-sm text-gray-300 mt-0.5">{f.descricao || <span className="italic text-gray-600">Vazio</span>}</p>
                        </div>
                    ))}
                    {conteudo && (
                        <div className="mt-2">
                            <span className="text-[10px] uppercase tracking-wider text-gray-500">Texto</span>
                            <p className="text-sm text-gray-300 mt-0.5 whitespace-pre-wrap">{conteudo}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
