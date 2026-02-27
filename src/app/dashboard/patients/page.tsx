'use client';

import { Users } from 'lucide-react';
import PatientList from '@/components/patients/PatientList';

export default function Patients() {
    return (
        <>
            {/* Mobile: Mostra a lista directamente */}
            <div className="md:hidden h-full">
                <PatientList />
            </div>

            {/* Desktop: Placeholder */}
            <div className="hidden md:flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
                <div className="bg-gray-100 p-4 rounded-full">
                    <Users className="w-12 h-12 text-muted-foreground" />
                </div>
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Selecione um Paciente</h2>
                    <p className="text-gray-500 mt-2">Escolha um paciente na lista à esquerda para ver os detalhes.</p>
                </div>
            </div>
        </>
    );
}
