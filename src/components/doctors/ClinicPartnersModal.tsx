'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { doctorsService, DoctorClinic, AvailablePartner } from '@/services/doctorsService';
import { cn } from '@/lib/utils';
import { ROLE_LABELS } from '@/lib/permissions';

interface ClinicPartnersModalProps {
    open: boolean;
    onClose: () => void;
    doctorId: string;
    clinic: DoctorClinic;
    onUpdated: () => void;
}

export default function ClinicPartnersModal({
    open,
    onClose,
    doctorId,
    clinic,
    onUpdated,
}: ClinicPartnersModalProps) {
    const [available, setAvailable] = useState<AvailablePartner[]>([]);
    const [currentPartners, setCurrentPartners] = useState(clinic.partners);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            loadAvailable();
            setCurrentPartners(clinic.partners);
        }
    }, [open, clinic]);

    const loadAvailable = async () => {
        try {
            setLoading(true);
            const data = await doctorsService.getAvailablePartners(clinic.clinic_id);
            setAvailable(data);
        } catch (err) {
            console.error('Erro ao carregar parceiros disponíveis:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (partnerId: string) => {
        try {
            setActionLoading(partnerId);
            await doctorsService.addPartner(doctorId, clinic.clinic_id, partnerId);
            await onUpdated();
            // Recarregar
            const updatedClinics = await doctorsService.getDoctorClinics(doctorId);
            const updated = updatedClinics.find(c => c.clinic_id === clinic.clinic_id);
            if (updated) setCurrentPartners(updated.partners);
        } catch (err) {
            console.error('Erro ao adicionar parceiro:', err);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRemove = async (partnerRecordId: string) => {
        try {
            setActionLoading(partnerRecordId);
            await doctorsService.removePartner(partnerRecordId);
            await onUpdated();
            setCurrentPartners(prev => prev.filter(p => p.id !== partnerRecordId));
        } catch (err) {
            console.error('Erro ao remover parceiro:', err);
        } finally {
            setActionLoading(null);
        }
    };

    // Filtrar: apenas utilizadores que ainda não são parceiros
    const partnerIds = new Set(currentPartners.map(p => p.partner_id));
    const availableFiltered = available.filter(a => !partnerIds.has(a.user_id));

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Overlay */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Parceiros na {clinic.clinic_name}
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                            Escolha os utilizadores que trabalham com este médico
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                    {/* Parceiros Atuais */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Parceiros Atuais ({currentPartners.length})
                        </h4>

                        {currentPartners.length === 0 ? (
                            <p className="text-sm text-gray-400 py-3">Nenhum parceiro adicionado.</p>
                        ) : (
                            <div className="space-y-2">
                                {currentPartners.map((partner) => (
                                    <div
                                        key={partner.id}
                                        className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100"
                                    >
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">
                                                {partner.partner_name}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">
                                                {(ROLE_LABELS as any)[partner.partner_role] || partner.partner_role}
                                            </span>
                                            {partner.partner_phone && (
                                                <span className="text-xs text-gray-400 ml-2">
                                                    · {partner.partner_phone}
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => handleRemove(partner.id)}
                                            disabled={actionLoading === partner.id}
                                        >
                                            {actionLoading === partner.id ? (
                                                <span className="h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                                            ) : (
                                                <Trash2 className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Utilizadores Disponíveis */}
                    <div>
                        <h4 className="text-sm font-medium text-gray-700 mb-3">
                            Adicionar Parceiro
                        </h4>

                        {loading ? (
                            <p className="text-sm text-gray-400 py-3">Carregando...</p>
                        ) : availableFiltered.length === 0 ? (
                            <p className="text-sm text-gray-400 py-3">
                                Todos os utilizadores disponíveis já são parceiros.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {availableFiltered.map((user) => (
                                    <div
                                        key={user.user_id}
                                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:border-primary/30 hover:bg-primary/5 transition-all"
                                    >
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">
                                                {user.full_name}
                                            </span>
                                            <span className="text-xs text-gray-400 ml-2">
                                                {(ROLE_LABELS as any)[user.app_role] || user.app_role}
                                            </span>
                                            {user.role_at_clinic && (
                                                <span className="text-xs text-gray-400 ml-1">
                                                    ({user.role_at_clinic})
                                                </span>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-primary hover:bg-primary/10"
                                            onClick={() => handleAdd(user.user_id)}
                                            disabled={actionLoading === user.user_id}
                                        >
                                            {actionLoading === user.user_id ? (
                                                <span className="h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                                            ) : (
                                                <Plus className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                    <Button variant="outline" onClick={onClose}>
                        Fechar
                    </Button>
                </div>
            </div>
        </div>
    );
}
