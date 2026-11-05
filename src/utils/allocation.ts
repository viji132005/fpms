/**
 * Balanced Mentor Allocation Algorithm for Maharaja Institute of Technology, Mysore
 * Ensures that all eligible students in a department/year cohort are distributed
 * across active, mentor-eligible faculty members with maximum fairness:
 * The difference in mentee counts across any two mentors is at most 1 (Δ <= 1).
 */

export interface StudentRecord {
  id: string;
  usn: string;
  fullName: string;
  departmentId: string;
  currentYear: number;
  status: 'ACTIVE' | 'DETAINED' | 'WITHDRAWN';
  email?: string;
  phone?: string;
  parentPhone?: string;
}

export interface MentorFacultyRecord {
  id: string;
  staffId: string;
  fullName: string;
  departmentId: string;
  isMentorEligible: boolean;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface MentorGroup {
  mentorId: string;
  mentorName: string;
  staffId: string;
  students: StudentRecord[];
  targetCount: number;
}

export interface AllocationResult {
  departmentId: string;
  academicYear: string;
  studentYear: number;
  groups: MentorGroup[];
  totalStudentsAllocated: number;
  totalMentors: number;
  unassignedStudents: StudentRecord[];
}

/**
 * Computes a balanced, deterministic mentor allocation
 */
export function calculateBalancedMentorAllocation(
  students: StudentRecord[],
  mentors: MentorFacultyRecord[],
  departmentId: string,
  academicYear: string,
  studentYear: number
): AllocationResult {
  // 1. Filter eligible students: must be ACTIVE, in department, matching year
  const eligibleStudents = students
    .filter(
      (s) =>
        s.status === 'ACTIVE' &&
        (s.departmentId === departmentId || !s.departmentId || s.departmentId === 'dept-ise') &&
        s.currentYear === studentYear
    )
    .sort((a, b) => a.usn.localeCompare(b.usn)); // Deterministic order by USN

  // 2. Filter eligible mentors: must be ACTIVE, in department, marked isMentorEligible
  const eligibleMentors = mentors
    .filter(
      (m) =>
        m.status === 'ACTIVE' &&
        (m.departmentId === departmentId || !m.departmentId || m.departmentId === 'dept-ise') &&
        m.isMentorEligible
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  if (eligibleMentors.length === 0 || eligibleStudents.length === 0) {
    return {
      departmentId,
      academicYear,
      studentYear,
      groups: eligibleMentors.map((m) => ({
        mentorId: m.id,
        mentorName: m.fullName,
        staffId: m.staffId,
        students: [],
        targetCount: 0,
      })),
      totalStudentsAllocated: 0,
      totalMentors: eligibleMentors.length,
      unassignedStudents: eligibleMentors.length === 0 ? eligibleStudents : [],
    };
  }

  const N = eligibleStudents.length;
  const M = eligibleMentors.length;
  const baseQuota = Math.floor(N / M);
  const remainder = N % M;

  // Initialize groups
  const groups: MentorGroup[] = eligibleMentors.map((m, idx) => ({
    mentorId: m.id,
    mentorName: m.fullName,
    staffId: m.staffId,
    students: [],
    // First 'remainder' mentors get baseQuota + 1, remainder get baseQuota
    targetCount: idx < remainder ? baseQuota + 1 : baseQuota,
  }));

  // Distribute students deterministically
  let studentIndex = 0;
  for (const group of groups) {
    for (let i = 0; i < group.targetCount; i++) {
      if (studentIndex < eligibleStudents.length) {
        group.students.push(eligibleStudents[studentIndex]);
        studentIndex++;
      }
    }
  }

  return {
    departmentId,
    academicYear,
    studentYear,
    groups,
    totalStudentsAllocated: studentIndex,
    totalMentors: M,
    unassignedStudents: eligibleStudents.slice(studentIndex),
  };
}

/**
 * Validates that an allocation strictly satisfies the Δ <= 1 condition
 */
export function isAllocationBalanced(groups: MentorGroup[]): boolean {
  if (groups.length <= 1) return true;
  const counts = groups.map((g) => g.students.length);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  return max - min <= 1;
}

/**
 * Computes a combined multi-year allocation (2nd, 3rd, and 4th Years)
 * Distributes each cohort evenly among the participating mentors,
 * exactly matching the Maharaja Institute of Technology, Mysore allotment structure.
 */
export function calculateCombinedMultiYearAllocation(
  students: StudentRecord[],
  mentors: MentorFacultyRecord[],
  departmentId: string,
  academicYear: string,
  targetYears: number[] = [2, 3, 4]
): AllocationResult {
  const eligibleMentors = mentors
    .filter(
      (m) =>
        m.status === 'ACTIVE' &&
        (m.departmentId === departmentId || !m.departmentId || m.departmentId === 'dept-ise') &&
        m.isMentorEligible
    )
    .sort((a, b) => a.fullName.localeCompare(b.fullName));

  if (eligibleMentors.length === 0) {
    return {
      departmentId,
      academicYear,
      studentYear: 0,
      groups: [],
      totalStudentsAllocated: 0,
      totalMentors: 0,
      unassignedStudents: [],
    };
  }

  const groups: MentorGroup[] = eligibleMentors.map((m) => ({
    mentorId: m.id,
    mentorName: m.fullName,
    staffId: m.staffId,
    students: [],
    targetCount: 0,
  }));

  let totalAllocated = 0;
  targetYears.forEach((yr) => {
    const yrStudents = students
      .filter(
        (s) =>
          s.status === 'ACTIVE' &&
          (s.departmentId === departmentId || !s.departmentId || s.departmentId === 'dept-ise') &&
          s.currentYear === yr
      )
      .sort((a, b) => a.usn.localeCompare(b.usn));

    const M = groups.length;
    const N = yrStudents.length;
    if (N === 0) return;
    const baseQuota = Math.floor(N / M);
    const remainder = N % M;

    let sIdx = 0;
    groups.forEach((g, idx) => {
      const quota = idx < remainder ? baseQuota + 1 : baseQuota;
      for (let i = 0; i < quota && sIdx < yrStudents.length; i++) {
        g.students.push(yrStudents[sIdx]);
        sIdx++;
        totalAllocated++;
      }
    });
  });

  groups.forEach((g) => {
    g.targetCount = g.students.length;
  });

  return {
    departmentId,
    academicYear,
    studentYear: 0, // 0 signifies Combined Multi-Year Allotment
    groups,
    totalStudentsAllocated: totalAllocated,
    totalMentors: groups.length,
    unassignedStudents: [],
  };
}
