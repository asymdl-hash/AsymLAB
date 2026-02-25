'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { patientsService, PatientFullDetails } from '@/services/patientsService';
import PatientForm from '@/components/patients/PatientForm';
import { Loader2 } from 'lucide-react';

export default function PatientPage({ params }: { params: { id: string } }) {
    const [patient, setPatient] = useState<PatientFullDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                if (params.id === 'new') {
                    // Buscar primeira clínica e médico disponíveis para o rascunho
                    const [clinics, doctors] = await Promise.all([
                        patientsService.getClinics(),
                        patientsService.getDoctors(),
                    ]);

                    if (!clinics.length || !doctors.length) {
                        console.error('Precisa de pelo menos 1 clínica e 1 médico para criar paciente');
                        router.push('/dashboard/patients');
                        return;
                    }

                    const newPatient = await patientsService.createPatient({
                        nome: 'Novo Paciente (Rascunho)',
                        clinica_id: clinics[0].id,
                        medico_principal_id: doctors[0].user_id,
                    });

                    if (newPatient) {
                        window.dispatchEvent(new Event('patient-updated'));
                        router.replace(`/dashboard/patients/${newPatient.id}`);
                    }
                    return;
                }

                const data = await patientsService.getPatientDetails(params.id);
                setPatient(data);
            } catch (err) {
                console.error('Erro ao carregar paciente:', err);
                router.push('/dashboard/patients');
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

    if (!patient) {
        return null;
    }

    return <PatientForm initialData={patient} />;
}
