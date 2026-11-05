/**
 * Task and Submission Review State Machine for FPMS
 * Enforces valid state transitions and mandatory review remarks.
 */

export type SubmissionStatus =
  | 'ASSIGNED'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'RETURNED_FOR_CORRECTION'
  | 'RESUBMITTED'
  | 'APPROVED'
  | 'REJECTED';

export interface StateTransitionResult {
  allowed: boolean;
  error?: string;
  nextStatus?: SubmissionStatus;
}

export function validateSubmissionTransition(
  currentStatus: SubmissionStatus,
  action: 'SUBMIT' | 'START_REVIEW' | 'APPROVE' | 'RETURN' | 'REJECT',
  remarks?: string
): StateTransitionResult {
  switch (action) {
    case 'SUBMIT':
      if (currentStatus === 'ASSIGNED') {
        return { allowed: true, nextStatus: 'SUBMITTED' };
      }
      if (currentStatus === 'RETURNED_FOR_CORRECTION') {
        return { allowed: true, nextStatus: 'RESUBMITTED' };
      }
      return {
        allowed: false,
        error: `Cannot submit deliverable when status is ${currentStatus}. Work must be ASSIGNED or RETURNED_FOR_CORRECTION.`,
      };

    case 'START_REVIEW':
      if (currentStatus === 'SUBMITTED' || currentStatus === 'RESUBMITTED') {
        return { allowed: true, nextStatus: 'UNDER_REVIEW' };
      }
      return {
        allowed: false,
        error: `Cannot start review when status is ${currentStatus}.`,
      };

    case 'APPROVE':
      if (
        currentStatus === 'SUBMITTED' ||
        currentStatus === 'RESUBMITTED' ||
        currentStatus === 'UNDER_REVIEW'
      ) {
        return { allowed: true, nextStatus: 'APPROVED' };
      }
      return {
        allowed: false,
        error: `Cannot approve submission from status ${currentStatus}. Must be SUBMITTED, RESUBMITTED, or UNDER_REVIEW.`,
      };

    case 'RETURN':
      if (
        currentStatus === 'SUBMITTED' ||
        currentStatus === 'RESUBMITTED' ||
        currentStatus === 'UNDER_REVIEW'
      ) {
        if (!remarks || remarks.trim().length === 0) {
          return {
            allowed: false,
            error: 'Returning a submission requires explicit HOD remarks explaining the required corrections.',
          };
        }
        return { allowed: true, nextStatus: 'RETURNED_FOR_CORRECTION' };
      }
      return {
        allowed: false,
        error: `Cannot return submission for correction when status is ${currentStatus}.`,
      };

    case 'REJECT':
      if (
        currentStatus === 'SUBMITTED' ||
        currentStatus === 'RESUBMITTED' ||
        currentStatus === 'UNDER_REVIEW'
      ) {
        if (!remarks || remarks.trim().length === 0) {
          return {
            allowed: false,
            error: 'Rejecting a submission requires an explanatory reason.',
          };
        }
        return { allowed: true, nextStatus: 'REJECTED' };
      }
      return {
        allowed: false,
        error: `Cannot reject submission from status ${currentStatus}.`,
      };

    default:
      return { allowed: false, error: 'Unrecognized action.' };
  }
}
