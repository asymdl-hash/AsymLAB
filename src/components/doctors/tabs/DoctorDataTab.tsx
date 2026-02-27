'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, ChevronRight, Mail, Save, Check, Lock, ExternalLink, X, Phone } from 'lucide-react';
import { doctorsService, DoctorProfile, DoctorClinic } from '@/services/doctorsService';
import ClinicPartnersModal from '../ClinicPartnersModal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

interface DoctorDataTabProps {
    doctorId: string;
}

// ============ MODAL DE AVISO DO PHONE ============
function PhoneLockedModal({
    isAdmin,
    doctorId,
    onClose,
}: {
    isAdmin: boolean;
    doctorId: string;
    onClose: () => void;
}) {
    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                            <Lock className="h-5 w-5 text-amber-600" />
                        </div>
                        <h3 className="font-semibold text-gray-900">Telefone protegido</h3>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <p className="text-sm text-muted-foreground mb-4">
                    O número de telefone está associado à conta de autenticação.
                    {isAdmin
                        ? ' Para alterá-lo, acede às Definições de Utilizadores.'
                        : ' Apenas o administrador pode alterá-lo.'}
                </p>

                {isAdmin ? (
                    <Link
                        href={`/dashboard/settings?tab=users&userId=${doctorId}`}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-foreground text-sm font-medium hover:bg-primary/90 transition-colors w-full justify-center"
                        onClick={onClose}
                    >
                        <ExternalLink className="h-4 w-4" />
                        Ir para Definições → Utilizadores
                    </Link>
                ) : (
                    <div className="bg-red-50 rounded-lg px-4 py-3 text-sm text-red-600 text-center">
                        ⛔ Sem permissão. Contacta o administrador.
                    </div>
                )}
            </div>
        </div>
    );
}

export default function DoctorDataTab({ doctorId }: DoctorDataTabProps) {
    const { register, watch, setValue } = useFormContext<DoctorProfile>();
    const { isAdmin } = useAuth();
    const [clinics, setClinics] = useState<DoctorClinic[]>([]);
    const [loadingClinics, setLoadingClinics] = useState(true);
    const [selectedClinic, setSelectedClinic] = useState<DoctorClinic | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Estado do email de contacto
    const [contactEmail, setContactEmail] = useState(watch('contact_email') || '');
    const [savingEmail, setSavingEmail] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);

    // Estado do phone (arquitectura §11: auth.users.phone = master)
    const [hasAuthPhone, setHasAuthPhone] = useState<boolean | null>(null); // null = a carregar
    const [phoneValue, setPhoneValue] = useState(watch('phone') || '');
    const [savingPhone, setSavingPhone] = useState(false);
    const [phoneSaved, setPhoneSaved] = useState(false);
    const [phoneModalOpen, setPhoneModalOpen] = useState(false);

    // Carregar clínicas do médico
    useEffect(() => {
        const load = async () => {
            try {
                const data = await doctorsService.getDoctorClinics(doctorId);
                setClinics(data);
            } catch (err) {
                console.error('Erro ao carregar clínicas:', err);
            } finally {
                setLoadingClinics(false);
            }
        };
        load();
    }, [doctorId]);

    // Verificar se auth.users.phone existe (via API protegida)
    // Arquitectura §11: nunca ler auth.phone directamente — usar API com service role
    useEffect(() => {
        const checkAuthPhone = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                const res = await fetch(`/api/users/${doctorId}/phone`, {
                    headers: {
                        Authorization: `Bearer ${session?.access_token || ''}`,
                    },
                });
                if (res.ok) {
                    const json = await res.json();
                    setHasAuthPhone(json.hasAuthPhone);
                }
            } catch {
                setHasAuthPhone(false); // sem resposta → assumir editável
            }
        };
        checkAuthPhone();
    }, [doctorId]);

    // Sincronizar contact_email do form
    useEffect(() => {
        setContactEmail(watch('contact_email') || '');
    }, [watch('contact_email')]);

    const openPartnersModal = (clinic: DoctorClinic) => {
        setSelectedClinic(clinic);
        setModalOpen(true);
    };

    const handlePartnersUpdated = async () => {
        const data = await doctorsService.getDoctorClinics(doctorId);
        setClinics(data);
    };

    const handleSaveContactEmail = async () => {
        setSavingEmail(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ contact_email: contactEmail || null })
                .eq('user_id', doctorId);
            if (error) {
                console.error('Erro ao guardar email:', error);
            } else {
                setEmailSaved(true);
                setTimeout(() => setEmailSaved(false), 2000);
            }
        } catch (err) {
            console.error('Erro ao guardar email:', err);
        } finally {
            setSavingEmail(false);
        }
    };

    // Gravar phone via API (actualiza auth + profile automaticamente via trigger)
    const handleSavePhone = async () => {
        if (!phoneValue.trim()) return;
        setSavingPhone(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const res = await fetch(`/api/users/${doctorId}/phone`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.access_token || ''}`,
                },
                body: JSON.stringify({ phone: phoneValue.trim() }),
            });
            if (res.ok) {
                setValue('phone', phoneValue.trim());
                setHasAuthPhone(true); // agora fica bloqueado (tem auth.phone)
                setPhoneSaved(true);
                setTimeout(() => setPhoneSaved(false), 2000);
            } else {
                console.error('Erro ao guardar telefone');
            }
        } catch (err) {
            console.error('Erro ao guardar telefone:', err);
        } finally {
            setSavingPhone(false);
        }
    };

    const phoneIsLocked = hasAuthPhone === true;
    const phoneIsLoading = hasAuthPhone === null;

    return (
        <div className="space-y-8">
            {/* ============ DADOS PESSOAIS ============ */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informação Pessoal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="full_name">Nome Completo</Label>
                        <Input id="full_name" {...register('full_name')} disabled className="bg-gray-50" />
                        <p className="text-xs text-muted-foreground mt-1">{isAdmin ? 'Editável nas Definições > Utilizadores' : 'Gerido pelo administrador'}</p>
                    </div>

                    {/* ---- Campo Phone com lógica de bloqueio (arquitectura §11) ---- */}
                    <div>
                        <Label htmlFor="phone" className="flex items-center gap-1.5">
                            <Phone className="h-3.5 w-3.5" />
                            Telefone
                            {phoneIsLocked && (
                                <Lock className="h-3 w-3 text-amber-500 ml-0.5" aria-label="Gerido pelo sistema de autenticação" />
                            )}
                        </Label>

                        {phoneIsLoading ? (
                            <div className="h-10 bg-gray-100 rounded-md animate-pulse" />
                        ) : phoneIsLocked ? (
                            // Campo bloqueado: auth.phone existe
                            <div className="relative">
                                <Input
                                    id="phone"
                                    value={watch('phone') || ''}
                                    readOnly
                                    className="bg-gray-50 cursor-pointer pr-10"
                                    onClick={() => setPhoneModalOpen(true)}
                                />
                                <button
                                    type="button"
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-amber-400 hover:text-amber-600"
                                    onClick={() => setPhoneModalOpen(true)}
                                    aria-label="Gerido pelo sistema de autenticação"
                                >
                                    <Lock className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            // Campo editável: sem auth.phone
                            <div className="flex items-center gap-2">
                                <Input
                                    id="phone"
                                    type="tel"
                                    placeholder="9XX XXX XXX"
                                    value={phoneValue}
                                    onChange={(e) => setPhoneValue(e.target.value)}
                                    className="flex-1"
                                />
                                <button
                                    type="button"
                                    onClick={handleSavePhone}
                                    disabled={savingPhone || !phoneValue.trim()}
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-primary text-foreground hover:bg-primary/90 disabled:opacity-50 transition-all h-10 flex-shrink-0"
                                >
                                    {phoneSaved ? (
                                        <><Check className="h-4 w-4" /> Guardado</>
                                    ) : (
                                        <><Save className="h-4 w-4" /> Guardar</>
                                    )}
                                </button>
                            </div>
                        )}

                        {phoneIsLocked && (
                            <button
                                type="button"
                                className="text-xs text-amber-600 hover:underline mt-1 text-left"
                                onClick={() => setPhoneModalOpen(true)}
                            >
                                {isAdmin ? 'Alterar nas Definições →' : 'Contactar administrador'}
                            </button>
                        )}
                        {!phoneIsLocked && !phoneIsLoading && (
                            <p className="text-xs text-muted-foreground mt-1">Será também associado à conta de autenticação.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* ============ EMAIL DE CONTACTO ============ */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email de Contacto
                </h3>
                <p className="text-xs text-muted-foreground mb-4">
                    Email usado para comunicações. Diferente do email de login para contas por username.
                </p>
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={contactEmail}
                            onChange={isAdmin ? (e) => setContactEmail(e.target.value) : undefined}
                            readOnly={!isAdmin}
                            className={!isAdmin ? 'bg-gray-50 cursor-not-allowed' : ''}
                        />
                    </div>
                    {isAdmin && (
                        <button
                            type="button"
                            onClick={handleSaveContactEmail}
                            disabled={savingEmail}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-foreground hover:bg-primary/90 disabled:opacity-50 transition-all h-10"
                        >
                            {emailSaved ? (
                                <><Check className="h-4 w-4" /> Guardado</>
                            ) : (
                                <><Save className="h-4 w-4" /> Guardar</>
                            )}
                        </button>
                    )}
                </div>
            </div>

            {/* ============ CLÍNICAS ASSOCIADAS ============ */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Clínicas Associadas
                </h3>

                {loadingClinics ? (
                    <div className="text-sm text-muted-foreground py-4">Carregando clínicas...</div>
                ) : clinics.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
                        <Building2 className="h-8 w-8 text-foreground/80 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nenhuma clínica associada.</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            {isAdmin ? 'Associe este médico a uma clínica nas Definições > Utilizadores' : 'Sem clínicas associadas. Contacte o administrador.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {clinics.map((clinic) => (
                            <div
                                key={clinic.clinic_id}
                                className="bg-white border border-gray-200 rounded-lg p-4 hover:border-primary/30 hover:shadow-sm transition-all cursor-pointer group"
                                onClick={() => openPartnersModal(clinic)}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        {clinic.clinic_logo ? (
                                            <img
                                                src={clinic.clinic_logo}
                                                alt={clinic.clinic_name}
                                                className="h-10 w-10 rounded-full object-cover border border-gray-100"
                                            />
                                        ) : (
                                            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
                                                {clinic.clinic_name.substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div>
                                            <h4 className="font-medium text-gray-900 text-sm">
                                                {clinic.clinic_name}
                                            </h4>
                                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                <Users className="h-3 w-3" />
                                                {clinic.partners.length} {clinic.partners.length === 1 ? 'parceiro' : 'parceiros'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                </div>

                                {clinic.tags.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-muted-foreground mb-1.5">Funções / Tags</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {clinic.tags.map((tag) => (
                                                <span
                                                    key={tag}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700"
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {clinic.partners.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex flex-wrap gap-2">
                                            {clinic.partners.map((partner) => (
                                                <span
                                                    key={partner.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-muted-foreground"
                                                >
                                                    {partner.partner_name}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Parceiros */}
            {selectedClinic && (
                <ClinicPartnersModal
                    open={modalOpen}
                    onClose={() => {
                        setModalOpen(false);
                        setSelectedClinic(null);
                    }}
                    doctorId={doctorId}
                    clinic={selectedClinic}
                    onUpdated={handlePartnersUpdated}
                />
            )}

            {/* Modal do Phone Bloqueado */}
            {phoneModalOpen && (
                <PhoneLockedModal
                    isAdmin={isAdmin}
                    doctorId={doctorId}
                    onClose={() => setPhoneModalOpen(false)}
                />
            )}
        </div>
    );
}
