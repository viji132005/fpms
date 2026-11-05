export interface GeneratedStudentInput {
  usnPrefix: string;
  startNumber: number;
  endNumber: number;
  departmentId: string;
  currentYear: number;
  admissionCohort: string;
  namePrefix?: string;
  defaultEmailDomain?: string;
}

export interface GeneratedStudent {
  id: string;
  usn: string;
  fullName: string;
  email: string;
  phone: string;
  parentPhone?: string;
  departmentId: string;
  currentYear: number;
  admissionCohort: string;
  status: 'ACTIVE';
}

/**
 * Validates USN prefix according to standard VTU Karnataka schema
 * E.g., '4MH24IS' or '4MH23CS'
 */
export function sanitizeUsnPrefix(prefix: string): string {
  return prefix.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Checks for collisions between existing database USNs and candidate USNs
 */
export function detectUsnCollisions(
  existingUsns: string[],
  candidateUsns: string[]
): string[] {
  const existingSet = new Set(existingUsns.map((u) => u.trim().toUpperCase()));
  return candidateUsns.filter((u) => existingSet.has(u.trim().toUpperCase()));
}

/**
 * Generates an automated cohort range of VTU students (e.g. 4MH24IS001 to 4MH24IS060)
 */
export function generateVtuCohortStudents(
  input: GeneratedStudentInput
): GeneratedStudent[] {
  const prefix = sanitizeUsnPrefix(input.usnPrefix);
  if (!prefix || prefix.length < 5) {
    throw new Error('Invalid USN prefix. Must follow VTU format like 4MH24IS or 4MH23CS.');
  }

  const start = Math.max(1, Math.floor(input.startNumber));
  const end = Math.floor(input.endNumber);

  if (start > end) {
    throw new Error('Start number cannot be greater than end number.');
  }

  const count = end - start + 1;
  if (count > 300) {
    throw new Error('Maximum batch size is 300 students per cohort generation.');
  }

  const domain = (input.defaultEmailDomain || 'mitmysore.in').trim().toLowerCase();
  const nameBase = (input.namePrefix || 'Student').trim();
  const students: GeneratedStudent[] = [];

  for (let i = start; i <= end; i++) {
    const pad = String(i).padStart(3, '0');
    const usn = `${prefix}${pad}`;
    const id = `stud-gen-${prefix.toLowerCase()}-${pad}-${Date.now().toString(36)}`;
    const email = `${usn.toLowerCase()}@${domain}`;

    students.push({
      id,
      usn,
      fullName: `${nameBase} ${pad}`,
      email,
      phone: `+91 98${String(10000000 + i).slice(-8)}`,
      parentPhone: `+91 94${String(10000000 + i).slice(-8)}`,
      departmentId: input.departmentId,
      currentYear: input.currentYear,
      admissionCohort: input.admissionCohort || '2024-2028',
      status: 'ACTIVE',
    });
  }

  return students;
}
