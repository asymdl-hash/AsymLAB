'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
    UserPlus, Mail, User, Shield, CheckCircle, XCircle, Loader2,
    Users, Trash2, Copy, Check, MessageCircle, KeyRound,
    X, AlertCircle, Crown, Eye, Edit3, RefreshCw
} from 'lucide-react';
import { ClinicFullDetails } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { cn } from '@/lib/utils';

// Tipos
interface ClinicUser {
    id: string;
    email: string;
    username: string | null;
    full_name: string;
    app_role: string;
    is_username_account: boolean;
    last_sign_in_at: string | null;
    clinic_role: string;
}

interface CreatedCredentials {
    username: string;
    password: string;
    full_name: string;
    email?: string;
}

// Helper: label para o role
const roleLabel = (role: string) => {
    const map: Record<string, string> = {
        admin: 'Administrador',
        doctor: 'Médico',
        clinic_user: 'Staff Clínica',
        staff: 'Utilizador'
    };
    return map[role] || role;
};

// Helper: cor para o role
const roleColor = (role: string) => {
    const map: Record<string, string> = {
        admin: 'bg-purple-100 text-purple-700 border-purple-200',
        doctor: 'bg-blue-100 text-blue-700 border-blue-200',
        clinic_user: 'bg-amber-100 text-amber-700 border-amber-200',
        staff: 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return map[role] || 'bg-gray-100 text-gray-600 border-gray-200';
};

// Helper: ícone para o role
const RoleIcon = ({ role }: { role: string }) => {
    if (role === 'admin') return <Crown className="h-3 w-3" />;
    if (role === 'doctor') return <Edit3 className="h-3 w-3" />;
    return <Eye className="h-3 w-3" />;
};

export default function ClinicSecurityTab() {
    const { watch } = useFormContext<ClinicFullDetails>();
    const clinicId = watch('id');
    const clinicName = watch('commercial_name');

    // Estado de utilizadores associados
    const [clinicUsers, setClinicUsers] = useState<ClinicUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(true);

    // Estado do formulário de convite
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [inviteMode, setInviteMode] = useState<'username' | 'email'>('username');
    const [inviteFullName, setInviteFullName] = useState('');
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState('clinic_user');
    const [creating, setCreating] = useState(false);
    const [createError, setCreateError] = useState('');

    // Estado de credenciais criadas
    const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Estado de remoção
    const [deleteTarget, setDeleteTarget] = useState<ClinicUser | null>(null);
    const [deleting, setDeleting] = useState(false);

    // Gerar username a partir do nome
    const generateUsername = (name: string): string => {
        if (!name) return '';
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z\s]/g, '')
            .trim()
            .replace(/\s+/g, '.');
    };

    // Gerar password temporária
    const generatePassword = (): string => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
        let password = '';
        for (let i = 0; i < 8; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return password;
    };

    // Carregar utilizadores da clínica
    const loadClinicUsers = useCallback(async () => {
        if (!clinicId) return;
        setLoadingUsers(true);
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Filtrar apenas utilizadores associados a esta clínica
            const filtered = data.users
                .filter((u: any) => u.clinics.some((c: any) => c.clinic_id === clinicId))
                .map((u: any) => ({
                    id: u.id,
                    email: u.email,
                    username: u.username,
                    full_name: u.full_name,
                    app_role: u.app_role,
                    is_username_account: u.is_username_account,
                    last_sign_in_at: u.last_sign_in_at,
                    clinic_role: u.clinics.find((c: any) => c.clinic_id === clinicId)?.clinic_role || 'staff'
                }));

            setClinicUsers(filtered);
        } catch (err) {
            console.error('Erro ao carregar utilizadores da clínica:', err);
        } finally {
            setLoadingUsers(false);
        }
    }, [clinicId]);

    useEffect(() => {
        loadClinicUsers();
    }, [loadClinicUsers]);

    // Criar novo utilizador e associar à clínica
    const handleCreateUser = async () => {
        if (!inviteFullName.trim()) {
            setCreateError('O nome completo é obrigatório.');
            return;
        }

        setCreating(true);
        setCreateError('');

        try {
            const username = inviteMode === 'username' ? generateUsername(inviteFullName) : undefined;
            const email = inviteMode === 'email' ? inviteEmail : undefined;
            const password = generatePassword();

            if (inviteMode === 'email' && !inviteEmail.trim()) {
                setCreateError('O email é obrigatório.');
                setCreating(false);
                return;
            }

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    full_name: inviteFullName.trim(),
                    app_role: inviteRole,
                    clinic_ids: [clinicId]
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setCreatedCredentials({
                username: username || email || '',
                password,
                full_name: inviteFullName.trim(),
                email: email || undefined
            });

            // Recarregar lista
            await loadClinicUsers();
        } catch (err: any) {
            setCreateError(err.message || 'Erro ao criar utilizador');
        } finally {
            setCreating(false);
        }
    };

    // Remover acesso à clínica
    const handleRemoveAccess = async () => {
        if (!deleteTarget) return;
        setDeleting(true);

        try {
            const res = await fetch('/api/users/clinic-access', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: deleteTarget.id,
                    clinic_id: clinicId
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setDeleteTarget(null);
            await loadClinicUsers();
        } catch (err: any) {
            console.error('Erro ao remover acesso:', err);
            alert(err.message || 'Erro ao remover acesso');
        } finally {
            setDeleting(false);
        }
    };

    // Copiar para clipboard
    const handleCopy = async (text: string, field: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        } catch {
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopiedField(field);
            setTimeout(() => setCopiedField(null), 2000);
        }
    };

    // Enviar via WhatsApp
    const handleSendWhatsApp = () => {
        if (!createdCredentials) return;

        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.asymlab.pt';
        const loginId = createdCredentials.email || createdCredentials.username;

        const message = `🔐 *Dados de Acesso — AsymLAB*

Olá ${createdCredentials.full_name}! 👋

Seguem os teus dados de acesso à aplicação AsymLAB:

📱 *Link da App:*
${appUrl}

👤 *Login:* ${loginId}
🔑 *Password:* ${createdCredentials.password}

🏥 *Clínica:* ${clinicName}

📝 *Como instalar a App no telemóvel:*
1. Abre o link acima no Chrome/Safari
2. Clica em "Adicionar ao ecrã inicial" ou no ícone ⊕
3. A app ficará disponível como atalho no teu telemóvel!

💡 *Recomendação:* Altera a tua password após o primeiro login em "A Minha Conta".`;

        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    // Reset do formulário
    const resetInviteForm = () => {
        setShowInviteForm(false);
        setCreatedCredentials(null);
        setInviteFullName('');
        setInviteEmail('');
        setInviteRole('clinic_user');
        setCreateError('');
    };

    return (
        <div className="space-y-6">
            {/* ============ HEADER ============ */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium flex items-center gap-2">
                        <Shield className="h-5 w-5 text-primary" />
                        Acesso & Segurança
                    </h3>
                    <p className="text-sm text-gray-500">
                        Gerir utilizadores com acesso a <strong>{clinicName || 'esta clínica'}</strong>
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={loadClinicUsers}
                        disabled={loadingUsers}
                        title="Atualizar lista"
                    >
                        <RefreshCw className={cn("h-4 w-4", loadingUsers && "animate-spin")} />
                    </Button>
                    <Button
                        onClick={() => setShowInviteForm(true)}
                        className="gap-2"
                        disabled={showInviteForm}
                    >
                        <UserPlus className="h-4 w-4" />
                        Convidar Utilizador
                    </Button>
                </div>
            </div>

            {/* ============ FORMULÁRIO DE CONVITE / CREDENCIAIS ============ */}
            {showInviteForm && (
                <Card className="border-primary/20 shadow-md">
                    <CardHeader className="bg-primary/5 rounded-t-lg pb-3">
                        <div className="flex items-center justify-between">
                            <CardTitle className="flex items-center gap-2 text-base">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {createdCredentials ? (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                    ) : (
                                        <KeyRound className="h-4 w-4 text-primary" />
                                    )}
                                </div>
                                {createdCredentials ? 'Conta Criada com Sucesso!' : 'Novo Utilizador'}
                            </CardTitle>
                            <button
                                onClick={resetInviteForm}
                                className="p-1 rounded-md hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>
                    </CardHeader>

                    <CardContent className="p-5 space-y-4">
                        {!createdCredentials ? (
                            <>
                                {/* Modo de convite */}
                                <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                                    <button
                                        type="button"
                                        onClick={() => setInviteMode('username')}
                                        className={cn(
                                            "flex-1 px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2",
                                            inviteMode === 'username'
                                                ? "bg-primary text-white"
                                                : "bg-white text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        <User className="h-4 w-4" />
                                        Com Username
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setInviteMode('email')}
                                        className={cn(
                                            "flex-1 px-4 py-2.5 text-sm font-medium transition-all flex items-center justify-center gap-2",
                                            inviteMode === 'email'
                                                ? "bg-primary text-white"
                                                : "bg-white text-gray-600 hover:bg-gray-50"
                                        )}
                                    >
                                        <Mail className="h-4 w-4" />
                                        Com Email
                                    </button>
                                </div>

                                {/* Nome Completo */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="invite_name" className="text-sm font-medium">
                                        Nome Completo *
                                    </Label>
                                    <Input
                                        id="invite_name"
                                        value={inviteFullName}
                                        onChange={(e) => setInviteFullName(e.target.value)}
                                        placeholder="Ex: Maria Santos"
                                        autoFocus
                                    />
                                    {inviteMode === 'username' && inviteFullName && (
                                        <p className="text-xs text-gray-400">
                                            Username gerado: <code className="bg-gray-100 px-1 rounded text-primary font-mono">{generateUsername(inviteFullName)}</code>
                                        </p>
                                    )}
                                </div>

                                {/* Email (se modo email) */}
                                {inviteMode === 'email' && (
                                    <div className="space-y-1.5">
                                        <Label htmlFor="invite_email" className="text-sm font-medium">
                                            Email *
                                        </Label>
                                        <Input
                                            id="invite_email"
                                            type="email"
                                            value={inviteEmail}
                                            onChange={(e) => setInviteEmail(e.target.value)}
                                            placeholder="email@exemplo.com"
                                        />
                                    </div>
                                )}

                                {/* Role */}
                                <div className="space-y-1.5">
                                    <Label className="text-sm font-medium">Nível de Acesso</Label>
                                    <select
                                        value={inviteRole}
                                        onChange={(e) => setInviteRole(e.target.value)}
                                        className="flex h-10 w-full items-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                                    >
                                        <option value="clinic_user">Staff Clínica (edita dados da clínica)</option>
                                        <option value="doctor">Médico (acesso a pacientes associados)</option>
                                        <option value="staff">Utilizador (apenas leitura)</option>
                                    </select>
                                </div>

                                {/* Info box */}
                                <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                                    <p className="font-medium mb-1">O que vai acontecer:</p>
                                    <ul className="space-y-0.5 list-disc list-inside">
                                        <li>Será criada uma <strong>conta de acesso</strong> com password temporária</li>
                                        <li>O utilizador será automaticamente <strong>associado a {clinicName}</strong></li>
                                        <li>Receberá credenciais para partilhar via <strong>WhatsApp</strong> ou copiar</li>
                                    </ul>
                                </div>

                                {/* Erro */}
                                {createError && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                        {createError}
                                    </div>
                                )}

                                {/* Acções */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        variant="outline"
                                        onClick={resetInviteForm}
                                        className="flex-1"
                                    >
                                        Cancelar
                                    </Button>
                                    <Button
                                        onClick={handleCreateUser}
                                        disabled={creating || !inviteFullName.trim() || (inviteMode === 'email' && !inviteEmail.trim())}
                                        className="flex-1 gap-2"
                                    >
                                        {creating ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                A criar...
                                            </>
                                        ) : (
                                            <>
                                                <UserPlus className="h-4 w-4" />
                                                Criar Conta
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Credenciais criadas — mostrar resultado */}
                                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
                                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                    <p className="text-sm font-medium text-green-800">
                                        Conta criada para <strong>{createdCredentials.full_name}</strong>!
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {/* Login */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">
                                            {createdCredentials.email ? 'Email' : 'Username'}
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono">
                                                {createdCredentials.email || createdCredentials.username}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(createdCredentials.email || createdCredentials.username, 'login')}
                                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                title="Copiar"
                                            >
                                                {copiedField === 'login' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                            </button>
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="space-y-1">
                                        <label className="text-xs font-medium text-gray-500">Password Temporária</label>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono">
                                                {createdCredentials.password}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => handleCopy(createdCredentials.password, 'password')}
                                                className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                title="Copiar"
                                            >
                                                {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                    <strong>Importante:</strong> Guarde estas credenciais! A password não será visível novamente.
                                </div>

                                {/* Acções pós-criação */}
                                <div className="flex gap-3 pt-2">
                                    <Button
                                        onClick={handleSendWhatsApp}
                                        className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Enviar via WhatsApp
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={resetInviteForm}
                                        className="flex-1"
                                    >
                                        Fechar
                                    </Button>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ============ LISTA DE UTILIZADORES ============ */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                        <Users className="h-5 w-5 text-primary" />
                        Utilizadores com Acesso
                        <span className="ml-auto text-xs font-normal text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {clinicUsers.length}
                        </span>
                    </CardTitle>
                    <CardDescription>
                        Utilizadores que têm acesso aos dados de <strong>{clinicName}</strong>
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {loadingUsers ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                    ) : clinicUsers.length === 0 ? (
                        <div className="text-center py-10 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                            <Users className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            <h4 className="text-sm font-medium text-gray-900">Nenhum utilizador associado</h4>
                            <p className="text-sm text-gray-500 mt-1">
                                Clique em &quot;Convidar Utilizador&quot; para adicionar acesso.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {clinicUsers.map((user) => (
                                <div
                                    key={user.id}
                                    className="group flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-100 hover:border-primary/20 hover:bg-gray-50/50 transition-all"
                                >
                                    {/* Avatar */}
                                    <div className="relative">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                                            {user.full_name.charAt(0).toUpperCase()}
                                        </div>
                                        {/* Online indicator */}
                                        {user.last_sign_in_at && (
                                            <div className={cn(
                                                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white",
                                                isRecentlyActive(user.last_sign_in_at) ? "bg-green-400" : "bg-gray-300"
                                            )} />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                {user.full_name}
                                            </span>
                                            <span className={cn(
                                                "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border",
                                                roleColor(user.app_role)
                                            )}>
                                                <RoleIcon role={user.app_role} />
                                                {roleLabel(user.app_role)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-400 truncate mt-0.5">
                                            {user.is_username_account
                                                ? `@${user.username}`
                                                : user.email
                                            }
                                            {user.last_sign_in_at && (
                                                <span className="ml-2">
                                                    · Último login: {formatRelativeDate(user.last_sign_in_at)}
                                                </span>
                                            )}
                                        </p>
                                    </div>

                                    {/* Acção: Remover (não mostra para admin) */}
                                    {user.app_role !== 'admin' && (
                                        <button
                                            type="button"
                                            onClick={() => setDeleteTarget(user)}
                                            className="p-2 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                            title="Remover acesso"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ============ INFO CARD ============ */}
            <Card className="border-gray-200 bg-gray-50/50">
                <CardContent className="pt-5 space-y-2 text-xs text-gray-500">
                    <p className="flex items-center gap-2">
                        <Shield className="h-3.5 w-3.5 text-gray-400" />
                        Os acessos são protegidos por <strong>RLS (Row Level Security)</strong> — cada utilizador só vê as clínicas que lhe estão associadas.
                    </p>
                    <p className="flex items-center gap-2">
                        <Eye className="h-3.5 w-3.5 text-gray-400" />
                        Utilizadores com role <strong>&quot;Staff&quot;</strong> têm acesso de apenas leitura via as permissões do frontend.
                    </p>
                    <p className="flex items-center gap-2">
                        <Crown className="h-3.5 w-3.5 text-gray-400" />
                        <strong>Administradores</strong> têm acesso total a todas as clínicas automaticamente e não podem ser removidos.
                    </p>
                </CardContent>
            </Card>

            {/* ============ MODAL DE CONFIRMAÇÃO DE REMOÇÃO ============ */}
            {deleteTarget && (
                <ConfirmModal
                    title="Remover Acesso à Clínica"
                    message={`Tem a certeza que quer remover o acesso de "${deleteTarget.full_name}" a "${clinicName}"? O utilizador deixará de ver esta clínica. A conta do utilizador não será eliminada.`}
                    confirmLabel={deleting ? "A remover..." : "Remover Acesso"}
                    cancelLabel="Cancelar"
                    onConfirm={handleRemoveAccess}
                    onCancel={() => setDeleteTarget(null)}
                    variant="danger"
                />
            )}
        </div>
    );
}

// Helpers
function isRecentlyActive(dateStr: string): boolean {
    const diff = Date.now() - new Date(dateStr).getTime();
    return diff < 24 * 60 * 60 * 1000; // last 24h
}

function formatRelativeDate(dateStr: string): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 5) return 'agora';
    if (minutes < 60) return `há ${minutes}min`;
    if (hours < 24) return `há ${hours}h`;
    if (days < 7) return `há ${days}d`;
    return new Date(dateStr).toLocaleDateString('pt-PT');
}
