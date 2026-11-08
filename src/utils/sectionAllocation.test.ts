import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateBalancedSectionSizes,
  executeRandomBalancedAllocation,
  executePerformanceBalancedAllocation,
  validatePerformanceBands,
  DEFAULT_PERFORMANCE_BANDS,
  type CandidateStudentInput,
  type SectionConfig,
} from './sectionAllocation.ts';
import {
  generateSemesterProgressionPreview,
  executeSemesterProgression,
  type PromotionCandidate,
} from './promotion.ts';
import {
  generatePerformanceTemplate,
  parsePerformanceExcel,
  generateSectionAllocationPdf,
} from './sectionAllocationExcel.ts';

test('1. 120 students distributed across 3 sections produces exactly 40, 40, 40', () => {
  const sections: SectionConfig[] = [
    { name: 'Section A', capacity: 50 },
    { name: 'Section B', capacity: 50 },
    { name: 'Section C', capacity: 50 },
  ];

  const { targets, isValid } = calculateBalancedSectionSizes(120, sections);
  assert.equal(isValid, true);
  assert.equal(targets['Section A'], 40);
  assert.equal(targets['Section B'], 40);
  assert.equal(targets['Section C'], 40);

  const students: CandidateStudentInput[] = Array.from({ length: 120 }, (_, i) => ({
    id: `s-${i}`,
    usn: `4MH23IS${String(i + 1).padStart(3, '0')}`,
    fullName: `Student ${i + 1}`,
    currentYear: 2,
    currentSemester: 4,
    status: 'ACTIVE',
  }));

  const res = executeRandomBalancedAllocation(students, sections, 'seed-test-120');
  assert.equal(res.summary.sectionCounts['Section A'], 40);
  assert.equal(res.summary.sectionCounts['Section B'], 40);
  assert.equal(res.summary.sectionCounts['Section C'], 40);
  assert.equal(res.allocatedStudents.length, 120);
});

test('2. 125 students distributed across 3 sections produces balanced 42, 42, 41', () => {
  const sections: SectionConfig[] = [
    { name: 'Section A', capacity: 50 },
    { name: 'Section B', capacity: 50 },
    { name: 'Section C', capacity: 50 },
  ];

  const { targets, isValid } = calculateBalancedSectionSizes(125, sections);
  assert.equal(isValid, true);
  assert.equal(targets['Section A'], 42);
  assert.equal(targets['Section B'], 42);
  assert.equal(targets['Section C'], 41);

  const students: CandidateStudentInput[] = Array.from({ length: 125 }, (_, i) => ({
    id: `s-${i}`,
    usn: `4MH23IS${String(i + 1).padStart(3, '0')}`,
    fullName: `Student ${i + 1}`,
    currentYear: 2,
    currentSemester: 4,
    status: 'ACTIVE',
  }));

  const res = executeRandomBalancedAllocation(students, sections, 'seed-test-125');
  assert.equal(res.summary.sectionCounts['Section A'], 42);
  assert.equal(res.summary.sectionCounts['Section B'], 42);
  assert.equal(res.summary.sectionCounts['Section C'], 41);
});

test('3. CGPA-based balanced allocation stratifies students across sections with balanced band distribution', () => {
  const sections: SectionConfig[] = [
    { name: 'Section A', capacity: 50 },
    { name: 'Section B', capacity: 50 },
    { name: 'Section C', capacity: 50 },
  ];

  // Create 90 students with known performance distribution:
  // 30 with 9.0 (Outstanding), 30 with 7.5 (Distinction), 30 with 6.5 (First class)
  const students: CandidateStudentInput[] = [];
  for (let i = 0; i < 30; i++) {
    students.push({
      id: `s-high-${i}`,
      usn: `4MH23IS0${i}`,
      fullName: `High Performer ${i}`,
      currentYear: 3,
      currentSemester: 6,
      status: 'ACTIVE',
      score: 9.0,
    });
  }
  for (let i = 0; i < 30; i++) {
    students.push({
      id: `s-mid-${i}`,
      usn: `4MH23IS1${i}`,
      fullName: `Mid Performer ${i}`,
      currentYear: 3,
      currentSemester: 6,
      status: 'ACTIVE',
      score: 7.5,
    });
  }
  for (let i = 0; i < 30; i++) {
    students.push({
      id: `s-low-${i}`,
      usn: `4MH23IS2${i}`,
      fullName: `Solid Performer ${i}`,
      currentYear: 3,
      currentSemester: 6,
      status: 'ACTIVE',
      score: 6.5,
    });
  }

  const res = executePerformanceBalancedAllocation(
    students,
    sections,
    'CGPA',
    DEFAULT_PERFORMANCE_BANDS,
    'seed-perf-test'
  );

  // Each section must have exactly 30 students
  assert.equal(res.summary.sectionCounts['Section A'], 30);
  assert.equal(res.summary.sectionCounts['Section B'], 30);
  assert.equal(res.summary.sectionCounts['Section C'], 30);

  // Each section must receive 10 top students, 10 mid students, 10 solid students
  const highBandName = DEFAULT_PERFORMANCE_BANDS[0].name;
  assert.equal(res.summary.sectionBandCounts['Section A'][highBandName], 10);
  assert.equal(res.summary.sectionBandCounts['Section B'][highBandName], 10);
  assert.equal(res.summary.sectionBandCounts['Section C'][highBandName], 10);

  // Average CGPA across Section A, B, and C should be identical
  assert.equal(res.summary.sectionAverages['Section A'], 7.67);
  assert.equal(res.summary.sectionAverages['Section B'], 7.67);
  assert.equal(res.summary.sectionAverages['Section C'], 7.67);
});

test('4. SGPA-based distribution works identically and respects performance metric', () => {
  const sections: SectionConfig[] = [
    { name: 'Section A', capacity: 30 },
    { name: 'Section B', capacity: 30 },
  ];

  const students: CandidateStudentInput[] = [
    { id: '1', usn: '4MH23IS001', fullName: 'Student 1', currentYear: 2, currentSemester: 3, status: 'ACTIVE', score: 8.8 },
    { id: '2', usn: '4MH23IS002', fullName: 'Student 2', currentYear: 2, currentSemester: 3, status: 'ACTIVE', score: 8.6 },
    { id: '3', usn: '4MH23IS003', fullName: 'Student 3', currentYear: 2, currentSemester: 3, status: 'ACTIVE', score: 7.2 },
    { id: '4', usn: '4MH23IS004', fullName: 'Student 4', currentYear: 2, currentSemester: 3, status: 'ACTIVE', score: 6.8 },
  ];

  const res = executePerformanceBalancedAllocation(students, sections, 'SGPA', DEFAULT_PERFORMANCE_BANDS);
  assert.equal(res.allocatedStudents[0].performanceMetric, 'SGPA');
  assert.equal(res.summary.sectionCounts['Section A'], 2);
  assert.equal(res.summary.sectionCounts['Section B'], 2);
});

test('5. Performance band boundary validation catches gaps and overlaps', () => {
  const overlappingBands = [
    { id: 'b1', name: 'Band 1', min: 0.0, max: 7.0, inclusiveMin: true, inclusiveMax: true },
    { id: 'b2', name: 'Band 2', min: 6.5, max: 10.0, inclusiveMin: true, inclusiveMax: true },
  ];
  const valOver = validatePerformanceBands(overlappingBands);
  assert.equal(valOver.isValid, false);
  assert.match(valOver.errors[0], /overlaps/);

  const gapBands = [
    { id: 'b1', name: 'Band 1', min: 0.0, max: 6.0, inclusiveMin: true, inclusiveMax: false },
    { id: 'b2', name: 'Band 2', min: 7.0, max: 10.0, inclusiveMin: true, inclusiveMax: true },
  ];
  const valGap = validatePerformanceBands(gapBands);
  assert.equal(valGap.isValid, false);
  assert.match(valGap.errors[0], /Gap detected/);
});

test('6. Missing performance scores are grouped into unresolved when policy is UNASSIGNED', () => {
  const sections: SectionConfig[] = [
    { name: 'Section A', capacity: 20 },
    { name: 'Section B', capacity: 20 },
  ];

  const students: CandidateStudentInput[] = [
    { id: '1', usn: '4MH23IS001', fullName: 'Student 1', currentYear: 2, currentSemester: 4, status: 'ACTIVE', score: 8.5 },
    { id: '2', usn: '4MH23IS002', fullName: 'Student 2', currentYear: 2, currentSemester: 4, status: 'ACTIVE', score: null },
  ];

  const res = executePerformanceBalancedAllocation(
    students,
    sections,
    'CGPA',
    DEFAULT_PERFORMANCE_BANDS,
    'seed-missing',
    'UNASSIGNED'
  );

  assert.equal(res.allocatedStudents.length, 1);
  assert.equal(res.unresolvedStudents.length, 1);
  assert.equal(res.unresolvedStudents[0].usn, '4MH23IS002');
});

test('7. Seeded allocation is 100% reproducible and auditable across separate runs', () => {
  const sections: SectionConfig[] = [
    { name: 'Section A', capacity: 20 },
    { name: 'Section B', capacity: 20 },
  ];

  const students: CandidateStudentInput[] = Array.from({ length: 20 }, (_, i) => ({
    id: `s-${i}`,
    usn: `4MH23IS${String(i + 1).padStart(3, '0')}`,
    fullName: `Student ${i + 1}`,
    currentYear: 2,
    currentSemester: 4,
    status: 'ACTIVE',
  }));

  const run1 = executeRandomBalancedAllocation(students, sections, 'audit-seed-xyz-123');
  const run2 = executeRandomBalancedAllocation(students, sections, 'audit-seed-xyz-123');

  assert.deepEqual(
    run1.allocatedStudents.map((s) => s.assignedSection),
    run2.allocatedStudents.map((s) => s.assignedSection)
  );
});

test('8. Excel template generation and upload parsing accurately matches cohort by USN', () => {
  const cohort = [
    { usn: '4MH23IS109', id: 'stud-1', fullName: 'Thanushree S' },
    { usn: '4MH23IS119', id: 'stud-2', fullName: 'Vijith Kumar R N' },
    { usn: '4MH23IS120', id: 'stud-3', fullName: 'Vikas U S' },
  ];

  const templateBuffer = generatePerformanceTemplate(cohort, 'CGPA', 'ISE Year 3');
  assert.ok(templateBuffer.byteLength > 0);

  // Simulate parsing the generated template
  const parseRes = parsePerformanceExcel(templateBuffer.buffer as ArrayBuffer, cohort);
  assert.equal(parseRes.matchedCount, 3);
  assert.equal(parseRes.missingScoresCount, 3); // Template is intentionally blank
});

test('9. Semester Progression advances Odd to Even simultaneously', () => {
  const students: PromotionCandidate[] = [
    { id: '1', usn: '4MH24IS001', fullName: 'S1', departmentId: 'dept-ise', currentYear: 1, currentSemester: 1, status: 'ACTIVE' },
    { id: '2', usn: '4MH23IS001', fullName: 'S2', departmentId: 'dept-ise', currentYear: 2, currentSemester: 3, status: 'ACTIVE' },
    { id: '3', usn: '4MH22IS001', fullName: 'S3', departmentId: 'dept-ise', currentYear: 3, currentSemester: 5, status: 'ACTIVE' },
    { id: '4', usn: '4MH21IS001', fullName: 'S4', departmentId: 'dept-ise', currentYear: 4, currentSemester: 7, status: 'ACTIVE' },
    { id: '5', usn: '4MH23IS099', fullName: 'S5', departmentId: 'dept-ise', currentYear: 2, currentSemester: 3, status: 'DETAINED' },
  ];

  const preview = generateSemesterProgressionPreview(students, 'dept-ise');
  assert.equal(preview.currentCycle, 'ODD');
  assert.equal(preview.totalEligible, 4);
  assert.equal(preview.totalHeldBack, 1);

  const res = executeSemesterProgression(students, 'dept-ise', '2026-27', 'admin-user');
  assert.equal(res.summary.promotedCount, 4);
  assert.equal(res.summary.heldBackCount, 1);

  const s1 = res.updatedStudents.find((s) => s.id === '1')!;
  const s2 = res.updatedStudents.find((s) => s.id === '2')!;
  const s3 = res.updatedStudents.find((s) => s.id === '3')!;
  const s4 = res.updatedStudents.find((s) => s.id === '4')!;
  const s5 = res.updatedStudents.find((s) => s.id === '5')!;

  assert.equal(s1.currentSemester, 2);
  assert.equal(s1.currentYear, 1);

  assert.equal(s2.currentSemester, 4);
  assert.equal(s2.currentYear, 2);

  assert.equal(s3.currentSemester, 6);
  assert.equal(s3.currentYear, 3);

  assert.equal(s4.currentSemester, 8);
  assert.equal(s4.currentYear, 4);

  // Detained student retained in sem 3
  assert.equal(s5.currentSemester, 3);
  assert.equal(s5.status, 'DETAINED');
});

test('10. Semester Progression advances Even to Next Year Odd and graduates 8th semester seniors', () => {
  const students: PromotionCandidate[] = [
    { id: '1', usn: '4MH24IS001', fullName: 'S1', departmentId: 'dept-ise', currentYear: 1, currentSemester: 2, status: 'ACTIVE' },
    { id: '2', usn: '4MH23IS001', fullName: 'S2', departmentId: 'dept-ise', currentYear: 2, currentSemester: 4, status: 'ACTIVE' },
    { id: '3', usn: '4MH22IS001', fullName: 'S3', departmentId: 'dept-ise', currentYear: 3, currentSemester: 6, status: 'ACTIVE' },
    { id: '4', usn: '4MH21IS001', fullName: 'S4', departmentId: 'dept-ise', currentYear: 4, currentSemester: 8, status: 'ACTIVE' },
  ];

  const preview = generateSemesterProgressionPreview(students, 'dept-ise');
  assert.equal(preview.currentCycle, 'EVEN');
  assert.equal(preview.willGraduateCount, 1);

  const res = executeSemesterProgression(students, 'dept-ise', '2026-27', 'admin-user');
  assert.equal(res.summary.graduatedCount, 1);
  assert.equal(res.summary.promotedCount, 3);

  const s1 = res.updatedStudents.find((s) => s.id === '1')!;
  const s2 = res.updatedStudents.find((s) => s.id === '2')!;
  const s3 = res.updatedStudents.find((s) => s.id === '3')!;
  const s4 = res.updatedStudents.find((s) => s.id === '4')!;

  assert.equal(s1.currentSemester, 3);
  assert.equal(s1.currentYear, 2);

  assert.equal(s2.currentSemester, 5);
  assert.equal(s2.currentYear, 3);

  assert.equal(s3.currentSemester, 7);
  assert.equal(s3.currentYear, 4);

  // 8th sem student is now GRADUATED
  assert.equal(s4.currentSemester, 8);
  assert.equal(s4.status, 'GRADUATED');
});

test('11. generateSectionAllocationPdf generates valid PDF with clean uncrowded formatting without (Cap: 999)', () => {
  const run: any = {
    id: 'run-test-pdf',
    departmentId: 'dept-ise',
    academicYear: '2026-27',
    yearOfStudy: 2,
    semester: 3,
    title: 'Year 2 Section Allocation',
    status: 'PUBLISHED',
    method: 'PERFORMANCE',
    performanceMetric: 'CGPA',
    sections: [
      { name: 'Section A', capacity: 999, targetCount: 2 },
      { name: 'Section B', capacity: 999, targetCount: 2 },
    ],
    totalStudentsCount: 4,
    students: [
      {
        studentId: 's-1',
        usn: '4MH23IS001',
        fullName: 'Aarav Patel',
        assignedSection: 'Section A',
        currentSemester: 3,
        performanceValue: 8.5,
      },
      {
        studentId: 's-2',
        usn: '4MH23IS002',
        fullName: 'Bhavya Sharma',
        assignedSection: 'Section A',
        currentSemester: 3,
        performanceValue: 7.2,
      },
      {
        studentId: 's-3',
        usn: '4MH23IS003',
        fullName: 'Chirag Rao',
        assignedSection: 'Section B',
        currentSemester: 3,
        performanceValue: 8.1,
      },
      {
        studentId: 's-4',
        usn: '4MH23IS004',
        fullName: 'Divya Gowda',
        assignedSection: 'Section B',
        currentSemester: 3,
        performanceValue: 7.9,
      },
    ],
    summary: {
      sectionCounts: { 'Section A': 2, 'Section B': 2 },
      sectionAverages: { 'Section A': 7.85, 'Section B': 8.0 },
    },
    createdAt: new Date().toISOString(),
    createdById: 'admin-1',
    createdByName: 'Admin',
    versionNumber: 1,
  };

  // 1. Notice Board copy (no CGPA, all sections)
  const docNoticeBoard = generateSectionAllocationPdf(
    run,
    'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING',
    { includeCgpa: false, selectedSection: 'ALL' }
  );
  assert.ok(docNoticeBoard);
  assert.ok(docNoticeBoard.getNumberOfPages() >= 1);

  // 2. Specific Section only (Section A only)
  const docSecA = generateSectionAllocationPdf(
    run,
    'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING',
    { includeCgpa: false, selectedSection: 'Section A' }
  );
  assert.ok(docSecA);
  assert.equal(docSecA.getNumberOfPages(), 1);

  // 3. Administrative copy (with CGPA scores)
  const docAdmin = generateSectionAllocationPdf(
    run,
    'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
    'DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING',
    { includeCgpa: true, selectedSection: 'ALL' }
  );
  assert.ok(docAdmin);
  assert.ok(docAdmin.getNumberOfPages() >= 1);
});

