import {
  SectionAllocationBand,
  SectionConfig,
  AllocatedStudent,
  StudentSectionAllocationRun,
} from '../types/index.ts';

export type { SectionConfig };

// Configurable default performance bands (VTU standard grading)
export const DEFAULT_PERFORMANCE_BANDS: SectionAllocationBand[] = [
  {
    id: 'band-distinction-plus',
    name: 'Outstanding / Elite (> 8.5 CGPA)',
    min: 8.5,
    max: 10.0,
    inclusiveMin: false,
    inclusiveMax: true,
    description: 'Top-tier academic performers (CGPA/SGPA strictly > 8.50 up to 10.00)',
  },
  {
    id: 'band-distinction',
    name: 'First Class with Distinction (7.00 - 8.50)',
    min: 7.0,
    max: 8.5,
    inclusiveMin: true,
    inclusiveMax: true,
    description: 'High-performing academic cohort (7.00 to 8.50)',
  },
  {
    id: 'band-first-class',
    name: 'First Class (6.00 - 6.99)',
    min: 6.0,
    max: 7.0,
    inclusiveMin: true,
    inclusiveMax: false,
    description: 'Solid academic foundation (6.00 up to below 7.00)',
  },
  {
    id: 'band-pass-class',
    name: 'Second Class / Pass Class (< 6.00)',
    min: 0.0,
    max: 6.0,
    inclusiveMin: true,
    inclusiveMax: false,
    description: 'Students requiring additional academic mentoring (< 6.00)',
  },
];

/**
 * High-quality seeded pseudo-random number generator (Mulberry32)
 * Guarantees exact reproducibility and auditability across allocation runs
 */
export function createPRNG(seedString: string): () => number {
  let h = 0x811c9dc5;
  for (let i = 0; i < seedString.length; i++) {
    h ^= seedString.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  let s = h >>> 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Fisher-Yates shuffle using a seeded PRNG
 */
export function shuffleWithSeed<T>(array: T[], rng: () => number): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Calculates balanced section target sizes.
 * Example: 125 students across 3 sections -> [42, 42, 41]
 * Example: 120 students across 3 sections -> [40, 40, 40]
 */
export function calculateBalancedSectionSizes(
  totalStudents: number,
  sections: SectionConfig[]
): { targets: Record<string, number>; isValid: boolean; error?: string } {
  const k = sections.length;
  if (k === 0) {
    return { targets: {}, isValid: false, error: 'At least one section must be configured.' };
  }

  const totalCapacity = sections.reduce((sum, s) => sum + s.capacity, 0);
  if (totalCapacity < totalStudents) {
    return {
      targets: {},
      isValid: false,
      error: `Total section capacity (${totalCapacity}) is insufficient for eligible cohort (${totalStudents} students). Please increase section capacities.`,
    };
  }

  const base = Math.floor(totalStudents / k);
  const remainder = totalStudents % k;
  const targets: Record<string, number> = {};

  for (let i = 0; i < k; i++) {
    const count = base + (i < remainder ? 1 : 0);
    if (count > sections[i].capacity) {
      return {
        targets: {},
        isValid: false,
        error: `Section "${sections[i].name}" has capacity ${sections[i].capacity}, which is less than the balanced target of ${count} students.`,
      };
    }
    targets[sections[i].name] = count;
  }

  return { targets, isValid: true };
}

/**
 * Validates that performance bands do not overlap and cover the expected 0-10 range without gaps
 */
export function validatePerformanceBands(bands: SectionAllocationBand[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (!bands || bands.length === 0) {
    errors.push('At least one performance band must be configured.');
    return { isValid: false, errors };
  }

  // Sort ascending by min
  const sorted = [...bands].sort((a, b) => a.min - b.min);

  for (let i = 0; i < sorted.length; i++) {
    const b = sorted[i];
    if (b.min < 0 || b.max > 10) {
      errors.push(`Band "${b.name}" has boundaries outside the standard 0.0 - 10.0 scale.`);
    }
    if (b.min >= b.max) {
      errors.push(`Band "${b.name}" minimum (${b.min}) must be less than maximum (${b.max}).`);
    }

    if (i > 0) {
      const prev = sorted[i - 1];
      if (b.min < prev.max) {
        errors.push(`Band "${b.name}" overlaps with band "${prev.name}".`);
      } else if (b.min > prev.max) {
        errors.push(`Gap detected between band "${prev.name}" (ends at ${prev.max}) and "${b.name}" (starts at ${b.min}).`);
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

export const validateBands = validatePerformanceBands;

/**
 * Assigns a performance value to its matching band
 */
export function findMatchingBand(
  score: number,
  bands: SectionAllocationBand[]
): SectionAllocationBand | null {
  for (const b of bands) {
    const minSatisfied = b.inclusiveMin ? score >= b.min : score > b.min;
    const maxSatisfied = b.inclusiveMax ? score <= b.max : score < b.max;
    if (minSatisfied && maxSatisfied) {
      return b;
    }
  }
  return null;
}

export interface CandidateStudentInput {
  id: string;
  usn: string;
  fullName: string;
  currentYear: number;
  currentSemester: number;
  status: string;
  score?: number | null; // CGPA or SGPA
}

export interface AllocationRunResult {
  allocatedStudents: AllocatedStudent[];
  unresolvedStudents: CandidateStudentInput[];
  summary: {
    sectionCounts: Record<string, number>;
    sectionAverages: Record<string, number>;
    sectionBandCounts: Record<string, Record<string, number>>;
  };
  randomSeed: string;
  algorithmVersion: string;
}

/**
 * Executes Random Balanced Allocation
 */
export function executeRandomBalancedAllocation(
  students: CandidateStudentInput[],
  sections: SectionConfig[],
  seed?: string
): AllocationRunResult {
  const randomSeed = seed || `seed-rand-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const rng = createPRNG(randomSeed);

  const { targets, isValid, error } = calculateBalancedSectionSizes(students.length, sections);
  if (!isValid) {
    throw new Error(error);
  }

  // Shuffle students thoroughly
  const shuffled = shuffleWithSeed(students, rng);

  const allocatedStudents: AllocatedStudent[] = [];
  const sectionCounts: Record<string, number> = {};
  const sectionAverages: Record<string, number> = {};
  const sectionBandCounts: Record<string, Record<string, number>> = {};

  sections.forEach((s) => {
    sectionCounts[s.name] = 0;
    sectionAverages[s.name] = 0;
    sectionBandCounts[s.name] = {};
  });

  let studentIdx = 0;
  for (const sec of sections) {
    const targetCount = targets[sec.name];
    for (let c = 0; c < targetCount && studentIdx < shuffled.length; c++) {
      const st = shuffled[studentIdx++];
      allocatedStudents.push({
        studentId: st.id,
        usn: st.usn,
        fullName: st.fullName,
        currentYear: st.currentYear,
        currentSemester: st.currentSemester,
        assignedSection: sec.name,
      });
      sectionCounts[sec.name]++;
    }
  }

  return {
    allocatedStudents,
    unresolvedStudents: [],
    summary: {
      sectionCounts,
      sectionAverages,
      sectionBandCounts,
    },
    randomSeed,
    algorithmVersion: '1.0-RANDOM-BALANCED',
  };
}

/**
 * Executes Academic Performance-Based (CGPA/SGPA) Stratified Balanced Allocation
 */
export function executePerformanceBalancedAllocation(
  students: CandidateStudentInput[],
  sections: SectionConfig[],
  metric: 'CGPA' | 'SGPA',
  bands: SectionAllocationBand[] = DEFAULT_PERFORMANCE_BANDS,
  seed?: string,
  missingPolicy: 'UNASSIGNED' | 'DISTRIBUTE_EVENLY' = 'UNASSIGNED'
): AllocationRunResult {
  const randomSeed = seed || `seed-perf-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  const rng = createPRNG(randomSeed);

  const validScoreStudents: (CandidateStudentInput & { score: number; band: SectionAllocationBand })[] = [];
  const unresolvedStudents: CandidateStudentInput[] = [];

  for (const st of students) {
    if (typeof st.score === 'number' && !isNaN(st.score) && st.score >= 0 && st.score <= 10) {
      const band = findMatchingBand(st.score, bands);
      if (band) {
        validScoreStudents.push({ ...st, score: st.score, band });
      } else {
        unresolvedStudents.push(st);
      }
    } else {
      unresolvedStudents.push(st);
    }
  }

  const studentsToAllocate = missingPolicy === 'DISTRIBUTE_EVENLY'
    ? [...validScoreStudents, ...unresolvedStudents.map(u => ({ ...u, score: undefined as any, band: undefined as any }))]
    : validScoreStudents;

  const { targets, isValid, error } = calculateBalancedSectionSizes(studentsToAllocate.length, sections);
  if (!isValid) {
    throw new Error(error);
  }

  // Group valid students by performance band
  const bandBuckets: Record<string, (typeof validScoreStudents)[0][]> = {};
  bands.forEach((b) => {
    bandBuckets[b.id] = [];
  });

  for (const st of validScoreStudents) {
    bandBuckets[st.band.id].push(st);
  }

  // Shuffle within each band using the seeded PRNG to eliminate USN / alphabetical bias
  bands.forEach((b) => {
    bandBuckets[b.id] = shuffleWithSeed(bandBuckets[b.id], rng);
  });

  const sectionCounts: Record<string, number> = {};
  const sectionTotals: Record<string, number> = {};
  const sectionScoreCounts: Record<string, number> = {};
  const sectionBandCounts: Record<string, Record<string, number>> = {};
  const sectionBuckets: Record<string, AllocatedStudent[]> = {};

  sections.forEach((s) => {
    sectionCounts[s.name] = 0;
    sectionTotals[s.name] = 0;
    sectionScoreCounts[s.name] = 0;
    sectionBandCounts[s.name] = {};
    sectionBuckets[s.name] = [];
    bands.forEach((b) => {
      sectionBandCounts[s.name][b.name] = 0;
    });
  });

  // Stratified distribution:
  // For each band, distribute students across sections evenly in serpentine/alternating round-robin
  let sectionIndex = 0;
  for (const b of bands) {
    const list = bandBuckets[b.id];
    for (const st of list) {
      // Find eligible section that has not exceeded target count
      let chosenSection: string | null = null;
      let minSectionFill = Infinity;

      // Prefer the next section in round-robin order that still has remaining capacity
      for (let offset = 0; offset < sections.length; offset++) {
        const candidateIdx = (sectionIndex + offset) % sections.length;
        const secName = sections[candidateIdx].name;
        if (sectionCounts[secName] < targets[secName]) {
          chosenSection = secName;
          sectionIndex = (candidateIdx + 1) % sections.length;
          break;
        }
      }

      // Fallback: if all reached target, pick section with lowest count
      if (!chosenSection) {
        for (const sec of sections) {
          if (sectionCounts[sec.name] < minSectionFill && sectionCounts[sec.name] < sec.capacity) {
            minSectionFill = sectionCounts[sec.name];
            chosenSection = sec.name;
          }
        }
      }

      if (!chosenSection) {
        chosenSection = sections[0].name;
      }

      sectionBuckets[chosenSection].push({
        studentId: st.id,
        usn: st.usn,
        fullName: st.fullName,
        currentYear: st.currentYear,
        currentSemester: st.currentSemester,
        performanceMetric: metric,
        performanceValue: st.score,
        bandId: st.band.id,
        bandName: st.band.name,
        assignedSection: chosenSection,
      });

      sectionCounts[chosenSection]++;
      sectionTotals[chosenSection] += st.score;
      sectionScoreCounts[chosenSection]++;
      sectionBandCounts[chosenSection][st.band.name] =
        (sectionBandCounts[chosenSection][st.band.name] || 0) + 1;
    }
  }

  // Handle missing scores if policy is DISTRIBUTE_EVENLY
  if (missingPolicy === 'DISTRIBUTE_EVENLY') {
    for (const st of unresolvedStudents) {
      // Pick section with lowest current count
      let chosenSec = sections[0].name;
      let minCount = Infinity;
      for (const s of sections) {
        if (sectionCounts[s.name] < targets[s.name] && sectionCounts[s.name] < minCount) {
          minCount = sectionCounts[s.name];
          chosenSec = s.name;
        }
      }

      sectionBuckets[chosenSec].push({
        studentId: st.id,
        usn: st.usn,
        fullName: st.fullName,
        currentYear: st.currentYear,
        currentSemester: st.currentSemester,
        performanceMetric: metric,
        performanceValue: null,
        bandId: 'unresolved',
        bandName: 'Unresolved / Missing Score',
        assignedSection: chosenSec,
      });
      sectionCounts[chosenSec]++;
    }
  }

  // Calculate average CGPA/SGPA for each section
  const sectionAverages: Record<string, number> = {};
  sections.forEach((s) => {
    const total = sectionTotals[s.name] || 0;
    const count = sectionScoreCounts[s.name] || 0;
    sectionAverages[s.name] = count > 0 ? Number((total / count).toFixed(2)) : 0;
  });

  const allocatedStudents: AllocatedStudent[] = [];
  sections.forEach((s) => {
    allocatedStudents.push(...sectionBuckets[s.name]);
  });

  return {
    allocatedStudents,
    unresolvedStudents: missingPolicy === 'UNASSIGNED' ? unresolvedStudents : [],
    summary: {
      sectionCounts,
      sectionAverages,
      sectionBandCounts,
    },
    randomSeed,
    algorithmVersion: '1.0-STRATIFIED-PERFORMANCE-BALANCED',
  };
}
