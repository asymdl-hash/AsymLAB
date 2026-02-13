
import { useFormContext } from 'react-hook-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState, useEffect } from 'react';

import { Upload, X, MapPin, Pencil, Check } from 'lucide-react'; // Placeholder para Upload de Logo
import { ClinicFullDetails } from '@/services/clinicsService';
import ClinicContactsList from './ClinicContactsList';

export default function ClinicInfoTab() {
    const { register, formState: { errors }, watch, setValue } = useFormContext<ClinicFullDetails>();

    // Estado local para upload (mock)
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const [isEditingMap, setIsEditingMap] = useState(false);

    const existingLogo = watch('logo_url');
    const hqMapsLink = watch('hq_maps_link');

    useEffect(() => {
        if (existingLogo) setLogoPreview(existingLogo);
    }, [existingLogo]);

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64 = reader.result as string;
            setLogoPreview(base64);
            setValue('logo_url', base64, { shouldDirty: true, shouldValidate: true });
        };
        reader.readAsDataURL(file);
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const removeLogo = (e: React.MouseEvent) => {
        e.stopPropagation(); // Impede abrir o file dialog
        setLogoPreview(null);
        setValue('logo_url', "", { shouldDirty: true });
    };

    return (
        <div className="grid gap-6">
            <Card>
                <CardHeader>
                    <CardTitle>Identificação Fiscal</CardTitle>
                    <CardDescription>Dados legais e comerciais da clínica.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex gap-6 items-start">
                        {/* Logo Upload */}

                        <div className="w-32 flex flex-col items-center gap-2">
                            <Label className="sr-only" htmlFor="logo-upload">Logo</Label>
                            <div
                                className="h-32 w-32 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-100 cursor-pointer overflow-hidden relative group transition-colors"
                                onClick={() => document.getElementById('logo-upload')?.click()}
                                onDrop={handleDrop}
                                onDragOver={handleDragOver}
                            >
                                {logoPreview ? (
                                    <>
                                        <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Upload className="h-6 w-6 text-white" />
                                        </div>
                                        <button
                                            onClick={removeLogo}
                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                                            title="Remover Logo"
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <Upload className="h-6 w-6 mb-1" />
                                        <span className="text-xs text-center px-2">Arraste ou clique</span>
                                    </div>
                                )}
                            </div>
                            <input
                                id="logo-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleLogoUpload}
                            />
                        </div>

                        {/* Campos Principais */}
                        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">

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
                                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                                            onClick={() => setIsEditingMap(true)}
                                            title="Editar Link"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        type="button"
                                        className="flex items-center gap-2 px-3 py-2 text-gray-400 border border-dashed border-gray-300 rounded-md hover:bg-gray-50 hover:text-gray-600 transition-all text-sm w-full"
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
