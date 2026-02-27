import { useState, useEffect, useCallback } from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2, MapPin, Navigation, Pencil, Check, Phone, User, Users, ChevronDown, X, UserPlus } from 'lucide-react';
import { ClinicFullDetails, ClinicTeamMember, clinicsService } from '@/services/clinicsService';
import { ConfirmModal } from '@/components/ui/confirm-modal';

interface AssignedContact {
    id: string;
    user_id: string | null;
    name: string;
    phone: string | null;
    role: string | null;
    is_external?: boolean;
}

export default function ClinicDeliveryTab() {
    const { control, register, getValues, watch, setValue } = useFormContext<ClinicFullDetails>();
    const [deleteTarget, setDeleteTarget] = useState<{ index: number, id: string } | null>(null);
    const [editingMapIndex, setEditingMapIndex] = useState<number | null>(null);
    const [teamContacts, setTeamContacts] = useState<ClinicTeamMember[]>([]);
    const [showContactDropdown, setShowContactDropdown] = useState<number | null>(null);
    const [showExternalForm, setShowExternalForm] = useState<number | null>(null);
    const [externalForm, setExternalForm] = useState({ name: '', phone: '', roleLabel: '' });
    const [assignedContacts, setAssignedContacts] = useState<Record<string, AssignedContact[]>>({});
    const deliveryPoints = watch('clinic_delivery_points');

    const { fields, append, remove } = useFieldArray({
        control,
        name: "clinic_delivery_points"
    });

    const clinicId = getValues().id;

    // Buscar contactos da equipa
    useEffect(() => {
        if (!clinicId) return;
        clinicsService.getClinicTeamContacts(clinicId).then(setTeamContacts).catch(console.error);
    }, [clinicId]);

    useEffect(() => {
        const handler = () => {
            if (!clinicId) return;
            clinicsService.getClinicTeamContacts(clinicId).then(setTeamContacts).catch(console.error);
        };
        window.addEventListener('clinic-updated', handler);
        return () => window.removeEventListener('clinic-updated', handler);
    }, [clinicId]);

    // Buscar contactos atribuídos a cada delivery point
    const loadAssignedContacts = useCallback(async (dpId: string) => {
        try {
            const contacts = await clinicsService.getDeliveryPointContacts(dpId);
            setAssignedContacts(prev => ({ ...prev, [dpId]: contacts }));
        } catch (error) {
            console.error('Erro ao carregar contactos do ponto', error);
        }
    }, []);

    useEffect(() => {
        if (!deliveryPoints) return;
        deliveryPoints.forEach((dp: any) => {
            if (dp.id) loadAssignedContacts(dp.id);
        });
    }, [deliveryPoints?.length, loadAssignedContacts]);

    const handleAddPoint = async () => {
        try {
            const newPoint = await clinicsService.createRelatedRecord('clinic_delivery_points', {
                clinic_id: clinicId,
                name: '',
                address: '',
                zip_code: '',
                city: '',
                distance_km: 0
            });
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

    const handleAddContact = async (dpId: string, userId: string) => {
        try {
            await clinicsService.addDeliveryPointContact(dpId, userId);
            await loadAssignedContacts(dpId);
            setShowContactDropdown(null);
        } catch (error) {
            console.error("Erro ao associar contacto", error);
        }
    };

    const handleRemoveContact = async (dpId: string, contactLinkId: string) => {
        try {
            await clinicsService.removeDeliveryPointContact(contactLinkId);
            setAssignedContacts(prev => ({
                ...prev,
                [dpId]: (prev[dpId] || []).filter(c => c.id !== contactLinkId)
            }));
        } catch (error) {
            console.error("Erro ao remover contacto", error);
        }
    };

    const handleAddExternalContact = async (dpId: string, dpIndex: number) => {
        if (!externalForm.name.trim()) return;
        try {
            await clinicsService.addExternalDeliveryPointContact(
                dpId,
                externalForm.name.trim(),
                externalForm.phone.trim(),
                externalForm.roleLabel.trim() || undefined
            );
            await loadAssignedContacts(dpId);
            setExternalForm({ name: '', phone: '', roleLabel: '' });
            setShowExternalForm(null);
            setShowContactDropdown(null);
        } catch (error) {
            console.error("Erro ao adicionar contacto externo", error);
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
                        <MapPin className="h-10 w-10 mx-auto text-card-foreground/80 mb-2" />
                        <h3 className="text-sm font-medium text-gray-900">Sem locais de entrega</h3>
                        <p className="text-sm text-gray-500 mt-1">Adicione pelo menos um local para calcular custos de estafeta.</p>
                    </div>
                ) : (
                    fields.map((field, index) => {
                        const dpId = deliveryPoints?.[index]?.id;
                        const dpContacts = dpId ? (assignedContacts[dpId] || []) : [];
                        const availableContacts = teamContacts.filter(
                            tc => !dpContacts.some(ac => ac.user_id === tc.user_id)
                        );

                        return (
                            <Card key={field.id} className="relative group transition-all hover:border-primary/20">
                                <CardContent className="p-6">
                                    <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-500 hover:bg-gray-100/50"
                                            onClick={() => {
                                                if (dpId) setDeleteTarget({ index, id: dpId });
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
                                                    <Navigation className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        type="number"
                                                        step="0.1"
                                                        {...register(`clinic_delivery_points.${index}.distance_km`, { valueAsNumber: true })}
                                                        className="pl-9"
                                                        onBlur={(e) => handleUpdatePoint(index, 'distance_km', parseFloat(e.target.value))}
                                                    />
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">Usado para cálculo automático de custos.</p>
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
                                                                <Button type="button" size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground" onClick={() => setEditingMapIndex(index)}>
                                                                    <Pencil className="h-4 w-4" />
                                                                </Button>
                                                            </>
                                                        ) : (
                                                            <Button type="button" variant="outline" className="text-muted-foreground gap-2 w-full border-dashed" onClick={() => setEditingMapIndex(index)}>
                                                                <MapPin className="h-4 w-4" />
                                                                <span className="text-xs">Adicionar Link</span>
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* ===== Contactos do Local de Entrega (Multi-selecção) ===== */}
                                    <div className="mt-6 pt-4 border-t border-gray-100">
                                        <div className="flex items-center justify-between mb-3">
                                            <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Phone className="h-3 w-3" /> Contactos para Entregas
                                            </Label>
                                            <div className="relative">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-1 text-xs h-7"
                                                    onClick={() => {
                                                        setShowContactDropdown(showContactDropdown === index ? null : index);
                                                        setShowExternalForm(null);
                                                    }}
                                                >
                                                    <Users className="h-3 w-3" />
                                                    Adicionar contacto
                                                    <ChevronDown className="h-3 w-3" />
                                                </Button>
                                                {showContactDropdown === index && (
                                                    <div className="absolute right-0 top-8 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[240px]">
                                                        {/* Membros da equipa */}
                                                        {availableContacts.length > 0 && (
                                                            <>
                                                                <p className="px-3 pt-2 pb-1 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Equipa</p>
                                                                {availableContacts.map((tc) => (
                                                                    <button
                                                                        key={tc.user_id}
                                                                        type="button"
                                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 flex items-center gap-2"
                                                                        onClick={() => dpId && handleAddContact(dpId, tc.user_id)}
                                                                    >
                                                                        <User className="h-3 w-3 text-muted-foreground" />
                                                                        <span className="flex-1 truncate">{tc.full_name}</span>
                                                                        {tc.phone && (
                                                                            <span className="text-xs text-muted-foreground">{tc.phone}</span>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                                <hr className="my-1 border-gray-100" />
                                                            </>
                                                        )}
                                                        {/* Botão para adicionar externo */}
                                                        {showExternalForm !== index ? (
                                                            <button
                                                                type="button"
                                                                className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center gap-2 text-blue-600"
                                                                onClick={() => {
                                                                    setShowExternalForm(index);
                                                                    setExternalForm({ name: '', phone: '', roleLabel: '' });
                                                                }}
                                                            >
                                                                <UserPlus className="h-3 w-3" />
                                                                <span>Contacto externo...</span>
                                                            </button>
                                                        ) : (
                                                            <div className="px-3 py-2 space-y-2">
                                                                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
                                                                    <UserPlus className="h-3 w-3" /> Novo Externo
                                                                </p>
                                                                <input
                                                                    type="text"
                                                                    placeholder="Nome *"
                                                                    value={externalForm.name}
                                                                    onChange={e => setExternalForm(f => ({ ...f, name: e.target.value }))}
                                                                    className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Telefone"
                                                                    value={externalForm.phone}
                                                                    onChange={e => setExternalForm(f => ({ ...f, phone: e.target.value }))}
                                                                    className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Cargo (opcional)"
                                                                    value={externalForm.roleLabel}
                                                                    onChange={e => setExternalForm(f => ({ ...f, roleLabel: e.target.value }))}
                                                                    className="w-full text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
                                                                />
                                                                <div className="flex gap-1">
                                                                    <button
                                                                        type="button"
                                                                        disabled={!externalForm.name.trim()}
                                                                        onClick={() => dpId && handleAddExternalContact(dpId, index)}
                                                                        className="flex-1 text-xs py-1 bg-blue-600 text-card-foreground rounded hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
                                                                    >
                                                                        Adicionar
                                                                    </button>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => setShowExternalForm(null)}
                                                                        className="px-2 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                                                                    >
                                                                        Cancelar
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Chips de contactos associados */}
                                        {dpContacts.length > 0 ? (
                                            <div className="flex flex-wrap gap-2">
                                                {dpContacts.map((ac) => (
                                                    <div
                                                        key={ac.id}
                                                        className={`flex items-center gap-2 px-3 py-1.5 border rounded-full text-sm ${ac.is_external
                                                            ? 'bg-blue-50 border-blue-200'
                                                            : 'bg-primary/5 border-primary/15'
                                                            }`}
                                                    >
                                                        {ac.is_external
                                                            ? <UserPlus className="h-3 w-3 text-blue-500" />
                                                            : <User className="h-3 w-3 text-primary/60" />
                                                        }
                                                        <span className="font-medium text-gray-700">{ac.name}</span>
                                                        {ac.role && (
                                                            <span className="text-[10px] text-muted-foreground italic">{ac.role}</span>
                                                        )}
                                                        {ac.phone && (
                                                            <span className="text-xs text-muted-foreground">{ac.phone}</span>
                                                        )}
                                                        <button
                                                            type="button"
                                                            className="ml-0.5 p-0.5 rounded-full text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors"
                                                            onClick={() => dpId && handleRemoveContact(dpId, ac.id)}
                                                            title="Remover contacto"
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">
                                                {teamContacts.length > 0
                                                    ? 'Nenhum contacto associado. Use o botão acima para adicionar.'
                                                    : 'Marque membros como "Contacto da Clínica" na aba Equipa primeiro.'
                                                }
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}
