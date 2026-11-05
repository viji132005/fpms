import {
  AcademicSubject,
  SubjectAllocationRecord,
  StructuredTimetable,
  TimetableSlot,
  User,
  StaffProfile,
} from './db.ts';

export const ISE_FACULTY_MEMBERS: {
  userId: string;
  email: string;
  staffId: string;
  fullName: string;
  initials: string;
  designation: string;
}[] = [
  {
    userId: 'user-fac-amruth',
    email: 'amruth.ise@mitmysore.in',
    staffId: 'MITM-ISE-021',
    fullName: 'Prof. Amruth V',
    initials: 'AV',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-ravi',
    email: 'ravi.ise@mitmysore.in',
    staffId: 'MITM-ISE-022',
    fullName: 'Dr. Ravi P',
    initials: 'RP',
    designation: 'Associate Professor',
  },
  {
    userId: 'user-fac-siddaraju',
    email: 'siddaraju.ise@mitmysore.in',
    staffId: 'MITM-ISE-023',
    fullName: 'Prof. Siddaraju M G',
    initials: 'SMG',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-bhavya',
    email: 'bhavya.ise@mitmysore.in',
    staffId: 'MITM-ISE-024',
    fullName: 'Prof. Bhavya H D',
    initials: 'BHD',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-ganavi',
    email: 'ganavi.ise@mitmysore.in',
    staffId: 'MITM-ISE-025',
    fullName: 'Prof. Ganavi N P',
    initials: 'GNP',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-rohith',
    email: 'rohith.ise@mitmysore.in',
    staffId: 'MITM-ISE-026',
    fullName: 'Prof. Rohith Gowda K S',
    initials: 'RKS',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-sharada',
    email: 'sharada.ise@mitmysore.in',
    staffId: 'MITM-ISE-027',
    fullName: 'Prof. Sharada S S',
    initials: 'SSS',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-zeeshan',
    email: 'zeeshan.ise@mitmysore.in',
    staffId: 'MITM-ISE-028',
    fullName: 'Prof. Zeeshan Ali',
    initials: 'ZA',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-rashmi',
    email: 'rashmi.ise@mitmysore.in',
    staffId: 'MITM-ISE-029',
    fullName: 'Prof. Rashmi N H',
    initials: 'RNH',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-manasa',
    email: 'manasa.ise@mitmysore.in',
    staffId: 'MITM-ISE-030',
    fullName: 'Prof. Manasa M G',
    initials: 'MMG',
    designation: 'Assistant Professor',
  },
  {
    userId: 'user-fac-sangeetha',
    email: 'sangeetha.ise@mitmysore.in',
    staffId: 'MITM-ISE-031',
    fullName: 'Dr. Sangeetha G',
    initials: 'SG',
    designation: 'Associate Professor',
  },
];

export function getInitialAcademicSubjects(): AcademicSubject[] {
  return [
    // 1st Year - Sem 1 & 2
    { id: 'sub-sem1-1', departmentId: 'dept-ise', year: 1, semester: 1, code: '22MATS11', title: 'Mathematics - I for CSE/ISE Stream', shortName: 'MATH-I', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem1-2', departmentId: 'dept-ise', year: 1, semester: 1, code: '22PHYS12', title: 'Physics for Computing Science', shortName: 'PHYSICS', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem1-3', departmentId: 'dept-ise', year: 1, semester: 1, code: '22POP13', title: 'Principles of Programming Using C', shortName: 'POP-C', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem1-4', departmentId: 'dept-ise', year: 1, semester: 1, code: '22EPL14', title: 'Programming Laboratory', shortName: 'C-LAB', isLab: true, category: 'LAB', hoursPerWeek: 3 },
    { id: 'sub-sem2-1', departmentId: 'dept-ise', year: 1, semester: 2, code: '22MATS21', title: 'Mathematics - II for CSE/ISE Stream', shortName: 'MATH-II', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem2-2', departmentId: 'dept-ise', year: 1, semester: 2, code: '22CHEM22', title: 'Chemistry for Information Science', shortName: 'CHEMISTRY', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem2-3', departmentId: 'dept-ise', year: 1, semester: 2, code: '22PLC23', title: 'Python Programming', shortName: 'PYTHON', isLab: false, category: 'THEORY', hoursPerWeek: 4 },

    // 2nd Year - Sem 3 & 4
    { id: 'sub-sem3-1', departmentId: 'dept-ise', year: 2, semester: 3, code: '21MAT31', title: 'Transform Calculus & Numerical Tech', shortName: 'MATH-III', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem3-2', departmentId: 'dept-ise', year: 2, semester: 3, code: '21CS32', title: 'Data Structures and Applications', shortName: 'DSA', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem3-3', departmentId: 'dept-ise', year: 2, semester: 3, code: '21CS33', title: 'Analog and Digital Electronics', shortName: 'ADE', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem3-4', departmentId: 'dept-ise', year: 2, semester: 3, code: '21CS34', title: 'Computer Organization & Architecture', shortName: 'COA', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem3-5', departmentId: 'dept-ise', year: 2, semester: 3, code: '21CSL35', title: 'Data Structures Laboratory', shortName: 'DS-LAB', isLab: true, category: 'LAB', hoursPerWeek: 3 },
    { id: 'sub-sem4-1', departmentId: 'dept-ise', year: 2, semester: 4, code: '21MAT41', title: 'Mathematical Foundations for Computing', shortName: 'MFC', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem4-2', departmentId: 'dept-ise', year: 2, semester: 4, code: '21CS42', title: 'Design and Analysis of Algorithms', shortName: 'DAA', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem4-3', departmentId: 'dept-ise', year: 2, semester: 4, code: '21CS43', title: 'Operating Systems', shortName: 'OS', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem4-4', departmentId: 'dept-ise', year: 2, semester: 4, code: '21CSL46', title: 'Design and Analysis of Algorithms Lab', shortName: 'DAA-LAB', isLab: true, category: 'LAB', hoursPerWeek: 3 },

    // 3rd Year - Sem 5
    { id: 'sub-sem5-1', departmentId: 'dept-ise', year: 3, semester: 5, code: '21IS51', title: 'Automata Theory and Compiler Design', shortName: 'ATCD', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem5-2', departmentId: 'dept-ise', year: 3, semester: 5, code: '21IS52', title: 'Computer Networks & Internet Protocols', shortName: 'CN', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem5-3', departmentId: 'dept-ise', year: 3, semester: 5, code: '21IS53', title: 'Database Management Systems', shortName: 'DBMS', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem5-4', departmentId: 'dept-ise', year: 3, semester: 5, code: '21IS54', title: 'Artificial Intelligence & Machine Learning', shortName: 'AIML', isLab: false, category: 'THEORY', hoursPerWeek: 3 },
    { id: 'sub-sem5-5', departmentId: 'dept-ise', year: 3, semester: 5, code: '21ISL56', title: 'DBMS and Computer Networks Laboratory', shortName: 'DBMS-LAB', isLab: true, category: 'LAB', hoursPerWeek: 3 },

    // 3rd Year - Sem 6 (Exact VTU 2025-26 MIT Mysore Timetable Template)
    { id: 'sub-sem6-1', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', shortName: 'FSD', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem6-2', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BCS602', title: 'MACHINE LEARNING', shortName: 'ML', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem6-3', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', shortName: 'BCT', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem6-4', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', shortName: 'OE', isLab: false, category: 'ELECTIVE', hoursPerWeek: 3 },
    { id: 'sub-sem6-5', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', shortName: 'PROJECT', isLab: false, category: 'PROJECT', hoursPerWeek: 2 },
    { id: 'sub-sem6-6', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', shortName: 'ML LAB', isLab: true, category: 'LAB', hoursPerWeek: 3 },
    { id: 'sub-sem6-7', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BCS607B', title: 'DEVOPS', shortName: 'DEVOPS', isLab: false, category: 'THEORY', hoursPerWeek: 3 },
    { id: 'sub-sem6-8', departmentId: 'dept-ise', year: 3, semester: 6, code: 'M23BNSK608', title: 'NSS / PE / YOGA / MENTORING', shortName: 'NSS/YOGA', isLab: false, category: 'ACTIVITY', hoursPerWeek: 1 },
    { id: 'sub-sem6-9', departmentId: 'dept-ise', year: 3, semester: 6, code: 'PLACEMENT', title: 'PLACEMENT TRAINING', shortName: 'PLACEMENT', isLab: false, category: 'TRAINING', hoursPerWeek: 2 },

    // 4th Year - Sem 7 & 8
    { id: 'sub-sem7-1', departmentId: 'dept-ise', year: 4, semester: 7, code: '21IS71', title: 'Cloud Computing & Virtualization', shortName: 'CLOUD', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem7-2', departmentId: 'dept-ise', year: 4, semester: 7, code: '21IS72', title: 'Cyber Security and Digital Forensics', shortName: 'CYBER', isLab: false, category: 'THEORY', hoursPerWeek: 4 },
    { id: 'sub-sem7-3', departmentId: 'dept-ise', year: 4, semester: 7, code: '21IS73', title: 'Major Project Phase - II', shortName: 'PROJ-II', isLab: false, category: 'PROJECT', hoursPerWeek: 6 },
    { id: 'sub-sem8-1', departmentId: 'dept-ise', year: 4, semester: 8, code: '21INT81', title: 'Full Semester Industry Internship', shortName: 'INTERNSHIP', isLab: false, category: 'TRAINING', hoursPerWeek: 20 },
  ];
}

export function getInitialSubjectAllocations(): SubjectAllocationRecord[] {
  return [
    // 6th Sem - Section A
    {
      id: 'alloc-6-a-1',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BIS601',
      subjectTitle: 'FULL STACK DEVELOPMENT',
      subjectShortName: 'FSD',
      facultyUserId: 'user-fac-amruth',
      facultyName: 'Prof. Amruth V',
      facultyInitials: 'AV',
      isLab: false,
    },
    {
      id: 'alloc-6-a-2',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BCS602',
      subjectTitle: 'MACHINE LEARNING',
      subjectShortName: 'ML',
      facultyUserId: 'user-fac-ravi',
      facultyName: 'Dr. Ravi P',
      facultyInitials: 'RP',
      isLab: false,
    },
    {
      id: 'alloc-6-a-3',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BCS603A',
      subjectTitle: 'BLOCKCHAIN TECHNOLOGY',
      subjectShortName: 'BCT',
      facultyUserId: 'user-fac-siddaraju',
      facultyName: 'Prof. Siddaraju M G',
      facultyInitials: 'SMG',
      isLab: false,
    },
    {
      id: 'alloc-6-a-4',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BXX604x',
      subjectTitle: 'OPEN ELECTIVE - I',
      subjectShortName: 'OE',
      facultyUserId: 'user-fac-res',
      facultyName: 'Respective Department Faculty',
      facultyInitials: 'RDF',
      isLab: false,
    },
    {
      id: 'alloc-6-a-5',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BIS605',
      subjectTitle: 'MAJOR PROJECT PHASE - I',
      subjectShortName: 'PROJECT',
      facultyUserId: 'user-all-fac',
      facultyName: 'All Department Faculty Guides',
      facultyInitials: 'ALL',
      isLab: false,
    },
    {
      id: 'alloc-6-a-6',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BCSL606',
      subjectTitle: 'MACHINE LEARNING LABORATORY',
      subjectShortName: 'ML LAB',
      facultyUserId: 'user-fac-ravi',
      facultyName: 'Dr. Ravi P / RNH / SMG / ZA',
      facultyInitials: 'RP/RNH',
      isLab: true,
      labBatches: [
        { batchName: 'B1', facultyName: 'Dr. Ravi P / Prof. Rashmi N H', facultyInitials: 'RP/RNH' },
        { batchName: 'B2', facultyName: 'Prof. Siddaraju M G / Prof. Manasa M G', facultyInitials: 'SMG/MMG' },
        { batchName: 'B3', facultyName: 'Prof. Zeeshan Ali', facultyInitials: 'ZA' },
      ],
    },
    {
      id: 'alloc-6-a-7',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BCS607B',
      subjectTitle: 'DEVOPS',
      subjectShortName: 'DEVOPS',
      facultyUserId: 'user-fac-ganavi',
      facultyName: 'Prof. Ganavi N P',
      facultyInitials: 'GNP',
      isLab: false,
    },
    {
      id: 'alloc-6-a-8',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'M23BNSK608',
      subjectTitle: 'NSS / PE / YOGA / MENTORING',
      subjectShortName: 'NSS/YOGA',
      facultyUserId: 'user-fac-sangeetha',
      facultyName: 'Dr. Sangeetha G',
      facultyInitials: 'SG',
      isLab: false,
    },
    {
      id: 'alloc-6-a-9',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section A',
      subjectCode: 'PLACEMENT',
      subjectTitle: 'PLACEMENT TRAINING',
      subjectShortName: 'PLACEMENT',
      facultyUserId: 'user-pt',
      facultyName: 'Placement Trainers',
      facultyInitials: 'PT',
      isLab: false,
    },

    // 6th Sem - Section B
    {
      id: 'alloc-6-b-1',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BIS601',
      subjectTitle: 'FULL STACK DEVELOPMENT',
      subjectShortName: 'FSD',
      facultyUserId: 'user-fac-bhavya',
      facultyName: 'Prof. Bhavya H D',
      facultyInitials: 'BHD',
      isLab: false,
    },
    {
      id: 'alloc-6-b-2',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BCS602',
      subjectTitle: 'MACHINE LEARNING',
      subjectShortName: 'ML',
      facultyUserId: 'user-fac-ravi',
      facultyName: 'Dr. Ravi P',
      facultyInitials: 'RP',
      isLab: false,
    },
    {
      id: 'alloc-6-b-3',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BCS603A',
      subjectTitle: 'BLOCKCHAIN TECHNOLOGY',
      subjectShortName: 'BCT',
      facultyUserId: 'user-fac-rohith',
      facultyName: 'Prof. Rohith Gowda K S',
      facultyInitials: 'RKS',
      isLab: false,
    },
    {
      id: 'alloc-6-b-4',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BXX604x',
      subjectTitle: 'OPEN ELECTIVE - I',
      subjectShortName: 'OE',
      facultyUserId: 'user-fac-res',
      facultyName: 'Respective Department Faculty',
      facultyInitials: 'RDF',
      isLab: false,
    },
    {
      id: 'alloc-6-b-5',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BIS605',
      subjectTitle: 'MAJOR PROJECT PHASE - I',
      subjectShortName: 'PROJECT',
      facultyUserId: 'user-all-fac',
      facultyName: 'All Department Faculty Guides',
      facultyInitials: 'ALL',
      isLab: false,
    },
    {
      id: 'alloc-6-b-6',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BCSL606',
      subjectTitle: 'MACHINE LEARNING LABORATORY',
      subjectShortName: 'ML LAB',
      facultyUserId: 'user-fac-rohith',
      facultyName: 'Prof. Rohith Gowda K S / GNP / RNH',
      facultyInitials: 'RKS/GNP',
      isLab: true,
      labBatches: [
        { batchName: 'B1', facultyName: 'Prof. Rohith Gowda K S / Prof. Ganavi N P', facultyInitials: 'RKS/GNP' },
        { batchName: 'B2', facultyName: 'Prof. Ganavi N P / Prof. Rashmi N H', facultyInitials: 'GNP/RNH' },
        { batchName: 'B3', facultyName: 'Prof. Manasa M G / Dr. Sangeetha G', facultyInitials: 'MMG/SG' },
      ],
    },
    {
      id: 'alloc-6-b-7',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BCS607B',
      subjectTitle: 'DEVOPS',
      subjectShortName: 'DEVOPS',
      facultyUserId: 'user-fac-zeeshan',
      facultyName: 'Prof. Zeeshan Ali',
      facultyInitials: 'ZA',
      isLab: false,
    },
    {
      id: 'alloc-6-b-8',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'M23BNSK608',
      subjectTitle: 'NSS / PE / YOGA / MENTORING',
      subjectShortName: 'NSS/YOGA',
      facultyUserId: 'user-fac-ganavi',
      facultyName: 'Prof. Ganavi N P',
      facultyInitials: 'GNP',
      isLab: false,
    },
    {
      id: 'alloc-6-b-9',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section B',
      subjectCode: 'PLACEMENT',
      subjectTitle: 'PLACEMENT TRAINING',
      subjectShortName: 'PLACEMENT',
      facultyUserId: 'user-pt',
      facultyName: 'Placement Trainers',
      facultyInitials: 'PT',
      isLab: false,
    },

    // 6th Sem - Section C
    {
      id: 'alloc-6-c-1',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BIS601',
      subjectTitle: 'FULL STACK DEVELOPMENT',
      subjectShortName: 'FSD',
      facultyUserId: 'user-fac-ganavi',
      facultyName: 'Prof. Ganavi N P',
      facultyInitials: 'GNP',
      isLab: false,
    },
    {
      id: 'alloc-6-c-2',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BCS602',
      subjectTitle: 'MACHINE LEARNING',
      subjectShortName: 'ML',
      facultyUserId: 'user-fac-sharada',
      facultyName: 'Prof. Sharada S S',
      facultyInitials: 'SSS',
      isLab: false,
    },
    {
      id: 'alloc-6-c-3',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BCS603A',
      subjectTitle: 'BLOCKCHAIN TECHNOLOGY',
      subjectShortName: 'BCT',
      facultyUserId: 'user-fac-siddaraju',
      facultyName: 'Prof. Siddaraju M G',
      facultyInitials: 'SMG',
      isLab: false,
    },
    {
      id: 'alloc-6-c-4',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BXX604x',
      subjectTitle: 'OPEN ELECTIVE - I',
      subjectShortName: 'OE',
      facultyUserId: 'user-fac-res',
      facultyName: 'Respective Department Faculty',
      facultyInitials: 'RDF',
      isLab: false,
    },
    {
      id: 'alloc-6-c-5',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BIS605',
      subjectTitle: 'MAJOR PROJECT PHASE - I',
      subjectShortName: 'PROJECT',
      facultyUserId: 'user-all-fac',
      facultyName: 'All Department Faculty Guides',
      facultyInitials: 'ALL',
      isLab: false,
    },
    {
      id: 'alloc-6-c-6',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BCSL606',
      subjectTitle: 'MACHINE LEARNING LABORATORY',
      subjectShortName: 'ML LAB',
      facultyUserId: 'user-fac-sharada',
      facultyName: 'Prof. Sharada S S / AV / BHD',
      facultyInitials: 'SSS/AV',
      isLab: true,
      labBatches: [
        { batchName: 'B1', facultyName: 'Prof. Sharada S S / Prof. Amruth V', facultyInitials: 'SSS/AV' },
        { batchName: 'B2', facultyName: 'Prof. Siddaraju M G / Prof. Bhavya H D', facultyInitials: 'SMG/BHD' },
        { batchName: 'B3', facultyName: 'Prof. Zeeshan Ali / Prof. Manasa M G', facultyInitials: 'ZA/MMG' },
      ],
    },
    {
      id: 'alloc-6-c-7',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BCS607B',
      subjectTitle: 'DEVOPS',
      subjectShortName: 'DEVOPS',
      facultyUserId: 'user-fac-rohith',
      facultyName: 'Prof. Rohith Gowda K S',
      facultyInitials: 'RKS',
      isLab: false,
    },
    {
      id: 'alloc-6-c-8',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'M23BNSK608',
      subjectTitle: 'NSS / PE / YOGA / MENTORING',
      subjectShortName: 'NSS/YOGA',
      facultyUserId: 'user-fac-bhavya',
      facultyName: 'Prof. Bhavya H D',
      facultyInitials: 'BHD',
      isLab: false,
    },
    {
      id: 'alloc-6-c-9',
      departmentId: 'dept-ise',
      year: 3,
      semester: 6,
      section: 'Section C',
      subjectCode: 'PLACEMENT',
      subjectTitle: 'PLACEMENT TRAINING',
      subjectShortName: 'PLACEMENT',
      facultyUserId: 'user-pt',
      facultyName: 'Placement Trainers',
      facultyInitials: 'PT',
      isLab: false,
    },
  ];
}

export function buildMITM6thSemSchedule(section: 'Section A' | 'Section B' | 'Section C'): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  const room = section === 'Section A' ? 'Room Number:- 301' : section === 'Section B' ? 'Room Number:- 302' : 'Room Number:- 303';
  const labRoom = 'ISE Project & AI Lab';

  // Times definition
  const periods = [
    { index: 0, timeRange: '09.00am to 10.00am' },
    { index: 1, timeRange: '10.00am to 11.00am' },
    { index: 2, timeRange: '11.00am to 11.25am', isBreak: true, breakType: 'SHORT_BREAK' as const },
    { index: 3, timeRange: '11.25am to 12.20pm' },
    { index: 4, timeRange: '12.20pm to 01.15pm' },
    { index: 5, timeRange: '01.15pm to 02.00pm', isBreak: true, breakType: 'LUNCH_BREAK' as const },
    { index: 6, timeRange: '02.00pm to 03.00pm' },
    { index: 7, timeRange: '03.00pm to 04.00pm' },
  ];

  // Specific day distributions based on the PDF
  type DaySchedule = {
    [periodIndex: number]: {
      code: string;
      title: string;
      short: string;
      faculty: string;
      initials: string;
      isLab?: boolean;
    };
  };

  let scheduleMap: Record<string, DaySchedule> = {};

  if (section === 'Section A') {
    scheduleMap = {
      MON: {
        0: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        1: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        3: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        4: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Amruth V', initials: 'AV' },
        6: { code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', short: 'PROJECT', faculty: 'All Department Faculty Guides', initials: 'ALL' },
        7: { code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', short: 'PROJECT', faculty: 'All Department Faculty Guides', initials: 'ALL' },
      },
      TUE: {
        0: { code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', short: 'ML LAB', faculty: 'Dr. Ravi P / RNH / SMG', initials: 'RP/RNH', isLab: true },
        1: { code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', short: 'ML LAB', faculty: 'Dr. Ravi P / RNH / SMG', initials: 'RP/RNH', isLab: true },
        3: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        4: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Amruth V', initials: 'AV' },
        6: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        7: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
      },
      WED: {
        0: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Amruth V', initials: 'AV' },
        1: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        3: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        4: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        6: { code: 'PLACEMENT', title: 'PLACEMENT TRAINING', short: 'PLACEMENT', faculty: 'Placement Trainers', initials: 'PT' },
        7: { code: 'PLACEMENT', title: 'PLACEMENT TRAINING', short: 'PLACEMENT', faculty: 'Placement Trainers', initials: 'PT' },
      },
      THU: {
        0: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        1: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Amruth V', initials: 'AV' },
        3: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        4: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        6: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        7: { code: 'M23BNSK608', title: 'NSS / PE / YOGA / MENTORING', short: 'NSS/YOGA', faculty: 'Dr. Sangeetha G', initials: 'SG' },
      },
      FRI: {
        0: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        1: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        3: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Amruth V', initials: 'AV' },
        4: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        6: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        7: { code: 'M23BIS601', title: 'MENTORING & COUNSELING', short: 'MENTORING', faculty: 'Prof. Amruth V', initials: 'AV' },
      },
    };
  } else if (section === 'Section B') {
    scheduleMap = {
      MON: {
        0: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        1: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
        3: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        4: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Zeeshan Ali', initials: 'ZA' },
        6: { code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', short: 'PROJECT', faculty: 'All Department Faculty Guides', initials: 'ALL' },
        7: { code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', short: 'PROJECT', faculty: 'All Department Faculty Guides', initials: 'ALL' },
      },
      TUE: {
        0: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
        1: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        3: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Zeeshan Ali', initials: 'ZA' },
        4: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        6: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        7: { code: 'M23BNSK608', title: 'NSS / PE / YOGA / MENTORING', short: 'NSS/YOGA', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
      },
      WED: {
        0: { code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', short: 'ML LAB', faculty: 'Prof. Rohith Gowda K S / GNP', initials: 'RKS/GNP', isLab: true },
        1: { code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', short: 'ML LAB', faculty: 'Prof. Rohith Gowda K S / GNP', initials: 'RKS/GNP', isLab: true },
        3: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
        4: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        6: { code: 'PLACEMENT', title: 'PLACEMENT TRAINING', short: 'PLACEMENT', faculty: 'Placement Trainers', initials: 'PT' },
        7: { code: 'PLACEMENT', title: 'PLACEMENT TRAINING', short: 'PLACEMENT', faculty: 'Placement Trainers', initials: 'PT' },
      },
      THU: {
        0: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        1: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        3: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
        4: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Zeeshan Ali', initials: 'ZA' },
        6: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        7: { code: 'M23BIS601', title: 'MENTORING & COUNSELING', short: 'MENTORING', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
      },
      FRI: {
        0: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        1: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
        3: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        4: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Dr. Ravi P', initials: 'RP' },
        6: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Zeeshan Ali', initials: 'ZA' },
        7: { code: 'M23BCS603A', title: 'TUTORIAL / REMEDIAL', short: 'BCT (T)', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
      },
    };
  } else {
    // Section C
    scheduleMap = {
      MON: {
        0: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        1: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        3: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Prof. Sharada S S', initials: 'SSS' },
        4: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        6: { code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', short: 'PROJECT', faculty: 'All Department Faculty Guides', initials: 'ALL' },
        7: { code: 'M23BIS605', title: 'MAJOR PROJECT PHASE - I', short: 'PROJECT', faculty: 'All Department Faculty Guides', initials: 'ALL' },
      },
      TUE: {
        0: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Prof. Sharada S S', initials: 'SSS' },
        1: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        3: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        4: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        6: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        7: { code: 'M23BNSK608', title: 'NSS / PE / YOGA / MENTORING', short: 'NSS/YOGA', faculty: 'Prof. Bhavya H D', initials: 'BHD' },
      },
      WED: {
        0: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        1: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        3: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Prof. Sharada S S', initials: 'SSS' },
        4: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        6: { code: 'PLACEMENT', title: 'PLACEMENT TRAINING', short: 'PLACEMENT', faculty: 'Placement Trainers', initials: 'PT' },
        7: { code: 'PLACEMENT', title: 'PLACEMENT TRAINING', short: 'PLACEMENT', faculty: 'Placement Trainers', initials: 'PT' },
      },
      THU: {
        0: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        1: { code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', short: 'ML LAB', faculty: 'Prof. Sharada S S / AV', initials: 'SSS/AV', isLab: true },
        3: { code: 'M23BCSL606', title: 'MACHINE LEARNING LABORATORY', short: 'ML LAB', faculty: 'Prof. Sharada S S / AV', initials: 'SSS/AV', isLab: true },
        4: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        6: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Prof. Sharada S S', initials: 'SSS' },
        7: { code: 'M23BIS601', title: 'MENTORING & COUNSELING', short: 'MENTORING', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
      },
      FRI: {
        0: { code: 'M23BXX604x', title: 'OPEN ELECTIVE - I', short: 'OE', faculty: 'Respective Department Faculty', initials: 'RDF' },
        1: { code: 'M23BCS602', title: 'MACHINE LEARNING', short: 'ML', faculty: 'Prof. Sharada S S', initials: 'SSS' },
        3: { code: 'M23BCS603A', title: 'BLOCKCHAIN TECHNOLOGY', short: 'BCT', faculty: 'Prof. Siddaraju M G', initials: 'SMG' },
        4: { code: 'M23BIS601', title: 'FULL STACK DEVELOPMENT', short: 'FSD', faculty: 'Prof. Ganavi N P', initials: 'GNP' },
        6: { code: 'M23BCS607B', title: 'DEVOPS', short: 'DEVOPS', faculty: 'Prof. Rohith Gowda K S', initials: 'RKS' },
        7: { code: 'M23BCS602', title: 'REMEDIAL / ADVANCED CODING', short: 'ML (ADV)', faculty: 'Prof. Sharada S S', initials: 'SSS' },
      },
    };
  }

  const days = ['MON', 'TUE', 'WED', 'THU', 'FRI'];
  for (const day of days) {
    for (const p of periods) {
      if (p.isBreak) {
        slots.push({
          day,
          periodIndex: p.index,
          timeRange: p.timeRange,
          courseCode: '',
          courseTitle: p.breakType === 'SHORT_BREAK' ? 'SHORT BREAK' : 'LUNCH BREAK',
          courseShortName: p.breakType === 'SHORT_BREAK' ? 'SHORT BREAK' : 'LUNCH BREAK',
          facultyUserId: '',
          facultyName: '',
          facultyInitials: '',
          room: '',
          isLab: false,
          isBreak: true,
          breakType: p.breakType,
        });
      } else {
        const item = scheduleMap[day]?.[p.index];
        slots.push({
          day,
          periodIndex: p.index,
          timeRange: p.timeRange,
          courseCode: item?.code || '',
          courseTitle: item?.title || '',
          courseShortName: item?.short || '',
          facultyUserId: item ? `user-${item.initials.toLowerCase()}` : '',
          facultyName: item?.faculty || '',
          facultyInitials: item?.initials || '',
          room: item?.isLab ? labRoom : room,
          isLab: item?.isLab || false,
          isBreak: false,
        });
      }
    }
  }

  return slots;
}

export function getInitial6thSemTimetables(): StructuredTimetable[] {
  const now = new Date().toISOString();
  const allFacultyAssignments = getInitialSubjectAllocations();

  const sections: ('Section A' | 'Section B' | 'Section C')[] = ['Section A', 'Section B', 'Section C'];
  const teachers: Record<string, string> = {
    'Section A': 'Prof. Amruth V',
    'Section B': 'Prof. Bhavya H D',
    'Section C': 'Prof. Ganavi N P',
  };
  const rooms: Record<string, string> = {
    'Section A': 'Room Number:- 301',
    'Section B': 'Room Number:- 302',
    'Section C': 'Room Number:- 303',
  };

  return sections.map((sec, idx) => {
    const secAllocations = allFacultyAssignments.filter((a) => a.section === sec);
    const legend = secAllocations.map((a) => ({
      code: a.subjectCode,
      title: a.subjectTitle,
      shortName: a.subjectShortName,
      facultyName: a.facultyName,
      facultyInitials: a.facultyInitials,
    }));

    const assignments = secAllocations.map((a) => ({
      id: a.id,
      courseCode: a.subjectCode,
      courseTitle: a.subjectTitle,
      facultyUserId: a.facultyUserId,
      facultyName: a.facultyName,
      staffId: `MITM-ISE-FAC-${a.facultyInitials}`,
      hoursPerWeek: 4,
      isLab: a.isLab || false,
      color: '#7B1113',
      facultyInitials: a.facultyInitials,
      subjectShortName: a.subjectShortName,
    }));

    return {
      id: `st-ise-6th-${sec.toLowerCase().replace(' ', '-')}`,
      departmentId: 'dept-ise',
      academicYear: '2025-26',
      semester: '6th Semester',
      section: sec,
      studentYear: 3,
      title: `WEEKLY ACADEMIC CLASS TIMETABLE - 2025-26 EVEN SEM - VI SEMESTER ${sec.toUpperCase()}`,
      roomNumber: rooms[sec],
      classTeacher: teachers[sec],
      status: 'PUBLISHED',
      isValidated: true,
      version: 1,
      isActive: true,
      facultyAssignments: assignments,
      schedule: buildMITM6thSemSchedule(sec),
      subjectLegend: legend,
      validationReport: {
        isValid: true,
        checkedAt: now,
        conflicts: [],
        warnings: [],
      },
      publishedAt: now,
      publishedBy: 'ise.admin@mitmysore.in (Prof. K. S. Manjunath)',
      retentionNote: 'Official MIT Mysore Even Semester 2025-26 Academic Class Timetable for Department of Information Science and Engineering.',
      createdAt: now,
      updatedAt: now,
    };
  });
}
