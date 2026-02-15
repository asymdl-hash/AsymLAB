import { useState, useEffect } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Phone, User, Users, ChevronDown, X } from 'lucide-react';
import { ClinicFullDetails, ClinicTeamMember, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';

const ROLE_LABELS: Record<string, string> = {
    admin: 'Administrador',
    staff_lab: 'Staff Lab',
    staff_clinic: 'Staff Clínica',
    clinic_user: 'Utilizador Clínica',
    doctor: 'Médico',
    assistant: 'Assistente',
    receptionist: 'Rececionista',
    accounting: 'Contabilidade',
    manager: 'Gestor',
    other: 'Outro',
};

export default function ClinicContactsList() {
    const { control, register, getValues } = useFormContext<ClinicFullDetails>();
    const [deleteTarget, setDeleteTarget] = useState<{ index: number, id: string } | null>(null);

    // Equipa completa (todos os membros) e contactos marcados
    const [allTeam, setAllTeam] = useState<ClinicTeamMember[]>([]);
    const [teamContacts, setTeamContacts] = useState<ClinicTeamMember[]>([]);
    const [showTeamDropdown, setShowTeamDropdown] = useState(false);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_contacts"
    });

    const clinicId = getValues().id;

    // Buscar equipa completa e contactos marcados
    const loadTeamData = async () => {
        if (!clinicId) return;
        try {
            const [team, contacts] = await Promise.all([
                clinicsService.getClinicTeam(clinicId),
                clinicsService.getClinicTeamContacts(clinicId),
            ]);
            setAllTeam(team);
            setTeamContacts(contacts);
        } catch (err) {
            console.error(err);
        }
    };

    useEffect(() => { loadTeamData(); }, [clinicId]);

    useEffect(() => {
        const handler = () => loadTeamData();
        window.addEventListener('clinic-updated', handler);
        return () => window.removeEventListener('clinic-updated', handler);
    }, [clinicId]);

    // Membros disponíveis para adicionar (não marcados como contacto)
    const availableMembers = allTeam.filter(
        m => !teamContacts.some(tc => tc.user_id === m.user_id)
    );

    // Adicionar membro como contacto (toggle is_contact = true)
    const handleAddTeamContact = async (userId: string) => {
        try {
            await clinicsService.toggleTeamContact(userId, clinicId, true);
            await loadTeamData();
            setShowTeamDropdown(false);
            window.dispatchEvent(new CustomEvent('clinic-updated'));
        } catch (error) {
            console.error("Erro ao adicionar contacto da equipa", error);
        }
    };

    // Remover membro como contacto (toggle is_contact = false)
    const handleRemoveTeamContact = async (userId: string) => {
        try {
            await clinicsService.toggleTeamContact(userId, clinicId, false);
            await loadTeamData();
            window.dispatchEvent(new CustomEvent('clinic-updated'));
        } catch (error) {
            console.error("Erro ao remover contacto da equipa", error);
        }
    };

    // Contactos manuais
    const handleAddContact = async () => {
        try {
            const newContact = await clinicsService.createRelatedRecord('clinic_contacts', {
                clinic_id: clinicId,
                name: '',
                phone: '',
                type: 'general'
            });
            if (!newContact?.id) { console.error('❌ Erro: Contacto criado sem ID!'); return; }
            append(newContact);
            window.dispatchEvent(new CustomEvent('clinic-updated'));
        } catch (error) {
            console.error("Erro ao criar contacto", error);
        }
    };

    const confirmDeleteContact = async () => {
        if (!deleteTarget) return;
        try {
            await clinicsService.deleteRecord('clinic_contacts', deleteTarget.id);
            remove(deleteTarget.index);
            setDeleteTarget(null);
        } catch (error) {
            console.error("Erro ao remover contacto", error);
        }
    };

    const handleUpdateContact = async (index: number, field: string, value: string) => {
        const contacts = getValues().clinic_contacts;
        const contactId = contacts?.[index]?.id;
        if (!contactId) return;
        try {
            await clinicsService.updateRecord('clinic_contacts', contactId, { [field]: value });
            window.dispatchEvent(new CustomEvent('clinic-updated'));
        } catch (error) {
            console.error("Erro ao salvar contacto", error);
        }
    };

    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteContact}
                title="Remover Contacto"
                description="Tem a certeza que deseja remover este contacto?"
                variant="destructive"
            />

            {/* ===== Contactos da Equipa (selecionáveis via dropdown) ===== */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        <h3 className="text-sm font-medium text-gray-700">Contactos da Equipa</h3>
                    </div>

                    {/* Dropdown para adicionar */}
                    {availableMembers.length > 0 && (
                        <div className="relative">
                            <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs"
                                onClick={() => setShowTeamDropdown(!showTeamDropdown)}
                            >
                                <Plus className="h-3.5 w-3.5" />
                                Adicionar da Equipa
                                <ChevronDown className={`h-3 w-3 transition-transform ${showTeamDropdown ? 'rotate-180' : ''}`} />
                            </Button>
                            {showTeamDropdown && (
                                <div className="absolute right-0 top-9 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[220px]">
                                    {availableMembers.map((m) => (
                                        <button
                                            key={m.user_id}
                                            type="button"
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                            onClick={() => handleAddTeamContact(m.user_id)}
                                        >
                                            <User className="h-3 w-3 text-gray-400" />
                                            <span className="flex-1 truncate">{m.full_name}</span>
                                            {m.phone && (
                                                <span className="text-xs text-gray-400">{m.phone}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Lista de contactos da equipa selecionados */}
                {teamContacts.length > 0 ? (
                    <div className="grid gap-2">
                        {teamContacts.map((tc) => (
                            <div key={tc.user_id} className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/10 rounded-lg group">
                                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <User className="h-4 w-4" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">{tc.full_name}</p>
                                    <p className="text-xs text-gray-500">
                                        {ROLE_LABELS[tc.role_at_clinic || ''] || ROLE_LABELS[tc.app_role] || tc.app_role || 'Staff'}
                                    </p>
                                </div>
                                {tc.phone && (
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                        <Phone className="h-3 w-3" />
                                        <span>{tc.phone}</span>
                                    </div>
                                )}
                                <button
                                    type="button"
                                    onClick={() => handleRemoveTeamContact(tc.user_id)}
                                    className="p-1 rounded-md text-gray-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                                    title="Remover dos contactos"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-4 border border-dashed border-gray-200 rounded-lg text-gray-400 text-xs">
                        {allTeam.length > 0
                            ? 'Nenhum membro da equipa selecionado como contacto. Use o botão acima para adicionar.'
                            : 'Nenhum membro na equipa desta clínica. Adicione membros na aba Equipa primeiro.'
                        }
                    </div>
                )}
                <p className="text-[10px] text-gray-400 italic">
                    Selecione membros da equipa como contactos desta clínica. Gerir membros na aba Equipa.
                </p>
            </div>

            {/* ===== Contactos Manuais ===== */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <h3 className="text-sm font-medium text-gray-500">Contactos Manuais</h3>
                    <Button onClick={handleAddContact} size="sm" variant="outline" className="gap-2">
                        <Plus className="h-4 w-4" />
                        Adicionar
                    </Button>
                </div>

                <div className="grid gap-3">
                    {fields.length === 0 ? (
                        <div className="text-center py-4 border border-dashed border-gray-100 rounded-lg text-gray-400 text-xs">
                            Sem contactos manuais. Use o botão acima para adicionar contactos avulsos (ex: receção, fax).
                        </div>
                    ) : (
                        fields.map((field, index) => (
                            <Card key={field.id} className="group relative hover:border-primary/20 transition-all">
                                <CardContent className="p-4 grid gap-4 md:grid-cols-12 items-start">
                                    {/* Delete Button */}
                                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-gray-400 hover:text-red-500 hover:bg-red-50"
                                            onClick={() => {
                                                const currentValues = getValues().clinic_contacts || [];
                                                const realId = currentValues[index]?.id;
                                                if (realId) setDeleteTarget({ index, id: realId });
                                            }}
                                            title="Remover contacto"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="md:col-span-6 space-y-1">
                                        <Label className="text-[10px] uppercase text-gray-400 font-semibold flex items-center gap-1">
                                            <User className="h-3 w-3" /> Nome / Cargo
                                        </Label>
                                        <Input
                                            {...register(`clinic_contacts.${index}.name`)}
                                            placeholder="Ex: Receção Geral"
                                            className="h-8 text-sm font-medium"
                                            onBlur={(e) => handleUpdateContact(index, 'name', e.target.value)}
                                        />
                                    </div>

                                    <div className="md:col-span-6 space-y-1">
                                        <Label className="text-[10px] uppercase text-gray-400 font-semibold flex items-center gap-1">
                                            <Phone className="h-3 w-3" /> Telefone
                                        </Label>
                                        <Input
                                            {...register(`clinic_contacts.${index}.phone`)}
                                            placeholder="+351..."
                                            className="h-8 text-sm"
                                            onBlur={(e) => handleUpdateContact(index, 'phone', e.target.value)}
                                        />
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
