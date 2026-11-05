import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateTimetableRules,
  canPublishTimetable,
  generateAutomatedTimetableGrid,
  extractFacultyPersonalSchedule,
  FacultyAssignment,
  TimetableSlot,
} from './timetableValidation.ts';

const mockAssignments: FacultyAssignment[] = [
  {
    id: 'fa-1',
    courseCode: '21IS51',
    courseTitle: 'Automata Theory & Compiler Design',
    facultyUserId: 'user-fac-gururaja',
    facultyName: 'Prof. Gururaja M P',
    staffId: 'MITM-ISE-012',
    hoursPerWeek: 4,
    isLab: false,
  },
  {
    id: 'fa-2',
    courseCode: '21IS52',
    courseTitle: 'Computer Networks',
    facultyUserId: 'user-fac-anitha',
    facultyName: 'Dr. Anitha K',
    staffId: 'MITM-ISE-015',
    hoursPerWeek: 4,
    isLab: false,
  },
  {
    id: 'fa-3',
    courseCode: '21ISL56',
    courseTitle: 'Computer Networks Lab',
    facultyUserId: 'user-fac-gururaja',
    facultyName: 'Prof. Gururaja M P',
    staffId: 'MITM-ISE-012',
    hoursPerWeek: 3,
    isLab: true,
  },
];

test('validateTimetableRules detects faculty double-booking collision', () => {
  const conflictedSchedule: TimetableSlot[] = [
    {
      day: 'Monday',
      periodIndex: 0,
      timeRange: '09:00 - 10:00',
      courseCode: '21IS51',
      courseTitle: 'Automata Theory',
      facultyUserId: 'user-fac-gururaja',
      facultyName: 'Prof. Gururaja M P',
      room: 'LH-301',
    },
    {
      day: 'Monday',
      periodIndex: 0,
      timeRange: '09:00 - 10:00',
      courseCode: '21ISL56',
      courseTitle: 'Networks Lab',
      facultyUserId: 'user-fac-gururaja', // Same faculty at same time!
      facultyName: 'Prof. Gururaja M P',
      room: 'Lab-1',
    },
  ];

  const report = validateTimetableRules(mockAssignments, conflictedSchedule);
  assert.equal(report.isValid, false);
  assert.ok(report.conflicts.some((c) => c.includes('Faculty double-booking')));
});

test('validateTimetableRules detects room collision', () => {
  const roomConflictSchedule: TimetableSlot[] = [
    {
      day: 'Tuesday',
      periodIndex: 1,
      timeRange: '10:00 - 11:00',
      courseCode: '21IS51',
      courseTitle: 'Automata Theory',
      facultyUserId: 'user-fac-gururaja',
      facultyName: 'Prof. Gururaja M P',
      room: 'LH-301',
    },
    {
      day: 'Tuesday',
      periodIndex: 1,
      timeRange: '10:00 - 11:00',
      courseCode: '21IS52',
      courseTitle: 'Computer Networks',
      facultyUserId: 'user-fac-anitha',
      facultyName: 'Dr. Anitha K',
      room: 'LH-301', // Same room, different faculty!
    },
  ];

  const report = validateTimetableRules(mockAssignments, roomConflictSchedule);
  assert.equal(report.isValid, false);
  assert.ok(report.conflicts.some((c) => c.includes('Room conflict in LH-301')));
});

test('canPublishTimetable blocks unvalidated or conflicted timetable', () => {
  const invalidResult = canPublishTimetable('DRAFT', {
    isValid: false,
    conflicts: ['Faculty double-booking detected'],
  });
  assert.equal(invalidResult.allowed, false);

  const missingReportResult = canPublishTimetable('DRAFT', undefined);
  assert.equal(missingReportResult.allowed, false);

  const validResult = canPublishTimetable('VALIDATED', {
    isValid: true,
    conflicts: [],
  });
  assert.equal(validResult.allowed, true);
});

test('generateAutomatedTimetableGrid produces conflict-free schedule', () => {
  const schedule = generateAutomatedTimetableGrid(mockAssignments, 'LH-301', 'ISE Lab 1');
  assert.ok(schedule.length > 0);

  const report = validateTimetableRules(mockAssignments, schedule);
  assert.equal(report.isValid, true);
  assert.equal(report.conflicts.length, 0);
});

test('extractFacultyPersonalSchedule extracts only assigned classes from published timetables', () => {
  const publishedTimetables = [
    {
      id: 'tt-1',
      departmentId: 'dept-ise',
      semester: 'Semester V',
      section: 'Section A',
      title: 'ISE 5th Sem Timetable',
      status: 'PUBLISHED',
      schedule: [
        {
          day: 'Monday',
          periodIndex: 0,
          timeRange: '09:00 - 10:00',
          courseCode: '21IS51',
          courseTitle: 'Automata Theory',
          facultyUserId: 'user-fac-gururaja',
          facultyName: 'Prof. Gururaja M P',
          room: 'LH-301',
        },
        {
          day: 'Monday',
          periodIndex: 1,
          timeRange: '10:00 - 11:00',
          courseCode: '21IS52',
          courseTitle: 'Computer Networks',
          facultyUserId: 'user-fac-anitha',
          facultyName: 'Dr. Anitha K',
          room: 'LH-301',
        },
      ],
    },
    {
      id: 'tt-2-draft',
      departmentId: 'dept-ise',
      semester: 'Semester VII',
      title: 'ISE 7th Sem Draft',
      status: 'DRAFT', // Draft should not leak into personal teaching schedule
      schedule: [
        {
          day: 'Tuesday',
          periodIndex: 0,
          timeRange: '09:00 - 10:00',
          courseCode: '21IS71',
          courseTitle: 'Cloud Architecture',
          facultyUserId: 'user-fac-gururaja',
          facultyName: 'Prof. Gururaja M P',
          room: 'LH-302',
        },
      ],
    },
  ];

  const gururajaSchedule = extractFacultyPersonalSchedule(
    publishedTimetables,
    'user-fac-gururaja'
  );
  assert.equal(gururajaSchedule.length, 1);
  assert.equal(gururajaSchedule[0].courseCode, '21IS51');
  assert.equal(gururajaSchedule[0].semester, 'Semester V');
});
