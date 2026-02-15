
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
    Plus, Trash2, User, Phone, Mail, Briefcase,
    UserPlus, Copy, Check, MessageCircle, ExternalLink,
    Loader2, KeyRound, X, AlertCircle, CheckCircle, Info
} from 'lucide-react';
import { ClinicFullDetails, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { cn } from '@/lib/utils';

interface CreatedCredentials {
    username: string;
    password: string;
    full_name: string;
    phone?: string;
}

export default function ClinicTeamTab() {
    const { control, register, getValues, setValue, watch } = useFormContext<ClinicFullDetails>();

    // Estado para o Modal de Confirmação de eliminação
    const [deleteTarget, setDeleteTarget] = useState<{ index: number, id: string } | null>(null);

    // Estados para criação de conta
    const [showCreateAccountModal, setShowCreateAccountModal] = useState(false);
    const [targetMemberIndex, setTargetMemberIndex] = useState<number | null>(null);
    const [creatingAccount, setCreatingAccount] = useState(false);
    const [createdCredentials, setCreatedCredentials] = useState<CreatedCredentials | null>(null);
    const [accountError, setAccountError] = useState('');
    const [copiedField, setCopiedField] = useState<string | null>(null);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_staff"
    });

    // Gerar username a partir do nome
    const generateUsername = (name: string): string => {
        if (!name) return '';
        return name
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // remover acentos
            .replace(/[^a-z\s]/g, '')        // remover caracteres especiais
            .trim()
            .replace(/\s+/g, '.');           // espaços -> ponto
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

    const handleAddMember = async () => {
        const clinicId = control._formValues.id;
        try {
            const newMember = await clinicsService.createRelatedRecord('clinic_staff', {
                clinic_id: clinicId,
                name: '',
                role: 'assistant',
                phone: '',
                email: ''
            });
            append(newMember);
        } catch (error) {
            console.error("Erro ao adicionar membro", error);
            alert("Erro ao criar registo.");
        }
    };


    const confirmDeleteMember = async () => {
        if (!deleteTarget) return;

        try {
            await clinicsService.deleteRecord('clinic_staff', deleteTarget.id);
            remove(deleteTarget.index);
            setDeleteTarget(null);
        } catch (error) {
            console.error("Erro ao remover membro", error);
            alert("Erro ao remover. Tente novamente.");
        }
    };

    const handleUpdateMember = async (index: number, field: string, value: string) => {
        const currentData = control._formValues.clinic_staff;
        const memberId = currentData[index]?.id;

        if (!memberId) return;

        try {
            await clinicsService.updateRecord('clinic_staff', memberId, { [field]: value });
        } catch (error) {
            console.error("Erro ao salvar membro", error);
        }
    };

    // Abrir modal de criação de conta
    const openCreateAccountModal = (index: number) => {
        setTargetMemberIndex(index);
        setShowCreateAccountModal(true);
        setCreatedCredentials(null);
        setAccountError('');
    };

    // Criar conta para o membro
    const handleCreateAccount = async () => {
        if (targetMemberIndex === null) return;

        const currentData = control._formValues.clinic_staff;
        const member = currentData[targetMemberIndex];

        if (!member?.name) {
            setAccountError('O membro precisa de ter um nome preenchido antes de criar conta.');
            return;
        }

        setCreatingAccount(true);
        setAccountError('');

        try {
            const username = generateUsername(member.name);
            const password = generatePassword();
            const clinicId = control._formValues.id;

            // Mapear role do staff para app_role
            const roleMapping: Record<string, string> = {
                'assistant': 'clinic_user',
                'receptionist': 'clinic_user',
                'accounting': 'clinic_user',
                'manager': 'clinic_user',
                'other': 'staff'
            };

            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username,
                    password,
                    full_name: member.name,
                    app_role: roleMapping[member.role] || 'clinic_user',
                    clinic_ids: [clinicId]
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error);

            setCreatedCredentials({
                username,
                password,
                full_name: member.name,
                phone: member.phone || undefined,
            });
        } catch (err: any) {
            setAccountError(err.message || 'Erro ao criar conta');
        } finally {
            setCreatingAccount(false);
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
        const message = `🔐 *Dados de Acesso — AsymLAB*

Olá ${createdCredentials.full_name}! 👋

Seguem os teus dados de acesso à aplicação AsymLAB:

📱 *Link da App:*
${appUrl}

👤 *Username:* ${createdCredentials.username}
🔑 *Password:* ${createdCredentials.password}

📝 *Como instalar a App no telemóvel:*
1. Abre o link acima no Chrome/Safari
2. Clica em "Adicionar ao ecrã inicial" ou no ícone ⊕
3. A app ficará disponível como atalho no teu telemóvel!

💡 *Recomendação:* Altera a tua password após o primeiro login em "A Minha Conta".`;

        const phone = createdCredentials.phone?.replace(/\D/g, '') || '';
        const whatsappUrl = phone
            ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            : `https://wa.me/?text=${encodeURIComponent(message)}`;

        window.open(whatsappUrl, '_blank');
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium">Equipa da Clínica</h3>
                    <p className="text-sm text-gray-500">Gestão de médicos, assistentes e staff administrativo.</p>
                </div>
                <Button onClick={handleAddMember} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Membro
                </Button>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Marque membros como <strong>"Contacto da Clínica"</strong> para que apareçam automaticamente no bloco de Contactos da aba Dados e como opção nos locais de entrega.</span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {fields.length === 0 ? (
                    <div className="col-span-2 text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                        <User className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <h3 className="text-sm font-medium text-gray-900">Sem equipa registada</h3>
                        <p className="text-sm text-gray-500 mt-1">Adicione colaboradores para associar a tarefas e permissões.</p>
                    </div>
                ) : (
                    fields.map((field, index) => (
                        <Card key={field.id} className="relative overflow-hidden group hover:border-primary/20 transition-all">
                            <CardContent className="p-5 space-y-4">
                                {/* Botões de acção */}
                                <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {/* Botão criar conta */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-primary hover:bg-primary/10"
                                        onClick={() => openCreateAccountModal(index)}
                                        title="Criar conta de acesso"
                                    >
                                        <UserPlus className="h-4 w-4" />
                                    </Button>
                                    {/* Botão remover */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                        onClick={() => {
                                            const currentValues = control._formValues.clinic_staff || [];
                                            const realId = currentValues[index]?.id;
                                            if (realId) setDeleteTarget({ index, id: realId });
                                        }}
                                        title="Remover colaborador"
                                    >   <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 space-y-3">
                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-400">Nome Completo</Label>
                                            <Input
                                                {...register(`clinic_staff.${index}.name`)}
                                                className="font-medium h-9"
                                                placeholder="Nome do colaborador"
                                                onBlur={(e) => handleUpdateMember(index, 'name', e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs text-gray-400 flex items-center gap-1">
                                                <Briefcase className="h-3 w-3" /> Função
                                            </Label>
                                            <select
                                                {...register(`clinic_staff.${index}.role`)}
                                                className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                onBlur={(e) => handleUpdateMember(index, 'role', e.target.value)}
                                            >
                                                <option value="assistant">Assistente</option>
                                                <option value="receptionist">Rececionista</option>
                                                <option value="accounting">Contabilidade</option>
                                                <option value="manager">Gestor</option>
                                                <option value="other">Outro</option>
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Phone className="h-3 w-3" /> Telemóvel
                                                </Label>
                                                <Input
                                                    {...register(`clinic_staff.${index}.phone`)}
                                                    className="h-8 text-sm"
                                                    placeholder="+351..."
                                                    onBlur={(e) => handleUpdateMember(index, 'phone', e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Mail className="h-3 w-3" /> Email
                                                </Label>
                                                <Input
                                                    {...register(`clinic_staff.${index}.email`)}
                                                    className="h-8 text-sm"
                                                    placeholder="email@..."
                                                    onBlur={(e) => handleUpdateMember(index, 'email', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Toggle Contacto da Clínica */}
                                        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                            <label
                                                htmlFor={`contact-toggle-${index}`}
                                                className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none"
                                            >
                                                <Phone className="h-3 w-3" />
                                                Contacto da Clínica
                                            </label>
                                            <button
                                                id={`contact-toggle-${index}`}
                                                type="button"
                                                role="switch"
                                                aria-checked={watch(`clinic_staff.${index}.is_contact`) || false}
                                                className={cn(
                                                    "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                    watch(`clinic_staff.${index}.is_contact`) ? 'bg-primary' : 'bg-gray-200'
                                                )}
                                                onClick={() => {
                                                    const current = getValues(`clinic_staff.${index}.is_contact`) || false;
                                                    const newValue = !current;
                                                    setValue(`clinic_staff.${index}.is_contact`, newValue);
                                                    handleUpdateMember(index, 'is_contact', newValue as any);
                                                }}
                                            >
                                                <span
                                                    className={cn(
                                                        "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                                                        watch(`clinic_staff.${index}.is_contact`) ? 'translate-x-4' : 'translate-x-0'
                                                    )}
                                                />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <ConfirmModal
                    isOpen={!!deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={confirmDeleteMember}
                    title="Remover Colaborador"
                    description="Tem a certeza que pretende remover este colaborador? Esta ação é irreversível."
                    confirmText="Remover"
                    cancelText="Cancelar"
                    variant="destructive"
                />
            )}

            {/* ========= CREATE ACCOUNT MODAL ========= */}
            {showCreateAccountModal && targetMemberIndex !== null && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => { setShowCreateAccountModal(false); setCreatedCredentials(null); }}>
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-primary/10 bg-primary/5 rounded-t-2xl flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <KeyRound className="h-4 w-4 text-primary" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {createdCredentials ? 'Conta Criada!' : 'Criar Conta de Acesso'}
                                </h3>
                            </div>
                            <button onClick={() => { setShowCreateAccountModal(false); setCreatedCredentials(null); }} className="p-1 rounded-md hover:bg-gray-100">
                                <X className="h-5 w-5 text-gray-400" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 overflow-y-auto flex-1">
                            {!createdCredentials ? (
                                <>
                                    {/* Pre-creation view */}
                                    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 border border-gray-200">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                                            {(control._formValues.clinic_staff?.[targetMemberIndex]?.name || '?').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">
                                                {control._formValues.clinic_staff?.[targetMemberIndex]?.name || 'Sem nome'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {control._formValues.clinic_staff?.[targetMemberIndex]?.role || 'staff'}
                                                {' • '}
                                                {control._formValues.commercial_name || 'Clínica'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <div className="px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs text-blue-700">
                                            <p className="font-medium mb-1">O que vai acontecer:</p>
                                            <ul className="space-y-1 list-disc list-inside">
                                                <li>Será criada uma <strong>conta de acesso</strong> para este colaborador</li>
                                                <li>O <strong>username</strong> será gerado a partir do nome: <code className="bg-blue-100 px-1 rounded">{generateUsername(control._formValues.clinic_staff?.[targetMemberIndex]?.name || '')}</code></li>
                                                <li>Uma <strong>password temporária</strong> será gerada automaticamente</li>
                                                <li>A conta será associada a esta clínica com role <strong>clinic_user</strong></li>
                                            </ul>
                                        </div>

                                        {!control._formValues.clinic_staff?.[targetMemberIndex]?.name && (
                                            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                                Preencha o nome do colaborador antes de criar a conta.
                                            </div>
                                        )}
                                    </div>

                                    {accountError && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                                            <AlertCircle className="h-4 w-4 flex-shrink-0" />
                                            {accountError}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    {/* Post-creation: show credentials */}
                                    <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-green-50 border border-green-200">
                                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                                        <p className="text-sm font-medium text-green-800">
                                            Conta criada com sucesso para {createdCredentials.full_name}!
                                        </p>
                                    </div>

                                    <div className="space-y-3">
                                        {/* Username */}
                                        <div className="space-y-1">
                                            <label className="text-xs font-medium text-gray-500">Username</label>
                                            <div className="flex items-center gap-2">
                                                <div className="flex-1 px-3 py-2 rounded-lg bg-gray-50 border border-gray-200 text-sm font-mono">
                                                    {createdCredentials.username}
                                                </div>
                                                <button
                                                    onClick={() => handleCopy(createdCredentials.username, 'username')}
                                                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                    title="Copiar username"
                                                >
                                                    {copiedField === 'username' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
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
                                                    onClick={() => handleCopy(createdCredentials.password, 'password')}
                                                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                                                    title="Copiar password"
                                                >
                                                    {copiedField === 'password' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-gray-400" />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-700">
                                        <strong>Importante:</strong> Guarde estas credenciais! A password não será visível novamente.
                                        Recomende ao utilizador que altere a password no primeiro login.
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-shrink-0">
                            {!createdCredentials ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateAccountModal(false); setCreatedCredentials(null); }}
                                        className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleCreateAccount}
                                        disabled={creatingAccount || !control._formValues.clinic_staff?.[targetMemberIndex]?.name}
                                        className="flex-1 h-10 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {creatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                        {creatingAccount ? 'A criar...' : 'Criar Conta'}
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        onClick={handleSendWhatsApp}
                                        className="flex-1 h-10 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <MessageCircle className="h-4 w-4" />
                                        Enviar via WhatsApp
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setShowCreateAccountModal(false); setCreatedCredentials(null); }}
                                        className="flex-1 h-10 rounded-lg border border-gray-300 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Fechar
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
