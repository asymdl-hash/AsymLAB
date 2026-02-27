'use client';

import { useState } from 'react';
import {
    Monitor,
    HardDrive,
    Server,
    ChevronRight,
    ChevronLeft,
    FolderOpen,
    Clock,
    Calendar,
    CheckCircle2,
    XCircle,
    Loader2,
    Play,
    Copy,
    ArrowRight,
    AlertTriangle,
    Info,
    Terminal,
    Wifi,
    X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

// ==================== TYPES ====================

type BackupMode = 'pc' | 'nas-drive' | 'nas-autonomous';
type NASBrand = 'synology' | 'qnap' | 'truenas' | 'unraid' | 'other';

interface WizardState {
    mode: BackupMode | null;
    nasBrand: NASBrand | null;
    backupPath: string;
    scheduleTime: string;
    retentionDays: number;
    pathValid: boolean | null;
    pathChecking: boolean;
    scheduleResult: any;
    backupResult: any;
    copyResult: any;
}

interface BackupWizardProps {
    onComplete: () => void;
    onCancel: () => void;
}

// ==================== NAS BRAND CONFIG ====================

const nasBrands: Record<NASBrand, {
    name: string;
    logo: string;
    nodeInstall: string;
    cronSetup: string;
    notes: string;
}> = {
    synology: {
        name: 'Synology',
        logo: '🔵',
        nodeInstall: '1. Abrir DSM → Package Center\n2. Pesquisar "Node.js"\n3. Instalar o pacote Node.js v18 ou superior\n4. Verificar: SSH → node --version',
        cronSetup: '1. Abrir DSM → Control Panel → Task Scheduler\n2. Create → Scheduled Task → User-defined Script\n3. Schedule: Daily às {TIME}\n4. Script:\n   cd /volume1/AsymLAB/scripts\n   bash run-backup.sh',
        notes: 'Ativar SSH em Control Panel → Terminal & SNMP'
    },
    qnap: {
        name: 'QNAP',
        logo: '🟢',
        nodeInstall: '1. Abrir QTS → App Center\n2. Pesquisar "Node.js"\n3. Instalar o pacote\n4. Verificar: SSH → node --version',
        cronSetup: '1. SSH para a NAS\n2. Editar crontab: crontab -e\n3. Adicionar linha:\n   {CRON} cd /share/AsymLAB/scripts && bash run-backup.sh\n4. Guardar e sair',
        notes: 'Ativar SSH em Control Panel → Network & File Services'
    },
    truenas: {
        name: 'TrueNAS',
        logo: '🔷',
        nodeInstall: '1. SSH para TrueNAS\n2. sudo pkg install node18\n3. Verificar: node --version',
        cronSetup: '1. Abrir UI Web → Tasks → Cron Jobs\n2. Add Cron Job\n3. Schedule: Daily às {TIME}\n4. Command:\n   cd /mnt/pool/AsymLAB/scripts && bash run-backup.sh',
        notes: 'Em TrueNAS SCALE (Linux), usar: sudo apt install nodejs'
    },
    unraid: {
        name: 'Unraid',
        logo: '🟠',
        nodeInstall: '1. Instalar plugin "NerdTools" via Community Apps\n2. Settings → Nerd Tools → Ativar Node.js\n3. Verificar: SSH → node --version',
        cronSetup: '1. Settings → User Scripts (instalar plugin se necessário)\n2. Add New Script: "AsymLAB Backup"\n3. Schedule: Custom → {CRON}\n4. Script:\n   cd /mnt/user/AsymLAB/scripts && bash run-backup.sh',
        notes: 'Scripts perdem-se ao reiniciar sem plugin User Scripts'
    },
    other: {
        name: 'Outra / Custom Linux',
        logo: '🐧',
        nodeInstall: '1. SSH para o servidor\n2. Instalar Node.js:\n   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -\n   sudo apt-get install -y nodejs\n3. Verificar: node --version',
        cronSetup: '1. SSH para o servidor\n2. crontab -e\n3. Adicionar:\n   {CRON} cd /caminho/AsymLAB/scripts && bash run-backup.sh',
        notes: 'Adaptar caminhos ao sistema operativo'
    }
};

// ==================== STEPS CONFIG ====================

const modeSteps = {
    'pc': ['mode', 'path', 'schedule', 'test', 'activate', 'done'],
    'nas-drive': ['mode', 'path', 'schedule', 'test', 'activate', 'done'],
    'nas-autonomous': ['mode', 'brand', 'path', 'copy', 'nas-setup', 'test', 'done'],
};

// ==================== COMPONENT ====================

export default function BackupWizard({ onComplete, onCancel }: BackupWizardProps) {
    const [currentStep, setCurrentStep] = useState(0);
    const [state, setState] = useState<WizardState>({
        mode: null,
        nasBrand: null,
        backupPath: 'F:\\AsymLAB\\DB\\Supabase',
        scheduleTime: '23:30',
        retentionDays: 30,
        pathValid: null,
        pathChecking: false,
        scheduleResult: null,
        backupResult: null,
        copyResult: null,
    });

    const steps = state.mode ? modeSteps[state.mode] : ['mode'];
    const stepName = steps[currentStep];
    const isLastStep = currentStep === steps.length - 1;
    const progress = ((currentStep + 1) / steps.length) * 100;

    const updateState = (updates: Partial<WizardState>) => {
        setState(prev => ({ ...prev, ...updates }));
    };

    const nextStep = () => {
        if (!isLastStep) setCurrentStep(prev => prev + 1);
    };
    const prevStep = () => {
        if (currentStep > 0) setCurrentStep(prev => prev - 1);
    };

    // ==================== ACTIONS ====================

    const validatePath = async () => {
        updateState({ pathChecking: true, pathValid: null });
        try {
            const res = await fetch('/api/backup/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'validate-path', path: state.backupPath })
            });
            const data = await res.json();
            updateState({ pathValid: data.valid, pathChecking: false });
        } catch {
            updateState({ pathValid: false, pathChecking: false });
        }
    };

    const runTestBackup = async () => {
        updateState({ backupResult: { status: 'running' } });
        try {
            const res = await fetch('/api/backup', { method: 'POST' });
            const data = await res.json();
            updateState({
                backupResult: {
                    status: data.success ? 'success' : 'error',
                    message: data.message || data.error,
                    metadata: data.metadata
                }
            });
        } catch (err: any) {
            updateState({
                backupResult: { status: 'error', message: err.message }
            });
        }
    };

    const scheduleBackup = async () => {
        updateState({ scheduleResult: { status: 'running' } });
        try {
            const res = await fetch('/api/backup/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'schedule',
                    time: state.scheduleTime,
                    batPath: 'F:\\AsymLAB\\scripts\\backup-daily.bat'
                })
            });
            const data = await res.json();
            updateState({ scheduleResult: { ...data, status: data.success ? 'success' : 'needs_admin' } });
        } catch (err: any) {
            updateState({ scheduleResult: { status: 'error', message: err.message } });
        }
    };

    const copyFilesToNas = async () => {
        updateState({ copyResult: { status: 'running' } });
        try {
            const res = await fetch('/api/backup/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'copy-to-nas', targetPath: state.backupPath })
            });
            const data = await res.json();
            updateState({ copyResult: { ...data, status: data.success ? 'success' : 'error' } });
        } catch (err: any) {
            updateState({ copyResult: { status: 'error', message: err.message } });
        }
    };

    const saveConfig = async () => {
        await fetch('/api/backup/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                base_path: state.backupPath,
                retention_days: state.retentionDays,
                schedule_time: state.scheduleTime,
                schedule_enabled: true,
            })
        });
    };

    // ==================== RENDER STEPS ====================

    const renderStep = () => {
        switch (stepName) {
            case 'mode': return renderModeStep();
            case 'brand': return renderBrandStep();
            case 'path': return renderPathStep();
            case 'schedule': return renderScheduleStep();
            case 'test': return renderTestStep();
            case 'activate': return renderActivateStep();
            case 'copy': return renderCopyStep();
            case 'nas-setup': return renderNasSetupStep();
            case 'done': return renderDoneStep();
            default: return null;
        }
    };

    // ---- STEP: Escolher Modo ----
    const renderModeStep = () => (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-card-foreground">Onde quer guardar os backups?</h3>
                <p className="text-sm text-gray-500 mt-1">Escolha o método de backup mais adequado</p>
            </div>

            <div className="grid gap-3">
                {/* PC Local */}
                <button
                    onClick={() => { updateState({ mode: 'pc', backupPath: 'F:\\AsymLAB\\DB\\Supabase' }); nextStep(); }}
                    className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md",
                        "border-border hover:border-primary/50 bg-muted"
                    )}
                >
                    <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Monitor className="h-6 w-6 text-blue-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-card-foreground">Este Computador (PC)</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            O backup corre e guarda neste PC. O computador precisa de estar ligado na hora do backup.
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-card-foreground/80 flex-shrink-0" />
                </button>

                {/* NAS como Drive */}
                <button
                    onClick={() => { updateState({ mode: 'nas-drive', backupPath: '' }); nextStep(); }}
                    className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md",
                        "border-border hover:border-primary/50 bg-muted"
                    )}
                >
                    <div className="h-12 w-12 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                        <HardDrive className="h-6 w-6 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-card-foreground">NAS como Drive de Rede</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            O backup corre neste PC mas guarda numa NAS montada como drive de rede. O PC precisa de estar ligado.
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-card-foreground/80 flex-shrink-0" />
                </button>

                {/* NAS Autónoma */}
                <button
                    onClick={() => { updateState({ mode: 'nas-autonomous', backupPath: '' }); nextStep(); }}
                    className={cn(
                        "flex items-center gap-4 p-5 rounded-xl border-2 text-left transition-all hover:shadow-md",
                        "border-border hover:border-primary/50 bg-muted"
                    )}
                >
                    <div className="h-12 w-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                        <Server className="h-6 w-6 text-violet-600" />
                    </div>
                    <div className="flex-1">
                        <p className="font-semibold text-card-foreground">NAS Autónoma</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                            A NAS corre o script de backup de forma independente. Não precisa deste PC ligado. <span className="text-primary font-medium">Recomendado</span>
                        </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-card-foreground/80 flex-shrink-0" />
                </button>
            </div>
        </div>
    );

    // ---- STEP: Escolher Marca NAS ----
    const renderBrandStep = () => (
        <div className="space-y-4">
            <div className="text-center mb-6">
                <h3 className="text-lg font-semibold text-card-foreground">Qual a marca da sua NAS?</h3>
                <p className="text-sm text-gray-500 mt-1">As instruções serão adaptadas ao seu equipamento</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {(Object.entries(nasBrands) as [NASBrand, typeof nasBrands[NASBrand]][]).map(([key, brand]) => (
                    <button
                        key={key}
                        onClick={() => { updateState({ nasBrand: key }); nextStep(); }}
                        className={cn(
                            "flex flex-col items-center gap-2 p-5 rounded-xl border-2 text-center transition-all hover:shadow-md",
                            state.nasBrand === key
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50 bg-muted"
                        )}
                    >
                        <span className="text-3xl">{brand.logo}</span>
                        <p className="font-semibold text-card-foreground">{brand.name}</p>
                    </button>
                ))}
            </div>
        </div>
    );

    // ---- STEP: Escolher Diretório ----
    const renderPathStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-card-foreground">Diretório de Backup</h3>
                <p className="text-sm text-gray-500 mt-1">
                    {state.mode === 'pc' && 'Onde guardar os backups neste computador'}
                    {state.mode === 'nas-drive' && 'Indique o caminho da NAS montada como drive de rede'}
                    {state.mode === 'nas-autonomous' && 'Indique o caminho da pasta partilhada na NAS'}
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="wizard-path" className="flex items-center gap-2">
                    <FolderOpen className="h-4 w-4 text-muted-foreground" />
                    Caminho do diretório
                </Label>
                <Input
                    id="wizard-path"
                    value={state.backupPath}
                    onChange={(e) => updateState({ backupPath: e.target.value, pathValid: null })}
                    placeholder={state.mode === 'pc' ? 'F:\\AsymLAB\\DB\\Supabase' : '\\\\NAS\\AsymLAB'}
                    className="font-mono text-sm"
                />
            </div>

            {/* Exemplos */}
            <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Exemplos:</p>
                {state.mode === 'pc' && (
                    <>
                        <button onClick={() => updateState({ backupPath: 'F:\\AsymLAB\\DB\\Supabase', pathValid: null })} className="block text-xs font-mono text-primary hover:underline">F:\AsymLAB\DB\Supabase</button>
                        <button onClick={() => updateState({ backupPath: 'D:\\Backups\\AsymLAB', pathValid: null })} className="block text-xs font-mono text-primary hover:underline">D:\Backups\AsymLAB</button>
                    </>
                )}
                {state.mode === 'nas-drive' && (
                    <>
                        <button onClick={() => updateState({ backupPath: 'Z:\\AsymLAB\\DB\\Supabase', pathValid: null })} className="block text-xs font-mono text-primary hover:underline">Z:\AsymLAB\DB\Supabase</button>
                        <button onClick={() => updateState({ backupPath: '\\\\NAS\\shared\\AsymLAB\\DB\\Supabase', pathValid: null })} className="block text-xs font-mono text-primary hover:underline">\\NAS\shared\AsymLAB\DB\Supabase</button>
                    </>
                )}
                {state.mode === 'nas-autonomous' && (
                    <>
                        <button onClick={() => updateState({ backupPath: '\\\\NAS\\AsymLAB', pathValid: null })} className="block text-xs font-mono text-primary hover:underline">\\NAS\AsymLAB</button>
                    </>
                )}
            </div>

            {/* Validação */}
            <div className="flex items-center gap-3">
                <Button
                    onClick={validatePath}
                    disabled={!state.backupPath || state.pathChecking}
                    variant="outline"
                    className="gap-2"
                >
                    {state.pathChecking ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Wifi className="h-4 w-4" />
                    )}
                    Validar Caminho
                </Button>

                {state.pathValid === true && (
                    <span className="flex items-center gap-1 text-sm text-emerald-600">
                        <CheckCircle2 className="h-4 w-4" /> Acessível!
                    </span>
                )}
                {state.pathValid === false && (
                    <span className="flex items-center gap-1 text-sm text-red-400">
                        <XCircle className="h-4 w-4" /> Inacessível
                    </span>
                )}
            </div>

            {/* Retenção */}
            <div className="space-y-2">
                <Label className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    Manter backups dos últimos
                </Label>
                <div className="flex items-center gap-2">
                    <Input
                        type="number"
                        min={1}
                        max={365}
                        value={state.retentionDays}
                        onChange={(e) => updateState({ retentionDays: parseInt(e.target.value) || 30 })}
                        className="w-24"
                    />
                    <span className="text-sm text-gray-500">dias</span>
                </div>
            </div>
        </div>
    );

    // ---- STEP: Escolher Horário ----
    const renderScheduleStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-card-foreground">Horário do Backup</h3>
                <p className="text-sm text-gray-500 mt-1">O backup será executado diariamente a esta hora</p>
            </div>

            <div className="flex flex-col items-center gap-4">
                <div className="bg-muted rounded-2xl p-8 flex items-center gap-3">
                    <Clock className="h-8 w-8 text-primary/50" />
                    <Input
                        type="time"
                        value={state.scheduleTime}
                        onChange={(e) => updateState({ scheduleTime: e.target.value })}
                        className="text-3xl font-bold text-center border-none bg-transparent w-40 focus:ring-0"
                    />
                </div>
            </div>

            {/* Horários sugeridos */}
            <div className="flex justify-center gap-2">
                {['22:00', '23:00', '23:30', '00:00', '03:00'].map(t => (
                    <button
                        key={t}
                        onClick={() => updateState({ scheduleTime: t })}
                        className={cn(
                            "px-3 py-1.5 rounded-full text-sm transition-all",
                            state.scheduleTime === t
                                ? "bg-primary text-card-foreground"
                                : "bg-muted text-gray-500 hover:bg-muted"
                        )}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {(state.mode === 'pc' || state.mode === 'nas-drive') && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-700">
                        <p className="font-medium">Atenção</p>
                        <p className="mt-1">O computador precisa de estar ligado a esta hora para o backup ser executado. Se estiver desligado, o backup será ignorado e retomado no dia seguinte.</p>
                    </div>
                </div>
            )}
        </div>
    );

    // ---- STEP: Teste de Backup ----
    const renderTestStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-card-foreground">Testar Backup</h3>
                <p className="text-sm text-gray-500 mt-1">Vamos executar um backup de teste para confirmar que tudo funciona</p>
            </div>

            <div className="flex flex-col items-center gap-4">
                {!state.backupResult && (
                    <Button
                        onClick={async () => { await saveConfig(); await runTestBackup(); }}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-card-foreground gap-2 px-8"
                    >
                        <Play className="h-5 w-5" />
                        Executar Backup de Teste
                    </Button>
                )}

                {state.backupResult?.status === 'running' && (
                    <div className="flex items-center gap-3 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-gray-500">A exportar dados...</span>
                    </div>
                )}

                {state.backupResult?.status === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center w-full">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-emerald-700">Backup realizado com sucesso!</p>
                        <p className="text-sm text-emerald-600 mt-1">{state.backupResult.message}</p>
                    </div>
                )}

                {state.backupResult?.status === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center w-full">
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                        <p className="font-semibold text-red-700">Erro no backup</p>
                        <p className="text-sm text-red-400 mt-1">{state.backupResult.message}</p>
                        <Button
                            onClick={() => { updateState({ backupResult: null }); }}
                            variant="outline"
                            size="sm"
                            className="mt-3"
                        >
                            Tentar novamente
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    // ---- STEP: Ativar Agendamento (PC/NAS-Drive) ----
    const renderActivateStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-card-foreground">Ativar Backup Automático</h3>
                <p className="text-sm text-gray-500 mt-1">Agendar backup diário às {state.scheduleTime}</p>
            </div>

            <div className="flex flex-col items-center gap-4">
                {!state.scheduleResult && (
                    <Button
                        onClick={scheduleBackup}
                        size="lg"
                        className="bg-primary hover:bg-primary/90 text-card-foreground gap-2 px-8"
                    >
                        <Calendar className="h-5 w-5" />
                        Ativar Agendamento
                    </Button>
                )}

                {state.scheduleResult?.status === 'running' && (
                    <div className="flex items-center gap-3 py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-gray-500">A configurar agendamento...</span>
                    </div>
                )}

                {state.scheduleResult?.status === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center w-full">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-emerald-700">Agendamento ativado!</p>
                        <p className="text-sm text-emerald-600 mt-1">Backup diário às {state.scheduleTime}</p>
                    </div>
                )}

                {state.scheduleResult?.status === 'needs_admin' && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 w-full space-y-4">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="font-semibold text-amber-700">Permissão de Administrador Necessária</p>
                                <p className="text-sm text-amber-600 mt-1">
                                    Abra o <strong>PowerShell como Administrador</strong> e cole o comando abaixo:
                                </p>
                            </div>
                        </div>

                        <div className="bg-card rounded-lg p-4 relative group">
                            <code className="text-sm text-green-400 font-mono break-all">
                                {state.scheduleResult.manual_command}
                            </code>
                            <button
                                onClick={() => navigator.clipboard.writeText(state.scheduleResult.manual_command)}
                                className="absolute top-2 right-2 p-1.5 rounded bg-muted text-card-foreground/80 hover:text-card-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Copiar"
                            >
                                <Copy className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="bg-muted rounded-lg p-3 space-y-1">
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                                <Terminal className="h-3 w-3" /> Como abrir PowerShell Admin:
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Clicar direito no Menu Iniciar → "Terminal (Admin)" ou "PowerShell (Admin)"
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    // ---- STEP: Copiar para NAS ----
    const renderCopyStep = () => (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <h3 className="text-lg font-semibold text-card-foreground">Copiar Ficheiros para a NAS</h3>
                <p className="text-sm text-gray-500 mt-1">Vamos copiar o script de backup e configuração para a NAS</p>
            </div>

            <div className="bg-muted rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Ficheiros a copiar:</p>
                <div className="space-y-1">
                    <p className="text-sm font-mono text-muted-foreground">📄 scripts/backup-supabase.js</p>
                    <p className="text-sm font-mono text-muted-foreground">📄 scripts/run-backup.sh</p>
                    <p className="text-sm font-mono text-muted-foreground">⚙️ config/config.json</p>
                    <p className="text-sm font-mono text-muted-foreground">🔑 config/.env.local</p>
                </div>
            </div>

            <div className="flex flex-col items-center gap-4">
                {!state.copyResult && (
                    <Button onClick={copyFilesToNas} size="lg" className="bg-primary hover:bg-primary/90 text-card-foreground gap-2 px-8">
                        <Copy className="h-5 w-5" />
                        Copiar para NAS
                    </Button>
                )}

                {state.copyResult?.status === 'running' && (
                    <div className="flex items-center gap-3 py-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span className="text-gray-500">A copiar ficheiros...</span>
                    </div>
                )}

                {state.copyResult?.status === 'success' && (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 text-center w-full">
                        <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-3" />
                        <p className="font-semibold text-emerald-700">Ficheiros copiados!</p>
                    </div>
                )}

                {state.copyResult?.status === 'error' && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center w-full">
                        <XCircle className="h-12 w-12 text-red-500 mx-auto mb-3" />
                        <p className="font-semibold text-red-700">Erro ao copiar</p>
                        <p className="text-sm text-red-400 mt-1">{state.copyResult.message}</p>
                    </div>
                )}
            </div>
        </div>
    );

    // ---- STEP: Instruções NAS ----
    const renderNasSetupStep = () => {
        const brand = state.nasBrand ? nasBrands[state.nasBrand] : null;
        if (!brand) return null;

        const cronTime = state.scheduleTime.split(':');
        const cronExpr = `${cronTime[1]} ${cronTime[0]} * * *`;

        return (
            <div className="space-y-6">
                <div className="text-center mb-2">
                    <h3 className="text-lg font-semibold text-card-foreground">
                        Configurar {brand.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">Siga estas instruções na sua NAS</p>
                </div>

                {/* Passo 1: Instalar Node.js */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="bg-blue-900/30 px-5 py-3 border-b border-blue-100">
                        <p className="font-semibold text-blue-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-blue-600 text-card-foreground flex items-center justify-center text-xs">1</span>
                            Instalar Node.js
                        </p>
                    </div>
                    <div className="p-5">
                        <pre className="text-sm text-card-foreground/80 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg">
                            {brand.nodeInstall}
                        </pre>
                    </div>
                </div>

                {/* Passo 2: Agendar */}
                <div className="bg-card rounded-xl border border-border overflow-hidden">
                    <div className="bg-emerald-50 px-5 py-3 border-b border-emerald-100">
                        <p className="font-semibold text-emerald-800 flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-emerald-600 text-card-foreground flex items-center justify-center text-xs">2</span>
                            Agendar Backup Diário
                        </p>
                    </div>
                    <div className="p-5">
                        <pre className="text-sm text-card-foreground/80 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded-lg">
                            {brand.cronSetup.replace('{TIME}', state.scheduleTime).replace('{CRON}', cronExpr)}
                        </pre>
                    </div>
                </div>

                {/* Notas */}
                {brand.notes && (
                    <div className="bg-muted border border-border rounded-lg p-4 flex gap-3">
                        <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-muted-foreground">{brand.notes}</p>
                    </div>
                )}
            </div>
        );
    };

    // ---- STEP: Concluído ----
    const renderDoneStep = () => (
        <div className="text-center py-8 space-y-6">
            <div className="relative inline-block">
                <div className="h-20 w-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                </div>
            </div>

            <div>
                <h3 className="text-xl font-bold text-card-foreground">Configuração Concluída!</h3>
                <p className="text-sm text-gray-500 mt-2">O sistema de backup está configurado e pronto.</p>
            </div>

            <div className="bg-muted rounded-xl p-6 text-left max-w-sm mx-auto space-y-3">
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Modo</span>
                    <span className="font-medium text-card-foreground">
                        {state.mode === 'pc' && '💻 PC Local'}
                        {state.mode === 'nas-drive' && '🖥️ NAS Drive'}
                        {state.mode === 'nas-autonomous' && '⚙️ NAS Autónoma'}
                    </span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Diretório</span>
                    <span className="font-medium text-card-foreground font-mono text-xs">{state.backupPath}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Horário</span>
                    <span className="font-medium text-card-foreground">{state.scheduleTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Retenção</span>
                    <span className="font-medium text-card-foreground">{state.retentionDays} dias</span>
                </div>
            </div>

            <Button onClick={onComplete} className="bg-primary hover:bg-primary/90 text-card-foreground gap-2 px-8">
                Concluir
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
    );

    // ==================== MAIN RENDER ====================

    const canProceed = () => {
        switch (stepName) {
            case 'mode': return !!state.mode;
            case 'brand': return !!state.nasBrand;
            case 'path': return !!state.backupPath && state.pathValid === true;
            case 'schedule': return !!state.scheduleTime;
            case 'test': return state.backupResult?.status === 'success';
            case 'activate': return state.scheduleResult?.status === 'success' || state.scheduleResult?.status === 'needs_admin';
            case 'copy': return state.copyResult?.status === 'success';
            case 'nas-setup': return true;
            case 'done': return true;
            default: return false;
        }
    };

    return (
        <div className="bg-muted rounded-2xl border border-border shadow-lg overflow-hidden max-w-2xl mx-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#111827] to-[#1a2332] px-6 py-5 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-card-foreground">Configurar Backup</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Passo {currentStep + 1} de {steps.length}
                    </p>
                </div>
                <button onClick={onCancel} className="text-muted-foreground hover:text-card-foreground transition-colors">
                    <X className="h-5 w-5" />
                </button>
            </div>

            {/* Progress bar */}
            <div className="h-1 bg-muted">
                <div
                    className="h-full bg-primary transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Content */}
            <div className="p-8 min-h-[400px] flex flex-col">
                <div className="flex-1">
                    {renderStep()}
                </div>

                {/* Navigation */}
                {stepName !== 'mode' && stepName !== 'done' && (
                    <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
                        <Button variant="ghost" onClick={prevStep} className="gap-1 text-gray-500">
                            <ChevronLeft className="h-4 w-4" /> Voltar
                        </Button>

                        <Button
                            onClick={nextStep}
                            disabled={!canProceed()}
                            className="bg-primary hover:bg-primary/90 text-card-foreground gap-1"
                        >
                            Seguinte <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
