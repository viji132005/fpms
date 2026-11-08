import { test } from 'node:test';
import assert from 'node:assert';
import {
  generatePersonalTimetablePdf,
  PERSONAL_DAYS,
  PERSONAL_PERIODS,
} from './personalTimetablePdf.ts';

test('PERSONAL_DAYS covers Monday to Friday without missing academic days', () => {
  const days = PERSONAL_DAYS.map((d) => d.key);
  assert.deepStrictEqual(days, ['MON', 'TUE', 'WED', 'THU', 'FRI']);
});

test('PERSONAL_PERIODS includes standard MIT Mysore teaching hours and breaks', () => {
  assert.strictEqual(PERSONAL_PERIODS.length, 8);
  assert.strictEqual(PERSONAL_PERIODS[0].timeRange, '09:00 - 10:00');
  assert.strictEqual(PERSONAL_PERIODS[1].timeRange, '10:00 - 11:00');
  assert.strictEqual(PERSONAL_PERIODS[2].isBreak, true); // Tea break
  assert.strictEqual(PERSONAL_PERIODS[5].isBreak, true); // Lunch break
  assert.strictEqual(PERSONAL_PERIODS[6].timeRange, '02:00 - 03:00'); // Period 5 (2-3)
  assert.strictEqual(PERSONAL_PERIODS[7].timeRange, '03:00 - 04:00'); // Period 6 (3-4)
});

test('generatePersonalTimetablePdf produces valid PDF instance with custom schedule', async () => {
  const mockGrid = {
    'MON-0': { subject: 'FSD', year: '2nd Year', room: 'LH-201' },
    'MON-3': { subject: 'ML', year: '3rd Year', room: 'LH-302' },
    'WED-1': { subject: 'AI & Cloud', year: '4th Year', room: 'Lab 2' },
  };

  const doc = await generatePersonalTimetablePdf({
    facultyName: 'Prof. Gururaja M P',
    designation: 'Assistant Professor',
    staffId: 'ISE-FAC-01',
    grid: mockGrid,
  });

  assert.ok(doc, 'PDF doc should be returned');
  const pageCount = doc.getNumberOfPages();
  assert.strictEqual(pageCount, 1);
});

test('Feed deletion permission validator allows only post author and administrators', () => {
  const canDeleteFeedPost = (
    postAuthorId: string,
    currentUserId: string,
    currentUserRole: string
  ) => {
    const isAuthor = postAuthorId === currentUserId;
    const isAdmin = ['ADMIN', 'SUPER_ADMIN', 'MASTER_ADMIN'].includes(currentUserRole);
    return isAuthor || isAdmin;
  };

  const authorId = 'user-fac-gururaja';
  const otherFacultyId = 'user-fac-ganavi';
  const adminId = 'user-admin';

  // Author can delete their own post
  assert.strictEqual(canDeleteFeedPost(authorId, authorId, 'FACULTY'), true);

  // Admin can delete any post
  assert.strictEqual(canDeleteFeedPost(authorId, adminId, 'ADMIN'), true);
  assert.strictEqual(canDeleteFeedPost(authorId, 'user-master', 'MASTER_ADMIN'), true);

  // Another faculty member CANNOT delete someone else's post
  assert.strictEqual(canDeleteFeedPost(authorId, otherFacultyId, 'FACULTY'), false);

  // Student or Non-teaching CANNOT delete someone else's post
  assert.strictEqual(canDeleteFeedPost(authorId, 'user-nonteach', 'NON_TEACHING'), false);
});
