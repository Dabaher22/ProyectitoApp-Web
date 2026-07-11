import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TraineeReport } from './reportData';

export function exportTraineeReportPdf(report: TraineeReport, traineeName: string, scopeLabel: string): void {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  let y = 20;

  doc.setTextColor(0, 0, 0);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('REPORTE DE PROGRESO', margin, y);
  y += 9;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Asesorado: ${traineeName}`, margin, y);
  y += 6;
  doc.text(`Alcance: ${scopeLabel}`, margin, y);
  y += 6;
  const generatedDate = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.text(`Generado el: ${generatedDate}`, margin, y);
  y += 5;

  doc.setDrawColor(0, 0, 0);
  doc.line(margin, y, pageWidth - margin, y);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('RESUMEN GENERAL', margin, y);
  y += 7;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  const summaryLines = [
    `Sesiones totales: ${report.totalSessions}`,
    `Promedio de entrenamientos por semana: ${report.avgPerWeek.toFixed(1)}`,
    `Duración promedio por entrenamiento: ${report.avgDurationLabel}`,
    `Periodo: ${report.periodLabel}`,
  ];
  for (const line of summaryLines) {
    doc.text(line, margin, y);
    y += 6;
  }
  y += 3;

  if (report.routines.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Sin sesiones registradas para este alcance.', margin, y);
  }

  for (const routine of report.routines) {
    if (y > pageHeight - 45) {
      doc.addPage();
      y = 20;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text(`RUTINA: ${routine.routineName.toUpperCase()}`, margin, y);
    y += 4;

    const body = routine.exercises.length > 0
      ? routine.exercises.map((ex) => [
          ex.name,
          `${ex.startReps} reps x ${ex.startWeight}\n${ex.startDate}`,
          `${ex.latestReps} reps x ${ex.latestWeight}\n${ex.latestDate}`,
          ex.deltaLabel,
        ])
      : [['Sin ejercicios registrados', '—', '—', '—']];

    autoTable(doc, {
      startY: y + 2,
      margin: { left: margin, right: margin },
      head: [['EJERCICIO', 'INICIO', 'ACTUAL', 'CAMBIO']],
      body,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', lineWidth: 0.3 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
  }

  const totalPages = doc.internal.pages.length - 1;
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  }

  const fileName = `reporte-${traineeName.trim().replace(/\s+/g, '-').toLowerCase()}.pdf`;
  doc.save(fileName);
}
