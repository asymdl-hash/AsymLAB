'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clinicsService, ClinicFullDetails } from '@/services/clinicsService';
import ClinicForm from '@/components/clinics/ClinicForm';
import { Loader2 } from 'lucide-react';

export default function ClinicPage({ params }: { params: { id: string } }) {
    const [clinic, setClinic] = useState<ClinicFullDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                // Se vier "new", criar nova clínica
                if (params.id === 'new') {
                    const newClinic = await clinicsService.createClinic('Nova Clínica');
                    if (newClinic) {
                        router.replace(`/dashboard/clinics/${newClinic.id}`);
                    }
                    return;
                }

                // Carregar dados da clínica
                const data = await clinicsService.getClinicDetails(params.id);
                setClinic(data);
            } catch (err) {
                console.error('Erro ao carregar clínica:', err);
                // Redirecionar para lista em caso de erro
                router.push('/dashboard/clinics');
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, [params.id, router]);

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!clinic) {
        return null; // Será redirecionado
    }

    return (
        <div className="h-full flex flex-col space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{clinic.commercial_name}</h1>
                    <p className="text-sm text-gray-500">
                        Criada em {new Date(clinic.created_at).toLocaleDateString()}
                    </p>
                </div>
            </div>

            <ClinicForm initialData={clinic} />
        </div>
    );
}
