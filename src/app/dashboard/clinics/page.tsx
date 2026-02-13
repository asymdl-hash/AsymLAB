
'use client';

import { Building2 } from 'lucide-react';

export default function Clinics() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-8">
            <div className="bg-gray-100 p-4 rounded-full">
                <Building2 className="w-12 h-12 text-gray-400" />
            </div>
            <div>
                <h2 className="text-xl font-semibold text-gray-900">Selecione uma Clínica</h2>
                <p className="text-gray-500 mt-2">Escolha uma clínica na lista à esquerda para ver os detalhes ou editar.</p>
                <div className="mt-6 flex justify-center gap-4">
                    {/* Botão de Ajuda ou Ação Rápida */}
                </div>
            </div>
        </div>
    );
}
