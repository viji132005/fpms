import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateVtuCohortStudents,
  detectUsnCollisions,
  sanitizeUsnPrefix,
} from './cohortGenerator.ts';

test('sanitizeUsnPrefix strips invalid chars and uppercases', () => {
  assert.equal(sanitizeUsnPrefix(' 4mh-24is '), '4MH24IS');
  assert.equal(sanitizeUsnPrefix('4mh23cs'), '4MH23CS');
});

test('generateVtuCohortStudents generates 60 sequential VTU USNs with padded indices', () => {
  const students = generateVtuCohortStudents({
    usnPrefix: '4MH24IS',
    startNumber: 1,
    endNumber: 60,
    departmentId: 'dept-ise',
    currentYear: 2,
    admissionCohort: '2024-2028',
    namePrefix: 'ISE Batch Student',
    defaultEmailDomain: 'mitmysore.in',
  });

  assert.equal(students.length, 60);
  assert.equal(students[0].usn, '4MH24IS001');
  assert.equal(students[0].fullName, 'ISE Batch Student 001');
  assert.equal(students[0].email, '4mh24is001@mitmysore.in');
  assert.equal(students[0].departmentId, 'dept-ise');
  assert.equal(students[0].currentYear, 2);

  assert.equal(students[59].usn, '4MH24IS060');
  assert.equal(students[59].fullName, 'ISE Batch Student 060');
  assert.equal(students[59].email, '4mh24is060@mitmysore.in');
});

test('generateVtuCohortStudents rejects invalid ranges and large batches', () => {
  assert.throws(
    () =>
      generateVtuCohortStudents({
        usnPrefix: '4MH24IS',
        startNumber: 50,
        endNumber: 10,
        departmentId: 'dept-ise',
        currentYear: 1,
        admissionCohort: '2024-2028',
      }),
    /Start number cannot be greater than end number/
  );

  assert.throws(
    () =>
      generateVtuCohortStudents({
        usnPrefix: '4MH24IS',
        startNumber: 1,
        endNumber: 400,
        departmentId: 'dept-ise',
        currentYear: 1,
        admissionCohort: '2024-2028',
      }),
    /Maximum batch size is 300 students/
  );
});

test('detectUsnCollisions accurately detects existing duplicate USNs', () => {
  const existing = ['4MH24IS001', '4MH24IS002', '4MH24IS003'];
  const candidates = ['4MH24IS002', '4MH24IS004', '4mh24is001'];

  const collisions = detectUsnCollisions(existing, candidates);
  assert.equal(collisions.length, 2);
  assert.ok(collisions.includes('4MH24IS002'));
  assert.ok(collisions.includes('4mh24is001'));
});
