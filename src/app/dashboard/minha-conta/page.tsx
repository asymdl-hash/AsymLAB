'use client';

import { useState, useEffect, useRef } from 'react';
import {
    User, Key, Save, Eye, EyeOff, Shield, Building2,
    CheckCircle, AlertCircle, X, Loader2, Edit3, Smartphone, Camera, Download, Monitor
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface AccountData {
    id: string;
    email: string;
    username: string | null;
    is_username_account: boolean;
    full_name: string;
    app_role: string;
    avatar_url: string | null;
    created_at: string;
    last_sign_in_at: string | null;
    clinics: { clinic_id: string; clinic_name: string; clinic_role: string }[];
}

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    doctor: 'Médico',
    clinic_user: 'Utilizador Clínica',
    staff: 'Staff',
};

// Ícones SVG oficiais
const AndroidIcon = () => (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M17.523 2.277l1.929-1.929a.5.5 0 0 0-.707-.707L16.707 1.68A7.93 7.93 0 0 0 12 .5a7.93 7.93 0 0 0-4.707 1.18L5.255-.358a.5.5 0 0 0-.707.707l1.929 1.929A7.97 7.97 0 0 0 4 7.5V8h16v-.5a7.97 7.97 0 0 0-2.477-5.223zM9 6a1 1 0 1 1 0-2 1 1 0 0 1 0 2zm6 0a1 1 0 1 1 0-2 1 1 0 0 1 0 2zM4 9v9a2 2 0 0 0 2 2h1v3.5a1.5 1.5 0 0 0 3 0V20h4v3.5a1.5 1.5 0 0 0 3 0V20h1a2 2 0 0 0 2-2V9H4zM1 10.5a1.5 1.5 0 0 1 3 0v6a1.5 1.5 0 0 1-3 0v-6zm19 0a1.5 1.5 0 0 1 3 0v6a1.5 1.5 0 0 1-3 0v-6z" />
    </svg>
);

const AppleIcon = () => (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
);

const WindowsIcon = () => (
    <svg className="h-4 w-4 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
        <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.6H24V24l-12.9-1.801" />
    </svg>
);

export default function MyAccountPage() {
    const [account, setAccount] = useState<AccountData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Edit states
    const [editName, setEditName] = useState(false);
    const [editUsername, setEditUsername] = useState(false);
    const [editPassword, setEditPassword] = useState(false);

    const [newName, setNewName] = useState('');
    const [newUsername, setNewUsername] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPw, setShowCurrentPw] = useState(false);
    const [showNewPw, setShowNewPw] = useState(false);
    const [saving, setSaving] = useState(false);

    // Auto-dismiss messages
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    useEffect(() => {
        if (error) {
            const timer = setTimeout(() => setError(''), 6000);
            return () => clearTimeout(timer);
        }
    }, [error]);

    const fetchAccount = async () => {
        setLoading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Não autenticado');

            const res = await fetch('/api/my-account', {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setAccount(data);
            setNewName(data.full_name);
            setNewUsername(data.username || '');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchAccount(); }, []);

    const apiCall = async (action: string, extraData: Record<string, string>) => {
        setSaving(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Sessão expirada');

            const res = await fetch('/api/my-account', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ action, ...extraData })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            return data;
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !account) return;

        // Validar tipo e tamanho
        if (!file.type.startsWith('image/')) {
            setError('Por favor seleciona uma imagem (JPG, PNG, etc.)');
            return;
        }
        if (file.size > 2 * 1024 * 1024) {
            setError('A imagem deve ter no máximo 2MB');
            return;
        }

        setUploadingAvatar(true);
        try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const filePath = `avatars/${account.id}.${ext}`;

            // Upload para Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('user-avatars')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadError) throw uploadError;

            // Obter URL pública
            const { data: urlData } = supabase.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            // Guardar avatar_url no profile
            const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            const result = await apiCall('update_avatar', { avatar_url: avatarUrl });
            setSuccess('Foto de perfil atualizada!');
            fetchAccount();
        } catch (err: any) {
            setError(err.message || 'Erro ao fazer upload da foto');
        } finally {
            setUploadingAvatar(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleSaveName = async () => {
        try {
            const result = await apiCall('update_name', { full_name: newName });
            setSuccess(result.message);
            setEditName(false);
            fetchAccount();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSaveUsername = async () => {
        try {
            const result = await apiCall('update_username', { new_username: newUsername });
            setSuccess(result.message);
            setEditUsername(false);
            fetchAccount();
        } catch (err: any) {
            setError(err.message);
        }
    };

    const handleSavePassword = async () => {
        if (newPassword !== confirmPassword) {
            setError('As passwords não coincidem');
            return;
        }
        try {
            const result = await apiCall('update_password', {
                current_password: currentPassword,
                new_password: newPassword
            });
            setSuccess(result.message);
            setEditPassword(false);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err: any) {
            setError(err.message);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!account) {
        return (
            <div className="flex items-center justify-center h-full min-h-[50vh]">
                <p className="text-gray-400">Não foi possível carregar os dados da conta</p>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-8 max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-gray-900">A Minha Conta</h1>
                <p className="text-sm text-gray-500 mt-1">Gere os teus dados de acesso e perfil</p>
            </div>

            {/* Messages */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-in slide-in-from-top-2">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm animate-in slide-in-from-top-2">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* Profile Card */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Avatar Header */}
                <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent px-6 py-5 border-b border-gray-100">
                    <div className="flex items-center gap-4">
                        {/* Avatar clicável */}
                        <div className="relative group">
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleAvatarUpload}
                                accept="image/*"
                                className="hidden"
                            />
                            {account.avatar_url ? (
                                <img
                                    src={account.avatar_url}
                                    alt={account.full_name}
                                    className="h-16 w-16 rounded-2xl object-cover shadow-md border-2 border-white cursor-pointer transition-transform group-hover:scale-105"
                                    onClick={() => fileInputRef.current?.click()}
                                />
                            ) : (
                                <div
                                    className={cn(
                                        "h-16 w-16 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-md cursor-pointer transition-transform group-hover:scale-105",
                                        account.app_role === 'admin'
                                            ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                                            : 'bg-gradient-to-br from-primary to-primary/80 text-white'
                                    )}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {account.full_name.charAt(0).toUpperCase()}
                                </div>
                            )}
                            {/* Overlay câmara */}
                            <div
                                className="absolute inset-0 rounded-2xl bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                {uploadingAvatar ? (
                                    <Loader2 className="h-5 w-5 text-white animate-spin" />
                                ) : (
                                    <Camera className="h-5 w-5 text-white" />
                                )}
                            </div>
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900">{account.full_name}</h2>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                                <span className={cn(
                                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                                    account.app_role === 'admin'
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : account.app_role === 'doctor'
                                            ? 'bg-blue-100 text-blue-700 border-blue-200'
                                            : 'bg-gray-100 text-gray-600 border-gray-200'
                                )}>
                                    <Shield className="h-3 w-3" />
                                    {ROLE_LABELS[account.app_role] || account.app_role}
                                </span>
                                {account.clinics.length > 0 && account.clinics.map((c, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500 border border-gray-200">
                                        <Building2 className="h-3 w-3" />
                                        {c.clinic_name}
                                    </span>
                                ))}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">Clica na foto para alterar</p>
                        </div>
                    </div>
                </div>

                {/* Fields */}
                <div className="divide-y divide-gray-100">
                    {/* Nome */}
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <User className="h-4 w-4" />
                                Nome Completo
                            </div>
                            {!editName && (
                                <button
                                    onClick={() => setEditName(true)}
                                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                >
                                    <Edit3 className="h-3 w-3" /> Editar
                                </button>
                            )}
                        </div>
                        {editName ? (
                            <div className="mt-2 flex items-center gap-2">
                                <input
                                    type="text"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    className="flex-1 h-9 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    autoFocus
                                />
                                <button
                                    onClick={handleSaveName}
                                    disabled={saving || !newName.trim()}
                                    className="h-9 px-3 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                                >
                                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                    Guardar
                                </button>
                                <button
                                    onClick={() => { setEditName(false); setNewName(account.full_name); }}
                                    className="h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-500 hover:bg-gray-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">{account.full_name}</p>
                        )}
                    </div>

                    {/* Username / Email */}
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                {account.is_username_account
                                    ? <><User className="h-4 w-4" /> Username</>
                                    : <><span>📧</span> Email</>
                                }
                            </div>
                            {account.is_username_account && !editUsername && (
                                <button
                                    onClick={() => setEditUsername(true)}
                                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                >
                                    <Edit3 className="h-3 w-3" /> Alterar
                                </button>
                            )}
                        </div>
                        {editUsername && account.is_username_account ? (
                            <div className="mt-2 space-y-2">
                                <div className="flex items-center">
                                    <input
                                        type="text"
                                        value={newUsername}
                                        onChange={e => setNewUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                                        className="flex-1 h-9 rounded-l-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                        autoFocus
                                    />
                                    <span className="h-9 px-3 flex items-center bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-xs text-gray-500">
                                        @asymlab.app
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSaveUsername}
                                        disabled={saving || !newUsername.trim() || newUsername === account.username}
                                        className="h-8 px-3 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                                        Guardar
                                    </button>
                                    <button
                                        onClick={() => { setEditUsername(false); setNewUsername(account.username || ''); }}
                                        className="h-8 px-3 rounded-lg border border-gray-300 text-xs text-gray-500 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-1 text-sm font-medium text-gray-900">
                                {account.is_username_account ? (
                                    <span className="inline-flex items-center gap-1.5">
                                        <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-mono text-xs">
                                            {account.username}
                                        </span>
                                        <span className="text-gray-400 text-xs">@asymlab.app</span>
                                    </span>
                                ) : (
                                    account.email
                                )}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div className="px-6 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Key className="h-4 w-4" />
                                Password
                            </div>
                            {!editPassword && (
                                <button
                                    onClick={() => setEditPassword(true)}
                                    className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1"
                                >
                                    <Edit3 className="h-3 w-3" /> Alterar
                                </button>
                            )}
                        </div>
                        {editPassword ? (
                            <div className="mt-3 space-y-3">
                                {/* Password actual */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Password Actual</label>
                                    <div className="relative">
                                        <input
                                            type={showCurrentPw ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={e => setCurrentPassword(e.target.value)}
                                            className="w-full h-9 rounded-lg border border-gray-300 px-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                            autoFocus
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowCurrentPw(!showCurrentPw)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showCurrentPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Nova password */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Nova Password</label>
                                    <div className="relative">
                                        <input
                                            type={showNewPw ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={e => setNewPassword(e.target.value)}
                                            placeholder="Mínimo 6 caracteres"
                                            className="w-full h-9 rounded-lg border border-gray-300 px-3 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowNewPw(!showNewPw)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                        >
                                            {showNewPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                        </button>
                                    </div>
                                </div>

                                {/* Confirmar password */}
                                <div className="space-y-1">
                                    <label className="text-xs text-gray-500">Confirmar Nova Password</label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={e => setConfirmPassword(e.target.value)}
                                        className={cn(
                                            "w-full h-9 rounded-lg border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50",
                                            confirmPassword && confirmPassword !== newPassword
                                                ? 'border-red-300 focus:border-red-400'
                                                : 'border-gray-300 focus:border-primary'
                                        )}
                                    />
                                    {confirmPassword && confirmPassword !== newPassword && (
                                        <p className="text-xs text-red-500">As passwords não coincidem</p>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 pt-1">
                                    <button
                                        onClick={handleSavePassword}
                                        disabled={saving || !currentPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                                        className="h-9 px-4 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 disabled:opacity-50 flex items-center gap-1"
                                    >
                                        {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Key className="h-3 w-3" />}
                                        Alterar Password
                                    </button>
                                    <button
                                        onClick={() => {
                                            setEditPassword(false);
                                            setCurrentPassword('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        }}
                                        className="h-9 px-3 rounded-lg border border-gray-300 text-xs text-gray-500 hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="mt-1 text-sm text-gray-400">••••••••</p>
                        )}
                    </div>

                    {/* Info: Instalar como App — Design Profissional */}
                    <div className="px-6 py-5">
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                            <Download className="h-4 w-4" />
                            Instalar como App
                        </div>
                        <div className="space-y-2">
                            {/* Android */}
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-green-50 to-green-50/30 border border-green-200/60">
                                <div className="h-8 w-8 rounded-lg bg-green-500 flex items-center justify-center flex-shrink-0 text-white">
                                    <AndroidIcon />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Android</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Abre o <strong>Chrome</strong> → toca em <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">⋮</span> (menu) → <strong>&quot;Adicionar ao ecrã inicial&quot;</strong>
                                    </p>
                                </div>
                            </div>

                            {/* iOS */}
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-gray-50/30 border border-gray-200/60">
                                <div className="h-8 w-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 text-white">
                                    <AppleIcon />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">iPhone / iPad</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        Abre o <strong>Safari</strong> → toca em <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">⬆</span> (partilhar) → <strong>&quot;Adicionar ao ecrã principal&quot;</strong>
                                    </p>
                                </div>
                            </div>

                            {/* Windows/Desktop */}
                            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-50/30 border border-blue-200/60">
                                <div className="h-8 w-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0 text-white">
                                    <WindowsIcon />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-800">Windows / macOS</p>
                                    <p className="text-xs text-gray-500 mt-0.5">
                                        No <strong>Chrome</strong> ou <strong>Edge</strong>, clica no ícone <span className="inline-flex items-center px-1.5 py-0.5 bg-gray-100 rounded text-[10px] font-mono">⊕</span> na barra de endereço → <strong>&quot;Instalar&quot;</strong>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
