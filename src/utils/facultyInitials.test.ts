import test from 'node:test';
import assert from 'node:assert/strict';
import { generateFacultyInitials } from './facultyInitials.ts';

test('generates 2-letter initials for Prof Amruth V', () => {
  assert.equal(generateFacultyInitials('Prof Amruth V'), 'AV');
});

test('generates initials for Dr. Ravi P', () => {
  assert.equal(generateFacultyInitials('Dr. Ravi P'), 'RP');
});

test('generates 3-letter initials for Prof. Ganavi N P', () => {
  assert.equal(generateFacultyInitials('Prof. Ganavi N P'), 'GNP');
});

test('generates initials for Prof. Siddaraju M G', () => {
  assert.equal(generateFacultyInitials('Prof. Siddaraju M G'), 'SMG');
});

test('generates initials for Prof. Rohith Gowda K S', () => {
  assert.equal(generateFacultyInitials('Prof. Rohith Gowda K S'), 'RGKS');
});

test('handles plain names without prefix', () => {
  assert.equal(generateFacultyInitials('Zeeshan Ali'), 'ZA');
});
