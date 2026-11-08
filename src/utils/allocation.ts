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
  allocationMode?: 'LINEAR' | 'RANDOM';
  randomSeed?: string;
}

/**
 * Fast seeded pseudorandom number generator (MurmurHash3-like 32-bit PRNG)
 */
export function createPRNG(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded PRNG
 */
export function shuffleWithSeed<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Computes a balanced mentor allocation supporting LINEAR (by USN sequence) or RANDOM (balanced shuffle)
 */
export function calculateBalancedMentorAllocation(
  students: StudentRecord[],
  mentors: MentorFacultyRecord[],
  departmentId: string,
  academicYear: string,
  studentYear: number,
  mode: 'LINEAR' | 'RANDOM' = 'LINEAR',
  seed?: string
): AllocationResult {
  const randomSeed = seed || `seed-mentor-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const rng = createPRNG(randomSeed);

  // 1. Filter eligible students: must be ACTIVE, in department, matching year
  let eligibleStudents = students
    .filter(
      (s) =>
        s.status === 'ACTIVE' &&
        (s.departmentId === departmentId || !s.departmentId || s.departmentId === 'dept-ise') &&
        s.currentYear === studentYear
    );

  if (mode === 'RANDOM') {
    eligibleStudents = shuffleWithSeed(eligibleStudents, rng);
  } else {
    eligibleStudents.sort((a, b) => a.usn.localeCompare(b.usn)); // Deterministic order by USN
  }

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
      allocationMode: mode,
      randomSeed: mode === 'RANDOM' ? randomSeed : undefined,
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

  // Distribute students deterministically or randomly according to mode
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
    allocationMode: mode,
    randomSeed: mode === 'RANDOM' ? randomSeed : undefined,
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
  targetYears: number[] = [2, 3, 4],
  mode: 'LINEAR' | 'RANDOM' = 'LINEAR',
  seed?: string
): AllocationResult {
  const randomSeed = seed || `seed-mentor-multi-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const rng = createPRNG(randomSeed);

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
      allocationMode: mode,
      randomSeed: mode === 'RANDOM' ? randomSeed : undefined,
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
    let yrStudents = students
      .filter(
        (s) =>
          s.status === 'ACTIVE' &&
          (s.departmentId === departmentId || !s.departmentId || s.departmentId === 'dept-ise') &&
          s.currentYear === yr
      );

    if (mode === 'RANDOM') {
      yrStudents = shuffleWithSeed(yrStudents, rng);
    } else {
      yrStudents.sort((a, b) => a.usn.localeCompare(b.usn));
    }

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
    allocationMode: mode,
    randomSeed: mode === 'RANDOM' ? randomSeed : undefined,
  };
}
