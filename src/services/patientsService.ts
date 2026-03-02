import { supabase } from '@/lib/supabase';
import { Tables } from '@/types/database.types';

// === Tipos para o módulo Pacientes ===

// Paciente na lista (com dados join)
export type PatientListItem = Tables<'patients'> & {
    clinica: { id: string; commercial_name: string } | null;
    medico: { user_id: string; full_name: string } | null;
    treatment_plans: { id: string; estado: string }[];
};

// Paciente completo (para a ficha)
export type PatientFullDetails = Tables<'patients'> & {
    clinica: { id: string; commercial_name: string } | null;
    medico: { user_id: string; full_name: string } | null;
    treatment_plans: (Tables<'treatment_plans'> & {
        work_type: { id: string; nome: string; cor: string | null } | null;
        medico: { user_id: string; full_name: string } | null;
        clinica: { id: string; commercial_name: string } | null;
        phases: (Tables<'phases'> & {
            appointments: Tables<'appointments'>[];
        })[];
    })[];
};

export const patientsService = {
    // 1. Listar pacientes (para a sidebar/lista)
    async getPatients(): Promise<PatientListItem[]> {
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinica:clinics!patients_clinica_id_fkey(id, commercial_name),
                medico:user_profiles!patients_medico_principal_id_fkey(user_id, full_name),
                treatment_plans(id, estado)
            `)
            .is('deleted_at', null)
            .is('merged_into_id', null)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return (data || []) as PatientListItem[];
    },

    // 2. Obter detalhes completos de um paciente
    async getPatientDetails(id: string): Promise<PatientFullDetails | null> {
        const { data, error } = await supabase
            .from('patients')
            .select(`
                *,
                clinica:clinics!patients_clinica_id_fkey(id, commercial_name),
                medico:user_profiles!patients_medico_principal_id_fkey(user_id, full_name),
                treatment_plans(
                    *,
                    work_type:work_types!treatment_plans_tipo_trabalho_id_fkey(id, nome, cor),
                    medico:user_profiles!treatment_plans_medico_id_fkey(user_id, full_name),
                    clinica:clinics!treatment_plans_clinica_id_fkey(id, commercial_name),
                    phases(
                        *,
                        appointments(*)
                    )
                )
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        return data as PatientFullDetails;
    },

    // 3. Criar novo paciente
    async createPatient(data: {
        nome: string;
        clinica_id: string;
        medico_principal_id: string;
    }) {
        const { data: patient, error } = await supabase
            .from('patients')
            .insert({
                nome: data.nome,
                clinica_id: data.clinica_id,
                medico_principal_id: data.medico_principal_id,
                origem: 'app' as const,
            })
            .select('id, t_id, nome')
            .single();

        if (error) throw error;

        // Sync patient_doctors para permissões RLS (médico vê seus pacientes)
        if (patient && data.medico_principal_id) {
            await supabase.from('patient_doctors').upsert(
                { patient_id: patient.id, doctor_id: data.medico_principal_id },
                { onConflict: 'patient_id,doctor_id' }
            );
        }

        // NAS: criar subpastas do paciente (fire-and-forget)
        if (patient?.t_id) {
            this._nasCreateFolder({ action: 'create_patient', t_id: patient.t_id });
        }

        return patient;
    },

    // 4. Update genérico (auto-save)
    async updatePatient(id: string, data: Record<string, unknown>) {
        const { error } = await supabase
            .from('patients')
            .update(data)
            .eq('id', id);

        if (error) throw error;

        // Se medico_principal_id mudou, garantir que está em patient_doctors
        if (data.medico_principal_id && typeof data.medico_principal_id === 'string') {
            await supabase.from('patient_doctors').upsert(
                { patient_id: id, doctor_id: data.medico_principal_id },
                { onConflict: 'patient_id,doctor_id' }
            );
        }
    },

    // 5. Soft delete
    async softDeletePatient(id: string) {
        const { data: { user } } = await supabase.auth.getUser();
        const { error } = await supabase
            .from('patients')
            .update({
                deleted_at: new Date().toISOString(),
                deleted_by: user?.id || null,
            })
            .eq('id', id);

        if (error) throw error;
    },

    // 6. Toggle urgente
    async toggleUrgent(id: string, urgente: boolean) {
        const { error } = await supabase
            .from('patients')
            .update({ urgente })
            .eq('id', id);

        if (error) throw error;
    },

    // 7. Buscar clínicas para dropdown
    async getClinics() {
        const { data, error } = await supabase
            .from('clinics')
            .select('id, commercial_name')
            .eq('is_active', true)
            .order('commercial_name');

        if (error) throw error;
        return data || [];
    },

    // 8. Buscar médicos para dropdown
    async getDoctors() {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('user_id, full_name, phone')
            .eq('app_role', 'doctor')
            .order('full_name');

        if (error) throw error;
        return data || [];
    },

    // 9. Buscar work types para dropdown
    async getWorkTypes() {
        const { data, error } = await supabase
            .from('work_types')
            .select('id, nome, cor, categoria')
            .eq('activo', true)
            .order('ordem');

        if (error) throw error;
        return data || [];
    },

    // 10. Criar plano de tratamento
    async createTreatmentPlan(data: {
        patient_id: string;
        nome: string;
        tipo_trabalho_id: string;
        medico_id: string;
        clinica_id: string;
    }) {
        const { data: plan, error } = await supabase
            .from('treatment_plans')
            .insert({
                patient_id: data.patient_id,
                nome: data.nome,
                tipo_trabalho_id: data.tipo_trabalho_id,
                medico_id: data.medico_id,
                clinica_id: data.clinica_id,
                origem: 'app' as const,
            })
            .select('*')
            .single();

        if (error) throw error;

        // NAS: criar subpastas do plano (fire-and-forget)
        // Precisamos do t_id do paciente e do número de ordem do plano
        if (plan) {
            this._nasCreatePlanFolder(data.patient_id, plan);
        }

        return plan;
    },

    // 11. Update genérico para qualquer tabela
    async updateRecord(table: 'treatment_plans' | 'phases' | 'appointments' | 'considerations', id: string, data: Record<string, unknown>) {
        const { error } = await supabase
            .from(table)
            .update(data)
            .eq('id', id);

        if (error) throw error;

        // NAS: rename automático quando tipo ou data do agendamento muda
        if (table === 'appointments' && (data.tipo || data.data_prevista !== undefined)) {
            this._nasRenameAppointment(id);
        }
    },

    // ═══════════════════════════════════════════════════════════
    // Widget Fresagem — CRUD milling_records + materiais
    // ═══════════════════════════════════════════════════════════

    async getMillingMaterials() {
        const { data, error } = await supabase
            .from('milling_materials')
            .select('*')
            .eq('activo', true)
            .order('ordem');
        if (error) throw error;
        return data || [];
    },

    async getMillingRecord(appointmentId: string) {
        const { data, error } = await supabase
            .from('milling_records')
            .select('*')
            .eq('appointment_id', appointmentId)
            .order('sequence_number')
            .limit(1)
            .maybeSingle();
        if (error) throw error;
        return data;
    },

    async createMillingRecord(appointmentId: string, materialId: string, materialName: string) {
        const { data: user } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('milling_records')
            .insert({
                appointment_id: appointmentId,
                material_id: materialId,
                material_name: materialName,
                status: 'em_curso',
                created_by: user?.user?.id,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateMillingRecord(id: string, updates: Record<string, unknown>) {
        const { error } = await supabase
            .from('milling_records')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) throw error;
    },

    async getAppointmentHierarchy(appointmentId: string) {
        // Resolver hierarquia: appointment → phase → plan → patient
        const { data: appt } = await supabase
            .from('appointments')
            .select('id, tipo, data_prevista, phase_id')
            .eq('id', appointmentId)
            .single();
        if (!appt) return null;

        const { data: phaseData } = await supabase
            .from('phases')
            .select('nome, ordem, plan_id, treatment_plans!inner(id, patient_id, patients!inner(t_id))')
            .eq('id', appt.phase_id)
            .single();
        if (!phaseData) return null;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const planInfo = (phaseData as any).treatment_plans;
        const t_id = planInfo?.patients?.t_id;
        if (!t_id) return null;

        // Determinar ordem do plano
        const { data: plans } = await supabase
            .from('treatment_plans')
            .select('id')
            .eq('patient_id', planInfo.patient_id)
            .is('deleted_at', null)
            .order('created_at');
        const planOrder = (plans?.findIndex((p: { id: string }) => p.id === planInfo.id) ?? 0) + 1;

        // Determinar ordem do agendamento
        const { data: appts } = await supabase
            .from('appointments')
            .select('id')
            .eq('phase_id', appt.phase_id)
            .order('created_at');
        const apptOrder = (appts?.findIndex(a => a.id === appointmentId) ?? 0) + 1;

        return {
            t_id,
            plan_order: planOrder,
            phase_order: phaseData.ordem,
            phase_name: phaseData.nome,
            appt_order: apptOrder,
        };
    },

    // ═══════════════════════════════════════════════════════════
    // Widget Dentes — CRUD teeth_records
    // ═══════════════════════════════════════════════════════════

    async getTeethRecords(appointmentId: string) {
        const { data, error } = await supabase
            .from('teeth_records')
            .select('*')
            .eq('appointment_id', appointmentId)
            .order('created_at');
        if (error) throw error;
        return data || [];
    },

    async createTeethRecord(appointmentId: string, teethData: unknown[], notas?: string) {
        const { data: user } = await supabase.auth.getUser();
        const { data, error } = await supabase
            .from('teeth_records')
            .insert({
                appointment_id: appointmentId,
                teeth_data: teethData,
                version_number: 1,
                notas: notas || null,
                created_by: user?.user?.id,
                updated_by: user?.user?.id,
            })
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateTeethRecord(id: string, teethData: unknown[], notas?: string) {
        // Buscar versão actual
        const { data: current } = await supabase
            .from('teeth_records')
            .select('version_number')
            .eq('id', id)
            .single();

        const { data: user } = await supabase.auth.getUser();
        const newVersion = (current?.version_number || 0) + 1;

        const { error } = await supabase
            .from('teeth_records')
            .update({
                teeth_data: teethData,
                version_number: newVersion,
                notas: notas || null,
                updated_by: user?.user?.id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', id);
        if (error) throw error;
        return newVersion;
    },

    // 12. Criar fase dentro de um plano
    async createPhase(data: {
        treatment_plan_id: string;
        nome: string;
        ordem: number;
        notas?: string;
    }) {
        const { data: phase, error } = await supabase
            .from('phases')
            .insert({
                plan_id: data.treatment_plan_id,
                nome: data.nome,
                ordem: data.ordem,
                notas: data.notas || null,
            })
            .select('*')
            .single();

        if (error) throw error;

        // NAS: criar subpastas da fase (fire-and-forget)
        if (phase) {
            this._nasCreatePhaseFolder(data.treatment_plan_id, phase);
        }

        return phase;
    },

    // 13. Criar agendamento dentro de uma fase
    async createAppointment(data: {
        phase_id: string;
        tipo: string;
        data_prevista?: string;
        hora_prevista?: string;
        notas?: string;
    }) {
        const insertData: Record<string, unknown> = {
            phase_id: data.phase_id,
            tipo: data.tipo,
            data_prevista: data.data_prevista || null,
            notas: data.notas || null,
        };

        if (data.hora_prevista) insertData.hora_prevista = data.hora_prevista;

        const { data: appointment, error } = await supabase
            .from('appointments')
            .insert(insertData)
            .select('*')
            .single();

        if (error) throw error;

        // NAS: criar subpastas do agendamento (fire-and-forget)
        if (appointment) {
            this._nasCreateAppointmentFolder(data.phase_id, appointment);
        }

        return appointment;
    },

    // 14. Alterar estado do plano
    async updatePlanState(planId: string, estado: string) {
        const updates: Record<string, unknown> = { estado };
        if (estado === 'concluido') {
            updates.data_conclusao = new Date().toISOString();
        }
        const { error } = await supabase
            .from('treatment_plans')
            .update(updates)
            .eq('id', planId);

        if (error) throw error;
    },

    // 15. Obter detalhes de um plano específico (com fases e agendamentos)
    async getPlanDetails(planId: string) {
        const { data, error } = await supabase
            .from('treatment_plans')
            .select(`
                *,
                work_type:work_types!treatment_plans_tipo_trabalho_id_fkey(id, nome, cor),
                medico:user_profiles!treatment_plans_medico_id_fkey(user_id, full_name),
                clinica:clinics!treatment_plans_clinica_id_fkey(id, commercial_name),
                patient:patients!treatment_plans_patient_id_fkey(id, nome, t_id),
                phases(
                    *,
                    appointments(*)
                )
            `)
            .eq('id', planId)
            .single();

        if (error) throw error;
        return data;
    },

    // 16. Listar considerações de um paciente (com filtro por fase opcional)
    async getConsiderations(patientId: string, phaseId?: string) {
        // Considerations liga-se via phase_id, não tem patient_id directo
        if (phaseId) {
            // Filtro directo numa fase
            const { data, error } = await supabase
                .from('considerations')
                .select(`
                    *,
                    autor:user_profiles!considerations_autor_id_fkey(user_id, full_name, app_role)
                `)
                .eq('phase_id', phaseId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        }

        // Buscar todas as fases do paciente via planos
        const { data: plans } = await supabase
            .from('treatment_plans')
            .select('id')
            .eq('patient_id', patientId);

        if (!plans || plans.length === 0) return [];

        const { data: phases } = await supabase
            .from('phases')
            .select('id')
            .in('plan_id', plans.map(p => p.id));

        if (!phases || phases.length === 0) return [];

        const { data, error } = await supabase
            .from('considerations')
            .select(`
                *,
                autor:user_profiles!considerations_autor_id_fkey(user_id, full_name, app_role)
            `)
            .in('phase_id', phases.map(p => p.id))
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // 17. Criar consideração (com anexo opcional)
    async createConsideration(data: {
        phase_id: string;
        appointment_id?: string;
        lado: string;
        conteudo: string;
        anexo_url?: string;
        anexo_nome?: string;
        anexo_tipo?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        const insertData: Record<string, unknown> = {
            appointment_id: data.appointment_id || null,
            phase_id: data.phase_id,
            lado: data.lado,
            conteudo: data.conteudo,
            autor_id: user?.id || '',
            versao: 1,
        };

        if (data.anexo_url) insertData.anexo_url = data.anexo_url;
        if (data.anexo_nome) insertData.anexo_nome = data.anexo_nome;
        if (data.anexo_tipo) insertData.anexo_tipo = data.anexo_tipo;

        const { data: consideration, error } = await supabase
            .from('considerations')
            .insert(insertData)
            .select('*')
            .single();

        if (error) throw error;
        return consideration;
    },

    // 17b. Upload de ficheiro para consideração
    async uploadConsiderationFile(phaseId: string, file: File): Promise<{ url: string; nome: string; tipo: string }> {
        const ext = file.name.split('.').pop() || 'bin';
        const fileName = `${phaseId}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;

        const { error } = await supabase.storage
            .from('consideration-files')
            .upload(fileName, file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (error) throw error;

        const { data: urlData } = supabase.storage
            .from('consideration-files')
            .getPublicUrl(fileName);

        return {
            url: urlData.publicUrl,
            nome: file.name,
            tipo: file.type,
        };
    },

    // 18. Listar ficheiros de um paciente
    async getFiles(patientId: string) {
        const { data, error } = await supabase
            .from('files')
            .select(`
                *,
                enviado_por:user_profiles!files_enviado_por_fkey(user_id, full_name)
            `)
            .eq('patient_id', patientId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    // 19. Upload de ficheiro (Storage + metadata)
    async uploadFile(data: {
        file: File;
        patient_id: string;
        plan_id?: string;
        phase_id?: string;
    }) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Utilizador não autenticado');

        // Determinar tipo com base no mime_type
        const mimeType = data.file.type;
        let tipo = 'outro';
        if (mimeType.startsWith('image/')) tipo = 'foto';
        else if (mimeType.startsWith('video/')) tipo = 'video';
        else if (mimeType === 'application/pdf' || mimeType.includes('document') || mimeType.includes('text/')) tipo = 'documento';
        else if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z') || mimeType.includes('compressed')) tipo = 'comprimido';
        else if (data.file.name.toLowerCase().endsWith('.stl')) tipo = 'stl';

        // Gerar path único no storage
        const timestamp = Date.now();
        const safeName = data.file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const storagePath = `${data.patient_id}/${timestamp}_${safeName}`;

        // 1. Upload para Supabase Storage
        const { error: uploadError } = await supabase.storage
            .from('patient-files')
            .upload(storagePath, data.file, {
                cacheControl: '3600',
                upsert: false,
            });

        if (uploadError) throw uploadError;

        // 2. Inserir metadata na tabela files
        const { data: fileRecord, error: dbError } = await supabase
            .from('files')
            .insert({
                patient_id: data.patient_id,
                plan_id: data.plan_id || null,
                phase_id: data.phase_id || null,
                nome_original: data.file.name,
                nome_nas: safeName,
                tipo,
                mime_type: mimeType,
                caminho_nas: storagePath,
                tamanho: data.file.size,
                enviado_por: user.id,
                versao: 1,
                origem: 'app',
            })
            .select('*')
            .single();

        if (dbError) {
            // Rollback: apagar ficheiro do storage se falhou o insert
            await supabase.storage.from('patient-files').remove([storagePath]);
            throw dbError;
        }

        return fileRecord;
    },

    // 20. Obter URL signed para download
    async getFileUrl(storagePath: string) {
        const { data, error } = await supabase.storage
            .from('patient-files')
            .createSignedUrl(storagePath, 3600); // 1h

        if (error) throw error;
        return data.signedUrl;
    },

    // 21. Eliminar ficheiro (storage + metadata)
    async deleteFile(fileId: string, storagePath: string) {
        // 1. Apagar do storage
        await supabase.storage.from('patient-files').remove([storagePath]);

        // 2. Apagar metadata
        const { error } = await supabase
            .from('files')
            .delete()
            .eq('id', fileId);

        if (error) throw error;
    },

    // 22. Delete genérico (soft ou hard dependendo da tabela)
    async deleteRecord(table: 'phases' | 'appointments' | 'considerations', id: string) {
        const { error } = await supabase
            .from(table)
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    // 23. Reordenar fases (trocar ordem entre duas fases)
    async swapPhaseOrder(phaseA: { id: string; ordem: number }, phaseB: { id: string; ordem: number }) {
        // Update A com ordem de B
        const { error: err1 } = await supabase
            .from('phases')
            .update({ ordem: phaseB.ordem })
            .eq('id', phaseA.id);
        if (err1) throw err1;

        // Update B com ordem de A
        const { error: err2 } = await supabase
            .from('phases')
            .update({ ordem: phaseA.ordem })
            .eq('id', phaseB.id);
        if (err2) throw err2;
    },

    // Levenshtein distance — distância de edição entre duas strings
    _levenshtein(a: string, b: string): number {
        const m = a.length, n = b.length;
        if (m === 0) return n;
        if (n === 0) return m;
        const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;
        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                dp[i][j] = a[i - 1] === b[j - 1]
                    ? dp[i - 1][j - 1]
                    : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
        return dp[m][n];
    },

    // Calcular similaridade em percentagem (0-100)
    _similarity(a: string, b: string): number {
        const maxLen = Math.max(a.length, b.length);
        if (maxLen === 0) return 100;
        return Math.round((1 - this._levenshtein(a, b) / maxLen) * 100);
    },

    // 24. Anti-duplicação: verificar se já existe paciente com nome similar na mesma clínica
    async checkDuplicates(currentPatientId: string, nome: string, clinicaId: string, idPacienteClinica?: string | null): Promise<{
        status: 'ok' | 'warning' | 'block';
        matches: { id: string; nome: string; t_id: string; id_paciente_clinica: string | null; similarity: number }[];
        message: string;
    }> {
        if (!nome || nome.trim().length < 3 || nome === 'Novo Paciente (Rascunho)') {
            return { status: 'ok', matches: [], message: '' };
        }

        // Buscar pacientes da mesma clínica (excluindo o atual e os eliminados)
        const { data, error } = await supabase
            .from('patients')
            .select('id, nome, t_id, id_paciente_clinica')
            .eq('clinica_id', clinicaId)
            .is('deleted_at', null)
            .neq('id', currentPatientId);

        if (error || !data) return { status: 'ok', matches: [], message: '' };

        // Normalizar nome para comparação
        const normalize = (s: string) => s.trim().toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remover acentos
            .replace(/\s+/g, ' ');

        const queryNorm = normalize(nome);

        // Encontrar matches por similaridade de nome (com score)
        const matchesWithScore = data
            .map(p => {
                const candidateNorm = normalize(p.nome);
                // Match exacto
                if (candidateNorm === queryNorm) return { ...p, similarity: 100 };
                // Contém o nome inteiro
                if (candidateNorm.includes(queryNorm) || queryNorm.includes(candidateNorm)) {
                    return { ...p, similarity: this._similarity(candidateNorm, queryNorm) };
                }
                // Levenshtein real: distância ≤ 3 para nomes com ≥ 5 caracteres
                const dist = this._levenshtein(candidateNorm, queryNorm);
                const maxLen = Math.max(candidateNorm.length, queryNorm.length);
                if (maxLen >= 5 && dist <= 3) {
                    return { ...p, similarity: Math.round((1 - dist / maxLen) * 100) };
                }
                // Prefixo 80% (manter para nomes longos com sufixos diferentes)
                const minLen = Math.min(candidateNorm.length, queryNorm.length);
                if (minLen >= 6) {
                    const prefixLen = Math.floor(minLen * 0.8);
                    if (candidateNorm.substring(0, prefixLen) === queryNorm.substring(0, prefixLen)) {
                        return { ...p, similarity: this._similarity(candidateNorm, queryNorm) };
                    }
                }
                return null;
            })
            .filter((m): m is NonNullable<typeof m> => m !== null)
            .sort((a, b) => b.similarity - a.similarity);

        if (matchesWithScore.length === 0) {
            return { status: 'ok', matches: [], message: '' };
        }

        const matches = matchesWithScore;

        // Aplicar regras §3.3 do MODULO_PACIENTES.md
        const hasIdClinica = idPacienteClinica && idPacienteClinica.trim().length > 0;

        for (const match of matches) {
            const matchHasId = match.id_paciente_clinica && match.id_paciente_clinica.trim().length > 0;

            if (hasIdClinica && matchHasId) {
                if (idPacienteClinica!.trim().toLowerCase() === match.id_paciente_clinica!.trim().toLowerCase()) {
                    // Mesmo ID Paciente Clínica = duplicação confirmada
                    return {
                        status: 'block',
                        matches,
                        message: `Duplicação detectada: "${match.nome}" (${match.t_id}) tem o mesmo ID de Clínica "${match.id_paciente_clinica}".`,
                    };
                }
                // IDs diferentes = pode criar (são pacientes diferentes)
                continue;
            }

            if (!hasIdClinica && !matchHasId) {
                // Nenhum tem ID = bloqueia, pede para preencher
                return {
                    status: 'block',
                    matches,
                    message: `Paciente com nome similar "${match.nome}" (${match.t_id}) já existe nesta clínica. Preencha o ID Paciente Clínica em ambos para confirmar que são diferentes.`,
                };
            }

            // Só um tem ID = avisa
            return {
                status: 'warning',
                matches,
                message: `Possível duplicado: "${match.nome}" (${match.t_id}) — ${match.similarity}% similar. Preencha o ID Paciente Clínica para confirmar.`,
            };
        }

        return { status: 'ok', matches: [], message: '' };
    },

    // =================== PATIENT DOCTORS (N:N) ===================

    // 25. Obter médicos associados a um paciente
    async getPatientDoctors(patientId: string): Promise<{ doctor_id: string; full_name: string }[]> {
        const { data, error } = await supabase
            .from('patient_doctors')
            .select(`
                doctor_id,
                doctor:user_profiles!patient_doctors_doctor_id_fkey(full_name)
            `)
            .eq('patient_id', patientId);

        if (error) throw error;
        return (data || []).map((d: Record<string, unknown>) => ({
            doctor_id: d.doctor_id as string,
            full_name: ((d.doctor as Record<string, string> | null)?.full_name) || 'Desconhecido',
        }));
    },

    // 26. Sincronizar médicos associados (idempotente: delete all + insert all)
    async syncDoctors(patientId: string, doctorIds: string[]): Promise<void> {
        // Remover todos os médicos actuais
        const { error: delErr } = await supabase
            .from('patient_doctors')
            .delete()
            .eq('patient_id', patientId);
        if (delErr) throw delErr;

        // Inserir novos (se houver)
        if (doctorIds.length > 0) {
            const rows = doctorIds.map(id => ({ patient_id: patientId, doctor_id: id }));
            const { error: insErr } = await supabase
                .from('patient_doctors')
                .insert(rows);
            if (insErr) throw insErr;
        }
    },

    // =================== PHASE MATERIALS ===================

    // 27. Obter materiais de uma fase
    async getPhaseMaterials(phaseId: string) {
        const { data, error } = await supabase
            .from('phase_materials')
            .select('*')
            .eq('phase_id', phaseId)
            .order('created_at', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // 28. Adicionar material a uma fase
    async addPhaseMaterial(data: {
        phase_id: string;
        nome: string;
        quantidade?: number;
        unidade?: string;
        notas?: string;
    }) {
        const { data: mat, error } = await supabase
            .from('phase_materials')
            .insert({
                phase_id: data.phase_id,
                nome: data.nome,
                quantidade: data.quantidade || 1,
                unidade: data.unidade || 'un',
                notas: data.notas || null,
            })
            .select('*')
            .single();

        if (error) throw error;
        return mat;
    },

    // 29. Remover material de uma fase
    async removePhaseMaterial(materialId: string) {
        const { error } = await supabase
            .from('phase_materials')
            .delete()
            .eq('id', materialId);

        if (error) throw error;
    },

    // 30. Obter dentes de uma fase (odontograma)
    async getPhaseTeeth(phaseId: string) {
        const { data, error } = await supabase
            .from('phase_teeth')
            .select('id, phase_id, tooth_number, work_type_id')
            .eq('phase_id', phaseId)
            .order('tooth_number', { ascending: true });

        if (error) throw error;
        return data || [];
    },

    // 31. Sincronizar dentes de uma fase (replace all)
    async syncPhaseTeeth(phaseId: string, teeth: { tooth_number: number; work_type_id: string | null }[]) {
        // Apagar dentes existentes
        const { error: delError } = await supabase
            .from('phase_teeth')
            .delete()
            .eq('phase_id', phaseId);

        if (delError) throw delError;

        // Inserir novos (se houver)
        if (teeth.length > 0) {
            const { error: insError } = await supabase
                .from('phase_teeth')
                .insert(teeth.map(t => ({
                    phase_id: phaseId,
                    tooth_number: t.tooth_number,
                    work_type_id: t.work_type_id,
                })));

            if (insError) throw insError;
        }
    },

    // ═══════════════════════════════════════════════════════════
    // NAS Helpers — Criação automática de pastas (fire-and-forget)
    // Conforme PACIENTES_NAS.md
    // ═══════════════════════════════════════════════════════════

    _nasCreateFolder(body: Record<string, unknown>) {
        fetch('/api/patient-folder', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        }).catch(err => console.warn('[NAS] Erro ao criar pasta:', err));
    },

    async _nasCreatePlanFolder(patientId: string, plan: { id: string }) {
        try {
            // Obter t_id do paciente
            const { data: patient } = await supabase
                .from('patients')
                .select('t_id')
                .eq('id', patientId)
                .single();
            if (!patient?.t_id) return;

            // Contar quantos planos este paciente tem para determinar ordem
            const { count } = await supabase
                .from('treatment_plans')
                .select('id', { count: 'exact', head: true })
                .eq('patient_id', patientId)
                .is('deleted_at', null);

            this._nasCreateFolder({
                action: 'create_plan',
                t_id: patient.t_id,
                plan_order: count || 1,
            });
        } catch (err) {
            console.warn('[NAS] Erro ao criar pasta plano:', err);
        }
    },

    async _nasCreatePhaseFolder(planId: string, phase: { nome: string; ordem: number }) {
        try {
            // Obter t_id + plan_order
            const { data: planData } = await supabase
                .from('treatment_plans')
                .select('patient_id, patients!inner(t_id)')
                .eq('id', planId)
                .single();
            if (!planData) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const t_id = (planData as any).patients?.t_id;
            if (!t_id) return;

            // Determinar ordem do plano
            const { data: plans } = await supabase
                .from('treatment_plans')
                .select('id')
                .eq('patient_id', planData.patient_id)
                .is('deleted_at', null)
                .order('created_at');
            const planOrder = (plans?.findIndex(p => p.id === planId) ?? 0) + 1;

            this._nasCreateFolder({
                action: 'create_phase',
                t_id,
                plan_order: planOrder,
                phase_order: phase.ordem,
                phase_name: phase.nome,
            });
        } catch (err) {
            console.warn('[NAS] Erro ao criar pasta fase:', err);
        }
    },

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async _nasCreateAppointmentFolder(phaseId: string, appointment: any) {
        try {
            // Obter hierarquia: phase → plan → patient
            const { data: phaseData } = await supabase
                .from('phases')
                .select('nome, ordem, plan_id, treatment_plans!inner(patient_id, patients!inner(t_id))')
                .eq('id', phaseId)
                .single();
            if (!phaseData) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const planInfo = (phaseData as any).treatment_plans;
            const t_id = planInfo?.patients?.t_id;
            if (!t_id) return;

            // Determinar ordem do plano
            const { data: plans } = await supabase
                .from('treatment_plans')
                .select('id')
                .eq('patient_id', planInfo.patient_id)
                .is('deleted_at', null)
                .order('created_at');
            const planOrder = (plans?.findIndex((p: { id: string }) => p.id === planInfo.id) ?? 0) + 1;

            // Contar agendamentos nesta fase para determinar ordem
            const { count } = await supabase
                .from('appointments')
                .select('id', { count: 'exact', head: true })
                .eq('phase_id', phaseId);

            this._nasCreateFolder({
                action: 'create_appointment',
                t_id,
                plan_order: planOrder,
                phase_order: phaseData.ordem,
                phase_name: phaseData.nome,
                appt_order: count || 1,
                appt_type: appointment.tipo,
                appt_date: appointment.data_prevista,
            });
        } catch (err) {
            console.warn('[NAS] Erro ao criar pasta agendamento:', err);
        }
    },

    async _nasRenameAppointment(appointmentId: string) {
        try {
            // Obter dados actualizados do agendamento
            const { data: appt } = await supabase
                .from('appointments')
                .select('id, tipo, data_prevista, phase_id')
                .eq('id', appointmentId)
                .single();
            if (!appt) return;

            // Obter hierarquia: phase → plan → patient
            const { data: phaseData } = await supabase
                .from('phases')
                .select('nome, ordem, plan_id, treatment_plans!inner(patient_id, patients!inner(t_id))')
                .eq('id', appt.phase_id)
                .single();
            if (!phaseData) return;

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const planInfo = (phaseData as any).treatment_plans;
            const t_id = planInfo?.patients?.t_id;
            if (!t_id) return;

            // Determinar ordem do plano
            const { data: plans } = await supabase
                .from('treatment_plans')
                .select('id')
                .eq('patient_id', planInfo.patient_id)
                .is('deleted_at', null)
                .order('created_at');
            const planOrder = (plans?.findIndex((p: { id: string }) => p.id === planInfo.id) ?? 0) + 1;

            // Determinar ordem do agendamento dentro da fase
            const { data: appts } = await supabase
                .from('appointments')
                .select('id')
                .eq('phase_id', appt.phase_id)
                .order('created_at');
            const apptOrder = (appts?.findIndex(a => a.id === appointmentId) ?? 0) + 1;

            this._nasCreateFolder({
                action: 'rename_appointment',
                t_id,
                plan_order: planOrder,
                phase_order: phaseData.ordem,
                phase_name: phaseData.nome,
                appt_order: apptOrder,
                appt_type: appt.tipo,
                appt_date: appt.data_prevista,
            });
        } catch (err) {
            console.warn('[NAS] Erro ao renomear pasta agendamento:', err);
        }
    },
};
