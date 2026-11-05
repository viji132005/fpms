# Implementation Plan: Academic Subjects & Multi-Section Timetable Management

## Overview
Comprehensive overhaul of the Timetable Management module for the Faculty Portfolio Management System (FPMS) at Maharaja Institute of Technology Mysore (MIT Mysore). The system provides a seamless three-stage scheduling pipeline: Academic Subjects & Syllabus management, Faculty-to-Section Subject Allocation with automated faculty initials, and Multi-Section Timetable Creation with an interactive continuous subject stamp mode matching the attached 3rd Year 6th Semester template for Sections A, B, and C.

---

## 1. Features Implemented

### A. Navigation & Master Admin Updates
- **Sidebar Navigation Order**: Repositioned `Timetable Management` in the Admin sidebar directly below `Mentor Allocation`.
- **Master Admin Credentials Management**: Added a dedicated "Change Email ID & Password" button directly in the Master Admin header banner, wired to `/api/admin/change-credentials` to allow Master Admin to update email ID and password.

### B. Stage 1: Academic Subjects & Syllabus
- **Year-to-Semester Hierarchy**:
  - 1st Year: Sem 1, Sem 2
  - 2nd Year: Sem 3, Sem 4
  - 3rd Year: Sem 5, Sem 6
  - 4th Year: Sem 7, Sem 8
- **CRUD Operations**: Add, Edit, Delete subjects with Subject Code (e.g., `M23BIS601`), Full Title (`FULL STACK DEVELOPMENT`), Short Name (`FSD`), Category (`THEORY`, `LAB`, `PROJECT`, `ELECTIVE`, `TRAINING`, `ACTIVITY`), and Hours/Week.
- **Pre-seeded Syllabus**: Pre-seeded standard curriculum for all semesters, specifically including 6th Semester: `FSD`, `ML`, `BCT`, `OE`, `PROJECT`, `ML LAB`, `DEVOPS`, `NSS/YOGA`, and `PLACEMENT`.

### C. Stage 2: Faculty & Section Allocation with Automated Initials
- **Per-Section Allocation**: Select Year and Semester, then assign faculty to each subject across active sections (Sections A, B, C, D).
- **Automated Faculty Initials Generator**: `src/utils/facultyInitials.ts` parses faculty names and titles into institutional initials (e.g. `Prof. Amruth V` -> `AV`, `Dr. Ravi P` -> `RP`, `Prof. Ganavi N P` -> `GNP`, `Prof. Siddaraju M G` -> `SMG`, `Prof. Bhavya H D` -> `BHD`, `Prof. Rohith Gowda K S` -> `RKS`, `Prof. Sharada S S` -> `SSS`, `Prof. Zeeshan Ali` -> `ZA`, `Dr. Sangeetha G` -> `SG`).
- **Batch Lab Handling**: Supports multi-faculty lab breakdowns (e.g. `ML LAB` with `B1: RP/RNH`, `B2: SMG/MMG`, `B3: ZA`).

### D. Stage 3: Multi-Section Timetable Grid & Continuous Stamp Mode
- **Template Layout Matching Attached Document**:
  - Days: `MON`, `TUE`, `WED`, `THU`, `FRI`
  - Periods: `09.00am to 10.00am`, `10.00am to 11.00am`, `11.00am to 11.25am` (`SHORT BREAK`), `11.25am to 12.20pm`, `12.20pm to 01.15pm`, `01.15pm to 02.00pm` (`LUNCH BREAK`), `02.00pm to 03.00pm`, `03.00pm to 04.00pm`.
  - Room Number input and Class Teacher assignment per section.
- **Interactive Continuous Stamp Palette**:
  - Subject chips with short names and category badges.
  - Selecting a subject activates Stamp Mode.
  - Clicking any cell in Section A stamps Subject Short Name above and Section A's assigned faculty initials below.
  - Clicking Section B stamps Subject Short Name above and Section B's assigned faculty initials below.
  - Clicking with the Eraser tool clears cells instantly.
- **Cross-Section Clash Detection**: Real-time validation verifying that no faculty member is double-booked across Section A, B, or C at the same day and time period.
- **One-Click Official Seed**: "Load 6th Sem MITM Template" button populates the exact 6th Sem schedule from the attached PDF.

### E. Stage 4: Official MIT Mysore Print / Download View
- Exact institutional presentation with MIT Mysore crest logo, VTU affiliation header, Class information, tabular schedule with break columns, bottom Faculty Legend Table (`SUB CODE`, `SUBJECT TITLE`, `SUB IN SHORT`, `FACULTY`, `FACULTY INITIALS`), and signatures for HOD and Principal.

---

## 2. Verification Summary
- **Unit Tests**: 18/18 tests passed across 4 test suites (`facultyInitials.test.ts`, `timetableMultiSection.test.ts`, `timetableValidation.test.ts`, `masterAdminNotifications.test.ts`).
- **Compilation**: Clean TypeScript build with zero errors.
- **Browser Journey (Playwright)**:
  - Verified Master Admin change credentials modal and sign-out.
  - Verified ISE Admin navigation: `Timetable Management` positioned directly below `Mentor Allocation`.
  - Verified Academic Subjects, Faculty Allocation, Multi-Section Grid with Stamp Mode, and Official MIT Mysore Timetable layout.
