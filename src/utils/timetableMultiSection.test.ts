import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getSemestersForYear,
  createDefaultMITMGrid,
  getStampedSlotData,
  validateCrossSectionClashes,
  MITM_DAYS,
  MITM_PERIOD_DEFINITIONS,
} from './timetableMultiSection.ts';
import { SubjectAllocationRecord } from '../types/index.ts';

test('getSemestersForYear returns correct semesters per year', () => {
  assert.deepEqual(getSemestersForYear(1), [1, 2]);
  assert.deepEqual(getSemestersForYear(2), [3, 4]);
  assert.deepEqual(getSemestersForYear(3), [5, 6]);
  assert.deepEqual(getSemestersForYear(4), [7, 8]);
});

test('createDefaultMITMGrid creates 40 slots (5 days x 8 periods)', () => {
  const grid = createDefaultMITMGrid('Section A', 'LH-301');
  assert.equal(grid.length, 40);
  const breaks = grid.filter((s) => s.isBreak);
  assert.equal(breaks.length, 10); // 2 breaks per day x 5 days
});

test('getStampedSlotData maps faculty initials and name per section', () => {
  const allocations: SubjectAllocationRecord[] = [
    {
      id: 'alloc-1',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BIS601',
      subjectTitle: 'FULL STACK DEVELOPMENT',
      subjectShortName: 'FSD',
      facultyUserId: 'user-amruth',
      facultyName: 'Prof. Amruth V',
      facultyInitials: 'AV',
    },
    {
      id: 'alloc-2',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BIS601',
      subjectTitle: 'FULL STACK DEVELOPMENT',
      subjectShortName: 'FSD',
      facultyUserId: 'user-bhavya',
      facultyName: 'Prof. Bhavya H D',
      facultyInitials: 'BHD',
    },
  ];

  const slotA = createDefaultMITMGrid('Section A')[0];
  const stampedA = getStampedSlotData(slotA, 'M23BIS601', 'Section A', allocations);
  assert.equal(stampedA.courseShortName, 'FSD');
  assert.equal(stampedA.facultyInitials, 'AV');
  assert.equal(stampedA.facultyName, 'Prof. Amruth V');

  const slotB = createDefaultMITMGrid('Section B')[0];
  const stampedB = getStampedSlotData(slotB, 'M23BIS601', 'Section B', allocations);
  assert.equal(stampedB.courseShortName, 'FSD');
  assert.equal(stampedB.facultyInitials, 'BHD');
  assert.equal(stampedB.facultyName, 'Prof. Bhavya H D');
});

test('validateCrossSectionClashes detects when same faculty is scheduled in two sections at same time', () => {
  const secAGrid = createDefaultMITMGrid('Section A');
  const secBGrid = createDefaultMITMGrid('Section B');

  // Place Dr. Ravi P (RP) in both Section A and Section B on MON period 0 (09:00 - 10:00)
  secAGrid[0].courseCode = 'M23BCS602';
  secAGrid[0].facultyUserId = 'user-ravi';
  secAGrid[0].facultyName = 'Dr. Ravi P';
  secAGrid[0].facultyInitials = 'RP';

  secBGrid[0].courseCode = 'M23BCS602';
  secBGrid[0].facultyUserId = 'user-ravi';
  secBGrid[0].facultyName = 'Dr. Ravi P';
  secBGrid[0].facultyInitials = 'RP';

  const report = validateCrossSectionClashes([
    { section: 'Section A', schedule: secAGrid },
    { section: 'Section B', schedule: secBGrid },
  ]);

  assert.equal(report.isValid, false);
  assert.equal(report.clashes.length, 1);
  assert.match(report.clashes[0], /Dr\. Ravi P/);
});
