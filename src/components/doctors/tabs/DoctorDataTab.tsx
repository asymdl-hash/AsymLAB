'use client';

import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Users, ChevronRight, Mail, Save, Check } from 'lucide-react';
import { doctorsService, DoctorProfile, DoctorClinic } from '@/services/doctorsService';
import ClinicPartnersModal from '../ClinicPartnersModal';
import { supabase } from '@/lib/supabase';

interface DoctorDataTabProps {
    doctorId: string;
}

export default function DoctorDataTab({ doctorId }: DoctorDataTabProps) {
    const { register, watch } = useFormContext<DoctorProfile>();
    const [clinics, setClinics] = useState<DoctorClinic[]>([]);
    const [loadingClinics, setLoadingClinics] = useState(true);
    const [selectedClinic, setSelectedClinic] = useState<DoctorClinic | null>(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Estado do email de contacto
    const [contactEmail, setContactEmail] = useState(watch('contact_email') || '');
    const [savingEmail, setSavingEmail] = useState(false);
    const [emailSaved, setEmailSaved] = useState(false);

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

    return (
        <div className="space-y-8">
            {/* ============ DADOS PESSOAIS ============ */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Informação Pessoal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="full_name">Nome Completo</Label>
                        <Input id="full_name" {...register('full_name')} disabled className="bg-gray-50" />
                        <p className="text-xs text-gray-400 mt-1">Editável nas Definições &gt; Utilizadores</p>
                    </div>
                    <div>
                        <Label htmlFor="phone">Telefone</Label>
                        <Input id="phone" value={watch('phone') || ''} disabled className="bg-gray-50" />
                    </div>
                </div>
            </div>

            {/* ============ EMAIL DE CONTACTO ============ */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1 flex items-center gap-2">
                    <Mail className="h-5 w-5 text-primary" />
                    Email de Contacto
                </h3>
                <p className="text-xs text-gray-400 mb-4">
                    Email usado para comunicações. Diferente do email de login para contas por username.
                </p>
                <div className="flex items-end gap-2">
                    <div className="flex-1">
                        <Input
                            type="email"
                            placeholder="email@exemplo.com"
                            value={contactEmail}
                            onChange={(e) => setContactEmail(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveContactEmail}
                        disabled={savingEmail}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary/90 disabled:opacity-50 transition-all h-10"
                    >
                        {emailSaved ? (
                            <><Check className="h-4 w-4" /> Guardado</>
                        ) : (
                            <><Save className="h-4 w-4" /> Guardar</>
                        )}
                    </button>
                </div>
            </div>

            {/* ============ CLÍNICAS ASSOCIADAS ============ */}
            <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-primary" />
                    Clínicas Associadas
                </h3>

                {loadingClinics ? (
                    <div className="text-sm text-gray-400 py-4">Carregando clínicas...</div>
                ) : clinics.length === 0 ? (
                    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-6 text-center">
                        <Building2 className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Nenhuma clínica associada.</p>
                        <p className="text-xs text-gray-400 mt-1">
                            Associe este médico a uma clínica nas Definições &gt; Utilizadores
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
                                        {/* Logo da Clínica */}
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
                                            <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                                                <Users className="h-3 w-3" />
                                                {clinic.partners.length} {clinic.partners.length === 1 ? 'parceiro' : 'parceiros'}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-primary transition-colors" />
                                </div>

                                {/* Tags / Funções */}
                                {clinic.tags.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <p className="text-xs text-gray-400 mb-1.5">Funções / Tags</p>
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

                                {/* Preview dos parceiros */}
                                {clinic.partners.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-gray-100">
                                        <div className="flex flex-wrap gap-2">
                                            {clinic.partners.map((partner) => (
                                                <span
                                                    key={partner.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600"
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
        </div>
    );
}
