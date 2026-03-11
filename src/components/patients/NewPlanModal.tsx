'use client';

import { useState, useEffect, useRef, useMemo, useCallback, lazy, Suspense } from 'react';
import { X, Plus, Minus, Loader2, ChevronDown, ChevronUp, Check, Stethoscope, Users, UserPlus, Building2, Hash, Phone, Copy, Layers, ClipboardList, Palette, ImagePlus, MessageSquarePlus, Camera, Upload, Search, GripVertical, FileText, Paperclip } from 'lucide-react';
import CameraOverlay from './CameraOverlay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { patientsService } from '@/services/patientsService';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { OdontogramModal } from './Odontogram';
import { considerationsService, ConsiderationTemplate } from '@/services/considerationsService';
const RichTextResponse = lazy(() => import('./RichTextResponse'));

interface NewPlanModalProps {
    patientId: string;
    patientClinicaId: string | null;
    patientMedicoId: string | null;
    associatedDoctors: { doctor_id: string; full_name: string }[];
    onClose: () => void;
    onCreated: () => void;
}

type WorkTypeItem = { id: string; nome: string; cor: string | null; categoria: string | null };
type DoctorItem = { user_id: string; full_name: string };
type ClinicItem = { id: string; commercial_name: string };
type ToothColorItem = { id: string; codigo: string; nome: string; grupo: string | null };

interface WorkTypeSelection {
    work_type_id: string;
    quantity: number;
    assigned_teeth: number[];
}

export default function NewPlanModal({ patientId, patientClinicaId, patientMedicoId, associatedDoctors: initialTeam, onClose, onCreated }: NewPlanModalProps) {
    const [nome, setNome] = useState('');
    const [workTypeSelections, setWorkTypeSelections] = useState<WorkTypeSelection[]>([]);
    const [medicoId, setMedicoId] = useState(patientMedicoId || '');
    const [clinicaId, setClinicaId] = useState(patientClinicaId || '');
    const [team, setTeam] = useState<{ doctor_id: string; full_name: string }[]>(initialTeam);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [showOdontogram, setShowOdontogram] = useState(false);
    const [showWtDropdown, setShowWtDropdown] = useState(false);
    const wtDropdownRef = useRef<HTMLDivElement>(null);
    const [nextPlanNumber, setNextPlanNumber] = useState<number | null>(null);

    // Dropdown data
    const [workTypes, setWorkTypes] = useState<WorkTypeItem[]>([]);
    const [doctors, setDoctors] = useState<DoctorItem[]>([]);
    const [clinics, setClinics] = useState<ClinicItem[]>([]);
    const [toothColors, setToothColors] = useState<ToothColorItem[]>([]);
    const [loadingDropdowns, setLoadingDropdowns] = useState(true);

    // Método + Escala de Cor
    const [metodo, setMetodo] = useState('');
    const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);
    const [colorScalePhotos, setColorScalePhotos] = useState<File[]>([]);
    const [colorScalePreviews, setColorScalePreviews] = useState<string[]>([]);
    const [colorDragOver, setColorDragOver] = useState(false);
    const [showColorDropdown, setShowColorDropdown] = useState(false);
    const [activeColorGroup, setActiveColorGroup] = useState<string | null>(null);
    const [photoNotes, setPhotoNotes] = useState<Record<string, string>>({});
    const [fieldNotes, setFieldNotes] = useState<Record<string, string[]>>({});
    const colorDropdownRef = useRef<HTMLDivElement>(null);
    const colorFileRef = useRef<HTMLInputElement>(null);
    // Escala de Cor — Fotos Polarizadas
    const [polarizedPhotos, setPolarizedPhotos] = useState<File[]>([]);
    const [polarizedPreviews, setPolarizedPreviews] = useState<string[]>([]);
    const [polarizedDragOver, setPolarizedDragOver] = useState(false);
    const polarizedFileRef = useRef<HTMLInputElement>(null);

    // Registos Fotográficos — Face (multi-ficheiro por campo)
    const [faceRepouso, setFaceRepouso] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [faceSorrisoNatural, setFaceSorrisoNatural] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [faceSorrisoAlto, setFaceSorrisoAlto] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [face45Esq, setFace45Esq] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [face45Dir, setFace45Dir] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const faceRepousoRef = useRef<HTMLInputElement>(null);
    const faceSorrisoNaturalRef = useRef<HTMLInputElement>(null);
    const faceSorrisoAltoRef = useRef<HTMLInputElement>(null);
    const face45EsqRef = useRef<HTMLInputElement>(null);
    const face45DirRef = useRef<HTMLInputElement>(null);
    const [faceDragOver, setFaceDragOver] = useState<string | null>(null);
    // Registos Fotográficos — Close-up (multi-ficheiro por campo)
    const [closeupRepouso, setCloseupRepouso] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeupSorrisoNatural, setCloseupSorrisoNatural] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeupSorrisoAlto, setCloseupSorrisoAlto] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeup45Esq, setCloseup45Esq] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [closeup45Dir, setCloseup45Dir] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const closeupRepousoRef = useRef<HTMLInputElement>(null);
    const closeupSorrisoNaturalRef = useRef<HTMLInputElement>(null);
    const closeupSorrisoAltoRef = useRef<HTMLInputElement>(null);
    const closeup45EsqRef = useRef<HTMLInputElement>(null);
    const closeup45DirRef = useRef<HTMLInputElement>(null);
    const [closeupDragOver, setCloseupDragOver] = useState<string | null>(null);
    // Câmara (overlay avançado — todos os dispositivos)
    const [cameraTarget, setCameraTarget] = useState<{ setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; key: string } | null>(null);
    // Drag inter-campo: rastreia foto a ser arrastada entre campos
    const dragSourceRef = useRef<{ file: File; preview: string; note: string; noteKey: string; remove: () => void } | null>(null);
    // Registos Fotográficos — Introrais (Superior + Inferior)
    const [intraoralSupPhotos, setIntraoralSupPhotos] = useState<File[]>([]);
    const [intraoralSupPreviews, setIntraoralSupPreviews] = useState<string[]>([]);
    const intraoralSupFileRef = useRef<HTMLInputElement>(null);
    const [intraoralSupDragOver, setIntraoralSupDragOver] = useState(false);
    const [intraoralInfPhotos, setIntraoralInfPhotos] = useState<File[]>([]);
    const [intraoralInfPreviews, setIntraoralInfPreviews] = useState<string[]>([]);
    const intraoralInfFileRef = useRef<HTMLInputElement>(null);
    const [intraoralInfDragOver, setIntraoralInfDragOver] = useState(false);
    // Lightbox para imagens-guia

    // Registos Fotográficos — 45º
    const [photos45, setphotos45] = useState<File[]>([]);
    const [previews45, setpreviews45] = useState<string[]>([]);
    const fileRef45 = useRef<HTMLInputElement>(null);
    const [dragOver45, setdragOver45] = useState(false);
    // Registos Fotográficos — Outros
    const [photosOutros, setPhotosOutros] = useState<File[]>([]);
    const [previewsOutros, setPreviewsOutros] = useState<string[]>([]);
    const fileRefOutros = useRef<HTMLInputElement>(null);
    const [dragOverOutros, setDragOverOutros] = useState(false);
    const [photosCollapsed, setPhotosCollapsed] = useState(false);
    // Registos Radiológicos
    const [radioOrtopan, setRadioOrtopan] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [radioPeriapicais, setRadioPeriapicais] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const [radioCbct, setRadioCbct] = useState<{ files: File[]; previews: string[] }>({ files: [], previews: [] });
    const radioOrtopanRef = useRef<HTMLInputElement>(null);
    const radioPeriapicaisRef = useRef<HTMLInputElement>(null);
    const radioCbctRef = useRef<HTMLInputElement>(null);
    const [radioDragOver, setRadioDragOver] = useState<string | null>(null);
    const [radioCollapsed, setRadioCollapsed] = useState(false);
    // Considerações
    interface SubtituloEntry { id: string; texto: string; resposta: string; anexos: { file: File; preview: string }[] }
    interface ConsideracaoEntry { id: string; template_id?: string; titulo: string; descricao: string; subtitulos: SubtituloEntry[]; isModified: boolean; originalSubtitulos?: string[] }
    const [consideracoes, setConsideracoes] = useState<ConsideracaoEntry[]>([]);
    const [consideracoesCollapsed, setConsideracoesCollapsed] = useState(false);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [templateSearch, setTemplateSearch] = useState('');
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([]);
    const [loadingTemplates, setLoadingTemplates] = useState(false);
    const [dragSubtituloIdx, setDragSubtituloIdx] = useState<{ cardIdx: number; subIdx: number } | null>(null);
    const [photoSetup, setPhotoSetup] = useState<'basic' | 'complete'>('basic');
    const [expandEscalaCor, setExpandEscalaCor] = useState(true);
    const [expandRegistos, setExpandRegistos] = useState(true);

    // Draft / Rascunho
    const [draftId, setDraftId] = useState<string | null>(null);
    const [savingDraft, setSavingDraft] = useState(false);
    const [showSaveConfirm, setShowSaveConfirm] = useState(false);
    const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
    const [draftLoaded, setDraftLoaded] = useState(false);

    // Mobile multi-select photo move (touch devices only)
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    const [selectedPhotos, setSelectedPhotos] = useState<Set<string>>(new Set());
    const [showMovePicker, setShowMovePicker] = useState(false);

    useEffect(() => {
        setIsTouchDevice(typeof window !== 'undefined' && navigator.maxTouchPoints > 0);
    }, []);

    const togglePhotoSelection = (key: string) => {
        setSelectedPhotos(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    };

    const clearSelection = () => { setSelectedPhotos(new Set()); setShowMovePicker(false); };

    // Helper: get file/preview/note for a given fieldKey and index
    const getPhotoData = (fieldKey: string, index: number): { file: File; preview: string; noteKey: string; note: string } | null => {
        const pn = photoNotes;
        if (fieldKey.startsWith('face_')) {
            const fk = fieldKey.replace('face_', '');
            const map: Record<string, { files: File[]; previews: string[] }> = { repouso: faceRepouso, sorrisoNatural: faceSorrisoNatural, sorrisoAlto: faceSorrisoAlto, '45': face45Esq, perfil: face45Dir };
            const s = map[fk]; if (!s || !s.files[index]) return null;
            const noteKey = `face_${fk}_${index}`;
            return { file: s.files[index], preview: s.previews[index], noteKey, note: pn[noteKey] || '' };
        }
        if (fieldKey.startsWith('closeup_')) {
            const ck = fieldKey.replace('closeup_', '');
            const map: Record<string, { files: File[]; previews: string[] }> = { 'cu-repouso': closeupRepouso, 'cu-sorrisoNatural': closeupSorrisoNatural, 'cu-sorrisoAlto': closeupSorrisoAlto, 'cu-retractores': closeup45Dir, 'cu-45': closeup45Esq };
            const s = map[ck]; if (!s || !s.files[index]) return null;
            const noteKey = `closeup_${ck}_${index}`;
            return { file: s.files[index], preview: s.previews[index], noteKey, note: pn[noteKey] || '' };
        }
        const flatMap: Record<string, { files: File[]; previews: string[]; prefix: string }> = {
            escalaCor: { files: colorScalePhotos, previews: colorScalePreviews, prefix: 'escalaCor' },
            polarizada: { files: polarizedPhotos, previews: polarizedPreviews, prefix: 'polarizada' },
            intraoralSup: { files: intraoralSupPhotos, previews: intraoralSupPreviews, prefix: 'intraoralSup' },
            intraoralInf: { files: intraoralInfPhotos, previews: intraoralInfPreviews, prefix: 'intraoralInf' },
            foto45: { files: photos45, previews: previews45, prefix: 'foto45' },
            outros: { files: photosOutros, previews: previewsOutros, prefix: 'outros' },
        };
        const fm = flatMap[fieldKey]; if (!fm || !fm.files[index]) return null;
        const noteKey = `${fm.prefix}_${index}`;
        return { file: fm.files[index], preview: fm.previews[index], noteKey, note: pn[noteKey] || '' };
    };

    // Helper: add photo to a destination field
    const addPhotoToField = (destKey: string, file: File, preview: string, note: string) => {
        if (destKey.startsWith('face_')) {
            const fk = destKey.replace('face_', '');
            const setterMap: Record<string, React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>> = { repouso: setFaceRepouso, sorrisoNatural: setFaceSorrisoNatural, sorrisoAlto: setFaceSorrisoAlto, '45': setFace45Esq, perfil: setFace45Dir };
            const setter = setterMap[fk]; if (setter) setter(prev => ({ files: [...prev.files, file], previews: [...prev.previews, preview] }));
            if (note) { const countMap: Record<string, { files: File[]; previews: string[] }> = { repouso: faceRepouso, sorrisoNatural: faceSorrisoNatural, sorrisoAlto: faceSorrisoAlto, '45': face45Esq, perfil: face45Dir }; const cnt = countMap[fk]?.files.length || 0; setPhotoNotes(prev => ({ ...prev, [`face_${fk}_${cnt}`]: note })); }
            return;
        }
        if (destKey.startsWith('closeup_')) {
            const ck = destKey.replace('closeup_', '');
            const setterMap: Record<string, React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>> = { 'cu-repouso': setCloseupRepouso, 'cu-sorrisoNatural': setCloseupSorrisoNatural, 'cu-sorrisoAlto': setCloseupSorrisoAlto, 'cu-retractores': setCloseup45Dir, 'cu-45': setCloseup45Esq };
            const setter = setterMap[ck]; if (setter) setter(prev => ({ files: [...prev.files, file], previews: [...prev.previews, preview] }));
            if (note) { const countMap: Record<string, { files: File[]; previews: string[] }> = { 'cu-repouso': closeupRepouso, 'cu-sorrisoNatural': closeupSorrisoNatural, 'cu-sorrisoAlto': closeupSorrisoAlto, 'cu-retractores': closeup45Dir, 'cu-45': closeup45Esq }; const cnt = countMap[ck]?.files.length || 0; setPhotoNotes(prev => ({ ...prev, [`closeup_${ck}_${cnt}`]: note })); }
            return;
        }
        const flatSetters: Record<string, { setFiles: (fn: (p: File[]) => File[]) => void; setPreviews: (fn: (p: string[]) => string[]) => void; prefix: string; count: number }> = {
            escalaCor: { setFiles: fn => setColorScalePhotos(fn), setPreviews: fn => setColorScalePreviews(fn), prefix: 'escalaCor', count: colorScalePhotos.length },
            polarizada: { setFiles: fn => setPolarizedPhotos(fn), setPreviews: fn => setPolarizedPreviews(fn), prefix: 'polarizada', count: polarizedPhotos.length },
            intraoralSup: { setFiles: fn => setIntraoralSupPhotos(fn), setPreviews: fn => setIntraoralSupPreviews(fn), prefix: 'intraoralSup', count: intraoralSupPhotos.length },
            intraoralInf: { setFiles: fn => setIntraoralInfPhotos(fn), setPreviews: fn => setIntraoralInfPreviews(fn), prefix: 'intraoralInf', count: intraoralInfPhotos.length },
            foto45: { setFiles: fn => setphotos45(fn), setPreviews: fn => setpreviews45(fn), prefix: 'foto45', count: photos45.length },
            outros: { setFiles: fn => setPhotosOutros(fn), setPreviews: fn => setPreviewsOutros(fn), prefix: 'outros', count: photosOutros.length },
        };
        const fs = flatSetters[destKey]; if (!fs) return;
        fs.setFiles(p => [...p, file]); fs.setPreviews(p => [...p, preview]);
        if (note) setPhotoNotes(prev => ({ ...prev, [`${fs.prefix}_${fs.count}`]: note }));
    };

    // Helper: remove photo from source field by index
    const removePhotoFromField = (fieldKey: string, index: number) => {
        if (fieldKey.startsWith('face_')) {
            const fk = fieldKey.replace('face_', '');
            const setterMap: Record<string, React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>> = { repouso: setFaceRepouso, sorrisoNatural: setFaceSorrisoNatural, sorrisoAlto: setFaceSorrisoAlto, '45': setFace45Esq, perfil: setFace45Dir };
            const setter = setterMap[fk]; if (setter) setter(prev => ({ files: prev.files.filter((_, i) => i !== index), previews: prev.previews.filter((_, i) => i !== index) }));
            setPhotoNotes(prev => { const next = { ...prev }; delete next[`face_${fk}_${index}`]; return next; });
            return;
        }
        if (fieldKey.startsWith('closeup_')) {
            const ck = fieldKey.replace('closeup_', '');
            const setterMap: Record<string, React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>> = { 'cu-repouso': setCloseupRepouso, 'cu-sorrisoNatural': setCloseupSorrisoNatural, 'cu-sorrisoAlto': setCloseupSorrisoAlto, 'cu-retractores': setCloseup45Dir, 'cu-45': setCloseup45Esq };
            const setter = setterMap[ck]; if (setter) setter(prev => ({ files: prev.files.filter((_, i) => i !== index), previews: prev.previews.filter((_, i) => i !== index) }));
            setPhotoNotes(prev => { const next = { ...prev }; delete next[`closeup_${ck}_${index}`]; return next; });
            return;
        }
        const flatSetters: Record<string, { setFiles: (fn: (p: File[]) => File[]) => void; setPreviews: (fn: (p: string[]) => string[]) => void; noteKey: string }> = {
            escalaCor: { setFiles: fn => setColorScalePhotos(fn), setPreviews: fn => setColorScalePreviews(fn), noteKey: `escalaCor_${index}` },
            polarizada: { setFiles: fn => setPolarizedPhotos(fn), setPreviews: fn => setPolarizedPreviews(fn), noteKey: `polarizada_${index}` },
            intraoralSup: { setFiles: fn => setIntraoralSupPhotos(fn), setPreviews: fn => setIntraoralSupPreviews(fn), noteKey: `intraoralSup_${index}` },
            intraoralInf: { setFiles: fn => setIntraoralInfPhotos(fn), setPreviews: fn => setIntraoralInfPreviews(fn), noteKey: `intraoralInf_${index}` },
            foto45: { setFiles: fn => setphotos45(fn), setPreviews: fn => setpreviews45(fn), noteKey: `foto45_${index}` },
            outros: { setFiles: fn => setPhotosOutros(fn), setPreviews: fn => setPreviewsOutros(fn), noteKey: `outros_${index}` },
        };
        const fs = flatSetters[fieldKey]; if (!fs) return;
        fs.setFiles(p => p.filter((_, i) => i !== index)); fs.setPreviews(p => p.filter((_, i) => i !== index));
        setPhotoNotes(prev => { const next = { ...prev }; delete next[fs.noteKey]; return next; });
    };

    // Move all selected photos to destination
    const moveSelectedPhotos = (destKey: string) => {
        // Group by source field and sort indices descending for safe removal
        const grouped: Record<string, number[]> = {};
        selectedPhotos.forEach(sel => {
            const [fk, idx] = [sel.substring(0, sel.lastIndexOf(':')), parseInt(sel.substring(sel.lastIndexOf(':') + 1))];
            if (!grouped[fk]) grouped[fk] = [];
            grouped[fk].push(idx);
        });

        // Collect data first, then remove (descending order)
        const toMove: { file: File; preview: string; note: string }[] = [];
        for (const [srcKey, indices] of Object.entries(grouped)) {
            indices.sort((a, b) => a - b); // ascending for data collection
            for (const idx of indices) {
                const data = getPhotoData(srcKey, idx);
                if (data) toMove.push({ file: data.file, preview: data.preview, note: data.note });
            }
            // Remove descending to keep indices valid
            const descIndices = [...indices].sort((a, b) => b - a);
            for (const idx of descIndices) removePhotoFromField(srcKey, idx);
        }

        // Add all to destination
        for (const item of toMove) addPhotoToField(destKey, item.file, item.preview, item.note);
        clearSelection();
    };

    // Photo fields map for the destination picker
    const photoFieldsMap = [
        { key: 'face_repouso', label: 'Repouso', group: 'Retrato' },
        { key: 'face_sorrisoNatural', label: 'Sorriso Natural', group: 'Retrato' },
        { key: 'face_sorrisoAlto', label: 'Sorriso Máximo', group: 'Retrato' },
        { key: 'face_45', label: '45º', group: 'Retrato' },
        { key: 'face_perfil', label: 'Perfil', group: 'Retrato' },
        { key: 'closeup_cu-repouso', label: 'Repouso', group: 'Close-up' },
        { key: 'closeup_cu-sorrisoNatural', label: 'Sorriso Natural', group: 'Close-up' },
        { key: 'closeup_cu-sorrisoAlto', label: 'Sorriso Máximo', group: 'Close-up' },
        { key: 'closeup_cu-retractores', label: 'Retractores Frontal', group: 'Close-up' },
        { key: 'closeup_cu-45', label: 'Retractores 45º', group: 'Close-up' },
        { key: 'escalaCor', label: 'Escala de Cor', group: 'Escala de Cor' },
        { key: 'polarizada', label: 'Polarizadas', group: 'Polarizadas' },
        { key: 'intraoralSup', label: 'Intraoral Superior', group: 'Vista Oclusal' },
        { key: 'intraoralInf', label: 'Intraoral Inferior', group: 'Vista Oclusal' },
        { key: 'foto45', label: '45º', group: '45º' },
        { key: 'outros', label: 'Outros', group: 'Outros' },
    ];

    const [showDoctorPicker, setShowDoctorPicker] = useState(false);
    const [showTeamPicker, setShowTeamPicker] = useState(false);
    const doctorPickerRef = useRef<HTMLDivElement>(null);
    const teamPickerRef = useRef<HTMLDivElement>(null);

    // Colaboradores da clínica
    const [clinicTeam, setClinicTeam] = useState<{ user_id: string; full_name: string; phone: string | null; role: string | null }[]>([]);

    useEffect(() => {
        async function loadDropdowns() {
            try {
                const [wt, docs, cls, tc] = await Promise.all([
                    patientsService.getWorkTypes(),
                    patientsService.getDoctors(),
                    patientsService.getClinics(),
                    patientsService.getToothColors(),
                ]);
                setWorkTypes(wt);
                setDoctors(docs);
                setClinics(cls);
                setToothColors(tc);

                // Calcular próximo número de plano (por paciente)
                const { count } = await supabase
                    .from('treatment_plans')
                    .select('id', { count: 'exact', head: true })
                    .eq('patient_id', patientId);
                setNextPlanNumber((count || 0) + 1);

                // Verificar se existe rascunho para este paciente
                try {
                    const draft = await patientsService.getDraft(patientId);
                    if (draft) {
                        const d = draft.draft_data as Record<string, unknown>;
                        if (d.nome) setNome(d.nome as string);
                        if (d.medicoId) setMedicoId(d.medicoId as string);
                        if (d.clinicaId) setClinicaId(d.clinicaId as string);
                        if (d.metodo) setMetodo(d.metodo as string);
                        if (d.workTypeSelections) setWorkTypeSelections(d.workTypeSelections as WorkTypeSelection[]);
                        if (d.selectedColorIds) setSelectedColorIds(d.selectedColorIds as string[]);
                        if (d.photoNotes) setPhotoNotes(d.photoNotes as Record<string, string>);
                        if (d.fieldNotes) setFieldNotes(d.fieldNotes as Record<string, string[]>);
                        if (d.photoSetup) setPhotoSetup(d.photoSetup as 'basic' | 'complete');
                        setDraftId(draft.id);
                        setDraftLoaded(true);
                        console.log('[Draft] Rascunho restaurado para paciente', patientId);
                    }
                } catch (draftErr) {
                    console.warn('[Draft] Erro ao carregar rascunho:', draftErr);
                }
            } catch (err) {
                console.error('Erro ao carregar dropdowns:', err);
            } finally {
                setLoadingDropdowns(false);
            }
        }
        loadDropdowns();
    }, []);

    // Carregar colaboradores quando a clínica muda
    useEffect(() => {
        async function loadClinicTeam() {
            if (!clinicaId) { setClinicTeam([]); return; }
            try {
                const { data, error } = await supabase
                    .from('user_clinic_access')
                    .select('user_id, user_profiles!inner(full_name, phone, app_role)')
                    .eq('clinic_id', clinicaId);
                if (!error && data) {
                    setClinicTeam(data.map((d: any) => ({
                        user_id: d.user_id,
                        full_name: d.user_profiles.full_name,
                        phone: d.user_profiles.phone,
                        role: d.user_profiles.app_role,
                    })).filter((d: any) => d.role !== 'doctor'));
                }
            } catch { /* ignore */ }
        }
        loadClinicTeam();
    }, [clinicaId]);

    // Click outside to close pickers
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (showDoctorPicker && doctorPickerRef.current && !doctorPickerRef.current.contains(e.target as Node)) {
                setShowDoctorPicker(false);
            }
            if (showTeamPicker && teamPickerRef.current && !teamPickerRef.current.contains(e.target as Node)) {
                setShowTeamPicker(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showDoctorPicker, showTeamPicker]);

    // Close work type dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => { if (wtDropdownRef.current && !wtDropdownRef.current.contains(e.target as Node)) setShowWtDropdown(false); };
        if (showWtDropdown) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showWtDropdown]);

    // Close color dropdown on outside click
    useEffect(() => {
        const h = (e: MouseEvent) => { if (colorDropdownRef.current && !colorDropdownRef.current.contains(e.target as Node)) setShowColorDropdown(false); };
        if (showColorDropdown) document.addEventListener('mousedown', h);
        return () => document.removeEventListener('mousedown', h);
    }, [showColorDropdown]);

    // Cleanup preview URLs
    useEffect(() => {
        return () => { colorScalePreviews.forEach(u => URL.revokeObjectURL(u)); };
    }, []);

    // ── Odontogram teeth derived from workTypeSelections ──
    const odontogramTeeth = useMemo(() => {
        const teeth: { tooth_number: number; work_type_id: string | null }[] = [];
        workTypeSelections.forEach(sel => {
            sel.assigned_teeth.forEach(t => teeth.push({ tooth_number: t, work_type_id: sel.work_type_id }));
        });
        return teeth;
    }, [workTypeSelections]);

    // Total de dentes atribuídos
    const totalAssignedTeeth = odontogramTeeth.length;

    // Pendentes por tipo de trabalho — para o Odontograma
    const pendingAssignments = useMemo(() =>
        workTypeSelections.map(sel => ({
            work_type_id: sel.work_type_id,
            total: sel.quantity,
            assigned: sel.assigned_teeth.length,
        })),
        [workTypeSelections]);

    // ── Sync: Odontogram → WorkTypeSelections ──
    const handleOdontogramChange = useCallback((newTeeth: { tooth_number: number; work_type_id: string | null }[]) => {
        setWorkTypeSelections(prev => {
            // Agrupar novos dentes por work_type_id
            const teethByWt = new Map<string, number[]>();
            newTeeth.forEach(t => {
                if (t.work_type_id) {
                    const list = teethByWt.get(t.work_type_id) || [];
                    list.push(t.tooth_number);
                    teethByWt.set(t.work_type_id, list);
                }
            });

            // Começar com cópia das selecções existentes
            const updated = prev.map(sel => {
                const newAssigned = teethByWt.get(sel.work_type_id) || [];
                teethByWt.delete(sel.work_type_id);
                return {
                    ...sel,
                    assigned_teeth: newAssigned,
                    // Se mais dentes que quantidade, aumentar quantidade
                    quantity: Math.max(sel.quantity, newAssigned.length),
                };
            });

            // Tipos novos que vieram do odontograma (não existiam na lista)
            teethByWt.forEach((teeth, wtId) => {
                updated.push({
                    work_type_id: wtId,
                    quantity: teeth.length,
                    assigned_teeth: teeth,
                });
            });

            return updated;
        });
    }, []);

    // ── Adicionar tipo via dropdown ──
    const addWorkType = useCallback((wtId: string) => {
        setWorkTypeSelections(prev => {
            if (prev.some(s => s.work_type_id === wtId)) return prev;
            return [...prev, { work_type_id: wtId, quantity: 1, assigned_teeth: [] }];
        });
        setShowWtDropdown(false);
    }, []);

    // ── Remover tipo ──
    const removeWorkType = useCallback((wtId: string) => {
        setWorkTypeSelections(prev => prev.filter(s => s.work_type_id !== wtId));
    }, []);

    // ── Ajustar quantidade ──
    const adjustQty = useCallback((wtId: string, delta: number) => {
        setWorkTypeSelections(prev => prev.map(sel => {
            if (sel.work_type_id !== wtId) return sel;
            const newQty = sel.quantity + delta;
            // Mínimo = número de dentes atribuídos (não pode ir abaixo)
            if (newQty < Math.max(1, sel.assigned_teeth.length)) return sel;
            return { ...sel, quantity: newQty };
        }));
    }, []);

    // ── Guardar Rascunho ──
    const handleSaveDraft = async () => {
        try {
            setSavingDraft(true);
            const draftData = {
                nome,
                medicoId,
                clinicaId,
                metodo,
                workTypeSelections,
                selectedColorIds,
                photoNotes,
                fieldNotes,
                photoSetup,
            };
            const saved = await patientsService.saveDraft(patientId, draftData);
            setDraftId(saved.id);
            setShowSaveConfirm(false);
            onClose();
        } catch (err) {
            console.error('Erro ao guardar rascunho:', err);
            setError('Erro ao guardar rascunho.');
        } finally {
            setSavingDraft(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Auto-gerar nome a partir dos tipos de trabalho se vazio
        const finalNome = nome.trim() || workTypeSelections
            .map(sel => workTypes.find(wt => wt.id === sel.work_type_id)?.nome)
            .filter(Boolean)
            .join(' + ') || 'Plano sem nome';
        if (workTypeSelections.length === 0) { setError('Selecione pelo menos um tipo de trabalho'); return; }
        if (!medicoId) { setError('Selecione um médico'); return; }
        if (!clinicaId) { setError('Selecione uma clínica'); return; }

        try {
            setSubmitting(true);
            // Criar plano com primeiro tipo (compatibilidade DB)
            const plan = await patientsService.createTreatmentPlan({
                patient_id: patientId,
                nome: finalNome,
                tipo_trabalho_id: workTypeSelections[0].work_type_id,
                medico_id: medicoId,
                clinica_id: clinicaId,
                metodo: metodo.trim() || undefined,
                escala_cor_id: selectedColorIds.length > 0 ? selectedColorIds[0] : undefined,
            });

            // Guardar todos os work types na tabela plan_work_types
            if (plan?.id) {
                const rows = workTypeSelections.map(sel => ({
                    plan_id: plan.id,
                    work_type_id: sel.work_type_id,
                    quantity: sel.quantity,
                    assigned_teeth: sel.assigned_teeth,
                }));
                await supabase.from('plan_work_types').insert(rows);

                // Upload fotos de escala de cor (se houver)
                for (const photo of colorScalePhotos) {
                    try {
                        await patientsService.uploadFile({
                            file: photo,
                            patient_id: patientId,
                            plan_id: plan.id,
                        });
                    } catch (err) {
                        console.error('Erro ao enviar foto de escala:', err);
                    }
                }
            }

            // Eliminar rascunho se existia
            if (draftId) {
                try { await patientsService.deleteDraft(patientId); } catch { /* ignore */ }
            }

            setShowFinalizeConfirm(false);
            window.dispatchEvent(new Event('patient-updated'));
            onCreated();
        } catch (err) {
            console.error('Erro ao criar plano:', err);
            setError('Erro ao criar plano. Tente novamente.');
        } finally {
            setSubmitting(false);
        }
    };



    // Agrupar work types por categoria
    const groupedWorkTypes = workTypes.reduce<Record<string, typeof workTypes>>((acc, wt) => {
        const cat = wt.categoria || 'Outros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(wt);
        return acc;
    }, {});

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

                {/* Modal */}
                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* ============ HERO HEADER ============ */}
                    <div className="bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] px-5 sm:px-8 pt-5 pb-5 relative rounded-t-2xl">
                        {/* Subtle pattern overlay */}
                        <div className="absolute inset-0 rounded-t-2xl opacity-5 pointer-events-none" style={{
                            backgroundImage: 'radial-gradient(circle at 25% 50%, rgba(245,158,11,0.3) 0%, transparent 50%), radial-gradient(circle at 75% 50%, rgba(245,158,11,0.15) 0%, transparent 50%)'
                        }} />

                        <div className="relative z-10">
                            {/* Top row: Badge + Close */}
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-bold text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20 tracking-wide">
                                    {nextPlanNumber !== null ? `PT-${String(nextPlanNumber).padStart(4, '0')}` : '...'}
                                </span>
                                <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Title + Name input */}
                            <div className="flex items-center gap-4 mb-3">
                                <div className="h-12 w-12 rounded-full bg-white/5 ring-2 ring-primary/30 flex items-center justify-center shrink-0">
                                    <ClipboardList className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h2 className="text-lg font-semibold text-white mb-1">Novo Plano de Tratamento</h2>
                                    <Input
                                        value={nome}
                                        onChange={(e) => setNome(e.target.value)}
                                        placeholder="Ex: Prótese Total Superior"
                                        className="h-8 text-sm bg-white/5 border-white/10 text-white placeholder:text-gray-500 focus:border-primary/50 focus:ring-primary/20"
                                        autoFocus
                                    />
                                </div>
                            </div>

                            {/* Clínica + Médicos + Equipa — inline style like PatientForm */}
                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-gray-500 text-xs">Clínica:</span>
                                    <select
                                        value={clinicaId}
                                        onChange={(e) => setClinicaId(e.target.value)}
                                        className="text-xs font-medium border-0 bg-transparent text-white focus:outline-none cursor-pointer [&>option]:text-black [&>option]:bg-white"
                                    >
                                        <option value="">Selecione...</option>
                                        {clinics.map(cl => (
                                            <option key={cl.id} value={cl.id}>
                                                {cl.commercial_name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="relative" ref={doctorPickerRef}>
                                    <button
                                        type="button"
                                        onClick={() => { setShowDoctorPicker(!showDoctorPicker); setShowTeamPicker(false); }}
                                        className="flex items-center gap-1.5 text-xs cursor-pointer hover:text-white transition-colors"
                                    >
                                        <span className="text-gray-500">Médicos:</span>
                                        <span className="font-medium text-white">
                                            {medicoId ? (
                                                <>
                                                    {doctors.find(d => d.user_id === medicoId)?.full_name || 'Selecionar'}
                                                    {team.length > 1 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/15 text-gray-300 font-medium ml-1">+{team.length - 1}</span>
                                                    )}
                                                </>
                                            ) : (
                                                <span className="text-gray-500">Selecionar...</span>
                                            )}
                                        </span>
                                        <ChevronDown className={cn("h-3 w-3 text-gray-500 transition-transform", showDoctorPicker && "rotate-180")} />
                                        <ChevronDown className={cn("h-3 w-3 text-gray-500 transition-transform", showDoctorPicker && "rotate-180")} />

                                    </button>



                                    {showDoctorPicker && (

                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 z-50 py-1 max-h-48 overflow-y-auto min-w-[280px]">

                                            <div className="px-3 py-1.5 border-b border-gray-100">

                                                <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">MÃ©dicos do Caso</span>

                                            </div>

                                            {doctors.map(doc => {

                                                const isInTeam = team.some(t => t.doctor_id === doc.user_id);

                                                const isPrincipal = doc.user_id === medicoId;

                                                return (

                                                    <div

                                                        key={doc.user_id}

                                                        onClick={() => {

                                                            if (isInTeam && !isPrincipal) {

                                                                setTeam(prev => prev.filter(t => t.doctor_id !== doc.user_id));

                                                            } else if (!isInTeam) {

                                                                setTeam(prev => [...prev, { doctor_id: doc.user_id, full_name: doc.full_name }]);

                                                                if (!medicoId) setMedicoId(doc.user_id);

                                                            }

                                                        }}

                                                        className={cn(

                                                            "flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors group",

                                                            isInTeam ? "bg-primary/5" : "hover:bg-gray-50"

                                                        )}

                                                    >

                                                        <button

                                                            type="button"

                                                            onClick={(e) => e.stopPropagation()}

                                                            className={cn(

                                                                "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",

                                                                isInTeam ? "bg-primary border-primary text-white" : "border-gray-300 hover:border-primary/50",

                                                                isPrincipal && "cursor-default"

                                                            )}

                                                            disabled={isPrincipal}

                                                        >

                                                            {isInTeam && <Check className="h-2.5 w-2.5" />}

                                                        </button>

                                                        <Stethoscope className={cn("h-3 w-3 shrink-0", isInTeam ? "text-primary" : "text-gray-400")} />

                                                        <span className={cn("text-xs flex-1 truncate", isInTeam ? "text-gray-900 font-medium" : "text-gray-600")}>

                                                            {doc.full_name}

                                                        </span>

                                                        {isPrincipal ? (

                                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">Principal</span>

                                                        ) : isInTeam ? (

                                                            <button

                                                                type="button"

                                                                onClick={(e) => {

                                                                    e.stopPropagation();

                                                                    setMedicoId(doc.user_id);

                                                                }}

                                                                className="text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400 hover:bg-primary/10 hover:text-primary font-medium opacity-0 group-hover:opacity-100 transition-all shrink-0"

                                                            >

                                                                â˜… Tornar principal

                                                            </button>

                                                        ) : null}

                                                    </div>

                                                );

                                            })}

                                        </div>

                                    )}

                                </div>



                                {/* Equipa â€” inline */}

                                <div className="relative" ref={teamPickerRef}>

                                    <button

                                        type="button"

                                        onClick={() => { setShowTeamPicker(!showTeamPicker); setShowDoctorPicker(false); }}

                                        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-white transition-colors"

                                    >

                                        <Users className="h-3 w-3" />

                                        <span>Equipa</span>

                                        {(team.length + clinicTeam.length) > 0 && (

                                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 text-gray-400 font-medium">{team.length + clinicTeam.length}</span>

                                        )}

                                        <ChevronDown className={cn("h-3 w-3 transition-transform", showTeamPicker && "rotate-180")} />

                                    </button>

                                    {showTeamPicker && (

                                        <div className="absolute top-full left-0 mt-1 bg-white rounded-xl shadow-2xl z-50 p-3 min-w-[300px] max-w-sm border border-gray-200">

                                            {team.length > 0 && (

                                                <>

                                                    <div className="px-1 pb-1.5 mb-1.5 border-b border-gray-100">

                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">MÃ©dicos</span>

                                                    </div>

                                                    <div className="space-y-1 mb-3">

                                                        {team.map(doc => {

                                                            const isPrincipal = doc.doctor_id === medicoId;

                                                            const docProfile = doctors.find(d => d.user_id === doc.doctor_id);

                                                            return (

                                                                <div key={doc.doctor_id} className={cn(

                                                                    "flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs",

                                                                    isPrincipal ? "bg-primary/5" : "hover:bg-gray-50"

                                                                )}>

                                                                    <Stethoscope className={cn("h-3 w-3 shrink-0", isPrincipal ? "text-primary" : "text-gray-400")} />

                                                                    <div className="flex-1 min-w-0">

                                                                        <span className={cn("font-medium block truncate text-[11px]", isPrincipal ? "text-primary" : "text-gray-800")}>

                                                                            {doc.full_name}

                                                                        </span>

                                                                        {(docProfile as any)?.phone && (

                                                                            <div className="flex items-center gap-1 mt-0.5">

                                                                                <Phone className="h-2.5 w-2.5 text-gray-400" />

                                                                                <span className="text-[10px] text-gray-500 font-mono">{(docProfile as any).phone}</span>

                                                                                <button type="button" onClick={() => navigator.clipboard.writeText((docProfile as any).phone)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Copiar telefone">

                                                                                    <Copy className="h-2.5 w-2.5" />

                                                                                </button>

                                                                            </div>

                                                                        )}

                                                                    </div>

                                                                    {isPrincipal && (

                                                                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold shrink-0">Principal</span>

                                                                    )}

                                                                </div>

                                                            );

                                                        })}

                                                    </div>

                                                </>

                                            )}

                                            {clinicTeam.length > 0 && (

                                                <>

                                                    <div className="px-1 pb-1.5 mb-1.5 border-b border-gray-100">

                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Colaboradores</span>

                                                    </div>

                                                    <div className="space-y-1">

                                                        {clinicTeam.map(member => (

                                                            <div key={member.user_id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs hover:bg-gray-50">

                                                                <Users className="h-3 w-3 shrink-0 text-gray-400" />

                                                                <div className="flex-1 min-w-0">

                                                                    <span className="font-medium block truncate text-[11px] text-gray-800">{member.full_name}</span>

                                                                    {member.phone && (

                                                                        <div className="flex items-center gap-1 mt-0.5">

                                                                            <Phone className="h-2.5 w-2.5 text-gray-400" />

                                                                            <span className="text-[10px] text-gray-500 font-mono">{member.phone}</span>

                                                                            <button type="button" onClick={() => navigator.clipboard.writeText(member.phone!)} className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors" title="Copiar telefone">

                                                                                <Copy className="h-2.5 w-2.5" />

                                                                            </button>

                                                                        </div>

                                                                    )}

                                                                </div>

                                                            </div>

                                                        ))}

                                                    </div>

                                                </>

                                            )}

                                            {team.length === 0 && clinicTeam.length === 0 && (

                                                <p className="text-[10px] text-gray-400 italic">Nenhum membro na equipa</p>

                                            )}

                                        </div>

                                    )}

                                </div>

                            </div>

                        </div>

                    </div>



                    {/* Form */}

                    {loadingDropdowns ? (

                        <div className="flex items-center justify-center py-16">

                            <Loader2 className="h-6 w-6 animate-spin text-primary" />

                        </div>

                    ) : (

                        <form onSubmit={handleSubmit} className="flex-1 min-h-0 flex flex-col">

                            <div className="p-6 space-y-5 overflow-y-auto flex-1 min-h-0">



                                {/* â”€â”€ Bloco InformaÃ§Ã£o TÃ©cnica â”€â”€ */}

                                <div className="bg-gray-50/50 rounded-xl border border-gray-200 overflow-hidden">
                                    {/* Header do bloco */}
                                    <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-200/60">
                                        <ClipboardList className="h-3.5 w-3.5 text-gray-400" />
                                        <span className="text-[10px] uppercase tracking-widest font-semibold text-gray-400">
                                            Informação Técnica
                                        </span>
                                        {workTypeSelections.length > 0 && (
                                            <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-semibold ml-auto">
                                                {workTypeSelections.reduce((a, s) => a + s.quantity, 0)} trabalho{workTypeSelections.reduce((a, s) => a + s.quantity, 0) !== 1 ? 's' : ''}
                                            </span>
                                        )}
                                    </div>

                                    {/* Conteúdo */}
                                    <div className="p-4 space-y-3">
                                        {/* Linha: Dropdown + Odontograma */}
                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {/* Dropdown multi-select */}
                                            <div className="relative" ref={wtDropdownRef}>
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                    <Layers className="h-3 w-3" />
                                                    Tipo de Trabalho *
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowWtDropdown(!showWtDropdown)}
                                                    className="mt-1.5 w-full h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
                                                >
                                                    <span className="text-gray-400 text-xs">Adicionar tipo de trabalho...</span>
                                                    <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform", showWtDropdown && "rotate-180")} />
                                                </button>

                                                {showWtDropdown && (
                                                    <div className="absolute z-30 left-0 right-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 py-1 max-h-40 overflow-y-auto">
                                                        {Object.entries(groupedWorkTypes).map(([cat, types]) => {
                                                            const available = types.filter(wt => !workTypeSelections.some(s => s.work_type_id === wt.id));
                                                            if (available.length === 0) return null;
                                                            return (
                                                                <div key={cat}>
                                                                    <div className="px-3 py-1.5 border-b border-gray-100">
                                                                        <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{cat}</span>
                                                                    </div>
                                                                    {available.map(wt => (
                                                                        <div
                                                                            key={wt.id}
                                                                            onClick={() => addWorkType(wt.id)}
                                                                            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt.cor || '#6b7280' }} />
                                                                            <span className="text-xs text-gray-700">{wt.nome}</span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            );
                                                        })}
                                                        {workTypes.length > 0 && workTypes.every(wt => workTypeSelections.some(s => s.work_type_id === wt.id)) && (
                                                            <p className="text-[10px] text-gray-400 text-center py-3">Todos os tipos já foram adicionados</p>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Odontograma */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                    🦷 Odontograma
                                                </label>
                                                <button
                                                    type="button"
                                                    onClick={() => setShowOdontogram(true)}
                                                    className={cn(
                                                        "mt-1.5 w-full h-9 rounded-md border px-3 text-sm transition-all flex items-center gap-2 justify-center",
                                                        totalAssignedTeeth > 0
                                                            ? "border-primary/30 bg-primary/5 text-primary hover:bg-primary/10"
                                                            : "border-dashed border-gray-300 bg-white text-gray-400 hover:border-primary/40 hover:text-primary hover:bg-primary/5"
                                                    )}
                                                >
                                                    <span className="text-xs font-medium">
                                                        {totalAssignedTeeth > 0
                                                            ? `${totalAssignedTeeth} dente${totalAssignedTeeth !== 1 ? 's' : ''} atribuído${totalAssignedTeeth !== 1 ? 's' : ''}`
                                                            : 'Configurar dentes'
                                                        }
                                                    </span>
                                                </button>
                                            </div>

                                            {/* Método */}
                                            <div>
                                                <label className="text-xs font-medium text-gray-500 uppercase tracking-wider flex items-center gap-1">
                                                    <ClipboardList className="h-3 w-3" />
                                                    Método
                                                </label>
                                                <Input
                                                    value={metodo}
                                                    onChange={e => setMetodo(e.target.value)}
                                                    placeholder="Ex: CAD/CAM..."
                                                    className="mt-1.5 h-9 text-sm"
                                                />
                                            </div>
                                        </div>

                                        {/* Lista de tipos seleccionados — logo após o dropdown */}
                                        {workTypeSelections.length > 0 && (
                                            <div className="space-y-1.5">
                                                {workTypeSelections.map(sel => {
                                                    const wt = workTypes.find(w => w.id === sel.work_type_id);
                                                    if (!wt) return null;
                                                    const unassigned = sel.quantity - sel.assigned_teeth.length;
                                                    return (
                                                        <div key={sel.work_type_id} className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-white group">
                                                            {/* Cor + Nome */}
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: wt.cor || '#6b7280' }} />
                                                            <span className="text-xs font-medium text-gray-700 min-w-0 truncate">{wt.nome}</span>

                                                            {/* Qty controls */}
                                                            <div className="flex items-center gap-1 ml-auto shrink-0">
                                                                <button type="button" onClick={() => adjustQty(sel.work_type_id, -1)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                                                    disabled={sel.quantity <= Math.max(1, sel.assigned_teeth.length)}
                                                                >
                                                                    <Minus className="w-3 h-3" />
                                                                </button>
                                                                <span className="text-xs font-bold text-gray-700 w-5 text-center">{sel.quantity}</span>
                                                                <button type="button" onClick={() => adjustQty(sel.work_type_id, 1)}
                                                                    className="w-5 h-5 rounded flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3" />
                                                                </button>
                                                            </div>

                                                            {/* Separator */}
                                                            <div className="w-px h-4 bg-gray-200 shrink-0" />

                                                            {/* Dentes atribuídos */}
                                                            <div className="flex items-center gap-1 flex-wrap min-w-0 max-w-[180px]">
                                                                {sel.assigned_teeth.sort((a, b) => a - b).map(t => (
                                                                    <span key={t} className="text-[9px] font-mono bg-primary/10 text-primary px-1 py-0.5 rounded font-medium">#{t}</span>
                                                                ))}
                                                                {unassigned > 0 && (
                                                                    <span className="text-[9px] text-gray-400 italic">
                                                                        {unassigned}× por atribuir
                                                                    </span>
                                                                )}
                                                                {sel.assigned_teeth.length === 0 && unassigned === 0 && (
                                                                    <span className="text-[9px] text-gray-400 italic">por atribuir</span>
                                                                )}
                                                            </div>

                                                            {/* Remove */}
                                                            <button type="button" onClick={() => removeWorkType(sel.work_type_id)}
                                                                className="w-5 h-5 rounded flex items-center justify-center text-gray-300 hover:bg-red-50 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}



                                        {/* ── Sub-secção: Escala de Cor ── */}
                                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/30 p-3 space-y-2.5">
                                            <button type="button" onClick={() => setExpandEscalaCor(prev => !prev)} className="flex items-center gap-2 w-full cursor-pointer">
                                                <Palette className="h-3.5 w-3.5 text-amber-500" />
                                                <span className="text-[10px] uppercase tracking-widest font-semibold text-amber-600">
                                                    Escala de Cor
                                                </span>
                                                <ChevronDown className={cn("h-3.5 w-3.5 text-amber-400 transition-transform", expandEscalaCor && "rotate-180")} />
                                            </button>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ display: expandEscalaCor ? undefined : 'none' }}>
                                                {/* Dropdown Escala de Cor — 2 níveis + multi-select */}
                                                <div className="relative" ref={colorDropdownRef}>
                                                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                        Cor
                                                    </label>
                                                    <button
                                                        type="button"
                                                        onClick={() => { setShowColorDropdown(!showColorDropdown); if (showColorDropdown) setActiveColorGroup(null); }}
                                                        className="mt-1 w-full min-h-[36px] rounded-md border border-gray-200 bg-white px-3 py-1.5 text-sm text-left flex items-center justify-between hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 transition-colors"
                                                    >
                                                        {selectedColorIds.length > 0 ? (
                                                            <div className="flex flex-wrap gap-1">
                                                                {selectedColorIds.map(cid => {
                                                                    const c = toothColors.find(tc => tc.id === cid);
                                                                    return c ? (
                                                                        <span key={cid} className="inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full font-medium">
                                                                            {c.codigo}
                                                                            <button type="button" onClick={e => { e.stopPropagation(); setSelectedColorIds(prev => prev.filter(id => id !== cid)); }} className="hover:text-red-500">
                                                                                <X className="h-2.5 w-2.5" />
                                                                            </button>
                                                                        </span>
                                                                    ) : null;
                                                                })}
                                                            </div>
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">Seleccionar cor...</span>
                                                        )}
                                                        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform shrink-0 ml-1", showColorDropdown && "rotate-180")} />
                                                    </button>

                                                    {showColorDropdown && (() => {
                                                        /* Mapeamento grupo DB → escala real */
                                                        const SCALE_MAP: Record<string, string> = {
                                                            'A': 'VITA Classical', 'B': 'VITA Classical', 'C': 'VITA Classical', 'D': 'VITA Classical', 'Bleach': 'VITA Classical',
                                                            '3D-Master': 'VITA 3D-Master',
                                                            'Chromascop': 'Chromascop',
                                                        };
                                                        const scales = toothColors.reduce<Record<string, { grupos: Record<string, ToothColorItem[]>; total: number }>>((acc, tc) => {
                                                            const g = tc.grupo || 'Outros';
                                                            const scale = SCALE_MAP[g] || g;
                                                            if (!acc[scale]) acc[scale] = { grupos: {}, total: 0 };
                                                            if (!acc[scale].grupos[g]) acc[scale].grupos[g] = [];
                                                            acc[scale].grupos[g].push(tc);
                                                            acc[scale].total++;
                                                            return acc;
                                                        }, {});

                                                        return (
                                                            <div className="absolute z-20 mt-1 w-full bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
                                                                {!activeColorGroup ? (
                                                                    /* Nível 1: 3 Escalas reais */
                                                                    <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                                                                        <p className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1 pb-1">Escolha a escala</p>
                                                                        {Object.entries(scales).map(([scaleName, scaleData]) => {
                                                                            const allColors = Object.values(scaleData.grupos).flat();
                                                                            const selectedCount = allColors.filter(tc => selectedColorIds.includes(tc.id)).length;
                                                                            return (
                                                                                <button
                                                                                    key={scaleName}
                                                                                    type="button"
                                                                                    onClick={() => setActiveColorGroup(scaleName)}
                                                                                    className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-amber-50 transition-colors text-left"
                                                                                >
                                                                                    <Palette className="h-4 w-4 text-amber-400 shrink-0" />
                                                                                    <div className="flex-1 min-w-0">
                                                                                        <span className="text-xs font-semibold text-gray-700 block">{scaleName}</span>
                                                                                        <span className="text-[10px] text-gray-400">{scaleData.total} tonalidades</span>
                                                                                    </div>
                                                                                    {selectedCount > 0 && (
                                                                                        <span className="text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">{selectedCount}</span>
                                                                                    )}
                                                                                    <ChevronDown className="h-3 w-3 text-gray-300 -rotate-90" />
                                                                                </button>
                                                                            );
                                                                        })}
                                                                        {toothColors.length === 0 && (
                                                                            <p className="text-[10px] text-gray-400 text-center py-3">Sem cores no catálogo</p>
                                                                        )}
                                                                    </div>
                                                                ) : (
                                                                    /* Nível 2: Tonalidades dentro da escala seleccionada */
                                                                    <div>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setActiveColorGroup(null)}
                                                                            className="w-full flex items-center gap-2 px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors"
                                                                        >
                                                                            <ChevronDown className="h-3 w-3 text-gray-400 rotate-90" />
                                                                            <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{activeColorGroup}</span>
                                                                        </button>
                                                                        <div className="max-h-52 overflow-y-auto py-1">
                                                                            {scales[activeColorGroup] && Object.entries(scales[activeColorGroup].grupos).map(([subGrupo, colors]) => (
                                                                                <div key={subGrupo}>
                                                                                    {/* Sub-grupo header (ex: A, B, C, D dentro de VITA Classical) */}
                                                                                    {Object.keys(scales[activeColorGroup].grupos).length > 1 && (
                                                                                        <div className="px-3 py-1 border-b border-gray-50">
                                                                                            <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{subGrupo}</span>
                                                                                        </div>
                                                                                    )}
                                                                                    {colors.map(tc => {
                                                                                        const isSelected = selectedColorIds.includes(tc.id);
                                                                                        return (
                                                                                            <div
                                                                                                key={tc.id}
                                                                                                onClick={() => {
                                                                                                    setSelectedColorIds(prev =>
                                                                                                        isSelected ? prev.filter(id => id !== tc.id) : [...prev, tc.id]
                                                                                                    );
                                                                                                }}
                                                                                                className={cn(
                                                                                                    "flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-amber-50 transition-colors text-xs",
                                                                                                    isSelected && "bg-amber-50"
                                                                                                )}
                                                                                            >
                                                                                                <div className={cn(
                                                                                                    "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                                                                                                    isSelected ? "border-amber-500 bg-amber-500" : "border-gray-300"
                                                                                                )}>
                                                                                                    {isSelected && <Check className="h-2.5 w-2.5 text-white" />}
                                                                                                </div>
                                                                                                <span className="font-mono text-gray-500 w-8">{tc.codigo}</span>
                                                                                                <span className="text-gray-700">{tc.nome}</span>
                                                                                            </div>
                                                                                        );
                                                                                    })}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })()}
                                                </div>

                                                <div className="grid grid-cols-2 gap-2">
                                                    {/* Fotos — coluna esquerda */}
                                                    <div
                                                        className={`rounded-lg border-2 border-dashed p-1.5 transition-colors ${colorDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                        onDragOver={e => { e.preventDefault(); setColorDragOver(true); }}
                                                        onDragLeave={() => setColorDragOver(false)}
                                                        onDrop={e => { e.preventDefault(); setColorDragOver(false); if (dragSourceRef.current) { const src = dragSourceRef.current; const nk = `escalaCor_${colorScalePreviews.length}`; setColorScalePhotos(p => [...p, src.file]); setColorScalePreviews(p => [...p, src.preview]); if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; }); src.remove(); dragSourceRef.current = null; return; } const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setColorScalePhotos(prev => [...prev, ...files]); setColorScalePreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                    >
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Fotos</label>
                                                        <img src="/images/guides/escala-de-cor.png" alt="Guia Escala de Cor" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains('object-cover')) { img.classList.remove('object-cover', 'max-h-24'); img.classList.add('object-contain'); } else { img.classList.add('object-cover', 'max-h-24'); img.classList.remove('object-contain'); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        <div className="mt-1.5 grid grid-cols-2 gap-1">
                                                            <button type="button" onClick={() => colorFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro"><Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span></button>
                                                            <button type="button" onClick={() => { const colorSetter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (action) => { if (typeof action === 'function') { const virtualPrev = { files: colorScalePhotos, previews: colorScalePreviews }; const result = action(virtualPrev); setColorScalePhotos(result.files); setColorScalePreviews(result.previews); } }; setCameraTarget({ setter: colorSetter, key: 'escalaCor' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia"><Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span></button>
                                                            {!photosCollapsed && colorScalePreviews.length > 0 && (<div className="grid grid-cols-2 gap-1">{colorScalePreviews.map((url, i) => (<div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`escalaCor:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`} draggable={!isTouchDevice} onClick={isTouchDevice ? () => togglePhotoSelection(`escalaCor:${i}`) : undefined} onDragStart={!isTouchDevice ? (e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'internal-photo'); dragSourceRef.current = { file: colorScalePhotos[i], preview: url, note: photoNotes[`escalaCor_${i}`] || '', noteKey: `escalaCor_${i}`, remove: () => { URL.revokeObjectURL(url); setColorScalePhotos(p => p.filter((_, idx) => idx !== i)); setColorScalePreviews(p => p.filter((_, idx) => idx !== i)); } }; }) : undefined} onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}>{selectedPhotos.has(`escalaCor:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}<img src={url} alt={`Cor ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" /><button type="button" onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(url); setColorScalePhotos(p => p.filter((_, idx) => idx !== i)); setColorScalePreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button><input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`escalaCor_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`escalaCor_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" /></div>))}</div>)}
                                                            {photosCollapsed && colorScalePreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center">📷 {colorScalePreviews.length} foto(s)</p>)}
                                                            <input ref={colorFileRef} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setColorScalePhotos(p => [...p, ...nf]); setColorScalePreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            <input id="cam-native-escalaCor" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setColorScalePhotos(p => [...p, ...nf]); setColorScalePreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                        </div>
                                                        {colorScalePreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                        {(fieldNotes.escalaCor || []).map((note, ni) => (<div key={ni} className="flex items-center gap-1 mt-1"><input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev.escalaCor || [])]; arr[ni] = val; return { ...prev, escalaCor: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" /><button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev.escalaCor || [])]; arr.splice(ni, 1); return { ...prev, escalaCor: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button></div>))}
                                                        <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, escalaCor: [...(prev.escalaCor || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                    </div>
                                                    {/* Polarizadas — coluna direita */}
                                                    <div
                                                        className={`rounded-lg border-2 border-dashed p-1.5 transition-colors ${polarizedDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                        onDragOver={e => { e.preventDefault(); setPolarizedDragOver(true); }}
                                                        onDragLeave={() => setPolarizedDragOver(false)}
                                                        onDrop={e => { e.preventDefault(); setPolarizedDragOver(false); if (dragSourceRef.current) { const src = dragSourceRef.current; const nk = `polarizada_${polarizedPreviews.length}`; setPolarizedPhotos(p => [...p, src.file]); setPolarizedPreviews(p => [...p, src.preview]); if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; }); src.remove(); dragSourceRef.current = null; return; } const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setPolarizedPhotos(prev => [...prev, ...files]); setPolarizedPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                    >
                                                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Polarizadas</label>
                                                        <img src="/images/guides/escala-de-cor-polarizada.png" alt="Guia Polarizada" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 mt-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains('object-cover')) { img.classList.remove('object-cover', 'max-h-24'); img.classList.add('object-contain'); } else { img.classList.add('object-cover', 'max-h-24'); img.classList.remove('object-contain'); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                        <div className="mt-1.5 grid grid-cols-2 gap-1">
                                                            <button type="button" onClick={() => polarizedFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro"><Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span></button>
                                                            <button type="button" onClick={() => { const polSetter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (action) => { if (typeof action === 'function') { const virtualPrev = { files: polarizedPhotos, previews: polarizedPreviews }; const result = action(virtualPrev); setPolarizedPhotos(result.files); setPolarizedPreviews(result.previews); } }; setCameraTarget({ setter: polSetter, key: 'polarizada' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia"><Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span></button>
                                                            {!photosCollapsed && polarizedPreviews.length > 0 && (<div className="grid grid-cols-2 gap-1">{polarizedPreviews.map((url, i) => (<div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`polarizada:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`} draggable={!isTouchDevice} onClick={isTouchDevice ? () => togglePhotoSelection(`polarizada:${i}`) : undefined} onDragStart={!isTouchDevice ? (e => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', 'internal-photo'); dragSourceRef.current = { file: polarizedPhotos[i], preview: url, note: photoNotes[`polarizada_${i}`] || '', noteKey: `polarizada_${i}`, remove: () => { URL.revokeObjectURL(url); setPolarizedPhotos(p => p.filter((_, idx) => idx !== i)); setPolarizedPreviews(p => p.filter((_, idx) => idx !== i)); } }; }) : undefined} onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}>{selectedPhotos.has(`polarizada:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}<img src={url} alt={`Polarizada ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" /><button type="button" onClick={(e) => { e.stopPropagation(); URL.revokeObjectURL(url); setPolarizedPhotos(p => p.filter((_, idx) => idx !== i)); setPolarizedPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button><input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`polarizada_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`polarizada_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" /></div>))}</div>)}
                                                            {photosCollapsed && polarizedPreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center">📷 {polarizedPreviews.length} foto(s)</p>)}
                                                            <input ref={polarizedFileRef} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setPolarizedPhotos(p => [...p, ...nf]); setPolarizedPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            <input id="cam-native-polarizada" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setPolarizedPhotos(p => [...p, ...nf]); setPolarizedPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                        </div>
                                                        {polarizedPreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                        {(fieldNotes.polarizada || []).map((note, ni) => (<div key={ni} className="flex items-center gap-1 mt-1"><input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev.polarizada || [])]; arr[ni] = val; return { ...prev, polarizada: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" /><button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev.polarizada || [])]; arr.splice(ni, 1); return { ...prev, polarizada: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button></div>))}
                                                        <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, polarizada: [...(prev.polarizada || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                        {/* ── Sub-secção: Registos Fotográficos ── */}
                                        <div className="rounded-xl border border-gray-200 overflow-hidden">
                                            {/* Hero Header */}
                                            <div className="bg-gradient-to-r from-slate-800 to-slate-700 px-4 py-2.5 flex items-center justify-between">
                                                <button type="button" onClick={() => setExpandRegistos(prev => !prev)} className="flex items-center gap-2 cursor-pointer">
                                                    <Camera className="h-4 w-4 text-sky-300" />
                                                    <span className="text-[11px] uppercase tracking-widest font-semibold text-white">
                                                        Registos Fotográficos
                                                    </span>
                                                    <ChevronDown className={cn("h-3.5 w-3.5 text-slate-400 transition-transform", expandRegistos && "rotate-180")} />
                                                </button>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex gap-1" style={{ display: expandRegistos ? undefined : 'none' }}>
                                                        <button type="button" onClick={() => setPhotoSetup('basic')} className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-semibold transition-all', photoSetup === 'basic' ? 'bg-white text-slate-800 shadow-sm' : 'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-white')}>
                                                            Setup Básico
                                                        </button>
                                                        <button type="button" onClick={() => setPhotoSetup('complete')} className={cn('px-2.5 py-0.5 rounded-full text-[9px] font-semibold transition-all', photoSetup === 'complete' ? 'bg-white text-slate-800 shadow-sm' : 'bg-slate-600 text-slate-300 hover:bg-slate-500 hover:text-white')}>
                                                            Setup Completo
                                                        </button>
                                                    </div>
                                                    {(faceRepouso.previews.length > 0 || faceSorrisoNatural.previews.length > 0 || faceSorrisoAlto.previews.length > 0 || closeupRepouso.previews.length > 0 || closeupSorrisoNatural.previews.length > 0 || closeupSorrisoAlto.previews.length > 0 || colorScalePreviews.length > 0 || intraoralSupPreviews.length > 0 || intraoralInfPreviews.length > 0 || previews45.length > 0 || previewsOutros.length > 0) && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setPhotosCollapsed(prev => !prev)}
                                                            className="flex items-center gap-1 text-[9px] text-slate-300 hover:text-white font-medium transition-colors"
                                                        >
                                                            {photosCollapsed ? (
                                                                <><ChevronDown className="h-3 w-3" /> Mostrar fotos</>
                                                            ) : (
                                                                <><ChevronUp className="h-3 w-3" /> Minimizar fotos</>
                                                            )}
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="p-3 space-y-3" style={{ display: expandRegistos ? undefined : 'none' }}>
                                                {/* Retrato — linha inteira */}
                                                <fieldset className="border border-gray-200 rounded-lg p-2">
                                                    <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Retrato</legend>
                                                    <div className={cn('grid grid-cols-1 gap-2', photoSetup === 'basic' ? 'sm:grid-cols-3' : 'sm:grid-cols-5')}>
                                                        {(() => {
                                                            const allFaceFields: { label: string; state: { files: File[]; previews: string[] }; setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; ref: React.RefObject<HTMLInputElement>; key: string; guideImages?: string[] }[] = [
                                                                { label: 'Repouso', state: faceRepouso, setter: setFaceRepouso, ref: faceRepousoRef, key: 'repouso', guideImages: ['/images/guides/retrato-repouso.png'] },
                                                                { label: 'Sorriso Natural', state: faceSorrisoNatural, setter: setFaceSorrisoNatural, ref: faceSorrisoNaturalRef, key: 'sorrisoNatural', guideImages: ['/images/guides/retrato-sorriso-natural.png'] },
                                                                { label: 'Sorriso Máximo', state: faceSorrisoAlto, setter: setFaceSorrisoAlto, ref: faceSorrisoAltoRef, key: 'sorrisoAlto', guideImages: ['/images/guides/retrato-sorriso-maximo.png'] },
                                                                { label: '45º', state: face45Esq, setter: setFace45Esq, ref: face45EsqRef, key: '45', guideImages: ['/images/guides/retrato-45-esquerda.png', '/images/guides/retrato-45-direita.png'] },
                                                                { label: 'Perfil', state: face45Dir, setter: setFace45Dir, ref: face45DirRef, key: 'perfil', guideImages: ['/images/guides/retrato-perfil-esquerda.png', '/images/guides/retrato-perfil-direita.png'] },
                                                            ];
                                                            const faceFields = photoSetup === 'basic' ? allFaceFields.filter(f => ['repouso', 'sorrisoNatural', 'sorrisoAlto'].includes(f.key)) : allFaceFields;

                                                            const addFiles = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, newFiles: File[]) => {
                                                                setter(prev => ({
                                                                    files: [...prev.files, ...newFiles],
                                                                    previews: [...prev.previews, ...newFiles.map(f => URL.createObjectURL(f))],
                                                                }));
                                                            };

                                                            const removeFile = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, idx: number) => {
                                                                setter(prev => ({
                                                                    files: prev.files.filter((_, i) => i !== idx),
                                                                    previews: prev.previews.filter((_, i) => i !== idx),
                                                                }));
                                                            };

                                                            return faceFields.map(({ label, state, setter, ref, key, guideImages }) => (
                                                                <div
                                                                    key={key}
                                                                    className={cn(
                                                                        "text-center rounded-lg border-2 border-dashed p-1.5 transition-colors",
                                                                        faceDragOver === key
                                                                            ? "border-sky-400 bg-sky-100/50"
                                                                            : "border-gray-200 bg-white"
                                                                    )}
                                                                    onDragOver={e => { e.preventDefault(); setFaceDragOver(key); }}
                                                                    onDragLeave={() => setFaceDragOver(null)}
                                                                    onDrop={e => {
                                                                        e.preventDefault();
                                                                        setFaceDragOver(null);
                                                                        // Internal drag between fields
                                                                        if (dragSourceRef.current) {
                                                                            const src = dragSourceRef.current;
                                                                            const newNoteKey = `face_${key}_${state.files.length}`;
                                                                            addFiles(setter, [src.file]);
                                                                            if (src.note) setPhotoNotes(prev => { const next = { ...prev, [newNoteKey]: src.note }; delete next[src.noteKey]; return next; });
                                                                            src.remove();
                                                                            dragSourceRef.current = null;
                                                                            return;
                                                                        }
                                                                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                                                        if (files.length > 0) addFiles(setter, files);
                                                                    }}
                                                                >
                                                                    <span className="text-[8px] font-semibold text-gray-500 block mb-1">{label}</span>

                                                                    {/* Guide images — referência visual */}
                                                                    {guideImages && guideImages.length > 0 && (
                                                                        <div className={guideImages.length > 1 ? 'grid grid-cols-2 gap-0.5 mb-1' : 'mb-1'}>
                                                                            {guideImages.map((gi, idx) => (
                                                                                <img
                                                                                    key={idx}
                                                                                    src={gi}
                                                                                    alt={`Guia ${label} ${idx + 1}`}
                                                                                    className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                                                                                    onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }}
                                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    {/* Action buttons — always visible */}
                                                                    <div className="grid grid-cols-2 gap-1">
                                                                        {/* Ficheiro */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => ref.current?.click()}
                                                                            className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2"
                                                                            title="Anexar ficheiro"
                                                                        >
                                                                            <Upload className="h-3 w-3" />
                                                                            <span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                        </button>
                                                                        {/* Câmara */}
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setCameraTarget({ setter, key })}
                                                                            className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2"
                                                                            title="Tirar fotografia"
                                                                        >
                                                                            <Camera className="h-3 w-3" />
                                                                            <span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                        </button>
                                                                    </div>

                                                                    {/* Preview grid — abaixo dos botões, colapsável */}
                                                                    {!photosCollapsed && state.previews.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                                                            {state.previews.map((url, i) => (
                                                                                <div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`face_${key}:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`}
                                                                                    draggable={!isTouchDevice}
                                                                                    onClick={isTouchDevice ? () => togglePhotoSelection(`face_${key}:${i}`) : undefined}
                                                                                    onDragStart={!isTouchDevice ? (e => {
                                                                                        e.dataTransfer.effectAllowed = 'move';
                                                                                        e.dataTransfer.setData('text/plain', 'internal-photo');
                                                                                        dragSourceRef.current = {
                                                                                            file: state.files[i],
                                                                                            preview: url,
                                                                                            note: photoNotes[`face_${key}_${i}`] || '',
                                                                                            noteKey: `face_${key}_${i}`,
                                                                                            remove: () => removeFile(setter, i),
                                                                                        };
                                                                                    }) : undefined}
                                                                                    onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}
                                                                                >
                                                                                    {selectedPhotos.has(`face_${key}:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}
                                                                                    <img src={url} alt={`${label} ${i + 1}`} className="w-full aspect-[3/4] object-cover rounded border border-gray-200" />
                                                                                    <button
                                                                                        type="button"
                                                                                        onClick={(e) => { e.stopPropagation(); removeFile(setter, i); }}
                                                                                        className="absolute top-0 right-0 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                    >
                                                                                        <X className="h-2 w-2 text-white" />
                                                                                    </button>
                                                                                    <input
                                                                                        type="text"
                                                                                        placeholder="Nota..."
                                                                                        draggable={false}
                                                                                        onClick={e => e.stopPropagation()}
                                                                                        onMouseDown={e => e.stopPropagation()}
                                                                                        value={photoNotes[`face_${key}_${i}`] || ''}
                                                                                        onChange={e => setPhotoNotes(prev => ({ ...prev, [`face_${key}_${i}`]: e.target.value }))}
                                                                                        className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300"
                                                                                    />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {photosCollapsed && state.previews.length > 0 && (
                                                                        <p className="text-[8px] text-gray-400 text-center mt-1">📷 {state.previews.length} foto(s)</p>
                                                                    )}

                                                                    {state.previews.length === 0 && (
                                                                        <p className="text-[7px] text-gray-300 mt-1">ou arraste fotos aqui</p>
                                                                    )}

                                                                    {/* Hidden inputs */}
                                                                    {/* Field-level notes */}
                                                                    {(fieldNotes[`face_${key}`] || []).map((note, ni) => (
                                                                        <div key={ni} className="flex items-center gap-1 mt-1">
                                                                            <input
                                                                                type="text"
                                                                                placeholder="Nota do campo..."
                                                                                value={note}
                                                                                onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev[`face_${key}`] || [])]; arr[ni] = val; return { ...prev, [`face_${key}`]: arr }; }); }}
                                                                                className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300"
                                                                            />
                                                                            <button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev[`face_${key}`] || [])]; arr.splice(ni, 1); return { ...prev, [`face_${key}`]: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button>
                                                                        </div>
                                                                    ))}
                                                                    <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, [`face_${key}`]: [...(prev[`face_${key}`] || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                                    <input
                                                                        ref={ref}
                                                                        type="file"
                                                                        accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed"
                                                                        multiple
                                                                        className="hidden"
                                                                        onChange={e => {
                                                                            const files = e.target.files;
                                                                            if (files && files.length > 0) addFiles(setter, Array.from(files));
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                    {/* Input câmara nativa (opc. qualidade máxima — fotografia computacional) */}
                                                                    <input
                                                                        id={`cam-native-${key}`}
                                                                        type="file"
                                                                        accept="image/*"
                                                                        capture="environment"
                                                                        className="hidden"
                                                                        onChange={e => {
                                                                            const files = e.target.files;
                                                                            if (files && files.length > 0) addFiles(setter, Array.from(files));
                                                                            e.target.value = '';
                                                                        }}
                                                                    />
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </fieldset>
                                                {/* Close-up — linha inteira, clone do Face (apenas Setup Completo) */}
                                                {photoSetup === 'complete' && (<fieldset className="border border-gray-200 rounded-lg p-2">
                                                    <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Close-up</legend>
                                                    <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                                                        {(() => {
                                                            const closeupFields: { label: string; state: { files: File[]; previews: string[] }; setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; ref: React.RefObject<HTMLInputElement>; key: string; guideImages?: string[] }[] = [
                                                                { label: 'Repouso', state: closeupRepouso, setter: setCloseupRepouso, ref: closeupRepousoRef, key: 'cu-repouso', guideImages: ['/images/guides/close-up-repouso.png'] },
                                                                { label: 'Sorriso Natural', state: closeupSorrisoNatural, setter: setCloseupSorrisoNatural, ref: closeupSorrisoNaturalRef, key: 'cu-sorrisoNatural', guideImages: ['/images/guides/close-up-sorriso-natural.png'] },
                                                                { label: 'Sorriso Máximo', state: closeupSorrisoAlto, setter: setCloseupSorrisoAlto, ref: closeupSorrisoAltoRef, key: 'cu-sorrisoAlto', guideImages: ['/images/guides/close-up-sorriso-maximo.png'] },
                                                                { label: 'Retractores Frontal', state: closeup45Dir, setter: setCloseup45Dir, ref: closeup45DirRef, key: 'cu-retractores', guideImages: ['/images/guides/close-up-retractores-frontal.png'] },
                                                                { label: 'Retractores 45º', state: closeup45Esq, setter: setCloseup45Esq, ref: closeup45EsqRef, key: 'cu-45', guideImages: ['/images/guides/close-up-45-esquerda.png', '/images/guides/close-up-45-direita.png'] },
                                                            ];

                                                            const addFiles = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, newFiles: File[]) => {
                                                                setter(prev => ({
                                                                    files: [...prev.files, ...newFiles],
                                                                    previews: [...prev.previews, ...newFiles.map(f => URL.createObjectURL(f))],
                                                                }));
                                                            };

                                                            const removeFile = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, idx: number) => {
                                                                setter(prev => ({
                                                                    files: prev.files.filter((_, i) => i !== idx),
                                                                    previews: prev.previews.filter((_, i) => i !== idx),
                                                                }));
                                                            };

                                                            return closeupFields.map(({ label, state, setter, ref, key, guideImages }) => (
                                                                <div
                                                                    key={key}
                                                                    className={cn(
                                                                        "text-center rounded-lg border-2 border-dashed p-1.5 transition-colors",
                                                                        closeupDragOver === key
                                                                            ? "border-sky-400 bg-sky-100/50"
                                                                            : "border-gray-200 bg-white"
                                                                    )}
                                                                    onDragOver={e => { e.preventDefault(); setCloseupDragOver(key); }}
                                                                    onDragLeave={() => setCloseupDragOver(null)}
                                                                    onDrop={e => {
                                                                        e.preventDefault();
                                                                        setCloseupDragOver(null);
                                                                        if (dragSourceRef.current) {
                                                                            const src = dragSourceRef.current;
                                                                            const nk = `closeup_${key}_${state.files.length}`;
                                                                            addFiles(setter, [src.file]);
                                                                            if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; });
                                                                            src.remove();
                                                                            dragSourceRef.current = null;
                                                                            return;
                                                                        }
                                                                        const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
                                                                        if (files.length > 0) addFiles(setter, files);
                                                                    }}
                                                                >
                                                                    <span className="text-[8px] font-semibold text-gray-500 block mb-1">{label}</span>

                                                                    {guideImages && guideImages.length > 0 && (
                                                                        <div className={guideImages.length > 1 ? 'grid grid-cols-2 gap-0.5 mb-1' : 'mb-1'}>
                                                                            {guideImages.map((gi: string, idx: number) => (
                                                                                <img
                                                                                    key={idx}
                                                                                    src={gi}
                                                                                    alt={`Guia ${label} ${idx + 1}`}
                                                                                    className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 cursor-pointer hover:opacity-80 transition-opacity"
                                                                                    onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }}
                                                                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                                                                />
                                                                            ))}
                                                                        </div>
                                                                    )}

                                                                    <div className="grid grid-cols-2 gap-1">
                                                                        <button type="button" onClick={() => ref.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                            <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                        </button>
                                                                        <button type="button" onClick={() => setCameraTarget({ setter, key })} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                            <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                        </button>
                                                                    </div>

                                                                    {!photosCollapsed && state.previews.length > 0 && (
                                                                        <div className="grid grid-cols-2 gap-1 mt-1">
                                                                            {state.previews.map((url, i) => (
                                                                                <div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`closeup_${key}:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`}
                                                                                    draggable={!isTouchDevice}
                                                                                    onClick={isTouchDevice ? () => togglePhotoSelection(`closeup_${key}:${i}`) : undefined}
                                                                                    onDragStart={!isTouchDevice ? (e => {
                                                                                        e.dataTransfer.effectAllowed = 'move';
                                                                                        e.dataTransfer.setData('text/plain', 'internal-photo');
                                                                                        dragSourceRef.current = {
                                                                                            file: state.files[i],
                                                                                            preview: url,
                                                                                            note: photoNotes[`closeup_${key}_${i}`] || '',
                                                                                            noteKey: `closeup_${key}_${i}`,
                                                                                            remove: () => removeFile(setter, i),
                                                                                        };
                                                                                    }) : undefined}
                                                                                    onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}
                                                                                >
                                                                                    {selectedPhotos.has(`closeup_${key}:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}
                                                                                    <img src={url} alt={`${label} ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                                    <button type="button" onClick={(e) => { e.stopPropagation(); removeFile(setter, i); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                        <X className="h-2 w-2 text-white" />
                                                                                    </button>
                                                                                    <input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`closeup_${key}_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`closeup_${key}_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" />
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                    {photosCollapsed && state.previews.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {state.previews.length} foto(s)</p>)}
                                                                    {state.previews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}

                                                                    {/* Field-level notes */}
                                                                    {(fieldNotes[`closeup_${key}`] || []).map((note, ni) => (
                                                                        <div key={ni} className="flex items-center gap-1 mt-1">
                                                                            <input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev[`closeup_${key}`] || [])]; arr[ni] = val; return { ...prev, [`closeup_${key}`]: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" />
                                                                            <button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev[`closeup_${key}`] || [])]; arr.splice(ni, 1); return { ...prev, [`closeup_${key}`]: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button>
                                                                        </div>
                                                                    ))}
                                                                    <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, [`closeup_${key}`]: [...(prev[`closeup_${key}`] || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                                    <input ref={ref} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const files = e.target.files; if (files && files.length > 0) addFiles(setter, Array.from(files)); e.target.value = ''; }} />
                                                                </div>
                                                            ));
                                                        })()}
                                                    </div>
                                                </fieldset>)}
                                                {/* Vista Oclusal + 45º + Outros — grid */}
                                                <div className={cn('grid grid-cols-1 gap-2', photoSetup === 'basic' ? 'sm:grid-cols-1' : 'sm:grid-cols-4')}>
                                                    {/* --- Vista Oclusal (Intraoral Superior + Inferior) — apenas Setup Completo --- */}
                                                    {photoSetup === 'complete' && (<fieldset className="border border-gray-200 rounded-lg p-2 sm:col-span-2">
                                                        <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Vista Oclusal</legend>
                                                        <div className="grid grid-cols-2 gap-2">
                                                            <div
                                                                className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${intraoralSupDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                                onDragOver={e => { e.preventDefault(); setIntraoralSupDragOver(true); }}
                                                                onDragLeave={() => setIntraoralSupDragOver(false)}
                                                                onDrop={e => { e.preventDefault(); setIntraoralSupDragOver(false); if (dragSourceRef.current) { const src = dragSourceRef.current; const nk = `intraoralSup_${intraoralSupPreviews.length}`; setIntraoralSupPhotos(p => [...p, src.file]); setIntraoralSupPreviews(p => [...p, src.preview]); if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; }); src.remove(); dragSourceRef.current = null; return; } const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setIntraoralSupPhotos(prev => [...prev, ...files]); setIntraoralSupPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                            >
                                                                <span className="text-[8px] font-semibold text-gray-500 block mb-1">Intraoral Superior</span>
                                                                <img src="/images/guides/intraoral-superior.png" alt="Guia Intraoral Superior" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    <button type="button" onClick={() => intraoralSupFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                        <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                    </button>
                                                                    <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: intraoralSupPhotos, previews: intraoralSupPreviews }); setIntraoralSupPhotos(r.files); setIntraoralSupPreviews(r.previews); } }; setCameraTarget({ setter: s, key: 'intraoralSup' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                        <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                    </button>
                                                                    <input ref={intraoralSupFileRef} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setIntraoralSupPhotos(p => [...p, ...nf]); setIntraoralSupPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                </div>
                                                                {!photosCollapsed && intraoralSupPreviews.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                                                        {intraoralSupPreviews.map((url, i) => (
                                                                            <div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`intraoralSup:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`}
                                                                                draggable={!isTouchDevice}
                                                                                onClick={isTouchDevice ? () => togglePhotoSelection(`intraoralSup:${i}`) : undefined}
                                                                                onDragStart={!isTouchDevice ? (e => {
                                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                                    e.dataTransfer.setData('text/plain', 'internal-photo');
                                                                                    dragSourceRef.current = {
                                                                                        file: intraoralSupPhotos[i],
                                                                                        preview: url,
                                                                                        note: photoNotes[`intraoralSup_${i}`] || '',
                                                                                        noteKey: `intraoralSup_${i}`,
                                                                                        remove: () => { setIntraoralSupPhotos(p => p.filter((_, idx) => idx !== i)); setIntraoralSupPreviews(p => p.filter((_, idx) => idx !== i)); },
                                                                                    };
                                                                                }) : undefined}
                                                                                onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}
                                                                            >
                                                                                {selectedPhotos.has(`intraoralSup:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}
                                                                                <img src={url} alt={`Intraoral Sup ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setIntraoralSupPhotos(p => p.filter((_, idx) => idx !== i)); setIntraoralSupPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                                <input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`intraoralSup_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`intraoralSup_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {photosCollapsed && intraoralSupPreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {intraoralSupPreviews.length} foto(s)</p>)}
                                                                {intraoralSupPreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                                {(fieldNotes.intraoralSup || []).map((note, ni) => (<div key={ni} className="flex items-center gap-1 mt-1"><input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev.intraoralSup || [])]; arr[ni] = val; return { ...prev, intraoralSup: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" /><button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev.intraoralSup || [])]; arr.splice(ni, 1); return { ...prev, intraoralSup: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button></div>))}
                                                                <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, intraoralSup: [...(prev.intraoralSup || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                            </div>

                                                            {/* --- Intraoral Inferior --- */}
                                                            <div
                                                                className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${intraoralInfDragOver ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                                onDragOver={e => { e.preventDefault(); setIntraoralInfDragOver(true); }}
                                                                onDragLeave={() => setIntraoralInfDragOver(false)}
                                                                onDrop={e => { e.preventDefault(); setIntraoralInfDragOver(false); if (dragSourceRef.current) { const src = dragSourceRef.current; const nk = `intraoralInf_${intraoralInfPreviews.length}`; setIntraoralInfPhotos(p => [...p, src.file]); setIntraoralInfPreviews(p => [...p, src.preview]); if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; }); src.remove(); dragSourceRef.current = null; return; } const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setIntraoralInfPhotos(prev => [...prev, ...files]); setIntraoralInfPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                            >
                                                                <span className="text-[8px] font-semibold text-gray-500 block mb-1">Intraoral Inferior</span>
                                                                <img src="/images/guides/intraoral-inferior.png" alt="Guia Intraoral Inferior" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                                <div className="grid grid-cols-2 gap-1">
                                                                    <button type="button" onClick={() => intraoralInfFileRef.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                        <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                    </button>
                                                                    <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: intraoralInfPhotos, previews: intraoralInfPreviews }); setIntraoralInfPhotos(r.files); setIntraoralInfPreviews(r.previews); } }; setCameraTarget({ setter: s, key: 'intraoralInf' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                        <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                    </button>
                                                                    <input ref={intraoralInfFileRef} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setIntraoralInfPhotos(p => [...p, ...nf]); setIntraoralInfPreviews(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                </div>
                                                                {!photosCollapsed && intraoralInfPreviews.length > 0 && (
                                                                    <div className="grid grid-cols-2 gap-1 mt-1">
                                                                        {intraoralInfPreviews.map((url, i) => (
                                                                            <div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`intraoralInf:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`}
                                                                                draggable={!isTouchDevice}
                                                                                onClick={isTouchDevice ? () => togglePhotoSelection(`intraoralInf:${i}`) : undefined}
                                                                                onDragStart={!isTouchDevice ? (e => {
                                                                                    e.dataTransfer.effectAllowed = 'move';
                                                                                    e.dataTransfer.setData('text/plain', 'internal-photo');
                                                                                    dragSourceRef.current = {
                                                                                        file: intraoralInfPhotos[i],
                                                                                        preview: url,
                                                                                        note: photoNotes[`intraoralInf_${i}`] || '',
                                                                                        noteKey: `intraoralInf_${i}`,
                                                                                        remove: () => { setIntraoralInfPhotos(p => p.filter((_, idx) => idx !== i)); setIntraoralInfPreviews(p => p.filter((_, idx) => idx !== i)); },
                                                                                    };
                                                                                }) : undefined}
                                                                                onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}
                                                                            >
                                                                                {selectedPhotos.has(`intraoralInf:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}
                                                                                <img src={url} alt={`Intraoral Inf ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                                <button type="button" onClick={(e) => { e.stopPropagation(); setIntraoralInfPhotos(p => p.filter((_, idx) => idx !== i)); setIntraoralInfPreviews(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                                <input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`intraoralInf_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`intraoralInf_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" />
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                                {photosCollapsed && intraoralInfPreviews.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {intraoralInfPreviews.length} foto(s)</p>)}
                                                                {intraoralInfPreviews.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                                {(fieldNotes.intraoralInf || []).map((note, ni) => (<div key={ni} className="flex items-center gap-1 mt-1"><input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev.intraoralInf || [])]; arr[ni] = val; return { ...prev, intraoralInf: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" /><button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev.intraoralInf || [])]; arr.splice(ni, 1); return { ...prev, intraoralInf: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button></div>))}
                                                                <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, intraoralInf: [...(prev.intraoralInf || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                            </div>
                                                        </div>
                                                    </fieldset>)}

                                                    {/* --- 45º — apenas Setup Completo --- */}
                                                    {photoSetup === 'complete' && (<fieldset className="border border-gray-200 rounded-lg p-2">
                                                        <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">45º</legend>
                                                        <div
                                                            className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${dragOver45 ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                            onDragOver={e => { e.preventDefault(); setdragOver45(true); }}
                                                            onDragLeave={() => setdragOver45(false)}
                                                            onDrop={e => { e.preventDefault(); setdragOver45(false); if (dragSourceRef.current) { const src = dragSourceRef.current; const nk = `foto45_${previews45.length}`; setphotos45(p => [...p, src.file]); setpreviews45(p => [...p, src.preview]); if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; }); src.remove(); dragSourceRef.current = null; return; } const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setphotos45(prev => [...prev, ...files]); setpreviews45(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                        >
                                                            <span className="text-[8px] font-semibold text-gray-500 block mb-1">45º</span>
                                                            <img src="/images/guides/45.png" alt="Guia 45º" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            <div className="grid grid-cols-2 gap-1">
                                                                <button type="button" onClick={() => fileRef45.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                    <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                </button>
                                                                <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: photos45, previews: previews45 }); setphotos45(r.files); setpreviews45(r.previews); } }; setCameraTarget({ setter: s, key: 'foto45' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                    <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                </button>
                                                                <input ref={fileRef45} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setphotos45(p => [...p, ...nf]); setpreviews45(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                <input id="cam-native-45" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setphotos45(p => [...p, ...nf]); setpreviews45(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            </div>
                                                            {!photosCollapsed && previews45.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-1 mt-1">
                                                                    {previews45.map((url, i) => (
                                                                        <div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`foto45:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`}
                                                                            draggable={!isTouchDevice}
                                                                            onClick={isTouchDevice ? () => togglePhotoSelection(`foto45:${i}`) : undefined}
                                                                            onDragStart={!isTouchDevice ? (e => {
                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                                e.dataTransfer.setData('text/plain', 'internal-photo');
                                                                                dragSourceRef.current = {
                                                                                    file: photos45[i],
                                                                                    preview: url,
                                                                                    note: photoNotes[`foto45_${i}`] || '',
                                                                                    noteKey: `foto45_${i}`,
                                                                                    remove: () => { setphotos45(p => p.filter((_, idx) => idx !== i)); setpreviews45(p => p.filter((_, idx) => idx !== i)); },
                                                                                };
                                                                            }) : undefined}
                                                                            onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}
                                                                        >
                                                                            {selectedPhotos.has(`foto45:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}
                                                                            <img src={url} alt={`45º ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setphotos45(p => p.filter((_, idx) => idx !== i)); setpreviews45(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                            <input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`foto45_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`foto45_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {photosCollapsed && previews45.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {previews45.length} foto(s)</p>)}
                                                            {previews45.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                            {(fieldNotes.foto45 || []).map((note, ni) => (<div key={ni} className="flex items-center gap-1 mt-1"><input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev.foto45 || [])]; arr[ni] = val; return { ...prev, foto45: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" /><button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev.foto45 || [])]; arr.splice(ni, 1); return { ...prev, foto45: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button></div>))}
                                                            <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, foto45: [...(prev.foto45 || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                        </div>
                                                    </fieldset>)}

                                                    {/* --- Outros --- */}
                                                    <fieldset className="border border-gray-200 rounded-lg p-2">
                                                        <legend className="text-[9px] text-gray-400 uppercase tracking-wider font-semibold px-1">Outros</legend>
                                                        <div
                                                            className={`text-center rounded-lg border-2 border-dashed p-1.5 transition-colors ${dragOverOutros ? 'border-sky-400 bg-sky-100/50' : 'border-gray-200 bg-white'}`}
                                                            onDragOver={e => { e.preventDefault(); setDragOverOutros(true); }}
                                                            onDragLeave={() => setDragOverOutros(false)}
                                                            onDrop={e => { e.preventDefault(); setDragOverOutros(false); if (dragSourceRef.current) { const src = dragSourceRef.current; const nk = `outros_${previewsOutros.length}`; setPhotosOutros(p => [...p, src.file]); setPreviewsOutros(p => [...p, src.preview]); if (src.note) setPhotoNotes(prev => { const next = { ...prev, [nk]: src.note }; delete next[src.noteKey]; return next; }); src.remove(); dragSourceRef.current = null; return; } const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/')); if (files.length > 0) { setPhotosOutros(prev => [...prev, ...files]); setPreviewsOutros(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]); } }}
                                                        >
                                                            <span className="text-[8px] font-semibold text-gray-500 block mb-1">Outros</span>
                                                            <img src="/images/guides/outros.png" alt="Guia Outros" className="w-full max-h-24 object-cover rounded border border-gray-100 opacity-60 mb-1 cursor-pointer hover:opacity-80 transition-opacity" onClick={(e) => { const img = e.target as HTMLImageElement; if (img.classList.contains("object-cover")) { img.classList.remove("object-cover", "max-h-24"); img.classList.add("object-contain"); } else { img.classList.add("object-cover", "max-h-24"); img.classList.remove("object-contain"); } }} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                                            <div className="grid grid-cols-2 gap-1">
                                                                <button type="button" onClick={() => fileRefOutros.current?.click()} className="w-full rounded border-2 border-dashed border-amber-300 bg-amber-50/30 flex flex-col items-center justify-center text-amber-500 hover:bg-amber-100/40 hover:border-amber-400 transition-colors py-2" title="Anexar ficheiro">
                                                                    <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                                </button>
                                                                <button type="button" onClick={() => { const s: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>> = (a) => { if (typeof a === 'function') { const r = a({ files: photosOutros, previews: previewsOutros }); setPhotosOutros(r.files); setPreviewsOutros(r.previews); } }; setCameraTarget({ setter: s, key: 'outros' }); }} className="w-full rounded border-2 border-dashed border-sky-300 bg-sky-50/30 flex flex-col items-center justify-center text-sky-400 hover:bg-sky-100/40 hover:border-sky-400 transition-colors py-2" title="Tirar fotografia">
                                                                    <Camera className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Câmara</span>
                                                                </button>
                                                                <input ref={fileRefOutros} type="file" accept="image/*,.zip,.rar,.7z,application/zip,application/x-rar-compressed,application/x-7z-compressed" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; const nf = Array.from(f); setPhotosOutros(p => [...p, ...nf]); setPreviewsOutros(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                                <input id="cam-native-outros" type="file" accept="image/*" capture="environment" className="hidden" onChange={e => { const f = e.target.files; if (!f || f.length === 0) return; const nf = Array.from(f); setPhotosOutros(p => [...p, ...nf]); setPreviewsOutros(p => [...p, ...nf.map(x => URL.createObjectURL(x))]); e.target.value = ''; }} />
                                                            </div>
                                                            {!photosCollapsed && previewsOutros.length > 0 && (
                                                                <div className="grid grid-cols-2 gap-1 mt-1">
                                                                    {previewsOutros.map((url, i) => (
                                                                        <div key={i} className={`relative group ${isTouchDevice ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'} ${selectedPhotos.has(`outros:${i}`) ? 'ring-2 ring-amber-500 rounded' : ''}`}
                                                                            draggable={!isTouchDevice}
                                                                            onClick={isTouchDevice ? () => togglePhotoSelection(`outros:${i}`) : undefined}
                                                                            onDragStart={!isTouchDevice ? (e => {
                                                                                e.dataTransfer.effectAllowed = 'move';
                                                                                e.dataTransfer.setData('text/plain', 'internal-photo');
                                                                                dragSourceRef.current = {
                                                                                    file: photosOutros[i],
                                                                                    preview: url,
                                                                                    note: photoNotes[`outros_${i}`] || '',
                                                                                    noteKey: `outros_${i}`,
                                                                                    remove: () => { setPhotosOutros(p => p.filter((_, idx) => idx !== i)); setPreviewsOutros(p => p.filter((_, idx) => idx !== i)); },
                                                                                };
                                                                            }) : undefined}
                                                                            onDragEnd={!isTouchDevice ? (() => { dragSourceRef.current = null; }) : undefined}
                                                                        >
                                                                            {selectedPhotos.has(`outros:${i}`) && <div className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center z-10 text-white text-[10px] font-bold">✓</div>}
                                                                            <img src={url} alt={`Outros ${i + 1}`} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                            <button type="button" onClick={(e) => { e.stopPropagation(); setPhotosOutros(p => p.filter((_, idx) => idx !== i)); setPreviewsOutros(p => p.filter((_, idx) => idx !== i)); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                            <input type="text" placeholder="Nota..." draggable={false} onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} value={photoNotes[`outros_${i}`] || ''} onChange={e => setPhotoNotes(prev => ({ ...prev, [`outros_${i}`]: e.target.value }))} className="w-full mt-0.5 px-1 py-0.5 text-[7px] text-gray-500 bg-white/90 border border-gray-200 rounded focus:outline-none focus:border-amber-300 placeholder:text-gray-300" />
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {photosCollapsed && previewsOutros.length > 0 && (<p className="text-[8px] text-gray-400 text-center mt-1">📷 {previewsOutros.length} foto(s)</p>)}
                                                            {previewsOutros.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">ou arraste fotos aqui</p>)}
                                                            {(fieldNotes.outros || []).map((note, ni) => (<div key={ni} className="flex items-center gap-1 mt-1"><input type="text" placeholder="Nota do campo..." value={note} onChange={e => { const val = e.target.value; setFieldNotes(prev => { const arr = [...(prev.outros || [])]; arr[ni] = val; return { ...prev, outros: arr }; }); }} className="flex-1 px-2 py-1 text-[10px] text-gray-600 bg-amber-50/50 border border-amber-200 rounded focus:outline-none focus:border-amber-400 placeholder:text-gray-300" /><button type="button" onClick={() => setFieldNotes(prev => { const arr = [...(prev.outros || [])]; arr.splice(ni, 1); return { ...prev, outros: arr }; })} className="text-[11px] text-gray-300 hover:text-red-400">✕</button></div>))}
                                                            <button type="button" onClick={() => setFieldNotes(prev => ({ ...prev, outros: [...(prev.outros || []), ''] }))} className="w-full mt-1 py-1.5 text-[11px] text-gray-400 hover:text-amber-500 hover:bg-amber-50/50 rounded border border-dashed border-gray-200 hover:border-amber-300 transition-colors flex items-center justify-center gap-1">📝 + Nota</button>
                                                        </div>
                                                    </fieldset>
                                                </div>
                                            </div>
                                        </div>


                                    </div>
                                </div>

                                {/* ── Sub-secção: Registos Radiológicos ── */}
                                <div className="rounded-lg border border-violet-200/60 bg-violet-50/30 p-3 space-y-2.5">
                                    <div className="flex items-center justify-between">
                                        <button type="button" onClick={() => setRadioCollapsed(c => !c)} className="flex items-center gap-1.5 text-xs font-semibold text-violet-700 hover:text-violet-900 transition-colors">
                                            {radioCollapsed ? '▶' : '▼'}
                                            <span>🩻 Registos Radiológicos</span>
                                            {(radioOrtopan.files.length + radioPeriapicais.files.length + radioCbct.files.length) > 0 && (
                                                <span className="ml-1 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-600 text-[9px] font-bold">
                                                    {radioOrtopan.files.length + radioPeriapicais.files.length + radioCbct.files.length}
                                                </span>
                                            )}
                                        </button>
                                    </div>

                                    {!radioCollapsed && (
                                        <div className="grid grid-cols-3 gap-2">
                                            {(() => {
                                                const radioFields: { label: string; key: string; state: { files: File[]; previews: string[] }; setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>; ref: React.RefObject<HTMLInputElement>; icon: string }[] = [
                                                    { label: 'Ortopantomografia', key: 'ortopan', state: radioOrtopan, setter: setRadioOrtopan, ref: radioOrtopanRef, icon: '📐' },
                                                    { label: 'Periapicais', key: 'periapicais', state: radioPeriapicais, setter: setRadioPeriapicais, ref: radioPeriapicaisRef, icon: '🦷' },
                                                    { label: 'CBCT', key: 'cbct', state: radioCbct, setter: setRadioCbct, ref: radioCbctRef, icon: '🔬' },
                                                ];

                                                const addRadioFiles = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, newFiles: File[]) => {
                                                    setter(prev => ({
                                                        files: [...prev.files, ...newFiles],
                                                        previews: [...prev.previews, ...newFiles.map(f => f.type.startsWith('image/') ? URL.createObjectURL(f) : '')],
                                                    }));
                                                };

                                                const removeRadioFile = (setter: React.Dispatch<React.SetStateAction<{ files: File[]; previews: string[] }>>, idx: number) => {
                                                    setter(prev => ({
                                                        files: prev.files.filter((_, i) => i !== idx),
                                                        previews: prev.previews.filter((_, i) => i !== idx),
                                                    }));
                                                };

                                                const getFileIcon = (file: File) => {
                                                    const ext = file.name.split('.').pop()?.toLowerCase() || '';
                                                    if (['zip', 'rar', '7z', 'gz', 'tar'].includes(ext)) return '📦';
                                                    if (['dcm', 'dicom'].includes(ext)) return '🩻';
                                                    if (file.type.startsWith('image/')) return '🖼️';
                                                    return '📄';
                                                };

                                                return radioFields.map(({ label, key, state, setter, ref, icon }) => (
                                                    <div
                                                        key={key}
                                                        className={cn(
                                                            "text-center rounded-lg border-2 border-dashed p-1.5 transition-colors",
                                                            radioDragOver === key
                                                                ? "border-violet-400 bg-violet-100/50"
                                                                : "border-gray-200 bg-white"
                                                        )}
                                                        onDragOver={e => { e.preventDefault(); setRadioDragOver(key); }}
                                                        onDragLeave={() => setRadioDragOver(null)}
                                                        onDrop={e => {
                                                            e.preventDefault();
                                                            setRadioDragOver(null);
                                                            const files = Array.from(e.dataTransfer.files);
                                                            if (files.length > 0) addRadioFiles(setter, files);
                                                        }}
                                                    >
                                                        <span className="text-[8px] font-semibold text-gray-500 block mb-1">{icon} {label}</span>
                                                        <div className="mt-1 grid grid-cols-2 gap-1">
                                                            <button type="button" onClick={() => ref.current?.click()} className="w-full rounded border-2 border-dashed border-violet-300 bg-violet-50/30 flex flex-col items-center justify-center text-violet-500 hover:bg-violet-100/40 hover:border-violet-400 transition-colors py-2" title="Anexar ficheiro">
                                                                <Upload className="h-3 w-3" /><span className="text-[6px] mt-0.5 font-medium">Ficheiro</span>
                                                            </button>
                                                            <input ref={ref} type="file" accept="image/*,.zip,.rar,.7z,.gz,.tar,.dcm,.dicom,application/zip,application/x-rar-compressed,application/gzip,application/x-7z-compressed,application/dicom" multiple className="hidden" onChange={e => { const f = e.target.files; if (!f) return; addRadioFiles(setter, Array.from(f)); e.target.value = ''; }} />
                                                        </div>
                                                        {state.files.length > 0 && (
                                                            <div className="grid grid-cols-2 gap-1 mt-1.5">
                                                                {state.files.map((file, i) => (
                                                                    <div key={i} className="relative group">
                                                                        {state.previews[i] ? (
                                                                            <img src={state.previews[i]} alt={file.name} className="w-full aspect-square object-cover rounded border border-gray-200" />
                                                                        ) : (
                                                                            <div className="w-full aspect-square rounded border border-gray-200 bg-gray-50 flex flex-col items-center justify-center">
                                                                                <span className="text-lg">{getFileIcon(file)}</span>
                                                                                <span className="text-[6px] text-gray-400 mt-0.5 px-0.5 truncate max-w-full">{file.name.length > 15 ? file.name.slice(0, 12) + '...' : file.name}</span>
                                                                                <span className="text-[5px] text-gray-300">{(file.size / 1024).toFixed(0)} KB</span>
                                                                            </div>
                                                                        )}
                                                                        <button type="button" onClick={(e) => { e.stopPropagation(); if (state.previews[i]) URL.revokeObjectURL(state.previews[i]); removeRadioFile(setter, i); }} className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-2 w-2 text-white" /></button>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {state.files.length === 0 && (<p className="text-[7px] text-gray-300 text-center mt-1">arraste ficheiros aqui</p>)}
                                                    </div>
                                                ));
                                            })()}
                                        </div>
                                    )}

                                    {radioCollapsed && (radioOrtopan.files.length + radioPeriapicais.files.length + radioCbct.files.length) > 0 && (
                                        <p className="text-[8px] text-gray-400 text-center">📎 {radioOrtopan.files.length + radioPeriapicais.files.length + radioCbct.files.length} ficheiro(s) anexado(s)</p>
                                    )}
                                </div>

                                {/* ═══ CONSIDERAÇÕES ═══ */}
                                <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
                                    {/* Header */}
                                    <button type="button" onClick={() => setConsideracoesCollapsed(c => !c)} className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50/80 transition-colors">
                                        <MessageSquarePlus className="h-4 w-4 text-gray-400" />
                                        <span className="text-xs font-semibold text-gray-700 flex-1 text-left">Considerações</span>
                                        {consideracoes.length > 0 && <span className="text-[10px] bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 font-medium">{consideracoes.length}</span>}
                                        {consideracoesCollapsed ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" /> : <ChevronUp className="h-3.5 w-3.5 text-gray-400" />}
                                    </button>

                                    {!consideracoesCollapsed && (
                                        <div className="px-4 pb-4 space-y-3 border-t border-gray-100">

                                            {/* Template Picker */}
                                            {showTemplatePicker && (
                                                <div className="mt-3 space-y-2.5">
                                                    <div className="flex items-center justify-between">
                                                        <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Escolher Template</span>
                                                        <button type="button" onClick={() => setShowTemplatePicker(false)} className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors">✕ Fechar</button>
                                                    </div>
                                                    {/* Search */}
                                                    <div className="relative">
                                                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={templateSearch}
                                                            onChange={e => setTemplateSearch(e.target.value)}
                                                            placeholder="Pesquisar templates..."
                                                            className="w-full pl-8 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300/50 focus:border-gray-300"
                                                        />
                                                    </div>
                                                    {/* Templates Grid */}
                                                    {loadingTemplates ? (
                                                        <div className="text-center py-6"><Loader2 className="h-4 w-4 text-gray-400 animate-spin mx-auto" /></div>
                                                    ) : availableTemplates.length === 0 ? (
                                                        <div className="text-center py-6">
                                                            <MessageSquarePlus className="h-8 w-8 mx-auto text-gray-200 mb-2" />
                                                            <p className="text-xs text-gray-400">Nenhum template encontrado</p>
                                                            <button type="button" onClick={() => {
                                                                setConsideracoes(prev => [...prev, { id: crypto.randomUUID(), titulo: '', descricao: '', subtitulos: [{ id: crypto.randomUUID(), texto: '', resposta: '', anexos: [] }], isModified: true }]);
                                                                setShowTemplatePicker(false);
                                                            }} className="mt-2 text-xs text-gray-500 hover:text-gray-700 font-medium transition-colors">
                                                                + Criar sem template
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="grid grid-cols-2 gap-2 max-h-[180px] overflow-y-auto">
                                                            {availableTemplates
                                                                .filter(t => !templateSearch || t.titulo.toLowerCase().includes(templateSearch.toLowerCase()) || (t.fields || []).some((f: any) => f.subtitulo.toLowerCase().includes(templateSearch.toLowerCase())))
                                                                .map((t: any) => (
                                                                    <button key={t.id} type="button" onClick={() => {
                                                                        const subs = (t.fields || []).sort((a: any, b: any) => a.ordem - b.ordem).map((f: any) => ({
                                                                            id: crypto.randomUUID(),
                                                                            texto: f.subtitulo,
                                                                            resposta: '',
                                                                            anexos: [],
                                                                        }));
                                                                        setConsideracoes(prev => [...prev, {
                                                                            id: crypto.randomUUID(),
                                                                            template_id: t.id,
                                                                            titulo: t.titulo,
                                                                            descricao: '',
                                                                            subtitulos: subs,
                                                                            isModified: false,
                                                                            originalSubtitulos: subs.map((s: any) => s.texto),
                                                                        }]);
                                                                        setShowTemplatePicker(false);
                                                                        setTemplateSearch('');
                                                                    }} className="text-left p-2.5 rounded-lg border border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm transition-all group">
                                                                        <p className="text-[11px] font-semibold text-gray-700 truncate">{t.titulo}</p>
                                                                        {t.fields && t.fields.length > 0 && (
                                                                            <p className="text-[9px] text-gray-400 mt-0.5">{t.fields.length} campo{t.fields.length !== 1 ? 's' : ''}</p>
                                                                        )}
                                                                    </button>
                                                                ))}
                                                        </div>
                                                    )}
                                                    {/* Create blank */}
                                                    {availableTemplates.length > 0 && (
                                                        <button type="button" onClick={() => {
                                                            setConsideracoes(prev => [...prev, { id: crypto.randomUUID(), titulo: '', descricao: '', subtitulos: [{ id: crypto.randomUUID(), texto: '', resposta: '', anexos: [] }], isModified: true }]);
                                                            setShowTemplatePicker(false);
                                                        }} className="w-full text-[10px] text-gray-400 hover:text-gray-600 py-1.5 transition-colors font-medium">
                                                            + Criar sem template
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {/* Consideration Cards */}
                                            {consideracoes.map((card, cardIdx) => (
                                                <div key={card.id} className="rounded-xl border border-gray-200 bg-white overflow-hidden hover:border-gray-300 transition-colors max-w-[50%]">
                                                    {/* Card Header — mini hero */}
                                                    <div className="flex items-center gap-2 px-3 py-2.5 bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#111827] rounded-t-xl">
                                                        <MessageSquarePlus className="h-3.5 w-3.5 text-gray-400" />
                                                        <input
                                                            type="text"
                                                            value={card.titulo}
                                                            onChange={e => {
                                                                const v = e.target.value;
                                                                setConsideracoes(prev => prev.map((c, i) => i === cardIdx ? { ...c, titulo: v, isModified: c.template_id ? true : c.isModified } : c));
                                                            }}
                                                            placeholder="Título da consideração..."
                                                            className="flex-1 text-xs font-semibold text-white bg-transparent border-none outline-none placeholder:text-gray-500"
                                                        />
                                                        {card.template_id && card.isModified && (
                                                            <button type="button" title="Criar novo template a partir deste" className="text-[9px] text-gray-400 hover:text-white border border-gray-600 rounded-md px-2 py-0.5 hover:bg-white/10 transition-colors whitespace-nowrap font-medium">
                                                                + Novo template
                                                            </button>
                                                        )}
                                                        <button type="button" onClick={() => setConsideracoes(prev => prev.filter((_, i) => i !== cardIdx))} className="text-gray-500 hover:text-red-400 transition-colors p-0.5">
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>

                                                    <div className="p-3 space-y-2">
                                                        {/* Description — Rich Text (Tiptap) */}
                                                        <Suspense fallback={<div className="w-full h-12 bg-gray-50 rounded-lg animate-pulse" />}>
                                                            <RichTextResponse
                                                                value={card.descricao}
                                                                onChange={(html) => setConsideracoes(prev => prev.map((c, i) => i === cardIdx ? { ...c, descricao: html } : c))}
                                                                placeholder="Descrição / indicações gerais..."
                                                            />
                                                        </Suspense>

                                                        {/* Subtítulos */}
                                                        <div className="space-y-1.5">
                                                            {card.subtitulos.map((sub, subIdx) => (
                                                                <div
                                                                    key={sub.id}
                                                                    draggable
                                                                    onDragStart={() => setDragSubtituloIdx({ cardIdx, subIdx })}
                                                                    onDragOver={e => e.preventDefault()}
                                                                    onDrop={() => {
                                                                        if (dragSubtituloIdx && dragSubtituloIdx.cardIdx === cardIdx && dragSubtituloIdx.subIdx !== subIdx) {
                                                                            setConsideracoes(prev => prev.map((c, ci) => {
                                                                                if (ci !== cardIdx) return c;
                                                                                const subs = [...c.subtitulos];
                                                                                const [moved] = subs.splice(dragSubtituloIdx.subIdx, 1);
                                                                                subs.splice(subIdx, 0, moved);
                                                                                const orig = c.originalSubtitulos || [];
                                                                                const isModified = c.template_id ? (subs.map(s => s.texto).join('|') !== orig.join('|')) : c.isModified;
                                                                                return { ...c, subtitulos: subs, isModified };
                                                                            }));
                                                                        }
                                                                        setDragSubtituloIdx(null);
                                                                    }}
                                                                    onDragEnd={() => setDragSubtituloIdx(null)}
                                                                    className="rounded-lg border border-gray-100 bg-gray-50/50 px-2 py-1.5 group/sub hover:border-gray-200 transition-colors"
                                                                >
                                                                    <div className="flex items-start gap-1.5">
                                                                        <span className="text-[9px] text-gray-400 font-medium w-3 text-center flex-shrink-0 mt-1">{subIdx + 1}.</span>
                                                                        <GripVertical className="h-3 w-3 text-gray-300 cursor-grab flex-shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity mt-1" />
                                                                        <textarea
                                                                            value={sub.texto}
                                                                            onChange={e => {
                                                                                const v = e.target.value;
                                                                                setConsideracoes(prev => prev.map((c, ci) => {
                                                                                    if (ci !== cardIdx) return c;
                                                                                    const subs = c.subtitulos.map((s, si) => si === subIdx ? { ...s, texto: v } : s);
                                                                                    const orig = c.originalSubtitulos || [];
                                                                                    const isModified = c.template_id ? (subs.map(s => s.texto).join('|') !== orig.join('|')) : c.isModified;
                                                                                    return { ...c, subtitulos: subs, isModified };
                                                                                }));
                                                                            }}
                                                                            onInput={e => { const t = e.target as HTMLTextAreaElement; t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px'; }}
                                                                            placeholder={`Subtítulo ${subIdx + 1}...`}
                                                                            rows={1}
                                                                            className="flex-1 text-[11px] font-medium text-gray-600 bg-transparent border-none outline-none resize-none placeholder:text-gray-300 overflow-hidden"
                                                                        />
                                                                        <button type="button" onClick={() => {
                                                                            setConsideracoes(prev => prev.map((c, ci) => {
                                                                                if (ci !== cardIdx) return c;
                                                                                const subs = c.subtitulos.filter((_, si) => si !== subIdx);
                                                                                const orig = c.originalSubtitulos || [];
                                                                                const isModified = c.template_id ? (subs.map(s => s.texto).join('|') !== orig.join('|') || subs.length !== orig.length) : c.isModified;
                                                                                return { ...c, subtitulos: subs, isModified };
                                                                            }));
                                                                        }} className="text-gray-300 hover:text-red-400 opacity-0 group-hover/sub:opacity-100 transition-all p-0.5 mt-0.5">
                                                                            <X className="h-2.5 w-2.5" />
                                                                        </button>
                                                                    </div>
                                                                    {/* Response — Rich Text (Tiptap) */}
                                                                    <div className="mt-1 ml-[18px] group/rich">
                                                                        <Suspense fallback={<div className="w-full h-6 bg-gray-50 rounded animate-pulse" />}>
                                                                            <RichTextResponse
                                                                                value={sub.resposta}
                                                                                onChange={(html) => setConsideracoes(prev => prev.map((c, ci) => ci === cardIdx ? { ...c, subtitulos: c.subtitulos.map((s, si) => si === subIdx ? { ...s, resposta: html } : s) } : c))}
                                                                                placeholder="Resposta..."
                                                                            />
                                                                        </Suspense>
                                                                        <div className="flex items-center justify-end gap-1.5 mt-0.5">
                                                                            <label className="cursor-pointer text-gray-300 hover:text-gray-500 transition-colors" title="Anexar ficheiro">
                                                                                <Paperclip className="h-2.5 w-2.5" />
                                                                                <input type="file" multiple className="hidden" onChange={e => {
                                                                                    const files = e.target.files;
                                                                                    if (!files) return;
                                                                                    const newAnexos = Array.from(files).map(f => ({ file: f, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : '' }));
                                                                                    setConsideracoes(prev => prev.map((c, ci) => ci === cardIdx ? { ...c, subtitulos: c.subtitulos.map((s, si) => si === subIdx ? { ...s, anexos: [...s.anexos, ...newAnexos] } : s) } : c));
                                                                                    e.target.value = '';
                                                                                }} />
                                                                            </label>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>

                                                        {/* Add Subtítulo */}
                                                        <button type="button" onClick={() => {
                                                            setConsideracoes(prev => prev.map((c, ci) => {
                                                                if (ci !== cardIdx) return c;
                                                                const subs = [...c.subtitulos, { id: crypto.randomUUID(), texto: '', resposta: '', anexos: [] }];
                                                                const orig = c.originalSubtitulos || [];
                                                                const isModified = c.template_id ? (subs.length !== orig.length) : c.isModified;
                                                                return { ...c, subtitulos: subs, isModified: isModified || c.isModified };
                                                            }));
                                                        }} className="w-full py-1 text-[10px] text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center gap-1 font-medium">
                                                            <Plus className="h-2.5 w-2.5" /> Subtítulo
                                                        </button>

                                                        {/* Grouped Anexos */}
                                                        {(() => {
                                                            const allAnexos = card.subtitulos.flatMap((sub, si) => sub.anexos.map((a, ai) => ({ ...a, subIdx: si, anexoIdx: ai, subTexto: sub.texto || `Subtítulo ${si + 1}` })));
                                                            if (allAnexos.length === 0) return null;
                                                            return (
                                                                <div className="border-t border-gray-100 pt-2">
                                                                    <span className="text-[9px] font-semibold uppercase tracking-wider text-gray-400">Anexos</span>
                                                                    <div className="mt-1 space-y-0.5">
                                                                        {allAnexos.map((a, idx) => (
                                                                            <div key={idx} className="flex items-center gap-2 text-[10px] text-gray-500 rounded px-2 py-1 hover:bg-gray-50 group/anexo transition-colors">
                                                                                {a.preview ? (
                                                                                    <img src={a.preview} alt="" className="h-4 w-4 rounded object-cover flex-shrink-0" />
                                                                                ) : (
                                                                                    <FileText className="h-3 w-3 text-gray-300 flex-shrink-0" />
                                                                                )}
                                                                                <span className="flex-1 truncate">Anexo resp. {a.subTexto} — {a.file.name}</span>
                                                                                <button type="button" onClick={() => {
                                                                                    setConsideracoes(prev => prev.map((c, ci) => ci === cardIdx ? { ...c, subtitulos: c.subtitulos.map((s, si) => si === a.subIdx ? { ...s, anexos: s.anexos.filter((_, ai) => ai !== a.anexoIdx) } : s) } : c));
                                                                                }} className="text-gray-300 hover:text-red-400 opacity-0 group-hover/anexo:opacity-100 transition-all">
                                                                                    <X className="h-2.5 w-2.5" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })()}
                                                    </div>
                                                </div>
                                            ))}

                                            {/* Add Consideration Button */}
                                            <button type="button" onClick={async () => {
                                                setShowTemplatePicker(true);
                                                if (availableTemplates.length === 0) {
                                                    setLoadingTemplates(true);
                                                    try {
                                                        const templates = await considerationsService.getTemplates();
                                                        setAvailableTemplates(templates);
                                                    } catch (err) {
                                                        console.error('Error loading templates:', err);
                                                    } finally {
                                                        setLoadingTemplates(false);
                                                    }
                                                }
                                            }} className="w-full py-2 text-[11px] text-gray-400 hover:text-gray-600 rounded-lg border border-dashed border-gray-200 hover:border-gray-300 hover:bg-gray-50/50 transition-all flex items-center justify-center gap-1.5 font-medium">
                                                <Plus className="h-3 w-3" /> Adicionar Consideração
                                            </button>
                                        </div>
                                    )}

                                    {consideracoesCollapsed && consideracoes.length > 0 && (
                                        <p className="text-[9px] text-gray-400 text-center pb-2">{consideracoes.length} consideração(ões)</p>
                                    )}
                                </div>

                                {/* Error */}
                                {error && (
                                    <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg">{error}</p>
                                )}
                            </div>

                            {/* Actions — fixed at bottom */}
                            <div className="flex gap-2 p-4 border-t border-gray-100 shrink-0 bg-white">
                                <Button type="button" variant="outline" className="h-9 px-3 text-xs" onClick={onClose}>
                                    Cancelar
                                </Button>
                                <Button type="button" variant="outline" className="flex-1 h-9 gap-1.5 text-xs border-amber-300 text-amber-700 hover:bg-amber-50" onClick={() => setShowSaveConfirm(true)} disabled={savingDraft}>
                                    {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>💾</span>}
                                    Guardar Rascunho
                                </Button>
                                <Button type="button" className="flex-1 h-9 gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => setShowFinalizeConfirm(true)} disabled={submitting}>
                                    {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                    Finalizar
                                </Button>
                            </div>

                            {/* Modal Confirmar Guardar Rascunho */}
                            {showSaveConfirm && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowSaveConfirm(false)}>
                                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                                        <div className="text-center mb-4">
                                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-amber-100 flex items-center justify-center"><span className="text-2xl">💾</span></div>
                                            <h3 className="font-semibold text-gray-900">Guardar Rascunho</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">O plano será guardado como <strong>rascunho</strong>. Terá de o <strong>finalizar</strong> para gerar o pedido de criação.</p>
                                        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">⏰ Rascunhos expiram em 2 dias se não forem finalizados.</p>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setShowSaveConfirm(false)}>Cancelar</Button>
                                            <Button type="button" className="flex-1 h-9 bg-amber-500 hover:bg-amber-600" onClick={handleSaveDraft} disabled={savingDraft}>
                                                {savingDraft ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '💾 Guardar'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Modal Confirmar Finalizar */}
                            {showFinalizeConfirm && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowFinalizeConfirm(false)}>
                                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
                                        <div className="text-center mb-4">
                                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="h-6 w-6 text-emerald-600" /></div>
                                            <h3 className="font-semibold text-gray-900">Finalizar Plano</h3>
                                        </div>
                                        <p className="text-sm text-gray-600 mb-4">Tem a certeza que pretende <strong>finalizar</strong>? O <strong>pedido de criação</strong> do plano de tratamento será enviado.</p>
                                        <div className="flex gap-2">
                                            <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => setShowFinalizeConfirm(false)}>Cancelar</Button>
                                            <Button type="submit" className="flex-1 h-9 bg-emerald-600 hover:bg-emerald-700" disabled={submitting}>
                                                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : '✅ Finalizar'}
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </form>
                    )}
                </div >
            </div >

            {/* Odontograma Modal — renderizado fora do modal principal */}
            < OdontogramModal
                open={showOdontogram}
                onClose={() => setShowOdontogram(false)
                }
                teeth={odontogramTeeth}
                workTypes={workTypes.map(wt => ({ id: wt.id, nome: wt.nome, cor: wt.cor }))}
                onChange={handleOdontogramChange}
                pendingAssignments={pendingAssignments}
            />
            {cameraTarget && (
                <CameraOverlay
                    onCapture={(file: File) => {
                        cameraTarget.setter(prev => ({
                            files: [...prev.files, file],
                            previews: [...prev.previews, URL.createObjectURL(file)],
                        }));
                    }}
                    onClose={() => setCameraTarget(null)}
                    nativeCamKey={cameraTarget.key}
                />
            )}

            {/* Mobile multi-select: floating bar */}
            {
                isTouchDevice && selectedPhotos.size > 0 && (
                    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white border-t-2 border-amber-400 shadow-2xl px-4 py-3 flex items-center justify-between gap-3 safe-area-pb">
                        <span className="text-sm font-medium text-gray-700">✓ {selectedPhotos.size} foto(s)</span>
                        <div className="flex items-center gap-2">
                            <button type="button" onClick={() => setShowMovePicker(true)} className="px-4 py-2 bg-amber-500 text-white text-sm font-semibold rounded-lg shadow hover:bg-amber-600 transition-colors flex items-center gap-1.5">
                                📤 Mover para...
                            </button>
                            <button type="button" onClick={clearSelection} className="px-3 py-2 bg-gray-100 text-gray-500 text-sm rounded-lg hover:bg-gray-200 transition-colors">
                                ✕
                            </button>
                        </div>
                    </div>
                )
            }

            {/* Mobile multi-select: destination picker */}
            {
                showMovePicker && (
                    <div className="fixed inset-0 z-[10000] bg-black/50 flex items-end justify-center" onClick={() => setShowMovePicker(false)}>
                        <div className="bg-white rounded-t-2xl w-full max-w-lg max-h-[70vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                            <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                                <span className="text-sm font-semibold text-gray-700">📤 Mover {selectedPhotos.size} foto(s) para...</span>
                                <button type="button" onClick={() => setShowMovePicker(false)} className="text-gray-400 hover:text-gray-600 text-lg">✕</button>
                            </div>
                            <div className="py-2">
                                {(() => {
                                    const groups: Record<string, { key: string; label: string }[]> = {};
                                    const sourceKeys = new Set(Array.from(selectedPhotos).map(s => s.substring(0, s.lastIndexOf(':'))));
                                    photoFieldsMap.forEach(f => {
                                        if (sourceKeys.has(f.key)) return; // exclude source fields
                                        if (!groups[f.group]) groups[f.group] = [];
                                        groups[f.group].push({ key: f.key, label: f.label });
                                    });
                                    return Object.entries(groups).map(([group, items]) => (
                                        <div key={group}>
                                            <p className="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50">{group}</p>
                                            {items.map(item => (
                                                <button key={item.key} type="button" onClick={() => moveSelectedPhotos(item.key)} className="w-full text-left px-6 py-3 text-sm text-gray-700 hover:bg-amber-50 active:bg-amber-100 transition-colors border-b border-gray-50 flex items-center gap-2">
                                                    <span className="text-amber-500">→</span> {item.label}
                                                </button>
                                            ))}
                                        </div>
                                    ));
                                })()}
                            </div>
                        </div>
                    </div>
                )
            }
        </>
    );
}
