
'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { useEffect, useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'; // Assumindo shadcn/ui
import { clinicsService, ClinicFullDetails } from '@/services/clinicsService';

import ClinicInfoTab from './tabs/ClinicInfoTab';
import ClinicDeliveryTab from './tabs/ClinicDeliveryTab';
import ClinicTeamTab from './tabs/ClinicTeamTab';
import ClinicDiscountsTab from './tabs/ClinicDiscountsTab';
import ClinicSecurityTab from './tabs/ClinicSecurityTab';


interface ClinicFormProps {
    initialData: ClinicFullDetails;
}

export default function ClinicForm({ initialData }: ClinicFormProps) {
    const methods = useForm<ClinicFullDetails>({
        defaultValues: initialData,
        mode: 'onChange' // Validação em tempo real
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

    // Auto-Save Logic (Debounced)
    useEffect(() => {
        let timeoutId: NodeJS.Timeout;

        const subscription = methods.watch((value, { name, type }) => {
            if (name) {
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
            // Nota: Para updates relacionais complexos, talvez precisemos de lógica específica por aba.
            // Para já, assumimos update dos campos base da clínica.
            // Os sub-forms (contactos, equipa) devem ter a sua própria lógica de save ou serem geridos aqui.
            // A abordagem mais robusta para sub-listas é salvar quando se adiciona/remove/edita o item específico.

            // Salvar campos base da clínica
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


            // Removido: window.dispatchEvent(new CustomEvent('clinic-updated'));
            // Motivo: O refresh da route (Sidebar) causa remount do form e perde o foco/estado durante a escrita.
            // O evento deve ser disparado apenas onBlur de campos críticos (Nome).

            setLastSaved(new Date());
        } catch (error) {
            console.error('Auto-save failed', error);
        } finally {
            setSaving(false);
        }
    };

    return (
        <FormProvider {...methods}>
            <div className="space-y-6">
                {/* Status Bar */}
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

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="flex w-full max-w-full overflow-x-auto">
                        <TabsTrigger value="info" className="flex-shrink-0">Dados</TabsTrigger>
                        <TabsTrigger value="delivery" className="flex-shrink-0">Entregas</TabsTrigger>
                        <TabsTrigger value="team" className="flex-shrink-0">Equipa</TabsTrigger>
                        <TabsTrigger value="discounts" className="flex-shrink-0">Descontos</TabsTrigger>
                        <TabsTrigger value="permissions" className="flex-shrink-0 whitespace-nowrap">Acesso & Segurança</TabsTrigger>
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

                        <TabsContent value="discounts">
                            <ClinicDiscountsTab />
                        </TabsContent>

                        <TabsContent value="permissions">
                            <ClinicSecurityTab />
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </FormProvider>
    );
}
