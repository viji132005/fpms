import type { jsPDF as jsPDFType } from 'jspdf';
import * as jspdfNamespace from 'jspdf';
import { Student } from '../types/index.ts';

const jsPDF = (jspdfNamespace as any).jsPDF || (jspdfNamespace as any).default || jspdfNamespace;

export interface StudentRosterPdfOptions {
  institutionName?: string;
  departmentName?: string;
  deptCode?: string;
  academicYear?: string;
  cohortYearLabel?: string;
  cohortSemesterLabel?: string;
  cohortLabel?: string;
  refNumber?: string;
  generatedDate?: string;
}

export interface AttendanceFormPdfOptions {
  institutionName?: string;
  departmentName?: string;
  deptCode?: string;
  yearLabel?: string;
  semLabel?: string;
  eventName?: string;
  generatedDate?: string;
}

/**
 * Formats student records for Excel export without the 'Status' column.
 */
export function formatStudentExcelData(students: Student[]): Array<Record<string, any>> {
  return students.map((s, index) => ({
    'Sl. No.': index + 1,
    'USN': s.usn,
    'Full Name': s.fullName,
    'Academic Year': s.status === 'GRADUATED' ? 'Graduated Alumni' : `Year ${s.currentYear}`,
    'Current Semester': s.currentSemester ? `Semester ${s.currentSemester}` : (s.status === 'GRADUATED' ? 'Alumni' : `Year ${s.currentYear}`),
    'Section': s.section || 'Unallotted',
    'Email': s.email,
    'Student Phone': s.phone || 'N/A',
    'Parent Phone': s.parentPhone || 'N/A',
    // 'Status' column strictly excluded per specification
  }));
}

/**
 * Generates an official college circular-style PDF student roster for MIT Mysore.
 * Format is A4 Portrait (210mm x 297mm) following official college circular formatting:
 * - Full institutional letterhead with dual accent rule
 * - Official Circular Ref Number & Date
 * - Subject Line & Standard Year / Semester stated in the header metadata card
 * - Table WITHOUT Section, Year, Semester, or Status columns in rows
 * - Candidate Details: Sl. No., USN, Candidate Name, Email, Student Mobile, Parent Mobile
 * - Standard multi-page continuation headers and official 3-signature block
 */
export function generateStudentRosterPdf(
  students: Student[],
  options: StudentRosterPdfOptions = {}
): jsPDFType {
  const {
    institutionName = 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    departmentName = 'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING',
    deptCode = 'ISE',
    academicYear = '2026-27',
    cohortYearLabel = 'All Enrolled Cohorts',
    cohortSemesterLabel = 'I to VIII Semesters',
    cohortLabel = 'Student Roll List & Directory',
    refNumber,
    generatedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  } = options;

  // A4 Portrait: 210mm width x 297mm height
  const doc: jsPDFType = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 12;
  const rightMargin = 12;
  const topMargin = 10;
  const bottomMargin = 14;
  const printableWidth = pageWidth - leftMargin - rightMargin; // 186 mm

  // Columns for Portrait Circular (Sum = 186mm)
  // Section, Year, Semester, and Status are removed from rows as requested!
  const columns = [
    { key: 'slNo', header: 'Sl. No.', width: 12, align: 'center' as const },
    { key: 'usn', header: 'University Seat No. (USN)', width: 34, align: 'center' as const },
    { key: 'fullName', header: 'Candidate Full Name', width: 49, align: 'left' as const },
    { key: 'email', header: 'Institutional Email ID', width: 45, align: 'left' as const },
    { key: 'phone', header: 'Student Contact', width: 23, align: 'center' as const },
    { key: 'parentPhone', header: 'Parent Contact', width: 23, align: 'center' as const },
  ];

  let currentY = topMargin;

  // Clean and simplify year and semester mentions for concise official display
  const cleanYear = cohortYearLabel
    .replace(/B\.E\..*$/i, '')
    .replace(/\(.*?\)/g, '')
    .trim() || cohortYearLabel;

  let cleanSem = cohortSemesterLabel
    .replace(/\(.*?\)/g, '')
    .replace(/Semester(s)?/gi, 'Sem')
    .replace(/Consolidated Roll/gi, '')
    .trim() || cohortSemesterLabel;

  // Single semester enforcement: resolve dual semesters (e.g. "Sem 3 & 4" or "III & IV") to only the current semester
  const distinctStudentSems = Array.from(
    new Set(students.map((s) => s.currentSemester).filter((s): s is number => typeof s === 'number' && s > 0))
  );

  if (distinctStudentSems.length === 1) {
    cleanSem = `Sem ${distinctStudentSems[0]}`;
  } else if (cleanSem.includes('&')) {
    cleanSem = cleanSem.split('&')[0].trim();
  } else if (cleanSem.toLowerCase().includes('and')) {
    cleanSem = cleanSem.split(/and/i)[0].trim();
  }

  // Normalize Roman numeral or standalone digit to standard "Sem X"
  const romanMap: Record<string, number> = {
    VIII: 8, VII: 7, VI: 6, V: 5, IV: 4, III: 3, II: 2, I: 1
  };
  const romanMatch = cleanSem.match(/\b(VIII|VII|VI|IV|V|III|II|I)\b/i);
  if (romanMatch && !cleanSem.match(/\b\d\b/)) {
    const num = romanMap[romanMatch[1].toUpperCase()];
    if (num) {
      cleanSem = `Sem ${num}`;
    }
  } else if (
    !cleanSem.toLowerCase().startsWith('sem') &&
    !cleanSem.toLowerCase().includes('alumni') &&
    !cleanSem.toLowerCase().includes('all')
  ) {
    const numMatch = cleanSem.match(/\d+/);
    if (numMatch) {
      cleanSem = `Sem ${numMatch[0]}`;
    }
  }

  const renderHeader = (isContinuation = false) => {
    currentY = topMargin;

    if (!isContinuation) {
      // 1. INSTITUTION LETTERHEAD
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12.5);
      doc.setTextColor(123, 17, 19); // MIT Mysore Maroon #7B1113
      doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY + 3.5, { align: 'center' });

      currentY += 7.5;
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(departmentName.toUpperCase(), pageWidth / 2, currentY + 2.5, { align: 'center' });

      currentY += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105); // slate-600
      doc.text(
        'Affiliated to VTU Belagavi · Approved by AICTE, New Delhi · Accredited Institutional Governance',
        pageWidth / 2,
        currentY + 2,
        { align: 'center' }
      );

      currentY += 4.2;
      doc.setFontSize(6.8);
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(
        'Belawadi, Srirangapatna Taluk, Mandya Dist, Karnataka - 571477 · Website: www.mitmysore.in',
        pageWidth / 2,
        currentY + 1.5,
        { align: 'center' }
      );

      // Dual Decorative Letterhead Accent Lines
      currentY += 4;
      doc.setDrawColor(123, 17, 19);
      doc.setLineWidth(0.7);
      doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);

      currentY += 1;
      doc.setDrawColor(217, 119, 6); // amber-600
      doc.setLineWidth(0.3);
      doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);

      // 2. ISSUE DATE (Ref No removed per specification)
      currentY += 4.5;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Date: ${generatedDate}`, pageWidth - rightMargin, currentY + 1, { align: 'right' });

      // 3. OFFICIAL CIRCULAR BADGE (Subject line removed per specification)
      currentY += 3.5;
      const badgeWidth = 92;
      const badgeHeight = 5.2;
      doc.setFillColor(123, 17, 19); // Maroon badge
      doc.roundedRect((pageWidth - badgeWidth) / 2, currentY, badgeWidth, badgeHeight, 1.2, 1.2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('OFFICIAL CIRCULAR / STUDENT ROLL DIRECTORY', pageWidth / 2, currentY + 3.7, {
        align: 'center',
      });

      // 4. STRUCTURED COLLEGE METADATA CARD (Concise Year & Sem, no registered keyword, department omitted as already in header)
      currentY += badgeHeight + 3.5;
      const metaBoxHeight = 13.5;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(leftMargin, currentY, printableWidth, metaBoxHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(203, 213, 225); // slate-300
      doc.setLineWidth(0.3);
      doc.roundedRect(leftMargin, currentY, printableWidth, metaBoxHeight, 1.5, 1.5, 'S');

      // Grid: 3 columns x 2 rows
      const c1 = leftMargin + 4;
      const c2 = leftMargin + (printableWidth / 3) + 2;
      const c3 = leftMargin + (printableWidth * 2 / 3) + 2;
      const row1Y = currentY + 4.5;
      const row2Y = currentY + 9.8;

      doc.setFontSize(7);

      // Row 1: Academic Year, Year, Sem
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Academic Year:', c1, row1Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${academicYear}`, c1 + 22, row1Y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Year:', c2, row1Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${cleanYear}`, c2 + 10, row1Y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Sem:', c3, row1Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${cleanSem}`, c3 + 10, row1Y);

      // Row 2: Degree Program, Total Candidates (Department omitted as already present in top letterhead; "registered" text removed)
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Degree Program:', c1, row2Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`B.E. (${deptCode})`, c1 + 22, row2Y);

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(71, 85, 105);
      doc.text('Total Candidates:', c2, row2Y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(15, 23, 42);
      doc.text(`${students.length}`, c2 + 25, row2Y);

      currentY += metaBoxHeight + 3.5;
    } else {
      // CONDENSED CONTINUATION HEADER FOR SUBSEQUENT PAGES
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(123, 17, 19);
      doc.text(institutionName.toUpperCase(), leftMargin, currentY + 3);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text(
        `Roll List: ${cleanYear} (${cleanSem}) — CONTINUED`,
        pageWidth - rightMargin,
        currentY + 3,
        { align: 'right' }
      );

      currentY += 4.5;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.4);
      doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);
      currentY += 3.5;
    }
  };

  const renderTableHeader = () => {
    const tableHeaderHeight = 6.2;
    doc.setFillColor(123, 17, 19); // MIT Maroon
    doc.rect(leftMargin, currentY, printableWidth, tableHeaderHeight, 'F');

    let colX = leftMargin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);

    columns.forEach((col) => {
      let textX = colX + 2;
      if (col.align === 'center') {
        textX = colX + col.width / 2;
      }
      doc.text(col.header, textX, currentY + 4.2, {
        align: col.align === 'center' ? 'center' : 'left',
      });
      colX += col.width;
    });

    currentY += tableHeaderHeight;
  };

  const renderFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184); // slate-400

    doc.text(
      'Maharaja Institute of Technology Mysore · Student Information System (FPMS) · Confidential Official Record',
      leftMargin,
      footerY
    );

    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - rightMargin, footerY, {
      align: 'right',
    });
  };

  // Render Page 1
  renderHeader(false);
  renderTableHeader();

  const rowHeight = 5.6;

  if (students.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(leftMargin, currentY, printableWidth, 14, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.rect(leftMargin, currentY, printableWidth, 14, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('No registered students found for this academic cohort selection.', pageWidth / 2, currentY + 8, {
      align: 'center',
    });
    currentY += 14;
  } else {
    students.forEach((student, index) => {
      // Check for page break (leave room for table rows and footer)
      if (currentY + rowHeight > pageHeight - bottomMargin - 12) {
        doc.addPage();
        renderHeader(true);
        renderTableHeader();
      }

      // Zebra striping
      const isOdd = index % 2 === 1;
      doc.setFillColor(isOdd ? 248 : 255, isOdd ? 250 : 255, isOdd ? 252 : 255);
      doc.rect(leftMargin, currentY, printableWidth, rowHeight, 'F');

      // Subtle row border
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.15);
      doc.line(leftMargin, currentY + rowHeight, pageWidth - rightMargin, currentY + rowHeight);

      let colX = leftMargin;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(30, 41, 59); // slate-800

      // Only candidate-specific values: Section, Year, and Sem removed from row!
      const rowValues: Record<string, string> = {
        slNo: String(index + 1),
        usn: student.usn || '—',
        fullName: student.fullName || '—',
        email: student.email || '—',
        phone: student.phone || 'N/A',
        parentPhone: student.parentPhone || 'N/A',
      };

      columns.forEach((col) => {
        let val = rowValues[col.key] || '—';

        // Truncate cleanly if too long for column
        const maxChars = Math.floor(col.width * 2.1);
        if (val.length > maxChars) {
          val = val.substring(0, maxChars - 2) + '..';
        }

        let textX = colX + 2;
        if (col.align === 'center') {
          textX = colX + col.width / 2;
        }

        // Emphasis on USN
        if (col.key === 'usn') {
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setFont('helvetica', 'normal');
        }

        doc.text(val, textX, currentY + 3.8, {
          align: col.align === 'center' ? 'center' : 'left',
        });

        colX += col.width;
      });

      currentY += rowHeight;
    });
  }

  // Official College Circular Sign-Off Block
  // Ensure enough room on current page or add new page for clean closing
  if (currentY + 28 > pageHeight - bottomMargin) {
    doc.addPage();
    renderHeader(true);
    currentY += 8;
  } else {
    currentY += 6;
  }

  // Copy to notice block
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Copy to: 1. Office of the Principal  2. Department Notice Board  3. Faculty Mentors  4. Academic Office Archive',
    leftMargin,
    currentY
  );

  currentY += 7;

  // 3 Official College Signature Columns
  const sigColWidth = 50;
  const sX1 = leftMargin + 4;
  const sX2 = leftMargin + (printableWidth / 2) - (sigColWidth / 2);
  const sX3 = pageWidth - rightMargin - sigColWidth - 4;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  // Signature 1: Academic Coordinator
  doc.line(sX1, currentY + 8, sX1 + sigColWidth, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Academic Coordinator', sX1 + sigColWidth / 2, currentY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`Dept. of ${deptCode}`, sX1 + sigColWidth / 2, currentY + 14.5, { align: 'center' });

  // Signature 2: Academic Dean / Verification
  doc.line(sX2, currentY + 8, sX2 + sigColWidth, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Dean (Academics)', sX2 + sigColWidth / 2, currentY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text('MIT Mysore', sX2 + sigColWidth / 2, currentY + 14.5, { align: 'center' });

  // Signature 3: HOD
  doc.line(sX3, currentY + 8, sX3 + sigColWidth, currentY + 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Head of Department (HOD)', sX3 + sigColWidth / 2, currentY + 11.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.2);
  doc.setTextColor(100, 116, 139);
  doc.text(institutionName, sX3 + sigColWidth / 2, currentY + 14.5, { align: 'center' });

  // Render footers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(p, totalPages);
  }

  return doc;
}

/**
 * Generates an official event attendance form/sheet PDF for campus events, workshops,
 * technical seminars, and laboratory sessions.
 * Format is A4 Portrait (210mm x 297mm) with:
 * - Header strictly mentioning ONLY: College Name, Department, Year, and Sem (with event title/date)
 * - 4 columns: Sl. No., USN, Student Name, and Signature
 * - Generous 9.2mm row height for physical handwritten student signatures
 * - Clean dual-signature block (Faculty Event Coordinator & HOD)
 */
export function generateAttendanceFormPdf(
  students: Student[],
  options: AttendanceFormPdfOptions = {}
): jsPDFType {
  const {
    institutionName = 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    departmentName = 'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING',
    deptCode = 'ISE',
    yearLabel = 'All Years',
    semLabel = 'Sem 1',
    eventName = '',
    generatedDate = new Date().toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }),
  } = options;

  // A4 Portrait: 210mm width x 297mm height
  const doc: jsPDFType = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const leftMargin = 12;
  const rightMargin = 12;
  const topMargin = 11;
  const bottomMargin = 12;
  const printableWidth = pageWidth - leftMargin - rightMargin; // 186 mm

  // Structural Excel Box Columns: balanced proportion eliminating dead space between USN and Signature
  // Sl No (14mm) + USN (44mm) + Student Name (60mm) + Signature (68mm) = 186mm
  const columns = [
    { key: 'slNo', header: 'Sl. No.', width: 14, align: 'center' as const },
    { key: 'usn', header: 'University Seat Number (USN)', width: 44, align: 'center' as const },
    { key: 'fullName', header: 'Student Name', width: 60, align: 'left' as const },
    { key: 'signature', header: 'Student Signature', width: 68, align: 'center' as const },
  ];

  // Clean Year display
  const cleanYear = yearLabel
    .replace(/B\.E\..*$/i, '')
    .replace(/\(.*?\)/g, '')
    .trim() || yearLabel;

  // Ensure ONLY single current active semester is displayed (e.g., "Sem 1", "Sem 3", "Sem 5", "Sem 7")
  let cleanSem = semLabel.replace(/\(.*?\)/g, '').trim();
  if (cleanSem.includes('&')) {
    cleanSem = cleanSem.split('&')[0].trim();
  } else if (cleanSem.includes('and')) {
    cleanSem = cleanSem.split('and')[0].trim();
  } else if (cleanSem.toLowerCase().includes('all')) {
    cleanSem = 'All Semesters';
  }

  let currentY = topMargin;

  const renderHeader = (isContinuation = false) => {
    currentY = topMargin;

    // Institution Letterhead Header (Only College Name and Department)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(123, 17, 19); // MIT Maroon #7B1113
    doc.text(institutionName.toUpperCase(), pageWidth / 2, currentY + 3.5, { align: 'center' });

    currentY += 6;
    doc.setFontSize(9.5);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text(departmentName.toUpperCase(), pageWidth / 2, currentY + 2.5, { align: 'center' });

    // Decorative dual letterhead accent rules
    currentY += 4.5;
    doc.setDrawColor(123, 17, 19);
    doc.setLineWidth(0.6);
    doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);

    currentY += 0.8;
    doc.setDrawColor(217, 119, 6); // amber-600
    doc.setLineWidth(0.3);
    doc.line(leftMargin, currentY, pageWidth - rightMargin, currentY);

    if (!isContinuation) {
      currentY += 4;
      // Sheet Title Banner
      const titleHeight = 6;
      doc.setFillColor(123, 17, 19);
      doc.rect(leftMargin, currentY, printableWidth, titleHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(255, 255, 255);
      doc.text('STUDENT EVENT ATTENDANCE SHEET', pageWidth / 2, currentY + 4.2, { align: 'center' });

      // Structured Excel Box Header Grid (Crisp bordered cells like Excel)
      currentY += titleHeight;
      const cellHeight = 6.2;
      const gridBorderColor = [180, 195, 215]; // slate-300 grid border
      doc.setDrawColor(gridBorderColor[0], gridBorderColor[1], gridBorderColor[2]);
      doc.setLineWidth(0.3);

      // Row 1: Year (label + value) | Sem (label + value) | Date (label + value)
      // Widths: 22mm + 36mm + 26mm + 38mm + 24mm + 40mm = 186mm
      const r1 = [
        { label: 'Year:', val: cleanYear, w1: 22, w2: 36 },
        { label: 'Sem:', val: cleanSem, w1: 26, w2: 38 },
        { label: 'Date:', val: generatedDate, w1: 24, w2: 40 },
      ];

      let rx = leftMargin;
      r1.forEach((cell) => {
        // Label Box
        doc.setFillColor(241, 245, 249); // slate-100
        doc.rect(rx, currentY, cell.w1, cellHeight, 'FD');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        doc.text(cell.label, rx + 2.5, currentY + 4.2);

        // Value Box
        doc.setFillColor(255, 255, 255);
        doc.rect(rx + cell.w1, currentY, cell.w2, cellHeight, 'FD');
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
        doc.text(cell.val, rx + cell.w1 + 2.5, currentY + 4.2);

        rx += cell.w1 + cell.w2;
      });

      // Row 2: Event Title (label + value) | Total Candidates (label + value)
      // Widths: 28mm + 104mm + 28mm + 26mm = 186mm
      currentY += cellHeight;
      const displayedEvent = eventName.trim() ? eventName.trim() : '________________________________________________________';
      
      // Event Label
      doc.setFillColor(241, 245, 249);
      doc.rect(leftMargin, currentY, 28, cellHeight, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('Event / Activity:', leftMargin + 2.5, currentY + 4.2);

      // Event Value
      doc.setFillColor(255, 255, 255);
      doc.rect(leftMargin + 28, currentY, 104, cellHeight, 'FD');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(displayedEvent, leftMargin + 30.5, currentY + 4.2);

      // Total Students Label
      doc.setFillColor(241, 245, 249);
      doc.rect(leftMargin + 132, currentY, 28, cellHeight, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(51, 65, 85);
      doc.text('Total Students:', leftMargin + 134.5, currentY + 4.2);

      // Total Students Value
      doc.setFillColor(255, 255, 255);
      doc.rect(leftMargin + 160, currentY, 26, cellHeight, 'FD');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(15, 23, 42);
      doc.text(String(students.length), leftMargin + 162.5, currentY + 4.2);

      currentY += cellHeight + 3.5;
    } else {
      // Continuation banner
      currentY += 3;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`ATTENDANCE SHEET — Year: ${cleanYear} | Sem: ${cleanSem} (CONTINUED)`, leftMargin, currentY + 2);
      doc.text(`Date: ${generatedDate}`, pageWidth - rightMargin, currentY + 2, { align: 'right' });
      currentY += 4.5;
    }
  };

  const renderTableHeader = () => {
    const tableHeaderHeight = 7;
    doc.setFillColor(123, 17, 19); // MIT Maroon
    doc.rect(leftMargin, currentY, printableWidth, tableHeaderHeight, 'F');

    let colX = leftMargin;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(255, 255, 255);
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.3);

    columns.forEach((col) => {
      // Crisp Excel header vertical division
      doc.rect(colX, currentY, col.width, tableHeaderHeight, 'S');

      let textX = colX + 2.5;
      if (col.align === 'center') {
        textX = colX + col.width / 2;
      }
      doc.text(col.header, textX, currentY + 4.8, {
        align: col.align === 'center' ? 'center' : 'left',
      });
      colX += col.width;
    });

    currentY += tableHeaderHeight;
  };

  const renderFooter = (pageNumber: number, totalPages: number) => {
    const footerY = pageHeight - 6.5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    doc.text(
      'Maharaja Institute of Technology Mysore · Student Event Attendance Register · Department of ISE',
      leftMargin,
      footerY
    );

    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - rightMargin, footerY, {
      align: 'right',
    });
  };

  renderHeader(false);
  renderTableHeader();

  // Excel row height: 9.2mm provides clear comfortable height for handwriting signatures
  const rowHeight = 9.2;

  if (students.length === 0) {
    doc.setFillColor(255, 255, 255);
    doc.rect(leftMargin, currentY, printableWidth, 16, 'F');
    doc.setDrawColor(203, 213, 225);
    doc.rect(leftMargin, currentY, printableWidth, 16, 'S');

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No students enrolled in this cohort selection.', pageWidth / 2, currentY + 9.5, {
      align: 'center',
    });
    currentY += 16;
  } else {
    students.forEach((student, index) => {
      // Check page break (need room for row + footer margin)
      if (currentY + rowHeight > pageHeight - bottomMargin - 18) {
        doc.addPage();
        renderHeader(true);
        renderTableHeader();
      }

      // Alternate row background for clean legibility like Excel zebra stripes
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252); // slate-50
        doc.rect(leftMargin, currentY, printableWidth, rowHeight, 'F');
      }

      // Draw crisp cell borders for every column like Excel cells
      let colX = leftMargin;
      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.3);

      columns.forEach((col) => {
        doc.rect(colX, currentY, col.width, rowHeight, 'S');
        colX += col.width;
      });

      // Populate text
      colX = leftMargin;
      const rowValues: Record<string, string> = {
        slNo: String(index + 1),
        usn: student.usn || '—',
        fullName: student.fullName || '—',
        signature: '',
      };

      columns.forEach((col) => {
        const val = rowValues[col.key] || '';
        let textX = colX + 2.5;
        if (col.align === 'center') {
          textX = colX + col.width / 2;
        }

        if (col.key === 'usn') {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
        } else if (col.key === 'fullName') {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(15, 23, 42);
        } else if (col.key === 'slNo') {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7.5);
          doc.setTextColor(71, 85, 105);
        }

        if (val) {
          doc.text(val, textX, currentY + 5.8, {
            align: col.align === 'center' ? 'center' : 'left',
          });
        }

        // In Signature cell: subtle baseline guide for clean physical signature
        if (col.key === 'signature') {
          doc.setDrawColor(226, 232, 240);
          doc.setLineWidth(0.25);
          doc.line(colX + 6, currentY + rowHeight - 2.5, colX + col.width - 6, currentY + rowHeight - 2.5);
        }

        colX += col.width;
      });

      currentY += rowHeight;
    });
  }

  // Official Signature Block at Bottom of Attendance Sheet (Excel Boxed Sign-off)
  if (currentY + 22 > pageHeight - bottomMargin) {
    doc.addPage();
    renderHeader(true);
    currentY += 8;
  } else {
    currentY += 6;
  }

  // Two structured Excel-style signature approval boxes
  const boxWidth = 72;
  const boxHeight = 15;
  const bLeft = leftMargin + 6;
  const bRight = pageWidth - rightMargin - boxWidth - 6;

  doc.setDrawColor(180, 195, 215);
  doc.setLineWidth(0.35);

  // Left Box: Faculty Event Coordinator
  doc.setFillColor(255, 255, 255);
  doc.rect(bLeft, currentY, boxWidth, boxHeight, 'FD');
  doc.setFillColor(241, 245, 249);
  doc.rect(bLeft, currentY, boxWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Faculty Event Coordinator', bLeft + boxWidth / 2, currentY + 3.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature & Date: ___________________', bLeft + boxWidth / 2, currentY + 11.5, { align: 'center' });

  // Right Box: Head of Department (HOD)
  doc.setFillColor(255, 255, 255);
  doc.rect(bRight, currentY, boxWidth, boxHeight, 'FD');
  doc.setFillColor(241, 245, 249);
  doc.rect(bRight, currentY, boxWidth, 4.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(51, 65, 85);
  doc.text('Head of Department (HOD)', bRight + boxWidth / 2, currentY + 3.2, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Signature & Seal: ___________________', bRight + boxWidth / 2, currentY + 11.5, { align: 'center' });

  // Render footers across all pages
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    renderFooter(p, totalPages);
  }

  return doc;
}
