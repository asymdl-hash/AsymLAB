import { notFound, redirect } from 'next/navigation';
import { clinicsService } from '@/services/clinicsService';
import ClinicForm from '@/components/clinics/ClinicForm';

export default async function ClinicPage({ params }: { params: { id: string } }) {
    // Se vier "new", redirecionar para função de criação
    if (params.id === 'new') {
        const newClinic = await clinicsService.createClinic('Nova Clínica');
        if (newClinic) {
            redirect(`/dashboard/clinics/${newClinic.id}`);
        }
    }

    // Carregar dados da clínica no servidor
    let clinic;
    try {
        clinic = await clinicsService.getClinicDetails(params.id);
    } catch (err) {
        console.error('Failed to load clinic:', err);
        notFound();
    }

    if (!clinic) {
        notFound();
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
            <ClinicForm initialData={clinic!} />
        </div>
    );
}
