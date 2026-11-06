import { test } from 'node:test';
import assert from 'node:assert/strict';

// Pure logic tests for Master Admin authorization and Circular recipient mapping

function isAuthorizedMasterAdmin(email: string, userRole?: string): boolean {
  const normalized = String(email || '').trim().toLowerCase();
  const allowedEmails = ['masteradmin@gmail.com', '4mh23is119@gmail.com', 'admin@mitmysore.in'];
  return allowedEmails.includes(normalized) || userRole === 'ADMIN';
}

function filterRecipientsForCircular(
  users: Array<{ id: string; role: string; departmentId: string | null; status: string }>,
  author: { id: string; role: string; departmentId: string | null },
  targetAudience: 'ALL' | 'FACULTY'
): string[] {
  let list = users.filter((u) => u.status === 'ACTIVE');

  // If HOD, scoped to their department
  if (author.role === 'HOD' && author.departmentId) {
    list = list.filter((u) => u.departmentId === author.departmentId);
  }

  // If target audience is faculty only
  if (targetAudience === 'FACULTY') {
    list = list.filter((u) => u.role === 'FACULTY');
  }

  // Author must always be included so they see their own broadcast
  if (!list.some((u) => u.id === author.id)) {
    const self = users.find((u) => u.id === author.id);
    if (self) list.push(self);
  }

  return list.map((u) => u.id);
}

function batchDeleteNotifications(
  notifications: Array<{ id: string; recipientUserId: string; actorUserId?: string }>,
  userId: string,
  userRole: string,
  idsToDelete: string[]
): Array<{ id: string; recipientUserId: string; actorUserId?: string }> {
  const idSet = new Set(idsToDelete);
  return notifications.filter(
    (n) =>
      !(
        idSet.has(n.id) &&
        (n.recipientUserId === userId || n.actorUserId === userId || userRole === 'ADMIN')
      )
  );
}

test('isAuthorizedMasterAdmin verifies 4MH23IS119@gmail.com and masteradmin@gmail.com', () => {
  assert.equal(isAuthorizedMasterAdmin('4MH23IS119@gmail.com'), true);
  assert.equal(isAuthorizedMasterAdmin('4mh23is119@gmail.com'), true);
  assert.equal(isAuthorizedMasterAdmin('masteradmin@gmail.com'), true);
  assert.equal(isAuthorizedMasterAdmin('admin@mitmysore.in'), true);
  assert.equal(isAuthorizedMasterAdmin('random@gmail.com', 'FACULTY'), false);
  assert.equal(isAuthorizedMasterAdmin('random@mitmysore.in', 'ADMIN'), true);
});

test('filterRecipientsForCircular includes sender even when targeting FACULTY only', () => {
  const mockUsers = [
    { id: 'hod-ise', role: 'HOD', departmentId: 'dept-ise', status: 'ACTIVE' },
    { id: 'fac-1', role: 'FACULTY', departmentId: 'dept-ise', status: 'ACTIVE' },
    { id: 'fac-2', role: 'FACULTY', departmentId: 'dept-ise', status: 'ACTIVE' },
    { id: 'fac-cse', role: 'FACULTY', departmentId: 'dept-cse', status: 'ACTIVE' },
  ];

  const recipients = filterRecipientsForCircular(
    mockUsers,
    { id: 'hod-ise', role: 'HOD', departmentId: 'dept-ise' },
    'FACULTY'
  );

  // Must include the two ISE faculty AND the HOD author
  assert.equal(recipients.includes('fac-1'), true);
  assert.equal(recipients.includes('fac-2'), true);
  assert.equal(recipients.includes('hod-ise'), true);
  assert.equal(recipients.includes('fac-cse'), false); // Scoped out
});

test('batchDeleteNotifications removes selected ids for user without touching others', () => {
  const notifs = [
    { id: 'n1', recipientUserId: 'user-1' },
    { id: 'n2', recipientUserId: 'user-1' },
    { id: 'n3', recipientUserId: 'user-2' },
  ];

  const remaining = batchDeleteNotifications(notifs, 'user-1', 'FACULTY', ['n1']);
  assert.equal(remaining.length, 2);
  assert.equal(remaining.some((n) => n.id === 'n1'), false);
  assert.equal(remaining.some((n) => n.id === 'n2'), true);
  assert.equal(remaining.some((n) => n.id === 'n3'), true);
});

// Verification of time-period expiration and auto-purge logic
function purgeExpiredNotifications<
  T extends { id: string; validUntil?: string; savedByUserIds?: string[] }
>(notifications: T[], now: number): T[] {
  return notifications.filter((n) => {
    if (n.validUntil) {
      const exp = new Date(n.validUntil).getTime();
      if (exp < now) {
        const isSavedByAnyone = Array.isArray(n.savedByUserIds) && n.savedByUserIds.length > 0;
        return isSavedByAnyone;
      }
    }
    return true;
  });
}

function filterUserNotifications(
  notifications: Array<{
    id: string;
    recipientUserId: string;
    validUntil?: string;
    savedByUserIds?: string[];
    hiddenByUserIds?: string[];
  }>,
  userId: string,
  now: number
): Array<{ id: string; recipientUserId: string }> {
  return notifications.filter((n) => {
    if (n.hiddenByUserIds && n.hiddenByUserIds.includes(userId)) return false;
    if (n.validUntil && new Date(n.validUntil).getTime() < now) {
      const isSavedByMe = n.savedByUserIds && n.savedByUserIds.includes(userId);
      if (!isSavedByMe) return false;
    }
    return n.recipientUserId === userId || n.recipientUserId === 'ALL';
  });
}

test('circular created for 3 days stays active within 3 days and automatically purges after 3 days', () => {
  const currentTime = new Date('2026-11-06T10:00:00Z').getTime();
  const threeDaysLater = new Date('2026-11-09T10:00:00Z').toISOString();

  const circular = {
    id: 'circ-1',
    validUntil: threeDaysLater,
    savedByUserIds: [] as string[],
    recipientUserId: 'ALL',
  };

  const dbList = [circular];

  // 1. Day 1 (after 1 day): should still be active
  const day1Time = new Date('2026-11-07T10:00:00Z').getTime();
  const listDay1 = purgeExpiredNotifications(dbList, day1Time);
  assert.equal(listDay1.length, 1, 'Circular must remain active on Day 1');

  // 2. Day 2 (after 2 days): should still be active
  const day2Time = new Date('2026-11-08T10:00:00Z').getTime();
  const listDay2 = purgeExpiredNotifications(dbList, day2Time);
  assert.equal(listDay2.length, 1, 'Circular must remain active on Day 2');

  // 3. Day 4 (after 3 days period has elapsed): should be automatically deleted/purged from db
  const day4Time = new Date('2026-11-10T10:00:00Z').getTime();
  const listDay4 = purgeExpiredNotifications(dbList, day4Time);
  assert.equal(listDay4.length, 0, 'Circular must be purged automatically after 3 days expiration');
});

test('expired circular saved/bookmarked by user A remains accessible to user A but not to user B', () => {
  const expiredTime = new Date('2026-11-01T10:00:00Z').toISOString();
  const now = new Date('2026-11-06T10:00:00Z').getTime();

  const circularSavedByA = {
    id: 'circ-saved',
    validUntil: expiredTime,
    savedByUserIds: ['user-A'],
    recipientUserId: 'ALL',
  };

  const list = [circularSavedByA];

  // Since user A saved it, database purge keeps it for user A
  const purgedList = purgeExpiredNotifications(list, now);
  assert.equal(purgedList.length, 1, 'Retained because user-A saved it');

  // Visible to user-A
  const visibleToA = filterUserNotifications(purgedList, 'user-A', now);
  assert.equal(visibleToA.length, 1, 'Visible to user-A who bookmarked it');

  // Not visible to user-B (who did not save it)
  const visibleToB = filterUserNotifications(purgedList, 'user-B', now);
  assert.equal(visibleToB.length, 0, 'Hidden from user-B because it has expired');
});

