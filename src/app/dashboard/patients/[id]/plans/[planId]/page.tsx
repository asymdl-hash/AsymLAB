'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { patientsService } from '@/services/patientsService';
import PlanDetail from '@/components/patients/PlanDetail';
import { Loader2 } from 'lucide-react';

export default function PlanPage() {
    const params = useParams();
    const router = useRouter();
    const patientId = params.id as string;
    const planId = params.planId as string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [plan, setPlan] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadPlan = async () => {
        try {
            setLoading(true);
            const data = await patientsService.getPlanDetails(planId);
            if (!data) {
                router.push(`/dashboard/patients/${patientId}`);
                return;
            }
            setPlan(data);
        } catch (err) {
            console.error('Error loading plan:', err);
            router.push(`/dashboard/patients/${patientId}`);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadPlan();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [planId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
            </div>
        );
    }

    if (!plan) return null;

    return <PlanDetail plan={plan} patientId={patientId} onReload={loadPlan} />;
}
