'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clinicsService, ClinicFullDetails } from '@/services/clinicsService';
import ClinicForm from '@/components/clinics/ClinicForm';
import { Loader2, Building2 } from 'lucide-react';

export default function ClinicPage({ params }: { params: { id: string } }) {
    const [clinic, setClinic] = useState<ClinicFullDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        async function loadData() {
            try {
                // Se vier "new", criar nova clínica
                if (params.id === 'new') {
                    const newClinic = await clinicsService.createClinic('Nova Clínica');
                    if (newClinic) {
                        router.replace(`/dashboard/clinics/${newClinic.id}`);
                    }
                    return;
                }

                // Carregar dados da clínica
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

    return (
        <div className="h-full flex flex-col">
            {/* ============ HERO HEADER ============ */}
            <div className="bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] px-8 pt-8 pb-16 relative overflow-hidden">
                {/* Subtle pattern overlay */}
                <div className="absolute inset-0 opacity-5" style={{
                    backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(245,158,11,0.15) 0%, transparent 50%)'
                }} />

                <div className="relative z-10 flex items-center gap-4">
                    {/* Logo ou ícone */}
                    {clinic.logo_url ? (
                        <img
                            src={clinic.logo_url}
                            alt={clinic.commercial_name}
                            className="h-14 w-14 rounded-full object-cover border-2 border-white/10 shadow-lg"
                        />
                    ) : (
                        <div className="h-14 w-14 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center shadow-lg">
                            <Building2 className="h-7 w-7 text-primary" />
                        </div>
                    )}
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {clinic.commercial_name}
                        </h1>
                        <p className="text-sm text-gray-400 mt-0.5">
                            Criada em {new Date(clinic.created_at).toLocaleDateString()}
                            {clinic.legal_name && clinic.legal_name !== clinic.commercial_name && (
                                <span className="ml-2 text-gray-500">· {clinic.legal_name}</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>

            {/* ============ CONTENT CARD (sobrepõe o hero) ============ */}
            <div className="flex-1 -mt-8 px-6 pb-6 relative z-10">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 min-h-full">
                    <ClinicForm initialData={clinic} />
                </div>
            </div>
        </div>
    );
}
