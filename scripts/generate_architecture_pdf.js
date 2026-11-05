import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

// Setup Document: A4 Portrait, units in mm
const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
const margin = 14;
const contentWidth = pageWidth - margin * 2;

// Brand Colors
const MAROON = [123, 17, 19]; // #7B1113
const DARK_MAROON = [96, 13, 15]; // #600d0f
const SLATE_DARK = [30, 41, 59]; // #1e293b
const SLATE_MUTED = [100, 116, 139]; // #64748b
const BG_LIGHT = [248, 250, 252]; // #f8fafc
const BORDER_COLOR = [226, 232, 240]; // #e2e8f0

let yPos = 18;

function addHeader(title, subtitle) {
  // Top Banner Bar
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pageWidth, 5, 'F');

  // Institution Banner Text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...MAROON);
  doc.text('MAHARAJA INSTITUTE OF TECHNOLOGY, MYSORE', margin, yPos);

  yPos += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_MUTED);
  doc.text('Affiliated to VTU, Belagavi | Approved by AICTE, New Delhi | Belawadi, Srirangapatna Taluk, Mandya - 571477', margin, yPos);

  yPos += 5;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.4);
  doc.line(margin, yPos, pageWidth - margin, yPos);

  yPos += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...SLATE_DARK);
  doc.text(title, margin, yPos);

  if (subtitle) {
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...SLATE_MUTED);
    doc.text(subtitle, margin, yPos);
  }
  yPos += 6;
}

function addSectionTitle(title) {
  checkPageBreak(15);
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(margin, yPos - 4, contentWidth, 7, 1, 1, 'F');

  doc.setFillColor(...MAROON);
  doc.rect(margin, yPos - 4, 2.5, 7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(...MAROON);
  doc.text(title, margin + 5, yPos + 1);
  yPos += 7;
}

function checkPageBreak(neededHeight) {
  if (yPos + neededHeight > pageHeight - 15) {
    addFooter();
    doc.addPage();
    yPos = 18;
    // Top Banner Bar on subsequent pages
    doc.setFillColor(...MAROON);
    doc.rect(0, 0, pageWidth, 4, 'F');
  }
}

function addFooter() {
  const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
  doc.setDrawColor(...BORDER_COLOR);
  doc.setLineWidth(0.3);
  doc.line(margin, pageHeight - 10, pageWidth - margin, pageHeight - 10);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(...SLATE_MUTED);
  doc.text('Faculty Portfolio Management System (FPMS) - MIT Mysore', margin, pageHeight - 6);
  doc.text(`Page ${pageNum}`, pageWidth - margin - 12, pageHeight - 6);
}

function addParagraph(text, isBold = false) {
  doc.setFont('helvetica', isBold ? 'bold' : 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE_DARK);
  const splitText = doc.splitTextToSize(text, contentWidth);
  const height = splitText.length * 4;
  checkPageBreak(height + 2);
  doc.text(splitText, margin, yPos);
  yPos += height + 2;
}

function addBullet(label, text) {
  checkPageBreak(8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...MAROON);
  doc.text('•', margin + 2, yPos);
  doc.text(label + ': ', margin + 6, yPos);

  const labelWidth = doc.getTextWidth(label + ': ');
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...SLATE_DARK);

  const remainingText = doc.splitTextToSize(text, contentWidth - labelWidth - 6);
  doc.text(remainingText[0] || '', margin + 6 + labelWidth, yPos);
  yPos += 4;

  if (remainingText.length > 1) {
    for (let i = 1; i < remainingText.length; i++) {
      checkPageBreak(4);
      doc.text(remainingText[i], margin + 6, yPos);
      yPos += 4;
    }
  }
}

function addTableRow(col1, col2, col3, isHeader = false) {
  checkPageBreak(6);
  const c1Width = 35;
  const c2Width = 45;
  const c3Width = contentWidth - c1Width - c2Width;

  if (isHeader) {
    doc.setFillColor(...MAROON);
    doc.rect(margin, yPos - 3.5, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
  } else {
    doc.setFillColor(250, 250, 250);
    doc.rect(margin, yPos - 3.5, contentWidth, 5.5, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE_DARK);
  }

  doc.text(col1, margin + 2, yPos);
  doc.text(col2, margin + c1Width + 2, yPos);
  doc.text(doc.splitTextToSize(col3, c3Width - 4)[0] || '', margin + c1Width + c2Width + 2, yPos);

  yPos += 5.5;
}

// ================= PAGE 1: COVER & OVERVIEW =================
addHeader('Project Architecture & Technical Specification', 'Official Documentation for Mentor Evaluation & Accreditation Audit');

// Metadata Box
doc.setFillColor(...BG_LIGHT);
doc.setDrawColor(...BORDER_COLOR);
doc.roundedRect(margin, yPos, contentWidth, 24, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(...MAROON);
doc.text('PROJECT CREDENTIALS & METADATA', margin + 4, yPos + 5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(8);
doc.setTextColor(...SLATE_DARK);
doc.text('System Title: Faculty Portfolio Management System (FPMS)', margin + 4, yPos + 10);
doc.text('Project Mentorship: Prof. Gururaja M P, Asst. Professor, Dept. of ISE', margin + 4, yPos + 14);
doc.text('Student Team: Thanushree S (4MH23IS109), Vijith Kumar R N (4MH23IS119), Vikas U S (4MH23IS120)', margin + 4, yPos + 18);
doc.text('Accreditation Focus: NAAC Criteria 2 & 3, NBA Tier-II SAR Criterion 4 & 5', margin + 4, yPos + 22);

yPos += 28;

// Section 1: Executive Summary
addSectionTitle('1. Executive Problem Formulation & Objectives');
addParagraph('In standard collegiate administration, faculty appraisals, portfolio verification, and mentor-mentee allocations are managed across scattered spreadsheets and physical paper binders. This lack of centralized infrastructure produces inaccurate accreditation documentation, arbitrary mentor workloads, and delayed task reviews.');
addParagraph('The Faculty Portfolio Management System (FPMS) resolves these challenges through a unified multi-tier governance application engineered specifically for Maharaja Institute of Technology, Mysore. It introduces centralized Master Admin branch governance, dynamic department scoping, automated balanced mentor allocation, VTU cohort generation, verified evidence uploads, and duration-governed circular dispatch.');

// Section 2: System Architecture Diagram (Textual Block Diagram)
addSectionTitle('2. Three-Tier System Architecture Model');

doc.setFillColor(240, 244, 248);
doc.setDrawColor(...BORDER_COLOR);
doc.roundedRect(margin, yPos, contentWidth, 38, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(...MAROON);
doc.text('[TIER 1: PRESENTATION LAYER] - React 18 SPA + Vite + Tailwind CSS', margin + 4, yPos + 5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(...SLATE_DARK);
doc.text('• Responsive Web Client with Zero Browser Dialogs (No window.alert/window.confirm)', margin + 6, yPos + 9);
doc.text('• Modular Portals: Master Admin Governance, Department Admin/HOD, Faculty Portfolios, Public Showcase', margin + 6, yPos + 13);
doc.text('• High-Performance UI State: Instant notification badges, document download triggers, multi-image carousel', margin + 6, yPos + 17);

doc.setFont('helvetica', 'bold');
doc.setTextColor(...MAROON);
doc.text('[TIER 2: APPLICATION & API GATEWAY] - Node.js + Express RESTful API (/api/*)', margin + 4, yPos + 22);

doc.setFont('helvetica', 'normal');
doc.setTextColor(...SLATE_DARK);
doc.text('• Security & Guards: Bearer Token Auth, Role-Based Access Control (requireRole), 25MB Payload Boundaries', margin + 6, yPos + 26);
doc.text('• Pure Algorithmic Engines: Mentor Allocation Balancer, VTU Cohort Generator, Appraisal Scoring Engine', margin + 6, yPos + 30);
doc.text('• AI Synthesis: Google Gemini GenAI SDK for verified faculty performance appraisal reports', margin + 6, yPos + 34);

yPos += 42;

doc.setFillColor(240, 244, 248);
doc.setDrawColor(...BORDER_COLOR);
doc.roundedRect(margin, yPos, contentWidth, 18, 1.5, 1.5, 'FD');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8);
doc.setTextColor(...MAROON);
doc.text('[TIER 3: DATA PERSISTENCE & TELEMETRY] - Atomic JSON Database Engine', margin + 4, yPos + 5);

doc.setFont('helvetica', 'normal');
doc.setFontSize(7.5);
doc.setTextColor(...SLATE_DARK);
doc.text('• Synchronous Disk Persistence + In-Memory Caching for <5ms query response times', margin + 6, yPos + 9);
doc.text('• Document Slips & Evidence Storage (Base64 PDF and Image Data URIs)', margin + 6, yPos + 13);
doc.text('• Immutable Governance Audit Log Trail recording Actor, Action, Entity, and IP Timestamp', margin + 6, yPos + 17);

yPos += 24;

// Section 3: User Roles & Access Hierarchy
addSectionTitle('3. User Roles & Access Control Matrix (RBAC)');

addTableRow('User Role', 'Primary Responsibility', 'Key System Capabilities', true);
addTableRow('MASTER_ADMIN', 'Central Institutional Governance', 'Add/edit branches (ISE, CSE, AIDS), provision/reset branch admin credentials, audit telemetry');
addTableRow('ADMIN', 'Institution Office Operations', 'Configure active operating department, academic cycle (2026-27), staff designations, circulars');
addTableRow('HOD', 'Department Head & Academic Roster', 'Review faculty portfolio submissions, execute mentor allocation engine, initiate student promotions');
addTableRow('FACULTY', 'Teaching & Research Portfolios', 'Upload Scopus/WoS papers, patents, FDPs; track assigned student mentees; view class timetables');
addTableRow('NON_TEACHING', 'Laboratory & Technical Duties', 'Maintain department lab infrastructure, register equipment verification, view circular notices');
addTableRow('PUBLIC', 'Unauthenticated Showcase', 'Browse verified campus achievements, conferences, student milestones, and photo gallery');

addFooter();

// ================= PAGE 2: CORE ENGINES & FUNCTIONALITIES =================
doc.addPage();
yPos = 18;
doc.setFillColor(...MAROON);
doc.rect(0, 0, pageWidth, 4, 'F');

addSectionTitle('4. Deep-Dive: Core Business Logic & Algorithmic Engines');

addParagraph('FPMS is driven by deterministic, pure business logic engines designed to eliminate human bias and guarantee compliance with Visvesvaraya Technological University (VTU) and accreditation standards.');

addBullet('4.1 Automated Balanced Mentor Allocation Engine', 'Evenly distributes 2nd, 3rd, and 4th year student cohorts across all eligible teaching faculty. Calculates ceiling quota: Quota = ceil(Total Students / Eligible Mentors). Guarantees that no mentor is overburdened and outputs an official 2-column VTU mentee roster format with parent contact information for NAAC Criterion 2.3.');

addBullet('4.2 VTU Student Cohort & Promotion Engine', 'Generates and validates VTU USNs following the official schema: 4MH{YY}{DEPT}{NNN} (e.g., 4MH23IS119). Includes batch Excel import parsing and collision detection to prevent duplicate seat numbers. Executes safe, atomic batch student promotions (Year 1 to 2, 2 to 3, 3 to 4, 4 to Alumni) while preventing accidental overwrite of existing cohorts.');

addBullet('4.3 Faculty Appraisal & Deliverable Review State Machine', 'Enforces a strict Finite State Machine for faculty submissions: ASSIGNED -> SUBMITTED -> APPROVED or RETURNED (with mandatory HOD review remarks). Automatically tallies performance scores based on weighted NAAC metrics (Scopus/WoS publications = 20 pts, Patents = 30 pts, FDPs = 15 pts).');

addBullet('4.4 Notification Lifecycle & Expiration Engine', 'Enables circular broadcast with customizable active durations (Presets: 1 Day urgent, 3, 7, 15, 30 days, or exact calendar date picker validUntil). Features automatic notice archiving upon expiration, recipient deduplication, and direct 1-click document download links on cards and preview modals.');

addBullet('4.5 Audience-Aware Academic Feed & Photo Gallery', 'Provides an interactive multi-image carousel for campus milestones with explicit audience segregation: PUBLIC (visible on homepage to external visitors) versus INTERNAL CAMPUS ONLY (restricted to authenticated faculty and staff).');

// Section 5: Step-by-Step System Workflows
addSectionTitle('5. End-to-End Operational Workflows');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(...SLATE_DARK);
doc.text('Workflow 1: Branch Provisioning by Master Admin', margin, yPos);
yPos += 4;
addParagraph('1. Master Admin logs in via email/password (masteradmin@gmail.com) or Email OTP.\n2. Navigates to Master Admin Console and adds department (Name e.g., "Artificial Intelligence and Data Science", Code: "AIDS").\n3. System automatically scaffolds department records and provisions dedicated Admin/HOD login credentials.\n4. Master Admin copies/downloads official handover credential slip for the newly appointed department leadership.');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(...SLATE_DARK);
doc.text('Workflow 2: Balanced Mentor Allocation by HOD', margin, yPos);
yPos += 4;
addParagraph('1. HOD accesses Mentor Allocation tab and reviews eligible faculty mentors.\n2. Selects Target Academic Year (e.g. 2026-27) and clicks "Auto-Generate Balanced Allocation".\n3. Engine analyzes active student counts across 2nd, 3rd, and 4th years and balances mentees equally.\n4. HOD inspects the allocation preview, publishes the roster, and exports the official VTU 2-column report.\n5. Faculty members immediately see their assigned mentees in their personal portal.');

doc.setFont('helvetica', 'bold');
doc.setFontSize(8.5);
doc.setTextColor(...SLATE_DARK);
doc.text('Workflow 3: Circular Broadcast with Attached Document Download', margin, yPos);
yPos += 4;
addParagraph('1. Admin or HOD clicks "Circulate Official Notice" in the Notifications Center.\n2. Enters Reference No, subject, target audience, attaches official document (PDF/Image), and selects duration.\n3. Notice is broadcasted with deduplication. Recipients receive real-time unread badges.\n4. Faculty members open the notice corner dropdown and can click "Download File" directly without leaving their workspace.');

// Section 6: Mentorship & Viva Voce Talking Points
addSectionTitle('6. Key Highlights for Mentor Evaluation & Viva Voce');
addBullet('Zero Mock Implementations', 'All routes connect to Express REST API with persistent server-side storage and unit-tested business logic.');
addBullet('Accreditation Ready', 'Pre-configured schemas directly mapping to NAAC Criteria 2.1, 2.3, 3.4 and NBA Criteria 4 & 5.');
addBullet('Enterprise Security', 'Layered RBAC with token authentication and immutable audit telemetry.');

addFooter();

// Save to disk
const outputDir = path.resolve('public');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, 'FPMS_Project_Architecture_and_Specifications.pdf');
const pdfBytes = doc.output('arraybuffer');
fs.writeFileSync(outputPath, Buffer.from(pdfBytes));
console.log(`Successfully generated PDF: ${outputPath}`);
