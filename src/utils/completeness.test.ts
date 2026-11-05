import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfileCompleteness } from './completeness.ts';

test('calculates 100% completeness when all required fields and portfolio activity are present', () => {
  const fullProfile = {
    fullName: 'Dr. Gururaja M P',
    designation: 'Assistant Professor',
    qualification: 'M.Tech, Ph.D in Computer Science',
    specialization: 'Cloud Computing, Distributed Systems',
    phone: '9876543210',
    bio: 'Assistant Professor in Information Science and Engineering with over a decade of teaching experience.',
    profilePhotoUrl: 'https://example.com/photo.jpg',
    cvUrl: 'https://example.com/cv.pdf',
    activityCount: 5,
  };

  const result = calculateProfileCompleteness(fullProfile);
  assert.equal(result.score, 100);
  assert.equal(result.missingFields.length, 0);
  assert.equal(result.completedFields.length, 9);
});

test('accurately identifies missing fields on incomplete profile', () => {
  const partialProfile = {
    fullName: 'New Faculty',
    designation: 'Lecturer',
    qualification: 'M.Tech',
    specialization: 'Information Security',
    phone: '',
    bio: '',
    activityCount: 0,
  };

  const result = calculateProfileCompleteness(partialProfile);
  assert.equal(result.score, 45);
  assert.ok(result.missingFields.includes('Contact Phone'));
  assert.ok(result.missingFields.includes('Academic Biography'));
  assert.ok(result.missingFields.includes('Curriculum Vitae (CV/Resume)'));
  assert.ok(result.missingFields.includes('Academic Portfolio Activity'));
});
