/**
 * Timetable Validation & Scheduling Engine
 * Enforces institutional constraints, semester-specific faculty assignments,
 * conflict detection, and publication permission rules.
 */

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
  day: string; // 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday'
  periodIndex: number; // 0 to 6
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

export interface ValidationReport {
  isValid: boolean;
  checkedAt: string;
  conflicts: string[];
  warnings: string[];
  facultyWorkloads: {
    facultyUserId: string;
    facultyName: string;
    allocatedHours: number;
    assignedTargetHours: number;
  }[];
}

export const STANDARD_PERIODS = [
  { index: 0, timeRange: '09:00 - 10:00' },
  { index: 1, timeRange: '10:00 - 11:00' },
  { index: 2, timeRange: '11:15 - 12:15' },
  { index: 3, timeRange: '12:15 - 01:15' },
  { index: 4, timeRange: '02:00 - 03:00' },
  { index: 5, timeRange: '03:00 - 04:00' },
  { index: 6, timeRange: '04:00 - 05:00' },
];

export const ACADEMIC_DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/**
 * Validates a timetable against institutional constraints:
 * 1. No faculty member can be scheduled in more than one classroom at the same day + period.
 * 2. No classroom/room can be double-booked at the same day + period.
 * 3. Semester-specific faculty assignments must be explicitly configured.
 * 4. Checks whether allocated hours meet assigned course target hours.
 */
export function validateTimetableRules(
  assignments: FacultyAssignment[],
  schedule: TimetableSlot[],
  existingOtherSchedules: TimetableSlot[] = []
): ValidationReport {
  const conflicts: string[] = [];
  const warnings: string[] = [];

  // Check 1: Mandatory semester-specific faculty assignments
  if (!assignments || assignments.length === 0) {
    conflicts.push(
      'Semester-specific faculty assignments are missing. The system requires explicit faculty configuration per semester.'
    );
  }

  // Check 2: Within-timetable faculty and room collisions
  const slotKeyMap = new Map<string, TimetableSlot>();
  const facultyTimeMap = new Map<string, TimetableSlot>();

  for (const slot of schedule) {
    if (!slot.courseCode) continue;

    const timeKey = `${slot.day}-${slot.periodIndex}`;
    const roomKey = `${timeKey}-${slot.room.toLowerCase().trim()}`;
    const facultyKey = `${timeKey}-${slot.facultyUserId}`;

    // Room collision check
    if (slot.room && slotKeyMap.has(roomKey)) {
      const existing = slotKeyMap.get(roomKey)!;
      conflicts.push(
        `Room conflict in ${slot.room} on ${slot.day} (${slot.timeRange}): ${slot.courseCode} clashes with ${existing.courseCode}.`
      );
    } else if (slot.room) {
      slotKeyMap.set(roomKey, slot);
    }

    // Faculty double-booking within this timetable
    if (slot.facultyUserId && facultyTimeMap.has(facultyKey)) {
      const existing = facultyTimeMap.get(facultyKey)!;
      conflicts.push(
        `Faculty double-booking: ${slot.facultyName} is scheduled for both ${existing.courseCode} and ${slot.courseCode} on ${slot.day} at ${slot.timeRange}.`
      );
    } else if (slot.facultyUserId) {
      facultyTimeMap.set(facultyKey, slot);
    }

    // Faculty collision across concurrent section timetables
    for (const otherSlot of existingOtherSchedules) {
      if (
        otherSlot.day === slot.day &&
        otherSlot.periodIndex === slot.periodIndex &&
        otherSlot.facultyUserId === slot.facultyUserId
      ) {
        conflicts.push(
          `Cross-section faculty clash: ${slot.facultyName} is already teaching ${otherSlot.courseCode} in ${otherSlot.room} on ${slot.day} at ${slot.timeRange}.`
        );
      }
    }
  }

  // Check 3: Workload and coverage audit
  const hoursMap = new Map<string, number>();
  for (const slot of schedule) {
    if (!slot.courseCode) continue;
    const current = hoursMap.get(slot.courseCode) || 0;
    hoursMap.set(slot.courseCode, current + 1);
  }

  const facultyWorkloads = assignments.map((fa) => {
    const allocated = hoursMap.get(fa.courseCode) || 0;
    if (allocated === 0) {
      warnings.push(
        `Course ${fa.courseCode} (${fa.courseTitle}) assigned to ${fa.facultyName} has 0 scheduled slots in this timetable.`
      );
    } else if (allocated < fa.hoursPerWeek) {
      warnings.push(
        `Course ${fa.courseCode} has ${allocated} allocated hours (target: ${fa.hoursPerWeek} hrs/week).`
      );
    }
    return {
      facultyUserId: fa.facultyUserId,
      facultyName: fa.facultyName,
      allocatedHours: allocated,
      assignedTargetHours: fa.hoursPerWeek,
    };
  });

  return {
    isValid: conflicts.length === 0,
    checkedAt: new Date().toISOString(),
    conflicts,
    warnings,
    facultyWorkloads,
  };
}

/**
 * Guard rule: Only validated timetables with 0 blocking conflicts may be published.
 */
export function canPublishTimetable(
  status: string,
  validationReport?: { isValid: boolean; conflicts?: string[] }
): { allowed: boolean; reason?: string } {
  if (!validationReport || !validationReport.isValid) {
    return {
      allowed: false,
      reason: 'Only validated timetables may be published. Please run timetable validation and resolve all conflicts first.',
    };
  }
  if (validationReport.conflicts && validationReport.conflicts.length > 0) {
    return {
      allowed: false,
      reason: `Cannot publish: ${validationReport.conflicts.length} unresolved scheduling conflicts detected.`,
    };
  }
  return { allowed: true };
}

/**
 * Automated Timetable Generator:
 * Generates an optimized, conflict-free weekly schedule based on semester-specific faculty assignments.
 */
export function generateAutomatedTimetableGrid(
  assignments: FacultyAssignment[],
  defaultRoom: string = 'LH-302',
  defaultLabRoom: string = 'ISE Project Lab 2'
): TimetableSlot[] {
  const schedule: TimetableSlot[] = [];

  // Separate theory courses and practical/lab courses
  const labAssignments = assignments.filter((a) => a.isLab);
  const theoryAssignments = assignments.filter((a) => !a.isLab);

  // Initialize empty slots for all days and periods
  for (const day of ACADEMIC_DAYS) {
    for (const period of STANDARD_PERIODS) {
      schedule.push({
        day,
        periodIndex: period.index,
        timeRange: period.timeRange,
        courseCode: '',
        courseTitle: '',
        facultyUserId: '',
        facultyName: '',
        room: defaultRoom,
        isLab: false,
      });
    }
  }

  // Helper to place a slot
  const placeSlot = (
    day: string,
    periodIndex: number,
    assignment: FacultyAssignment,
    isLab = false,
    customRoom?: string
  ) => {
    const target = schedule.find(
      (s) => s.day === day && s.periodIndex === periodIndex
    );
    if (target && !target.courseCode) {
      target.courseCode = assignment.courseCode;
      target.courseTitle = assignment.courseTitle;
      target.facultyUserId = assignment.facultyUserId;
      target.facultyName = assignment.facultyName;
      target.room = customRoom || (isLab ? defaultLabRoom : defaultRoom);
      target.isLab = isLab;
      return true;
    }
    return false;
  };

  // 1. Allocate Labs: Usually continuous 3-period block in afternoon (periods 4, 5, 6)
  const labDays = ['Tuesday', 'Thursday', 'Friday'];
  labAssignments.forEach((lab, index) => {
    const day = labDays[index % labDays.length];
    for (let p = 4; p <= 6; p++) {
      placeSlot(day, p, lab, true, defaultLabRoom);
    }
  });

  // 2. Distribute Theory Courses across days
  const theoryPool: FacultyAssignment[] = [];
  for (const ta of theoryAssignments) {
    for (let h = 0; h < ta.hoursPerWeek; h++) {
      theoryPool.push(ta);
    }
  }

  // Shuffle / round-robin theory placement across days & morning periods (0, 1, 2, 3)
  let poolIdx = 0;
  for (let p = 0; p < 4; p++) {
    for (const day of ACADEMIC_DAYS) {
      if (poolIdx >= theoryPool.length) break;
      const assignment = theoryPool[poolIdx];
      // Avoid scheduling same theory course twice on the same day if possible
      const alreadyOnDay = schedule.some(
        (s) => s.day === day && s.courseCode === assignment.courseCode
      );
      if (!alreadyOnDay) {
        if (placeSlot(day, p, assignment, false, defaultRoom)) {
          poolIdx++;
        }
      }
    }
  }

  // Fill remaining slots
  while (poolIdx < theoryPool.length) {
    const assignment = theoryPool[poolIdx];
    const emptySlot = schedule.find((s) => !s.courseCode);
    if (emptySlot) {
      placeSlot(emptySlot.day, emptySlot.periodIndex, assignment, false, defaultRoom);
    }
    poolIdx++;
  }

  return schedule;
}

/**
 * Extract an authenticated faculty member's personal teaching schedule from all published timetables.
 */
export function extractFacultyPersonalSchedule(
  timetables: {
    id: string;
    departmentId: string;
    semester: string;
    section?: string;
    title: string;
    status: string;
    schedule: TimetableSlot[];
  }[],
  facultyUserId: string
): {
  day: string;
  periodIndex: number;
  timeRange: string;
  courseCode: string;
  courseTitle: string;
  room: string;
  departmentId: string;
  semester: string;
  section?: string;
}[] {
  const result: {
    day: string;
    periodIndex: number;
    timeRange: string;
    courseCode: string;
    courseTitle: string;
    room: string;
    departmentId: string;
    semester: string;
    section?: string;
  }[] = [];

  // Filter only PUBLISHED timetables for authoritative view
  const published = timetables.filter((t) => t.status === 'PUBLISHED');

  for (const tt of published) {
    for (const slot of tt.schedule) {
      if (slot.facultyUserId === facultyUserId && slot.courseCode) {
        result.push({
          day: slot.day,
          periodIndex: slot.periodIndex,
          timeRange: slot.timeRange,
          courseCode: slot.courseCode,
          courseTitle: slot.courseTitle,
          room: slot.room,
          departmentId: tt.departmentId,
          semester: tt.semester,
          section: tt.section,
        });
      }
    }
  }

  // Sort by day then periodIndex
  const dayOrder: Record<string, number> = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  return result.sort((a, b) => {
    const dayDiff = (dayOrder[a.day] || 99) - (dayOrder[b.day] || 99);
    if (dayDiff !== 0) return dayDiff;
    return a.periodIndex - b.periodIndex;
  });
}
