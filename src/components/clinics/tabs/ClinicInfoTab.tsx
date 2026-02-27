
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

import { MapPin, Pencil, Check } from 'lucide-react';
import { ClinicFullDetails } from '@/services/clinicsService';
import ClinicContactsList from './ClinicContactsList';

export default function ClinicInfoTab() {
    const { register, formState: { errors }, watch, setValue } = useFormContext<ClinicFullDetails>();

    const [isEditingMap, setIsEditingMap] = useState(false);

    const hqMapsLink = watch('hq_maps_link');

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Identificação Fiscal</CardTitle>
                    <CardDescription>Dados legais e comerciais da clínica.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Campos Principais */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        <div className="space-y-2">
                            <Label htmlFor="commercial_name">Nome Comercial *</Label>
                            <Input
                                id="commercial_name"
                                {...(() => {
                                    const { onBlur, ...rest } = register("commercial_name", { required: true });
                                    return {
                                        ...rest,
                                        onBlur: (e: React.FocusEvent<HTMLInputElement>) => {
                                            onBlur(e);
                                            window.dispatchEvent(new CustomEvent('clinic-updated'));
                                        }
                                    };
                                })()}
                            />
                            {errors.commercial_name && <span className="text-xs text-red-500">Obrigatório</span>}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="legal_name">Razão Social</Label>
                            <Input id="legal_name" {...register("legal_name")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="nif">NIF</Label>
                            <Input id="nif" {...register("nif")} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Geral</Label>
                            <Input id="email" type="email" {...register("email")} />
                        </div>
                        <div className="space-y-2 relative">
                            <Label htmlFor="website">Website</Label>
                            <Input id="website" {...register("website")} placeholder="https://..." />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sede</CardTitle>
                    <CardDescription>Localização principal para efeitos fiscais e de entrega.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2 space-y-2">
                        <Label htmlFor="hq_address">Morada Completa</Label>
                        <Input id="hq_address" {...register("hq_address")} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hq_zip_code">Código Postal</Label>
                        <Input id="hq_zip_code" {...register("hq_zip_code")} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hq_city">Localidade</Label>
                        <Input id="hq_city" {...register("hq_city")} />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hq_country">País / Região</Label>
                        <Input id="hq_country" {...register("hq_country")} defaultValue="Portugal" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="hq_maps_link">Google Maps (URL)</Label>
                        {isEditingMap ? (
                            <div className="flex gap-2">
                                <Input
                                    id="hq_maps_link"
                                    {...register("hq_maps_link")}
                                    placeholder="https://maps.google.com/..."
                                    autoFocus
                                    onBlur={() => {
                                        setIsEditingMap(false);
                                        window.dispatchEvent(new CustomEvent('clinic-updated'));
                                    }}
                                />
                                <button type="button" className="p-2 text-green-600 hover:bg-green-50 rounded-md" onMouseDown={(e) => e.preventDefault()} onClick={() => setIsEditingMap(false)}>
                                    <Check className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 h-10">
                                {hqMapsLink ? (
                                    <>
                                        <a
                                            href={hqMapsLink}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors border border-blue-200 text-sm font-medium"
                                            title="Abrir no Google Maps"
                                        >
                                            <MapPin className="h-4 w-4" />
                                            Abrir Mapa
                                        </a>
                                        <button
                                            type="button"
                                            className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-gray-100 rounded-md transition-colors"
                                            onClick={() => setIsEditingMap(true)}
                                            title="Editar Link"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-3 py-2 text-muted-foreground border border-dashed border-gray-300 rounded-md hover:bg-gray-50 hover:text-muted-foreground transition-all text-sm w-full"
                                        onClick={() => setIsEditingMap(true)}
                                    >
                                        <MapPin className="h-4 w-4 opacity-50" />
                                        Adicionar localização
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Contactos</CardTitle>
                    <CardDescription>Adicione múltiplos contactos (Geral, Urgência, etc).</CardDescription>
                </CardHeader>
                <CardContent>
                    <ClinicContactsList />
                </CardContent>
            </Card>
        </div>
    );
}
