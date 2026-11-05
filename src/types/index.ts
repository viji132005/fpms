export type UserRole = 'ADMIN' | 'HOD' | 'FACULTY' | 'NON_TEACHING';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  departmentId: string | null;
  status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  mustChangePassword?: boolean;
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
  activityCount?: number;
  completeness?: {
    score: number;
    completedFields: string[];
    missingFields: string[];
  };
}

export interface Department {
  id: string;
  code: string;
  name: string;
  hodId: string | null;
  active: boolean;
  description?: string;
  hod?: {
    id: string;
    fullName: string;
    email?: string;
    phone?: string;
    designation?: string;
  } | null;
  savedCredentials?: {
    email: string;
    temporaryPassword?: string;
    issuedAt?: string;
    role?: string;
    staffId?: string;
    adminName?: string;
  };
  stats?: {
    teachingFacultyCount: number;
    nonTeachingStaffCount: number;
    activeStudentsCount: number;
  };
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
  facultyInitials?: string;
  subjectShortName?: string;
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
  breakType?: 'SHORT_BREAK' | 'LUNCH_BREAK';
  labDetails?: string;
}

export interface SubjectLegendItem {
  code: string;
  title: string;
  shortName: string;
  facultyName: string;
  facultyInitials: string;
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
  category?: 'THEORY' | 'LAB' | 'PROJECT' | 'ELECTIVE' | 'TRAINING' | 'ACTIVITY';
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
  subjectLegend?: SubjectLegendItem[];
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

export interface Student {
  id: string;
  usn: string;
  fullName: string;
  email: string;
  phone: string;
  parentPhone?: string;
  departmentId: string;
  currentYear: number;
  currentSemester: number; // 1 to 8
  section?: string; // 'A', 'B', 'C', 'Section A', etc.
  admissionCohort: string;
  status: 'ACTIVE' | 'DETAINED' | 'WITHDRAWN' | 'GRADUATED';
  mentorId?: string | null;
  mentorName?: string | null;
  mentorStaffId?: string | null;
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
  studentYear: number;
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
  createdById: string;
  createdByName: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueDate: string;
  requiredDeliverableType: string;
  assignedToFacultyIds: string[];
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  circularNumber?: string;
  circularDate?: string;
  circularFileUrl?: string;
  circularFileName?: string;
  mySubmission?: TaskSubmission;
  isSubmitted?: boolean;
  submissionsCount?: number;
  approvedCount?: number;
  pendingReviewCount?: number;
  returnedCount?: number;
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
  authorRole: UserRole;
  authorDesignation?: string;
  title: string;
  content: string;
  category: string;
  eventDate: string;
  mediaUrl?: string;
  mediaType?: 'IMAGE' | 'VIDEO';
  mediaUrls?: string[];
  visibility: 'PUBLIC' | 'INSTITUTION' | 'PRIVATE';
  isApproved: boolean;
  durationDays?: number;
  expiresAt?: string;
  isPinned?: boolean;
  likes: string[];
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
  type: string;
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

export interface SectionAllocationBand {
  id: string;
  name: string;
  min: number;
  max: number;
  inclusiveMin: boolean;
  inclusiveMax: boolean;
  description?: string;
}

export interface SectionConfig {
  name: string; // 'Section A', 'Section B', 'Section C', etc.
  capacity: number;
  targetCount?: number;
}

export interface AllocatedStudent {
  studentId: string;
  usn: string;
  fullName: string;
  currentYear: number;
  currentSemester: number;
  performanceMetric?: 'CGPA' | 'SGPA' | null;
  performanceValue?: number | null;
  bandId?: string | null;
  bandName?: string | null;
  assignedSection: string; // 'Section A', 'Section B', etc.
  isManualOverride?: boolean;
  overrideReason?: string;
}

export interface StudentSectionAllocationRun {
  id: string;
  departmentId: string;
  academicYear: string;
  yearOfStudy: number; // 1, 2, 3, 4
  semester?: number; // 1 to 8
  title: string;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  method: 'RANDOM' | 'PERFORMANCE';
  performanceMetric?: 'CGPA' | 'SGPA' | null;
  sgpaSemester?: number | null;
  sgpaAcademicYear?: string | null;
  randomSeed: string;
  algorithmVersion: string;
  sections: SectionConfig[];
  bands?: SectionAllocationBand[];
  totalStudentsCount: number;
  students: AllocatedStudent[];
  summary: {
    sectionCounts: Record<string, number>;
    sectionAverages?: Record<string, number>;
    sectionBandCounts?: Record<string, Record<string, number>>;
  };
  performanceImportDetails?: {
    fileName: string;
    uploadedAt: string;
    uploadedBy: string;
    totalRows: number;
    matchedRows: number;
    validScores: number;
    missingScores: number;
  };
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  publishedById?: string;
  publishedByName?: string;
  versionNumber: number;
}

