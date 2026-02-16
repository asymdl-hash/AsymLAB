'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { doctorsService, DoctorProfile } from '@/services/doctorsService';
import DoctorForm from '@/components/doctors/DoctorForm';

export default function DoctorDetailPage() {
    const params = useParams();
    const doctorId = params.id as string;
    const [doctor, setDoctor] = useState<DoctorProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await doctorsService.getDoctorDetails(doctorId);
                setDoctor(data);
            } catch (err: any) {
                console.error('Erro ao carregar médico:', err);
                setError('Não foi possível carregar os dados do médico.');
            } finally {
                setLoading(false);
            }
        };

        if (doctorId) load();
    }, [doctorId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error || !doctor) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500">
                <p>{error || 'Médico não encontrado.'}</p>
            </div>
        );
    }

    return <DoctorForm initialData={doctor} />;
}
