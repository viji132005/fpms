import { jsPDF } from 'jspdf';
import fs from 'fs';
import path from 'path';

function createMentorArchitecturePDF(): Buffer {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;

  // Palette
  const colorMaroon: [number, number, number] = [123, 17, 19];
  const colorDark: [number, number, number] = [30, 41, 59];
  const colorSlate: [number, number, number] = [51, 65, 85];
  const colorMuted: [number, number, number] = [100, 116, 139];
  const colorLightBg: [number, number, number] = [248, 250, 252];
  const colorAmber: [number, number, number] = [180, 83, 9];
  const colorEmerald: [number, number, number] = [16, 149, 106];

  const drawHeaderFooter = (pageNumber: number, totalPages: number) => {
    // Header line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.4);
    doc.line(margin, 15, pageWidth - margin, 15);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...colorMaroon);
    doc.text('MAHARAJA INSTITUTE OF TECHNOLOGY, MYSORE · DEPT OF ISE', margin, 12);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text('FPMS - System Architecture & Mentor Review', pageWidth - margin, 12, { align: 'right' });

    // Footer
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colorMuted);
    doc.text('Confidential · Under the Guidance of Prof. Gururaja M P', margin, pageHeight - 9);
    doc.text(`Page ${pageNumber} of ${totalPages}`, pageWidth - margin, pageHeight - 9, { align: 'right' });
  };

  // ==========================================
  // PAGE 1: TITLE & COVER SPECIFICATION
  // ==========================================
  // Top Banner
  doc.setFillColor(...colorMaroon);
  doc.rect(0, 0, pageWidth, 42, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text('MAHARAJA INSTITUTE OF TECHNOLOGY, MYSORE', pageWidth / 2, 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Affiliated to VTU Belagavi · Approved by AICTE New Delhi · Accredited Institution', pageWidth / 2, 23, { align: 'center' });
  doc.text('DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING', pageWidth / 2, 30, { align: 'center' });

  // Document Title Card
  let y = 58;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(...colorDark);
  doc.text('FACULTY PORTFOLIO MANAGEMENT SYSTEM', pageWidth / 2, y, { align: 'center' });

  y += 7;
  doc.setFontSize(13);
  doc.setTextColor(...colorMaroon);
  doc.text('(FPMS) - SYSTEM ARCHITECTURE SPECIFICATION', pageWidth / 2, y, { align: 'center' });

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...colorMuted);
  doc.text('Comprehensive Project Architecture, Roles, Features & Accreditation Compliance Review', pageWidth / 2, y, { align: 'center' });

  // Decorative separator
  y += 8;
  doc.setDrawColor(...colorMaroon);
  doc.setLineWidth(1.2);
  doc.line(pageWidth / 2 - 35, y, pageWidth / 2 + 35, y);

  // Student Team & Mentorship Panel
  y += 14;
  doc.setFillColor(...colorLightBg);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, y, contentWidth, 68, 3, 3, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...colorMaroon);
  doc.text('PROJECT CREDENTIALS & MENTORSHIP', margin + 8, y + 10);

  // 2-column layout inside card
  const col1X = margin + 8;
  const col2X = margin + 95;
  let cardY = y + 18;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorDark);
  doc.text('Project Mentorship / Guide:', col1X, cardY);
  doc.text('Student Development Team:', col2X, cardY);

  cardY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colorSlate);
  doc.text('Prof. Gururaja M P', col1X, cardY);
  doc.text('• Thanushree S  [USN: 4MH23IS109]', col2X, cardY);

  cardY += 4.5;
  doc.text('Assistant Professor, Department of ISE', col1X, cardY);
  doc.text('• Vijith Kumar R N [USN: 4MH23IS119]', col2X, cardY);

  cardY += 4.5;
  doc.text('Maharaja Institute of Technology, Mysore', col1X, cardY);
  doc.text('• Vikas U S [USN: 4MH23IS120]', col2X, cardY);

  cardY += 7;
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colorDark);
  doc.text('Head of Department:', col1X, cardY);
  doc.text('Academic Assessment Cycle:', col2X, cardY);

  cardY += 5;
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colorSlate);
  doc.text('Dr. Sharath Kumar Y H', col1X, cardY);
  doc.text('Cycle: 2026-27 (Odd / Even Semesters)', col2X, cardY);

  cardY += 4.5;
  doc.text('Professor & HOD, Department of ISE', col1X, cardY);
  doc.text('Target: NAAC Criteria & NBA Tier-II SAR', col2X, cardY);

  // Key Highlights Box below
  y += 76;
  doc.setFillColor(254, 243, 199); // Amber soft
  doc.setDrawColor(245, 158, 11);
  doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorAmber);
  doc.text('KEY ARCHITECTURAL HIGHLIGHTS FOR MENTOR EVALUATION', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colorDark);
  doc.text('1. Dedicated Master Administrator Portal: Centralized branch creation and admin credential provisioning.', margin + 6, y + 14);
  doc.text('2. Balanced Mentor Allocation Engine: Proportional student distribution across 2nd, 3rd, and 4th year batches.', margin + 6, y + 20);
  doc.text('3. Finite State Machine Task Review: Strict ASSIGNED -> SUBMITTED -> APPROVED / RETURNED workflows.', margin + 6, y + 26);
  doc.text('4. Circulars with Customizable Expiry & 1-Click Downloads: Direct file attachments & auto-archiving.', margin + 6, y + 32);

  // Footer for Page 1
  doc.setDrawColor(226, 232, 240);
  doc.line(margin, pageHeight - 18, pageWidth - margin, pageHeight - 18);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorMuted);
  doc.text('Maharaja Institute of Technology, Mysore · Faculty Portfolio Management System · Technical Design Document', margin, pageHeight - 12);
  doc.text('Page 1 of 5', pageWidth - margin, pageHeight - 12, { align: 'right' });

  // ==========================================
  // PAGE 2: SYSTEM ARCHITECTURE & TOPOLOGY
  // ==========================================
  doc.addPage();
  drawHeaderFooter(2, 5);

  y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorMaroon);
  doc.text('1. SYSTEM ARCHITECTURE & LAYERED TOPOLOGY', margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colorSlate);
  const archIntro = 'The Faculty Portfolio Management System is architectured as a multi-tier, decoupled full-stack application. It cleanly isolates the Presentation Layer, API Routing Gateway, Pure Business Logic Engines, and the Atomic Persistence Store, guaranteeing high responsiveness, strict data boundaries, and auditability.';
  const splitArchIntro = doc.splitTextToSize(archIntro, contentWidth);
  doc.text(splitArchIntro, margin, y);
  y += splitArchIntro.length * 4.5 + 4;

  // Architectural Layers Box
  const layers = [
    {
      title: 'Layer 1: Client Presentation Tier (React 18 SPA + Vite + Tailwind CSS)',
      desc: 'Modular component architecture with functional hooks. Native responsive views for Master Admin, Department Admin, Faculty, and Public visitors. Zero blocking dialogs; all actions use accessible modal overlays and asynchronous notifications.',
    },
    {
      title: 'Layer 2: API Routing & Role Guard Gateway (Express.js + RBAC Middleware)',
      desc: 'REST API endpoints mounted under /api/*. Enforces tokenized session verification via authMiddleware and strict privilege checking via requireRole. Multi-part and Base64 upload support with a 25MB boundary for official slips and certificates.',
    },
    {
      title: 'Layer 3: Core Business & Computational Engines (TypeScript Modules)',
      desc: 'Pure, test-driven algorithms: Balanced Mentor Allocation Engine (mentor quota distribution), Student Promotion & Cohort Engine (VTU USN syntax validation and collision avoidance), and Faculty Appraisal Scoring Engine.',
    },
    {
      title: 'Layer 4: Atomic Data Store & Audit Telemetry (JSON Engine + File Sync)',
      desc: 'High-speed in-memory database with synchronous atomic disk persistence in db.ts. Ensures zero cold-start latency (< 5ms response time) with ACID-compliant updates and immutable governance audit logging.',
    },
  ];

  layers.forEach((layer) => {
    doc.setFillColor(...colorLightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 23, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...colorMaroon);
    doc.text(layer.title, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...colorSlate);
    const splitDesc = doc.splitTextToSize(layer.desc, contentWidth - 8);
    doc.text(splitDesc, margin + 4, y + 11.5);

    y += 26;
  });

  // ASCII Topology diagram
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorDark);
  doc.text('Logical Dataflow Diagram:', margin, y);
  y += 5;

  doc.setFillColor(15, 23, 42); // slate-900 terminal
  doc.roundedRect(margin, y, contentWidth, 54, 2, 2, 'F');

  doc.setFont('courier', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(241, 245, 249);

  const asciiLines = [
    '  [ Client Browser (React SPA) ]  <--->  HTTPS REST APIs (/api/*)',
    '               |                                    |',
    '               v                                    v',
    '  [ Auth & RBAC Gateway ] --------> [ Role Guard: MASTER_ADMIN / ADMIN / HOD / FACULTY ]',
    '               |                                    |',
    '               +------------------+-----------------+',
    '                                  |',
    '                                  v',
    '       [ Core Computational Services & Business Logic Engines ]',
    '       * Mentor Allocation Engine        * Student USN & Cohort Generator',
    '       * Faculty Appraisal Scoring       * Task Review State Machine',
    '                                  |',
    '                                  v',
    '       [ Atomic Persistent DB Store ] <---> [ Immutable Audit Trail ]',
  ];

  let asciiY = y + 7;
  asciiLines.forEach((line) => {
    doc.text(line, margin + 4, asciiY);
    asciiY += 3.3;
  });

  // ==========================================
  // PAGE 3: ROLE-BASED ACCESS CONTROL (RBAC)
  // ==========================================
  doc.addPage();
  drawHeaderFooter(3, 5);

  y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorMaroon);
  doc.text('2. USER ROLES & ACCESS CONTROL GOVERNANCE (RBAC)', margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colorSlate);
  const rbacIntro = 'FPMS enforces a strict multi-tier Role-Based Access Control hierarchy to ensure that department administrators and faculty only access data within their assigned branch, while the Master Administrator retains central oversight over institutional branches.';
  const splitRbac = doc.splitTextToSize(rbacIntro, contentWidth);
  doc.text(splitRbac, margin, y);
  y += splitRbac.length * 4.5 + 4;

  const roleSpecs = [
    {
      role: 'MASTER_ADMIN (Institutional Central Governance)',
      auth: 'masteradmin@gmail.com / 4MH23IS119@gmail.com (Password / Email OTP)',
      responsibilities: 'Exclusive authority to create and customize college departments (e.g. ISE, CSE, AIDS, ECE, MECH, CIVIL) and generate/reset scoped credentials for department branch admins. Oversees institutional capacity without interfering with faculty personal portfolio documents.',
    },
    {
      role: 'ADMIN (Institutional Administrative Officer / Principal Office)',
      auth: 'admin@mitmysore.in (Standard Portal Authentication)',
      responsibilities: 'Maintains global institution settings, current academic cycle (e.g. 2026-27), institution-wide circular distributions, staff designations, and accreditation telemetry across departments.',
    },
    {
      role: 'HOD (Head of Department - Scoped Branch Authority)',
      auth: 'hod.ise@mitmysore.in, hod.cse@mitmysore.in (Branch Specific)',
      responsibilities: 'Autonomous control over departmental faculty, student cohorts, balanced mentor-mentee allocations, timetable uploads, and deliverable reviews (APPROVE or RETURN with correction notes).',
    },
    {
      role: 'FACULTY (Teaching Faculty Members & Mentors)',
      auth: 'gururaja.ise@mitmysore.in, etc. (Official College Email ID)',
      responsibilities: 'Maintains academic portfolios (research publications, patents, FDPs, consultancies, workshops), tracks assigned student mentees, inspects class timetables, and downloads official circulars.',
    },
    {
      role: 'NON_TEACHING (Laboratory Instructors & Technical Staff)',
      auth: 'ramesh.ise@mitmysore.in',
      responsibilities: 'Records laboratory maintenance, equipment calibration, and departmental technical inventory.',
    },
    {
      role: 'PUBLIC (External Visitors, Students & Recruiters)',
      auth: 'Unauthenticated Public Route (/feed, /about, /)',
      responsibilities: 'Inspects approved institutional announcements, academic milestones, research breakthroughs, and verified campus photo carousels.',
    },
  ];

  roleSpecs.forEach((r) => {
    doc.setFillColor(...colorLightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 24, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colorMaroon);
    doc.text(r.role, margin + 4, y + 5.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorAmber);
    doc.text(`Auth: ${r.auth}`, margin + 4, y + 10.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorSlate);
    const splitR = doc.splitTextToSize(r.responsibilities, contentWidth - 8);
    doc.text(splitR, margin + 4, y + 15);

    y += 27;
  });

  // Small matrix table
  y += 2;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...colorDark);
  doc.text('Summary Permission Matrix:', margin, y);
  y += 4;

  const headers = ['Permission Action', 'Master Admin', 'Admin', 'HOD', 'Faculty'];
  const rows = [
    ['Create / Rename Branch', 'YES (Global)', 'NO', 'NO', 'NO'],
    ['Provision HOD Credentials', 'YES (Global)', 'NO', 'NO', 'NO'],
    ['Balanced Mentor Allocation', 'Oversee', 'YES', 'YES (Dept)', 'View Mentees'],
    ['Task Deliverable Review', 'Oversee', 'YES', 'YES (Dept)', 'Submit Only'],
    ['Official Circular Broadcast', 'YES', 'YES', 'YES (Dept)', 'Read/Download'],
  ];

  // Draw table header
  doc.setFillColor(...colorMaroon);
  doc.rect(margin, y, contentWidth, 6, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(headers[0], margin + 2, y + 4.2);
  doc.text(headers[1], margin + 65, y + 4.2);
  doc.text(headers[2], margin + 98, y + 4.2);
  doc.text(headers[3], margin + 128, y + 4.2);
  doc.text(headers[4], margin + 155, y + 4.2);
  y += 6;

  rows.forEach((row, i) => {
    doc.setFillColor(i % 2 === 0 ? 255 : 248, 250, 252);
    doc.rect(margin, y, contentWidth, 5.2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...colorDark);
    doc.text(row[0], margin + 2, y + 3.8);
    doc.text(row[1], margin + 65, y + 3.8);
    doc.text(row[2], margin + 98, y + 3.8);
    doc.text(row[3], margin + 128, y + 3.8);
    doc.text(row[4], margin + 155, y + 3.8);
    y += 5.2;
  });

  // ==========================================
  // PAGE 4: DETAILED FEATURES & WORKFLOWS
  // ==========================================
  doc.addPage();
  drawHeaderFooter(4, 5);

  y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorMaroon);
  doc.text('3. COMPREHENSIVE FEATURES & ALGORITHMIC WORKFLOWS', margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colorSlate);
  const featIntro = 'FPMS replaces manual spreadsheets and unverified departmental folders with automated, algorithm-driven academic services.';
  doc.text(featIntro, margin, y);
  y += 6;

  const features = [
    {
      title: 'A. Dynamic Department & Branch Provisioning',
      bullets: [
        'Master Admin configures branch full names, official acronyms (ISE, CSE, AIDS), and active status.',
        'Issues initial temporary passwords and downloadable handover credential slips for branch HODs.',
        'Changes dynamically reflect across all faculty views and institution settings without codebase alterations.',
      ],
    },
    {
      title: 'B. Automated Balanced Mentor-Mentee Allocation Engine',
      bullets: [
        'Partitions active students across Year 2 (III/IV Sem), Year 3 (V/VI Sem), and Year 4 (VII/VIII Sem).',
        'Calculates equitable target quota: Quota = ceil(Total Students / Eligible Mentors).',
        'Distributes students evenly so each faculty mentor receives a balanced mix of junior and senior mentees.',
        'Outputs ready-to-print official VTU 2-column mentee rosters meeting NAAC Criterion 2.3.',
      ],
    },
    {
      title: 'C. VTU Student Cohort & Promotion Engine',
      bullets: [
        'Automated sequential USN generation complying with VTU pattern 4MH{YY}{DEPT}{INDEX}.',
        'Collision detection prevents duplicate USN enrollment across academic cycles.',
        'Batch student promotion transitions Year 1 -> 2 -> 3 -> 4 -> Graduated Alumni with audit logging.',
      ],
    },
    {
      title: 'D. Faculty Appraisal & Submission Finite State Machine (FSM)',
      bullets: [
        'Enforces strict lifecycle: ASSIGNED -> SUBMITTED (Version N) -> APPROVED / RETURNED (with remarks).',
        'Supports document evidence verification for Scopus publications, Indian patents, FDPs, and workshops.',
        'Computes quantitative appraisal scores across Teaching, Research, and Administrative contributions.',
      ],
    },
    {
      title: 'E. Circular Distribution with Customizable Duration & Direct Downloads',
      bullets: [
        'Authors configure notice validity: Presets (1, 3, 7, 15, 30 days) or specific calendar date (validUntil).',
        'System automatically archives expired circulars while preserving historical records for accreditation.',
        '1-click direct download button on cards and preview modals for PDF and image attachments.',
        'Corner notification popover provides instant unread badge counts and a 1-click "Mark All Read" action.',
      ],
    },
    {
      title: 'F. Audience-Aware Academic Feed & Photo Gallery',
      bullets: [
        'Supports two distinct visibility tiers: Public (Campus-Wide & External Showcase) and Internal Campus (Faculty/Staff Only).',
        'Multi-image carousel slider with full-screen inspection for conference and lab inaugurations.',
      ],
    },
  ];

  features.forEach((f) => {
    doc.setFillColor(...colorLightBg);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(margin, y, contentWidth, 31, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...colorMaroon);
    doc.text(f.title, margin + 4, y + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...colorSlate);
    let bulletY = y + 10.5;
    f.bullets.forEach((b) => {
      doc.text(`• ${b}`, margin + 4, bulletY);
      bulletY += 4.5;
    });

    y += 34;
  });

  // ==========================================
  // PAGE 5: ACCREDITATION ALIGNMENT & CONCLUSION
  // ==========================================
  doc.addPage();
  drawHeaderFooter(5, 5);

  y = 24;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...colorMaroon);
  doc.text('4. ACCREDITATION ALIGNMENT & TECHNICAL VERIFICATION', margin, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(...colorSlate);
  const accIntro = 'FPMS was designed and engineered specifically to satisfy the stringent requirements of national engineering accreditation bodies:';
  doc.text(accIntro, margin, y);
  y += 6;

  // NAAC & NBA Cards
  doc.setFillColor(...colorLightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 52, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorMaroon);
  doc.text('NAAC (National Assessment and Accreditation Council) Criteria Mapping:', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorDark);
  const naacPoints = [
    '• Criterion 2.1 (Student Enrollment & Profile): USN cohort validation, year-wise active and graduated tracking.',
    '• Criterion 2.3 (Teaching-Learning Process / Mentoring): Automated balanced mentor-mentee allocation rosters.',
    '• Criterion 2.4 (Teacher Profile & Quality): Full qualification records (Ph.D, M.Tech), designations, and experience.',
    '• Criterion 3.4 (Research Publications & Awards): Indexed journal citations, ISBN publications, Indian patents.',
    '• Criterion 6.3 (Faculty Empowerment Strategies): FDP attendance tracking, conference funding proof, and appraisals.',
  ];
  let pY = y + 14;
  naacPoints.forEach((p) => {
    doc.text(p, margin + 6, pY);
    pY += 6.5;
  });

  y += 58;
  doc.setFillColor(...colorLightBg);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, y, contentWidth, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...colorMaroon);
  doc.text('NBA (National Board of Accreditation) Tier-II SAR Alignment:', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorDark);
  const nbaPoints = [
    '• Criterion 4 (Students Performance): Student promotion history, retention tracking, and mentee interaction audits.',
    '• Criterion 5 (Faculty Information & Contributions): Student-to-Faculty Ratio (SFR) calculation, Cadre Ratio compliance.',
    '• Faculty Workload & Timetables: Master class schedules and individual faculty teaching workload distributions.',
    '• Continuous Improvement: Audit logs of reviews and corrective iterations between HOD and faculty.',
  ];
  pY = y + 14;
  nbaPoints.forEach((p) => {
    doc.text(p, margin + 6, pY);
    pY += 6.5;
  });

  // Automated Verification Summary
  y += 48;
  doc.setFillColor(240, 253, 244); // Emerald soft
  doc.setDrawColor(34, 197, 94);
  doc.roundedRect(margin, y, contentWidth, 34, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...colorEmerald);
  doc.text('AUTOMATED CODEBASE VERIFICATION & TESTING SUMMARY', margin + 6, y + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorDark);
  doc.text('• Unit Testing Suite: Node.js native test runner verifies cohort generation, collision checks, and circular filters.', margin + 6, y + 14);
  doc.text('• Static Typing & Linting: Zero TypeScript errors (tsc --noEmit) across all frontend and backend modules.', margin + 6, y + 20);
  doc.text('• Browser Automation: Verified end-to-end via Playwright for Master Admin login, circulars, and feed visibility.', margin + 6, y + 26);

  // Sign-off signature block
  y += 42;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...colorDark);
  doc.text('Prepared by Student Project Team:', margin, y);
  doc.text('Verified & Approved by Mentor:', pageWidth - margin, y, { align: 'right' });

  y += 12;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...colorSlate);
  doc.text('Thanushree S, Vijith Kumar R N, Vikas U S', margin, y);
  doc.text('Prof. Gururaja M P (Assistant Professor, Dept of ISE)', pageWidth - margin, y, { align: 'right' });

  return Buffer.from(doc.output('arraybuffer'));
}

// Generate the file
const pdfBuffer = createMentorArchitecturePDF();
const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'FPMS_Project_Architecture_and_Mentor_Briefing.pdf');
fs.writeFileSync(outputPath, pdfBuffer);
console.log(`[SUCCESS] PDF generated at: ${outputPath} (${pdfBuffer.length} bytes)`);
