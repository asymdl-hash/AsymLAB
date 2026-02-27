'use client';

import { Stethoscope } from 'lucide-react';

export default function Doctors() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
            <div className="bg-muted p-4 rounded-full">
                <Stethoscope className="w-12 h-12 text-muted-foreground" />
            </div>
            <div>
                <h2 className="text-xl font-semibold text-card-foreground">Selecione um Médico</h2>
                <p className="text-gray-500 mt-2">Escolha um médico na lista à esquerda para ver os detalhes.</p>
            </div>
        </div>
    );
}
