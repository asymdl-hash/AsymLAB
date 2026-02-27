'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    HardDrive,
    Clock,
    FolderOpen,
    Play,
    RefreshCw,
    CheckCircle2,
    XCircle,
    AlertTriangle,
    Save,
    Loader2,
    Calendar,
    Database,
    Trash2,
    Settings2,
    ChevronDown,
    Zap,
    Archive
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import BackupWizard from './BackupWizard';

interface BackupConfig {
    base_path: string;
    retention_days: number;
    default_mode: string;
    full_backup_interval_days: number;
    schedule_time: string;
    schedule_enabled: boolean;
    tables: string[];
}

interface BackupEntry {
    folder: string;
    timestamp: string;
    date: string;
    type?: string;
    status: string;
    total_rows: number;
    tables_ok: number;
    tables_failed: number;
    tables_unchanged?: number;
    duration_ms: number;
    trigger?: string;
    base_backup?: string;
    since?: string;
    mode_reason?: string;
}

interface BackupStats {
    total_backups: number;
    total_full: number;
    total_incremental: number;
    total_size_bytes: number;
    total_size_display: string;
}

export default function BackupSettings() {
    const [config, setConfig] = useState<BackupConfig | null>(null);
    const [backups, setBackups] = useState<BackupEntry[]>([]);
    const [stats, setStats] = useState<BackupStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [backingUp, setBackingUp] = useState(false);
    const [backupResult, setBackupResult] = useState<string | null>(null);
    const [hasChanges, setHasChanges] = useState(false);
    const [showWizard, setShowWizard] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Campos editáveis
    const [editPath, setEditPath] = useState('');
    const [editRetention, setEditRetention] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editEnabled, setEditEnabled] = useState(true);
    const [editMode, setEditMode] = useState('auto');
    const [editFullInterval, setEditFullInterval] = useState('7');

    const loadConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/backup/config');
            if (!res.ok) throw new Error('Erro ao carregar configuração');
            const data = await res.json();

            setConfig(data.config);
            setBackups(data.backups || []);
            setStats(data.stats);

            setEditPath(data.config.base_path);
            setEditRetention(String(data.config.retention_days));
            setEditTime(data.config.schedule_time);
            setEditEnabled(data.config.schedule_enabled);
            setEditMode(data.config.default_mode || 'auto');
            setEditFullInterval(String(data.config.full_backup_interval_days || 7));
        } catch (err) {
            console.error('Erro ao carregar backup config:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Fechar dropdown ao clicar fora
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Detectar mudanças
    useEffect(() => {
        if (!config) return;
        const changed =
            editPath !== config.base_path ||
            editRetention !== String(config.retention_days) ||
            editTime !== config.schedule_time ||
            editEnabled !== config.schedule_enabled ||
            editMode !== (config.default_mode || 'auto') ||
            editFullInterval !== String(config.full_backup_interval_days || 7);
        setHasChanges(changed);
    }, [editPath, editRetention, editTime, editEnabled, editMode, editFullInterval, config]);

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/backup/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    base_path: editPath,
                    retention_days: parseInt(editRetention),
                    schedule_time: editTime,
                    schedule_enabled: editEnabled,
                    default_mode: editMode,
                    full_backup_interval_days: parseInt(editFullInterval),
                }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setHasChanges(false);
            loadConfig();
        } catch (err: any) {
            alert('Erro ao guardar: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleBackupNow = async (mode?: string) => {
        setBackingUp(true);
        setBackupResult(null);
        setShowDropdown(false);
        try {
            const res = await fetch('/api/backup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ mode: mode || undefined }),
            });
            const data = await res.json();

            if (data.success) {
                const typeLabel = data.type === 'full' ? '🗄️ FULL' : '⚡ INCR';
                setBackupResult(`✅ ${typeLabel} — ${data.message}`);
                loadConfig();
            } else {
                setBackupResult(`❌ ${data.error}`);
            }
        } catch (err: any) {
            setBackupResult(`❌ Erro: ${err.message}`);
        } finally {
            setBackingUp(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    if (showWizard) {
        return (
            <BackupWizard
                onComplete={() => { setShowWizard(false); loadConfig(); }}
                onCancel={() => setShowWizard(false)}
            />
        );
    }

    const modeLabels: Record<string, string> = {
        auto: 'Automático',
        full: 'Sempre Full',
        incremental: 'Sempre Incremental'
    };

    const modeDescriptions: Record<string, string> = {
        auto: 'Decide automaticamente: FULL se não houver base ou a cada N dias, INCREMENTAL para o resto',
        full: 'Faz sempre backup completo de todas as tabelas',
        incremental: 'Exporta apenas dados alterados desde o último backup'
    };

    return (
        <div className="space-y-8">
            {/* ====== HEADER ====== */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-white">Backup Local</h3>
                        <p className="text-sm text-gray-500">Redundância dos dados do Supabase</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowWizard(true)}
                        className="gap-2 text-muted-foreground"
                    >
                        <Settings2 className="h-4 w-4" />
                        Reconfigurar
                    </Button>

                    {/* Botão Backup com Dropdown */}
                    <div className="relative" ref={dropdownRef}>
                        <div className="flex">
                            <Button
                                onClick={() => handleBackupNow()}
                                disabled={backingUp}
                                className="bg-primary hover:bg-primary/90 text-foreground gap-2 rounded-r-none"
                            >
                                {backingUp ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4" />
                                )}
                                {backingUp ? 'A fazer backup...' : 'Backup Agora'}
                            </Button>
                            <Button
                                onClick={() => setShowDropdown(!showDropdown)}
                                disabled={backingUp}
                                className="bg-primary hover:bg-primary/90 text-foreground rounded-l-none border-l border-white/20 px-2"
                            >
                                <ChevronDown className="h-4 w-4" />
                            </Button>
                        </div>

                        {showDropdown && (
                            <div className="absolute right-0 mt-1 w-56 bg-muted rounded-lg shadow-lg border border-border z-50 py-1">
                                <button
                                    onClick={() => handleBackupNow('auto')}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                                >
                                    <Zap className="h-4 w-4 text-amber-500" />
                                    <div>
                                        <p className="font-medium text-foreground/80">Auto</p>
                                        <p className="text-[11px] text-muted-foreground">Decide automaticamente</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleBackupNow('full')}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                                >
                                    <Archive className="h-4 w-4 text-blue-500" />
                                    <div>
                                        <p className="font-medium text-foreground/80">Forçar Full</p>
                                        <p className="text-[11px] text-muted-foreground">Backup completo de tudo</p>
                                    </div>
                                </button>
                                <button
                                    onClick={() => handleBackupNow('incremental')}
                                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-muted flex items-center gap-2"
                                >
                                    <Zap className="h-4 w-4 text-emerald-500" />
                                    <div>
                                        <p className="font-medium text-foreground/80">Forçar Incremental</p>
                                        <p className="text-[11px] text-muted-foreground">Só dados alterados</p>
                                    </div>
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Resultado do backup manual */}
            {backupResult && (
                <div className={cn(
                    "p-4 rounded-lg border text-sm",
                    backupResult.startsWith('✅')
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : "bg-red-50 border-red-200 text-red-700"
                )}>
                    {backupResult}
                </div>
            )}

            {/* ====== STATS CARDS ====== */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Total</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.total_backups}</p>
                        <p className="text-[11px] text-muted-foreground mt-1">
                            <span className="text-blue-500 font-medium">{stats.total_full}</span> Full · <span className="text-emerald-500 font-medium">{stats.total_incremental}</span> Incr
                        </p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Espaço</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{stats.total_size_display}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Tabelas</span>
                        </div>
                        <p className="text-2xl font-bold text-white">{config?.tables.length || 0}</p>
                    </div>
                    <div className="bg-muted rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Zap className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Modo</span>
                        </div>
                        <p className="text-lg font-bold text-white">{modeLabels[editMode] || 'Auto'}</p>
                    </div>
                </div>
            )}

            {/* ====== CONFIGURAÇÕES ====== */}
            <div className="bg-card rounded-lg border border-border p-6 space-y-6">
                <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
                    Configuração
                </h4>

                {/* Diretório */}
                <div className="space-y-2">
                    <Label htmlFor="backup-path" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        Diretório de Backup
                    </Label>
                    <Input
                        id="backup-path"
                        value={editPath}
                        onChange={(e) => setEditPath(e.target.value)}
                        placeholder="F:\AsymLAB\DB\Supabase"
                        className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                        💡 Para migrar para NAS, altere para o caminho de rede (ex: \\NAS\AsymLAB\DB\Supabase)
                    </p>
                </div>

                {/* Modo de Backup */}
                <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                        <Zap className="h-4 w-4 text-muted-foreground" />
                        Modo de Backup
                    </Label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {(['auto', 'full', 'incremental'] as const).map((mode) => (
                            <button
                                key={mode}
                                onClick={() => setEditMode(mode)}
                                className={cn(
                                    "p-3 rounded-lg border text-left transition-all",
                                    editMode === mode
                                        ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                                        : "border-gray-200 hover:border-gray-300 bg-gray-50"
                                )}
                            >
                                <p className={cn(
                                    "text-sm font-medium",
                                    editMode === mode ? "text-primary" : "text-foreground/80"
                                )}>
                                    {modeLabels[mode]}
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">
                                    {modeDescriptions[mode]}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Horário + Retenção + Intervalo Full (grid) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="backup-time" className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            Horário Diário
                        </Label>
                        <Input
                            id="backup-time"
                            type="time"
                            value={editTime}
                            onChange={(e) => setEditTime(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="backup-retention" className="flex items-center gap-2">
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                            Retenção (dias)
                        </Label>
                        <Input
                            id="backup-retention"
                            type="number"
                            min={1}
                            max={365}
                            value={editRetention}
                            onChange={(e) => setEditRetention(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">Backups mais antigos são eliminados</p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="full-interval" className="flex items-center gap-2">
                            <Archive className="h-4 w-4 text-muted-foreground" />
                            Intervalo FULL (dias)
                        </Label>
                        <Input
                            id="full-interval"
                            type="number"
                            min={1}
                            max={30}
                            value={editFullInterval}
                            onChange={(e) => setEditFullInterval(e.target.value)}
                            disabled={editMode === 'full'}
                        />
                        <p className="text-xs text-muted-foreground">
                            {editMode === 'full'
                                ? 'Sempre FULL — intervalo não se aplica'
                                : 'Consolida com FULL a cada N dias'}
                        </p>
                    </div>
                </div>

                {/* Ativar/Desativar */}
                <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                        <p className="text-sm font-medium text-foreground/80">Backup automático diário</p>
                        <p className="text-xs text-muted-foreground">Executa backup todos os dias no horário definido</p>
                    </div>
                    <button
                        onClick={() => setEditEnabled(!editEnabled)}
                        className={cn(
                            "relative w-12 h-6 rounded-full transition-colors duration-200",
                            editEnabled ? "bg-primary" : "bg-gray-300"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 bg-muted rounded-full shadow transition-transform duration-200",
                            editEnabled ? "translate-x-6" : "translate-x-0"
                        )} />
                    </button>
                </div>

                {/* Botão Guardar */}
                {hasChanges && (
                    <div className="flex justify-end pt-2">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-primary hover:bg-primary/90 text-foreground gap-2"
                        >
                            {saving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Save className="h-4 w-4" />
                            )}
                            Guardar Alterações
                        </Button>
                    </div>
                )}
            </div>

            {/* ====== TABELAS MONITORIZADAS ====== */}
            <div className="bg-card rounded-lg border border-border p-6">
                <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider mb-4">
                    Tabelas Monitorizadas
                </h4>
                <div className="flex flex-wrap gap-2">
                    {config?.tables.map((table) => (
                        <span
                            key={table}
                            className="px-3 py-1.5 bg-gray-700 text-muted-foreground rounded-lg text-xs font-mono"
                        >
                            {table}
                        </span>
                    ))}
                </div>
            </div>

            {/* ====== HISTÓRICO ====== */}
            <div className="bg-card rounded-lg border border-border p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-foreground/80 uppercase tracking-wider">
                        Histórico de Backups
                    </h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadConfig}
                        className="text-muted-foreground hover:text-muted-foreground gap-1"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Atualizar
                    </Button>
                </div>

                {backups.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">
                        Nenhum backup registado ainda
                    </div>
                ) : (
                    <div className="space-y-2">
                        {backups.map((backup, i) => {
                            const isIncremental = backup.type === 'incremental' || backup.folder.startsWith('INCR_');
                            const isFull = backup.type === 'full' || backup.folder.startsWith('FULL_');

                            return (
                                <div
                                    key={backup.folder}
                                    className={cn(
                                        "flex items-center justify-between p-3 rounded-lg border transition-colors",
                                        i === 0 ? "bg-primary/5 border-primary/20" : "bg-gray-50 border-gray-100"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        {backup.status === 'success' ? (
                                            <CheckCircle2 className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                                        ) : backup.status === 'partial' ? (
                                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                        ) : (
                                            <XCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                        )}
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-sm font-medium text-foreground/80">
                                                    {backup.timestamp
                                                        ? new Date(backup.timestamp).toLocaleString('pt-PT')
                                                        : backup.folder}
                                                </p>
                                                {/* Badge FULL/INCR */}
                                                {isFull && (
                                                    <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[10px] font-bold uppercase">
                                                        FULL
                                                    </span>
                                                )}
                                                {isIncremental && (
                                                    <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px] font-bold uppercase">
                                                        INCR
                                                    </span>
                                                )}
                                                {backup.trigger === 'manual' && (
                                                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 rounded text-[10px] uppercase">
                                                        Manual
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {isIncremental ? (
                                                    <>
                                                        {backup.total_rows} alterações ·{' '}
                                                        {backup.tables_ok} com mudanças ·{' '}
                                                        {backup.tables_unchanged || 0} sem alterações
                                                    </>
                                                ) : (
                                                    <>
                                                        {backup.total_rows} registos ·{' '}
                                                        {backup.tables_ok}/{(backup.tables_ok || 0) + (backup.tables_failed || 0)} tabelas
                                                    </>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-xs text-muted-foreground font-mono">
                                        {backup.duration_ms ? `${backup.duration_ms}ms` : '—'}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
