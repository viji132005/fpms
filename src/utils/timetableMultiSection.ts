/**
 * Pure functions for Year/Semester mapping, multi-section schedule grids,
 * and cross-section clash detection according to MIT Mysore institutional rules.
 */
import type { TimetableSlot, SubjectAllocationRecord } from '../types/index.ts';

export interface SectionSchedule {
  section: string; // 'Section A', 'Section B', 'Section C', 'Section D'
  roomNumber: string;
  classTeacher: string;
  schedule: TimetableSlot[];
}

export const MITM_DAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI'] as const;

export const MITM_PERIOD_DEFINITIONS = [
  { index: 0, timeRange: '09.00am to 10.00am', isBreak: false, label: '09.00am to 10.00am' },
  { index: 1, timeRange: '10.00am to 11.00am', isBreak: false, label: '10.00am to 11.00am' },
  { index: 2, timeRange: '11.00am to 11.25am', isBreak: true, breakType: 'SHORT_BREAK' as const, label: 'SHORT BREAK' },
  { index: 3, timeRange: '11.25am to 12.20pm', isBreak: false, label: '11.25am to 12.20pm' },
  { index: 4, timeRange: '12.20pm to 01.15pm', isBreak: false, label: '12.20pm to 01.15pm' },
  { index: 5, timeRange: '01.15pm to 02.00pm', isBreak: true, breakType: 'LUNCH_BREAK' as const, label: 'LUNCH BREAK' },
  { index: 6, timeRange: '02.00pm to 03.00pm', isBreak: false, label: '02.00pm to 03.00pm' },
  { index: 7, timeRange: '03.00pm to 04.00pm', isBreak: false, label: '03.00pm to 04.00pm' },
];

/**
 * Returns allowed semesters for a given student year.
 * 1st Year -> [1, 2]
 * 2nd Year -> [3, 4]
 * 3rd Year -> [5, 6]
 * 4th Year -> [7, 8]
 */
export function getSemestersForYear(year: number): number[] {
  switch (year) {
    case 1:
      return [1, 2];
    case 2:
      return [3, 4];
    case 3:
      return [5, 6];
    case 4:
      return [7, 8];
    default:
      return [1, 2];
  }
}

/**
 * Returns roman numeral representation of semester number
 */
export function getSemesterRoman(sem: number): string {
  const roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];
  return roman[sem - 1] || `${sem}`;
}

/**
 * Creates a clean default MIT Mysore timetable grid for a section
 */
export function createDefaultMITMGrid(section: string, defaultRoom: string = ''): TimetableSlot[] {
  const slots: TimetableSlot[] = [];

  for (const day of MITM_DAYS) {
    for (const def of MITM_PERIOD_DEFINITIONS) {
      slots.push({
        day,
        periodIndex: def.index,
        timeRange: def.timeRange,
        courseCode: def.isBreak ? '' : '',
        courseTitle: def.isBreak ? def.label : '',
        courseShortName: def.isBreak ? def.label : '',
        facultyUserId: '',
        facultyName: '',
        facultyInitials: '',
        room: def.isBreak ? '' : defaultRoom,
        isLab: false,
        isBreak: def.isBreak,
        breakType: def.breakType,
      });
    }
  }

  return slots;
}

/**
 * Finds the slot data to stamp when admin clicks a grid cell
 */
export function getStampedSlotData(
  slot: TimetableSlot,
  subjectCode: string,
  section: string,
  allocations: SubjectAllocationRecord[],
  defaultRoom: string = ''
): Partial<TimetableSlot> {
  const mapping = allocations.find(
    (a) =>
      a.section.toLowerCase().includes(section.toLowerCase().replace('section ', '')) &&
      a.subjectCode === subjectCode
  );

  if (!mapping) {
    return {
      courseCode: subjectCode,
      courseTitle: subjectCode,
      courseShortName: subjectCode,
      facultyUserId: '',
      facultyName: '',
      facultyInitials: '',
      room: defaultRoom || slot.room,
      isLab: false,
    };
  }

  return {
    courseCode: mapping.subjectCode,
    courseTitle: mapping.subjectTitle,
    courseShortName: mapping.subjectShortName,
    facultyUserId: mapping.facultyUserId,
    facultyName: mapping.facultyName,
    facultyInitials: mapping.facultyInitials,
    room: defaultRoom || slot.room,
    isLab: mapping.isLab || false,
  };
}

/**
 * Validates cross-section faculty clashes across simultaneous sections
 */
export function validateCrossSectionClashes(
  sections: { section: string; schedule: TimetableSlot[] }[]
): { isValid: boolean; clashes: string[] } {
  const clashes: string[] = [];

  // Map: `${day}-${periodIndex}-${facultyInitials/UserId}` -> { section, courseCode, timeRange }
  const timeFacultyMap = new Map<
    string,
    { section: string; courseCode: string; timeRange: string; facultyName: string }
  >();

  for (const sec of sections) {
    for (const slot of sec.schedule) {
      if (slot.isBreak || !slot.courseCode) continue;

      // Identify faculty key (either by userId or faculty initials)
      const facKey = slot.facultyUserId || (slot.facultyInitials ? `init-${slot.facultyInitials}` : '');
      if (!facKey) continue;

      // Skip generic tags like 'ALL', 'RDF', 'PT'
      if (['ALL', 'RDF', 'PT', 'TBA'].includes(slot.facultyInitials?.toUpperCase() || '')) {
        continue;
      }

      const key = `${slot.day}-${slot.periodIndex}-${facKey.toLowerCase()}`;
      if (timeFacultyMap.has(key)) {
        const existing = timeFacultyMap.get(key)!;
        if (existing.section !== sec.section) {
          clashes.push(
            `Cross-Section Clash: ${slot.facultyName || slot.facultyInitials} is scheduled at ${slot.day} ${slot.timeRange} in both ${existing.section} (${existing.courseCode}) and ${sec.section} (${slot.courseCode}).`
          );
        }
      } else {
        timeFacultyMap.set(key, {
          section: sec.section,
          courseCode: slot.courseCode,
          timeRange: slot.timeRange,
          facultyName: slot.facultyName || slot.facultyInitials || '',
        });
      }
    }
  }

  return {
    isValid: clashes.length === 0,
    clashes,
  };
}
