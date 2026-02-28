'use client';

import { useState } from 'react';
import { PatientFullDetails } from '@/services/patientsService';

interface PatientPrintSheetProps {
    patient: PatientFullDetails;
    onClose: () => void;
}

export default function PatientPrintSheet({ patient, onClose }: PatientPrintSheetProps) {
    const [printCount, setPrintCount] = useState(1);

    const getInitials = (name: string) => {
        if (!name) return '?';
        const clean = name.replace(/\s*\(.*\)\s*$/, '').trim();
        const words = clean.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return '?';
        if (words.length === 1) return words[0].charAt(0).toUpperCase();
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    // Obter fase activa (se existir)
    const activePlan = patient.treatment_plans?.find(p => p.estado === 'activo');
    const activePhase = activePlan?.phases?.find(ph => ph.estado === 'em_curso' || ph.estado === 'pendente');
    const phaseName = activePhase?.nome || '—';

    const handlePrint = () => {
        const today = new Date().toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        const printWindow = window.open('', '_blank', 'width=794,height=1123');
        if (!printWindow) return;

        printWindow.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AsymLAB - Ficha Clínica — ${patient.t_id} ${patient.nome}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');

*, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
html { margin: 0 !important; padding: 0 !important; width: 210mm; height: 297mm; overflow: hidden; }

@page {
    size: A4;
    margin: 0 !important;
}

body {
    font-family: 'Inter', -apple-system, sans-serif;
    width: 210mm;
    height: 297mm;
    margin: 0 !important;
    padding: 0 !important;
    background: white;
    color: #1a1a2e;
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

/* ═══════════════ HEADER ═══════════════ */
.header {
    background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
    color: white;
    padding: 0;
    position: relative;
    overflow: hidden;
    width: 100%;
}

.header::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: radial-gradient(ellipse at 15% 50%, rgba(245, 158, 11, 0.06) 0%, transparent 60%);
}

.header-inner {
    position: relative;
    z-index: 1;
    padding: 28px 40px 24px 40px;
}

/* Linha 1: Avatar + ID + Nome (esquerda) | Nº Impressão (direita) */
.header-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 20px;
}

.header-patient {
    display: flex;
    align-items: center;
    gap: 16px;
}

.avatar {
    width: 56px;
    height: 56px;
    border-radius: 50%;
    background: linear-gradient(135deg, rgba(245,158,11,0.2), rgba(245,158,11,0.08));
    border: 2px solid rgba(245,158,11,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 700;
    color: #f59e0b;
    flex-shrink: 0;
}

.patient-id {
    display: inline-block;
    font-family: 'Courier New', monospace;
    font-size: 12px;
    font-weight: 700;
    color: #f59e0b;
    background: rgba(245,158,11,0.15);
    padding: 2px 10px;
    border-radius: 4px;
    border: 1px solid rgba(245,158,11,0.25);
    letter-spacing: 1px;
    margin-bottom: 4px;
}

.patient-name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.3px;
    line-height: 1.2;
}

.print-number {
    font-size: 10px;
    color: rgba(255,255,255,0.35);
    text-align: right;
    line-height: 1.5;
}

.print-number strong {
    color: rgba(255,255,255,0.55);
}

/* Linha 2: Grelha Clínica | Médico | Fase */
.header-fields {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0;
    border-top: 1px solid rgba(255,255,255,0.08);
    padding-top: 14px;
}

.field {
    padding: 0 12px;
    border-right: 1px solid rgba(255,255,255,0.06);
}

.field:first-child { padding-left: 0; }
.field:last-child { border-right: none; padding-right: 0; }

.field-label {
    font-size: 8px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1.2px;
    color: rgba(255,255,255,0.35);
    margin-bottom: 3px;
}

.field-value {
    font-size: 12px;
    font-weight: 500;
    color: white;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* ═══════════════ BODY ═══════════════ */
.body {
    flex: 1;
    padding: 28px 40px;
    display: flex;
    flex-direction: column;
}

.section-title {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #94a3b8;
    margin-bottom: 10px;
    padding-bottom: 8px;
    border-bottom: 1px solid #e2e8f0;
}

.observations {
    flex: 1;
}

/* ═══════════════ FOOTER ═══════════════ */
.footer {
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
    padding: 16px 40px;
    text-align: center;
}

.footer-lab-name {
    font-size: 10px;
    font-weight: 700;
    color: #334155;
    letter-spacing: 0.5px;
    margin-bottom: 4px;
}

.footer-lab-details {
    font-size: 8px;
    color: #94a3b8;
    line-height: 1.8;
}

.footer-print-date {
    margin-top: 6px;
    font-size: 8px;
    color: #b0b8c4;
}

@media print {
    html, body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
        margin: 0 !important;
        padding: 0 !important;
    }
}
</style>
</head>
<body>
<!-- ═══ HEADER ═══ -->
<div class="header">
    <div class="header-inner">
        <!-- Linha 1: Paciente + Nº -->
        <div class="header-top">
            <div class="header-patient">
                <div class="avatar">${getInitials(patient.nome)}</div>
                <div>
                    <div class="patient-id">${patient.t_id}</div>
                    <div class="patient-name">${patient.nome}</div>
                </div>
            </div>
            <div class="print-number">
                <div>Impressão nº</div>
                <div><strong>${printCount}</strong></div>
            </div>
        </div>

        <!-- Linha 2: Campos informativos -->
        <div class="header-fields">
            <div class="field">
                <div class="field-label">Clínica</div>
                <div class="field-value">${patient.clinica?.commercial_name || '—'}</div>
            </div>
            <div class="field">
                <div class="field-label">Médico</div>
                <div class="field-value">${patient.medico?.full_name || '—'}</div>
            </div>
            <div class="field">
                <div class="field-label">Fase</div>
                <div class="field-value">${phaseName}</div>
        </div>
    </div>
</div>

<!-- ═══ BODY ═══ -->
<div class="body">
    <div class="section-title">Observações Clínicas</div>
    <div class="observations"></div>
</div>

<!-- ═══ FOOTER ═══ -->
<div class="footer">
    <div class="footer-lab-name">AsymLAB — Laboratório de Prótese Dentária</div>
    <div class="footer-lab-details">
        NIF: 517 852 463 · Rua do Laboratório, 123 · 4000-001 Porto · Tel: +351 912 345 678 · geral@asymlab.pt
    </div>
    <div class="footer-print-date">Impresso em ${today}</div>
</div>
</body>
</html>`);

        printWindow.document.close();

        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };

        // Incrementar contador para próxima impressão
        setPrintCount(prev => prev + 1);
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full overflow-hidden">
                {/* Preview mini header */}
                <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-6 py-5 text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-amber-500/15 ring-2 ring-amber-500/30 flex items-center justify-center">
                            <span className="text-sm font-bold text-amber-400">{getInitials(patient.nome)}</span>
                        </div>
                        <div>
                            <span className="font-mono text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded">{patient.t_id}</span>
                            <h3 className="text-base font-semibold mt-0.5">{patient.nome}</h3>
                        </div>
                    </div>
                </div>

                {/* Info */}
                <div className="px-6 py-4 space-y-3">
                    <p className="text-sm text-gray-600">
                        Ficha clínica A4 com header escuro, campos informativos, e área de observações em branco.
                    </p>
                    <div className="text-xs text-gray-400 space-y-1.5">
                        <div className="flex justify-between">
                            <span>Clínica</span>
                            <span className="text-gray-600 font-medium">{patient.clinica?.commercial_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Médico</span>
                            <span className="text-gray-600 font-medium">{patient.medico?.full_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Fase</span>
                            <span className="text-gray-600 font-medium">{phaseName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Data</span>
                            <span className="text-gray-600 font-medium">{new Date().toLocaleDateString('pt-PT')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Nº Impressão</span>
                            <span className="text-gray-600 font-medium">{printCount}</span>
                        </div>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-5 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => {
                            handlePrint();
                            onClose();
                        }}
                        className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0f172a] to-[#1e293b] rounded-xl hover:from-[#1e293b] hover:to-[#334155] transition-all shadow-lg"
                    >
                        🖨️ Imprimir
                    </button>
                </div>
            </div>
        </div>
    );
}
