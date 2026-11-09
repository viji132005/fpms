import { test } from 'node:test';
import assert from 'node:assert';
import {
  formatStudentExcelData,
  generateStudentRosterPdf,
  generateAttendanceFormPdf,
} from './studentExportPdf.ts';
import { Student } from '../types/index.ts';

const mockStudents: Student[] = [
  {
    id: 's-1',
    usn: '4MH22IS001',
    fullName: 'Aarav Sharma',
    departmentId: 'dept-ise',
    admissionCohort: '2022',
    currentYear: 2,
    currentSemester: 3,
    section: 'Section A',
    email: '4mh22is001@mitmysore.in',
    phone: '9845011111',
    parentPhone: '9845022222',
    status: 'ACTIVE',
  },
  {
    id: 's-2',
    usn: '4MH22IS002',
    fullName: 'Bhavana Patel',
    departmentId: 'dept-ise',
    admissionCohort: '2022',
    currentYear: 2,
    currentSemester: 3,
    section: 'Section B',
    email: '4mh22is002@mitmysore.in',
    phone: '9845033333',
    parentPhone: '9845044444',
    status: 'ACTIVE',
  },
  {
    id: 's-3',
    usn: '4MH20IS045',
    fullName: 'Chetan Kumar',
    departmentId: 'dept-ise',
    admissionCohort: '2020',
    currentYear: 4,
    currentSemester: 8,
    section: 'Section A',
    email: '4mh20is045@mitmysore.in',
    phone: '9845055555',
    parentPhone: '9845066666',
    status: 'GRADUATED',
  },
];

test('formatStudentExcelData strictly excludes Status column', () => {
  const excelRows = formatStudentExcelData(mockStudents);

  assert.strictEqual(excelRows.length, 3);

  // Check each row: MUST NOT have Status or status key
  excelRows.forEach((row, idx) => {
    assert.strictEqual('Status' in row, false, `Row ${idx} should not have Status`);
    assert.strictEqual('status' in row, false, `Row ${idx} should not have status`);

    // Must have remaining student information
    assert.ok(row['Sl. No.']);
    assert.ok(row['USN']);
    assert.ok(row['Full Name']);
    assert.ok(row['Academic Year']);
    assert.ok(row['Current Semester']);
    assert.ok(row['Section']);
    assert.ok(row['Email']);
    assert.ok(row['Student Phone']);
    assert.ok(row['Parent Phone']);
  });

  assert.strictEqual(excelRows[0]['USN'], '4MH22IS001');
  assert.strictEqual(excelRows[0]['Full Name'], 'Aarav Sharma');
  assert.strictEqual(excelRows[2]['Academic Year'], 'Graduated Alumni');
});

test('generateStudentRosterPdf produces valid A4 Portrait college circular layout', () => {
  const doc = generateStudentRosterPdf(mockStudents, {
    cohortYearLabel: '2nd Year B.E. (Sophomore)',
    cohortSemesterLabel: 'III & IV Semester',
    cohortLabel: '2nd Year B.E. Students',
    deptCode: 'ISE',
    departmentName: 'Department of Information Science and Engineering',
    academicYear: '2026-27',
  });

  assert.ok(doc, 'PDF instance should be created');
  assert.strictEqual(doc.getNumberOfPages() >= 1, true);

  // Verify page dimensions: standard portrait A4 is 210mm x 297mm
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  assert.strictEqual(Math.round(width), 210);
  assert.strictEqual(Math.round(height), 297);

  // Verify PDF output as Uint8Array
  const output = doc.output('arraybuffer');
  assert.ok(output.byteLength > 1000, 'PDF should have non-trivial size');

  const rawPdfString = doc.output();
  // Ref No, Sub: line, and 'Registered' in total candidates must be strictly absent
  assert.strictEqual(rawPdfString.includes('Ref No:'), false, 'Should not contain Ref No:');
  assert.strictEqual(rawPdfString.includes('Sub: Official Student Enrolment Roll List'), false, 'Should not contain Sub: line');
  assert.strictEqual(rawPdfString.includes('Registered'), false, 'Should not contain Registered in candidate count');
});

test('generateAttendanceFormPdf produces valid 4-column A4 Portrait event attendance form', () => {
  const doc = generateAttendanceFormPdf(mockStudents, {
    institutionName: 'Maharaja Institute of Technology Mysore',
    departmentName: 'Department of Information Science and Engineering',
    deptCode: 'ISE',
    yearLabel: '2nd Year',
    semLabel: 'Sem 3',
    eventName: 'Cloud Computing Technical Workshop',
  });

  assert.ok(doc, 'PDF instance should be created');
  assert.strictEqual(doc.getNumberOfPages() >= 1, true);

  // Verify A4 Portrait dimensions: 210mm x 297mm
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  assert.strictEqual(Math.round(width), 210);
  assert.strictEqual(Math.round(height), 297);

  const rawPdfString = doc.output();

  // Header must contain College Name, Department, Year, Sem, and Event
  assert.ok(rawPdfString.includes('MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE'));
  assert.ok(rawPdfString.includes('DEPARTMENT OF INFORMATION SCIENCE AND ENGINEERING'));
  assert.ok(rawPdfString.includes('STUDENT EVENT ATTENDANCE SHEET'));
  assert.ok(rawPdfString.includes('Year:'));
  assert.ok(rawPdfString.includes('Sem:'));
  assert.ok(rawPdfString.includes('Sem 3'));
  assert.strictEqual(rawPdfString.includes('Sem 3 & 4'), false, 'Should show current active semester, not both');
  assert.ok(rawPdfString.includes('Cloud Computing Technical Workshop'));

  // Table must contain 4 specific columns and student entries
  assert.ok(rawPdfString.includes('Sl. No.'));
  assert.ok(rawPdfString.includes('University Seat Number') || rawPdfString.includes('USN'));
  assert.ok(rawPdfString.includes('Student Name'));
  assert.ok(rawPdfString.includes('Student Signature'));

  // Must include students' USNs and names
  assert.ok(rawPdfString.includes('4MH22IS001'));
  assert.ok(rawPdfString.includes('Aarav Sharma'));
  assert.ok(rawPdfString.includes('4MH22IS002'));
  assert.ok(rawPdfString.includes('Bhavana Patel'));

  // Must strictly omit Ref No, Sub: line, and Status
  assert.strictEqual(rawPdfString.includes('Ref No:'), false);
  assert.strictEqual(rawPdfString.includes('Sub: Official Student Enrolment Roll List'), false);
  assert.strictEqual(rawPdfString.includes('Status'), false);
});

test('generateAttendanceFormPdf handles empty student list without throwing', () => {
  const doc = generateAttendanceFormPdf([], {
    yearLabel: '1st Year',
    semLabel: 'Sem 1 & 2',
  });

  assert.ok(doc);
  assert.strictEqual(doc.getNumberOfPages(), 1);
  const output = doc.output('arraybuffer');
  assert.ok(output.byteLength > 500);

  const rawPdfString = doc.output();
  assert.ok(rawPdfString.includes('Sem 1'));
  assert.strictEqual(rawPdfString.includes('Sem 1 & 2'), false, 'Composite semester must be simplified to single current semester');
});
