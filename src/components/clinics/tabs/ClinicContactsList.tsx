import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, Phone, Mail, User } from 'lucide-react';
import { ClinicFullDetails, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function ClinicContactsList() {
    const { control, register, getValues } = useFormContext<ClinicFullDetails>();
    const [deleteTarget, setDeleteTarget] = useState<{ index: number, id: string } | null>(null);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_contacts"
    });

    const handleAddContact = async () => {
        const clinicId = getValues().id;
        try {
            const newContact = await clinicsService.createRelatedRecord('clinic_contacts', {
                clinic_id: clinicId,
                name: '',
                phone: '',
                type: 'general'
            });

            // Debug: Verificar se o ID foi retornado
            console.log('📝 Novo contacto criado:', newContact);

            if (!newContact?.id) {
                console.error('❌ Erro: Contacto criado sem ID!');
                return;
            }

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
            // Feedback visual simples: Disparar evento global de save success
            window.dispatchEvent(new CustomEvent('clinic-updated'));
        } catch (error) {
            console.error("Erro ao salvar contacto", error);
        }
    };

    return (
        <div className="space-y-4">
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteContact}
                title="Remover Contacto"
                description="Tem a certeza que deseja remover este contacto?"
                variant="destructive"
            />

            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-gray-500">Lista de Contactos</h3>
                <Button onClick={handleAddContact} size="sm" variant="outline" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar
                </Button>
            </div>

            <div className="grid gap-3">
                {fields.length === 0 ? (
                    <div className="text-center py-6 border-2 border-dashed border-gray-100 rounded-lg text-gray-400 text-sm">
                        Nenhum contacto registado.
                    </div>
                ) : (
                    fields.map((field, index) => (
                        <Card key={field.id} className="group relative hover:border-primary/20 transition-all">
                            <CardContent className="p-4 grid gap-4 md:grid-cols-12 items-start">
                                {/* Delete Button Absolute */}
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

                                {/* Campos: Apenas Nome e Telefone (Email removido) */}
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
    );
}
