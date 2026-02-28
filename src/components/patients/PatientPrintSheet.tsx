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

  const activePlan = patient.treatment_plans?.find(p => p.estado === 'activo');
  const activePhase = activePlan?.phases?.find(ph => ph.estado === 'em_curso' || ph.estado === 'pendente');
  const phaseName = activePhase?.nome || '—';

  const handlePrint = () => {
    const today = new Date().toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const printWindow = window.open('', '_blank', 'width=794,height=1123');
    if (!printWindow) return;

    const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>AsymLAB - Ficha Clínica — ${patient.t_id} ${patient.nome}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
@page{size:A4;margin:0!important}
html,body{margin:0!important;padding:0!important;background:#fff;font-family:'Inter',sans-serif;color:#1a1a2e}
.page{position:relative;width:210mm;min-height:297mm;background:#fff;padding-bottom:80px}
.header{background:linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%);color:#fff;position:relative;overflow:hidden}
.header::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 15% 50%,rgba(245,158,11,.06)0%,transparent 60%)}
.header-inner{position:relative;z-index:1;padding:28px 40px 24px}
.header-top{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px}
.header-patient{display:flex;align-items:center;gap:16px}
.avatar{width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,rgba(245,158,11,.2),rgba(245,158,11,.08));border:2px solid rgba(245,158,11,.3);display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;color:#f59e0b;flex-shrink:0}
.patient-id{display:inline-block;font-family:'Inter',sans-serif;font-size:13px;font-weight:700;color:#f59e0b;background:rgba(245,158,11,.15);padding:3px 12px;border-radius:6px;border:1px solid rgba(245,158,11,.25);letter-spacing:.5px;margin-bottom:4px}
.patient-name{font-size:22px;font-weight:700;letter-spacing:-.3px;line-height:1.2}
.print-number{font-size:10px;color:rgba(255,255,255,.35);text-align:right;line-height:1.5}
.print-number strong{color:rgba(255,255,255,.55)}
.header-fields{display:flex;gap:40px;border-top:1px solid rgba(255,255,255,.08);padding-top:14px}
.field{padding:0 12px;border-right:1px solid rgba(255,255,255,.06)}
.field:first-child{padding-left:0}
.field:last-child{border-right:none;padding-right:0}
.field-label{font-size:8px;font-weight:600;text-transform:uppercase;letter-spacing:1.2px;color:rgba(255,255,255,.35);margin-bottom:3px}
.field-value{font-size:12px;font-weight:500;color:#fff;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.content{padding:28px 40px;background:#fff}
.section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#64748b;padding-bottom:8px;border-bottom:1px solid #e2e8f0}
.footer{position:absolute;bottom:0;left:0;right:0;background:#f8fafc;border-top:1px solid #e2e8f0;padding:16px 40px;text-align:center}
.footer-lab-name{font-size:10px;font-weight:700;color:#334155;letter-spacing:.5px;margin-bottom:4px}
.footer-lab-details{font-size:8px;color:#94a3b8;line-height:1.8}
.footer-print-date{margin-top:6px;font-size:8px;color:#b0b8c4}
@media print{html,body{-webkit-print-color-adjust:exact;print-color-adjust:exact;margin:0!important;padding:0!important}}
</style>
</head>
<body>
<div class="page">

<div class="header">
  <div class="header-inner">
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
</div>

<div class="content">
  <div class="section-title">Observações Clínicas</div>
</div>

<div class="footer">
  <div class="footer-lab-name">AsymLAB — Laboratório de Prótese Dentária</div>
  <div class="footer-lab-details">NIF: 517 852 463 · Rua do Laboratório, 123 · 4000-001 Porto · Tel: +351 912 345 678 · geral@asymlab.pt</div>
  <div class="footer-print-date">Impresso em ${today}</div>
</div>

</div>
</body>
</html>`;

    printWindow.document.write(html);
    printWindow.document.close();

    printWindow.onload = () => {
      setTimeout(() => { printWindow.print(); }, 500);
    };

    setPrintCount(prev => prev + 1);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-[420px] w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a] px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-amber-500/15 ring-2 ring-amber-500/30 flex items-center justify-center">
              <span className="text-sm font-bold text-amber-400">{getInitials(patient.nome)}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded">{patient.t_id}</span>
              <h3 className="text-base font-semibold mt-0.5">{patient.nome}</h3>
            </div>
          </div>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-sm text-gray-600">Ficha clínica A4 com área de observações em branco.</p>
          <div className="text-xs text-gray-400 space-y-1.5">
            <div className="flex justify-between"><span>Clínica</span><span className="text-gray-600 font-medium">{patient.clinica?.commercial_name || '—'}</span></div>
            <div className="flex justify-between"><span>Médico</span><span className="text-gray-600 font-medium">{patient.medico?.full_name || '—'}</span></div>
            <div className="flex justify-between"><span>Fase</span><span className="text-gray-600 font-medium">{phaseName}</span></div>
            <div className="flex justify-between"><span>Nº Impressão</span><span className="text-gray-600 font-medium">{printCount}</span></div>
          </div>
        </div>
        <div className="px-6 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 text-sm font-medium text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors">Cancelar</button>
          <button onClick={() => { handlePrint(); onClose(); }} className="flex-1 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#0f172a] to-[#1e293b] rounded-xl hover:from-[#1e293b] hover:to-[#334155] transition-all shadow-lg">🖨️ Imprimir</button>
        </div>
      </div>
    </div>
  );
}
