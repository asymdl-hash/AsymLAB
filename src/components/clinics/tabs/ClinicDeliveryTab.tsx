import { useState } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Plus, Trash2, MapPin, Navigation, Pencil, Check } from 'lucide-react';
import { ClinicFullDetails, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';


export default function ClinicDeliveryTab() {
    const { control, register, getValues, watch } = useFormContext<ClinicFullDetails>();
    const [deleteTarget, setDeleteTarget] = useState<{ index: number, id: string } | null>(null);
    const [editingMapIndex, setEditingMapIndex] = useState<number | null>(null);
    const deliveryPoints = watch('clinic_delivery_points');

    // Gestão da lista de pontos de entrega
    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_delivery_points"
    });

    const handleAddPoint = async () => {
        const clinicId = control._formValues.id;
        try {
            // Cria registo vazio na BD
            const newPoint = await clinicsService.createRelatedRecord('clinic_delivery_points', {
                clinic_id: clinicId,
                name: '',
                address: '',
                zip_code: '',
                city: '',
                country: 'Portugal',
                distance_km: 0
            });
            // Adiciona à UI
            append(newPoint);
        } catch (error) {
            console.error("Erro ao criar ponto de entrega", error);
        }
    };

    const confirmDeletePoint = async () => {
        if (!deleteTarget) return;

        try {
            await clinicsService.deleteRecord('clinic_delivery_points', deleteTarget.id);
            remove(deleteTarget.index);
            setDeleteTarget(null);
        } catch (error) {
            console.error("Erro ao remover entrega", error);
        }
    };


    const handleUpdatePoint = async (index: number, field: string, value: string | number) => {
        const currentData = control._formValues.clinic_delivery_points;
        const pointId = currentData[index]?.id;

        if (!pointId) return;

        try {
            await clinicsService.updateRecord('clinic_delivery_points', pointId, { [field]: value });
        } catch (error) {
            console.error("Erro ao salvar entrega", error);
        }
    };


    return (
        <div className="space-y-6">
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDeletePoint}
                title="Remover Ponto de Entrega"
                description="Tem a certeza que deseja remover este local de entrega? Esta ação não pode ser revertida."
                variant="destructive"
            />

            <div className="flex justify-between items-center">
                <div className="space-y-1">
                    <h3 className="text-lg font-medium">Locais de Entrega</h3>
                    <p className="text-sm text-gray-500">Defina os pontos de recolha/entrega e a distância para cálculo de deslocações.</p>
                </div>
                <Button onClick={handleAddPoint} className="gap-2">
                    <Plus className="h-4 w-4" />
                    Adicionar Local
                </Button>
            </div>

            <div className="grid gap-4">
                {fields.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                        <MapPin className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                        <h3 className="text-sm font-medium text-gray-900">Sem locais de entrega</h3>
                        <p className="text-sm text-gray-500 mt-1">Adicione pelo menos um local para calcular custos de estafeta.</p>
                    </div>
                ) : (
                    fields.map((field, index) => (
                        <Card key={field.id} className="relative overflow-hidden group transition-all hover:border-primary/20">
                            <CardContent className="p-6">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-gray-100/50"
                                        onClick={() => {
                                            const realId = deliveryPoints?.[index]?.id;
                                            if (realId) setDeleteTarget({ index, id: realId });
                                        }}
                                        title="Remover este local"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>

                                <div className="grid gap-6 md:grid-cols-12">
                                    {/* Identificação Local */}
                                    <div className="md:col-span-4 space-y-4">
                                        <div className="space-y-2">
                                            <Label>Nome do Local</Label>
                                            <Input
                                                {...register(`clinic_delivery_points.${index}.name`)}
                                                placeholder="Ex: Laboratório Central"
                                                className="font-medium"
                                                onBlur={(e) => handleUpdatePoint(index, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Distância (Km)</Label>
                                            <div className="relative">
                                                <Navigation className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                                <Input
                                                    type="number"
                                                    step="0.1"
                                                    {...register(`clinic_delivery_points.${index}.distance_km`, { valueAsNumber: true })}
                                                    className="pl-9"
                                                    onBlur={(e) => handleUpdatePoint(index, 'distance_km', parseFloat(e.target.value))}
                                                />
                                            </div>
                                            <p className="text-[10px] text-gray-400">Usado para cálculo automático de custos.</p>
                                        </div>
                                    </div>

                                    {/* Morada Detalhada */}
                                    <div className="md:col-span-8 grid gap-4 md:grid-cols-2">
                                        <div className="md:col-span-2 space-y-2">
                                            <Label>Morada</Label>
                                            <Input {...register(`clinic_delivery_points.${index}.address`)} placeholder="Rua..." onBlur={(e) => handleUpdatePoint(index, 'address', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Código Postal</Label>
                                            <Input {...register(`clinic_delivery_points.${index}.zip_code`)} onBlur={(e) => handleUpdatePoint(index, 'zip_code', e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Localidade</Label>
                                            <Input {...register(`clinic_delivery_points.${index}.city`)} onBlur={(e) => handleUpdatePoint(index, 'city', e.target.value)} />
                                        </div>
                                        <div className="md:col-span-2 space-y-2">
                                            <Label>Link Google Maps</Label>
                                            {editingMapIndex === index ? (
                                                <div className="flex gap-2">
                                                    <Input
                                                        {...register(`clinic_delivery_points.${index}.maps_link`)}
                                                        placeholder="https://maps.google.com/..."
                                                        className="text-blue-600 underline-offset-4 flex-1"
                                                        onBlur={(e) => {
                                                            handleUpdatePoint(index, 'maps_link', e.target.value);
                                                            setEditingMapIndex(null);
                                                        }}
                                                        autoFocus
                                                    />
                                                    <Button type="button" size="icon" variant="ghost" className="h-10 w-10 text-green-600" onMouseDown={(e) => e.preventDefault()} onClick={() => setEditingMapIndex(null)}>
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-2 h-10">
                                                    {deliveryPoints?.[index]?.maps_link ? (
                                                        <>
                                                            <a
                                                                href={deliveryPoints[index].maps_link}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 flex items-center gap-2 text-xs font-medium"
                                                                title="Abrir no Google Maps"
                                                            >
                                                                <MapPin className="h-4 w-4" />
                                                                Abrir Mapa
                                                            </a>
                                                            <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-gray-400" onClick={() => setEditingMapIndex(index)}>
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                        </>
                                                    ) : (
                                                        <Button type="button" variant="outline" className="text-gray-400 gap-2 w-full border-dashed" onClick={() => setEditingMapIndex(index)}>
                                                            <MapPin className="h-4 w-4" />
                                                            <span className="text-xs">Adicionar Link</span>
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
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
