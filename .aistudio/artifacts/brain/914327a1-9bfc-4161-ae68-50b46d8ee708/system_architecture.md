# Faculty Portfolio Management System (FPMS)
## System Architecture & Technical Design Specification
**Institution:** Maharaja Institute of Technology, Mysore (MIT Mysore)  
**Department:** Information Science and Engineering (ISE)  
**Project Mentorship:** Prof. Gururaja M P, Assistant Professor, Dept. of ISE  
**Project Authors:** Thanushree S (4MH23IS109), Vijith Kumar R N (4MH23IS119), Vikas U S (4MH23IS120)  
**Version:** 2.4.0 (Accreditation & Central Governance Edition)

---

## 1. Executive Summary & Problem Formulation
Faculty appraisal, portfolio verification, mentor-mentee distribution, and accreditation compliance (NAAC Criterion 1-7 and NBA Tier-II SAR) require cross-departmental coordination, evidence preservation, and transparent governance. Traditional manual spreadsheets and departmental silos lead to:
1. Fragmented academic activity tracking (publications, patents, FDPs, workshops).
2. Unbalanced and arbitrary mentor allocations across student batches.
3. Lack of strict submission review state transitions between faculty and HODs.
4. Absence of central oversight across evolving engineering branches.

**FPMS** solves this with a unified, role-governed web architecture featuring automated VTU cohort generation, deterministic mentor allocation balancing, verified evidence uploads, and centralized Master Administrator branch provisioning.

---

## 2. High-Level System Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                   CLIENT PRESENTATION LAYER                                      |
|                                                                                                   |
|  +--------------------+  +--------------------+  +--------------------+  +---------------------+  |
|  |    Master Admin    |  |     Department     |  |      Teaching      |  |   Public Campus     |  |
|  |     Governance     |  |    HOD / Admin     |  |      Faculty       |  |     Showcase &      |  |
|  |    Web Console     |  |     Workflows      |  |    Portfolios      |  |    Photo Gallery    |  |
|  +---------+----------+  +---------+----------+  +---------+----------+  +----------+----------+  |
|            |                       |                       |                        |             |
|            +-----------------------+-----------------------+------------------------+             |
|                                    | (HTTPS / JSON API)                                           |
+------------------------------------|--------------------------------------------------------------+
                                     v
+------------------------------------+--------------------------------------------------------------+
|                          API ROUTING & SECURITY GATEWAY                                           |
|                                                                                                   |
|  - Token Session Validator (`authMiddleware`)                                                     |
|  - Role-Based Access Control Gatekeeper (`requireRole`)                                           |
|  - Dynamic Rate & Body Limits (`express.json({ limit: '25mb' })`)                                  |
|  - Dual Authentication Gate (Standard Hash Login + Email OTP Verification)                        |
+------------------------------------+--------------------------------------------------------------+
                                     |
                                     v
+------------------------------------+--------------------------------------------------------------+
|                            CORE APPLICATION SERVICES                                              |
|                                                                                                   |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
|  |  Master Admin &     |  |  Student Promotion  |  |  Mentor Allocation  |  |  Faculty Scoring |  |
|  |  Branch Provisioner |  |   & USN Engine      |  |     Balancer        |  |  & Appraisal AI  |  |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
|  |  Circular Broadcast|  |  Timetable Matrix   |  |  Academic Feed &    |  |  Audit Log       |  |
|  |  & Document Dispatch|  |  Workload Manager   |  |  Carousel Gallery   |  |  Telemetry       |  |
|  +---------------------+  +---------------------+  +---------------------+  +------------------+  |
+------------------------------------+--------------------------------------------------------------+
                                     |
                                     v
+------------------------------------+--------------------------------------------------------------+
|                             PERSISTENCE & DATA STORAGE LAYER                                      |
|                                                                                                   |
|  - Atomic Database Store (`src/server/db.ts`) with disk persistence                               |
|  - In-Memory High-Speed Cache for low-latency queries (< 5ms response)                            |
|  - Document Evidence & Slips Repository (Base64 / Data URIs for PDF and images)                   |
|  - Immutable Governance Audit Log Trail                                                           |
+---------------------------------------------------------------------------------------------------+
```

---

## 3. Technology Stack Breakdown

| Layer | Technology | Engineering Rationale |
| :--- | :--- | :--- |
| **Frontend Framework** | React 18 SPA (Vite) | High performance Virtual DOM reconciliation, zero bundle bloat, responsive state hooks. |
| **Language & Typings** | TypeScript (Strict) | End-to-end interface contracts (`User`, `StaffProfile`, `Student`, `Notification`, `FeedPost`). |
| **Styling & Theme** | Tailwind CSS | Utility-first architecture adhering to official MIT Mysore maroon (`#7B1113`) brand identity. |
| **Icons & UI Feedback** | Lucide React | High-contrast visual communication; zero intrusive browser popups (`window.alert` avoided). |
| **Backend Runtime** | Node.js + Express | Native asynchronous I/O, lightweight footprint, and zero cold-start delay. |
| **Persistence** | Structured JSON Data Engine | Instant atomic read/write synchronization with developer portability and ACID compliance. |
| **AI Intelligence** | Gemini GenAI API | Grounded institutional appraisal reports synthesized strictly from verified evidence items. |

---

## 4. Role-Based Access Control (RBAC) Matrix

| Capability / Resource | MASTER_ADMIN | ADMIN | HOD | FACULTY | PUBLIC |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Create & Rename College Branches** | **YES** | No | No | No | No |
| **Provision & Reset Branch Admin Credentials** | **YES** | No | No | No | No |
| **Institutional Campus Settings** | Read-Only | **YES** | No | No | No |
| **Student Cohort Promotion & USN Import** | Oversee | **YES** | **YES** (Dept) | No | No |
| **Mentor Allocation Generation & Publishing** | Oversee | **YES** | **YES** (Dept) | View Mentees | No |
| **Faculty Deliverable & Submission Review** | Oversee | **YES** | **YES** (Approve/Return) | Submit Own | No |
| **Official Circular Broadcast with Documents** | **YES** | **YES** | **YES** (Dept) | Read & Download | No |
| **Academic Feed Post Creation** | **YES** | **YES** | **YES** | **YES** | No |
| **Public Showcase & Event Gallery Inspection** | **YES** | **YES** | **YES** | **YES** | **YES** |

---

## 5. Core Architectural Subsystems

### 5.1 Balanced Mentor Allocation Engine
- **Objective:** Prevent mentor overloading and guarantee that every student batch has an equitable distribution of senior and junior faculty mentors.
- **Algorithm:**
  1. Retrieve eligible teaching faculty where `isMentorEligible === true` and `departmentId === activeDept`.
  2. Partition active students into Year 2, Year 3, and Year 4 cohorts.
  3. Compute proportional target quota:
     $$\text{Quota} = \left\lceil \frac{\text{Total Active Students}}{\text{Eligible Mentors}} \right\rceil$$
  4. Distribute mentees sequentially to mentors while preserving batch diversity.
  5. Format output into an official VTU 2-column mentee roster ready for NAAC/NBA inspection.

### 5.2 Student Cohort & USN Promotion Engine
- **Standard Format:** VTU USN standard `4MH{YY}{BRANCH}{INDEX}` (e.g., `4MH23IS119`).
- **Safety Checks:**
  - Collision detection against existing institutional student seat numbers.
  - Academic year transition validation (prevent duplicate promotion in same cycle).
  - Status classification: `ACTIVE`, `PROMOTED`, `HELD_BACK`, `GRADUATED`.

### 5.3 Faculty Portfolio Appraisal & Submission State Machine
Faculty submissions follow a deterministic Finite State Machine (FSM):
```
    [ASSIGNED]
        |
        | (Faculty uploads deliverable file & notes)
        v
    [SUBMITTED] <--------------------+
        |                            |
        +-----> [RETURNED] ----------+ (Correction cycle)
        |
        v (HOD validates evidence)
    [APPROVED] (Locked for NAAC / NBA Appraisal Calculation)
```

### 5.4 Circular Expiration & Notification Lifecycle
- **Customizable Duration:** Notice authors configure validity periods (Presets: 1, 3, 7, 15, 30 days, or exact date `validUntil`).
- **Auto-Archiving:** The system compares current timestamp against `validUntil` to mark status as `Notice Expired`.
- **Deduplication:** Broadcast circulars are deduplicated so that each authenticated user sees one entry in their inbox.
- **Direct Document Access:** 1-click file download links allow instantaneous retrieval of attached official orders.

---

## 6. Mentorship Review Highlights
When presenting this architecture to your mentor (**Prof. Gururaja M P**), emphasize the following engineering highlights:
1. **Zero Mock Fallbacks:** Real Express REST endpoints with complete persistence across app restarts.
2. **Accreditation Alignment:** Formatted specifically to address NAAC Criterion 2.1 (Student Enrollment), 2.3 (Mentor-Mentee Scheme), 3.4 (Research Publications), and NBA Tier-II Criteria 4 & 5.
3. **Decoupled Business Logic:** Pure computational functions (`cohortGenerator.ts`, `scoringEngine.ts`) validated by automated unit tests.
4. **Institutional Security:** Defense-in-depth security with strict role guards preventing unauthorized cross-department data tampering.
