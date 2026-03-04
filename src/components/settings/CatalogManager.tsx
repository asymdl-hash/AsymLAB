'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    Database,
    Plus,
    Edit3,
    Trash2,
    Save,
    X,
    Loader2,
    Search,
    Briefcase,
    Palette,
    FileText,
    Activity,
    ChevronRight,
    ToggleLeft,
    ToggleRight,
    AlertCircle,
    Building2,
    Tag,
    Factory,
    Globe,
    Phone,
    MapPin,
    ExternalLink,
    Clock,
    Package,
    Settings,
} from 'lucide-react';
import { catalogService } from '@/services/catalogService';
import { considerationsService } from '@/services/considerationsService';
import { settingsService, QueueWaitThresholds, BADGE_COLOR_OPTIONS, getBadgeClasses } from '@/services/settingsService';

// ===== SUB-TAB CONFIG =====
type CatalogTab = 'work_types' | 'materials' | 'tooth_colors' | 'templates' | 'statuses' | 'suppliers' | 'brands' | 'production_phases' | 'general';

const CATALOG_TABS: { id: CatalogTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'work_types', label: 'Tipos de Trabalho', icon: Briefcase, description: 'Prótese fixa, removível, implantes, etc.' },
    { id: 'materials', label: 'Materiais', icon: Database, description: 'Zircónia, PMMA, dissilicato, etc.' },
    { id: 'tooth_colors', label: 'Cores de Dentes', icon: Palette, description: 'Escala VITA, cores personalizadas' },
    { id: 'templates', label: 'Templates Considerações', icon: FileText, description: 'Templates predefinidos para considerações' },
    { id: 'statuses', label: 'Status Trabalhos', icon: Activity, description: 'Os 33 estados do fluxo de trabalho' },
    { id: 'suppliers', label: 'Fornecedores', icon: Building2, description: 'Gestão de fornecedores com contactos, NIF e morada' },
    { id: 'brands', label: 'Marcas', icon: Tag, description: 'Catálogo de marcas dentárias' },
    { id: 'production_phases', label: 'Fases de Produção', icon: Factory, description: 'Fases do processo produtivo laboratorial' },
    { id: 'general', label: 'Definições Gerais', icon: Settings, description: 'Parâmetros globais da aplicação (thresholds, limites, etc.)' },
];

// ===== MAIN COMPONENT =====
export default function CatalogManager() {
    const [activeTab, setActiveTab] = useState<CatalogTab>('work_types');

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex flex-wrap gap-2">
                {CATALOG_TABS.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg border transition-all ${isActive
                                ? 'bg-primary/10 text-primary border-primary/30 font-medium'
                                : 'bg-muted text-muted-foreground border-border hover:border-muted-foreground hover:text-card-foreground'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground">
                {CATALOG_TABS.find(t => t.id === activeTab)?.description}
            </p>

            {/* Content */}
            {activeTab === 'work_types' && <WorkTypesManager />}
            {activeTab === 'materials' && <MaterialsManager />}
            {activeTab === 'tooth_colors' && <ToothColorsManager />}
            {activeTab === 'templates' && <TemplatesManager />}
            {activeTab === 'statuses' && <StatusesManager />}
            {activeTab === 'suppliers' && <SuppliersManager />}
            {activeTab === 'brands' && <BrandsManager />}
            {activeTab === 'production_phases' && <ProductionPhasesManager />}
            {activeTab === 'general' && <GeneralSettingsManager />}

        </div>
    );
}

// =====================================================
// WORK TYPES MANAGER (com Tabela Custos de Produção)
// =====================================================
const CUSTO_HORA_DEFAULT = 15; // €/h — será parametrizável nas Definições

interface PhaseMaterial {
    material_id: string;
    tempo: number;
    qtd_usada: number;
    unidade_porcao: string;
    custo_porcao: number;
    custo_material: number;
}
interface PhaseEntry {
    phase_id: string;
    materials: PhaseMaterial[];
}

function WorkTypesManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ nome: '', cor: '#6366f1', categoria: 'geral' });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    // Modal ficha
    const [selectedItem, setSelectedItem] = useState<any | null>(null);
    const [fichaForm, setFichaForm] = useState<any>({});
    // Dados auxiliares
    const [allMaterials, setAllMaterials] = useState<any[]>([]);
    const [allPhases, setAllPhases] = useState<any[]>([]);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const [wt, mats, phases] = await Promise.all([
                catalogService.getWorkTypes(),
                catalogService.getMaterials(),
                catalogService.getProductionPhases(),
            ]);
            setItems(wt);
            setAllMaterials(mats);
            setAllPhases(phases);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.nome.trim()) return;
        try {
            setSaving(true);
            await catalogService.createWorkType(addForm);
            setAddForm({ nome: '', cor: '#6366f1', categoria: 'geral' });
            setShowAdd(false);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleDelete = async (id: string) => {
        try { await catalogService.deleteWorkType(id); setDeleteConfirm(null); load(); }
        catch (e) { console.error(e); }
    };

    const toggleActive = async (item: any) => {
        await catalogService.updateWorkType(item.id, { activo: !item.activo });
        load();
    };

    const openFicha = (item: any) => {
        setSelectedItem(item);
        // Migrate old format: if fases_producao is string[] or empty, convert to PhaseEntry[]
        let phases: PhaseEntry[] = [];
        if (Array.isArray(item.fases_producao)) {
            if (item.fases_producao.length > 0 && typeof item.fases_producao[0] === 'string') {
                // Old format: convert string IDs to PhaseEntry objects
                phases = item.fases_producao.map((pid: string) => ({ phase_id: pid, materials: [] }));
            } else {
                phases = item.fases_producao as PhaseEntry[];
            }
        }
        setFichaForm({
            ...item,
            fases_producao: phases,
        });
    };

    const saveFicha = async () => {
        if (!selectedItem) return;
        try {
            setSaving(true);
            await catalogService.updateWorkType(selectedItem.id, {
                nome: fichaForm.nome,
                cor: fichaForm.cor,
                categoria: fichaForm.categoria,
                codigo: fichaForm.codigo || null,
                preco: parseFloat(fichaForm.preco) || 0,
                iva_percent: parseFloat(fichaForm.iva_percent) || 0,
                fases_producao: fichaForm.fases_producao || [],
                tempo_estimado: totalTempoMin,
                notas_producao: fichaForm.notas_producao || null,
            });
            setSelectedItem(null);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    // ---- Phase/Material management ----
    const addPhaseToFicha = (phaseId: string) => {
        const current: PhaseEntry[] = fichaForm.fases_producao || [];
        if (current.some((p: PhaseEntry) => p.phase_id === phaseId)) return;
        setFichaForm({ ...fichaForm, fases_producao: [...current, { phase_id: phaseId, materials: [] }] });
    };

    const removePhaseFromFicha = (phaseId: string) => {
        const current: PhaseEntry[] = fichaForm.fases_producao || [];
        setFichaForm({ ...fichaForm, fases_producao: current.filter((p: PhaseEntry) => p.phase_id !== phaseId) });
    };

    const addMaterialToPhase = (phaseId: string) => {
        const current: PhaseEntry[] = fichaForm.fases_producao || [];
        setFichaForm({
            ...fichaForm,
            fases_producao: current.map((p: PhaseEntry) =>
                p.phase_id === phaseId
                    ? { ...p, materials: [...p.materials, { material_id: '', tempo: 0, qtd_usada: 1, unidade_porcao: 'un', custo_porcao: 0, custo_material: 0 }] }
                    : p
            ),
        });
    };

    const removeMaterialFromPhase = (phaseId: string, matIdx: number) => {
        const current: PhaseEntry[] = fichaForm.fases_producao || [];
        setFichaForm({
            ...fichaForm,
            fases_producao: current.map((p: PhaseEntry) =>
                p.phase_id === phaseId
                    ? { ...p, materials: p.materials.filter((_: PhaseMaterial, i: number) => i !== matIdx) }
                    : p
            ),
        });
    };

    const updateMaterialInPhase = (phaseId: string, matIdx: number, field: keyof PhaseMaterial, value: any) => {
        const current: PhaseEntry[] = fichaForm.fases_producao || [];
        setFichaForm({
            ...fichaForm,
            fases_producao: current.map((p: PhaseEntry) =>
                p.phase_id === phaseId
                    ? {
                        ...p,
                        materials: p.materials.map((m: PhaseMaterial, i: number) => {
                            if (i !== matIdx) return m;
                            const updated = { ...m, [field]: value };
                            // When selecting a material, auto-fill custo_porcao and unidade from catalog
                            if (field === 'material_id' && value) {
                                const mat = allMaterials.find((am: any) => am.id === value);
                                if (mat) {
                                    if (mat.preco_pvp) updated.custo_porcao = Number(mat.preco_pvp) || 0;
                                    if (mat.porcao_unidade) updated.unidade_porcao = mat.porcao_unidade;
                                }
                            }
                            // Always recalculate custo_material
                            updated.custo_material = (Number(updated.qtd_usada) || 0) * (Number(updated.custo_porcao) || 0);
                            return updated;
                        }),
                    }
                    : p
            ),
        });
    };

    // ---- KPI Calculations ----
    const phases: PhaseEntry[] = fichaForm.fases_producao || [];
    const custoMateriais = phases.reduce((sum: number, p: PhaseEntry) => sum + p.materials.reduce((s: number, m: PhaseMaterial) => s + (Number(m.custo_material) || 0), 0), 0);
    const totalTempoMin = phases.reduce((sum: number, p: PhaseEntry) => sum + p.materials.reduce((s: number, m: PhaseMaterial) => s + (Number(m.tempo) || 0), 0), 0);
    const custoMaoDeObra = (totalTempoMin / 60) * CUSTO_HORA_DEFAULT;
    const custoGlobal = custoMateriais + custoMaoDeObra;
    const precoVenda = parseFloat(fichaForm.preco) || 0;
    const margem = precoVenda - custoGlobal;
    const margemPercent = precoVenda > 0 ? (margem / precoVenda) * 100 : 0;
    const calcTotal = (preco: number, iva: number) => (preco * (1 + iva / 100)).toFixed(2);

    const filtered = items.filter(i =>
        i.nome.toLowerCase().includes(search.toLowerCase()) ||
        (i.codigo && i.codigo.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <>
            <div className="bg-card border border-border rounded-xl overflow-hidden">
                {/* Toolbar */}
                <div className="flex items-center justify-between p-4 border-b border-border">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Pesquisar por nome ou código..."
                            className="w-full pl-9 pr-3 py-2 text-sm border border-border rounded-lg bg-muted text-card-foreground focus:outline-none focus:border-primary/50"
                        />
                    </div>
                    <button
                        onClick={() => setShowAdd(true)}
                        className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                        Novo Tipo
                    </button>
                </div>

                {/* Add form */}
                {showAdd && (
                    <div className="p-4 bg-muted/50 border-b border-border flex items-center gap-3">
                        <input
                            type="text"
                            value={addForm.nome}
                            onChange={e => setAddForm({ ...addForm, nome: e.target.value })}
                            placeholder="Nome do tipo..."
                            className="flex-1 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 focus:outline-none focus:border-primary/50"
                            autoFocus
                        />
                        <input
                            type="color"
                            value={addForm.cor}
                            onChange={e => setAddForm({ ...addForm, cor: e.target.value })}
                            className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
                        />
                        <select
                            value={addForm.categoria}
                            onChange={e => setAddForm({ ...addForm, categoria: e.target.value })}
                            className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2"
                        >
                            <option value="geral">Geral</option>
                            <option value="fixa">Prótese Fixa</option>
                            <option value="removivel">Prótese Removível</option>
                            <option value="implante">Implante</option>
                            <option value="ortodontia">Ortodontia</option>
                            <option value="ceramica">Cerâmica</option>
                        </select>
                        <button onClick={handleAdd} disabled={saving} className="p-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        </button>
                        <button onClick={() => setShowAdd(false)} className="p-2 text-muted-foreground hover:text-card-foreground/80">
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Table */}
                {loading ? (
                    <div className="text-center py-12 text-muted-foreground"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground text-sm">Sem registos</div>
                ) : (
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                            <tr>
                                <th className="text-left px-4 py-3 w-12">Cor</th>
                                <th className="text-left px-4 py-3 w-24">Código</th>
                                <th className="text-left px-4 py-3">Nome</th>
                                <th className="text-left px-4 py-3">Categoria</th>
                                <th className="text-right px-4 py-3">Preço</th>
                                <th className="text-left px-4 py-3 w-16">Activo</th>
                                <th className="text-right px-4 py-3 w-24">Acções</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.map(item => (
                                <tr key={item.id} className="hover:bg-muted/30 transition-colors group">
                                    <td className="px-4 py-3">
                                        <div className="w-6 h-6 rounded-full border border-border" style={{ backgroundColor: item.cor || '#6366f1' }} />
                                    </td>
                                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.codigo || '—'}</td>
                                    <td className="px-4 py-3">
                                        <button
                                            onClick={() => openFicha(item)}
                                            className="font-medium text-card-foreground hover:text-primary hover:underline underline-offset-2 transition-colors text-left"
                                        >
                                            {item.nome}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground capitalize">{item.categoria || 'geral'}</td>
                                    <td className="px-4 py-3 text-right text-card-foreground">
                                        {Number(item.preco) > 0 ? `${Number(item.preco).toFixed(2)} €` : '—'}
                                    </td>
                                    <td className="px-4 py-3">
                                        <button onClick={() => toggleActive(item)} className="text-muted-foreground hover:text-primary transition-colors">
                                            {item.activo ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openFicha(item)}
                                                className="p-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded transition-colors"
                                                title="Abrir ficha"
                                            >
                                                <Edit3 className="h-3.5 w-3.5" />
                                            </button>
                                            {deleteConfirm === item.id ? (
                                                <>
                                                    <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-destructive/20 text-destructive rounded text-xs">Sim</button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="p-1.5 bg-muted text-muted-foreground rounded text-xs">Não</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Footer */}
                <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                    {filtered.length} registo(s) · {items.filter(i => i.activo).length} activo(s)
                </div>
            </div>

            {/* ===== MODAL FICHA COMPLETA ===== */}
            {selectedItem && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setSelectedItem(null)}>
                    <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto m-4" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center gap-4 p-6 border-b border-border">
                            <div className="w-10 h-10 rounded-full border-2 border-border flex-shrink-0" style={{ backgroundColor: fichaForm.cor || '#6366f1' }} />
                            <div className="flex-1">
                                <h2 className="text-xl font-bold text-card-foreground">{fichaForm.nome || 'Tipo de Trabalho'}</h2>
                                <p className="text-sm text-muted-foreground">{fichaForm.codigo ? `${fichaForm.codigo} · ` : ''}Ficha Completa</p>
                            </div>
                            <button onClick={() => setSelectedItem(null)} className="p-2 text-muted-foreground hover:text-card-foreground hover:bg-muted rounded-lg">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* === SECÇÃO 1: Info Básica === */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Briefcase className="h-4 w-4" /> Informação Básica
                                </h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Código</label>
                                        <input value={fichaForm.codigo || ''} onChange={e => setFichaForm({ ...fichaForm, codigo: e.target.value.toUpperCase() })} placeholder="Ex: ZR-001" className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg font-mono uppercase" />
                                    </div>
                                    <div className="md:col-span-2">
                                        <label className="text-xs text-muted-foreground mb-1 block">Nome</label>
                                        <input value={fichaForm.nome || ''} onChange={e => setFichaForm({ ...fichaForm, nome: e.target.value })} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Cor</label>
                                        <div className="flex items-center gap-2">
                                            <input type="color" value={fichaForm.cor || '#6366f1'} onChange={e => setFichaForm({ ...fichaForm, cor: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                                            <span className="text-xs text-muted-foreground font-mono">{fichaForm.cor || '#6366f1'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Categoria</label>
                                        <select value={fichaForm.categoria || 'geral'} onChange={e => setFichaForm({ ...fichaForm, categoria: e.target.value })} className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg">
                                            <option value="geral">Geral</option>
                                            <option value="fixa">Prótese Fixa</option>
                                            <option value="removivel">Prótese Removível</option>
                                            <option value="implante">Implante</option>
                                            <option value="ortodontia">Ortodontia</option>
                                            <option value="ceramica">Cerâmica</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Estado</label>
                                        <button
                                            onClick={() => setFichaForm({ ...fichaForm, activo: !fichaForm.activo })}
                                            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border ${fichaForm.activo ? 'bg-green-500/10 border-green-500/30 text-green-500' : 'bg-muted border-border text-muted-foreground'}`}
                                        >
                                            {fichaForm.activo ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                                            {fichaForm.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* === SIMULAÇÃO DE PREÇO === */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <ChevronRight className="h-4 w-4" /> Simulação de Preço
                                </h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Preço (€)</label>
                                        <input type="number" step="0.01" value={fichaForm.preco ?? ''} onChange={e => setFichaForm({ ...fichaForm, preco: e.target.value })} placeholder="0.00" className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">IVA (%)</label>
                                        <input type="number" step="1" value={fichaForm.iva_percent ?? ''} onChange={e => setFichaForm({ ...fichaForm, iva_percent: e.target.value })} placeholder="0" className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-muted-foreground mb-1 block">Total</label>
                                        <div className="px-3 py-2 text-sm bg-muted/50 border border-border rounded-lg font-bold text-card-foreground">
                                            {calcTotal(parseFloat(fichaForm.preco) || 0, parseFloat(fichaForm.iva_percent) || 0)} €
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* === KPI CARDS === */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                <div className="border border-green-500/30 bg-green-500/5 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Custo Materiais</p>
                                    <p className="text-lg font-bold text-green-700">{custoMateriais.toFixed(2)} €</p>
                                </div>
                                <div className="border border-blue-500/30 bg-blue-500/5 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Custo Mão de Obra</p>
                                    <p className="text-lg font-bold text-blue-700">{custoMaoDeObra.toFixed(2)} €</p>
                                </div>
                                <div className="border border-orange-500/30 bg-orange-500/5 rounded-xl p-3">
                                    <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Custo Global</p>
                                    <p className="text-lg font-bold text-orange-700">{custoGlobal.toFixed(2)} €</p>
                                </div>
                                <div className={`border rounded-xl p-3 ${margem >= 0 ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-red-500/30 bg-red-500/5'}`}>
                                    <p className={`text-[10px] font-semibold uppercase tracking-wider ${margem >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Margem</p>
                                    <p className={`text-lg font-bold ${margem >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                                        {margem.toFixed(2)} € <span className="text-xs font-normal">({margemPercent.toFixed(1)}%)</span>
                                    </p>
                                </div>
                            </div>

                            {/* === TABELA DE FASES DE PRODUÇÃO === */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Factory className="h-4 w-4" /> Fases de Produção
                                </h3>

                                {/* Table header */}
                                <div className="bg-muted/50 border border-border rounded-t-xl px-4 py-2.5 grid grid-cols-12 gap-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    <div className="col-span-3">Material</div>
                                    <div className="col-span-1 text-center">Tempo</div>
                                    <div className="col-span-1 text-center">Qtd</div>
                                    <div className="col-span-2 text-center">Unid/Porção</div>
                                    <div className="col-span-2 text-right">Custo/Porção</div>
                                    <div className="col-span-2 text-right">Custo Material</div>
                                    <div className="col-span-1"></div>
                                </div>

                                {/* Phases */}
                                <div className="border border-t-0 border-border rounded-b-xl overflow-hidden divide-y divide-border/50">
                                    {(fichaForm.fases_producao || []).map((pe: PhaseEntry, phaseIdx: number) => {
                                        const phaseInfo = allPhases.find((p: any) => p.id === pe.phase_id);
                                        if (!phaseInfo) return null;
                                        const phaseTempo = pe.materials.reduce((s: number, m: PhaseMaterial) => s + (Number(m.tempo) || 0), 0);
                                        const phaseCusto = pe.materials.reduce((s: number, m: PhaseMaterial) => s + (Number(m.custo_material) || 0), 0);
                                        const tempoPercent = totalTempoMin > 0 ? ((phaseTempo / totalTempoMin) * 100).toFixed(0) : '0';

                                        return (
                                            <div key={pe.phase_id}>
                                                {/* Phase header */}
                                                <div className="flex items-center gap-3 px-4 py-2.5 bg-card">
                                                    <span className="flex items-center justify-center w-7 h-7 rounded-lg text-white text-xs font-bold" style={{ backgroundColor: phaseInfo.cor || '#6366f1' }}>
                                                        {String(phaseIdx + 1).padStart(2, '0')}
                                                    </span>
                                                    <span className="font-semibold text-sm text-card-foreground flex-1">{phaseInfo.nome}</span>
                                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> {phaseTempo} min ({tempoPercent}%)
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">💰 {phaseCusto.toFixed(2)} €</span>
                                                    <button onClick={() => removePhaseFromFicha(pe.phase_id)} className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors" title="Remover fase">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                </div>

                                                {/* Material rows */}
                                                {pe.materials.map((mat: PhaseMaterial, matIdx: number) => (
                                                    <div key={matIdx} className="grid grid-cols-12 gap-2 px-4 py-2 bg-muted/20 items-center">
                                                        <div className="col-span-3">
                                                            <select
                                                                value={mat.material_id}
                                                                onChange={e => updateMaterialInPhase(pe.phase_id, matIdx, 'material_id', e.target.value)}
                                                                className="w-full px-2 py-1.5 text-xs bg-muted border border-border rounded-lg"
                                                            >
                                                                <option value="">Selecionar Material...</option>
                                                                {allMaterials.filter((m: any) => m.activo).map((m: any) => (
                                                                    <option key={m.id} value={m.id}>{m.nome}{m.preco_pvp ? ` — ${Number(m.preco_pvp).toFixed(2)}€` : ''}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <div className="flex items-center gap-1">
                                                                <input type="number" value={mat.tempo || ''} onChange={e => updateMaterialInPhase(pe.phase_id, matIdx, 'tempo', Number(e.target.value) || 0)} className="w-full px-1.5 py-1.5 text-xs bg-muted border border-border rounded-lg text-center" placeholder="0" />
                                                                <span className="text-[10px] text-muted-foreground">min</span>
                                                            </div>
                                                        </div>
                                                        <div className="col-span-1">
                                                            <input type="number" value={mat.qtd_usada || ''} onChange={e => updateMaterialInPhase(pe.phase_id, matIdx, 'qtd_usada', Number(e.target.value) || 0)} className="w-full px-1.5 py-1.5 text-xs bg-muted border border-border rounded-lg text-center" placeholder="1" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <input value={mat.unidade_porcao || ''} onChange={e => updateMaterialInPhase(pe.phase_id, matIdx, 'unidade_porcao', e.target.value)} className="w-full px-1.5 py-1.5 text-xs bg-muted border border-border rounded-lg text-center" placeholder="un" />
                                                        </div>
                                                        <div className="col-span-2">
                                                            <input type="number" step="0.01" value={mat.custo_porcao || ''} onChange={e => updateMaterialInPhase(pe.phase_id, matIdx, 'custo_porcao', Number(e.target.value) || 0)} className="w-full px-1.5 py-1.5 text-xs bg-muted border border-border rounded-lg text-right" placeholder="0.00" />
                                                        </div>
                                                        <div className="col-span-2 text-right">
                                                            <span className="text-xs font-bold text-card-foreground">{(Number(mat.custo_material) || 0).toFixed(2)} €</span>
                                                        </div>
                                                        <div className="col-span-1 text-right">
                                                            <button onClick={() => removeMaterialFromPhase(pe.phase_id, matIdx)} className="p-1 text-muted-foreground hover:text-destructive" title="Remover material">
                                                                <X className="h-3 w-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}

                                                {/* Add material button */}
                                                <div className="px-4 py-2 bg-muted/10">
                                                    <button onClick={() => addMaterialToPhase(pe.phase_id)} className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1">
                                                        <Plus className="h-3 w-3" /> Adicionar Material
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}

                                    {/* Add Phase button */}
                                    {(fichaForm.fases_producao || []).length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground text-sm">Nenhuma fase adicionada</div>
                                    )}
                                </div>

                                {/* Phase selector */}
                                <div className="mt-3 flex items-center gap-2">
                                    <select
                                        id="phase-selector"
                                        className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg"
                                        defaultValue=""
                                        onChange={e => { if (e.target.value) { addPhaseToFicha(e.target.value); e.target.value = ''; } }}
                                    >
                                        <option value="" disabled>+ Adicionar Fase de Produção...</option>
                                        {allPhases
                                            .filter((p: any) => p.activo && !(fichaForm.fases_producao || []).some((pe: PhaseEntry) => pe.phase_id === p.id))
                                            .map((p: any) => (
                                                <option key={p.id} value={p.id}>{p.nome}</option>
                                            ))}
                                    </select>
                                </div>
                            </div>

                            {/* === NOTAS === */}
                            <div>
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <FileText className="h-4 w-4" /> Notas de Produção
                                </h3>
                                <textarea
                                    value={fichaForm.notas_producao || ''}
                                    onChange={e => setFichaForm({ ...fichaForm, notas_producao: e.target.value })}
                                    placeholder="Instruções especiais, observações de produção..."
                                    rows={3}
                                    className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg resize-none"
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
                            <button onClick={() => setSelectedItem(null)} className="px-4 py-2 text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80">
                                Cancelar
                            </button>
                            <button onClick={saveFicha} disabled={saving} className="flex items-center gap-2 px-6 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                Guardar Alterações
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

// =====================================================
// MATERIALS MANAGER (materials_catalog — agrupado por categoria com defaults)
// =====================================================
function MaterialsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ nome: '', categoria: 'ceramica', cor: '#94a3b8', marca: '', fornecedor: '', preco_pvp: '', iva_percent: '23', porcao_tamanho: '1', porcao_unidade: 'un', ref_fabricante: '', ref_fornecedor: '', reuniao: false, notas: '' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [brands, setBrands] = useState<any[]>([]);
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [newCatForm, setNewCatForm] = useState({ categoria: '', label: '', widget_dentes_default: true, widget_fresagem_default: true, widget_componentes_default: false });

    const sb = async () => (await import('@/lib/supabase')).supabase;

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const supabase = await sb();
            const [matsRes, catsRes, suppRes, brandRes] = await Promise.all([
                supabase.from('materials_catalog').select('*').order('ordem', { ascending: true }),
                supabase.from('material_categories').select('*').order('categoria', { ascending: true }),
                supabase.from('suppliers').select('id,nome').eq('activo', true).order('nome'),
                supabase.from('brands').select('id,nome').eq('activo', true).order('nome'),
            ]);
            if (matsRes.error) throw matsRes.error;
            if (catsRes.error) throw catsRes.error;
            setItems(matsRes.data || []);
            setCategories(catsRes.data || []);
            setSuppliers(suppRes.data || []);
            setBrands(brandRes.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    // Buscar defaults da categoria
    const getCatDefaults = (cat: string) => {
        const found = categories.find(c => c.categoria === cat);
        return {
            widget_dentes: found?.widget_dentes_default ?? true,
            widget_fresagem: found?.widget_fresagem_default ?? true,
            widget_componentes: found?.widget_componentes_default ?? false,
        };
    };

    const handleAdd = async () => {
        if (!addForm.nome.trim()) return;
        try {
            setSaving(true);
            const supabase = await sb();
            const { data: maxOrdem } = await supabase
                .from('materials_catalog').select('ordem').order('ordem', { ascending: false }).limit(1).single();
            const defaults = getCatDefaults(addForm.categoria);
            const insertData: any = {
                nome: addForm.nome,
                categoria: addForm.categoria || 'ceramica',
                cor: addForm.cor || '#94a3b8',
                activo: true,
                ordem: (maxOrdem?.ordem || 0) + 1,
                ...defaults,
            };
            if (addForm.marca) insertData.marca = addForm.marca;
            if (addForm.fornecedor) insertData.fornecedor = addForm.fornecedor;
            if (addForm.preco_pvp) insertData.preco_pvp = parseFloat(addForm.preco_pvp);
            if (addForm.iva_percent) insertData.iva_percent = parseInt(addForm.iva_percent);
            if (addForm.porcao_tamanho) insertData.porcao_tamanho = parseFloat(addForm.porcao_tamanho);
            if (addForm.porcao_unidade) insertData.porcao_unidade = addForm.porcao_unidade;
            if (addForm.ref_fabricante) insertData.ref_fabricante = addForm.ref_fabricante;
            if (addForm.ref_fornecedor) insertData.ref_fornecedor = addForm.ref_fornecedor;
            if (addForm.reuniao) insertData.reuniao = addForm.reuniao;
            if (addForm.notas) insertData.notas = addForm.notas;
            const { error } = await supabase.from('materials_catalog').insert(insertData);
            if (error) throw error;
            setAddForm({ nome: '', categoria: 'ceramica', cor: '#94a3b8', marca: '', fornecedor: '', preco_pvp: '', iva_percent: '23', porcao_tamanho: '1', porcao_unidade: 'un', ref_fabricante: '', ref_fornecedor: '', reuniao: false, notas: '' });
            setShowAdd(false);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            setSaving(true);
            const supabase = await sb();
            const { error } = await supabase.from('materials_catalog').update(editForm).eq('id', editingId);
            if (error) throw error;
            setEditingId(null);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const toggleWidgetFlag = async (id: string, field: 'widget_dentes' | 'widget_fresagem' | 'widget_componentes', current: boolean) => {
        try {
            const supabase = await sb();
            const { error } = await supabase.from('materials_catalog').update({ [field]: !current }).eq('id', id);
            if (error) throw error;
            load();
        } catch (e) { console.error(e); }
    };

    // Toggle toda a categoria (batch + update default)
    const toggleCategoryWidget = async (cat: string, field: 'widget_dentes' | 'widget_fresagem' | 'widget_componentes', currentDefault: boolean) => {
        try {
            const supabase = await sb();
            const defaultField = `${field}_default`;
            // Actualizar default da categoria
            await supabase.from('material_categories').update({ [defaultField]: !currentDefault }).eq('categoria', cat);
            // Batch update todos os materiais nessa categoria
            await supabase.from('materials_catalog').update({ [field]: !currentDefault }).eq('categoria', cat);
            load();
        } catch (e) { console.error(e); }
    };

    const toggleCollapse = (cat: string) => {
        setCollapsedCats(prev => {
            const n = new Set(prev);
            if (n.has(cat)) n.delete(cat); else n.add(cat);
            return n;
        });
    };

    const handleAddCategory = async () => {
        if (!newCatForm.categoria.trim() || !newCatForm.label.trim()) return;
        try {
            setSaving(true);
            const supabase = await sb();
            const { error } = await supabase.from('material_categories').insert(newCatForm);
            if (error) throw error;
            setNewCatForm({ categoria: '', label: '', widget_dentes_default: true, widget_fresagem_default: true, widget_componentes_default: false });
            setShowAddCategory(false);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    // Categorias dinâmicas da tabela
    const CATEGORIAS = categories.map(c => c.categoria);

    // Agrupar materiais por categoria
    const grouped = items.reduce<Record<string, any[]>>((acc, item) => {
        const cat = item.categoria || 'outro';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const categoryOrder = Object.keys(grouped).sort();

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-sm text-gray-500">{items.length} material(is) · {categoryOrder.length} categorias</span>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddCategory(true)} className="flex items-center gap-1.5 text-sm px-3 py-2 border border-border text-muted-foreground rounded-lg hover:text-card-foreground hover:border-primary/50 transition-colors">
                        <Plus className="h-3.5 w-3.5" /> Nova Categoria
                    </button>
                    <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-card-foreground rounded-lg hover:bg-primary/90">
                        <Plus className="h-4 w-4" /> Adicionar Material
                    </button>
                </div>
            </div>

            {showAddCategory && (
                <div className="p-4 bg-purple-900/10 border-b border-purple-700/30 space-y-3">
                    <div className="flex items-center gap-3">
                        <input type="text" value={newCatForm.categoria} onChange={e => setNewCatForm({ ...newCatForm, categoria: e.target.value.toLowerCase().replace(/\s+/g, '_') })} placeholder="ID (ex: ceramica)" className="w-36 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 focus:outline-none" autoFocus />
                        <input type="text" value={newCatForm.label} onChange={e => setNewCatForm({ ...newCatForm, label: e.target.value })} placeholder="Nome visível (ex: Cerâmica)" className="flex-1 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 focus:outline-none" />
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="font-medium">Defaults:</span>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={newCatForm.widget_dentes_default} onChange={e => setNewCatForm({ ...newCatForm, widget_dentes_default: e.target.checked })} className="rounded" />
                            🦷 Dentes
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={newCatForm.widget_fresagem_default} onChange={e => setNewCatForm({ ...newCatForm, widget_fresagem_default: e.target.checked })} className="rounded" />
                            🔧 Fresagem
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                            <input type="checkbox" checked={newCatForm.widget_componentes_default} onChange={e => setNewCatForm({ ...newCatForm, widget_componentes_default: e.target.checked })} className="rounded" />
                            📦 Componentes
                        </label>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAddCategory(false)} className="text-sm text-muted-foreground hover:text-card-foreground px-3 py-1.5">Cancelar</button>
                        <button onClick={handleAddCategory} disabled={saving || !newCatForm.categoria.trim() || !newCatForm.label.trim()} className="text-sm bg-purple-600 text-white rounded-lg px-4 py-1.5 hover:bg-purple-700 disabled:opacity-50">
                            {saving ? 'A guardar...' : 'Criar Categoria'}
                        </button>
                    </div>
                </div>
            )}

            {showAdd && (
                <div className="p-4 bg-muted/50 border-b border-border space-y-3">
                    <div className="flex items-center gap-3">
                        <input type="text" value={addForm.nome} onChange={e => setAddForm({ ...addForm, nome: e.target.value })} placeholder="Nome do material *" className="flex-1 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 focus:outline-none" autoFocus />
                        <select value={addForm.categoria} onChange={e => setAddForm({ ...addForm, categoria: e.target.value })} className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2">
                            {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                        <input type="color" value={addForm.cor} onChange={e => setAddForm({ ...addForm, cor: e.target.value })} className="w-10 h-10 rounded-lg border cursor-pointer" />
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <select value={addForm.marca} onChange={e => setAddForm({ ...addForm, marca: e.target.value })} className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2">
                            <option value="">Marca...</option>
                            {brands.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                        </select>
                        <select value={addForm.fornecedor} onChange={e => setAddForm({ ...addForm, fornecedor: e.target.value })} className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2">
                            <option value="">Fornecedor...</option>
                            {suppliers.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                        </select>
                        <div className="flex items-center gap-1">
                            <input type="number" step="0.01" value={addForm.preco_pvp} onChange={e => setAddForm({ ...addForm, preco_pvp: e.target.value })} placeholder="Preço €" className="flex-1 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 w-20" />
                            <span className="text-xs text-muted-foreground">€</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <input type="number" value={addForm.iva_percent} onChange={e => setAddForm({ ...addForm, iva_percent: e.target.value })} className="w-16 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2" />
                            <span className="text-xs text-muted-foreground">% IVA</span>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="flex items-center gap-1">
                            <input type="number" step="0.01" value={addForm.porcao_tamanho} onChange={e => setAddForm({ ...addForm, porcao_tamanho: e.target.value })} className="w-20 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2" />
                            <select value={addForm.porcao_unidade} onChange={e => setAddForm({ ...addForm, porcao_unidade: e.target.value })} className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-2 py-2">
                                <option value="un">un</option>
                                <option value="ml">ml</option>
                                <option value="g">g</option>
                                <option value="kg">kg</option>
                                <option value="L">L</option>
                                <option value="mm">mm</option>
                                <option value="disco">disco</option>
                            </select>
                        </div>
                        <input type="text" value={addForm.ref_fabricante} onChange={e => setAddForm({ ...addForm, ref_fabricante: e.target.value })} placeholder="Ref. Fabricante" className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2" />
                        <input type="text" value={addForm.ref_fornecedor} onChange={e => setAddForm({ ...addForm, ref_fornecedor: e.target.value })} placeholder="Ref. Fornecedor" className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2" />
                        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer border border-border rounded-lg px-3 bg-muted/30">
                            <input type="checkbox" checked={addForm.reuniao} onChange={e => setAddForm({ ...addForm, reuniao: e.target.checked })} className="rounded" />
                            Reunião (Falta Info)
                        </label>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <input type="text" value={addForm.notas} onChange={e => setAddForm({ ...addForm, notas: e.target.value })} placeholder="Notas..." className="col-span-2 md:col-span-3 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2" />
                        <div className="flex justify-end gap-2 md:col-span-1">
                            <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 px-4 py-2 bg-green-500 text-card-foreground rounded-lg hover:bg-green-600 disabled:opacity-50 text-sm w-full justify-center md:w-auto">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Guardar
                            </button>
                            <button onClick={() => setShowAdd(false)} className="p-2 text-muted-foreground hover:text-card-foreground/80"><X className="h-4 w-4" /></button>
                        </div>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Sem materiais registados</div>
            ) : (
                <div>
                    {categoryOrder.map(cat => {
                        const catItems = grouped[cat];
                        const catData = categories.find(c => c.categoria === cat);
                        const isCollapsed = collapsedCats.has(cat);
                        const dDefault = catData?.widget_dentes_default ?? true;
                        const fDefault = catData?.widget_fresagem_default ?? true;
                        const cDefault = catData?.widget_componentes_default ?? false;

                        return (
                            <div key={cat}>
                                {/* Category header */}
                                <div className="flex items-center bg-muted/60 border-b border-t border-border px-4 py-2.5">
                                    <button
                                        onClick={() => toggleCollapse(cat)}
                                        className="flex items-center gap-2 flex-1 text-left"
                                    >
                                        <ChevronRight className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${!isCollapsed ? 'rotate-90' : ''}`} />
                                        <span className="text-xs font-semibold text-card-foreground uppercase tracking-wider">{catData?.label || cat}</span>
                                        <span className="text-[10px] text-muted-foreground">({catItems.length})</span>
                                    </button>
                                    {/* Category-level toggles */}
                                    <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <span>🦷</span>
                                            <button onClick={() => toggleCategoryWidget(cat, 'widget_dentes', dDefault)}
                                                className="hover:text-primary transition-colors" title="Default Dentes para esta categoria">
                                                {dDefault ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>🔧</span>
                                            <button onClick={() => toggleCategoryWidget(cat, 'widget_fresagem', fDefault)}
                                                className="hover:text-primary transition-colors" title="Default Fresagem para esta categoria">
                                                {fDefault ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span>📦</span>
                                            <button onClick={() => toggleCategoryWidget(cat, 'widget_componentes', cDefault)}
                                                className="hover:text-primary transition-colors" title="Default Componentes para esta categoria">
                                                {cDefault ? <ToggleRight className="h-4 w-4 text-green-500" /> : <ToggleLeft className="h-4 w-4" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Materials in category */}
                                {!isCollapsed && (
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-gray-800/50">
                                            {catItems.map(item => (
                                                <tr key={item.id} className="hover:bg-muted/30">
                                                    {editingId === item.id ? (
                                                        <>
                                                            <td colSpan={7} className="px-4 py-3">
                                                                <div className="bg-muted/50 border border-border rounded-xl p-4 space-y-3">
                                                                    <div className="flex items-center gap-3">
                                                                        <input type="color" value={editForm.cor || '#94a3b8'} onChange={e => setEditForm({ ...editForm, cor: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" />
                                                                        <input type="text" value={editForm.nome || ''} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className="flex-1 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 font-medium" placeholder="Nome" />
                                                                        <select value={editForm.categoria || ''} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2">
                                                                            {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                                                                        </select>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                        <select value={editForm.marca || ''} onChange={e => setEditForm({ ...editForm, marca: e.target.value })} className="text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5">
                                                                            <option value="">Marca...</option>
                                                                            {brands.map(b => <option key={b.id} value={b.nome}>{b.nome}</option>)}
                                                                        </select>
                                                                        <select value={editForm.fornecedor || ''} onChange={e => setEditForm({ ...editForm, fornecedor: e.target.value })} className="text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5">
                                                                            <option value="">Fornecedor...</option>
                                                                            {suppliers.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
                                                                        </select>
                                                                        <div className="flex items-center gap-1">
                                                                            <input type="number" step="0.01" value={editForm.preco_pvp ?? ''} onChange={e => setEditForm({ ...editForm, preco_pvp: e.target.value ? parseFloat(e.target.value) : null })} placeholder="Preço" className="flex-1 text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5" />
                                                                            <span className="text-[10px] text-muted-foreground">€</span>
                                                                        </div>
                                                                        <div className="flex items-center gap-1">
                                                                            <input type="number" value={editForm.iva_percent ?? 23} onChange={e => setEditForm({ ...editForm, iva_percent: parseInt(e.target.value) || 0 })} className="w-14 text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5" />
                                                                            <span className="text-[10px] text-muted-foreground">% IVA</span>
                                                                        </div>
                                                                    </div>
                                                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                                                        <div className="flex items-center gap-1">
                                                                            <input type="number" step="0.01" value={editForm.porcao_tamanho ?? 1} onChange={e => setEditForm({ ...editForm, porcao_tamanho: parseFloat(e.target.value) || 1 })} className="w-16 text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5" />
                                                                            <select value={editForm.porcao_unidade || 'un'} onChange={e => setEditForm({ ...editForm, porcao_unidade: e.target.value })} className="text-xs border border-border rounded-lg bg-muted text-card-foreground px-1 py-1.5">
                                                                                <option value="un">un</option><option value="ml">ml</option><option value="g">g</option><option value="kg">kg</option><option value="L">L</option><option value="mm">mm</option><option value="disco">disco</option>
                                                                            </select>
                                                                        </div>
                                                                        <input type="text" value={editForm.ref_fabricante || ''} onChange={e => setEditForm({ ...editForm, ref_fabricante: e.target.value })} placeholder="Ref. Fabricante" className="text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5" />
                                                                        <input type="text" value={editForm.ref_fornecedor || ''} onChange={e => setEditForm({ ...editForm, ref_fornecedor: e.target.value })} placeholder="Ref. Fornecedor" className="text-xs border border-border rounded-lg bg-muted text-card-foreground px-2 py-1.5" />
                                                                        <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer">
                                                                            <input type="checkbox" checked={editForm.reuniao || false} onChange={e => setEditForm({ ...editForm, reuniao: e.target.checked })} className="rounded" />
                                                                            Reunião
                                                                        </label>
                                                                    </div>
                                                                    <input type="text" value={editForm.notas || ''} onChange={e => setEditForm({ ...editForm, notas: e.target.value })} placeholder="Notas..." className="w-full text-xs border border-border rounded-lg bg-muted text-card-foreground px-3 py-1.5" />
                                                                    {editForm.preco_pvp > 0 && (
                                                                        <div className="flex items-center gap-4 text-[10px] text-muted-foreground bg-card rounded-lg px-3 py-2 border border-border">
                                                                            <span>💰 PVP: <strong className="text-card-foreground">{Number(editForm.preco_pvp).toFixed(2)}€</strong></span>
                                                                            <span>📊 IVA: <strong className="text-card-foreground">{(Number(editForm.preco_pvp) * (editForm.iva_percent || 23) / 100).toFixed(2)}€</strong></span>
                                                                            <span>🧾 Total: <strong className="text-primary">{(Number(editForm.preco_pvp) * (1 + (editForm.iva_percent || 23) / 100)).toFixed(2)}€</strong></span>
                                                                            {(editForm.porcao_tamanho || 1) > 1 && <span>📦 Custo/{editForm.porcao_unidade || 'un'}: <strong className="text-card-foreground">{(Number(editForm.preco_pvp) / (editForm.porcao_tamanho || 1)).toFixed(3)}€</strong></span>}
                                                                        </div>
                                                                    )}
                                                                    <div className="flex justify-end gap-2 pt-1">
                                                                        <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg">Cancelar</button>
                                                                        <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700">
                                                                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Guardar
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="px-4 py-2.5 w-12"><div className="w-5 h-5 rounded-full border border-border" style={{ backgroundColor: item.cor || '#94a3b8' }} /></td>
                                                            <td className="px-4 py-2.5">
                                                                <div className="font-medium text-card-foreground">{item.nome}</div>
                                                                {(item.marca || item.fornecedor) && (
                                                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                                                        {item.marca && <span className="mr-2">🏷 {item.marca}</span>}
                                                                        {item.fornecedor && <span>🏢 {item.fornecedor}</span>}
                                                                    </div>
                                                                )}
                                                            </td>
                                                            <td className="px-2 py-2.5 text-right text-xs">
                                                                {item.preco_pvp > 0 ? (
                                                                    <span className="text-card-foreground font-medium">{Number(item.preco_pvp).toFixed(2)}€</span>
                                                                ) : (
                                                                    <span className="text-muted-foreground/40">—</span>
                                                                )}
                                                            </td>
                                                            <td className="text-center px-2 py-2.5">
                                                                <button onClick={() => toggleWidgetFlag(item.id, 'widget_dentes', item.widget_dentes)}
                                                                    className={`transition-colors ${item.widget_dentes !== dDefault ? 'ring-1 ring-amber-500/50 rounded' : ''}`}
                                                                    title={item.widget_dentes !== dDefault ? 'Diferente do default da categoria' : ''}>
                                                                    {item.widget_dentes ? <ToggleRight className="h-4.5 w-4.5 text-green-500" /> : <ToggleLeft className="h-4.5 w-4.5 text-muted-foreground" />}
                                                                </button>
                                                            </td>
                                                            <td className="text-center px-2 py-2.5">
                                                                <button onClick={() => toggleWidgetFlag(item.id, 'widget_fresagem', item.widget_fresagem)}
                                                                    className={`transition-colors ${item.widget_fresagem !== fDefault ? 'ring-1 ring-amber-500/50 rounded' : ''}`}
                                                                    title={item.widget_fresagem !== fDefault ? 'Diferente do default da categoria' : ''}>
                                                                    {item.widget_fresagem ? <ToggleRight className="h-4.5 w-4.5 text-green-500" /> : <ToggleLeft className="h-4.5 w-4.5 text-muted-foreground" />}
                                                                </button>
                                                            </td>
                                                            <td className="text-center px-2 py-2.5">
                                                                <button onClick={() => toggleWidgetFlag(item.id, 'widget_componentes', item.widget_componentes)}
                                                                    className={`transition-colors ${item.widget_componentes !== cDefault ? 'ring-1 ring-amber-500/50 rounded' : ''}`}
                                                                    title={item.widget_componentes !== cDefault ? 'Diferente do default da categoria' : ''}>
                                                                    {item.widget_componentes ? <ToggleRight className="h-4.5 w-4.5 text-green-500" /> : <ToggleLeft className="h-4.5 w-4.5 text-muted-foreground" />}
                                                                </button>
                                                            </td>
                                                            <td className="px-4 py-2.5 text-right">
                                                                <div className="flex justify-end gap-1">
                                                                    <button onClick={() => { setEditingId(item.id); setEditForm({ ...item }); }} className="p-1.5 text-muted-foreground hover:text-blue-500 hover:bg-blue-900/30 rounded"><Edit3 className="h-3.5 w-3.5" /></button>
                                                                    {deleteConfirm === item.id ? (
                                                                        <>
                                                                            <button onClick={async () => { const s = await sb(); await s.from('materials_catalog').delete().eq('id', item.id); setDeleteConfirm(null); load(); }} className="p-1.5 bg-red-900/40 text-red-400 rounded text-xs">Sim</button>
                                                                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 bg-muted text-muted-foreground rounded text-xs">Não</button>
                                                                        </>
                                                                    ) : (
                                                                        <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-muted-foreground hover:text-red-500 hover:bg-red-900/30 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </>
                                                    )}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// =====================================================
// TOOTH COLORS MANAGER
// =====================================================

// Mapa de cores VITA realistas para swatches
const VITA_SHADE_COLORS: Record<string, string> = {
    // Vita Classical A
    'A1': '#E8D5B8', 'A2': '#DCC8A5', 'A3': '#D0B88E', 'A3.5': '#C8AD82', 'A4': '#BFA076',
    // Vita Classical B
    'B1': '#E5D9C0', 'B2': '#D9C9A6', 'B3': '#CDBA8E', 'B4': '#C1AB7A',
    // Vita Classical C
    'C1': '#D4CCC0', 'C2': '#C8BFB0', 'C3': '#BCB2A0', 'C4': '#AEA492',
    // Vita Classical D
    'D2': '#DBC8B5', 'D3': '#D0BBAA', 'D4': '#C5AE9F',
    // Bleach (part of Vita Classical)
    'BL1': '#F0EDE8', 'BL2': '#ECE8E2', 'BL3': '#E8E4DC', 'BL4': '#E4DFD6',
    // Vita 3D-Master
    '1M1': '#EDE3D5', '1M2': '#E5DAC8',
    '2L1.5': '#E8DCC5', '2L2.5': '#DCCFB5', '2M1': '#E0D4BE', '2M2': '#D8CAAE', '2M3': '#D0C0A0', '2R1.5': '#DFC8AE', '2R2.5': '#D5BB9E',
    '3L1.5': '#D8CDB8', '3L2.5': '#CEC0A8', '3M1': '#D2C4AC', '3M2': '#C8B89A', '3M3': '#BEA88B', '3R1.5': '#CCBA9E', '3R2.5': '#C2AE8E',
    '4L1.5': '#C8BDAA', '4L2.5': '#BEB19C', '4M1': '#C0B49E', '4M3': '#A89882', '4R1.5': '#B8A892', '4R2.5': '#AE9E88',
    '5M1': '#B0A490', '5M2': '#A69882', '5M3': '#9C8E78',
    // Ivoclar Chromascop
    '110': '#EDE5D8', '120': '#E5DCC8', '130': '#DDD2B8', '140': '#D5C8A8',
    '210': '#E8DED0', '220': '#E0D4C0', '230': '#D8CAB0', '240': '#D0C0A0',
    '310': '#E2D8CC', '320': '#D9CEB8', '330': '#D0C4A8', '340': '#C8BA98',
    '410': '#DDD5CC', '420': '#D4CCBC', '430': '#CBC2AC', '440': '#C2B89C',
    '510': '#D8D0C8', '520': '#D0C8B8', '530': '#C8BEA8', '540': '#C0B498',
};

function getShadeColor(codigo: string): string {
    return VITA_SHADE_COLORS[codigo] || '#D0C0A0';
}

// Mapeia grupo BD → nome de escala
const GRUPO_TO_ESCALA: Record<string, string> = {
    'A': 'Vita Classical', 'B': 'Vita Classical', 'C': 'Vita Classical', 'D': 'Vita Classical',
    'Bleach': 'Vita Classical',
    '3D-Master': 'Vita 3D-Master',
    'Chromascop': 'Ivoclar Chromascop',
};

const ESCALA_ORDER = ['Vita Classical', 'Vita 3D-Master', 'Ivoclar Chromascop'];

function ToothColorsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ codigo: '', nome: '', grupo: 'A' });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [activeEscala, setActiveEscala] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setLoading(true); setItems(await catalogService.getToothColors()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.codigo.trim() || !addForm.nome.trim()) return;
        try { setSaving(true); await catalogService.createToothColor(addForm); setAddForm({ codigo: '', nome: '', grupo: addForm.grupo }); setShowAdd(false); load(); }
        catch (e) { console.error(e); } finally { setSaving(false); }
    };

    // Agrupar por ESCALA (Vita Classical junta todos A/B/C/D/Bleach)
    const byEscala = items.reduce<Record<string, Record<string, any[]>>>((acc, item) => {
        const grupo = item.grupo || 'Outro';
        const escala = GRUPO_TO_ESCALA[grupo] || grupo;
        if (!acc[escala]) acc[escala] = {};
        if (!acc[escala][grupo]) acc[escala][grupo] = [];
        acc[escala][grupo].push(item);
        return acc;
    }, {});

    const escalaNames = ESCALA_ORDER.filter(e => byEscala[e]);
    // Add any custom escalas not in ESCALA_ORDER
    Object.keys(byEscala).forEach(e => { if (!escalaNames.includes(e)) escalaNames.push(e); });

    const selectedEscala = activeEscala || escalaNames[0] || 'Vita Classical';
    const currentSubGroups = byEscala[selectedEscala] || {};
    const totalInEscala = Object.values(currentSubGroups).reduce((sum, arr) => sum + arr.length, 0);

    // Grupo options por escala para o formulário de adicionar
    const grupoOptionsForEscala: Record<string, string[]> = {
        'Vita Classical': ['A', 'B', 'C', 'D', 'Bleach'],
        'Vita 3D-Master': ['3D-Master'],
        'Ivoclar Chromascop': ['Chromascop'],
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex min-h-[400px]">
                {/* === Sidebar de Escalas === */}
                <div className="w-52 border-r border-border bg-muted/30 flex-shrink-0">
                    <div className="p-3 border-b border-border">
                        <button
                            onClick={() => setShowAdd(true)}
                            className="w-full flex items-center justify-center gap-1.5 text-sm px-3 py-2 bg-card border border-border text-card-foreground rounded-lg hover:border-primary hover:text-primary transition-colors"
                        >
                            <Plus className="h-3.5 w-3.5" /> Nova Escala
                        </button>
                    </div>
                    <div className="py-1">
                        {escalaNames.map(escala => {
                            const count = Object.values(byEscala[escala] || {}).reduce((s, a) => s + a.length, 0);
                            return (
                                <button
                                    key={escala}
                                    onClick={() => setActiveEscala(escala)}
                                    className={`w-full text-left px-4 py-3 text-sm transition-colors ${selectedEscala === escala
                                        ? 'bg-card text-card-foreground font-semibold border-l-2 border-primary'
                                        : 'text-muted-foreground hover:text-card-foreground hover:bg-muted/50'
                                        }`}
                                >
                                    <span className="block font-medium">{escala}</span>
                                    <span className="text-xs text-muted-foreground">{count} tons</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* === Área Principal === */}
                <div className="flex-1">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-border">
                        <div>
                            <h3 className="text-base font-semibold text-card-foreground">{selectedEscala}</h3>
                            <span className="text-xs text-muted-foreground">{totalInEscala} tonalidade(s)</span>
                        </div>
                        <button
                            onClick={() => {
                                const grupos = grupoOptionsForEscala[selectedEscala] || ['A'];
                                setAddForm({ codigo: '', nome: '', grupo: grupos[0] });
                                setShowAdd(true);
                            }}
                            className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 font-medium shadow-sm"
                        >
                            <Plus className="h-4 w-4" /> Adicionar Tonalidade
                        </button>
                    </div>

                    {/* Add Form */}
                    {showAdd && (
                        <div className="p-4 bg-muted/30 border-b border-border flex items-center gap-3">
                            <input type="text" value={addForm.codigo} onChange={e => setAddForm({ ...addForm, codigo: e.target.value })} placeholder="Código (ex: A1)" className="w-24 text-sm border border-border rounded-lg bg-card text-card-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30" autoFocus />
                            <input type="text" value={addForm.nome} onChange={e => setAddForm({ ...addForm, nome: e.target.value })} placeholder="Nome descritivo..." className="flex-1 text-sm border border-border rounded-lg bg-card text-card-foreground px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30" />
                            <select value={addForm.grupo} onChange={e => setAddForm({ ...addForm, grupo: e.target.value })} className="text-sm border border-border rounded-lg bg-card text-card-foreground px-3 py-2">
                                {(grupoOptionsForEscala[selectedEscala] || ['A', 'B', 'C', 'D', 'Bleach', '3D-Master', 'Chromascop']).map(g => (
                                    <option key={g} value={g}>{g}</option>
                                ))}
                            </select>
                            <button onClick={handleAdd} disabled={saving} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            </button>
                            <button onClick={() => setShowAdd(false)} className="p-2 text-muted-foreground hover:text-card-foreground"><X className="h-4 w-4" /></button>
                        </div>
                    )}

                    {/* Grid de Swatches por sub-grupo */}
                    {loading ? (
                        <div className="text-center py-16"><Loader2 className="h-6 w-6 mx-auto animate-spin text-muted-foreground" /></div>
                    ) : totalInEscala === 0 ? (
                        <div className="text-center py-16 text-muted-foreground text-sm">
                            <Palette className="h-10 w-10 mx-auto mb-3 opacity-20" />
                            <p>Sem tonalidades nesta escala</p>
                            <p className="text-xs mt-1">Clique em "Adicionar Tonalidade" para começar</p>
                        </div>
                    ) : (
                        <div className="p-6 space-y-6">
                            {Object.entries(currentSubGroups).sort(([a], [b]) => a.localeCompare(b)).map(([subGrupo, colors]) => (
                                <div key={subGrupo}>
                                    {/* Sub-grupo label (só mostra se houver mais de 1 sub-grupo) */}
                                    {Object.keys(currentSubGroups).length > 1 && (
                                        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                                            {subGrupo === 'Bleach' ? '🦷 Bleach' : `Grupo ${subGrupo}`}
                                        </h4>
                                    )}
                                    <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-4">
                                        {colors.map((c: any) => (
                                            <div key={c.id} className="flex flex-col items-center group relative">
                                                {/* Swatch Circle */}
                                                <div
                                                    className="w-14 h-14 rounded-full border-2 border-gray-200 dark:border-gray-600 shadow-sm transition-transform group-hover:scale-110 group-hover:shadow-md cursor-default"
                                                    style={{ backgroundColor: getShadeColor(c.codigo) }}
                                                    title={c.nome}
                                                />
                                                {/* Label */}
                                                <span className="mt-1.5 text-xs font-medium text-card-foreground">{c.codigo}</span>

                                                {/* Delete overlay on hover */}
                                                {deleteConfirm === c.id ? (
                                                    <div className="absolute -top-1 -right-1 flex gap-0.5">
                                                        <button onClick={async () => { await catalogService.deleteToothColor(c.id); setDeleteConfirm(null); load(); }} className="text-[9px] bg-red-500 text-white rounded px-1.5 py-0.5 shadow">✓</button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="text-[9px] bg-gray-400 text-white rounded px-1.5 py-0.5 shadow">✕</button>
                                                    </div>
                                                ) : (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setDeleteConfirm(c.id); }}
                                                        className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-0.5 shadow transition-opacity"
                                                    >
                                                        <X className="h-2.5 w-2.5" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}


// =====================================================
// TEMPLATES MANAGER
// =====================================================
function TemplatesManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ titulo: '', tipo: 'medico' as 'medico' | 'lab' | 'lab_inside', fields: [{ subtitulo: '' }] });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try { setLoading(true); setItems(await catalogService.getTemplates()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.titulo.trim()) return;
        try {
            setSaving(true);
            await considerationsService.createTemplate({
                titulo: addForm.titulo,
                tipo: addForm.tipo,
                fields: addForm.fields.filter(f => f.subtitulo.trim()).map(f => ({ subtitulo: f.subtitulo })),
            });
            setAddForm({ titulo: '', tipo: 'medico', fields: [{ subtitulo: '' }] });
            setShowAdd(false);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const TIPO_COLORS = {
        medico: 'bg-orange-100 text-orange-700',
        lab: 'bg-blue-100 text-blue-700',
        lab_inside: 'bg-purple-100 text-purple-700',
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <span className="text-sm text-gray-500">{items.length} template(s)</span>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-card-foreground rounded-lg hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Criar Template
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-muted/50 border-b border-border space-y-3">
                    <div className="flex gap-3">
                        <input type="text" value={addForm.titulo} onChange={e => setAddForm({ ...addForm, titulo: e.target.value })} placeholder="Título do template..." className="flex-1 text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2 focus:outline-none" autoFocus />
                        <select value={addForm.tipo} onChange={e => setAddForm({ ...addForm, tipo: e.target.value as any })} className="text-sm border border-border rounded-lg bg-muted text-card-foreground px-3 py-2">
                            <option value="medico">Médico</option>
                            <option value="lab">Lab</option>
                            <option value="lab_inside">Inside</option>
                        </select>
                    </div>
                    {/* Fields */}
                    <div className="space-y-1.5">
                        <label className="text-xs text-gray-500">Subtítulos / Campos:</label>
                        {addForm.fields.map((f, i) => (
                            <div key={i} className="flex gap-2">
                                <input
                                    type="text"
                                    value={f.subtitulo}
                                    onChange={e => {
                                        const updated = [...addForm.fields];
                                        updated[i] = { subtitulo: e.target.value };
                                        setAddForm({ ...addForm, fields: updated });
                                    }}
                                    placeholder={`Subtítulo ${i + 1}...`}
                                    className="flex-1 text-sm border border-border rounded px-2 bg-muted text-card-foreground py-1.5 focus:outline-none"
                                />
                                {addForm.fields.length > 1 && (
                                    <button onClick={() => setAddForm({ ...addForm, fields: addForm.fields.filter((_, j) => j !== i) })} className="text-muted-foreground hover:text-red-500">
                                        <X className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={() => setAddForm({ ...addForm, fields: [...addForm.fields, { subtitulo: '' }] })}
                            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
                        >
                            <Plus className="h-3 w-3" /> Adicionar campo
                        </button>
                    </div>
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setShowAdd(false)} className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5">Cancelar</button>
                        <button onClick={handleAdd} disabled={saving} className="text-sm bg-green-500 text-card-foreground rounded-lg px-4 py-1.5 hover:bg-green-600 disabled:opacity-50">
                            {saving ? 'A guardar...' : 'Criar Template'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground text-sm">Sem templates</div>
            ) : (
                <div className="divide-y divide-gray-800">
                    {items.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 group">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[t.tipo as keyof typeof TIPO_COLORS] || 'bg-gray-100 text-muted-foreground'}`}>
                                {t.tipo}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-card-foreground">{t.titulo}</p>
                                <p className="text-[10px] text-muted-foreground">
                                    {t.fields?.length || 0} campos · {t.is_default ? '★ Predefinido' : 'Pessoal'}
                                </p>
                            </div>
                            {/* Fields preview */}
                            <div className="hidden sm:flex gap-1">
                                {(t.fields || []).slice(0, 3).map((f: any, i: number) => (
                                    <span key={i} className="text-[10px] bg-muted text-muted-foreground rounded px-1.5 py-0.5">{f.subtitulo}</span>
                                ))}
                            </div>
                            {deleteConfirm === t.id ? (
                                <div className="flex gap-1">
                                    <button onClick={async () => { await catalogService.deleteTemplate(t.id); setDeleteConfirm(null); load(); }} className="text-xs bg-red-900/40 text-red-400 rounded px-2 py-1">Eliminar</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-muted text-muted-foreground rounded px-2 py-1">Cancelar</button>
                                </div>
                            ) : (
                                <button onClick={() => setDeleteConfirm(t.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-500 transition-all">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =====================================================
// STATUSES MANAGER (read + edit nome/emoji)
// =====================================================
function StatusesManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ nome: '', emoji: '' });
    const [saving, setSaving] = useState(false);

    const load = useCallback(async () => {
        try { setLoading(true); setItems(await catalogService.getWorkStatuses()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleSave = async () => {
        if (!editingId) return;
        try { setSaving(true); await catalogService.updateWorkStatus(editingId, editForm); setEditingId(null); load(); }
        catch (e) { console.error(e); } finally { setSaving(false); }
    };

    // Group by categoria
    const grouped = items.reduce<Record<string, any[]>>((acc, item) => {
        const cat = item.categoria || 'outro';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(item);
        return acc;
    }, {});

    const CAT_LABELS: Record<string, string> = {
        logistica: '📦 Logística',
        producao: '🔧 Produção',
        componentes: '🧩 Componentes',
        comunicacao: '💬 Comunicação',
        avaliacao: '📋 Avaliação',
        billing: '💰 Billing',
    };

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-gray-500">
                    {items.length} estados definidos — pode editar nomes e emojis, mas não adicionar/remover
                </span>
            </div>

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="p-4 space-y-5">
                    {Object.entries(grouped).map(([cat, statuses]) => (
                        <div key={cat}>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                {CAT_LABELS[cat] || cat}
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                                {statuses.map(item => (
                                    <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group">
                                        {editingId === item.id ? (
                                            <>
                                                <input type="text" value={editForm.emoji} onChange={e => setEditForm({ ...editForm, emoji: e.target.value })} className="w-10 text-center text-sm border border-gray-200 rounded py-1" />
                                                <input type="text" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className="flex-1 text-sm border border-border rounded px-2 bg-muted text-card-foreground py-1" />
                                                <button onClick={handleSave} disabled={saving} className="p-1 bg-green-900/40 text-green-400 rounded"><Save className="h-3 w-3" /></button>
                                                <button onClick={() => setEditingId(null)} className="p-1 bg-muted text-muted-foreground rounded"><X className="h-3 w-3" /></button>
                                            </>
                                        ) : (
                                            <>
                                                <span className="text-base flex-shrink-0 w-6 text-center">{item.emoji}</span>
                                                <span className="text-sm text-gray-700 flex-1">{item.nome}</span>
                                                <span className="text-[10px] text-card-foreground/80 font-mono">#{item.ordem}</span>
                                                <button
                                                    onClick={() => { setEditingId(item.id); setEditForm({ nome: item.nome || '', emoji: item.emoji || '' }); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-blue-500 transition-all"
                                                >
                                                    <Edit3 className="h-3 w-3" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// =====================================================
// SUPPLIERS MANAGER (Fornecedores — cards ricos)
// =====================================================
function SuppliersManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ nome: '', razao_social: '', nif: '', website: '', iban: '', telefone: '', morada: '', localidade: '', cor: '#3b82f6' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<any>({});
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await catalogService.getSuppliers();
            setItems(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.nome.trim()) return;
        try {
            setSaving(true);
            await catalogService.createSupplier(addForm);
            setAddForm({ nome: '', razao_social: '', nif: '', website: '', iban: '', telefone: '', morada: '', localidade: '', cor: '#3b82f6' });
            setShowAdd(false);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            setSaving(true);
            await catalogService.updateSupplier(editingId, editForm);
            setEditingId(null);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const filtered = items.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.razao_social || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> A carregar fornecedores...</div>;

    return (
        <div className="space-y-4">
            {/* Toolbar */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Filtrar por nome..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Adicionar
                </button>
            </div>

            {/* Add Form */}
            {showAdd && (
                <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <input value={addForm.nome} onChange={e => setAddForm({ ...addForm, nome: e.target.value })} placeholder="Nome *" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.razao_social} onChange={e => setAddForm({ ...addForm, razao_social: e.target.value })} placeholder="Razão Social" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.nif} onChange={e => setAddForm({ ...addForm, nif: e.target.value })} placeholder="NIF" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.website} onChange={e => setAddForm({ ...addForm, website: e.target.value })} placeholder="Website" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.telefone} onChange={e => setAddForm({ ...addForm, telefone: e.target.value })} placeholder="Telefone" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.iban} onChange={e => setAddForm({ ...addForm, iban: e.target.value })} placeholder="IBAN" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.morada} onChange={e => setAddForm({ ...addForm, morada: e.target.value })} placeholder="Morada" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                        <input value={addForm.localidade} onChange={e => setAddForm({ ...addForm, localidade: e.target.value })} placeholder="Localidade" className="px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Guardar
                        </button>
                        <button onClick={() => setShowAdd(false)} className="px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg hover:bg-muted/80">Cancelar</button>
                    </div>
                </div>
            )}

            {/* Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filtered.map(item => (
                    <div key={item.id} className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors">
                        {editingId === item.id ? (
                            <div className="space-y-3">
                                <input value={editForm.nome || ''} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} placeholder="Nome" className="w-full px-3 py-2 text-sm bg-muted border border-border rounded-lg font-medium" />
                                <input value={editForm.razao_social || ''} onChange={e => setEditForm({ ...editForm, razao_social: e.target.value })} placeholder="Razão Social" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <input value={editForm.nif || ''} onChange={e => setEditForm({ ...editForm, nif: e.target.value })} placeholder="NIF" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <input value={editForm.website || ''} onChange={e => setEditForm({ ...editForm, website: e.target.value })} placeholder="Website" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <input value={editForm.telefone || ''} onChange={e => setEditForm({ ...editForm, telefone: e.target.value })} placeholder="Telefone" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <input value={editForm.iban || ''} onChange={e => setEditForm({ ...editForm, iban: e.target.value })} placeholder="IBAN" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <input value={editForm.morada || ''} onChange={e => setEditForm({ ...editForm, morada: e.target.value })} placeholder="Morada" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <input value={editForm.localidade || ''} onChange={e => setEditForm({ ...editForm, localidade: e.target.value })} placeholder="Localidade" className="w-full px-3 py-1.5 text-xs bg-muted border border-border rounded-lg" />
                                <div className="flex gap-2">
                                    <button onClick={handleSave} disabled={saving} className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg">
                                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Guardar
                                    </button>
                                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-xs bg-muted text-muted-foreground rounded-lg">Cancelar</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold text-card-foreground">{item.nome}</h3>
                                    <div className="flex gap-1">
                                        <button onClick={() => { setEditingId(item.id); setEditForm(item); }} className="p-1.5 text-muted-foreground hover:text-primary rounded-lg hover:bg-muted">
                                            <Edit3 className="h-3.5 w-3.5" />
                                        </button>
                                        {deleteConfirm === item.id ? (
                                            <div className="flex gap-1">
                                                <button onClick={async () => { await catalogService.deleteSupplier(item.id); setDeleteConfirm(null); load(); }} className="p-1.5 bg-destructive/20 text-destructive rounded text-xs">Sim</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="p-1.5 bg-muted text-muted-foreground rounded text-xs">Não</button>
                                            </div>
                                        ) : (
                                            <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive rounded-lg hover:bg-muted">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                {item.razao_social && <p className="text-xs text-muted-foreground mb-2">{item.razao_social}</p>}
                                <div className="space-y-1.5 text-xs text-muted-foreground">
                                    {item.nif && <div className="flex items-center gap-2"><span className="font-medium text-card-foreground/70">NIF:</span> {item.nif}</div>}
                                    {item.website && (
                                        <div className="flex items-center gap-2">
                                            <Globe className="h-3 w-3 text-primary" />
                                            <a href={item.website.startsWith('http') ? item.website : `https://${item.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline truncate">
                                                {item.website}
                                            </a>
                                            <ExternalLink className="h-2.5 w-2.5 text-primary/50" />
                                        </div>
                                    )}
                                    {item.telefone && (
                                        <div className="flex items-center gap-2"><Phone className="h-3 w-3" /> {item.telefone}</div>
                                    )}
                                    {item.morada && (
                                        <div className="flex items-center gap-2"><MapPin className="h-3 w-3" /> {item.morada}{item.localidade ? `, ${item.localidade}` : ''}</div>
                                    )}
                                    {item.iban && <div className="flex items-center gap-2"><span className="font-medium text-card-foreground/70">IBAN:</span> {item.iban.substring(0, 12)}...</div>}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            {filtered.length === 0 && !showAdd && (
                <div className="text-center py-8 text-muted-foreground text-sm">Nenhum fornecedor encontrado</div>
            )}
        </div>
    );
}

// =====================================================
// BRANDS MANAGER (Marcas — lista simples)
// =====================================================
function BrandsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [newBrand, setNewBrand] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await catalogService.getBrands();
            setItems(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!newBrand.trim()) return;
        try {
            setSaving(true);
            await catalogService.createBrand(newBrand.trim());
            setNewBrand('');
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleSave = async () => {
        if (!editingId || !editName.trim()) return;
        try {
            setSaving(true);
            await catalogService.updateBrand(editingId, { nome: editName.trim() });
            setEditingId(null);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const filtered = items.filter(b => b.nome.toLowerCase().includes(searchTerm.toLowerCase()));

    if (loading) return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> A carregar marcas...</div>;

    return (
        <div className="space-y-4">
            {/* Add + Search */}
            <div className="flex items-center gap-3">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        placeholder="Filtrar marcas..."
                        className="w-full pl-9 pr-3 py-2 text-sm bg-muted border border-border rounded-lg focus:ring-2 focus:ring-primary/30"
                    />
                </div>
                <input
                    value={newBrand}
                    onChange={e => setNewBrand(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    placeholder="+ Nova marca"
                    className="px-3 py-2 text-sm bg-muted border border-border rounded-lg w-48"
                />
                <button onClick={handleAdd} disabled={saving || !newBrand.trim()} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Adicionar
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2">
                {filtered.map(item => (
                    <div key={item.id} className="flex items-center justify-between px-3 py-2.5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group">
                        {editingId === item.id ? (
                            <div className="flex items-center gap-2 w-full">
                                <input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded" autoFocus />
                                <button onClick={handleSave} className="p-1 text-primary"><Save className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm text-card-foreground font-medium truncate">{item.nome}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingId(item.id); setEditName(item.nome); }} className="p-1 text-muted-foreground hover:text-primary"><Edit3 className="h-3 w-3" /></button>
                                    {deleteConfirm === item.id ? (
                                        <div className="flex gap-1">
                                            <button onClick={async () => { await catalogService.deleteBrand(item.id); setDeleteConfirm(null); load(); }} className="p-1 text-destructive text-xs">✓</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="p-1 text-muted-foreground text-xs">✗</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirm(item.id)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-3 w-3" /></button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>

            <p className="text-xs text-muted-foreground">{filtered.length} marcas</p>
        </div>
    );
}

// =====================================================
// PRODUCTION PHASES MANAGER (Fases de Produção)
// =====================================================
function ProductionPhasesManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ nome: '', cor: '#6366f1' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ nome: '', cor: '' });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await catalogService.getProductionPhases();
            setItems(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.nome.trim()) return;
        try {
            setSaving(true);
            await catalogService.createProductionPhase(addForm);
            setAddForm({ nome: '', cor: '#6366f1' });
            setShowAdd(false);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleSave = async () => {
        if (!editingId) return;
        try {
            setSaving(true);
            await catalogService.updateProductionPhase(editingId, editForm);
            setEditingId(null);
            load();
        } catch (e) { console.error(e); } finally { setSaving(false); }
    };

    if (loading) return <div className="flex items-center gap-2 text-muted-foreground py-8"><Loader2 className="h-4 w-4 animate-spin" /> A carregar fases...</div>;

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-3">
                <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Nova Fase
                </button>
                <span className="text-xs text-muted-foreground">{items.length} fases de produção</span>
            </div>

            {showAdd && (
                <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-3">
                    <input value={addForm.nome} onChange={e => setAddForm({ ...addForm, nome: e.target.value })} placeholder="Nome da fase" className="flex-1 px-3 py-2 text-sm bg-muted border border-border rounded-lg" />
                    <input type="color" value={addForm.cor} onChange={e => setAddForm({ ...addForm, cor: e.target.value })} className="w-10 h-10 rounded-lg border border-border cursor-pointer" />
                    <button onClick={handleAdd} disabled={saving} className="flex items-center gap-1 px-3 py-2 text-sm bg-primary text-primary-foreground rounded-lg">
                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Guardar
                    </button>
                    <button onClick={() => setShowAdd(false)} className="px-3 py-2 text-sm bg-muted text-muted-foreground rounded-lg">Cancelar</button>
                </div>
            )}

            <div className="space-y-1.5">
                {items.map((item, idx) => (
                    <div key={item.id} className="flex items-center gap-3 px-4 py-2.5 bg-card border border-border rounded-lg hover:border-primary/30 transition-colors group">
                        <span className="text-xs text-muted-foreground font-mono w-6">#{idx + 1}</span>
                        <div className="w-4 h-4 rounded-full border border-border/50 flex-shrink-0" style={{ backgroundColor: item.cor }} />

                        {editingId === item.id ? (
                            <div className="flex items-center gap-2 flex-1">
                                <input value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className="flex-1 px-2 py-1 text-sm bg-muted border border-border rounded" autoFocus />
                                <input type="color" value={editForm.cor} onChange={e => setEditForm({ ...editForm, cor: e.target.value })} className="w-8 h-8 rounded cursor-pointer" />
                                <button onClick={handleSave} disabled={saving} className="p-1.5 text-primary"><Save className="h-3.5 w-3.5" /></button>
                                <button onClick={() => setEditingId(null)} className="p-1.5 text-muted-foreground"><X className="h-3.5 w-3.5" /></button>
                            </div>
                        ) : (
                            <>
                                <span className="text-sm text-card-foreground font-medium flex-1">{item.nome}</span>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => { setEditingId(item.id); setEditForm({ nome: item.nome, cor: item.cor || '#6366f1' }); }} className="p-1.5 text-muted-foreground hover:text-primary">
                                        <Edit3 className="h-3.5 w-3.5" />
                                    </button>
                                    {deleteConfirm === item.id ? (
                                        <div className="flex gap-1">
                                            <button onClick={async () => { await catalogService.deleteProductionPhase(item.id); setDeleteConfirm(null); load(); }} className="p-1.5 text-destructive text-xs font-bold">Sim</button>
                                            <button onClick={() => setDeleteConfirm(null)} className="p-1.5 text-muted-foreground text-xs">Não</button>
                                        </div>
                                    ) : (
                                        <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive">
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}


// =====================================================
// GENERAL SETTINGS MANAGER (Definições Gerais)
// =====================================================

function GeneralSettingsManager() {
    const [thresholds, setThresholds] = useState<QueueWaitThresholds>({ amber_days: 1, red_days: 3 });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        settingsService.getQueueThresholds()
            .then(setThresholds)
            .catch(err => console.error('Erro ao carregar thresholds:', err))
            .finally(() => setLoading(false));
    }, []);

    const handleSave = async () => {
        if (thresholds.amber_days >= thresholds.red_days) return;
        setSaving(true);
        setSaved(false);
        try {
            await settingsService.setQueueThresholds(thresholds);
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (err) {
            console.error('Erro ao guardar thresholds:', err);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-2 py-8 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">A carregar definições...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Secção: Fila de Pedidos */}
            <div className="bg-muted/50 border border-border rounded-xl p-5">
                <h3 className="text-base font-semibold text-card-foreground flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-amber-500" />
                    Badge &quot;Dias em Espera&quot; — Fila de Pedidos
                </h3>
                <p className="text-xs text-muted-foreground mb-5">
                    Controla quando o badge de tempo muda de cor nos cards da Fila de Pedidos.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Âmbar threshold */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-500" />
                            Âmbar após (dias)
                        </label>
                        <input
                            type="number"
                            min={0}
                            max={thresholds.red_days - 1}
                            value={thresholds.amber_days}
                            onChange={e => setThresholds({ ...thresholds, amber_days: Math.max(0, parseInt(e.target.value) || 0) })}
                            className="w-full h-10 px-3 rounded-lg border border-border bg-muted text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-400"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Card fica âmbar após {thresholds.amber_days} dia{thresholds.amber_days !== 1 ? 's' : ''} de espera
                        </p>
                    </div>

                    {/* Vermelho threshold */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground flex items-center gap-2">
                            <span className="inline-block w-2.5 h-2.5 rounded-full bg-red-500" />
                            Vermelho após (dias)
                        </label>
                        <input
                            type="number"
                            min={thresholds.amber_days + 1}
                            value={thresholds.red_days}
                            onChange={e => setThresholds({ ...thresholds, red_days: Math.max(thresholds.amber_days + 1, parseInt(e.target.value) || thresholds.amber_days + 1) })}
                            className="w-full h-10 px-3 rounded-lg border border-border bg-muted text-card-foreground text-sm focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
                        />
                        <p className="text-[10px] text-muted-foreground">
                            Card fica vermelho após {thresholds.red_days} dia{thresholds.red_days !== 1 ? 's' : ''} de espera
                        </p>
                    </div>
                </div>

                {/* Selectores de cor */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    {/* Cor aviso */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Cor do aviso (nível 1)</label>
                        <div className="flex flex-wrap gap-1.5">
                            {BADGE_COLOR_OPTIONS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setThresholds({ ...thresholds, warn_color: c.id })}
                                    className={`w-7 h-7 rounded-lg ${c.dot} border-2 transition-all ${(thresholds.warn_color || 'amber') === c.id ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Cor perigo */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-medium text-muted-foreground">Cor de perigo (nível 2)</label>
                        <div className="flex flex-wrap gap-1.5">
                            {BADGE_COLOR_OPTIONS.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setThresholds({ ...thresholds, danger_color: c.id })}
                                    className={`w-7 h-7 rounded-lg ${c.dot} border-2 transition-all ${(thresholds.danger_color || 'red') === c.id ? 'border-white scale-110 ring-2 ring-white/30' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                    title={c.label}
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Validação */}
                {thresholds.amber_days >= thresholds.red_days && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-red-400">
                        <AlertCircle className="h-3.5 w-3.5" />
                        O valor âmbar deve ser inferior ao vermelho
                    </div>
                )}

                <div className="mt-4 p-3 bg-card rounded-lg border border-border">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-medium">Pré-visualização</p>
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border border-border font-medium">
                            &lt;{thresholds.amber_days}d → Cinza
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getBadgeClasses(thresholds.warn_color || 'amber')}`}>
                            {thresholds.amber_days}d – {thresholds.red_days}d → {BADGE_COLOR_OPTIONS.find(c => c.id === (thresholds.warn_color || 'amber'))?.label || 'Aviso'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${getBadgeClasses(thresholds.danger_color || 'red')}`}>
                            &gt;{thresholds.red_days}d → {BADGE_COLOR_OPTIONS.find(c => c.id === (thresholds.danger_color || 'red'))?.label || 'Perigo'}
                        </span>
                    </div>
                </div>

                {/* Actions */}
                <div className="mt-4 flex items-center gap-3">
                    <button
                        onClick={handleSave}
                        disabled={saving || thresholds.amber_days >= thresholds.red_days}
                        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                        Guardar
                    </button>
                    {saved && (
                        <span className="text-xs text-emerald-400 flex items-center gap-1 animate-in fade-in">
                            ✅ Guardado com sucesso
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}
