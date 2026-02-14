'use client';

import { useState, useEffect, useCallback } from 'react';
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
    Settings2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import BackupWizard from './BackupWizard';

interface BackupConfig {
    base_path: string;
    retention_days: number;
    schedule_time: string;
    schedule_enabled: boolean;
    tables: string[];
}

interface BackupEntry {
    folder: string;
    timestamp: string;
    date: string;
    status: string;
    total_rows: number;
    tables_ok: number;
    tables_failed: number;
    duration_ms: number;
    trigger?: string;
}

interface BackupStats {
    total_backups: number;
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

    // Campos editáveis
    const [editPath, setEditPath] = useState('');
    const [editRetention, setEditRetention] = useState('');
    const [editTime, setEditTime] = useState('');
    const [editEnabled, setEditEnabled] = useState(true);

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
        } catch (err) {
            console.error('Erro ao carregar backup config:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadConfig();
    }, [loadConfig]);

    // Detectar mudanças
    useEffect(() => {
        if (!config) return;
        const changed =
            editPath !== config.base_path ||
            editRetention !== String(config.retention_days) ||
            editTime !== config.schedule_time ||
            editEnabled !== config.schedule_enabled;
        setHasChanges(changed);
    }, [editPath, editRetention, editTime, editEnabled, config]);

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

    const handleBackupNow = async () => {
        setBackingUp(true);
        setBackupResult(null);
        try {
            const res = await fetch('/api/backup', { method: 'POST' });
            const data = await res.json();

            if (data.success) {
                setBackupResult(`✅ ${data.message}`);
                loadConfig(); // Recarregar lista
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

    // Mostrar Wizard
    if (showWizard) {
        return (
            <BackupWizard
                onComplete={() => { setShowWizard(false); loadConfig(); }}
                onCancel={() => setShowWizard(false)}
            />
        );
    }

    return (
        <div className="space-y-8">
            {/* ====== HEADER ====== */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Database className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">Backup Local</h3>
                        <p className="text-sm text-gray-500">Redundância dos dados do Supabase</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowWizard(true)}
                        className="gap-2 text-gray-600"
                    >
                        <Settings2 className="h-4 w-4" />
                        Reconfigurar
                    </Button>
                    <Button
                        onClick={handleBackupNow}
                        disabled={backingUp}
                        className="bg-primary hover:bg-primary/90 text-white gap-2"
                    >
                        {backingUp ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Play className="h-4 w-4" />
                        )}
                        {backingUp ? 'A fazer backup...' : 'Backup Agora'}
                    </Button>
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Total de Backups</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_backups}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <HardDrive className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Espaço Utilizado</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.total_size_display}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2">
                            <Database className="h-4 w-4 text-gray-400" />
                            <span className="text-xs text-gray-500 uppercase font-medium">Tabelas Monitorizadas</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{config?.tables.length || 0}</p>
                    </div>
                </div>
            )}

            {/* ====== CONFIGURAÇÕES ====== */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                    Configuração
                </h4>

                {/* Diretório */}
                <div className="space-y-2">
                    <Label htmlFor="backup-path" className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-gray-400" />
                        Diretório de Backup
                    </Label>
                    <Input
                        id="backup-path"
                        value={editPath}
                        onChange={(e) => setEditPath(e.target.value)}
                        placeholder="F:\AsymLAB\DB\Supabase"
                        className="font-mono text-sm"
                    />
                    <p className="text-xs text-gray-400">
                        💡 Para migrar para NAS, altere para o caminho de rede (ex: \\NAS\AsymLAB\DB\Supabase)
                    </p>
                </div>

                {/* Horário + Retenção (lado a lado) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="backup-time" className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-gray-400" />
                            Horário do Backup Diário
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
                            <Trash2 className="h-4 w-4 text-gray-400" />
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
                        <p className="text-xs text-gray-400">Backups mais antigos são eliminados automaticamente</p>
                    </div>
                </div>

                {/* Ativar/Desativar */}
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                        <p className="text-sm font-medium text-gray-700">Backup automático diário</p>
                        <p className="text-xs text-gray-400">Executa backup todos os dias no horário definido</p>
                    </div>
                    <button
                        onClick={() => setEditEnabled(!editEnabled)}
                        className={cn(
                            "relative w-12 h-6 rounded-full transition-colors duration-200",
                            editEnabled ? "bg-primary" : "bg-gray-300"
                        )}
                    >
                        <span className={cn(
                            "absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200",
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
                            className="bg-primary hover:bg-primary/90 text-white gap-2"
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
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider mb-4">
                    Tabelas Monitorizadas
                </h4>
                <div className="flex flex-wrap gap-2">
                    {config?.tables.map((table) => (
                        <span
                            key={table}
                            className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-mono"
                        >
                            {table}
                        </span>
                    ))}
                </div>
            </div>

            {/* ====== HISTÓRICO ====== */}
            <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
                        Histórico de Backups
                    </h4>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={loadConfig}
                        className="text-gray-400 hover:text-gray-600 gap-1"
                    >
                        <RefreshCw className="h-3.5 w-3.5" />
                        Atualizar
                    </Button>
                </div>

                {backups.length === 0 ? (
                    <div className="text-center py-8 text-gray-400 text-sm">
                        Nenhum backup registado ainda
                    </div>
                ) : (
                    <div className="space-y-2">
                        {backups.map((backup, i) => (
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
                                        <p className="text-sm font-medium text-gray-700">
                                            {backup.timestamp
                                                ? new Date(backup.timestamp).toLocaleString('pt-PT')
                                                : backup.folder}
                                        </p>
                                        <p className="text-xs text-gray-400">
                                            {backup.total_rows} registos · {backup.tables_ok}/{(backup.tables_ok || 0) + (backup.tables_failed || 0)} tabelas
                                            {backup.trigger === 'manual' && (
                                                <span className="ml-2 px-1.5 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] uppercase">Manual</span>
                                            )}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs text-gray-400 font-mono">
                                    {backup.duration_ms ? `${backup.duration_ms}ms` : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
