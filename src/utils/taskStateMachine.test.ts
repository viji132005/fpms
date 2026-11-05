import test from 'node:test';
import assert from 'node:assert/strict';
import { validateSubmissionTransition } from './taskStateMachine.ts';

test('validates correct transition from ASSIGNED to SUBMITTED to APPROVED', () => {
  const step1 = validateSubmissionTransition('ASSIGNED', 'SUBMIT');
  assert.equal(step1.allowed, true);
  assert.equal(step1.nextStatus, 'SUBMITTED');

  const step2 = validateSubmissionTransition('SUBMITTED', 'APPROVE');
  assert.equal(step2.allowed, true);
  assert.equal(step2.nextStatus, 'APPROVED');
});

test('enforces remarks when returning submission for correction', () => {
  const withoutRemarks = validateSubmissionTransition('SUBMITTED', 'RETURN', '');
  assert.equal(withoutRemarks.allowed, false);
  assert.match(withoutRemarks.error!, /requires explicit HOD remarks/i);

  const withRemarks = validateSubmissionTransition(
    'SUBMITTED',
    'RETURN',
    'Please add Scopus citation link and signed certificate.'
  );
  assert.equal(withRemarks.allowed, true);
  assert.equal(withRemarks.nextStatus, 'RETURNED_FOR_CORRECTION');
});

test('allows resubmission only after RETURNED_FOR_CORRECTION', () => {
  const resubmitFromReturned = validateSubmissionTransition(
    'RETURNED_FOR_CORRECTION',
    'SUBMIT'
  );
  assert.equal(resubmitFromReturned.allowed, true);
  assert.equal(resubmitFromReturned.nextStatus, 'RESUBMITTED');

  const resubmitFromApproved = validateSubmissionTransition('APPROVED', 'SUBMIT');
  assert.equal(resubmitFromApproved.allowed, false);
});
