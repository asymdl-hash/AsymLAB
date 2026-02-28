'use client';

import { useRef } from 'react';
import { PatientFullDetails } from '@/services/patientsService';

interface PatientPrintSheetProps {
    patient: PatientFullDetails;
    onClose: () => void;
}

export default function PatientPrintSheet({ patient, onClose }: PatientPrintSheetProps) {
    const printRef = useRef<HTMLDivElement>(null);

    const getInitials = (name: string) => {
        if (!name) return '?';
        const clean = name.replace(/\s*\(.*\)\s*$/, '').trim();
        const words = clean.split(/\s+/).filter(w => w.length > 0);
        if (words.length === 0) return '?';
        if (words.length === 1) return words[0].charAt(0).toUpperCase();
        return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase();
    };

    const handlePrint = () => {
        const printContent = printRef.current;
        if (!printContent) return;

        const printWindow = window.open('', '_blank', 'width=794,height=1123');
        if (!printWindow) return;

        const today = new Date().toLocaleDateString('pt-PT', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>Ficha Clínica — ${patient.t_id} ${patient.nome}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
                    
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    
                    @page {
                        size: A4;
                        margin: 0;
                    }
                    
                    body {
                        font-family: 'Inter', -apple-system, sans-serif;
                        width: 210mm;
                        min-height: 297mm;
                        margin: 0;
                        padding: 0;
                        background: white;
                        color: #1a1a2e;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    /* === HEADER === */
                    .header {
                        background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
                        color: white;
                        padding: 28px 36px 24px 36px;
                        position: relative;
                        overflow: hidden;
                    }
                    
                    .header::before {
                        content: '';
                        position: absolute;
                        top: 0; left: 0; right: 0; bottom: 0;
                        background: radial-gradient(ellipse at 20% 50%, rgba(245, 158, 11, 0.08) 0%, transparent 60%);
                    }
                    
                    .header-content {
                        position: relative;
                        z-index: 1;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }
                    
                    .header-left {
                        display: flex;
                        align-items: center;
                        gap: 18px;
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
                    
                    .patient-info h1 {
                        font-size: 22px;
                        font-weight: 700;
                        letter-spacing: -0.5px;
                        margin-bottom: 4px;
                    }
                    
                    .patient-id {
                        display: inline-block;
                        font-family: 'Courier New', monospace;
                        font-size: 13px;
                        font-weight: 700;
                        color: #f59e0b;
                        background: rgba(245,158,11,0.15);
                        padding: 2px 10px;
                        border-radius: 4px;
                        border: 1px solid rgba(245,158,11,0.25);
                        letter-spacing: 1px;
                    }
                    
                    .header-right {
                        text-align: right;
                        font-size: 11px;
                        color: rgba(255,255,255,0.7);
                        line-height: 1.8;
                    }
                    
                    .header-right .label {
                        color: rgba(255,255,255,0.4);
                        font-size: 9px;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    
                    .header-right .value {
                        color: white;
                        font-weight: 500;
                    }
                    
                    /* === BODY === */
                    .body {
                        flex: 1;
                        padding: 24px 36px;
                        display: flex;
                        flex-direction: column;
                    }
                    
                    .section-title {
                        font-size: 11px;
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1.5px;
                        color: #64748b;
                        margin-bottom: 12px;
                        padding-bottom: 6px;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    
                    .observations {
                        flex: 1;
                        min-height: 160mm;
                    }
                    
                    /* === FOOTER === */
                    .footer {
                        padding: 16px 36px;
                        border-top: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        font-size: 9px;
                        color: #94a3b8;
                    }
                    
                    .footer-left {
                        font-weight: 600;
                        color: #64748b;
                    }
                    
                    .footer-right {
                        text-align: right;
                    }
                    
                    @media print {
                        body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    }
                </style>
            </head>
            <body>
                <!-- HEADER edge-to-edge -->
                <div class="header">
                    <div class="header-content">
                        <div class="header-left">
                            <div class="avatar">${getInitials(patient.nome)}</div>
                            <div class="patient-info">
                                <div class="patient-id">${patient.t_id}</div>
                                <h1>${patient.nome}</h1>
                            </div>
                        </div>
                        <div class="header-right">
                            <div><span class="label">Clínica</span></div>
                            <div><span class="value">${patient.clinica?.commercial_name || '—'}</span></div>
                            <div style="margin-top: 6px"><span class="label">Médico</span></div>
                            <div><span class="value">${patient.medico?.full_name || '—'}</span></div>
                            <div style="margin-top: 6px"><span class="label">Data</span></div>
                            <div><span class="value">${today}</span></div>
                        </div>
                    </div>
                </div>
                
                <!-- BODY -->
                <div class="body">
                    <div class="section-title">Observações Clínicas</div>
                    <div class="observations"></div>
                </div>
                
                <!-- FOOTER -->
                <div class="footer">
                    <div class="footer-left">AsymLAB — Laboratório de Prótese Dentária</div>
                    <div class="footer-right">
                        ${patient.t_id} · ${patient.nome} · Impresso em ${today}
                    </div>
                </div>
            </body>
            </html>
        `);

        printWindow.document.close();

        // Esperar fonts carregarem antes de imprimir
        printWindow.onload = () => {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
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
                        Ficha clínica para impressão com área de observações em branco.
                    </p>
                    <div className="text-xs text-gray-400 space-y-1">
                        <div className="flex justify-between">
                            <span>Clínica</span>
                            <span className="text-gray-600 font-medium">{patient.clinica?.commercial_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Médico</span>
                            <span className="text-gray-600 font-medium">{patient.medico?.full_name || '—'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Data</span>
                            <span className="text-gray-600 font-medium">{new Date().toLocaleDateString('pt-PT')}</span>
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

            {/* Hidden print content */}
            <div ref={printRef} className="hidden" />
        </div>
    );
}
