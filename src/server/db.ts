import fs from 'fs';
import path from 'path';
import {
  getInitialAcademicSubjects,
  getInitialSubjectAllocations,
  getInitial6thSemTimetables,
  ISE_FACULTY_MEMBERS,
} from './seedTimetableData.ts';

export interface User {
  id: string;
  email: string;
  passwordHash: string; // Plaintext or hashed for dev evaluation
  role: 'ADMIN' | 'HOD' | 'FACULTY' | 'NON_TEACHING';
  departmentId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  mustChangePassword?: boolean;
  createdAt: string;
}

export interface StaffProfile {
  id: string;
  userId: string;
  staffId: string;
  fullName: string;
  phone: string;
  designation: string;
  qualification: string;
  specialization: string;
  isTeachingFaculty: boolean;
  isMentorEligible: boolean;
  bio: string;
  profilePhotoUrl?: string;
  cvUrl?: string;
}

export interface Department {
  id: string;
  code: string;
  name: string;
  hodId: string | null;
  active: boolean;
  description?: string;
  savedCredentials?: {
    email: string;
    temporaryPassword?: string;
    issuedAt?: string;
    role?: string;
    staffId?: string;
    adminName?: string;
  };
  createdAt: string;
}

export interface FacultyAssignment {
  id: string;
  courseCode: string;
  courseTitle: string;
  facultyUserId: string;
  facultyName: string;
  staffId: string;
  hoursPerWeek: number;
  isLab: boolean;
  color?: string;
}

export interface TimetableSlot {
  day: string;
  periodIndex: number;
  timeRange: string;
  courseCode: string;
  courseTitle: string;
  courseShortName?: string;
  facultyUserId: string;
  facultyName: string;
  facultyInitials?: string;
  room: string;
  isLab?: boolean;
  isBreak?: boolean;
  breakType?: 'SHORT_BREAK' | 'LUNCH_BREAK' | 'TEA_BREAK' | 'OTHER';
  labDetails?: string;
}

export interface AcademicSubject {
  id: string;
  departmentId: string;
  year: number; // 1, 2, 3, 4
  semester: number; // 1 to 8
  code: string; // e.g. M23BIS601
  title: string; // e.g. FULL STACK DEVELOPMENT
  shortName: string; // e.g. FSD
  isLab?: boolean;
  category?: string;
  hoursPerWeek?: number;
}

export interface SubjectAllocationRecord {
  id: string;
  departmentId: string;
  year: number;
  semester: number;
  section: string; // 'Section A', 'Section B', 'Section C', 'Section D'
  subjectCode: string;
  subjectTitle: string;
  subjectShortName: string;
  facultyUserId: string;
  facultyName: string;
  facultyInitials: string;
  isLab?: boolean;
  labBatches?: { batchName: string; facultyName: string; facultyInitials: string }[];
}

export interface StructuredTimetable {
  id: string;
  departmentId: string;
  academicYear: string;
  semester: string;
  section: string;
  studentYear: number;
  title: string;
  roomNumber?: string;
  classTeacher?: string;
  status: 'DRAFT' | 'VALIDATED' | 'PUBLISHED' | 'REPLACED' | 'ARCHIVED';
  isValidated: boolean;
  version: number;
  isActive: boolean;
  facultyAssignments: FacultyAssignment[];
  schedule: TimetableSlot[];
  subjectLegend?: { code: string; title: string; shortName: string; facultyName: string; facultyInitials: string }[];
  validationReport?: {
    isValid: boolean;
    checkedAt: string;
    conflicts: string[];
    warnings: string[];
    facultyWorkloads?: {
      facultyUserId: string;
      facultyName: string;
      allocatedHours: number;
      assignedTargetHours: number;
    }[];
  };
  publishedAt?: string;
  publishedBy?: string;
  replacedByVersion?: number;
  retentionNote?: string;
  createdAt: string;
  updatedAt: string;
}

import { StudentSectionAllocationRun } from '../types/index.ts';

export interface Student {
  id: string;
  usn: string;
  fullName: string;
  email: string;
  phone: string;
  parentPhone?: string;
  departmentId: string;
  currentYear: number; // 1, 2, 3, 4
  currentSemester: number; // 1 to 8
  section?: string; // 'A', 'B', 'C', etc.
  admissionCohort: string;
  status: 'ACTIVE' | 'DETAINED' | 'WITHDRAWN' | 'GRADUATED';
  mentorId?: string | null;
  mentorName?: string | null;
  mentorStaffId?: string | null;
}

export interface StudentPromotionHistory {
  id: string;
  studentId: string;
  studentUsn: string;
  studentName: string;
  departmentId: string;
  fromYear: number;
  toYear: number;
  academicYear: string;
  promotedBy: string;
  status: 'PROMOTED' | 'HELD_BACK' | 'GRADUATED';
  timestamp: string;
  remarks?: string;
}

export interface MentorAllocation {
  id: string;
  departmentId: string;
  academicYear: string;
  studentYear: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  versionNumber: number;
  createdById: string;
  publishedAt?: string;
  createdAt: string;
  groups: {
    mentorId: string;
    mentorName: string;
    staffId: string;
    studentIds: string[];
  }[];
}

export interface OfficialTimetable {
  id: string;
  departmentId: string;
  academicYear: string;
  semester: string;
  studentYear: number; // 2, 3, 4
  title: string;
  fileUrl: string;
  fileName: string;
  version: number;
  isActive: boolean;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PersonalTimetable {
  id: string;
  facultyUserId: string;
  academicYear: string;
  semester: string;
  title: string;
  fileUrl: string;
  fileName: string;
  uploadedAt: string;
}

export interface PortfolioItem {
  id: string;
  facultyUserId: string;
  facultyName: string;
  departmentId: string;
  category:
    | 'PUBLICATION'
    | 'PATENT'
    | 'FDP'
    | 'WORKSHOP'
    | 'CONFERENCE'
    | 'SEMINAR'
    | 'CERTIFICATION'
    | 'AWARD';
  title: string;
  academicYear: string;
  eventDate: string;
  details: Record<string, any>;
  evidenceDocUrl?: string;
  evidenceDocName?: string;
  status: 'VERIFIED' | 'DRAFT' | 'REJECTED';
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  departmentId: string;
  createdById: string; // HOD
  createdByName: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  requiredDeliverableType: string;
  assignedToFacultyIds: string[]; // empty means all department faculty
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  circularNumber?: string;
  circularDate?: string;
  circularFileUrl?: string;
  circularFileName?: string;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  facultyUserId: string;
  facultyName: string;
  departmentId: string;
  status:
    | 'ASSIGNED'
    | 'SUBMITTED'
    | 'UNDER_REVIEW'
    | 'RETURNED_FOR_CORRECTION'
    | 'RESUBMITTED'
    | 'APPROVED'
    | 'REJECTED';
  currentVersion: number;
  submittedAt?: string;
  submissionNotes?: string;
  fileUrl?: string;
  fileName?: string;
  reviews: {
    reviewerId: string;
    reviewerName: string;
    action: 'APPROVED' | 'RETURNED_FOR_CORRECTION' | 'REJECTED';
    remarks: string;
    reviewedAt: string;
  }[];
}

export interface FeedPost {
  id: string;
  authorUserId: string;
  authorName: string;
  authorRole: 'ADMIN' | 'HOD' | 'FACULTY';
  authorDesignation?: string;
  title: string;
  content: string;
  category:
    | 'INSTITUTIONAL_ANNOUNCEMENT'
    | 'ACADEMIC_EVENT'
    | 'WORKSHOP'
    | 'FDP'
    | 'CONFERENCE'
    | 'RESEARCH'
    | 'PUBLICATION'
    | 'AWARD'
    | 'STUDENT_ACHIEVEMENT';
  eventDate: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  mediaUrls?: string[];
  visibility: 'PUBLIC' | 'INSTITUTION' | 'PRIVATE';
  isApproved: boolean;
  durationDays?: number;
  expiresAt?: string;
  isPinned?: boolean;
  likes: string[]; // user IDs
  comments: {
    id: string;
    userId: string;
    userName: string;
    text: string;
    createdAt: string;
  }[];
  createdAt: string;
}

export interface Notification {
  id: string;
  recipientUserId: string;
  actorUserId?: string;
  actorName?: string;
  title: string;
  message: string;
  type:
    | 'TASK_ASSIGNED'
    | 'SUBMISSION_RECEIVED'
    | 'SUBMISSION_APPROVED'
    | 'SUBMISSION_RETURNED'
    | 'MENTOR_ALLOCATED'
    | 'CIRCULAR'
    | 'ANNOUNCEMENT';
  linkUrl?: string;
  circularNumber?: string;
  circularDate?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  durationDays?: number;
  validUntil?: string;
  isRead: boolean;
  readByUserIds?: string[];
  savedByUserIds?: string[];
  isSaved?: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string;
  actorEmail: string;
  actorRole: string;
  action: string;
  targetEntity: string;
  targetId: string;
  details: string;
  ipAddress?: string;
  timestamp: string;
}

export interface InstitutionSettings {
  institutionName: string;
  institutionShortName: string;
  tagline: string;
  currentAcademicYear: string;
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;
  defaultDepartmentId: string;
  supportedDesignations: string[];
}

export interface DatabaseSchema {
  institution: InstitutionSettings;
  departments: Department[];
  users: User[];
  staffProfiles: StaffProfile[];
  students: Student[];
  studentPromotionHistory: StudentPromotionHistory[];
  mentorAllocations: MentorAllocation[];
  officialTimetables: OfficialTimetable[];
  personalTimetables: PersonalTimetable[];
  structuredTimetables: StructuredTimetable[];
  portfolioItems: PortfolioItem[];
  tasks: Task[];
  taskSubmissions: TaskSubmission[];
  feedPosts: FeedPost[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  academicSubjects: AcademicSubject[];
  subjectAllocations: SubjectAllocationRecord[];
  sectionAllocationRuns: StudentSectionAllocationRun[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DATA_FILE = path.join(DATA_DIR, 'fpms_db.json');

class DatabaseManager {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.loadOrSeed();
  }

  private loadOrSeed(): DatabaseSchema {
    if (fs.existsSync(DATA_FILE)) {
      try {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const loaded: DatabaseSchema = JSON.parse(raw);
        if (!loaded.structuredTimetables) {
          loaded.structuredTimetables = [];
        }
        if (!loaded.sectionAllocationRuns) {
          loaded.sectionAllocationRuns = [];
        }
        if (!loaded.academicSubjects || loaded.academicSubjects.length === 0) {
          loaded.academicSubjects = getInitialAcademicSubjects();
        }
        if (!loaded.subjectAllocations || loaded.subjectAllocations.length === 0) {
          loaded.subjectAllocations = getInitialSubjectAllocations();
        }
        // Ensure student currentSemester and section fields are assigned
        for (const s of loaded.students || []) {
          if (!s.currentSemester) {
            s.currentSemester = s.currentYear === 1 ? 1 : s.currentYear === 2 ? 3 : s.currentYear === 3 ? 5 : 7;
          }
        }
        this.ensureMasterAdminUsers(loaded);
        this.saveData(loaded);
        return loaded;
      } catch (err) {
        console.error('Failed to parse database file, reseeding:', err);
      }
    }
    const seeded = this.generateSeedData();
    this.ensureMasterAdminUsers(seeded);
    this.saveData(seeded);
    return seeded;
  }

  private ensureMasterAdminUsers(data: DatabaseSchema): void {
    const now = new Date().toISOString();
    if (!data.structuredTimetables) {
      data.structuredTimetables = [];
    }

    // Strict requirement: in master admin remove all department excluding information science
    data.departments = (data.departments || []).filter(
      (d) => d.id === 'dept-ise'
    );
    data.users = (data.users || []).filter(
      (u) =>
        !u.departmentId ||
        u.departmentId === 'dept-ise'
    );
    // Strict requirement: Admin credentials are for login/operations only, NOT staff records
    data.staffProfiles = (data.staffProfiles || []).filter(
      (sp) =>
        sp.id !== 'sp-ise-admin' &&
        sp.staffId !== 'MITM-ISE-ADM' &&
        sp.userId !== 'user-ise-admin' &&
        !sp.staffId.endsWith('-ADM')
    );

    const masterAccounts = [
      {
        id: 'user-master-admin-default',
        email: 'masteradmin@gmail.com',
        fullName: 'Master Administrator',
        designation: 'Institutional Master Administrator',
        staffId: 'MITM-MASTER-001',
      },
      {
        id: 'user-master-admin-vtu',
        email: '4MH23IS119@gmail.com',
        fullName: 'Executive Master Administrator (4MH23IS119)',
        designation: 'Chief Executive Master Admin',
        staffId: 'MITM-MASTER-002',
      },
    ];

    for (const m of masterAccounts) {
      const existingUser = data.users.find(
        (u) => u.email.toLowerCase() === m.email.toLowerCase()
      );
      if (!existingUser) {
        data.users.push({
          id: m.id,
          email: m.email,
          passwordHash: 'mitm123',
          role: 'ADMIN',
          departmentId: null,
          status: 'ACTIVE',
          mustChangePassword: false,
          createdAt: now,
        });
      } else {
        existingUser.role = 'ADMIN';
        existingUser.departmentId = null;
        existingUser.status = 'ACTIVE';
        existingUser.passwordHash = 'mitm123';
      }
    }

    // Ensure Information Science Admin account exists with saved credentials
    const iseAdminUser = data.users.find(
      (u) => u.email.toLowerCase() === 'ise.admin@mitmysore.in'
    );
    if (!iseAdminUser) {
      data.users.push({
        id: 'user-ise-admin',
        email: 'ise.admin@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'ADMIN',
        departmentId: 'dept-ise',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      });
    } else {
      iseAdminUser.role = 'ADMIN';
      iseAdminUser.departmentId = 'dept-ise';
      iseAdminUser.status = 'ACTIVE';
      iseAdminUser.passwordHash = 'mitm123';
    }

    // Ensure ISE Department has pre-saved credentials for Master Admin inspection
    const iseDept = data.departments.find(
      (d) => d.id === 'dept-ise' || d.code === 'ISE'
    );
    if (iseDept) {
      iseDept.savedCredentials = {
        email: 'ise.admin@mitmysore.in',
        temporaryPassword: 'mitm123',
        issuedAt: '2026-08-01T09:00:00Z',
        role: 'Department Administrator (ADMIN)',
        staffId: 'MITM-ISE-ADM',
        adminName: 'Prof. K. S. Manjunath (ISE Admin)',
      };
    }

    // Seed default structured timetables if none exist
    if (data.structuredTimetables.length === 0) {
      data.structuredTimetables = this.generateDefaultStructuredTimetables();
    }

    // Ensure academic subjects & allocations
    if (!data.academicSubjects || data.academicSubjects.length === 0) {
      data.academicSubjects = getInitialAcademicSubjects();
    }
    if (!data.subjectAllocations || data.subjectAllocations.length === 0) {
      data.subjectAllocations = getInitialSubjectAllocations();
    }

    // Ensure all ISE teaching faculty exist
    for (const fac of ISE_FACULTY_MEMBERS) {
      const existsUser = data.users.find((u) => u.email.toLowerCase() === fac.email.toLowerCase());
      if (!existsUser) {
        data.users.push({
          id: fac.userId,
          email: fac.email,
          passwordHash: 'mitm123',
          role: 'FACULTY',
          departmentId: 'dept-ise',
          status: 'ACTIVE',
          mustChangePassword: false,
          createdAt: now,
        });
      }
      const existsProfile = data.staffProfiles.find((sp) => sp.userId === fac.userId);
      if (!existsProfile) {
        data.staffProfiles.push({
          id: `sp-${fac.userId}`,
          userId: fac.userId,
          staffId: fac.staffId,
          fullName: fac.fullName,
          phone: '9845011223',
          designation: fac.designation,
          qualification: 'M.Tech, Ph.D',
          specialization: 'Information Science & Engineering',
          isTeachingFaculty: true,
          isMentorEligible: true,
          bio: `${fac.designation} in Department of Information Science and Engineering at MIT Mysore.`,
        });
      }
    }

    // Seed 6th sem timetables if not present
    if (!data.structuredTimetables.some((t) => t.semester === '6th Semester')) {
      data.structuredTimetables.push(...getInitial6thSemTimetables());
    }
  }

  private generateDefaultStructuredTimetables(): StructuredTimetable[] {
    const now = new Date().toISOString();
    const sem5Assignments: FacultyAssignment[] = [
      {
        id: 'fa-ise-501',
        courseCode: '21IS51',
        courseTitle: 'Automata Theory and Compiler Design',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        staffId: 'MITM-ISE-012',
        hoursPerWeek: 4,
        isLab: false,
        color: '#1e3a8a',
      },
      {
        id: 'fa-ise-502',
        courseCode: '21IS52',
        courseTitle: 'Computer Networks & Internet Protocols',
        facultyUserId: 'user-fac-anitha',
        facultyName: 'Dr. Anitha K',
        staffId: 'MITM-ISE-015',
        hoursPerWeek: 4,
        isLab: false,
        color: '#7B1113',
      },
      {
        id: 'fa-ise-503',
        courseCode: '21IS53',
        courseTitle: 'Database Management Systems',
        facultyUserId: 'user-fac-suresh',
        facultyName: 'Prof. Suresh N',
        staffId: 'MITM-ISE-019',
        hoursPerWeek: 4,
        isLab: false,
        color: '#065f46',
      },
      {
        id: 'fa-ise-504',
        courseCode: '21IS54',
        courseTitle: 'Artificial Intelligence & Machine Learning',
        facultyUserId: 'user-hod-ise',
        facultyName: 'Dr. Sharath Kumar Y H',
        staffId: 'MITM-ISE-HOD',
        hoursPerWeek: 3,
        isLab: false,
        color: '#5b21b6',
      },
      {
        id: 'fa-ise-505',
        courseCode: '21ISL56',
        courseTitle: 'Computer Networks & DBMS Laboratory',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        staffId: 'MITM-ISE-012',
        hoursPerWeek: 3,
        isLab: true,
        color: '#c2410c',
      },
    ];

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const periods = [
      { index: 0, timeRange: '09:00 - 10:00' },
      { index: 1, timeRange: '10:00 - 11:00' },
      { index: 2, timeRange: '11:15 - 12:15' },
      { index: 3, timeRange: '12:15 - 01:15' },
      { index: 4, timeRange: '02:00 - 03:00' },
      { index: 5, timeRange: '03:00 - 04:00' },
      { index: 6, timeRange: '04:00 - 05:00' },
    ];

    const schedule: TimetableSlot[] = [];

    // Pre-populate realistic conflict-free schedule for Sem 5 Section A
    const pattern = [
      // Monday
      [sem5Assignments[0], sem5Assignments[1], sem5Assignments[2], sem5Assignments[3], null, null, null],
      // Tuesday
      [sem5Assignments[1], sem5Assignments[0], sem5Assignments[3], sem5Assignments[2], sem5Assignments[4], sem5Assignments[4], sem5Assignments[4]],
      // Wednesday
      [sem5Assignments[2], sem5Assignments[3], sem5Assignments[0], sem5Assignments[1], null, null, null],
      // Thursday
      [sem5Assignments[0], sem5Assignments[1], sem5Assignments[2], sem5Assignments[3], null, null, null],
      // Friday
      [sem5Assignments[3], sem5Assignments[2], sem5Assignments[1], sem5Assignments[0], null, null, null],
      // Saturday
      [sem5Assignments[1], sem5Assignments[2], null, null, null, null, null],
    ];

    days.forEach((day, dIdx) => {
      periods.forEach((p, pIdx) => {
        const item = pattern[dIdx]?.[pIdx];
        schedule.push({
          day,
          periodIndex: p.index,
          timeRange: p.timeRange,
          courseCode: item ? item.courseCode : '',
          courseTitle: item ? item.courseTitle : '',
          facultyUserId: item ? item.facultyUserId : '',
          facultyName: item ? item.facultyName : '',
          room: item?.isLab ? 'ISE Advanced Computing Lab' : 'LH-302 (ISE 3rd Year)',
          isLab: item?.isLab || false,
        });
      });
    });

    return [
      {
        id: 'st-ise-sem5-v1',
        departmentId: 'dept-ise',
        academicYear: '2026-27',
        semester: 'Odd Semester (V Sem)',
        section: 'Section A',
        studentYear: 3,
        title: 'Information Science - V Semester (3rd Year) Section A Timetable',
        status: 'PUBLISHED',
        isValidated: true,
        version: 1,
        isActive: true,
        facultyAssignments: sem5Assignments,
        schedule,
        validationReport: {
          isValid: true,
          checkedAt: now,
          conflicts: [],
          warnings: [],
        },
        publishedAt: now,
        publishedBy: 'ise.admin@mitmysore.in (Prof. K. S. Manjunath)',
        retentionNote: 'Authoritative baseline timetable for Odd Semester 2026-27 under VTU 2021 Scheme.',
        createdAt: now,
        updatedAt: now,
      },
    ];
  }

  public save(): void {
    this.saveData(this.data);
  }

  private saveData(data: DatabaseSchema): void {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public getData(): DatabaseSchema {
    return this.data;
  }

  private generateSeedData(): DatabaseSchema {
    const now = new Date().toISOString();

    const departments: Department[] = [
      {
        id: 'dept-ise',
        code: 'ISE',
        name: 'Information Science and Engineering',
        hodId: 'user-hod-ise',
        active: true,
        description: 'Department of Information Science and Engineering at MIT Mysore',
        createdAt: now,
        savedCredentials: {
          email: 'ise.admin@mitmysore.in',
          temporaryPassword: 'mitm123',
          issuedAt: now,
          role: 'Department Administrator (ADMIN)',
          staffId: 'MITM-ISE-ADM',
          adminName: 'Prof. K. S. Manjunath (ISE Admin)',
        },
      },
    ];

    const users: User[] = [
      {
        id: 'user-admin',
        email: 'admin@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'ADMIN',
        departmentId: null,
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-hod-ise',
        email: 'hod.ise@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'HOD',
        departmentId: 'dept-ise',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-hod-cse',
        email: 'hod.cse@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'HOD',
        departmentId: 'dept-cse',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-fac-gururaja',
        email: 'gururaja.ise@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'FACULTY',
        departmentId: 'dept-ise',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-fac-anitha',
        email: 'anitha.ise@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'FACULTY',
        departmentId: 'dept-ise',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-fac-suresh',
        email: 'suresh.ise@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'FACULTY',
        departmentId: 'dept-ise',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-fac-deepa',
        email: 'deepa.cse@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'FACULTY',
        departmentId: 'dept-cse',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
      {
        id: 'user-staff-ramesh',
        email: 'ramesh.lab@mitmysore.in',
        passwordHash: 'mitm123',
        role: 'FACULTY',
        departmentId: 'dept-ise',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: now,
      },
    ];

    const staffProfiles: StaffProfile[] = [
      {
        id: 'sp-admin',
        userId: 'user-admin',
        staffId: 'MITM-ADM-001',
        fullName: 'Dr. Principal & Admin Officer',
        phone: '9880011223',
        designation: 'Principal & Chief Administrator',
        qualification: 'Ph.D, M.Tech',
        specialization: 'Institutional Administration & Academic Governance',
        isTeachingFaculty: false,
        isMentorEligible: false,
        bio: 'Chief Executive Administrator overseeing academic, research, and accreditation operations at MIT Mysore.',
      },
      {
        id: 'sp-hod-ise',
        userId: 'user-hod-ise',
        staffId: 'MITM-ISE-HOD',
        fullName: 'Dr. Sharath Kumar Y H',
        phone: '9845012345',
        designation: 'Professor & Head of Department',
        qualification: 'Ph.D, M.Tech',
        specialization: 'Artificial Intelligence, Pattern Recognition, Computer Vision',
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: 'Head of Information Science and Engineering with over 18 years of academic and research leadership.',
      },
      {
        id: 'sp-hod-cse',
        userId: 'user-hod-cse',
        staffId: 'MITM-CSE-HOD',
        fullName: 'Dr. Deepu R',
        phone: '9845098765',
        designation: 'Professor & Head of Department',
        qualification: 'Ph.D, M.Tech',
        specialization: 'Network Security, Cloud Computing',
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: 'Head of Computer Science and Engineering Department at MIT Mysore.',
      },
      {
        id: 'sp-fac-gururaja',
        userId: 'user-fac-gururaja',
        staffId: 'MITM-ISE-012',
        fullName: 'Prof. Gururaja M P',
        phone: '9448011223',
        designation: 'Assistant Professor',
        qualification: 'M.Tech, (Ph.D)',
        specialization: 'Cloud Computing, Web Architecture, Distributed Systems',
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: 'Assistant Professor in Information Science and Engineering Department. Faculty Guide for FPMS Institutional Project.',
      },
      {
        id: 'sp-fac-anitha',
        userId: 'user-fac-anitha',
        staffId: 'MITM-ISE-015',
        fullName: 'Dr. Anitha K',
        phone: '9448022334',
        designation: 'Associate Professor',
        qualification: 'Ph.D, M.Tech',
        specialization: 'Data Science, Machine Learning, Bio-Computing',
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: 'Associate Professor in ISE focusing on student mentorship, data analysis, and NAAC documentation.',
      },
      {
        id: 'sp-fac-suresh',
        userId: 'user-fac-suresh',
        staffId: 'MITM-ISE-019',
        fullName: 'Prof. Suresh N',
        phone: '9448033445',
        designation: 'Assistant Professor',
        qualification: 'M.Tech',
        specialization: 'Cybersecurity, Internet of Things (IoT)',
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: 'Assistant Professor in ISE. Department Coordinator for NBA & Industry Internships.',
      },
      {
        id: 'sp-fac-deepa',
        userId: 'user-fac-deepa',
        staffId: 'MITM-CSE-022',
        fullName: 'Prof. Deepa R',
        phone: '9448044556',
        designation: 'Assistant Professor',
        qualification: 'M.Tech',
        specialization: 'Mobile Computing, Algorithms',
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: 'Assistant Professor in CSE Department.',
      },
      {
        id: 'sp-staff-ramesh',
        userId: 'user-staff-ramesh',
        staffId: 'MITM-ISE-NT01',
        fullName: 'Mr. Ramesh K',
        phone: '9448055667',
        designation: 'Senior Lab Instructor',
        qualification: 'Diploma in Computer Science, B.Sc',
        specialization: 'Networking Hardware, Lab Infrastructure',
        isTeachingFaculty: false,
        isMentorEligible: false,
        bio: 'Senior laboratory instructor maintaining ISE computer laboratories.',
      },
    ];

    // Seed students including team members and cohorts
    const students: Student[] = [
      // Project team members (ISE 3rd Year)
      {
        id: 'stud-team-1',
        usn: '4MH23IS109',
        fullName: 'THANUSHREE S',
        email: '4mh23is109@mitmysore.in',
        phone: '9123456780',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section A',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      {
        id: 'stud-team-2',
        usn: '4MH23IS119',
        fullName: 'VIJITH KUMAR R N',
        email: '4mh23is119@mitmysore.in',
        phone: '9123456781',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section A',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      {
        id: 'stud-team-3',
        usn: '4MH23IS120',
        fullName: 'VIKAS U S',
        email: '4mh23is120@mitmysore.in',
        phone: '9123456782',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section A',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      // Additional 3rd Year ISE students
      {
        id: 'stud-ise-301',
        usn: '4MH23IS001',
        fullName: 'Aakash Gowda',
        email: '4mh23is001@mitmysore.in',
        phone: '9123456701',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section A',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-302',
        usn: '4MH23IS002',
        fullName: 'Ananya S',
        email: '4mh23is002@mitmysore.in',
        phone: '9123456702',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section A',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-303',
        usn: '4MH23IS003',
        fullName: 'Bhavana M',
        email: '4mh23is003@mitmysore.in',
        phone: '9123456703',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section B',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-304',
        usn: '4MH23IS004',
        fullName: 'Chetan Kumar',
        email: '4mh23is004@mitmysore.in',
        phone: '9123456704',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section B',
        admissionCohort: '2023',
        status: 'DETAINED', // Example detained
      },
      {
        id: 'stud-ise-305',
        usn: '4MH23IS005',
        fullName: 'Darshan R',
        email: '4mh23is005@mitmysore.in',
        phone: '9123456705',
        departmentId: 'dept-ise',
        currentYear: 3,
        currentSemester: 5,
        section: 'Section A',
        admissionCohort: '2023',
        status: 'ACTIVE',
      },
      // 2nd Year ISE students
      {
        id: 'stud-ise-201',
        usn: '4MH24IS001',
        fullName: 'Harshitha K',
        email: '4mh24is001@mitmysore.in',
        phone: '9123456801',
        departmentId: 'dept-ise',
        currentYear: 2,
        currentSemester: 4,
        section: 'Section A',
        admissionCohort: '2024',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-202',
        usn: '4MH24IS002',
        fullName: 'Jeevan P',
        email: '4mh24is002@mitmysore.in',
        phone: '9123456802',
        departmentId: 'dept-ise',
        currentYear: 2,
        currentSemester: 4,
        section: 'Section A',
        admissionCohort: '2024',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-203',
        usn: '4MH24IS003',
        fullName: 'Kavya S',
        email: '4mh24is003@mitmysore.in',
        phone: '9123456803',
        departmentId: 'dept-ise',
        currentYear: 2,
        currentSemester: 4,
        section: 'Section B',
        admissionCohort: '2024',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-204',
        usn: '4MH24IS004',
        fullName: 'Manoj Kumar',
        email: '4mh24is004@mitmysore.in',
        phone: '9123456804',
        departmentId: 'dept-ise',
        currentYear: 2,
        currentSemester: 4,
        section: 'Section B',
        admissionCohort: '2024',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-205',
        usn: '4MH24IS005',
        fullName: 'Nandini B',
        email: '4mh24is005@mitmysore.in',
        phone: '9123456805',
        departmentId: 'dept-ise',
        currentYear: 2,
        currentSemester: 4,
        section: 'Section A',
        admissionCohort: '2024',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-206',
        usn: '4MH24IS006',
        fullName: 'Prathap M',
        email: '4mh24is006@mitmysore.in',
        phone: '9123456806',
        departmentId: 'dept-ise',
        currentYear: 2,
        currentSemester: 4,
        section: 'Section B',
        admissionCohort: '2024',
        status: 'ACTIVE',
      },
      // 4th Year ISE students
      {
        id: 'stud-ise-401',
        usn: '4MH22IS001',
        fullName: 'Varun Teja',
        email: '4mh22is001@mitmysore.in',
        phone: '9123456901',
        departmentId: 'dept-ise',
        currentYear: 4,
        currentSemester: 8,
        section: 'Section A',
        admissionCohort: '2022',
        status: 'ACTIVE',
      },
      {
        id: 'stud-ise-402',
        usn: '4MH22IS002',
        fullName: 'Yashaswini G',
        email: '4mh22is002@mitmysore.in',
        phone: '9123456902',
        departmentId: 'dept-ise',
        currentYear: 4,
        currentSemester: 8,
        section: 'Section A',
        admissionCohort: '2022',
        status: 'ACTIVE',
      },
    ];

    // Seed portfolio items for Dr. Gururaja M P and colleagues
    const portfolioItems: PortfolioItem[] = [
      {
        id: 'port-1',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        departmentId: 'dept-ise',
        category: 'PUBLICATION',
        title: 'Microservices Architecture for Multi-Tenant Institutional Academic Management Systems',
        academicYear: '2026-27',
        eventDate: '2026-03-12',
        details: {
          journal: 'IEEE Transactions on Learning Technologies',
          doi: '10.1109/TLT.2026.3124567',
          authors: 'Gururaja M P, Sharath Kumar Y H',
          indexing: 'Scopus / Web of Science (Q1)',
          volume: 'Vol. 19, Issue 2, pp. 145-159',
        },
        evidenceDocUrl: 'https://placehold.co/800x600/png?text=IEEE+Publication+Certificate',
        evidenceDocName: 'IEEE_Paper_Gururaja_2026.pdf',
        status: 'VERIFIED',
        createdAt: now,
      },
      {
        id: 'port-2',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        departmentId: 'dept-ise',
        category: 'PATENT',
        title: 'Automated Real-Time Mentor Allocation System Utilizing Constraint-Satisfied Round Robin Bin Packing',
        academicYear: '2025-26',
        eventDate: '2025-11-20',
        details: {
          applicationNumber: '202541098765 A',
          inventors: 'Gururaja M P, Thanushree S, Vijith Kumar R N, Vikas U S',
          status: 'Published',
          jurisdiction: 'Indian Patent Office (IPO)',
          filingDate: '2025-11-20',
        },
        evidenceDocUrl: 'https://placehold.co/800x600/png?text=IPO+Patent+Filing+Receipt',
        evidenceDocName: 'Indian_Patent_Filing_202541098765.pdf',
        status: 'VERIFIED',
        createdAt: now,
      },
      {
        id: 'port-3',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        departmentId: 'dept-ise',
        category: 'FDP',
        title: 'AICTE-ATAL 5-Day Faculty Development Program on Generative AI & Cloud Native Solutions',
        academicYear: '2026-27',
        eventDate: '2026-02-18',
        details: {
          organizer: 'National Institute of Engineering (NIE), Mysuru in association with AICTE',
          durationDays: 5,
          mode: 'Offline',
          grade: 'Distinction',
        },
        evidenceDocUrl: 'https://placehold.co/800x600/png?text=AICTE+ATAL+FDP+Certificate',
        evidenceDocName: 'ATAL_FDP_Certificate_Feb2026.pdf',
        status: 'VERIFIED',
        createdAt: now,
      },
      {
        id: 'port-4',
        facultyUserId: 'user-fac-anitha',
        facultyName: 'Dr. Anitha K',
        departmentId: 'dept-ise',
        category: 'PUBLICATION',
        title: 'Deep Transfer Learning Models for Early Screening of Diabetic Retinopathy',
        academicYear: '2025-26',
        eventDate: '2025-09-14',
        details: {
          journal: 'Springer Nature Computer Science',
          doi: '10.1007/s42979-025-02145-x',
          authors: 'Anitha K, Sharath Kumar Y H',
          indexing: 'Scopus (Q2)',
          volume: 'Vol. 6, Article 412',
        },
        evidenceDocUrl: 'https://placehold.co/800x600/png?text=Springer+Certificate',
        evidenceDocName: 'Springer_Paper_Anitha.pdf',
        status: 'VERIFIED',
        createdAt: now,
      },
      {
        id: 'port-5',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        departmentId: 'dept-ise',
        category: 'AWARD',
        title: 'Excellence in Academic Mentorship & Project Guidance Award 2025',
        academicYear: '2025-26',
        eventDate: '2025-12-23',
        details: {
          awardedBy: 'Maharaja Institute of Technology, Mysore Annual Academic Council',
          cashPrize: 'Rs. 25,000 & Citation Plaque',
          category: 'Institutional Faculty Honor',
        },
        evidenceDocUrl: 'https://placehold.co/800x600/png?text=MITM+Faculty+Award+Citation',
        evidenceDocName: 'MITM_Excellence_Award_2025.pdf',
        status: 'VERIFIED',
        createdAt: now,
      },
    ];

    // Seed tasks created by HOD ISE
    const tasks: Task[] = [
      {
        id: 'task-1',
        title: 'NAAC Criterion 2: Faculty Course File & CO-PO Attainment Documentation',
        description:
          'All faculty members must prepare and submit the digital course file including Course Outcomes (CO) mapping, Course Articulation Matrix, direct/indirect attainment sheets, and sample continuous internal evaluation question papers for odd semester 2026.',
        departmentId: 'dept-ise',
        createdById: 'user-hod-ise',
        createdByName: 'Dr. Sharath Kumar Y H',
        priority: 'HIGH',
        dueDate: '2026-10-30',
        requiredDeliverableType: 'Consolidated PDF / ZIP Archive',
        assignedToFacultyIds: [], // All department faculty
        status: 'OPEN',
        createdAt: now,
      },
      {
        id: 'task-2',
        title: 'NBA Criteria 5: Faculty Research Publications & Patent Evidence Submission',
        description:
          'Please submit full-text PDF copies of all research publications published in Scopus/WoS indexed journals for the last 2 academic years along with front page DOI proofs.',
        departmentId: 'dept-ise',
        createdById: 'user-hod-ise',
        createdByName: 'Dr. Sharath Kumar Y H',
        priority: 'URGENT',
        dueDate: '2026-10-25',
        requiredDeliverableType: 'PDF Document',
        assignedToFacultyIds: ['user-fac-gururaja', 'user-fac-anitha'],
        status: 'OPEN',
        createdAt: now,
      },
      {
        id: 'task-3',
        title: 'Continuous Internal Assessment (CIE-II) Question Paper & Scheme of Evaluation',
        description:
          'Submit two sets of question papers along with detailed Bloom taxonomy levels and step-by-step scheme of evaluation for CIE-II examinations.',
        departmentId: 'dept-ise',
        createdById: 'user-hod-ise',
        createdByName: 'Dr. Sharath Kumar Y H',
        priority: 'MEDIUM',
        dueDate: '2026-11-05',
        requiredDeliverableType: 'Word/PDF Document',
        assignedToFacultyIds: ['user-fac-suresh'],
        status: 'OPEN',
        createdAt: now,
      },
    ];

    // Seed submissions
    const taskSubmissions: TaskSubmission[] = [
      {
        id: 'sub-1',
        taskId: 'task-2',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        departmentId: 'dept-ise',
        status: 'APPROVED',
        currentVersion: 1,
        submittedAt: '2026-10-10T14:30:00Z',
        submissionNotes:
          'Attached IEEE Transactions publication proof and published patent application number 202541098765.',
        fileUrl: 'https://placehold.co/800x600/png?text=Submitted_Evidence_Gururaja.pdf',
        fileName: 'NBA_Research_Evidence_Gururaja.pdf',
        reviews: [
          {
            reviewerId: 'user-hod-ise',
            reviewerName: 'Dr. Sharath Kumar Y H',
            action: 'APPROVED',
            remarks: 'Verified Scopus Q1 journal indexing and patent publication gazette. Approved.',
            reviewedAt: '2026-10-11T11:00:00Z',
          },
        ],
      },
      {
        id: 'sub-2',
        taskId: 'task-1',
        facultyUserId: 'user-fac-gururaja',
        facultyName: 'Prof. Gururaja M P',
        departmentId: 'dept-ise',
        status: 'RETURNED_FOR_CORRECTION',
        currentVersion: 1,
        submittedAt: '2026-10-12T09:15:00Z',
        submissionNotes: 'Uploaded course file for Cloud Computing (21IS62).',
        fileUrl: 'https://placehold.co/800x600/png?text=Course_File_CloudComputing.pdf',
        fileName: 'Course_File_21IS62.pdf',
        reviews: [
          {
            reviewerId: 'user-hod-ise',
            reviewerName: 'Dr. Sharath Kumar Y H',
            action: 'RETURNED_FOR_CORRECTION',
            remarks:
              'Attainment sheet calculation is missing indirect survey feedback weights (10%). Please update the CO-PO spreadsheet and resubmit with signatures.',
            reviewedAt: '2026-10-13T16:20:00Z',
          },
        ],
      },
      {
        id: 'sub-3',
        taskId: 'task-1',
        facultyUserId: 'user-fac-anitha',
        facultyName: 'Dr. Anitha K',
        departmentId: 'dept-ise',
        status: 'SUBMITTED',
        currentVersion: 1,
        submittedAt: '2026-10-14T10:00:00Z',
        submissionNotes: 'Uploaded complete course file for Machine Learning (21IS63) with syllabus coverage log.',
        fileUrl: 'https://placehold.co/800x600/png?text=Course_File_ML.pdf',
        fileName: 'Course_File_21IS63_ML.pdf',
        reviews: [],
      },
    ];

    // Seed official timetables
    const officialTimetables: OfficialTimetable[] = [
      {
        id: 'tt-ise-3',
        departmentId: 'dept-ise',
        academicYear: '2026-27',
        semester: 'Odd Semester (V Sem)',
        studentYear: 3,
        title: 'Department of ISE - 3rd Year (V Semester) Master Class Timetable',
        fileUrl: 'https://placehold.co/800x600/png?text=ISE+3rd+Year+Timetable+PDF',
        fileName: 'ISE_V_Sem_Official_Timetable_2026.pdf',
        version: 1,
        isActive: true,
        uploadedBy: 'Dr. Principal & Admin Officer',
        uploadedAt: now,
      },
      {
        id: 'tt-ise-2',
        departmentId: 'dept-ise',
        academicYear: '2026-27',
        semester: 'Odd Semester (III Sem)',
        studentYear: 2,
        title: 'Department of ISE - 2nd Year (III Semester) Master Class Timetable',
        fileUrl: 'https://placehold.co/800x600/png?text=ISE+2nd+Year+Timetable+PDF',
        fileName: 'ISE_III_Sem_Official_Timetable_2026.pdf',
        version: 1,
        isActive: true,
        uploadedBy: 'Dr. Principal & Admin Officer',
        uploadedAt: now,
      },
      {
        id: 'tt-ise-4',
        departmentId: 'dept-ise',
        academicYear: '2026-27',
        semester: 'Odd Semester (VII Sem)',
        studentYear: 4,
        title: 'Department of ISE - 4th Year (VII Semester) Master Class Timetable',
        fileUrl: 'https://placehold.co/800x600/png?text=ISE+4th+Year+Timetable+PDF',
        fileName: 'ISE_VII_Sem_Official_Timetable_2026.pdf',
        version: 1,
        isActive: true,
        uploadedBy: 'Dr. Principal & Admin Officer',
        uploadedAt: now,
      },
    ];

    // Seed personal timetable
    const personalTimetables: PersonalTimetable[] = [
      {
        id: 'pt-gururaja',
        facultyUserId: 'user-fac-gururaja',
        academicYear: '2026-27',
        semester: 'Odd Semester',
        title: 'Prof. Gururaja M P - Workload & Class Schedule (Cloud Computing & Lab)',
        fileUrl: 'https://placehold.co/800x600/png?text=Personal_Timetable_Gururaja',
        fileName: 'Personal_Schedule_Gururaja_2026.pdf',
        uploadedAt: now,
      },
    ];

    // Seed saved mentor allocation
    const mentorAllocations: MentorAllocation[] = [
      {
        id: 'alloc-ise-3-2026',
        departmentId: 'dept-ise',
        academicYear: '2026-27',
        studentYear: 3,
        status: 'PUBLISHED',
        versionNumber: 1,
        createdById: 'user-admin',
        publishedAt: now,
        createdAt: now,
        groups: [
          {
            mentorId: 'user-fac-gururaja',
            mentorName: 'Prof. Gururaja M P',
            staffId: 'MITM-ISE-012',
            studentIds: ['stud-team-1', 'stud-team-2', 'stud-team-3'], // THANUSHREE, VIJITH, VIKAS
          },
          {
            mentorId: 'user-fac-anitha',
            mentorName: 'Dr. Anitha K',
            staffId: 'MITM-ISE-015',
            studentIds: ['stud-ise-301', 'stud-ise-302'],
          },
          {
            mentorId: 'user-fac-suresh',
            mentorName: 'Prof. Suresh N',
            staffId: 'MITM-ISE-019',
            studentIds: ['stud-ise-303', 'stud-ise-305'],
          },
        ],
      },
    ];

    // Seed academic feed posts
    const feedPosts: FeedPost[] = [
      {
        id: 'post-1',
        authorUserId: 'user-admin',
        authorName: 'Principal Office, MIT Mysore',
        authorRole: 'ADMIN',
        title: 'Inauguration of Advanced AI & Cloud Computing Research Lab',
        content:
          'Maharaja Institute of Technology, Mysore proudly inaugurates the state-of-the-art Advanced Artificial Intelligence & High-Performance Cloud Computing Center in the ISE block. The facility is equipped to support faculty research, sponsored projects, and student innovation.',
        category: 'INSTITUTIONAL_ANNOUNCEMENT',
        eventDate: '2026-10-15',
        mediaUrl: 'https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=1200&q=80',
        mediaType: 'IMAGE',
        visibility: 'PUBLIC',
        isApproved: true,
        likes: ['user-fac-gururaja', 'user-hod-ise'],
        comments: [
          {
            id: 'c1',
            userId: 'user-hod-ise',
            userName: 'Dr. Sharath Kumar Y H',
            text: 'A tremendous milestone for our department and students!',
            createdAt: now,
          },
        ],
        createdAt: now,
      },
      {
        id: 'post-2',
        authorUserId: 'user-fac-gururaja',
        authorName: 'Prof. Gururaja M P',
        authorRole: 'FACULTY',
        authorDesignation: 'Assistant Professor, Dept. of ISE',
        title: 'Project Presentation & Review: Faculty Portfolio Management System (FPMS)',
        content:
          'Mentored student team Thanushree S [4MH23IS109], Vijith Kumar R N [4MH23IS119], and Vikas U S [4MH23IS120] presented their institutional web application architecture for automated accreditation documentation, mentor allocation, and portfolio auditing before the academic committee.',
        category: 'RESEARCH',
        eventDate: '2026-10-14',
        mediaUrl: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80',
        mediaType: 'IMAGE',
        visibility: 'PUBLIC',
        isApproved: true,
        likes: ['user-admin', 'user-hod-ise'],
        comments: [],
        createdAt: now,
      },
      {
        id: 'post-3',
        authorUserId: 'user-hod-ise',
        authorName: 'Dr. Sharath Kumar Y H',
        authorRole: 'HOD',
        authorDesignation: 'Professor & Head, Dept. of ISE',
        title: 'Two-Day National Workshop on Microservices and DevOps Deployments',
        content:
          'Department of Information Science and Engineering invites faculty, researchers, and students to the hands-on National Workshop on Kubernetes, Docker, and Continuous Delivery pipelines on November 14-15, 2026.',
        category: 'WORKSHOP',
        eventDate: '2026-11-14',
        mediaUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80',
        mediaType: 'IMAGE',
        visibility: 'PUBLIC',
        isApproved: true,
        likes: ['user-fac-gururaja'],
        comments: [],
        createdAt: now,
      },
    ];

    // Seed notifications
    const notifications: Notification[] = [
      {
        id: 'notif-1',
        recipientUserId: 'user-fac-gururaja',
        actorUserId: 'user-hod-ise',
        actorName: 'Dr. Sharath Kumar Y H',
        title: 'Task Submission Returned for Correction',
        message:
          'Your submission for "NAAC Criterion 2: Faculty Course File" was returned with remarks: Indirect survey weights calculation missing.',
        type: 'SUBMISSION_RETURNED',
        linkUrl: '/faculty/tasks',
        isRead: false,
        createdAt: now,
      },
      {
        id: 'notif-2',
        recipientUserId: 'user-fac-gururaja',
        actorUserId: 'user-admin',
        actorName: 'Academic Administration',
        title: 'Mentor Allocation Published',
        message: 'New mentor student allocation has been published for Odd Semester 2026-27. You have 3 assigned mentees.',
        type: 'MENTOR_ALLOCATED',
        linkUrl: '/faculty/mentees',
        isRead: false,
        createdAt: now,
      },
      {
        id: 'notif-3',
        recipientUserId: 'user-hod-ise',
        actorUserId: 'user-fac-anitha',
        actorName: 'Dr. Anitha K',
        title: 'New Task Submission Received',
        message: 'Dr. Anitha K submitted deliverable for "NAAC Criterion 2: Faculty Course File".',
        type: 'SUBMISSION_RECEIVED',
        linkUrl: '/hod/tasks',
        isRead: false,
        createdAt: now,
      },
    ];

    const auditLogs: AuditLog[] = [
      {
        id: 'log-1',
        actorUserId: 'user-admin',
        actorEmail: 'admin@mitmysore.in',
        actorRole: 'ADMIN',
        action: 'INITIAL_BOOTSTRAP',
        targetEntity: 'SYSTEM',
        targetId: 'mitm-fpms',
        details: 'System bootstrapped with official departments: ISE, CSE, ECE, MECH, CIVIL.',
        timestamp: now,
      },
      {
        id: 'log-2',
        actorUserId: 'user-admin',
        actorEmail: 'admin@mitmysore.in',
        actorRole: 'ADMIN',
        action: 'PUBLISH_ALLOCATION',
        targetEntity: 'MENTOR_ALLOCATION',
        targetId: 'alloc-ise-3-2026',
        details: 'Published balanced mentor allocation for ISE 3rd Year (Cohort 2023).',
        timestamp: now,
      },
    ];

    const institution: InstitutionSettings = {
      institutionName: 'Maharaja Institute of Technology, Mysore',
      institutionShortName: 'MIT Mysore',
      tagline: 'Affiliated to Visvesvaraya Technological University (VTU), Belagavi & Approved by AICTE, New Delhi',
      currentAcademicYear: '2026-27',
      primaryColor: '#7B1113', // Academic Maroon / Crimson
      secondaryColor: '#0B1B3D', // Deep Academic Navy
      logoUrl: '/assets/aistudio/mit_logo_e728531b.webp',
      defaultDepartmentId: 'dept-ise',
      supportedDesignations: [
        'Assistant Professor',
        'Associate Professor',
        'Professor',
        'Professor & Head of Department',
        'Professor Emeritus',
        'Adjunct Professor',
        'Senior Lab Instructor',
        'Lab Instructor',
        'Technical Assistant',
      ],
    };

    return {
      institution,
      departments,
      users,
      staffProfiles,
      students,
      studentPromotionHistory: [],
      sectionAllocationRuns: [],
      mentorAllocations,
      officialTimetables,
      personalTimetables,
      structuredTimetables: [...this.generateDefaultStructuredTimetables(), ...getInitial6thSemTimetables()],
      portfolioItems,
      tasks,
      taskSubmissions,
      feedPosts,
      notifications,
      auditLogs,
      academicSubjects: getInitialAcademicSubjects(),
      subjectAllocations: getInitialSubjectAllocations(),
    };
  }
}

export const db = new DatabaseManager();
