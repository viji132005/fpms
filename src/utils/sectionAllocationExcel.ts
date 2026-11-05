import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import {
  StudentSectionAllocationRun,
  AllocatedStudent,
} from '../types/index.ts';

/**
 * Generates an Excel workbook template populated with current cohort students
 */
export function generatePerformanceTemplate(
  students: { usn: string; fullName: string }[],
  metric: 'CGPA' | 'SGPA',
  cohortDescription: string,
  semesterLabel?: string
): Uint8Array {
  const wb = XLSX.utils.book_new();

  const metricHeader = metric === 'SGPA' && semesterLabel
    ? `SGPA (${semesterLabel}) [Scale: 0.0 - 10.0]`
    : `${metric} [Scale: 0.0 - 10.0]`;

  const rows = students.map((s, idx) => ({
    'Sl. No': idx + 1,
    'University Seat Number (USN)': s.usn,
    'Student Full Name': s.fullName,
    [metricHeader]: '', // Left empty for entry
  }));

  const ws = XLSX.utils.json_to_sheet(rows);

  // Set column widths for readability
  ws['!cols'] = [
    { wch: 8 },  // Sl No
    { wch: 22 }, // USN
    { wch: 32 }, // Student Name
    { wch: 32 }, // Score Column
  ];

  XLSX.utils.book_append_sheet(wb, ws, `${metric}_Entry_Template`);

  // Instructions Sheet
  const instructions = [
    { 'Instruction Guide': 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE' },
    { 'Instruction Guide': 'Intelligent Student Section Allocation — Performance Data Sheet' },
    { 'Instruction Guide': `Target Cohort: ${cohortDescription}` },
    { 'Instruction Guide': `Selected Performance Metric: ${metric}` },
    { 'Instruction Guide': '------------------------------------------------------------' },
    { 'Instruction Guide': '1. Do NOT modify or rename the USN column.' },
    { 'Instruction Guide': '2. Enter numeric marks on a 0.00 to 10.00 scale (e.g., 8.75, 7.42, 6.80).' },
    { 'Instruction Guide': '3. Do not add students outside the official department cohort.' },
    { 'Instruction Guide': '4. Blank or missing cells will be flagged during validation.' },
    { 'Instruction Guide': '5. Save as .xlsx and upload via the FPMS Section Allocation screen.' },
  ];
  const wsInst = XLSX.utils.json_to_sheet(instructions);
  wsInst['!cols'] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsInst, 'Instructions');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

export interface ExcelValidationResult {
  totalExpected: number;
  matchedCount: number;
  validScoresCount: number;
  missingScoresCount: number;
  duplicateUsns: string[];
  unknownUsns: string[];
  invalidScores: { usn: string; rawValue: any; reason: string }[];
  scoresMap: Record<string, number>; // usn -> score
  errorSummary: string[];
  isValid: boolean;
}

/**
 * Parses uploaded Excel workbook and validates against the selected cohort
 */
export function parsePerformanceExcel(
  fileBuffer: ArrayBuffer,
  cohortStudents: { usn: string; id: string; fullName: string }[]
): ExcelValidationResult {
  const wb = XLSX.read(fileBuffer, { type: 'array' });
  const firstSheetName = wb.SheetNames[0];
  const worksheet = wb.Sheets[firstSheetName];
  const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet);

  const cohortUsnMap = new Map<string, { usn: string; id: string; fullName: string }>();
  cohortStudents.forEach((s) => {
    cohortUsnMap.set(s.usn.trim().toUpperCase(), s);
  });

  const scoresMap: Record<string, number> = {};
  const duplicateUsns: string[] = [];
  const unknownUsns: string[] = [];
  const invalidScores: { usn: string; rawValue: any; reason: string }[] = [];
  const seenUsns = new Set<string>();
  const matchedUsns = new Set<string>();
  const errorSummary: string[] = [];

  for (let idx = 0; idx < rawRows.length; idx++) {
    const row = rawRows[idx];

    // Find USN key
    const usnKey = Object.keys(row).find((k) =>
      k.toLowerCase().includes('usn') || k.toLowerCase().includes('seat number')
    );
    const rawUsn = usnKey ? String(row[usnKey] || '').trim().toUpperCase() : '';

    if (!rawUsn) {
      continue; // Skip empty row
    }

    if (seenUsns.has(rawUsn)) {
      if (!duplicateUsns.includes(rawUsn)) {
        duplicateUsns.push(rawUsn);
      }
      continue;
    }
    seenUsns.add(rawUsn);

    // Verify student belongs to selected cohort
    if (!cohortUsnMap.has(rawUsn)) {
      unknownUsns.push(rawUsn);
      continue;
    }

    matchedUsns.add(rawUsn);

    // Find performance score column (CGPA or SGPA)
    const scoreKey = Object.keys(row).find(
      (k) =>
        k.toLowerCase().includes('cgpa') ||
        k.toLowerCase().includes('sgpa') ||
        k.toLowerCase().includes('score') ||
        k.toLowerCase().includes('marks')
    );

    const rawScore = scoreKey !== undefined ? row[scoreKey] : undefined;

    if (rawScore === undefined || rawScore === null || String(rawScore).trim() === '') {
      // Missing mark
      continue;
    }

    const num = Number(rawScore);
    if (isNaN(num)) {
      invalidScores.push({
        usn: rawUsn,
        rawValue: rawScore,
        reason: 'Value is not a valid number',
      });
      continue;
    }

    if (num < 0 || num > 10) {
      invalidScores.push({
        usn: rawUsn,
        rawValue: rawScore,
        reason: 'Score is out of the standard 0.00 - 10.00 scale',
      });
      continue;
    }

    scoresMap[rawUsn] = Number(num.toFixed(2));
  }

  const missingScoresCount = cohortStudents.length - Object.keys(scoresMap).length;

  if (duplicateUsns.length > 0) {
    errorSummary.push(`Found ${duplicateUsns.length} duplicate USN(s) in uploaded spreadsheet: ${duplicateUsns.slice(0, 5).join(', ')}`);
  }
  if (unknownUsns.length > 0) {
    errorSummary.push(`${unknownUsns.length} USN(s) in sheet do not belong to this department/cohort: ${unknownUsns.slice(0, 5).join(', ')}`);
  }
  if (invalidScores.length > 0) {
    errorSummary.push(`${invalidScores.length} row(s) contain invalid/out-of-range score entries.`);
  }

  const isValid =
    errorSummary.length === 0 &&
    matchedUsns.size > 0;

  return {
    totalExpected: cohortStudents.length,
    matchedCount: matchedUsns.size,
    validScoresCount: Object.keys(scoresMap).length,
    missingScoresCount: Math.max(0, missingScoresCount),
    duplicateUsns,
    unknownUsns,
    invalidScores,
    scoresMap,
    errorSummary,
    isValid,
  };
}

/**
 * Multi-Sheet Excel Export of Published or Draft Allocation Run
 */
export function exportSectionAllocationWorkbook(
  run: StudentSectionAllocationRun,
  institutionName: string = 'Maharaja Institute of Technology Mysore',
  deptName: string = 'Department of Information Science & Engineering'
): Uint8Array {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Summary Statistics & Meta
  const summaryData = [
    { Key: 'Institution', Value: institutionName },
    { Key: 'Department', Value: deptName },
    { Key: 'Academic Year', Value: run.academicYear },
    { Key: 'Year of Study / Semester', Value: `Year ${run.yearOfStudy}${run.semester ? ` (Semester ${run.semester})` : ''}` },
    { Key: 'Allocation Run Title', Value: run.title },
    { Key: 'Allocation Method', Value: run.method === 'PERFORMANCE' ? `Stratified Academic Performance (${run.performanceMetric})` : 'Random Balanced Allocation' },
    { Key: 'Performance Metric', Value: run.performanceMetric || 'N/A' },
    { Key: 'Random Seed (Auditable)', Value: run.randomSeed },
    { Key: 'Algorithm Version', Value: run.algorithmVersion },
    { Key: 'Total Allocated Students', Value: run.totalStudentsCount },
    { Key: 'Status', Value: run.status },
    { Key: 'Generated By', Value: run.createdByName },
    { Key: 'Generated At', Value: run.createdAt },
    { Key: 'Published At', Value: run.publishedAt || 'Draft (Unpublished)' },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);
  wsSummary['!cols'] = [{ wch: 30 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Allocation_Summary');

  // Sheet for Each Section
  for (const sec of run.sections) {
    const secStudents = run.students
      .filter((s) => s.assignedSection === sec.name)
      .sort((a, b) => a.usn.localeCompare(b.usn));

    const rows = secStudents.map((s, idx) => ({
      'Sl. No': idx + 1,
      'USN': s.usn,
      'Student Name': s.fullName,
      'Current Semester': `Sem ${s.currentSemester}`,
      [run.performanceMetric ? `${run.performanceMetric} Score` : 'Metric']: s.performanceValue !== null && s.performanceValue !== undefined ? s.performanceValue.toFixed(2) : 'N/A',
      'Performance Band': s.bandName || 'N/A',
      'Assigned Section': s.assignedSection,
      'Override Note': s.isManualOverride ? `Manual Override (${s.overrideReason || 'N/A'})` : 'Auto-Balanced',
    }));

    const wsSec = XLSX.utils.json_to_sheet(rows);
    wsSec['!cols'] = [
      { wch: 8 },  // Sl No
      { wch: 18 }, // USN
      { wch: 30 }, // Name
      { wch: 16 }, // Sem
      { wch: 16 }, // Score
      { wch: 30 }, // Band
      { wch: 16 }, // Section
      { wch: 20 }, // Override
    ];
    // Sanitize sheet name (max 31 chars)
    const cleanSheetName = sec.name.replace(/[:\\/?*[\]]/g, '').substring(0, 31);
    XLSX.utils.book_append_sheet(wb, wsSec, cleanSheetName);
  }

  // Final Sheet: Consolidated Master Roster
  const consolidatedRows = [...run.students]
    .sort((a, b) => a.assignedSection.localeCompare(b.assignedSection) || a.usn.localeCompare(b.usn))
    .map((s, idx) => ({
      'Sl. No': idx + 1,
      'Assigned Section': s.assignedSection,
      'USN': s.usn,
      'Student Full Name': s.fullName,
      'Year of Study': `Year ${s.currentYear}`,
      'Current Semester': `Sem ${s.currentSemester}`,
      [run.performanceMetric ? `${run.performanceMetric}` : 'Score']: s.performanceValue !== null && s.performanceValue !== undefined ? s.performanceValue.toFixed(2) : 'N/A',
      'Band': s.bandName || 'N/A',
    }));

  const wsMaster = XLSX.utils.json_to_sheet(consolidatedRows);
  wsMaster['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 18 },
    { wch: 32 },
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 30 },
  ];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'All_Students_Consolidated');

  const out = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(out);
}

/**
 * Consolidated CSV Export
 */
export function exportSectionAllocationCsv(run: StudentSectionAllocationRun): string {
  const rows = [
    ['Sl. No', 'USN', 'Student Name', 'Current Year', 'Current Semester', 'Assigned Section', 'Performance Metric', 'Score', 'Performance Band'],
  ];

  const sorted = [...run.students].sort(
    (a, b) => a.assignedSection.localeCompare(b.assignedSection) || a.usn.localeCompare(b.usn)
  );

  sorted.forEach((s, idx) => {
    rows.push([
      String(idx + 1),
      s.usn,
      `"${s.fullName.replace(/"/g, '""')}"`,
      String(s.currentYear),
      String(s.currentSemester),
      `"${s.assignedSection}"`,
      run.performanceMetric || 'N/A',
      s.performanceValue !== null && s.performanceValue !== undefined ? s.performanceValue.toFixed(2) : 'N/A',
      `"${(s.bandName || 'N/A').replace(/"/g, '""')}"`,
    ]);
  });

  return rows.map((r) => r.join(',')).join('\n');
}

/**
 * Print-Ready Official PDF Generation using jsPDF
 */
export function generateSectionAllocationPdf(
  run: StudentSectionAllocationRun,
  institutionName: string = 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
  deptName: string = 'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING'
): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 14;

  // Header Banner
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(123, 17, 19); // MIT Mysore Maroon #7B1113
  doc.text(institutionName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 5.5;
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59); // Slate-800
  doc.text(deptName.toUpperCase(), pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Belagola, Srirangapatna Taluk, Mandya - 571 477 · Affiliated to VTU, Belagavi', pageWidth / 2, y, { align: 'center' });

  y += 4;
  doc.setDrawColor(123, 17, 19);
  doc.setLineWidth(0.6);
  doc.line(14, y, pageWidth - 14, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  const titleText = `OFFICIAL STUDENT SECTION ALLOCATION ROSTER — ACADEMIC YEAR ${run.academicYear}`;
  doc.text(titleText, pageWidth / 2, y, { align: 'center' });

  y += 4.5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  const subText = `Cohort: Year ${run.yearOfStudy}${run.semester ? ` (Semester ${run.semester})` : ''} | Method: ${run.method === 'PERFORMANCE' ? `Stratified Academic Balancing (${run.performanceMetric})` : 'Random Balanced Allocation'} | Total Students: ${run.totalStudentsCount}`;
  doc.text(subText, pageWidth / 2, y, { align: 'center' });

  y += 6;

  // Section Summary Table Box
  doc.setFillColor(248, 250, 252);
  doc.rect(14, y, pageWidth - 28, 14, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.3);
  doc.rect(14, y, pageWidth - 28, 14, 'S');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(15, 23, 42);
  let summaryX = 18;
  run.sections.forEach((sec) => {
    const count = run.summary.sectionCounts[sec.name] || 0;
    const avg = run.summary.sectionAverages ? run.summary.sectionAverages[sec.name] : undefined;
    doc.text(`${sec.name}: ${count} Students (Cap: ${sec.capacity})${avg ? ` | Avg ${run.performanceMetric}: ${avg}` : ''}`, summaryX, y + 8);
    summaryX += (pageWidth - 36) / run.sections.length;
  });

  y += 18;

  // Render Section Tables
  for (const sec of run.sections) {
    const secStudents = run.students
      .filter((s) => s.assignedSection === sec.name)
      .sort((a, b) => a.usn.localeCompare(b.usn));

    // Check if new page needed
    if (y > 240) {
      doc.addPage();
      y = 15;
    }

    // Section Subheader
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(123, 17, 19);
    doc.text(`SECTION ALLOCATION: ${sec.name.toUpperCase()} (${secStudents.length} Students)`, 14, y);
    y += 4;

    // Table Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6.5, 'F');
    doc.setDrawColor(148, 163, 184);
    doc.rect(14, y, pageWidth - 28, 6.5, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(30, 41, 59);
    doc.text('SL', 16, y + 4.5);
    doc.text('USN', 26, y + 4.5);
    doc.text('STUDENT NAME', 60, y + 4.5);
    doc.text('SEMESTER', 120, y + 4.5);
    if (run.performanceMetric) {
      doc.text(`${run.performanceMetric}`, 145, y + 4.5);
      doc.text('PERFORMANCE BAND', 165, y + 4.5);
    }

    y += 6.5;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(51, 65, 85);

    secStudents.forEach((st, idx) => {
      if (y > 275) {
        doc.addPage();
        y = 15;
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(14, y, pageWidth - 28, 5.5, 'F');
      }
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y + 5.5, pageWidth - 14, y + 5.5);

      doc.text(String(idx + 1), 16, y + 4);
      doc.setFont('courier', 'bold');
      doc.text(st.usn, 26, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.text(st.fullName.substring(0, 32), 60, y + 4);
      doc.text(`Sem ${st.currentSemester}`, 120, y + 4);
      if (run.performanceMetric) {
        doc.text(st.performanceValue !== null && st.performanceValue !== undefined ? st.performanceValue.toFixed(2) : 'N/A', 145, y + 4);
        doc.text((st.bandName || 'N/A').substring(0, 26), 165, y + 4);
      }

      y += 5.5;
    });

    y += 8;
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Maharaja Institute of Technology Mysore — FPMS Section Allocation System | Page ${i} of ${pageCount}`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  return doc;
}
