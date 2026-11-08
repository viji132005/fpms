import type { jsPDF as jsPDFType } from 'jspdf';
import * as jspdfNamespace from 'jspdf';
import type { FacultyPersonalGridCell } from '../types/index.ts';

const jsPDF = (jspdfNamespace as any).jsPDF || (jspdfNamespace as any).default || jspdfNamespace;

export interface PersonalTimetablePdfOptions {
  institutionName?: string;
  departmentName?: string;
  deptCode?: string;
  academicYear?: string;
  facultyName: string;
  designation?: string;
  staffId?: string;
  email?: string;
  grid: Record<string, FacultyPersonalGridCell>;
}

export const PERSONAL_DAYS = [
  { key: 'MON', label: 'Monday' },
  { key: 'TUE', label: 'Tuesday' },
  { key: 'WED', label: 'Wednesday' },
  { key: 'THU', label: 'Thursday' },
  { key: 'FRI', label: 'Friday' },
];

export const PERSONAL_PERIODS = [
  { index: 0, timeRange: '09:00 - 10:00', label: 'I (09:00 - 10:00)', isBreak: false },
  { index: 1, timeRange: '10:00 - 11:00', label: 'II (10:00 - 11:00)', isBreak: false },
  { index: 2, timeRange: '11:00 - 11:25', label: 'TEA BREAK', isBreak: true },
  { index: 3, timeRange: '11:25 - 12:20', label: 'III (11:25 - 12:20)', isBreak: false },
  { index: 4, timeRange: '12:20 - 01:15', label: 'IV (12:20 - 01:15)', isBreak: false },
  { index: 5, timeRange: '01:15 - 02:00', label: 'LUNCH BREAK', isBreak: true },
  { index: 6, timeRange: '02:00 - 03:00', label: 'V (02:00 - 03:00)', isBreak: false },
  { index: 7, timeRange: '03:00 - 04:00', label: 'VI (03:00 - 04:00)', isBreak: false },
];

export async function generatePersonalTimetablePdf(options: PersonalTimetablePdfOptions): Promise<jsPDFType> {
  const {
    institutionName = 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    departmentName = 'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING',
    deptCode = 'ISE',
    academicYear = '2026-27',
    facultyName,
    designation = 'Assistant Professor',
    staffId = '',
    email,
    grid,
  } = options;

  // Landscape A4: 297mm x 210mm
  const doc: jsPDFType = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 12;

  // Outer Border
  doc.setDrawColor(123, 17, 19); // #7B1113
  doc.setLineWidth(0.6);
  doc.rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2);

  // Inner subtle border
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.rect(margin + 1.5, margin + 1.5, pageWidth - (margin + 1.5) * 2, pageHeight - (margin + 1.5) * 2);

  // Header Title
  let y = margin + 8;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(123, 17, 19);
  doc.text(institutionName, pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text('Affiliated to VTU, Belagavi & Approved by AICTE, New Delhi', pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(30, 41, 59);
  doc.text(departmentName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 5;
  doc.setFontSize(10);
  doc.setTextColor(123, 17, 19);
  doc.text(`FACULTY INDIVIDUAL TEACHING SCHEDULE — ACADEMIC YEAR ${academicYear}`, pageWidth / 2, y, { align: 'center' });

  // Faculty Details Box
  y += 4;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.3);
  doc.rect(margin + 4, y, pageWidth - (margin + 4) * 2, 10, 'FD');

  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.setFont('helvetica', 'bold');
  doc.text('Faculty Name:', margin + 7, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(facultyName, margin + 28, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Designation:', margin + 95, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(designation, margin + 115, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Staff ID:', margin + 180, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(staffId, margin + 195, y + 6.5);

  doc.setFont('helvetica', 'bold');
  doc.text('Dept:', margin + 235, y + 6.5);
  doc.setFont('helvetica', 'normal');
  doc.text(deptCode, margin + 245, y + 6.5);

  // Grid Table setup
  y += 14;
  const tableX = margin + 4;
  const tableW = pageWidth - (margin + 4) * 2; // ~265mm
  const dayColW = 25; // 25mm for Day column
  const remainingW = tableW - dayColW; // 240mm
  const colCount = PERSONAL_PERIODS.length; // 8 periods (including 2 breaks)
  // Let break columns be thinner: 14mm each, remaining 6 periods share (240 - 28) = 212 / 6 = 35.33mm each
  const breakColW = 14;
  const normalColW = (remainingW - breakColW * 2) / 6;

  const colWidths = PERSONAL_PERIODS.map((p) => (p.isBreak ? breakColW : normalColW));

  // Table Header
  const headerHeight = 12;
  doc.setFillColor(123, 17, 19); // #7B1113
  doc.rect(tableX, y, dayColW, headerHeight, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('DAY / TIME', tableX + dayColW / 2, y + 7, { align: 'center' });

  let curX = tableX + dayColW;
  PERSONAL_PERIODS.forEach((p, idx) => {
    const w = colWidths[idx];
    doc.setFillColor(p.isBreak ? 90 : 123, p.isBreak ? 20 : 17, p.isBreak ? 25 : 19);
    doc.rect(curX, y, w, headerHeight, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    if (p.isBreak) {
      doc.text(p.label, curX + w / 2, y + 5.5, { align: 'center' });
      doc.setFontSize(5.5);
      doc.text(p.timeRange, curX + w / 2, y + 9.5, { align: 'center' });
    } else {
      doc.text(`PERIOD ${idx < 2 ? idx + 1 : idx < 5 ? idx : idx - 1}`, curX + w / 2, y + 4.5, { align: 'center' });
      doc.setFontSize(6);
      doc.text(p.timeRange, curX + w / 2, y + 8.5, { align: 'center' });
    }

    curX += w;
  });

  // Table Rows (Monday to Friday)
  y += headerHeight;
  const rowHeight = 18;

  PERSONAL_DAYS.forEach((day, rIdx) => {
    // Day Label Cell
    doc.setFillColor(rIdx % 2 === 0 ? 250 : 255, rIdx % 2 === 0 ? 250 : 255, rIdx % 2 === 0 ? 250 : 255);
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(tableX, y, dayColW, rowHeight, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(123, 17, 19);
    doc.text(day.label.toUpperCase(), tableX + dayColW / 2, y + rowHeight / 2 - 1, { align: 'center' });
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`(${day.key})`, tableX + dayColW / 2, y + rowHeight / 2 + 3.5, { align: 'center' });

    let cellX = tableX + dayColW;
    PERSONAL_PERIODS.forEach((period, pIdx) => {
      const w = colWidths[pIdx];

      if (period.isBreak) {
        // Break cell with diagonal stripes or soft fill
        doc.setFillColor(241, 245, 249);
        doc.rect(cellX, y, w, rowHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6);
        doc.setTextColor(148, 163, 184);
        doc.text(period.index === 2 ? 'TEA' : 'LUNCH', cellX + w / 2, y + rowHeight / 2 - 1, { align: 'center' });
        doc.text('BREAK', cellX + w / 2, y + rowHeight / 2 + 3, { align: 'center' });
      } else {
        const slotKey = `${day.key}-${period.index}`;
        const slotData = grid[slotKey];

        const hasData = slotData && slotData.subject && slotData.subject.trim().length > 0;

        if (hasData) {
          doc.setFillColor(254, 242, 242); // rose-50
          doc.rect(cellX, y, w, rowHeight, 'FD');

          // Subject Title
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(123, 17, 19);
          const subjText = slotData.subject.length > 22 ? slotData.subject.substring(0, 20) + '...' : slotData.subject;
          doc.text(subjText, cellX + w / 2, y + 5.5, { align: 'center' });

          // Year / Semester tag
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(6.5);
          doc.setTextColor(30, 41, 59);
          if (slotData.year) {
            doc.text(slotData.year, cellX + w / 2, y + 10, { align: 'center' });
          }

          // Room
          if (slotData.room) {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.setTextColor(100, 116, 139);
            doc.text(`Room: ${slotData.room}`, cellX + w / 2, y + 14.5, { align: 'center' });
          }
        } else {
          doc.setFillColor(255, 255, 255);
          doc.rect(cellX, y, w, rowHeight, 'FD');
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.setTextColor(203, 213, 225);
          doc.text('—', cellX + w / 2, y + rowHeight / 2 + 1, { align: 'center' });
        }
      }

      cellX += w;
    });

    y += rowHeight;
  });

  // Footer Signatures
  const sigY = pageHeight - margin - 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);

  doc.text('Signature of Faculty', margin + 15, sigY);
  doc.text('Timetable Coordinator', margin + 90, sigY);
  doc.text('Head of Department (HOD)', margin + 170, sigY);
  doc.text('Principal', margin + 245, sigY);

  return doc;
}
