'use client';

import { useForm, FormProvider, useFormContext } from 'react-hook-form';
import { useEffect, useState, useRef } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { doctorsService, DoctorProfile } from '@/services/doctorsService';
import { useModulePermission } from '@/components/PermissionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Upload, X, Camera, Loader2 } from 'lucide-react';

import DoctorDataTab from './tabs/DoctorDataTab';
import DoctorAnalyticsTab from './tabs/DoctorAnalyticsTab';
import DoctorPermissionsTab from './tabs/DoctorPermissionsTab';

interface DoctorFormProps {
    initialData: DoctorProfile;
}

// ============ HERO HEADER COM AVATAR EDITÁVEL ============
function DoctorHeroHeader({ initialData, canEdit }: { initialData: DoctorProfile; canEdit: boolean }) {
    const { watch, setValue } = useFormContext<DoctorProfile>();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const existingAvatar = watch('avatar_url');
    const fullName = watch('full_name') || initialData.full_name;

    useEffect(() => {
        if (existingAvatar) setAvatarPreview(existingAvatar);
    }, [existingAvatar]);

    const processFile = async (file: File) => {
        // Validar tipo
        if (!file.type.startsWith('image/')) {
            setUploadError('Por favor seleciona uma imagem (JPG, PNG, etc.)');
            return;
        }
        // Validar tamanho (2MB)
        if (file.size > 2 * 1024 * 1024) {
            setUploadError('A imagem deve ter no máximo 2MB');
            return;
        }

        setUploading(true);
        setUploadError(null);

        // Preview local imediato
        const localUrl = URL.createObjectURL(file);
        setAvatarPreview(localUrl);

        try {
            const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
            const filePath = `avatars/${initialData.user_id}.${ext}`;

            // Upload para Supabase Storage
            const { error: uploadErr } = await supabase.storage
                .from('user-avatars')
                .upload(filePath, file, { upsert: true, contentType: file.type });

            if (uploadErr) throw uploadErr;

            // Obter URL pública com cache-buster
            const { data: urlData } = supabase.storage
                .from('user-avatars')
                .getPublicUrl(filePath);

            const avatarUrl = `${urlData.publicUrl}?t=${Date.now()}`;
            setAvatarPreview(avatarUrl);
            setValue('avatar_url', avatarUrl, { shouldDirty: true, shouldValidate: true });
            window.dispatchEvent(new CustomEvent('doctor-avatar-changed'));
        } catch (err: any) {
            console.error('Avatar upload failed:', err);
            setUploadError(err.message || 'Erro ao fazer upload do avatar');
            setAvatarPreview(existingAvatar || null);
        } finally {
            setUploading(false);
            URL.revokeObjectURL(localUrl);
        }
    };

    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processFile(file);
        if (e.target) e.target.value = '';
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) processFile(file);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const removeAvatar = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        setUploading(true);

        try {
            // Tentar apagar do Storage (ignorar erro se não existir)
            const extensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
            for (const ext of extensions) {
                await supabase.storage.from('user-avatars').remove([`avatars/${initialData.user_id}.${ext}`]);
            }
        } catch (err) {
            console.error('Avatar delete warning:', err);
        }

        setAvatarPreview(null);
        setValue('avatar_url', '', { shouldDirty: true });
        window.dispatchEvent(new CustomEvent('doctor-avatar-changed'));
        setUploading(false);
    };

    const getInitials = (name: string) => {
        if (!name) return '?';
        const words = name.trim().split(/\s+/);
        if (words.length === 1) return words[0].charAt(0).toUpperCase();
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    return (
        <div className="bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] px-8 pt-10 pb-20 relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-5" style={{
                backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(245,158,11,0.15) 0%, transparent 50%)'
            }} />

            <div className="relative z-10 flex items-center gap-6">
                {/* Avatar editável */}
                <div
                    className={`relative group flex-shrink-0 ${canEdit && !uploading ? 'cursor-pointer' : ''}`}
                    onClick={() => canEdit && !uploading && fileInputRef.current?.click()}
                    onDrop={canEdit && !uploading ? handleDrop : undefined}
                    onDragOver={canEdit && !uploading ? handleDragOver : undefined}
                >
                    {avatarPreview ? (
                        <>
                            <img
                                src={avatarPreview}
                                alt={fullName}
                                className="h-32 w-32 rounded-full object-cover ring-[3px] ring-primary/40 shadow-xl shadow-primary/10"
                            />
                            {uploading && (
                                <div className="absolute inset-0 rounded-full bg-black/60 flex items-center justify-center z-20">
                                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                                </div>
                            )}
                            {canEdit && !uploading && (
                                <>
                                    <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Camera className="h-6 w-6 text-white" />
                                    </div>
                                    <button
                                        onClick={removeAvatar}
                                        className="absolute -top-1.5 -right-1.5 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10 shadow-md"
                                        title="Remover Avatar"
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
                                {getInitials(fullName)}
                            </span>
                            {canEdit && (
                                <div className="absolute inset-0 rounded-full bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Upload className="h-5 w-5 text-white mb-0.5" />
                                    <span className="text-[10px] text-white/80">Upload</span>
                                </div>
                            )}
                        </div>
                    )}

                    {canEdit && !uploading && (
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/gif,image/webp"
                            className="hidden"
                            onChange={handleAvatarUpload}
                        />
                    )}
                    {/* Mensagem de erro de upload */}
                    {uploadError && (
                        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-red-500/90 text-white text-xs px-3 py-1 rounded-full shadow-lg">
                            {uploadError}
                        </div>
                    )}
                </div>

                <div className="flex flex-col gap-1.5">
                    {/* Nome + Badge */}
                    <div className="flex items-center gap-3 flex-wrap">
                        <h1 className="text-4xl font-bold text-white tracking-tight">
                            {fullName}
                        </h1>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-500/15 text-blue-400 border border-blue-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
                            Médico
                        </span>
                    </div>

                    {/* Subtítulo */}
                    <div className="flex items-center gap-2 text-sm text-gray-400 mt-0.5">
                        <span>Desde {new Date(initialData.created_at).toLocaleDateString('pt-PT')}</span>
                    </div>
                </div>
            </div>
        </div>
    );
}


export default function DoctorForm({ initialData }: DoctorFormProps) {
    const { canEdit } = useModulePermission('doctors');
    const { isAdmin } = useAuth();

    const methods = useForm<DoctorProfile>({
        defaultValues: initialData,
        mode: 'onChange'
    });

    const [saving, setSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);

    // -------- Auto-save handler --------
    const handleAutoSave = async (formData: any) => {
        try {
            const { avatar_url } = formData;

            // Atualizar avatar no user_profiles se mudou
            if (avatar_url !== undefined) {
                const { supabase } = await import('@/lib/supabase');
                await supabase
                    .from('user_profiles')
                    .update({ avatar_url })
                    .eq('user_id', initialData.user_id);
            }

            setLastSaved(new Date());
            window.dispatchEvent(new CustomEvent('doctor-updated'));
        } catch (err) {
            console.error('Auto-save error:', err);
        } finally {
            setSaving(false);
        }
    };

    // Auto-Save Logic (Debounced)
    useEffect(() => {
        if (!canEdit) return;

        let timeoutId: NodeJS.Timeout;

        const subscription = methods.watch((value, { name, type }) => {
            if (name && type === 'change') {
                setSaving(true);
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    handleAutoSave(value);
                }, 1500);
            }
        });

        // Listener para mudanças de avatar (setValue programático)
        const handleAvatarChanged = () => {
            setSaving(true);
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                handleAutoSave(methods.getValues());
            }, 500);
        };
        window.addEventListener('doctor-avatar-changed', handleAvatarChanged);

        return () => {
            subscription.unsubscribe();
            clearTimeout(timeoutId);
            window.removeEventListener('doctor-avatar-changed', handleAvatarChanged);
        };
    }, [methods.watch]);

    return (
        <FormProvider {...methods}>
            <fieldset disabled={!canEdit} className="contents">
                {/* Hero Header */}
                <DoctorHeroHeader initialData={initialData} canEdit={canEdit} />

                {/* Content Card com Tabs */}
                <div className="max-w-5xl mx-auto w-full px-6 -mt-12 relative z-20 pb-8">
                    <div className="bg-white rounded-xl shadow-lg border border-gray-200/60 overflow-hidden">
                        {/* Status bar */}
                        <div className="px-6 py-2 border-b border-gray-100 flex justify-end items-center min-h-[36px]">
                            {saving && (
                                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                                    A guardar...
                                </span>
                            )}
                            {!saving && lastSaved && (
                                <span className="text-xs text-gray-400 flex items-center gap-1.5">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                    Guardado às {lastSaved.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                        </div>

                        <Tabs defaultValue="dados" className="w-full">
                            <TabsList className="w-full justify-start bg-gray-50/50 border-b border-gray-100 px-6 h-12 gap-2 rounded-none">
                                <TabsTrigger value="dados" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                                    Dados
                                </TabsTrigger>
                                <TabsTrigger value="analytics" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                                    Analytics
                                </TabsTrigger>
                                <TabsTrigger value="permissions" className="data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-lg">
                                    Acessos e Permissões
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="dados" className="p-6 space-y-6 mt-0">
                                <DoctorDataTab doctorId={initialData.user_id} />
                            </TabsContent>

                            <TabsContent value="analytics" className="p-6 space-y-6 mt-0">
                                <DoctorAnalyticsTab />
                            </TabsContent>

                            <TabsContent value="permissions" className="p-6 space-y-6 mt-0">
                                <DoctorPermissionsTab />
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </fieldset>
        </FormProvider>
    );
}
