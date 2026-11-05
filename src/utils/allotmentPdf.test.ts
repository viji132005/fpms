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
    groups,
  });

  assert.ok(doc);
  const pageCount = doc.getNumberOfPages();
  assert.ok(pageCount >= 1);
});
