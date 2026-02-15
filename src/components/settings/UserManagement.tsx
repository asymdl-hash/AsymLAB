'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    UserPlus, RefreshCw, Key, Trash2, Edit3,
    User, Shield, CheckCircle, AlertCircle, X, Eye, EyeOff,
    Building2, Loader2, AlertTriangle, Save
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
    id: string;
    email: string;
    username: string | null;
    is_username_account: boolean;
    full_name: string;
    app_role: string;
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

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    doctor: 'bg-blue-100 text-blue-700 border-blue-200',
    clinic_user: 'bg-green-100 text-green-700 border-green-200',
    staff: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function UserManagement() {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Modal states
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState<UserData | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/users');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setUsers(data.users || []);
        } catch (err: any) {
            setError(err.message || 'Erro ao carregar utilizadores');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Auto-dismiss success messages
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">Gestão de Utilizadores</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                        {users.length} utilizador{users.length !== 1 ? 'es' : ''} registado{users.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchUsers}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                    >
                        <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                        Atualizar
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 transition-colors shadow-sm"
                    >
                        <UserPlus className="h-4 w-4" />
                        Novo Utilizador
                    </button>
                </div>
            </div>

            {/* Messages */}
            {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    {error}
                    <button onClick={() => setError('')} className="ml-auto"><X className="h-4 w-4" /></button>
                </div>
            )}
            {success && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm">
                    <CheckCircle className="h-4 w-4 flex-shrink-0" />
                    {success}
                </div>
            )}

            {/* Users List */}
            {loading && users.length === 0 ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-400">A carregar utilizadores...</span>
                </div>
            ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Utilizador</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Login</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Clínicas</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Login</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold",
                                                user.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                                            )}>
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.is_username_account ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
                                                <User className="h-3 w-3" />
                                                {user.username}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                                📧 Email
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border",
                                            ROLE_COLORS[user.app_role] || ROLE_COLORS.staff
                                        )}>
                                            {user.app_role === 'admin' && <Shield className="h-3 w-3" />}
                                            {ROLE_LABELS[user.app_role] || user.app_role}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.clinics.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {user.clinics.map((c, i) => (
                                                    <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                                                        <Building2 className="h-3 w-3" />
                                                        {c.clinic_name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className="text-xs text-gray-400">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className="text-xs text-gray-500">
                                            {user.last_sign_in_at
                                                ? new Date(user.last_sign_in_at).toLocaleDateString('pt-PT', {
                                                    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                                                })
                                                : 'Nunca'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center justify-end gap-1">
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowEditModal(true); }}
                                                title="Editar Utilizador"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowResetModal(true); }}
                                                title="Resetar Password"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                                            >
                                                <Key className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => { setSelectedUser(user); setShowDeleteModal(true); }}
                                                title="Eliminar Utilizador"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onSuccess={(msg) => { setSuccess(msg); setShowCreateModal(false); fetchUsers(); }}
                    onError={(msg) => setError(msg)}
                />
            )}

            {/* Edit User Modal */}
            {showEditModal && selectedUser && (
                <EditUserModal
                    user={selectedUser}
                    onClose={() => { setShowEditModal(false); setSelectedUser(null); }}
                    onSuccess={(msg) => { setSuccess(msg); setShowEditModal(false); setSelectedUser(null); fetchUsers(); }}
                    onError={(msg) => setError(msg)}
                />
            )}

            {/* Reset Password Modal */}
            {showResetModal && selectedUser && (
                <ResetPasswordModal
                    user={selectedUser}
                    onClose={() => { setShowResetModal(false); setSelectedUser(null); }}
                    onSuccess={(msg) => { setSuccess(msg); setShowResetModal(false); setSelectedUser(null); }}
                    onError={(msg) => setError(msg)}
                />
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && selectedUser && (
                <DeleteConfirmModal
                    user={selectedUser}
                    onClose={() => { setShowDeleteModal(false); setSelectedUser(null); }}
                    onSuccess={(msg) => { setSuccess(msg); setShowDeleteModal(false); setSelectedUser(null); fetchUsers(); }}
                    onError={(msg) => setError(msg)}
                />
            )}
        </div>
    );
}

// ===========================
// CREATE USER MODAL
// ===========================
function CreateUserModal({
    onClose, onSuccess, onError
}: {
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [loginType, setLoginType] = useState<'username' | 'email'>('username');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [appRole, setAppRole] = useState('staff');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body: any = { password, full_name: fullName, app_role: appRole };
            if (loginType === 'username') {
                if (!username.trim()) throw new Error('Username é obrigatório');
                if (username.includes('@') || username.includes(' ')) throw new Error('Username não pode conter @ ou espaços');
                body.username = username.trim();
            } else {
                if (!email.trim()) throw new Error('Email é obrigatório');
                body.email = email.trim();
            }

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSuccess(data.message);
        } catch (err: any) {
            onError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Novo Utilizador</h3>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Login Type Toggle */}
                    <div className="flex rounded-lg border border-gray-200 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setLoginType('username')}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium transition-colors",
                                loginType === 'username'
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                            )}
                        >
                            👤 Username
                        </button>
                        <button
                            type="button"
                            onClick={() => setLoginType('email')}
                            className={cn(
                                "flex-1 py-2 text-sm font-medium transition-colors",
                                loginType === 'email'
                                    ? 'bg-primary text-white'
                                    : 'bg-white text-gray-500 hover:bg-gray-50'
                            )}
                        >
                            📧 Email
                        </button>
                    </div>

                    {/* Username or Email */}
                    {loginType === 'username' ? (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Username</label>
                            <div className="flex items-center">
                                <input
                                    type="text"
                                    value={username}
                                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                                    placeholder="ana.assistente"
                                    className="flex-1 h-10 rounded-l-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                    required
                                />
                                <span className="h-10 px-3 flex items-center bg-gray-100 border border-l-0 border-gray-300 rounded-r-lg text-xs text-gray-500">
                                    @asymlab.app
                                </span>
                            </div>
                            <p className="text-xs text-gray-400">Só letras minúsculas, números, pontos e hífens</p>
                        </div>
                    ) : (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="utilizador@email.com"
                                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                required
                            />
                        </div>
                    )}

                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Ana Silva"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            required
                        />
                    </div>

                    {/* Password */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full h-10 rounded-lg border border-gray-300 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Perfil / Role</label>
                        <select
                            value={appRole}
                            onChange={e => setAppRole(e.target.value)}
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        >
                            <option value="staff">Staff</option>
                            <option value="clinic_user">Utilizador Clínica</option>
                            <option value="doctor">Médico</option>
                            <option value="admin">Administrador</option>
                        </select>
                    </div>

                    {/* Info box for username accounts */}
                    {loginType === 'username' && (
                        <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                            <strong>Nota:</strong> Utilizadores com username não recebem email de recuperação.
                            Para resetar a password, usa o botão 🔑 na lista.
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                            {loading ? 'A criar...' : 'Criar Utilizador'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===========================
// EDIT USER MODAL
// ===========================
function EditUserModal({
    user, onClose, onSuccess, onError
}: {
    user: UserData;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [fullName, setFullName] = useState(user.full_name);
    const [appRole, setAppRole] = useState(user.app_role);
    const [loading, setLoading] = useState(false);

    const hasChanges = fullName !== user.full_name || appRole !== user.app_role;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!hasChanges) { onClose(); return; }
        setLoading(true);

        try {
            const updates: string[] = [];

            // Atualizar nome se mudou
            if (fullName !== user.full_name) {
                const res = await fetch('/api/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.id, action: 'update_name', full_name: fullName })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                updates.push('nome');
            }

            // Atualizar role se mudou
            if (appRole !== user.app_role) {
                const res = await fetch('/api/users', {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.id, action: 'update_role', app_role: appRole })
                });
                const data = await res.json();
                if (!res.ok) throw new Error(data.error);
                updates.push('role');
            }

            onSuccess(`Utilizador "${fullName}" atualizado (${updates.join(' e ')})`);
        } catch (err: any) {
            onError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Editar Utilizador</h3>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* User Info Card */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                            user.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                        )}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700">{user.is_username_account ? user.username : user.email}</p>
                            <p className="text-xs text-gray-400">
                                {user.is_username_account ? '👤 Conta username' : '📧 Conta email'}
                                {' · '}Criado em {new Date(user.created_at).toLocaleDateString('pt-PT')}
                            </p>
                        </div>
                    </div>

                    {/* Full Name */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Nome Completo</label>
                        <input
                            type="text"
                            value={fullName}
                            onChange={e => setFullName(e.target.value)}
                            placeholder="Nome completo"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Role */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Perfil / Role</label>
                        <select
                            value={appRole}
                            onChange={e => setAppRole(e.target.value)}
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                        >
                            <option value="staff">Staff</option>
                            <option value="clinic_user">Utilizador Clínica</option>
                            <option value="doctor">Médico</option>
                            <option value="admin">Administrador</option>
                        </select>
                        {appRole !== user.app_role && (
                            <p className="text-xs text-amber-600">
                                ⚠️ A alterar de <strong>{ROLE_LABELS[user.app_role]}</strong> para <strong>{ROLE_LABELS[appRole]}</strong>
                            </p>
                        )}
                    </div>

                    {/* Clinics (read-only info) */}
                    {user.clinics.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Clínicas Associadas</label>
                            <div className="flex flex-wrap gap-1.5">
                                {user.clinics.map((c, i) => (
                                    <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs bg-gray-100 text-gray-600 border border-gray-200">
                                        <Building2 className="h-3 w-3" />
                                        {c.clinic_name}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !hasChanges}
                            className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            {loading ? 'A guardar...' : 'Guardar Alterações'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===========================
// RESET PASSWORD MODAL
// ===========================
function ResetPasswordModal({
    user, onClose, onSuccess, onError
}: {
    user: UserData;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, action: 'reset_password', new_password: newPassword })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSuccess(`Password de "${user.full_name}" resetada com sucesso`);
        } catch (err: any) {
            onError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">Resetar Password</h3>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                            {user.full_name.charAt(0)}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-400">{user.is_username_account ? user.username : user.email}</p>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Nova Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={newPassword}
                                onChange={e => setNewPassword(e.target.value)}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full h-10 rounded-lg border border-gray-300 px-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                                required
                                minLength={6}
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading || newPassword.length < 6}
                            className="flex-1 h-10 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                            {loading ? 'A resetar...' : 'Resetar Password'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ===========================
// DELETE CONFIRMATION MODAL
// ===========================
function DeleteConfirmModal({
    user, onClose, onSuccess, onError
}: {
    user: UserData;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [confirmText, setConfirmText] = useState('');
    const [loading, setLoading] = useState(false);

    const expectedText = 'ELIMINAR';
    const isConfirmed = confirmText.toUpperCase() === expectedText;

    const handleDelete = async () => {
        if (!isConfirmed) return;
        setLoading(true);

        try {
            const res = await fetch('/api/users', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, action: 'delete' })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            onSuccess(`Utilizador "${user.full_name}" eliminado com sucesso`);
        } catch (err: any) {
            onError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-red-100 bg-red-50/50 rounded-t-2xl">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="h-4 w-4 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-red-900">Eliminar Utilizador</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-red-100"><X className="h-5 w-5 text-red-400" /></button>
                </div>

                <div className="p-6 space-y-4">
                    {/* User being deleted */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                            user.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                        )}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-400">{user.is_username_account ? `👤 ${user.username}` : `📧 ${user.email}`}</p>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="px-3 py-3 rounded-lg bg-red-50 border border-red-200">
                        <p className="text-sm text-red-800 font-medium mb-1.5">⚠️ Esta ação é irreversível!</p>
                        <ul className="text-xs text-red-700 space-y-1">
                            <li>• A conta de autenticação será eliminada permanentemente</li>
                            <li>• O perfil e todas as associações a clínicas serão removidos</li>
                            <li>• O utilizador perderá todo o acesso à aplicação</li>
                        </ul>
                    </div>

                    {/* Confirmation input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">
                            Para confirmar, escreva <span className="font-bold text-red-600">ELIMINAR</span>
                        </label>
                        <input
                            type="text"
                            value={confirmText}
                            onChange={e => setConfirmText(e.target.value)}
                            placeholder="Escreva ELIMINAR para confirmar"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400"
                            autoFocus
                        />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-3 pt-1">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleDelete}
                            disabled={loading || !isConfirmed}
                            className="flex-1 h-10 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            {loading ? 'A eliminar...' : 'Eliminar Utilizador'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
