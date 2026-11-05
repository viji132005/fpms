import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBalancedMentorAllocation,
  calculateCombinedMultiYearAllocation,
  isAllocationBalanced,
  type StudentRecord,
  type MentorFacultyRecord,
} from './allocation.ts';

test('balanced mentor allocation distributes 120 students across 8 mentors equally (15 each)', () => {
  const students: StudentRecord[] = Array.from({ length: 120 }, (_, i) => ({
    id: `stud-${i}`,
    usn: `4MH23IS${String(i + 1).padStart(3, '0')}`,
    fullName: `Student ${i + 1}`,
    departmentId: 'dept-ise',
    currentYear: 2,
    status: 'ACTIVE',
  }));

  const mentors: MentorFacultyRecord[] = Array.from({ length: 8 }, (_, i) => ({
    id: `fac-${i}`,
    staffId: `ISE${String(i + 1).padStart(3, '0')}`,
    fullName: `Prof Faculty ${i + 1}`,
    departmentId: 'dept-ise',
    isMentorEligible: true,
    status: 'ACTIVE',
  }));

  const result = calculateBalancedMentorAllocation(
    students,
    mentors,
    'dept-ise',
    '2026-27',
    2
  );

  assert.equal(result.totalStudentsAllocated, 120);
  assert.equal(result.groups.length, 8);
  for (const group of result.groups) {
    assert.equal(group.students.length, 15);
  }
  assert.equal(isAllocationBalanced(result.groups), true);
});

test('balanced mentor allocation distributes 122 students across 8 mentors with Δ <= 1 (15 or 16 each)', () => {
  const students: StudentRecord[] = Array.from({ length: 122 }, (_, i) => ({
    id: `stud-${i}`,
    usn: `4MH23IS${String(i + 1).padStart(3, '0')}`,
    fullName: `Student ${i + 1}`,
    departmentId: 'dept-ise',
    currentYear: 2,
    status: 'ACTIVE',
  }));

  const mentors: MentorFacultyRecord[] = Array.from({ length: 8 }, (_, i) => ({
    id: `fac-${i}`,
    staffId: `ISE${String(i + 1).padStart(3, '0')}`,
    fullName: `Prof Faculty ${i + 1}`,
    departmentId: 'dept-ise',
    isMentorEligible: true,
    status: 'ACTIVE',
  }));

  const result = calculateBalancedMentorAllocation(
    students,
    mentors,
    'dept-ise',
    '2026-27',
    2
  );

  assert.equal(result.totalStudentsAllocated, 122);
  const counts = result.groups.map((g) => g.students.length);
  // 122 % 8 = 2. First 2 should have 16, remaining 6 should have 15.
  assert.deepEqual(counts, [16, 16, 15, 15, 15, 15, 15, 15]);
  assert.equal(isAllocationBalanced(result.groups), true);
});

test('excludes inactive or ineligible mentors and detained students', () => {
  const students: StudentRecord[] = [
    {
      id: 's1',
      usn: '4MH23IS001',
      fullName: 'Active 1',
      departmentId: 'dept-ise',
      currentYear: 3,
      status: 'ACTIVE',
    },
    {
      id: 's2',
      usn: '4MH23IS002',
      fullName: 'Detained 2',
      departmentId: 'dept-ise',
      currentYear: 3,
      status: 'DETAINED',
    },
    {
      id: 's3',
      usn: '4MH23IS003',
      fullName: 'Active 3',
      departmentId: 'dept-ise',
      currentYear: 3,
      status: 'ACTIVE',
    },
  ];

  const mentors: MentorFacultyRecord[] = [
    {
      id: 'm1',
      staffId: 'ISE01',
      fullName: 'Mentor Eligible',
      departmentId: 'dept-ise',
      isMentorEligible: true,
      status: 'ACTIVE',
    },
    {
      id: 'm2',
      staffId: 'ISE02',
      fullName: 'Ineligible Faculty',
      departmentId: 'dept-ise',
      isMentorEligible: false,
      status: 'ACTIVE',
    },
  ];

  const result = calculateBalancedMentorAllocation(
    students,
    mentors,
    'dept-ise',
    '2026-27',
    3
  );

  assert.equal(result.totalStudentsAllocated, 2);
  assert.equal(result.groups.length, 1);
  assert.equal(result.groups[0].students.length, 2);
  assert.equal(result.groups[0].students[0].usn, '4MH23IS001');
  assert.equal(result.groups[0].students[1].usn, '4MH23IS003');
});

test('calculateCombinedMultiYearAllocation distributes 2nd, 3rd, and 4th year cohorts evenly', () => {
  const students: StudentRecord[] = [
    // 4 students from 2nd year
    { id: 's2-1', usn: '4MH25IS001', fullName: '2nd Year 1', departmentId: 'dept-ise', currentYear: 2, status: 'ACTIVE' },
    { id: 's2-2', usn: '4MH25IS002', fullName: '2nd Year 2', departmentId: 'dept-ise', currentYear: 2, status: 'ACTIVE' },
    { id: 's2-3', usn: '4MH25IS003', fullName: '2nd Year 3', departmentId: 'dept-ise', currentYear: 2, status: 'ACTIVE' },
    { id: 's2-4', usn: '4MH25IS004', fullName: '2nd Year 4', departmentId: 'dept-ise', currentYear: 2, status: 'ACTIVE' },
    // 4 students from 3rd year
    { id: 's3-1', usn: '4MH24IS001', fullName: '3rd Year 1', departmentId: 'dept-ise', currentYear: 3, status: 'ACTIVE' },
    { id: 's3-2', usn: '4MH24IS002', fullName: '3rd Year 2', departmentId: 'dept-ise', currentYear: 3, status: 'ACTIVE' },
    { id: 's3-3', usn: '4MH24IS003', fullName: '3rd Year 3', departmentId: 'dept-ise', currentYear: 3, status: 'ACTIVE' },
    { id: 's3-4', usn: '4MH24IS004', fullName: '3rd Year 4', departmentId: 'dept-ise', currentYear: 3, status: 'ACTIVE' },
    // 4 students from 4th year
    { id: 's4-1', usn: '4MH23IS001', fullName: '4th Year 1', departmentId: 'dept-ise', currentYear: 4, status: 'ACTIVE' },
    { id: 's4-2', usn: '4MH23IS002', fullName: '4th Year 2', departmentId: 'dept-ise', currentYear: 4, status: 'ACTIVE' },
    { id: 's4-3', usn: '4MH23IS003', fullName: '4th Year 3', departmentId: 'dept-ise', currentYear: 4, status: 'ACTIVE' },
    { id: 's4-4', usn: '4MH23IS004', fullName: '4th Year 4', departmentId: 'dept-ise', currentYear: 4, status: 'ACTIVE' },
  ];

  const mentors: MentorFacultyRecord[] = [
    { id: 'm1', staffId: 'ISE01', fullName: 'Mentor One', departmentId: 'dept-ise', isMentorEligible: true, status: 'ACTIVE' },
    { id: 'm2', staffId: 'ISE02', fullName: 'Mentor Two', departmentId: 'dept-ise', isMentorEligible: true, status: 'ACTIVE' },
  ];

  const result = calculateCombinedMultiYearAllocation(students, mentors, 'dept-ise', '2026-27');
  assert.equal(result.totalStudentsAllocated, 12);
  assert.equal(result.groups.length, 2);
  assert.equal(result.groups[0].students.length, 6);
  assert.equal(result.groups[1].students.length, 6);
});
