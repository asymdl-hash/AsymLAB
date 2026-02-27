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
} from 'lucide-react';
import { catalogService } from '@/services/catalogService';
import { considerationsService } from '@/services/considerationsService';

// ===== SUB-TAB CONFIG =====
type CatalogTab = 'work_types' | 'materials' | 'tooth_colors' | 'templates' | 'statuses';

const CATALOG_TABS: { id: CatalogTab; label: string; icon: React.ElementType; description: string }[] = [
    { id: 'work_types', label: 'Tipos de Trabalho', icon: Briefcase, description: 'Prótese fixa, removível, implantes, etc.' },
    { id: 'materials', label: 'Materiais', icon: Database, description: 'Zircónia, PMMA, dissilicato, etc.' },
    { id: 'tooth_colors', label: 'Cores de Dentes', icon: Palette, description: 'Escala VITA, cores personalizadas' },
    { id: 'templates', label: 'Templates Considerações', icon: FileText, description: 'Templates predefinidos para considerações' },
    { id: 'statuses', label: 'Status Trabalhos', icon: Activity, description: 'Os 33 estados do fluxo de trabalho' },
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
                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300 hover:text-gray-700'
                                }`}
                        >
                            <Icon className="h-4 w-4" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Description */}
            <p className="text-sm text-gray-400">
                {CATALOG_TABS.find(t => t.id === activeTab)?.description}
            </p>

            {/* Content */}
            {activeTab === 'work_types' && <WorkTypesManager />}
            {activeTab === 'materials' && <MaterialsManager />}
            {activeTab === 'tooth_colors' && <ToothColorsManager />}
            {activeTab === 'templates' && <TemplatesManager />}
            {activeTab === 'statuses' && <StatusesManager />}
        </div>
    );
}

// =====================================================
// WORK TYPES MANAGER
// =====================================================
function WorkTypesManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ nome: '', cor: '', categoria: '' });
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ nome: '', cor: '#6366f1', categoria: 'geral' });
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setLoading(true); setItems(await catalogService.getWorkTypes()); }
        catch (e) { console.error(e); }
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

    const handleSave = async () => {
        if (!editingId || !editForm.nome.trim()) return;
        try {
            setSaving(true);
            await catalogService.updateWorkType(editingId, editForm);
            setEditingId(null);
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

    const filtered = items.filter(i => i.nome.toLowerCase().includes(search.toLowerCase()));

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Pesquisar..."
                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-primary/50"
                    />
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                    <Plus className="h-4 w-4" />
                    Adicionar
                </button>
            </div>

            {/* Add form */}
            {showAdd && (
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
                    <input
                        type="text"
                        value={addForm.nome}
                        onChange={e => setAddForm({ ...addForm, nome: e.target.value })}
                        placeholder="Nome do tipo..."
                        className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-primary/50"
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
                        className="text-sm border border-gray-200 rounded-lg px-3 py-2"
                    >
                        <option value="geral">Geral</option>
                        <option value="fixa">Prótese Fixa</option>
                        <option value="removivel">Prótese Removível</option>
                        <option value="implante">Implante</option>
                        <option value="ortodontia">Ortodontia</option>
                        <option value="ceramica">Cerâmica</option>
                    </select>
                    <button onClick={handleAdd} disabled={saving} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Table */}
            {loading ? (
                <div className="text-center py-12 text-gray-400"><Loader2 className="h-5 w-5 mx-auto animate-spin" /></div>
            ) : filtered.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Sem registos</div>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-4 py-3">Cor</th>
                            <th className="text-left px-4 py-3">Nome</th>
                            <th className="text-left px-4 py-3">Categoria</th>
                            <th className="text-left px-4 py-3">Activo</th>
                            <th className="text-right px-4 py-3">Acções</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filtered.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                {editingId === item.id ? (
                                    <>
                                        <td className="px-4 py-3">
                                            <input type="color" value={editForm.cor} onChange={e => setEditForm({ ...editForm, cor: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <input type="text" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className="w-full text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none" />
                                        </td>
                                        <td className="px-4 py-3">
                                            <select value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} className="text-sm border border-gray-200 rounded px-2 py-1">
                                                <option value="geral">Geral</option>
                                                <option value="fixa">Prótese Fixa</option>
                                                <option value="removivel">Prótese Removível</option>
                                                <option value="implante">Implante</option>
                                                <option value="ortodontia">Ortodontia</option>
                                                <option value="ceramica">Cerâmica</option>
                                            </select>
                                        </td>
                                        <td className="px-4 py-3">—</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                                            <button onClick={handleSave} disabled={saving} className="p-1.5 bg-green-100 text-green-600 rounded hover:bg-green-200"><Save className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200"><X className="h-3.5 w-3.5" /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-3">
                                            <div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: item.cor || '#6366f1' }} />
                                        </td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
                                        <td className="px-4 py-3 text-gray-500 capitalize">{item.categoria || 'geral'}</td>
                                        <td className="px-4 py-3">
                                            <button onClick={() => toggleActive(item)} className="text-gray-400 hover:text-primary transition-colors">
                                                {item.activo ? <ToggleRight className="h-5 w-5 text-green-500" /> : <ToggleLeft className="h-5 w-5" />}
                                            </button>
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => { setEditingId(item.id); setEditForm({ nome: item.nome, cor: item.cor || '#6366f1', categoria: item.categoria || 'geral' }); }}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                                                >
                                                    <Edit3 className="h-3.5 w-3.5" />
                                                </button>
                                                {deleteConfirm === item.id ? (
                                                    <>
                                                        <button onClick={() => handleDelete(item.id)} className="p-1.5 bg-red-100 text-red-600 rounded hover:bg-red-200 text-xs">Sim</button>
                                                        <button onClick={() => setDeleteConfirm(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded hover:bg-gray-200 text-xs">Não</button>
                                                    </>
                                                ) : (
                                                    <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
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

            {/* Footer count */}
            <div className="px-4 py-2 border-t border-gray-100 text-xs text-gray-400">
                {filtered.length} registo(s) · {items.filter(i => i.activo).length} activo(s)
            </div>
        </div>
    );
}

// =====================================================
// MATERIALS MANAGER
// =====================================================
function MaterialsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ nome: '', categoria: 'ceramica', cor: '#94a3b8' });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ nome: '', categoria: '', cor: '' });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setLoading(true); setItems(await catalogService.getMaterials()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.nome.trim()) return;
        try { setSaving(true); await catalogService.createMaterial(addForm); setAddForm({ nome: '', categoria: 'ceramica', cor: '#94a3b8' }); setShowAdd(false); load(); }
        catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const handleSave = async () => {
        if (!editingId) return;
        try { setSaving(true); await catalogService.updateMaterial(editingId, editForm); setEditingId(null); load(); }
        catch (e) { console.error(e); } finally { setSaving(false); }
    };

    const CATEGORIAS = ['ceramica', 'metal', 'resina', 'composto', 'outro'];

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-sm text-gray-500">{items.length} material(is)</span>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Adicionar
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
                    <input type="text" value={addForm.nome} onChange={e => setAddForm({ ...addForm, nome: e.target.value })} placeholder="Nome do material..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" autoFocus />
                    <select value={addForm.categoria} onChange={e => setAddForm({ ...addForm, categoria: e.target.value })} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
                        {CATEGORIAS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                    </select>
                    <input type="color" value={addForm.cor} onChange={e => setAddForm({ ...addForm, cor: e.target.value })} className="w-10 h-10 rounded-lg border cursor-pointer" />
                    <button onClick={handleAdd} disabled={saving} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-gray-400" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Sem materiais registados</div>
            ) : (
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                        <tr>
                            <th className="text-left px-4 py-3">Cor</th>
                            <th className="text-left px-4 py-3">Nome</th>
                            <th className="text-left px-4 py-3">Categoria</th>
                            <th className="text-right px-4 py-3">Acções</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                                {editingId === item.id ? (
                                    <>
                                        <td className="px-4 py-3"><input type="color" value={editForm.cor} onChange={e => setEditForm({ ...editForm, cor: e.target.value })} className="w-8 h-8 rounded border cursor-pointer" /></td>
                                        <td className="px-4 py-3"><input type="text" value={editForm.nome} onChange={e => setEditForm({ ...editForm, nome: e.target.value })} className="w-full text-sm border border-gray-200 rounded px-2 py-1" /></td>
                                        <td className="px-4 py-3">
                                            <select value={editForm.categoria} onChange={e => setEditForm({ ...editForm, categoria: e.target.value })} className="text-sm border border-gray-200 rounded px-2 py-1">
                                                {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                                            <button onClick={handleSave} disabled={saving} className="p-1.5 bg-green-100 text-green-600 rounded"><Save className="h-3.5 w-3.5" /></button>
                                            <button onClick={() => setEditingId(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded"><X className="h-3.5 w-3.5" /></button>
                                        </td>
                                    </>
                                ) : (
                                    <>
                                        <td className="px-4 py-3"><div className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: item.cor || '#94a3b8' }} /></td>
                                        <td className="px-4 py-3 font-medium text-gray-900">{item.nome}</td>
                                        <td className="px-4 py-3 text-gray-500 capitalize">{item.categoria || 'geral'}</td>
                                        <td className="px-4 py-3 text-right flex justify-end gap-1">
                                            <button onClick={() => { setEditingId(item.id); setEditForm({ nome: item.nome, categoria: item.categoria || '', cor: item.cor || '#94a3b8' }); }} className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"><Edit3 className="h-3.5 w-3.5" /></button>
                                            {deleteConfirm === item.id ? (
                                                <>
                                                    <button onClick={async () => { await catalogService.deleteMaterial(item.id); setDeleteConfirm(null); load(); }} className="p-1.5 bg-red-100 text-red-600 rounded text-xs">Sim</button>
                                                    <button onClick={() => setDeleteConfirm(null)} className="p-1.5 bg-gray-100 text-gray-500 rounded text-xs">Não</button>
                                                </>
                                            ) : (
                                                <button onClick={() => setDeleteConfirm(item.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3.5 w-3.5" /></button>
                                            )}
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
}

// =====================================================
// TOOTH COLORS MANAGER
// =====================================================
function ToothColorsManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [addForm, setAddForm] = useState({ codigo: '', nome: '', grupo: 'A' });
    const [saving, setSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

    const load = useCallback(async () => {
        try { setLoading(true); setItems(await catalogService.getToothColors()); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const handleAdd = async () => {
        if (!addForm.codigo.trim() || !addForm.nome.trim()) return;
        try { setSaving(true); await catalogService.createToothColor(addForm); setAddForm({ codigo: '', nome: '', grupo: 'A' }); setShowAdd(false); load(); }
        catch (e) { console.error(e); } finally { setSaving(false); }
    };

    // Group by grupo
    const grouped = items.reduce<Record<string, any[]>>((acc, item) => {
        const g = item.grupo || 'Outro';
        if (!acc[g]) acc[g] = [];
        acc[g].push(item);
        return acc;
    }, {});

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-sm text-gray-500">{items.length} cor(es) · Escala VITA</span>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Adicionar
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center gap-3">
                    <input type="text" value={addForm.codigo} onChange={e => setAddForm({ ...addForm, codigo: e.target.value })} placeholder="Código (ex: A1)" className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" autoFocus />
                    <input type="text" value={addForm.nome} onChange={e => setAddForm({ ...addForm, nome: e.target.value })} placeholder="Nome descritivo..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" />
                    <select value={addForm.grupo} onChange={e => setAddForm({ ...addForm, grupo: e.target.value })} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
                        {['A', 'B', 'C', 'D', 'Bleach'].map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <button onClick={handleAdd} disabled={saving} className="p-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    </button>
                    <button onClick={() => setShowAdd(false)} className="p-2 text-gray-400 hover:text-gray-600"><X className="h-4 w-4" /></button>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-gray-400" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">
                    <Palette className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    Sem cores registadas
                </div>
            ) : (
                <div className="p-4 space-y-4">
                    {Object.entries(grouped).sort().map(([grupo, colors]) => (
                        <div key={grupo}>
                            <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Grupo {grupo}</h4>
                            <div className="flex flex-wrap gap-2">
                                {colors.map(c => (
                                    <div key={c.id} className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 group">
                                        <span className="text-sm font-mono font-bold text-gray-800">{c.codigo}</span>
                                        <span className="text-xs text-gray-500">{c.nome}</span>
                                        {deleteConfirm === c.id ? (
                                            <>
                                                <button onClick={async () => { await catalogService.deleteToothColor(c.id); setDeleteConfirm(null); load(); }} className="text-[10px] bg-red-100 text-red-600 rounded px-1.5 py-0.5">Sim</button>
                                                <button onClick={() => setDeleteConfirm(null)} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">Não</button>
                                            </>
                                        ) : (
                                            <button onClick={() => setDeleteConfirm(c.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                                                <Trash2 className="h-3 w-3" />
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
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <span className="text-sm text-gray-500">{items.length} template(s)</span>
                <button onClick={() => setShowAdd(true)} className="flex items-center gap-1.5 text-sm px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Plus className="h-4 w-4" /> Criar Template
                </button>
            </div>

            {showAdd && (
                <div className="p-4 bg-blue-50/50 border-b border-blue-100 space-y-3">
                    <div className="flex gap-3">
                        <input type="text" value={addForm.titulo} onChange={e => setAddForm({ ...addForm, titulo: e.target.value })} placeholder="Título do template..." className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none" autoFocus />
                        <select value={addForm.tipo} onChange={e => setAddForm({ ...addForm, tipo: e.target.value as any })} className="text-sm border border-gray-200 rounded-lg px-3 py-2">
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
                                    className="flex-1 text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none"
                                />
                                {addForm.fields.length > 1 && (
                                    <button onClick={() => setAddForm({ ...addForm, fields: addForm.fields.filter((_, j) => j !== i) })} className="text-gray-400 hover:text-red-500">
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
                        <button onClick={handleAdd} disabled={saving} className="text-sm bg-green-500 text-white rounded-lg px-4 py-1.5 hover:bg-green-600 disabled:opacity-50">
                            {saving ? 'A guardar...' : 'Criar Template'}
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-gray-400" /></div>
            ) : items.length === 0 ? (
                <div className="text-center py-12 text-gray-400 text-sm">Sem templates</div>
            ) : (
                <div className="divide-y divide-gray-100">
                    {items.map(t => (
                        <div key={t.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 group">
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${TIPO_COLORS[t.tipo as keyof typeof TIPO_COLORS] || 'bg-gray-100 text-gray-600'}`}>
                                {t.tipo}
                            </span>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900">{t.titulo}</p>
                                <p className="text-[10px] text-gray-400">
                                    {t.fields?.length || 0} campos · {t.is_default ? '★ Predefinido' : 'Pessoal'}
                                </p>
                            </div>
                            {/* Fields preview */}
                            <div className="hidden sm:flex gap-1">
                                {(t.fields || []).slice(0, 3).map((f: any, i: number) => (
                                    <span key={i} className="text-[10px] bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">{f.subtitulo}</span>
                                ))}
                            </div>
                            {deleteConfirm === t.id ? (
                                <div className="flex gap-1">
                                    <button onClick={async () => { await catalogService.deleteTemplate(t.id); setDeleteConfirm(null); load(); }} className="text-xs bg-red-100 text-red-600 rounded px-2 py-1">Eliminar</button>
                                    <button onClick={() => setDeleteConfirm(null)} className="text-xs bg-gray-100 text-gray-500 rounded px-2 py-1">Cancelar</button>
                                </div>
                            ) : (
                                <button onClick={() => setDeleteConfirm(t.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
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
// STATUSES MANAGER (read + edit labels/colors)
// =====================================================
function StatusesManager() {
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState({ label: '', cor: '' });
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

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-500" />
                <span className="text-sm text-gray-500">
                    {items.length} estados definidos — pode editar labels e cores, mas não adicionar/remover
                </span>
            </div>

            {loading ? (
                <div className="text-center py-12"><Loader2 className="h-5 w-5 mx-auto animate-spin text-gray-400" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 p-2">
                    {items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group">
                            {editingId === item.id ? (
                                <>
                                    <input type="color" value={editForm.cor} onChange={e => setEditForm({ ...editForm, cor: e.target.value })} className="w-6 h-6 rounded border cursor-pointer" />
                                    <input type="text" value={editForm.label} onChange={e => setEditForm({ ...editForm, label: e.target.value })} className="flex-1 text-sm border border-gray-200 rounded px-2 py-1" />
                                    <button onClick={handleSave} disabled={saving} className="p-1 bg-green-100 text-green-600 rounded"><Save className="h-3 w-3" /></button>
                                    <button onClick={() => setEditingId(null)} className="p-1 bg-gray-100 text-gray-500 rounded"><X className="h-3 w-3" /></button>
                                </>
                            ) : (
                                <>
                                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.cor || '#6b7280' }} />
                                    <span className="text-xs font-mono text-gray-400 w-24 truncate">{item.codigo}</span>
                                    <span className="text-sm text-gray-700 flex-1">{item.label}</span>
                                    <button
                                        onClick={() => { setEditingId(item.id); setEditForm({ label: item.label || '', cor: item.cor || '#6b7280' }); }}
                                        className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-blue-500 transition-all"
                                    >
                                        <Edit3 className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
