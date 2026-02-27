'use client';

import { BarChart3 } from 'lucide-react';

export default function DoctorAnalyticsTab() {
    return (
        <div className="flex flex-col items-center justify-center py-16 text-center space-y-4">
            <div className="bg-gray-100 p-4 rounded-full">
                <BarChart3 className="w-10 h-10 text-muted-foreground" />
            </div>
            <div>
                <h3 className="text-lg font-semibold text-gray-800">Analytics</h3>
                <p className="text-sm text-gray-500 mt-1 max-w-sm">
                    Esta secção irá conter estatísticas e métricas de desempenho do médico.
                    Será implementada numa versão futura.
                </p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-amber-50 text-amber-600 border border-amber-200">
                Em breve
            </span>
        </div>
    );
}
