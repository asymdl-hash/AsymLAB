
import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, User, Phone, Mail, Briefcase } from 'lucide-react';
import { ClinicFullDetails, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function ClinicTeamTab() {
    const { control, register } = useFormContext<ClinicFullDetails>();

    // Estado para o Modal de Confirmação
    const [deleteTarget, setDeleteTarget] = useState<{ index: number, id: string } | null>(null);

    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_staff"
    });

    const handleAddMember = async () => {
        const clinicId = control._formValues.id;
        try {
            const newMember = await clinicsService.createRelatedRecord('clinic_staff', {
                clinic_id: clinicId,
                name: '',
                role: 'doctor',
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

    // The original handleRemoveMember is now replaced by setting deleteTarget and confirmDeleteMember
    // const handleRemoveMember = async (index: number, id: string) => {
    //     try {
    //         await clinicsService.deleteRecord('clinic_staff', id);
    //         remove(index);
    //         setDeleteTarget(null);
    //     } catch (error) {
    //         console.error("Erro ao remover membro", error);
    //         alert("Erro ao remover. Tente novamente.");
    //     }
    // };


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
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                                    >    <Trash2 className="h-4 w-4" />
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
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
