
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
    Plus, Trash2, User, Phone, Briefcase,
    Loader2, Info, ChevronDown, X
} from 'lucide-react';
import { ClinicFullDetails, ClinicTeamMember, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    doctor: 'Médico',
    staff_clinic: 'Staff Clínica',
    staff_lab: 'Staff Lab',
    contabilidade_clinic: 'Contabilidade Clínica',
    contabilidade_lab: 'Contabilidade Lab',
};

interface AvailableUser {
    user_id: string;
    full_name: string;
    app_role: string;
    phone: string | null;
}

export default function ClinicTeamTab() {
    const { getValues } = useFormContext<ClinicFullDetails>();
    const clinicId = getValues().id;

    // Team members state
    const [team, setTeam] = useState<ClinicTeamMember[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteTarget, setDeleteTarget] = useState<{ userId: string; name: string } | null>(null);

    // Add member
    const [showAddDropdown, setShowAddDropdown] = useState(false);
    const [availableUsers, setAvailableUsers] = useState<AvailableUser[]>([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Load team
    const loadTeam = useCallback(async () => {
        if (!clinicId) return;
        try {
            const data = await clinicsService.getClinicTeam(clinicId);
            setTeam(data);
        } catch (error) {
            console.error('Erro ao carregar equipa', error);
        } finally {
            setLoading(false);
        }
    }, [clinicId]);

    useEffect(() => { loadTeam(); }, [loadTeam]);

    // Load available users (not yet in this clinic)
    const loadAvailableUsers = useCallback(async () => {
        if (!clinicId) return;
        setLoadingUsers(true);
        try {
            const { data, error } = await supabase
                .from('user_profiles')
                .select('user_id, full_name, app_role, phone')
                .order('full_name');
            if (error) throw error;

            const teamUserIds = team.map(m => m.user_id);
            setAvailableUsers(
                (data || []).filter(u => !teamUserIds.includes(u.user_id))
            );
        } catch (error) {
            console.error('Erro ao carregar utilizadores', error);
        } finally {
            setLoadingUsers(false);
        }
    }, [clinicId, team]);

    // Toggle contact
    const handleToggleContact = async (userId: string, currentValue: boolean) => {
        try {
            await clinicsService.toggleTeamContact(userId, clinicId, !currentValue);
            setTeam(prev => prev.map(m =>
                m.user_id === userId ? { ...m, is_contact: !currentValue } : m
            ));
            // Notificar outros componentes
            window.dispatchEvent(new CustomEvent('clinic-updated'));
        } catch (error) {
            console.error('Erro ao alterar contacto', error);
        }
    };

    // Add member to clinic
    const handleAddMember = async (userId: string) => {
        try {
            await clinicsService.addTeamMember(userId, clinicId);
            setShowAddDropdown(false);
            await loadTeam();
        } catch (error) {
            console.error('Erro ao adicionar membro', error);
        }
    };

    // Remove member
    const confirmRemoveMember = async () => {
        if (!deleteTarget) return;
        try {
            await clinicsService.removeTeamMember(deleteTarget.userId, clinicId);
            setTeam(prev => prev.filter(m => m.user_id !== deleteTarget.userId));
            setDeleteTarget(null);
        } catch (error) {
            console.error('Erro ao remover membro', error);
        }
    };

    // Update role at clinic
    const handleUpdateRole = async (userId: string, role: string) => {
        try {
            await clinicsService.updateRoleAtClinic(userId, clinicId, role);
            setTeam(prev => prev.map(m =>
                m.user_id === userId ? { ...m, role_at_clinic: role } : m
            ));
        } catch (error) {
            console.error('Erro ao atualizar role', error);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium">Equipa da Clínica</h3>
                    <p className="text-sm text-gray-500">Utilizadores associados a esta clínica.</p>
                </div>
                <div className="relative">
                    <Button
                        onClick={() => {
                            setShowAddDropdown(!showAddDropdown);
                            if (!showAddDropdown) loadAvailableUsers();
                        }}
                        className="gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        Adicionar Membro
                    </Button>
                    {showAddDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                            {loadingUsers ? (
                                <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    A carregar...
                                </div>
                            ) : availableUsers.length === 0 ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                    Todos os utilizadores já estão na equipa
                                </div>
                            ) : (
                                availableUsers.map(u => (
                                    <button
                                        key={u.user_id}
                                        onClick={() => handleAddMember(u.user_id)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
                                    >
                                        <p className="text-sm font-medium text-gray-900">{u.full_name}</p>
                                        <p className="text-xs text-muted-foreground">{ROLE_LABELS[u.app_role] || u.app_role}{u.phone && ` • ${u.phone}`}</p>
                                    </button>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Info banner */}
            <div className="flex items-start gap-2 px-3 py-2 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Marque membros como <strong>&quot;Contacto da Clínica&quot;</strong> para que apareçam automaticamente nos locais de entrega e na lista de contactos da aba Dados.</span>
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin mr-2" /> A carregar equipa...
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2">
                    {team.length === 0 ? (
                        <div className="col-span-2 text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                            <User className="h-10 w-10 mx-auto text-card-foreground/80 mb-2" />
                            <h3 className="text-sm font-medium text-gray-900">Sem equipa registada</h3>
                            <p className="text-sm text-gray-500 mt-1">Adicione utilizadores para associar a esta clínica.</p>
                        </div>
                    ) : (
                        team.map((member) => (
                            <Card key={member.user_id} className="relative overflow-hidden group hover:border-primary/20 transition-all">
                                <CardContent className="p-5 space-y-3">
                                    {/* Remove button */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-red-50"
                                            onClick={() => setDeleteTarget({ userId: member.user_id, name: member.full_name })}
                                            title="Remover da equipa"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 mt-1">
                                            <User className="h-5 w-5" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{member.full_name}</p>
                                                <p className="text-xs text-muted-foreground">{ROLE_LABELS[member.app_role] || member.app_role}</p>
                                            </div>

                                            {member.phone && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                                                    <Phone className="h-3 w-3" />
                                                    {member.phone}
                                                </div>
                                            )}

                                            {/* Tags / Funções na Clínica */}
                                            <div className="space-y-1">
                                                <label className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Briefcase className="h-3 w-3" /> Funções na Clínica
                                                </label>
                                                {member.tags && member.tags.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {member.tags.map(tag => (
                                                            <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-medium">
                                                                {tag}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-xs text-muted-foreground italic">Sem funções atribuídas</p>
                                                )}
                                            </div>

                                            {/* Toggle Contacto da Clínica */}
                                            <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                                                <label className="flex items-center gap-2 text-xs text-gray-500 cursor-pointer select-none">
                                                    <Phone className="h-3 w-3" />
                                                    Contacto da Clínica
                                                </label>
                                                <button
                                                    type="button"
                                                    role="switch"
                                                    aria-checked={member.is_contact}
                                                    className={cn(
                                                        "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                                        member.is_contact ? 'bg-primary' : 'bg-gray-200'
                                                    )}
                                                    onClick={() => handleToggleContact(member.user_id, member.is_contact)}
                                                >
                                                    <span
                                                        className={cn(
                                                            "pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform",
                                                            member.is_contact ? 'translate-x-4' : 'translate-x-0'
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
            )}

            {/* Delete Confirmation Modal */}
            {deleteTarget && (
                <ConfirmModal
                    isOpen={!!deleteTarget}
                    onClose={() => setDeleteTarget(null)}
                    onConfirm={confirmRemoveMember}
                    title="Remover da Equipa"
                    description={`Tem a certeza que pretende remover ${deleteTarget.name} desta clínica? O utilizador não será eliminado, apenas desassociado.`}
                    confirmText="Remover"
                    cancelText="Cancelar"
                    variant="destructive"
                />
            )}
        </div>
    );
}
