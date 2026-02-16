
'use client';

import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { useEffect, useState, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { clinicsService, ClinicFullDetails } from '@/services/clinicsService';
import { useModulePermission } from '@/components/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Upload, X, Camera } from 'lucide-react';

import ClinicInfoTab from './tabs/ClinicInfoTab';
import ClinicDeliveryTab from './tabs/ClinicDeliveryTab';
import ClinicTeamTab from './tabs/ClinicTeamTab';
import ClinicDiscountsTab from './tabs/ClinicDiscountsTab';


interface ClinicFormProps {
    initialData: ClinicFullDetails;
}

// ============ HERO HEADER COM LOGO EDITÁVEL ============
function ClinicHeroHeader({ initialData, canEdit }: { initialData: ClinicFullDetails; canEdit: boolean }) {
    const { watch, setValue } = useFormContext<ClinicFullDetails>();
    const [logoPreview, setLogoPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const existingLogo = watch('logo_url');
    const commercialName = watch('commercial_name') || initialData.commercial_name;
    const legalName = watch('legal_name');

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
        e.stopPropagation();
        e.preventDefault();
        setLogoPreview(null);
        setValue('logo_url', "", { shouldDirty: true });
    };

    return (
        <div className="bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] px-8 pt-10 pb-20 relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(245,158,11,0.15) 0%, transparent 50%)'
            }} />

            <div className="relative z-10 flex items-center gap-6">
                {/* Logo editável */}
                <div
                    className={`relative group flex-shrink-0 ${canEdit ? 'cursor-pointer' : ''}`}
                    onClick={() => canEdit && fileInputRef.current?.click()}
                    onDrop={canEdit ? handleDrop : undefined}
                    onDragOver={canEdit ? handleDragOver : undefined}
                >
                    {logoPreview ? (
                        <>
                            <img
                                src={logoPreview}
                                alt={commercialName}
                                className="h-32 w-32 rounded-full object-cover ring-[3px] ring-primary/40 shadow-xl shadow-primary/10"
                            />
                            {canEdit && (
                                <>
                                    {/* Overlay de edição ao hover */}
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                    {/* Botão remover */}
                                    <button
                                        onClick={removeLogo}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 shadow-md"
                                        title="Remover Logo"
                                        type="button"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </>
                            )}
                        </>
                    ) : (
                        <div className="h-32 w-32 rounded-full bg-gradient-to-br from-primary/25 to-primary/10 ring-[3px] ring-primary/30 flex items-center justify-center shadow-xl shadow-primary/10 relative">
                            <span className="text-3xl font-bold text-primary">
                                {commercialName.substring(0, 2).toUpperCase()}
                            </span>
                            {canEdit && (
                                <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="h-5 w-5 text-white mb-0.5" />
                                    <span className="text-[10px] text-white/80">Upload</span>
                                </div>
                            )}
                        </div>
                    )}

                    {canEdit && (
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleLogoUpload}
                        />
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    {/* Nome da clínica + Badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            {commercialName}
                        </h1>
                        {initialData.is_active !== false && (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                Conta Ativa
                            </span>
                        )}
                    </div>

                    {/* Subtítulo: data + razão social */}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
                        <span>Cliente desde {new Date(initialData.created_at).getFullYear()}</span>
                        {legalName && legalName !== commercialName && (
                            <>
                                <span className="text-gray-600">·</span>
                                <span className="text-gray-500">{legalName}</span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function ClinicForm({ initialData }: ClinicFormProps) {
    const { canEdit } = useModulePermission('clinics');
    const { isAdmin } = useAuth();

    const methods = useForm<ClinicFullDetails>({
        defaultValues: initialData,
        mode: 'onChange'
    });

    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // Listener para updates externos (Contactos, Equipa, etc)
    useEffect(() => {
        const handleExternalUpdate = () => {
            setLastSaved(new Date());
            setSaving(false);
        };
        window.addEventListener('clinic-updated', handleExternalUpdate);
        return () => window.removeEventListener('clinic-updated', handleExternalUpdate);
    }, []);

    // Proteção contra saída acidental durante o save
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (saving || methods.formState.isDirty) {
                e.preventDefault();
                e.returnValue = 'Existem alterações a ser guardadas. Deseja sair?';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [saving]);

    // Auto-Save Logic (Debounced) — só activo se canEdit
    useEffect(() => {
        if (!canEdit) return;

        let timeoutId: NodeJS.Timeout;

        const subscription = methods.watch((value, { name, type }) => {
            // Só reagir a mudanças do utilizador, não a registos internos de useFieldArray
            if (name && type === 'change') {
                setSaving(true);
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    handleAutoSave(value);
                }, 1500); // 1.5s debounce para dar tempo de acabar de escrever
            }
        });
        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
        };
    }, [methods.watch]);

    const handleAutoSave = async (data: any) => {
        setSaving(true);
        try {
            const baseFields = {
                commercial_name: data.commercial_name,
                legal_name: data.legal_name,
                nif: data.nif,
                email: data.email,
                phone: data.phone,
                website: data.website,
                hq_address: data.hq_address,
                hq_zip_code: data.hq_zip_code,
                hq_city: data.hq_city,
                hq_country: data.hq_country,
                hq_maps_link: data.hq_maps_link,
                logo_url: data.logo_url,
            };

            await clinicsService.updateRecord('clinics', initialData.id, baseFields);

            // Reseta state dirty mas mantém valores
            methods.reset(data, { keepValues: true });

            setLastSaved(new Date());
        } catch (error) {
            console.error('Auto-save failed', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormProvider {...methods}>
            <div className="h-full flex flex-col">
                {/* ============ HERO HEADER ============ */}
                <ClinicHeroHeader initialData={initialData} canEdit={canEdit} />

                {/* ============ CONTENT CARD (sobrepõe o hero) ============ */}
                <div className="flex-1 -mt-8 px-6 pb-6 relative z-10">
                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-full">
                        <fieldset disabled={!canEdit} className="space-y-6">
                            {/* Status Bar */}
                            {canEdit && (
                                <div className="flex items-center justify-end text-sm text-gray-500 h-6">
                                    {saving ? (
                                        <span className="flex items-center gap-2 text-primary">
                                            <span className="animate-spin rounded-full h-3 w-3 border-b-2 border-primary"></span>
                                            A guardar...
                                        </span>
                                    ) : lastSaved ? (
                                        <span>Guardado às {lastSaved.toLocaleTimeString()}</span>
                                    ) : null}
                                </div>
                            )}

                            <Tabs defaultValue="info" className="w-full">
                                <TabsList className="flex w-full max-w-full overflow-x-auto">
                                    <TabsTrigger value="info" className="flex-shrink-0">Dados</TabsTrigger>
                                    <TabsTrigger value="delivery" className="flex-shrink-0">Entregas</TabsTrigger>
                                    <TabsTrigger value="team" className="flex-shrink-0">Equipa</TabsTrigger>
                                    {isAdmin && (
                                        <TabsTrigger value="discounts" className="flex-shrink-0">Descontos</TabsTrigger>
                                    )}
                                </TabsList>

                                <div className="mt-6">
                                    <TabsContent value="info">
                                        <ClinicInfoTab />
                                    </TabsContent>

                                    <TabsContent value="delivery">
                                        <ClinicDeliveryTab />
                                    </TabsContent>

                                    <TabsContent value="team">
                                        <ClinicTeamTab />
                                    </TabsContent>

                                    {isAdmin && (
                                        <TabsContent value="discounts">
                                            <ClinicDiscountsTab />
                                        </TabsContent>
                                    )}
                                </div>
                            </Tabs>
                        </fieldset>
                    </div>
                </div>
            </div>
        </FormProvider>
    );
}
