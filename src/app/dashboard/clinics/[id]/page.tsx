'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clinicsService, ClinicFullDetails } from '@/services/clinicsService';
import ClinicForm from '@/components/clinics/ClinicForm';
import { Loader2 } from 'lucide-react';

export default function ClinicPage({ params }: { params: { id: string } }) {
    const [clinic, setClinic] = useState<ClinicFullDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const router = useRouter();

    useEffect(() => {
        // Se vier "new", redirecionar para função de criação (embora a lista já trate disso, proteção extra)
        if (params.id === 'new') {
            clinicsService.createClinic('Nova Clínica').then(newClinic => {
                if (newClinic) router.replace(`/dashboard/clinics/${newClinic.id}`);
            });
            return;
        }

        loadClinicData();
    }, [params.id]);

    const loadClinicData = async () => {
        try {
            setLoading(true);
            const data = await clinicsService.getClinicDetails(params.id);
            setClinic(data);
        } catch (err) {
            console.error(err);
            setError('Falha ao carregar dados da clínica.');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error || !clinic) {
        return (
            <div className="flex h-full flex-col items-center justify-center space-y-4">
                <p className="text-red-500">{error || 'Clínica não encontrada.'}</p>
                <button
                    onClick={() => router.push('/dashboard/clinics')}
                    className="text-primary hover:underline"
                >
                    Voltar à lista
                </button>
            </div>
        );
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
                {/* Botão de Delete pode ficar aqui ou dentro do form */}
            </div>

            {/* O Grande Formulário */}
            <ClinicForm initialData={clinic} />
        </div>
    );
}
