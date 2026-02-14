'use client';

import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { UserPlus, Mail, User, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { ClinicFullDetails } from '@/services/clinicsService';
import { supabase } from '@/lib/supabase';

interface InviteStatus {
    loading: boolean;
    success: boolean | null;
    message: string;
}

export default function ClinicSecurityTab() {
    const { watch } = useFormContext<ClinicFullDetails>();
    const clinicEmail = watch('email');
    const clinicId = watch('id');
    const clinicName = watch('commercial_name');

    const [inviteStatus, setInviteStatus] = useState<InviteStatus>({
        loading: false,
        success: null,
        message: ''
    });

    const [fullName, setFullName] = useState('');

    const handleInviteUser = async () => {
        if (!clinicEmail) {
            setInviteStatus({
                loading: false,
                success: false,
                message: 'Por favor preencha o email da clínica na aba "Dados"'
            });
            return;
        }

        if (!fullName.trim()) {
            setInviteStatus({
                loading: false,
                success: false,
                message: 'Por favor insira o nome completo do utilizador'
            });
            return;
        }

        setInviteStatus({ loading: true, success: null, message: 'A enviar convite...' });

        try {
            // Chamar Edge Function
            const { data: { session } } = await supabase.auth.getSession();

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/invite-clinic-user`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token}`
                    },
                    body: JSON.stringify({
                        email: clinicEmail,
                        clinic_id: clinicId,
                        full_name: fullName.trim(),
                        can_edit: false // Por defeito read-only
                    })
                }
            );

            const result = await response.json();

            if (result.success) {
                setInviteStatus({
                    loading: false,
                    success: true,
                    message: `Convite enviado para ${clinicEmail}. Verifique a caixa de email.`
                });
                setFullName(''); // Limpar campo
            } else {
                throw new Error(result.error || 'Erro ao enviar convite');
            }

        } catch (error: any) {
            console.error('Invite error:', error);
            setInviteStatus({
                loading: false,
                success: false,
                message: error.message || 'Erro ao enviar convite. Tente novamente.'
            });
        }
    };

    return (
        <div className="space-y-6">
            {/* Card: Criar Acesso */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5 text-primary" />
                        Criar Acesso para a Clínica
                    </CardTitle>
                    <CardDescription>
                        Envie um convite por email para criar um utilizador com acesso a esta clínica.
                        O utilizador receberá um email com instruções para definir a sua password.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Email da Clínica (Read-Only) */}
                    <div className="space-y-2">
                        <Label htmlFor="invite_email" className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            Email (da aba Dados)
                        </Label>
                        <Input
                            id="invite_email"
                            value={clinicEmail || ''}
                            disabled
                            placeholder="Preencha o email na aba Dados primeiro"
                            className="bg-gray-50"
                        />
                    </div>

                    {/* Nome Completo */}
                    <div className="space-y-2">
                        <Label htmlFor="invite_name" className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            Nome Completo do Utilizador
                        </Label>
                        <Input
                            id="invite_name"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Ex: Dr. João Silva"
                            disabled={!clinicEmail}
                        />
                    </div>

                    {/* Status do Convite */}
                    {inviteStatus.message && (
                        <div className={`flex items-start gap-2 p-3 rounded-md border ${inviteStatus.success === null
                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                            : inviteStatus.success
                                ? 'bg-green-50 border-green-200 text-green-700'
                                : 'bg-red-50 border-red-200 text-red-700'
                            }`}>
                            {inviteStatus.loading ? (
                                <Loader2 className="h-5 w-5 animate-spin mt-0.5 flex-shrink-0" />
                            ) : inviteStatus.success ? (
                                <CheckCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            ) : (
                                <XCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            )}
                            <p className="text-sm">{inviteStatus.message}</p>
                        </div>
                    )}

                    {/* Botão de Ação */}
                    <Button
                        onClick={handleInviteUser}
                        disabled={!clinicEmail || !fullName.trim() || inviteStatus.loading}
                        className="w-full gap-2"
                    >
                        {inviteStatus.loading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                A enviar...
                            </>
                        ) : (
                            <>
                                <Shield className="h-4 w-4" />
                                Enviar Convite
                            </>
                        )}
                    </Button>
                </CardContent>
            </Card>

            {/* Card: Informações e Avisos */}
            <Card className="border-amber-200 bg-amber-50/50">
                <CardHeader>
                    <CardTitle className="text-amber-800 text-base">ℹ️ Informações Importantes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-amber-700">
                    <p>
                        • O convite será enviado para <strong>{clinicEmail || '(email não definido)'}</strong>
                    </p>
                    <p>
                        • O utilizador terá acesso <strong>apenas ao Dashboard de Pacientes</strong> desta clínica
                    </p>
                    <p>
                        • Por defeito, o acesso é <strong>apenas de leitura</strong> (sem permissões de edição)
                    </p>
                    <p>
                        • Após aceitar o convite, o utilizador deve alterar a password inicial
                    </p>
                    <p className="pt-2 border-t border-amber-200">
                        <strong>Nota:</strong> As permissões granulares (campos editáveis, etc.) serão configuráveis na aba "Permissões" em breve.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
