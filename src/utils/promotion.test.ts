import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePromotionPlan,
  executePromotion,
  checkPromotionCollision,
  executeCascadeAnnualPromotion,
  type PromotionCandidate,
} from './promotion.ts';

test('promotion plan correctly segregates eligible students from detained and withdrawn students', () => {
  const students: PromotionCandidate[] = [
    {
      id: 's1',
      usn: '4MH23IS001',
      fullName: 'Ananya Sharma',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'ACTIVE',
    },
    {
      id: 's2',
      usn: '4MH23IS002',
      fullName: 'Rahul Verma',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'DETAINED',
    },
    {
      id: 's3',
      usn: '4MH23IS003',
      fullName: 'Pooja Hegde',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'WITHDRAWN',
    },
    {
      id: 's4',
      usn: '4MH23IS004',
      fullName: 'Kiran Gowda',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'ACTIVE',
    },
  ];

  const plan = generatePromotionPlan(students, 'dept-ise', 2);
  assert.equal(plan.eligibleForPromotion.length, 2);
  assert.equal(plan.excludedStudents.length, 2);
  assert.equal(plan.newYearTarget, 3);
});

test('promotion execution promotes active students to next year and generates immutable history records', () => {
  const students: PromotionCandidate[] = [
    {
      id: 's1',
      usn: '4MH23IS001',
      fullName: 'Ananya Sharma',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'ACTIVE',
    },
    {
      id: 's2',
      usn: '4MH23IS002',
      fullName: 'Rahul Verma',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'DETAINED',
    },
  ];

  const { updatedStudents, historyRecords } = executePromotion(
    students,
    'dept-ise',
    2,
    '2026-27',
    'admin-1'
  );

  const promoted = updatedStudents.find((s) => s.id === 's1')!;
  const detained = updatedStudents.find((s) => s.id === 's2')!;

  assert.equal(promoted.currentYear, 3);
  assert.equal(detained.currentYear, 2);

  assert.equal(historyRecords.length, 2);
  const s1Hist = historyRecords.find((h) => h.studentId === 's1')!;
  assert.equal(s1Hist.status, 'PROMOTED');
  assert.equal(s1Hist.fromYear, 2);
  assert.equal(s1Hist.toYear, 3);
});

test('promotion of 4th year students transitions active students to GRADUATED', () => {
  const students: PromotionCandidate[] = [
    {
      id: 's1',
      usn: '4MH21IS001',
      fullName: 'Senior Student',
      departmentId: 'dept-ise',
      currentYear: 4,
      status: 'ACTIVE',
    },
  ];

  const { updatedStudents, historyRecords } = executePromotion(
    students,
    'dept-ise',
    4,
    '2026-27',
    'admin-1'
  );

  assert.equal(updatedStudents[0].status, 'GRADUATED');
  assert.equal(historyRecords[0].status, 'GRADUATED');
});

test('checkPromotionCollision prevents promoting juniors when senior cohort is not yet vacated', () => {
  const students: PromotionCandidate[] = [
    {
      id: 's1',
      usn: '4MH23IS001',
      fullName: 'Year 2 Student',
      departmentId: 'dept-ise',
      currentYear: 2,
      status: 'ACTIVE',
    },
    {
      id: 's2',
      usn: '4MH22IS001',
      fullName: 'Year 3 Student',
      departmentId: 'dept-ise',
      currentYear: 3,
      status: 'ACTIVE',
    },
  ];

  // Trying to promote year 2 while year 3 still has active students
  const res = checkPromotionCollision(students, 'dept-ise', 2);
  assert.equal(res.canPromote, false);
  assert.match(res.reason!, /Cannot promote Year 2/);

  // Trying to promote year 3 while year 4 has 0 active students
  const res3 = checkPromotionCollision(students, 'dept-ise', 3);
  assert.equal(res3.canPromote, true);

  // Year 4 can always graduate
  const res4 = checkPromotionCollision(students, 'dept-ise', 4);
  assert.equal(res4.canPromote, true);
});

test('executeCascadeAnnualPromotion performs reverse cascade leaving Year 1 empty and advancing cohorts', () => {
  const students: PromotionCandidate[] = [
    { id: 'y1', usn: '4MH24IS001', fullName: '1st Year Student', departmentId: 'dept-ise', currentYear: 1, status: 'ACTIVE' },
    { id: 'y2', usn: '4MH23IS001', fullName: '2nd Year Student', departmentId: 'dept-ise', currentYear: 2, status: 'ACTIVE' },
    { id: 'y3', usn: '4MH22IS001', fullName: '3rd Year Student', departmentId: 'dept-ise', currentYear: 3, status: 'ACTIVE' },
    { id: 'y4', usn: '4MH21IS001', fullName: '4th Year Student', departmentId: 'dept-ise', currentYear: 4, status: 'ACTIVE' },
    { id: 'det', usn: '4MH23IS099', fullName: 'Detained Student', departmentId: 'dept-ise', currentYear: 2, status: 'DETAINED' },
  ];

  const { updatedStudents, summary } = executeCascadeAnnualPromotion(
    students,
    'dept-ise',
    '2026-27',
    'admin-tester'
  );

  assert.equal(summary.year4Graduated, 1);
  assert.equal(summary.year3To4Promoted, 1);
  assert.equal(summary.year2To3Promoted, 1);
  assert.equal(summary.year1To2Promoted, 1);
  assert.equal(summary.totalHeldBack, 1);

  // Check new year states
  const sY1 = updatedStudents.find((s) => s.id === 'y1')!;
  const sY2 = updatedStudents.find((s) => s.id === 'y2')!;
  const sY3 = updatedStudents.find((s) => s.id === 'y3')!;
  const sY4 = updatedStudents.find((s) => s.id === 'y4')!;
  const sDet = updatedStudents.find((s) => s.id === 'det')!;

  assert.equal(sY1.currentYear, 2);
  assert.equal(sY2.currentYear, 3);
  assert.equal(sY3.currentYear, 4);
  assert.equal(sY4.status, 'GRADUATED');
  assert.equal(sDet.currentYear, 2);
  assert.equal(sDet.status, 'DETAINED');

  // Verify that Year 1 has 0 active students now (vacated for new intake)
  const activeYear1 = updatedStudents.filter((s) => s.currentYear === 1 && s.status === 'ACTIVE');
  assert.equal(activeYear1.length, 0);
});
