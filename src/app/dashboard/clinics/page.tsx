'use client';

import { Building2 } from 'lucide-react';

export default function Clinics() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
            <div className="bg-muted p-4 rounded-full">
                <Building2 className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
                <h2 className="text-xl font-semibold text-card-foreground">Selecione uma Clínica</h2>
                <p className="text-gray-500 mt-2">Escolha uma clínica na lista à esquerda para ver os detalhes ou editar.</p>
            </div>
        </div>
    );
}
