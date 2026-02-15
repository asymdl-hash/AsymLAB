'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    UserPlus, RefreshCw, Key, Trash2, Edit3,
    User, Shield, CheckCircle, AlertCircle, X, Eye, EyeOff,
    Building2, Loader2, AlertTriangle, Save, MessageCircle, Smartphone, ExternalLink, Copy, Check,
    HelpCircle, ChevronDown, ChevronUp, Info, Mail, Phone, Send, Plus
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserData {
    id: string;
    email: string;
    phone: string | null;
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
    staff_clinic: 'Staff Clínica',
    staff_lab: 'Staff Lab',
    staff: 'Staff',
};

const ROLE_COLORS: Record<string, string> = {
    admin: 'bg-red-100 text-red-700 border-red-200',
    doctor: 'bg-blue-100 text-blue-700 border-blue-200',
    clinic_user: 'bg-green-100 text-green-700 border-green-200',
    staff_clinic: 'bg-amber-100 text-amber-700 border-amber-200',
    staff_lab: 'bg-purple-100 text-purple-700 border-purple-200',
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
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [showEmailModal, setShowEmailModal] = useState(false);
    const [showFirstLoginAlert, setShowFirstLoginAlert] = useState(false);
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

    const [showHelp, setShowHelp] = useState(false);

    // Auto-dismiss success messages
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(''), 4000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    const ROLE_DESCRIPTIONS: Record<string, { icon: string; description: string; permissions: string[] }> = {
        admin: {
            icon: '🛡️',
            description: 'Acesso total ao sistema. Pode gerir utilizadores, clínicas, pacientes, agenda, faturação, relatórios e definições.',
            permissions: ['Gestão completa de utilizadores', 'Criar/editar clínicas', 'Acesso a todas as funcionalidades', 'Definições do sistema']
        },
        doctor: {
            icon: '🩺',
            description: 'Acesso completo a pacientes e agenda. Pode consultar clínicas e relatórios, mas não alterar definições do sistema.',
            permissions: ['Dashboard completo', 'Pacientes (acesso total)', 'Agenda (acesso total)', 'Clínicas e Faturação (apenas leitura)']
        },
        clinic_user: {
            icon: '🏥',
            description: 'Focado na gestão operacional da clínica. Acesso completo à agenda e faturação, mas leitura limitada em pacientes.',
            permissions: ['Agenda (acesso total)', 'Faturação (acesso total)', 'Pacientes (apenas leitura)', 'Clínicas (apenas leitura)']
        },
        staff: {
            icon: '👤',
            description: 'Acesso básico ao sistema. Pode consultar informações mas não fazer alterações significativas.',
            permissions: ['Dashboard (apenas leitura)', 'Pacientes (apenas leitura)', 'Agenda (apenas leitura)', 'Clínicas (apenas leitura)']
        }
    };

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
                        onClick={() => setShowHelp(!showHelp)}
                        title="Ajuda sobre roles e permissões"
                        className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg border transition-colors",
                            showHelp
                                ? 'bg-blue-50 text-blue-600 border-blue-200'
                                : 'text-gray-500 bg-white border-gray-200 hover:bg-gray-50'
                        )}
                    >
                        <HelpCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">Roles</span>
                        {showHelp ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    </button>
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

            {/* Help Panel - Roles Explanation */}
            {showHelp && (
                <div className="bg-gradient-to-br from-blue-50/80 to-indigo-50/50 rounded-xl border border-blue-200/60 p-5 space-y-4 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 mb-1">
                        <Info className="h-4 w-4 text-blue-500" />
                        <h4 className="text-sm font-semibold text-blue-900">Guia de Roles e Permissões</h4>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(ROLE_DESCRIPTIONS).map(([role, info]) => (
                            <div
                                key={role}
                                className={cn(
                                    "rounded-lg border p-3 bg-white/80 backdrop-blur-sm transition-all hover:shadow-sm",
                                    role === 'admin' ? 'border-red-200' :
                                        role === 'doctor' ? 'border-blue-200' :
                                            role === 'clinic_user' ? 'border-green-200' :
                                                'border-gray-200'
                                )}
                            >
                                <div className="flex items-center gap-2 mb-1.5">
                                    <span className="text-lg">{info.icon}</span>
                                    <span className={cn(
                                        "text-sm font-semibold",
                                        role === 'admin' ? 'text-red-700' :
                                            role === 'doctor' ? 'text-blue-700' :
                                                role === 'clinic_user' ? 'text-green-700' :
                                                    'text-gray-700'
                                    )}>
                                        {ROLE_LABELS[role]}
                                    </span>
                                    <span className={cn(
                                        "ml-auto text-[10px] font-medium px-2 py-0.5 rounded-full",
                                        ROLE_COLORS[role]
                                    )}>
                                        {role}
                                    </span>
                                </div>
                                <p className="text-xs text-gray-600 mb-2">{info.description}</p>
                                <div className="space-y-0.5">
                                    {info.permissions.map((perm, i) => (
                                        <div key={i} className="flex items-center gap-1.5 text-[11px] text-gray-500">
                                            <CheckCircle className="h-3 w-3 text-green-400 flex-shrink-0" />
                                            {perm}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="px-3 py-2 rounded-lg bg-amber-50/80 border border-amber-200/60 text-xs text-amber-700 flex items-start gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                        <div>
                            <strong>Dica:</strong> A associação de utilizadores a clínicas é feita nas definições de cada clínica, na aba "Acesso & Segurança".
                            Para alterar o role de um utilizador existente, clique no ícone de edição ✏️ na lista.
                        </div>
                    </div>
                </div>
            )}

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
                <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto shadow-sm">
                    <table className="w-full" style={{ minWidth: '720px' }}>
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '22%' }}>Utilizador</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '12%' }}>Login</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '14%' }}>Role</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '18%' }}>Clínicas</th>
                                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '14%' }}>Último Login</th>
                                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider" style={{ width: '20%' }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {users.map(user => (
                                <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className={cn(
                                                "h-9 w-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                                                user.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                                            )}>
                                                {user.full_name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.is_username_account ? (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 max-w-full">
                                                <User className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{user.username}</span>
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                                                <Mail className="h-3 w-3" />
                                                Email
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
                                                        <Building2 className="h-3 w-3 shrink-0" />
                                                        <span className="truncate">{c.clinic_name}</span>
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
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    if (user.last_sign_in_at) {
                                                        setShowFirstLoginAlert(true);
                                                    } else {
                                                        setShowWhatsAppModal(true);
                                                    }
                                                }}
                                                title="Enviar Credenciais por WhatsApp"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    if (user.last_sign_in_at) {
                                                        setShowFirstLoginAlert(true);
                                                    } else {
                                                        setShowEmailModal(true);
                                                    }
                                                }}
                                                title="Enviar Credenciais por Email"
                                                className="p-1.5 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                            >
                                                <Mail className="h-4 w-4" />
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

            {/* WhatsApp Send Modal */}
            {showWhatsAppModal && selectedUser && (
                <WhatsAppSendModal
                    user={selectedUser}
                    onClose={() => { setShowWhatsAppModal(false); setSelectedUser(null); }}
                />
            )}

            {/* Email Send Modal */}
            {showEmailModal && selectedUser && (
                <EmailSendModal
                    user={selectedUser}
                    onClose={() => { setShowEmailModal(false); setSelectedUser(null); }}
                    onSuccess={(msg) => setSuccess(msg)}
                    onError={(msg) => setError(msg)}
                />
            )}

            {/* First Login Alert */}
            {showFirstLoginAlert && selectedUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setShowFirstLoginAlert(false); setSelectedUser(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-amber-100 bg-amber-50/50 rounded-t-2xl">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                                    <AlertTriangle className="h-4 w-4 text-amber-600" />
                                </div>
                                <h3 className="text-lg font-semibold text-amber-900">Convite Não Disponível</h3>
                            </div>
                            <button onClick={() => { setShowFirstLoginAlert(false); setSelectedUser(null); }} className="p-1 rounded-md hover:bg-amber-100"><X className="h-5 w-5 text-amber-400" /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                                <div className={cn(
                                    "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                                    selectedUser.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                                )}>
                                    {selectedUser.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-900">{selectedUser.full_name}</p>
                                    <p className="text-xs text-gray-400">
                                        Último login: {new Date(selectedUser.last_sign_in_at!).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                </div>
                            </div>
                            <div className="px-3 py-3 rounded-lg bg-amber-50 border border-amber-200">
                                <p className="text-sm text-amber-800">
                                    <strong>Este utilizador já fez login na app.</strong>
                                </p>
                                <p className="text-xs text-amber-700 mt-1">
                                    Não é possível enviar um novo convite com credenciais. Se o utilizador esqueceu a password, use o botão <strong>🔑 Resetar Password</strong> em vez disso.
                                </p>
                            </div>
                            <button
                                onClick={() => { setShowFirstLoginAlert(false); setSelectedUser(null); }}
                                className="w-full h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
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
    const [phone, setPhone] = useState('');
    const [appRole, setAppRole] = useState('staff_lab');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    // Clínicas
    const [clinics, setClinics] = useState<{ id: string; commercial_name: string }[]>([]);
    const [selectedClinics, setSelectedClinics] = useState<string[]>([]);
    const [loadingClinics, setLoadingClinics] = useState(true);
    const [showClinicDropdown, setShowClinicDropdown] = useState(false);

    // Estado pós-criação
    const [created, setCreated] = useState<{
        loginType: 'username' | 'email';
        loginIdentifier: string;
        password?: string;
        inviteLink?: string;
        fullName: string;
        phone: string;
        email: string;
    } | null>(null);
    const [emailSending, setEmailSending] = useState(false);
    const [emailSent, setEmailSent] = useState(false);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Carregar lista de clínicas
    useEffect(() => {
        const fetchClinics = async () => {
            try {
                const { supabase } = await import('@/lib/supabase');
                const { data } = await supabase
                    .from('clinics')
                    .select('id, commercial_name')
                    .order('commercial_name');
                setClinics(data || []);
            } catch { /* silently fail */ } finally {
                setLoadingClinics(false);
            }
        };
        fetchClinics();
    }, []);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        setTimeout(() => setCopiedField(null), 2000);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const body: any = { full_name: fullName, app_role: appRole };
            if (loginType === 'username') {
                if (!username.trim()) throw new Error('Username é obrigatório');
                if (username.includes('@') || username.includes(' ')) throw new Error('Username não pode conter @ ou espaços');
                body.username = username.trim();
                body.password = password;
            } else {
                if (!email.trim()) throw new Error('Email é obrigatório');
                body.email = email.trim();
                // Email accounts: sem password — usam invite link
            }

            if (phone.trim()) body.phone = phone.trim();
            if (selectedClinics.length > 0) body.clinic_ids = selectedClinics;

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            // Entrar no estado pós-criação
            setCreated({
                loginType,
                loginIdentifier: loginType === 'username' ? username.trim() : email.trim(),
                password: loginType === 'username' ? password : undefined,
                inviteLink: data.user?.invite_link || undefined,
                fullName,
                phone: phone.trim(),
                email: loginType === 'email' ? email.trim() : '',
            });
        } catch (err: any) {
            onError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSendWhatsApp = () => {
        if (!created) return;
        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.asymlab.pt';
        const loginLabel = created.loginType === 'email' ? 'Email' : 'Username';

        let message: string;
        if (created.loginType === 'email' && created.inviteLink) {
            // Fluxo email: enviar link de convite
            message = `🔐 *Dados de Acesso — AsymLAB*\n\nOlá ${created.fullName}! 👋\n\nFoste convidado para a aplicação AsymLAB.\n\n📱 *Clica neste link para criar a tua password e aceder:*\n${created.inviteLink}\n\n📝 *Como instalar a App no telemóvel:*\n1. Abre o link acima no Chrome/Safari\n2. Clica em \"Adicionar ao ecrã inicial\" ou no ícone ⊕\n3. A app ficará disponível como atalho no teu telemóvel!`;
        } else {
            // Fluxo username: enviar credenciais
            message = `🔐 *Dados de Acesso — AsymLAB*\n\nOlá ${created.fullName}! 👋\n\nSeguem os teus dados de acesso à aplicação AsymLAB:\n\n📱 *Link da App:*\n${appUrl}\n\n👤 *${loginLabel}:* ${created.loginIdentifier}\n🔑 *Password:* ${created.password}\n\n📝 *Como instalar a App no telemóvel:*\n1. Abre o link acima no Chrome/Safari\n2. Clica em \"Adicionar ao ecrã inicial\" ou no ícone ⊕\n3. A app ficará disponível como atalho no teu telemóvel!\n\n💡 *Recomendação:* Altera a tua password após o primeiro login em \"A Minha Conta\".`;
        }

        const cleanPhone = created.phone.replace(/\D/g, '');
        const whatsappUrl = cleanPhone
            ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleSendEmail = async () => {
        if (!created || !created.email) return;
        setEmailSending(true);
        const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.asymlab.pt';
        const subject = created.inviteLink
            ? 'Convite — AsymLAB'
            : 'Dados de Acesso — AsymLAB';

        let html: string;
        if (created.inviteLink) {
            // Fluxo email: link de convite para definir password
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1a1a2e;">🔐 Convite — AsymLAB</h2>
                    <p>Olá <strong>${created.fullName}</strong>! 👋</p>
                    <p>Foste convidado para a aplicação <strong>AsymLAB</strong>.</p>
                    <p>Clica no botão abaixo para criar a tua password e aceder:</p>
                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${created.inviteLink}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Criar Password e Aceder</a>
                    </div>
                    <p style="font-size: 13px; color: #6c757d;">Ou copia este link: <a href="${created.inviteLink}">${created.inviteLink}</a></p>
                    <hr style="border: none; border-top: 1px solid #e9ecef; margin: 16px 0;" />
                    <p style="font-size: 14px;">📝 <strong>Como instalar no telemóvel:</strong></p>
                    <ol style="font-size: 14px;">
                        <li>Abre o link acima no Chrome/Safari</li>
                        <li>Clica em "Adicionar ao ecrã inicial"</li>
                        <li>A app ficará disponível como atalho!</li>
                    </ol>
                </div>
            `;
        } else {
            // Fluxo username: credenciais
            const loginLabel = created.loginType === 'email' ? 'Email' : 'Username';
            html = `
                <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #1a1a2e;">🔐 Dados de Acesso — AsymLAB</h2>
                    <p>Olá <strong>${created.fullName}</strong>! 👋</p>
                    <p>Seguem os teus dados de acesso à aplicação AsymLAB:</p>
                    <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin: 16px 0;">
                        <p style="margin: 4px 0;">📱 <strong>Link da App:</strong> <a href="${appUrl}">${appUrl}</a></p>
                        <p style="margin: 4px 0;">👤 <strong>${loginLabel}:</strong> ${created.loginIdentifier}</p>
                        <p style="margin: 4px 0;">🔑 <strong>Password:</strong> ${created.password}</p>
                    </div>
                    <p style="font-size: 13px; color: #6c757d;">💡 <em>Recomendação: Altera a tua password após o primeiro login.</em></p>
                </div>
            `;
        }

        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ to: created.email, subject, html })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setEmailSent(true);
            onSuccess(`Email de convite enviado para ${created.email}`);
        } catch (err: any) {
            onError(err.message || 'Erro ao enviar email');
        } finally {
            setEmailSending(false);
        }
    };

    const handleClose = () => {
        if (created) {
            onSuccess(`Utilizador "${created.loginIdentifier}" criado com sucesso`);
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">
                        {created ? '✅ Conta Criada!' : 'Novo Utilizador'}
                    </h3>
                    <button onClick={handleClose} className="p-1 rounded-md hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                {!created ? (
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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

                        {/* Phone (optional) */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                                <Phone className="h-3.5 w-3.5" /> Telemóvel <span className="text-gray-400 font-normal">(opcional)</span>
                            </label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={e => setPhone(e.target.value)}
                                placeholder="+351 912 345 678"
                                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                            />
                            <p className="text-xs text-gray-400">Usado para envio de credenciais por WhatsApp</p>
                        </div>

                        {/* Password - só para username accounts */}
                        {loginType === 'username' ? (
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
                        ) : (
                            <div className="px-3 py-2.5 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                                <strong>✨ Convite por Email:</strong> Não é necessário definir password.
                                O utilizador receberá um link para criar a sua própria password.
                            </div>
                        )}

                        {/* Role */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium text-gray-700">Perfil / Role</label>
                            <select
                                value={appRole}
                                onChange={e => setAppRole(e.target.value)}
                                className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary bg-white"
                            >
                                <option value="staff_lab">Staff Lab</option>
                                <option value="staff_clinic">Staff Clínica</option>
                                <option value="clinic_user">Utilizador Clínica</option>
                                <option value="doctor">Médico</option>
                                <option value="admin">Administrador</option>
                            </select>
                        </div>

                        {/* Clinic Selection - Dropdown Multi-select */}
                        <div className="space-y-1.5 relative">
                            <label className="text-sm font-medium text-gray-700">Clínicas Associadas <span className="text-gray-400 font-normal">(opcional)</span></label>
                            {loadingClinics ? (
                                <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                    <Loader2 className="h-3 w-3 animate-spin" /> A carregar clínicas...
                                </div>
                            ) : clinics.length === 0 ? (
                                <p className="text-xs text-gray-400 py-1">Nenhuma clínica registada</p>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => setShowClinicDropdown(!showClinicDropdown)}
                                        className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary flex items-center justify-between"
                                    >
                                        <span className={selectedClinics.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                                            {selectedClinics.length === 0
                                                ? 'Selecionar clínicas...'
                                                : `${selectedClinics.length} clínica${selectedClinics.length > 1 ? 's' : ''} selecionada${selectedClinics.length > 1 ? 's' : ''}`
                                            }
                                        </span>
                                        <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showClinicDropdown && "rotate-180")} />
                                    </button>
                                    {showClinicDropdown && (
                                        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                            {clinics.map(c => (
                                                <label
                                                    key={c.id}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedClinics.includes(c.id)}
                                                        onChange={e => {
                                                            if (e.target.checked) {
                                                                setSelectedClinics([...selectedClinics, c.id]);
                                                            } else {
                                                                setSelectedClinics(selectedClinics.filter(id => id !== c.id));
                                                            }
                                                        }}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-gray-700">{c.commercial_name || 'Sem nome'}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                    {selectedClinics.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                                            {selectedClinics.map(cid => {
                                                const clinic = clinics.find(c => c.id === cid);
                                                return clinic ? (
                                                    <span key={cid} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                                                        {clinic.commercial_name}
                                                        <button
                                                            type="button"
                                                            onClick={() => setSelectedClinics(selectedClinics.filter(id => id !== cid))}
                                                            className="hover:text-red-500 transition-colors"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </span>
                                                ) : null;
                                            })}
                                        </div>
                                    )}
                                </>
                            )}
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
                ) : (
                    <div className="p-6 space-y-4 overflow-y-auto flex-1">
                        {/* Post-creation: show credentials */}
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
                            <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                            <p className="text-sm font-medium text-green-800">
                                Conta criada com sucesso para {created.fullName}!
                            </p>
                        </div>

                        <div className="space-y-3">
                            {/* Login Identifier */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-gray-500">
                                    {created.loginType === 'email' ? 'Email' : 'Username'}
                                </label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono">
                                        {created.loginIdentifier}
                                    </div>
                                    <button
                                        onClick={() => handleCopy(created.loginIdentifier, 'login')}
                                        className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                        title="Copiar"
                                    >
                                        {copiedField === 'login' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                    </button>
                                </div>
                            </div>

                            {created.inviteLink ? (
                                /* EMAIL: Link de convite */
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Link de Convite</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs font-mono text-blue-700 break-all">
                                            {created.inviteLink}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(created.inviteLink!, 'invite')}
                                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                            title="Copiar link"
                                        >
                                            {copiedField === 'invite' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                        </button>
                                    </div>
                                </div>
                            ) : created.password ? (
                                /* USERNAME: Password */
                                <div className="space-y-1">
                                    <label className="text-xs font-medium text-gray-500">Password Temporária</label>
                                    <div className="flex items-center gap-2">
                                        <div className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono">
                                            {created.password}
                                        </div>
                                        <button
                                            onClick={() => handleCopy(created.password!, 'password')}
                                            className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                            title="Copiar password"
                                        >
                                            {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                        </button>
                                    </div>
                                </div>
                            ) : null}
                        </div>

                        {created.inviteLink ? (
                            <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                                <strong>✨ Link de convite gerado!</strong> O utilizador vai clicar neste link para definir a sua própria password e aceder à aplicação.
                            </div>
                        ) : (
                            <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                <strong>Importante:</strong> Guarde estas credenciais! A password não será visível novamente.
                            </div>
                        )}

                        {emailSent && (
                            <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
                                <CheckCircle className="h-4 w-4" />
                                <strong>Email de convite enviado com sucesso!</strong>
                            </div>
                        )}

                        {/* Send buttons */}
                        <div className="flex items-center gap-2 pt-2">
                            <button
                                type="button"
                                onClick={handleSendWhatsApp}
                                className="flex-1 h-10 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                            >
                                <MessageCircle className="h-4 w-4" />
                                WhatsApp
                            </button>
                            {created.email && (
                                <button
                                    type="button"
                                    onClick={handleSendEmail}
                                    disabled={emailSending || emailSent}
                                    className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {emailSending ? <Loader2 className="h-4 w-4 animate-spin" /> : emailSent ? <CheckCircle className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
                                    {emailSending ? 'A enviar...' : emailSent ? 'Enviado!' : created.inviteLink ? 'Enviar Convite' : 'Email'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={handleClose}
                                className="h-10 px-4 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Fechar
                            </button>
                        </div>
                    </div>
                )}
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

    // Clinic management
    const [allClinics, setAllClinics] = useState<{ id: string; commercial_name: string }[]>([]);
    const [selectedClinics, setSelectedClinics] = useState<string[]>(user.clinics.map(c => c.clinic_id));
    const [loadingClinics, setLoadingClinics] = useState(true);
    const [showClinicDropdown, setShowClinicDropdown] = useState(false);
    const originalClinics = user.clinics.map(c => c.clinic_id);

    useEffect(() => {
        const fetchClinics = async () => {
            try {
                const { supabase } = await import('@/lib/supabase');
                const { data } = await supabase
                    .from('clinics')
                    .select('id, commercial_name')
                    .order('commercial_name');
                setAllClinics(data || []);
            } catch { /* silently fail */ } finally {
                setLoadingClinics(false);
            }
        };
        fetchClinics();
    }, []);

    const toggleClinic = (clinicId: string) => {
        setSelectedClinics(prev =>
            prev.includes(clinicId) ? prev.filter(id => id !== clinicId) : [...prev, clinicId]
        );
    };

    const clinicsChanged = JSON.stringify([...selectedClinics].sort()) !== JSON.stringify([...originalClinics].sort());
    const hasChanges = fullName !== user.full_name || appRole !== user.app_role || clinicsChanged;

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

            // Atualizar clínicas se mudaram
            if (clinicsChanged) {
                const toAdd = selectedClinics.filter(id => !originalClinics.includes(id));
                const toRemove = originalClinics.filter(id => !selectedClinics.includes(id));

                for (const clinicId of toAdd) {
                    const res = await fetch('/api/users/clinic-access', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, clinic_id: clinicId })
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error);
                    }
                }

                for (const clinicId of toRemove) {
                    const res = await fetch('/api/users/clinic-access', {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id, clinic_id: clinicId })
                    });
                    if (!res.ok) {
                        const data = await res.json();
                        throw new Error(data.error);
                    }
                }

                updates.push('clínicas');
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
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
                    <h3 className="text-lg font-semibold text-gray-900">Editar Utilizador</h3>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-gray-100"><X className="h-5 w-5 text-gray-400" /></button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
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
                            <option value="staff_lab">Staff Lab</option>
                            <option value="staff_clinic">Staff Clínica</option>
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

                    {/* Clinics — Dropdown Multi-select */}
                    <div className="space-y-1.5 relative">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Building2 className="h-4 w-4 text-gray-400" />
                            Clínicas Associadas
                        </label>
                        {loadingClinics ? (
                            <div className="flex items-center gap-2 text-xs text-gray-400 py-2">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                A carregar clínicas...
                            </div>
                        ) : allClinics.length === 0 ? (
                            <p className="text-xs text-gray-400">Nenhuma clínica disponível</p>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setShowClinicDropdown(!showClinicDropdown)}
                                    className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm text-left bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary flex items-center justify-between"
                                >
                                    <span className={selectedClinics.length === 0 ? 'text-gray-400' : 'text-gray-700'}>
                                        {selectedClinics.length === 0
                                            ? 'Selecionar clínicas...'
                                            : `${selectedClinics.length} clínica${selectedClinics.length > 1 ? 's' : ''} selecionada${selectedClinics.length > 1 ? 's' : ''}`
                                        }
                                    </span>
                                    <ChevronDown className={cn("h-4 w-4 text-gray-400 transition-transform", showClinicDropdown && "rotate-180")} />
                                </button>
                                {showClinicDropdown && (
                                    <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                                        {allClinics.map(clinic => {
                                            const isSelected = selectedClinics.includes(clinic.id);
                                            const wasOriginal = originalClinics.includes(clinic.id);
                                            return (
                                                <label
                                                    key={clinic.id}
                                                    className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={() => toggleClinic(clinic.id)}
                                                        className="rounded border-gray-300 text-primary focus:ring-primary"
                                                    />
                                                    <span className="text-gray-700 flex-1">{clinic.commercial_name}</span>
                                                    {isSelected && !wasOriginal && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">NOVO</span>
                                                    )}
                                                    {!isSelected && wasOriginal && (
                                                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-medium">REMOVER</span>
                                                    )}
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                                {selectedClinics.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                                        {selectedClinics.map(cid => {
                                            const clinic = allClinics.find(c => c.id === cid);
                                            const wasOriginal = originalClinics.includes(cid);
                                            return clinic ? (
                                                <span key={cid} className={cn(
                                                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                    !wasOriginal ? 'bg-green-100 text-green-700' : 'bg-primary/10 text-primary'
                                                )}>
                                                    {clinic.commercial_name}
                                                    <button
                                                        type="button"
                                                        onClick={() => toggleClinic(cid)}
                                                        className="hover:text-red-500 transition-colors"
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </span>
                                            ) : null;
                                        })}
                                    </div>
                                )}
                            </>
                        )}
                    </div>

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
// WHATSAPP SEND MODAL
// ===========================
function WhatsAppSendModal({
    user, onClose
}: {
    user: UserData;
    onClose: () => void;
}) {
    const [phone, setPhone] = useState(user.phone || '');
    const [copied, setCopied] = useState(false);

    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.asymlab.pt';
    const loginIdentifier = user.is_username_account ? user.username : user.email;

    const message = `🔐 *Dados de Acesso — AsymLAB*

Olá ${user.full_name}! 👋

Seguem os teus dados de acesso à aplicação AsymLAB:

📱 *Link da App:*
${appUrl}

👤 *Login:* ${loginIdentifier}
🔑 *Password:* (definida pelo administrador)

📝 *Como instalar a App no telemóvel:*
1. Abre o link acima no Chrome/Safari
2. Clica em "Adicionar ao ecrã inicial" ou no ícone ⊕
3. A app ficará disponível como atalho no teu telemóvel!

💡 *Recomendação:* Altera a tua password após o primeiro login em "A Minha Conta".

Qualquer dúvida, contacta o administrador.`;

    const cleanPhone = phone.replace(/\D/g, '');

    const handleSendWhatsApp = () => {
        if (!cleanPhone) return;
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch {
            // fallback
            const textArea = document.createElement('textarea');
            textArea.value = message;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-green-100 bg-green-50/50 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
                            <MessageCircle className="h-4 w-4 text-green-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-green-900">Enviar via WhatsApp</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-green-100"><X className="h-5 w-5 text-green-400" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* User card */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                            user.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                        )}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-400">
                                {user.is_username_account ? `👤 ${user.username}` : `📧 ${user.email}`}
                            </p>
                        </div>
                    </div>

                    {/* Phone input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Smartphone className="h-4 w-4 text-gray-400" />
                            Número de Telefone
                        </label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={e => setPhone(e.target.value)}
                            placeholder="351912345678 (com indicativo)"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 focus:border-green-400"
                            autoFocus
                        />
                        <p className="text-xs text-gray-400">Inclui o indicativo do país (ex: 351 para Portugal)</p>
                    </div>

                    {/* Message preview */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Pré-visualização da Mensagem</label>
                        <div className="relative">
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono leading-relaxed">
                                {message}
                            </div>
                            <button
                                onClick={handleCopy}
                                className="absolute top-2 right-2 p-1.5 rounded-md bg-white border border-gray-200 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                                title="Copiar mensagem"
                            >
                                {copied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                            </button>
                        </div>
                    </div>

                    {/* Info note */}
                    <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                        <strong>Nota:</strong> A password não é incluída na mensagem por segurança.
                        Comunique a password temporária pessoalmente ou defina-a pelo botão 🔑.
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleSendWhatsApp}
                        disabled={!cleanPhone}
                        className="flex-1 h-10 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <ExternalLink className="h-4 w-4" />
                        Enviar via WhatsApp
                    </button>
                </div>
            </div>
        </div>
    );
}

// ===========================
// EMAIL SEND MODAL
// ===========================
function EmailSendModal({
    user, onClose, onSuccess, onError
}: {
    user: UserData;
    onClose: () => void;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}) {
    const [email, setEmail] = useState(user.email || '');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const appUrl = typeof window !== 'undefined' ? window.location.origin : 'https://app.asymlab.pt';
    const loginIdentifier = user.is_username_account ? user.username : user.email;
    const loginLabel = user.is_username_account ? 'Username' : 'Email';

    const messagePreview = `🔐 Dados de Acesso — AsymLAB

Olá ${user.full_name}! 👋

Seguem os teus dados de acesso:

📱 Link da App: ${appUrl}
👤 ${loginLabel}: ${loginIdentifier}
🔑 Password: (definida pelo administrador)

📝 Como instalar no telemóvel:
1. Abre o link acima no Chrome/Safari
2. Clica em "Adicionar ao ecrã inicial"

💡 Recomendação: Altera a tua password após o primeiro login.`;

    const html = `
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #1a1a2e;">🔐 Dados de Acesso — AsymLAB</h2>
            <p>Olá <strong>${user.full_name}</strong>! 👋</p>
            <p>Seguem os teus dados de acesso à aplicação AsymLAB:</p>
            <div style="background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 16px; margin: 16px 0;">
                <p style="margin: 4px 0;">📱 <strong>Link da App:</strong> <a href="${appUrl}">${appUrl}</a></p>
                <p style="margin: 4px 0;">👤 <strong>${loginLabel}:</strong> ${loginIdentifier}</p>
                <p style="margin: 4px 0;">🔑 <strong>Password:</strong> (definida pelo administrador)</p>
            </div>
            <p style="font-size: 14px;">📝 <strong>Como instalar no telemóvel:</strong></p>
            <ol style="font-size: 14px;">
                <li>Abre o link acima no Chrome/Safari</li>
                <li>Clica em "Adicionar ao ecrã inicial" ou no ícone ⊕</li>
                <li>A app ficará disponível como atalho!</li>
            </ol>
            <p style="font-size: 13px; color: #6c757d; border-top: 1px solid #e9ecef; padding-top: 12px; margin-top: 16px;">💡 <em>Recomendação: Altera a tua password após o primeiro login em "A Minha Conta".</em></p>
        </div>
    `;

    const handleSendEmail = async () => {
        if (!email.trim()) return;
        setLoading(true);
        try {
            const res = await fetch('/api/send-email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    to: email.trim(),
                    subject: 'Dados de Acesso — AsymLAB',
                    html,
                })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setSent(true);
            onSuccess(`Email enviado com sucesso para ${email}`);
        } catch (err: any) {
            onError(err.message || 'Erro ao enviar email');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-blue-100 bg-blue-50/50 rounded-t-2xl flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-blue-900">Enviar via Email</h3>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-md hover:bg-blue-100"><X className="h-5 w-5 text-blue-400" /></button>
                </div>

                <div className="p-6 space-y-4 overflow-y-auto flex-1">
                    {/* User card */}
                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                        <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold",
                            user.app_role === 'admin' ? 'bg-red-100 text-red-600' : 'bg-primary/10 text-primary'
                        )}>
                            {user.full_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                            <p className="text-xs text-gray-400">
                                {user.is_username_account ? `👤 ${user.username}` : `📧 ${user.email}`}
                            </p>
                        </div>
                    </div>

                    {/* Email input */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                            <Mail className="h-4 w-4 text-gray-400" />
                            Email do Destinatário
                        </label>
                        <input
                            type="email"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="email@exemplo.com"
                            className="w-full h-10 rounded-lg border border-gray-300 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400"
                            autoFocus
                            disabled={sent}
                        />
                    </div>

                    {/* Message preview */}
                    <div className="space-y-1.5">
                        <label className="text-sm font-medium text-gray-700">Pré-visualização da Mensagem</label>
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-600 whitespace-pre-wrap max-h-48 overflow-y-auto font-mono leading-relaxed">
                            {messagePreview}
                        </div>
                    </div>

                    {/* Info note */}
                    <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                        <strong>Nota:</strong> A password não é incluída no email por segurança.
                        Comunique a password temporária pessoalmente ou defina-a pelo botão 🔑.
                    </div>

                    {sent && (
                        <div className="px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-xs text-green-700 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            <strong>Email enviado com sucesso!</strong>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={handleSendEmail}
                        disabled={!email.trim() || loading || sent}
                        className="flex-1 h-10 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : sent ? <CheckCircle className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                        {loading ? 'A enviar...' : sent ? 'Enviado!' : 'Enviar Email'}
                    </button>
                </div>
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
