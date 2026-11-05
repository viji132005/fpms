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
