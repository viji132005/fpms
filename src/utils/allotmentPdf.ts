import type { jsPDF as jsPDFType } from 'jspdf';
import * as jspdfNamespace from 'jspdf';

// Resolve universal jsPDF constructor across browser ESM and Node.js/CJS runtime
const jsPDF = (jspdfNamespace as any).jsPDF || (jspdfNamespace as any).default || jspdfNamespace;

export interface AllotmentGroupData {
  mentorName: string;
  staffId?: string;
  students: {
    usn: string;
    fullName: string;
    currentYear?: number;
    parentPhone?: string;
  }[];
}

export interface AllotmentPdfOptions {
  institutionName?: string;
  locationText?: string;
  departmentName: string;
  deptCode: string;
  academicYear: string;
  groups: AllotmentGroupData[];
  logoUrl?: string;
}

/**
 * Loads an image from a URL and converts to base64 DataURL for jsPDF
 */
async function loadBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Generates the Official College Mentor-Mentee Allotment PDF
 * strictly matching the Maharaja Institute of Technology, Mysore format
 */
export async function generateCollegeAllotmentPdf(options: AllotmentPdfOptions): Promise<jsPDFType> {
  const {
    institutionName = 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    locationText = 'BELAWADI, SRIRANGAPATNA TALUK, MANDYA-571477',
    departmentName,
    deptCode,
    academicYear,
    groups,
    logoUrl = '/assets/aistudio/mit_logo_e728531b.webp',
  } = options;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 14;
  const contentWidth = pageWidth - margin * 2; // 182mm

  // Pre-load official logo
  let logoBase64: string | null = null;
  if (typeof window !== 'undefined') {
    logoBase64 = await loadBase64(logoUrl);
  }

  const drawHeader = (docInstance: jsPDFType, isFirstPage: boolean = true) => {
    let y = 14;

    // Left & Right Official Crest Logos
    if (logoBase64) {
      try {
        docInstance.addImage(logoBase64, 'WEBP', margin, y - 2, 18, 18);
        docInstance.addImage(logoBase64, 'WEBP', pageWidth - margin - 18, y - 2, 18, 18);
      } catch {
        // Fallback if WEBP decode is not supported in current environment
      }
    }

    // Centered College Headers
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(12.5);
    docInstance.setTextColor(15, 23, 42);
    docInstance.text(institutionName.toUpperCase(), pageWidth / 2, y + 2, { align: 'center' });

    y += 5.5;
    docInstance.setFont('helvetica', 'normal');
    docInstance.setFontSize(8);
    docInstance.setTextColor(70, 70, 70);
    docInstance.text(locationText.toUpperCase(), pageWidth / 2, y + 2, { align: 'center' });

    y += 5;
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(9.5);
    docInstance.setTextColor(123, 17, 19); // Maroon (#7B1113)
    docInstance.text(`DEPARTMENT OF ${departmentName.toUpperCase()}`, pageWidth / 2, y + 2, {
      align: 'center',
    });

    y += 4.5;
    // Official Double Horizontal Line
    docInstance.setDrawColor(123, 17, 19);
    docInstance.setLineWidth(0.6);
    docInstance.line(margin, y + 1, pageWidth - margin, y + 1);
    docInstance.setLineWidth(0.2);
    docInstance.line(margin, y + 2.2, pageWidth - margin, y + 2.2);

    y += 7.5;
    // Allotment Title
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(10);
    docInstance.setTextColor(15, 23, 42);
    docInstance.text(
      `MENTORS ALLOTMENT FOR ACADEMIC YEAR ${academicYear}`,
      pageWidth / 2,
      y + 1,
      { align: 'center' }
    );

    return y + 7;
  };

  let currentY = drawHeader(doc, true);

  // Column Dimensions for dual column table (Total = 182mm)
  // Left half: 91mm -> S/L (11mm), USN (27mm), NAME (53mm)
  // Right half: 91mm -> S/L (11mm), USN (27mm), NAME (53mm)
  const colSl = 11;
  const colUsn = 27;
  const colName = 53;
  const halfTableWidth = colSl + colUsn + colName; // 91mm
  const rowHeight = 5.6;

  const drawTableHeader = (docInstance: jsPDFType, yPos: number) => {
    docInstance.setDrawColor(30, 41, 59);
    docInstance.setLineWidth(0.3);
    docInstance.setFillColor(245, 247, 250);

    // Left Header
    docInstance.rect(margin, yPos, halfTableWidth, rowHeight, 'FD');
    // Right Header
    docInstance.rect(margin + halfTableWidth, yPos, halfTableWidth, rowHeight, 'FD');

    // Header Vertical Borders
    docInstance.line(margin + colSl, yPos, margin + colSl, yPos + rowHeight);
    docInstance.line(margin + colSl + colUsn, yPos, margin + colSl + colUsn, yPos + rowHeight);

    docInstance.line(margin + halfTableWidth + colSl, yPos, margin + halfTableWidth + colSl, yPos + rowHeight);
    docInstance.line(
      margin + halfTableWidth + colSl + colUsn,
      yPos,
      margin + halfTableWidth + colSl + colUsn,
      yPos + rowHeight
    );

    // Header Labels
    docInstance.setFont('helvetica', 'bold');
    docInstance.setFontSize(7.5);
    docInstance.setTextColor(15, 23, 42);

    // Left side
    docInstance.text('S/L', margin + colSl / 2, yPos + 3.8, { align: 'center' });
    docInstance.text('USN', margin + colSl + colUsn / 2, yPos + 3.8, { align: 'center' });
    docInstance.text('NAME', margin + colSl + colUsn + colName / 2, yPos + 3.8, { align: 'center' });

    // Right side
    docInstance.text('S/L', margin + halfTableWidth + colSl / 2, yPos + 3.8, { align: 'center' });
    docInstance.text('USN', margin + halfTableWidth + colSl + colUsn / 2, yPos + 3.8, { align: 'center' });
    docInstance.text('NAME', margin + halfTableWidth + colSl + colUsn + colName / 2, yPos + 3.8, {
      align: 'center',
    });
  };

  groups.forEach((group, gIdx) => {
    const mentees = group.students || [];
    const totalStudents = mentees.length;
    // Divide into two columns: left column gets ceil(N / 2) rows
    const numRows = Math.max(1, Math.ceil(totalStudents / 2));
    const tableHeight = (numRows + 1) * rowHeight;
    const blockHeight = 6 + tableHeight + 8; // header + table + spacing

    // If remaining space on page is insufficient for at least header + 3 rows, advance to new page
    if (currentY + Math.min(blockHeight, 26) > pageHeight - margin - 15) {
      doc.addPage();
      currentY = drawHeader(doc, false);
    }

    // Faculty Name Header: e.g. "1.Faculty Name: DR. ANITHA K (MITM-ISE-015)"
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(
      `${gIdx + 1}.Faculty Name: ${group.mentorName.toUpperCase()}${
        group.staffId ? ` (${group.staffId})` : ''
      }`,
      margin,
      currentY + 4
    );

    currentY += 6;

    // Draw Table Header
    drawTableHeader(doc, currentY);
    currentY += rowHeight;

    // Table Data Rows
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(15, 23, 42);

    if (totalStudents === 0) {
      // Empty state row
      doc.rect(margin, currentY, contentWidth, rowHeight);
      doc.text('No mentees allocated in this record', margin + contentWidth / 2, currentY + 3.8, {
        align: 'center',
      });
      currentY += rowHeight + 8;
      return;
    }

    for (let r = 0; r < numRows; r++) {
      // Check page break during large tables
      if (currentY + rowHeight > pageHeight - margin - 10) {
        doc.addPage();
        currentY = drawHeader(doc, false);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(123, 17, 19);
        doc.text(
          `${gIdx + 1}.Faculty Name: ${group.mentorName.toUpperCase()} (Contd...)`,
          margin,
          currentY + 4
        );
        currentY += 6;

        drawTableHeader(doc, currentY);
        currentY += rowHeight;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(15, 23, 42);
      }

      const leftIdx = r;
      const rightIdx = r + numRows;

      const leftStudent = mentees[leftIdx];
      const rightStudent = rightIdx < totalStudents ? mentees[rightIdx] : null;

      // Left box
      doc.rect(margin, currentY, halfTableWidth, rowHeight);
      doc.line(margin + colSl, currentY, margin + colSl, currentY + rowHeight);
      doc.line(margin + colSl + colUsn, currentY, margin + colSl + colUsn, currentY + rowHeight);

      // Right box
      doc.rect(margin + halfTableWidth, currentY, halfTableWidth, rowHeight);
      doc.line(margin + halfTableWidth + colSl, currentY, margin + halfTableWidth + colSl, currentY + rowHeight);
      doc.line(
        margin + halfTableWidth + colSl + colUsn,
        currentY,
        margin + halfTableWidth + colSl + colUsn,
        currentY + rowHeight
      );

      // Left Student Data
      if (leftStudent) {
        doc.text(String(leftIdx + 1), margin + colSl / 2, currentY + 3.8, { align: 'center' });
        doc.text((leftStudent.usn || '').toUpperCase(), margin + colSl + colUsn / 2, currentY + 3.8, {
          align: 'center',
        });
        const cleanName = doc.splitTextToSize((leftStudent.fullName || '').toUpperCase(), colName - 3);
        doc.text(cleanName[0] || '', margin + colSl + colUsn + 2, currentY + 3.8);
      }

      // Right Student Data
      if (rightStudent) {
        doc.text(String(rightIdx + 1), margin + halfTableWidth + colSl / 2, currentY + 3.8, {
          align: 'center',
        });
        doc.text(
          (rightStudent.usn || '').toUpperCase(),
          margin + halfTableWidth + colSl + colUsn / 2,
          currentY + 3.8,
          { align: 'center' }
        );
        const cleanName = doc.splitTextToSize((rightStudent.fullName || '').toUpperCase(), colName - 3);
        doc.text(cleanName[0] || '', margin + halfTableWidth + colSl + colUsn + 2, currentY + 3.8);
      }

      currentY += rowHeight;
    }

    currentY += 8; // Spacing after each faculty's table
  });

  return doc;
}
