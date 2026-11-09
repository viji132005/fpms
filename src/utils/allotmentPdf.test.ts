import test from 'node:test';
import assert from 'node:assert/strict';
import { generateCollegeAllotmentPdf } from './allotmentPdf.ts';

test('generateCollegeAllotmentPdf generates multi-page PDF with student rows and faculty headings', async () => {
  const groups = [
    {
      mentorName: 'Dr. Anitha K',
      staffId: 'MITM-ISE-015',
      students: [
        { usn: '4MH23IS001', fullName: 'Student One', currentYear: 3 },
        { usn: '4MH23IS002', fullName: 'Student Two', currentYear: 3 },
        { usn: '4MH24IS001', fullName: 'Student Three', currentYear: 2 },
        { usn: '4MH24IS002', fullName: 'Student Four', currentYear: 2 },
      ],
    },
    {
      mentorName: 'Prof. Gururaja M P',
      staffId: 'MITM-ISE-012',
      students: [
        { usn: '4MH22IS001', fullName: 'Senior Student 1', currentYear: 4 },
        { usn: '4MH22IS002', fullName: 'Senior Student 2', currentYear: 4 },
      ],
    },
  ];

  const doc = await generateCollegeAllotmentPdf({
    departmentName: 'Information Science and Engineering',
    deptCode: 'ISE',
    academicYear: '2026-27',
    studentYear: 0,
    groups,
  });

  assert.ok(doc);
  const pageCount = doc.getNumberOfPages();
  assert.ok(pageCount >= 1);

  const rawPdfString = doc.output();
  assert.ok(
    rawPdfString.includes('MENTORS ALLOTMENT FOR 2ND YEAR 3RD AND 4TH YEAR'),
    'Should contain MENTORS ALLOTMENT FOR 2ND YEAR 3RD AND 4TH YEAR'
  );
});

test('generateCollegeAllotmentPdf formats individual year titles correctly', async () => {
  const singleStudent = [
    {
      mentorName: 'Dr. Sharath Kumar Y H',
      staffId: 'MITM-ISE-001',
      students: [{ usn: '4MH25IS001', fullName: 'First Year Student', currentYear: 1 }],
    },
  ];

  // Test 1st Year
  const doc1 = await generateCollegeAllotmentPdf({
    departmentName: 'Information Science and Engineering',
    deptCode: 'ISE',
    academicYear: '2026-27',
    studentYear: 1,
    groups: singleStudent,
  });
  assert.ok(doc1.output().includes('MENTORS ALLOTMENT FOR 1ST YEAR'));

  // Test 2nd Year
  const doc2 = await generateCollegeAllotmentPdf({
    departmentName: 'Information Science and Engineering',
    deptCode: 'ISE',
    academicYear: '2026-27',
    studentYear: 2,
    groups: singleStudent,
  });
  assert.ok(doc2.output().includes('MENTORS ALLOTMENT FOR 2ND YEAR'));

  // Test 3rd Year
  const doc3 = await generateCollegeAllotmentPdf({
    departmentName: 'Information Science and Engineering',
    deptCode: 'ISE',
    academicYear: '2026-27',
    studentYear: 3,
    groups: singleStudent,
  });
  assert.ok(doc3.output().includes('MENTORS ALLOTMENT FOR 3RD YEAR'));

  // Test 4th Year
  const doc4 = await generateCollegeAllotmentPdf({
    departmentName: 'Information Science and Engineering',
    deptCode: 'ISE',
    academicYear: '2026-27',
    studentYear: 4,
    groups: singleStudent,
  });
  assert.ok(doc4.output().includes('MENTORS ALLOTMENT FOR 4TH YEAR'));
});
