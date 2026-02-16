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
                if (params.id === 'new') {
                    const newClinic = await clinicsService.createClinic('Nova Clínica');
                    if (newClinic) {
                        router.replace(`/dashboard/clinics/${newClinic.id}`);
                    }
                    return;
                }
                const data = await clinicsService.getClinicDetails(params.id);
                setClinic(data);
            } catch (err) {
                console.error('Erro ao carregar clínica:', err);
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
        return null;
    }

    return <ClinicForm initialData={clinic} />;
}
