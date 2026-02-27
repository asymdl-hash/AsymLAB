'use client';

import { useState, useEffect } from 'react';
import { Search, Star, Clock, ChevronRight, Plus, Layout } from 'lucide-react';
import { considerationsService, ConsiderationTemplate } from '@/services/considerationsService';

interface TemplatePickerProps {
    tipo: 'medico' | 'lab' | 'lab_inside';
    onSelect: (template: ConsiderationTemplate) => void;
    onSkip: () => void;
    tipoTrabalhoId?: string;
    phaseId?: string;
}

export default function TemplatePicker({ tipo, onSelect, onSkip, tipoTrabalhoId, phaseId }: TemplatePickerProps) {
    const [templates, setTemplates] = useState<ConsiderationTemplate[]>([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const data = await considerationsService.getTemplates(tipo);
                setTemplates(data);
            } catch (err) {
                console.error('Error loading templates:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, [tipo]);

    const filtered = templates.filter(t =>
        t.titulo.toLowerCase().includes(search.toLowerCase()) ||
        (t.fields || []).some(f => f.subtitulo.toLowerCase().includes(search.toLowerCase()))
    );

    // Separar defaults e pessoais
    const defaults = filtered.filter(t => t.is_default);
    const personal = filtered.filter(t => !t.is_default);

    const TIPO_COLORS = {
        medico: { bg: 'bg-orange-500/10', border: 'border-orange-500/30', text: 'text-orange-400' },
        lab: { bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400' },
        lab_inside: { bg: 'bg-purple-500/10', border: 'border-purple-500/30', text: 'text-purple-400' },
    };

    const colors = TIPO_COLORS[tipo];

    return (
        <div className="space-y-3">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-card-foreground/80 flex items-center gap-2">
                    <Layout className="h-4 w-4 text-gray-500" />
                    Escolher Template
                </h4>
                <button
                    onClick={onSkip}
                    className="text-xs text-gray-500 hover:text-card-foreground/80 transition-colors"
                >
                    Sem template →
                </button>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
                <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Pesquisar templates..."
                    className="w-full pl-9 pr-3 py-2 text-sm bg-muted/50 border border-border/50 rounded-lg text-card-foreground/80 placeholder:text-muted-foreground focus:outline-none focus:border-gray-600"
                />
            </div>

            {loading ? (
                <div className="text-center py-8 text-gray-500 text-sm">A carregar...</div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-8">
                    <Layout className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-gray-500">Nenhum template encontrado</p>
                    <button
                        onClick={onSkip}
                        className="mt-2 text-xs text-amber-400 hover:text-amber-300"
                    >
                        Escrever sem template
                    </button>
                </div>
            ) : (
                <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {/* Defaults */}
                    {defaults.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                                <Star className="h-3 w-3" /> Predefinidos
                            </p>
                            {defaults.map(t => (
                                <TemplateCard key={t.id} template={t} colors={colors} onClick={() => onSelect(t)} />
                            ))}
                        </div>
                    )}

                    {/* Pessoais */}
                    {personal.length > 0 && (
                        <div>
                            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
                                <Clock className="h-3 w-3" /> Os meus templates
                            </p>
                            {personal.map(t => (
                                <TemplateCard key={t.id} template={t} colors={colors} onClick={() => onSelect(t)} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TemplateCard({ template, colors, onClick }: {
    template: ConsiderationTemplate;
    colors: { bg: string; border: string; text: string };
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-lg border ${colors.border} ${colors.bg} hover:brightness-110 transition-all group mb-1.5`}
        >
            <div className="flex items-center justify-between">
                <span className={`text-sm font-medium ${colors.text}`}>{template.titulo}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-muted-foreground transition-colors" />
            </div>
            {template.fields && template.fields.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {template.fields.slice(0, 5).map((f, i) => (
                        <span key={i} className="text-[10px] bg-gray-800/60 text-muted-foreground rounded px-1.5 py-0.5">
                            {f.subtitulo}
                        </span>
                    ))}
                    {template.fields.length > 5 && (
                        <span className="text-[10px] text-muted-foreground">+{template.fields.length - 5}</span>
                    )}
                </div>
            )}
        </button>
    );
}
