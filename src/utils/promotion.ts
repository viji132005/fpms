/**
 * Semester-Wise Student Progression & Cohort Promotion Engine
 * Maharaja Institute of Technology, Mysore
 *
 * VTU Academic Semesters progression:
 * - ODD Semester Progression:
 *   Sem 1 -> Sem 2 (Year 1)
 *   Sem 3 -> Sem 4 (Year 2)
 *   Sem 5 -> Sem 6 (Year 3)
 *   Sem 7 -> Sem 8 (Year 4)
 *
 * - EVEN Semester Progression (Annual Academic Rollover):
 *   Sem 2 -> Sem 3 (Year 2)
 *   Sem 4 -> Sem 5 (Year 3)
 *   Sem 6 -> Sem 7 (Year 4)
 *   Sem 8 -> GRADUATED (Alumni)
 *
 * Detained / Withdrawn students are retained in their current semester and year.
 * Graduated students remain permanently locked as alumni with zero active toggling.
 */

export interface PromotionCandidate {
  id: string;
  usn: string;
  fullName: string;
  departmentId: string;
  currentYear: number;
  currentSemester?: number; // 1 to 8 (defaults to currentYear odd/even sem)
  section?: string;
  status: 'ACTIVE' | 'DETAINED' | 'WITHDRAWN' | 'GRADUATED';
}

export interface PromotionHistoryRecord {
  id: string;
  studentId: string;
  studentUsn?: string;
  studentName?: string;
  fromYear: number;
  toYear: number;
  fromSemester: number;
  toSemester: number | 'GRADUATED';
  academicYear: string;
  promotedBy: string;
  status: 'PROMOTED' | 'HELD_BACK' | 'GRADUATED';
  timestamp: string;
  remarks?: string;
}

export function calculateYearFromSemester(sem: number): number {
  if (sem <= 2) return 1;
  if (sem <= 4) return 2;
  if (sem <= 6) return 3;
  return 4;
}

export function formatOrdinal(n: number): string {
  if (n === 1) return '1st';
  if (n === 2) return '2nd';
  if (n === 3) return '3rd';
  return `${n}th`;
}

export type SemesterCycle = 'ODD' | 'EVEN';

/**
 * Detects whether the active department students are currently in an ODD or EVEN semester cycle
 */
export function detectDepartmentSemesterCycle(
  students: PromotionCandidate[],
  departmentId: string
): SemesterCycle {
  const activeStudents = students.filter(
    (s) => s.departmentId === departmentId && s.status === 'ACTIVE'
  );

  if (activeStudents.length === 0) {
    return 'ODD'; // New academic batches always start in ODD semester (Sem 1, 3, 5, 7)
  }

  // Count odd vs even current semesters
  let oddCount = 0;
  let evenCount = 0;
  for (const s of activeStudents) {
    const sem = s.currentSemester || (s.currentYear === 1 ? 1 : s.currentYear === 2 ? 3 : s.currentYear === 3 ? 5 : 7);
    if (sem % 2 === 1) oddCount++;
    else evenCount++;
  }

  return oddCount >= evenCount ? 'ODD' : 'EVEN';
}

export interface SemesterProgressionPreview {
  currentCycle: SemesterCycle;
  cycle?: SemesterCycle;
  targetCycle: SemesterCycle;
  cycleDescription: string;
  cohorts: {
    fromSem: number;
    toSem: number | 'GRADUATED';
    fromYear: number;
    toYear: number;
    eligibleCount: number;
    heldBackCount: number;
    description: string;
  }[];
  moves?: {
    action: string;
    fromSemester: number;
    toSemester: number | 'GRADUATED';
    fromYear: number;
    toYear: number;
    studentCount: number;
    heldBackCount: number;
  }[];
  totalEligible: number;
  eligibleStudentsCount?: number;
  totalHeldBack: number;
  willGraduateCount: number;
}

/**
 * Generates preview for Department-wide simultaneous semester progression
 */
export function generateSemesterProgressionPreview(
  students: PromotionCandidate[],
  departmentId: string
): SemesterProgressionPreview {
  const cycle = detectDepartmentSemesterCycle(students, departmentId);
  const targetCycle: SemesterCycle = cycle === 'ODD' ? 'EVEN' : 'ODD';

  const deptStudents = students.filter(
    (s) => s.departmentId === departmentId && s.status !== 'GRADUATED'
  );

  const activeSems = cycle === 'ODD' ? [1, 3, 5, 7] : [2, 4, 6, 8];
  const cohorts: SemesterProgressionPreview['cohorts'] = [];
  let totalEligible = 0;
  let totalHeldBack = 0;
  let willGraduateCount = 0;

  for (const sem of activeSems) {
    const cohort = deptStudents.filter((s) => {
      const sSem = s.currentSemester || (s.currentYear === 1 ? 1 : s.currentYear === 2 ? 3 : s.currentYear === 3 ? 5 : 7);
      return sSem === sem;
    });

    const eligible = cohort.filter((s) => s.status === 'ACTIVE');
    const heldBack = cohort.filter((s) => s.status !== 'ACTIVE');

    totalEligible += eligible.length;
    totalHeldBack += heldBack.length;

    const fromYear = calculateYearFromSemester(sem);
    const toSem = sem >= 8 ? 'GRADUATED' : sem + 1;
    const toYear = sem >= 8 ? 4 : calculateYearFromSemester(sem + 1);

    if (sem >= 8) {
      willGraduateCount += eligible.length;
    }

    let description = '';
    if (sem >= 8) {
      description = `4th Year (8th Sem) ➔ Graduated Alumni (Replaces Previous Graduated)`;
    } else if (cycle === 'ODD') {
      description = `${formatOrdinal(fromYear)} Year: ${formatOrdinal(sem)} Sem ➔ ${formatOrdinal(sem + 1)} Sem (${formatOrdinal(fromYear)} Year)`;
    } else {
      description = `${formatOrdinal(fromYear)} Year (${formatOrdinal(sem)} Sem) ➔ ${formatOrdinal(toYear)} Year (${formatOrdinal(sem + 1)} Sem)`;
    }

    cohorts.push({
      fromSem: sem,
      toSem,
      fromYear,
      toYear,
      eligibleCount: eligible.length,
      heldBackCount: heldBack.length,
      description,
    });
  }

  const cycleDescription = cycle === 'ODD'
    ? 'Mid-Year Progression: ODD Semesters (1st, 3rd, 5th, 7th) -> EVEN Semesters (2nd, 4th, 6th, 8th)'
    : 'Annual Rollover Progression: EVEN Semesters (2nd, 4th, 6th, 8th) -> Next Year ODD Semesters (3rd, 5th, 7th) & 8th Sem Graduates';

  const moves = cohorts.map((c) => ({
    action: c.description,
    fromSemester: c.fromSem,
    toSemester: c.toSem,
    fromYear: c.fromYear,
    toYear: c.toYear,
    studentCount: c.eligibleCount,
    heldBackCount: c.heldBackCount,
  }));

  return {
    currentCycle: cycle,
    cycle,
    targetCycle,
    cycleDescription,
    cohorts,
    moves,
    totalEligible,
    eligibleStudentsCount: totalEligible,
    totalHeldBack,
    willGraduateCount,
  };
}

/**
 * Executes simultaneous semester progression for all cohorts in department
 */
export function executeSemesterProgression(
  students: PromotionCandidate[],
  departmentId: string,
  academicYear: string,
  promotedByUserId: string
): {
  updatedStudents: PromotionCandidate[];
  historyRecords: PromotionHistoryRecord[];
  summary: {
    promotedCount: number;
    graduatedCount: number;
    heldBackCount: number;
    cycleCompleted: SemesterCycle;
  };
} {
  const cycle = detectDepartmentSemesterCycle(students, departmentId);
  const now = new Date().toISOString();
  const historyRecords: PromotionHistoryRecord[] = [];

  let promotedCount = 0;
  let graduatedCount = 0;
  let heldBackCount = 0;

  // Determine if any active 4th-year students are graduating in this progression (8th semester)
  const willGraduateStudents = students.filter(
    (s) =>
      s.departmentId === departmentId &&
      s.status === 'ACTIVE' &&
      (s.currentSemester ? s.currentSemester >= 8 : s.currentYear === 4)
  );

  // If new 4th-year students are graduating, purge the older graduated batch from Previous Graduated
  // so the Previous Graduated cohort is cleanly replaced by the latest graduating batch
  const filteredBaseStudents = willGraduateStudents.length > 0
    ? students.filter((s) => !(s.departmentId === departmentId && s.status === 'GRADUATED'))
    : students;

  const updatedStudents = filteredBaseStudents.map((s) => {
    if (s.departmentId !== departmentId || s.status === 'GRADUATED') {
      return s;
    }

    const currentSem = s.currentSemester || (s.currentYear === 1 ? 1 : s.currentYear === 2 ? 3 : s.currentYear === 3 ? 5 : 7);
    const fromYear = s.currentYear || calculateYearFromSemester(currentSem);

    if (s.status !== 'ACTIVE') {
      heldBackCount++;
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear,
        toYear: fromYear,
        fromSemester: currentSem,
        toSemester: currentSem,
        academicYear,
        promotedBy: promotedByUserId,
        status: 'HELD_BACK',
        timestamp: now,
        remarks: `Retained in Semester ${currentSem} (Year ${fromYear}) due to status: ${s.status}`,
      });
      return {
        ...s,
        currentSemester: currentSem,
        currentYear: fromYear,
      };
    }

    // 8th Semester graduating
    if (currentSem >= 8) {
      graduatedCount++;
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear: 4,
        toYear: 4,
        fromSemester: 8,
        toSemester: 'GRADUATED',
        academicYear,
        promotedBy: promotedByUserId,
        status: 'GRADUATED',
        timestamp: now,
        remarks: 'Successfully completed 8th Semester (4th Year) and Graduated from MIT Mysore',
      });
      return {
        ...s,
        currentSemester: 8,
        currentYear: 4,
        status: 'GRADUATED' as const,
      };
    }

    // Advance to next semester
    const nextSem = currentSem + 1;
    const nextYear = calculateYearFromSemester(nextSem);
    promotedCount++;

    historyRecords.push({
      id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: s.id,
      studentUsn: s.usn,
      studentName: s.fullName,
      fromYear,
      toYear: nextYear,
      fromSemester: currentSem,
      toSemester: nextSem,
      academicYear,
      promotedBy: promotedByUserId,
      status: 'PROMOTED',
      timestamp: now,
      remarks: `Promoted from Semester ${currentSem} (Year ${fromYear}) to Semester ${nextSem} (Year ${nextYear})`,
    });

    return {
      ...s,
      currentSemester: nextSem,
      currentYear: nextYear,
    };
  });

  return {
    updatedStudents,
    historyRecords,
    summary: {
      promotedCount,
      graduatedCount,
      heldBackCount,
      cycleCompleted: cycle,
    },
  };
}

// Backward-compatibility wrappers for existing API calls
export function checkPromotionCollision(
  students: PromotionCandidate[],
  departmentId: string,
  fromYear: number
): { canPromote: boolean; reason?: string } {
  if (fromYear >= 4) {
    return { canPromote: true };
  }
  const targetYear = fromYear + 1;
  const targetCohortActiveCount = students.filter(
    (s) => s.departmentId === departmentId && s.currentYear === targetYear && s.status === 'ACTIVE'
  ).length;

  if (targetCohortActiveCount > 0) {
    return {
      canPromote: false,
      reason: `Cannot promote Year ${fromYear} students because Year ${targetYear} currently has ${targetCohortActiveCount} active students. Promote Year ${targetYear} seniors first to avoid cohort collision.`,
    };
  }

  return { canPromote: true };
}

export function generatePromotionPlan(
  students: PromotionCandidate[],
  departmentId: string,
  fromYear: number
) {
  const cohort = students.filter(
    (s) => s.departmentId === departmentId && s.currentYear === fromYear
  );

  const eligibleForPromotion: PromotionCandidate[] = [];
  const excludedStudents: { student: PromotionCandidate; reason: string }[] = [];

  for (const s of cohort) {
    if (s.status === 'ACTIVE') eligibleForPromotion.push(s);
    else excludedStudents.push({ student: s, reason: `Status is ${s.status}` });
  }

  return {
    eligibleForPromotion,
    excludedStudents,
    newYearTarget: fromYear >= 4 ? 'GRADUATED' : fromYear + 1,
  };
}

export function executePromotion(
  students: PromotionCandidate[],
  departmentId: string,
  fromYear: number,
  academicYear: string,
  promotedByUserId: string
) {
  const now = new Date().toISOString();
  const historyRecords: PromotionHistoryRecord[] = [];

  const willGraduate = fromYear >= 4;
  const filteredStudents = willGraduate
    ? students.filter((s) => !(s.departmentId === departmentId && s.status === 'GRADUATED'))
    : students;

  const updatedStudents = filteredStudents.map((s) => {
    if (s.departmentId !== departmentId || s.currentYear !== fromYear) {
      return s;
    }

    const currentSem = s.currentSemester || (fromYear === 1 ? 1 : fromYear === 2 ? 3 : fromYear === 3 ? 5 : 7);

    if (s.status === 'ACTIVE') {
      if (fromYear >= 4) {
        historyRecords.push({
          id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentId: s.id,
          studentUsn: s.usn,
          studentName: s.fullName,
          fromYear,
          toYear: 4,
          fromSemester: currentSem,
          toSemester: 'GRADUATED',
          academicYear,
          promotedBy: promotedByUserId,
          status: 'GRADUATED',
          timestamp: now,
          remarks: 'Successfully graduated',
        });
        return {
          ...s,
          currentYear: 4,
          currentSemester: 8,
          status: 'GRADUATED' as const,
        };
      } else {
        const nextYear = fromYear + 1;
        const nextSem = Math.min(8, currentSem + 2);
        historyRecords.push({
          id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          studentId: s.id,
          studentUsn: s.usn,
          studentName: s.fullName,
          fromYear,
          toYear: nextYear,
          fromSemester: currentSem,
          toSemester: nextSem,
          academicYear,
          promotedBy: promotedByUserId,
          status: 'PROMOTED',
          timestamp: now,
          remarks: `Promoted from Year ${fromYear} to Year ${nextYear}`,
        });
        return {
          ...s,
          currentYear: nextYear,
          currentSemester: nextSem,
        };
      }
    } else {
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear,
        toYear: fromYear,
        fromSemester: currentSem,
        toSemester: currentSem,
        academicYear,
        promotedBy: promotedByUserId,
        status: 'HELD_BACK',
        timestamp: now,
        remarks: `Retained due to status: ${s.status}`,
      });
      return s;
    }
  });

  return { updatedStudents, historyRecords };
}

export function generateCascadePromotionPlan(students: PromotionCandidate[], departmentId: string) {
  return generateSemesterProgressionPreview(students, departmentId);
}

export function executeCascadeAnnualPromotion(
  students: PromotionCandidate[],
  departmentId: string,
  academicYear: string,
  promotedByUserId: string
) {
  const now = new Date().toISOString();
  const historyRecords: PromotionHistoryRecord[] = [];
  let year4Graduated = 0;
  let year3To4Promoted = 0;
  let year2To3Promoted = 0;
  let year1To2Promoted = 0;
  let totalHeldBack = 0;

  // Purge older graduated batch so Previous Graduated is replaced by the graduating 4th-year cohort
  const hasYear4Active = students.some(
    (s) => s.departmentId === departmentId && s.currentYear === 4 && s.status === 'ACTIVE'
  );
  const filteredStudents = hasYear4Active
    ? students.filter((s) => !(s.departmentId === departmentId && s.status === 'GRADUATED'))
    : students;

  const updatedStudents = filteredStudents.map((s) => {
    if (s.departmentId !== departmentId || s.status === 'GRADUATED') {
      return s;
    }

    const currentSem = s.currentSemester || (s.currentYear === 1 ? 1 : s.currentYear === 2 ? 3 : s.currentYear === 3 ? 5 : 7);

    if (s.status !== 'ACTIVE') {
      totalHeldBack++;
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear: s.currentYear,
        toYear: s.currentYear,
        fromSemester: currentSem,
        toSemester: currentSem,
        academicYear,
        promotedBy: promotedByUserId,
        status: 'HELD_BACK',
        timestamp: now,
        remarks: `Retained in Year ${s.currentYear} during Annual Cascade Promotion (status: ${s.status})`,
      });
      return s;
    }

    if (s.currentYear === 4) {
      year4Graduated++;
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear: 4,
        toYear: 4,
        fromSemester: 8,
        toSemester: 'GRADUATED',
        academicYear,
        promotedBy: promotedByUserId,
        status: 'GRADUATED',
        timestamp: now,
        remarks: 'Successfully graduated during Annual Departmental Cascade Promotion',
      });
      return {
        ...s,
        currentYear: 4,
        currentSemester: 8,
        status: 'GRADUATED' as const,
      };
    } else if (s.currentYear === 3) {
      year3To4Promoted++;
      const nextSem = Math.min(8, currentSem + 2);
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear: 3,
        toYear: 4,
        fromSemester: currentSem,
        toSemester: nextSem,
        academicYear,
        promotedBy: promotedByUserId,
        status: 'PROMOTED',
        timestamp: now,
        remarks: 'Promoted from Year 3 to Year 4',
      });
      return {
        ...s,
        currentYear: 4,
        currentSemester: nextSem,
      };
    } else if (s.currentYear === 2) {
      year2To3Promoted++;
      const nextSem = Math.min(6, currentSem + 2);
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear: 2,
        toYear: 3,
        fromSemester: currentSem,
        toSemester: nextSem,
        academicYear,
        promotedBy: promotedByUserId,
        status: 'PROMOTED',
        timestamp: now,
        remarks: 'Promoted from Year 2 to Year 3',
      });
      return {
        ...s,
        currentYear: 3,
        currentSemester: nextSem,
      };
    } else {
      year1To2Promoted++;
      const nextSem = Math.min(4, currentSem + 2);
      historyRecords.push({
        id: `hist-${s.id}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        studentId: s.id,
        studentUsn: s.usn,
        studentName: s.fullName,
        fromYear: 1,
        toYear: 2,
        fromSemester: currentSem,
        toSemester: nextSem,
        academicYear,
        promotedBy: promotedByUserId,
        status: 'PROMOTED',
        timestamp: now,
        remarks: 'Promoted from Year 1 to Year 2',
      });
      return {
        ...s,
        currentYear: 2,
        currentSemester: nextSem,
      };
    }
  });

  return {
    updatedStudents,
    historyRecords,
    summary: {
      year4Graduated,
      year3To4Promoted,
      year2To3Promoted,
      year1To2Promoted,
      totalPromoted: year3To4Promoted + year2To3Promoted + year1To2Promoted,
      totalGraduated: year4Graduated,
      totalHeldBack,
    },
  };
}
