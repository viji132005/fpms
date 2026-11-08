import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import {
  StructuredTimetable,
  TimetableSlot,
  StaffProfile,
  AcademicSubject,
  SubjectAllocationRecord,
} from '../types/index.ts';
import { generateFacultyInitials } from '../utils/facultyInitials.ts';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  createDefaultMITMGrid,
  getSemestersForYear,
  getSemesterRoman,
  getOrdinalSemester,
  MITM_DAYS,
  MITM_PERIOD_DEFINITIONS,
  validateCrossSectionClashes,
} from '../utils/timetableMultiSection.ts';
import {
  CalendarDays,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  Download,
  RotateCcw,
  Send,
  History,
  ShieldCheck,
  Edit3,
  Building2,
  Users,
  BookOpen,
  Plus,
  Trash2,
  Save,
  Check,
  Eye,
  Info,
  Layers,
  ArrowRight,
  FileText,
  Printer,
  Eraser,
  Grid3X3,
  ListFilter,
  CheckCheck,
  GraduationCap,
  X,
} from 'lucide-react';

export const TimetableManagement: React.FC = () => {
  const { user, department, institution } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const isHod = user?.role === 'HOD';
  const isFaculty = user?.role === 'FACULTY' || user?.role === 'NON_TEACHING';

  const activeDeptId = user?.departmentId || department?.id || 'dept-ise';
  const activeDeptCode = department?.code || 'ISE';
  const activeDeptName = department?.name || 'Department of Information Science and Engineering';
  const activeAcademicYear = institution?.currentAcademicYear || '2026-27';

  // Navigation tabs for Admin:
  // 1. 'subjects' (Academic Subjects & Syllabus)
  // 2. 'allocation' (Faculty & Section Allocation)
  // 3. 'builder' (Interactive Timetable Builder & Multi-Section Grid)
  // 4. 'official-view' (Official MIT Mysore Print / Download Timetable)
  const [adminTab, setAdminTab] = useState<'subjects' | 'allocation' | 'builder' | 'official-view'>(
    'builder'
  );

  // Faculty tab
  const [facultyActiveTab, setFacultyActiveTab] = useState<'my-schedule' | 'dept-timetable'>('my-schedule');

  // Academic Year / Semester / Section selections
  const [selectedYear, setSelectedYear] = useState<number>(1); // 1, 2, 3, 4
  const [selectedSemester, setSelectedSemester] = useState<number>(1); // 1 to 8
  const [numberOfSections, setNumberOfSections] = useState<number>(2); // 1 to 4
  const [activeBuilderSection, setActiveBuilderSection] = useState<'ALL' | 'Section A' | 'Section B' | 'Section C' | 'Section D'>('ALL');
  const [officialPreviewSection, setOfficialPreviewSection] = useState<'ALL' | 'Section A' | 'Section B' | 'Section C' | 'Section D'>('ALL');

  // Committed Timetables Overview State (Memory-Efficient per-year snapshot)
  const [showCommittedModal, setShowCommittedModal] = useState(false);
  const [committedRecords, setCommittedRecords] = useState<any[]>([]);
  const [loadingCommitted, setLoadingCommitted] = useState(false);
  const [committedActiveYear, setCommittedActiveYear] = useState<number>(1);
  const [committedViewerSection, setCommittedViewerSection] = useState<string>('ALL');

  // Cohort metadata mapped by academic year (semester and active sections)
  const [cohortInfoByYear, setCohortInfoByYear] = useState<Record<number, { semester: number; sections: string[] }>>({
    1: { semester: 1, sections: ['Section A', 'Section B'] },
    2: { semester: 3, sections: ['Section A', 'Section B'] },
    3: { semester: 5, sections: ['Section A', 'Section B', 'Section C'] },
    4: { semester: 7, sections: ['Section A', 'Section B'] },
  });

  // Subjects state
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [showSubjectModal, setShowSubjectModal] = useState(false);
  const [editingSubject, setEditingSubject] = useState<AcademicSubject | null>(null);
  const [subjectForm, setSubjectForm] = useState({
    code: '',
    title: '',
    shortName: '',
    isLab: false,
    category: 'THEORY',
  });

  // Track active running semester per year from enrolled students (Odd Semester cycle by default)
  const [studentSemestersByYear, setStudentSemestersByYear] = useState<Record<number, number>>({
    1: 1,
    2: 3,
    3: 5,
    4: 7,
  });

  // Faculty state
  const [departmentFaculty, setDepartmentFaculty] = useState<StaffProfile[]>([]);
  const [facultySchedule, setFacultySchedule] = useState<{
    day: string;
    periodIndex: number;
    timeRange: string;
    courseCode: string;
    courseTitle: string;
    room: string;
    semester: string;
    section?: string;
  }[]>([]);

  // Subject-Faculty-Section Allocations
  const [allocations, setAllocations] = useState<SubjectAllocationRecord[]>([]);

  // Multi-Section Timetables Data
  const [sectionTimetables, setSectionTimetables] = useState<Record<string, {
    roomNumber: string;
    classTeacher: string;
    schedule: TimetableSlot[];
  }>>({
    'Section A': { roomNumber: 'Room Number:- 301', classTeacher: 'Prof. Amruth V', schedule: createDefaultMITMGrid('Section A') },
    'Section B': { roomNumber: 'Room Number:- 302', classTeacher: 'Prof. Bhavya H D', schedule: createDefaultMITMGrid('Section B') },
    'Section C': { roomNumber: 'Room Number:- 303', classTeacher: 'Prof. Ganavi N P', schedule: createDefaultMITMGrid('Section C') },
    'Section D': { roomNumber: 'Room Number:- 304', classTeacher: '', schedule: createDefaultMITMGrid('Section D') },
  });

  // Interactive Stamp Mode: selected subject code or '__ERASER__'
  const [activeStampCode, setActiveStampCode] = useState<string | null>('M23BIS601');

  // Slot custom override drawer
  const [editingSlot, setEditingSlot] = useState<{
    section: string;
    slot: TimetableSlot;
  } | null>(null);

  // Status feedback
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [crossSectionConflicts, setCrossSectionConflicts] = useState<string[]>([]);

  // Update semester list when year changes
  const allowedSemesters = getSemestersForYear(selectedYear);
  useEffect(() => {
    if (!allowedSemesters.includes(selectedSemester)) {
      setSelectedSemester(allowedSemesters[0]);
    }
  }, [selectedYear]);

  // Section names based on numberOfSections
  const sectionList = ['Section A', 'Section B', 'Section C', 'Section D'].slice(0, numberOfSections);

  // 1. Fetch Department Faculty
  const fetchFaculty = () => {
    authFetch(`/api/staff?departmentId=${encodeURIComponent(activeDeptId)}&type=teaching`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setDepartmentFaculty(data);
      })
      .catch((err) => console.warn(err));
  };

  // 2. Fetch Academic Subjects for selected year and semester
  const fetchSubjects = () => {
    setIsLoadingSubjects(true);
    authFetch(
      `/api/academic-subjects?departmentId=${encodeURIComponent(activeDeptId)}&year=${selectedYear}&semester=${selectedSemester}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        if (Array.isArray(data)) {
          setSubjects(data);
          if (data.length > 0 && !activeStampCode) {
            setActiveStampCode(data[0].code);
          }
        }
      })
      .catch((err) => console.warn(err))
      .finally(() => setIsLoadingSubjects(false));
  };

  // 3. Fetch Subject Allocations for selected year and semester
  const fetchAllocations = () => {
    authFetch(
      `/api/subject-allocations?departmentId=${encodeURIComponent(activeDeptId)}&year=${selectedYear}&semester=${selectedSemester}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: SubjectAllocationRecord[]) => {
        if (Array.isArray(data) && data.length > 0) {
          setAllocations(data);
        } else {
          // Auto-generate blank allocation rows from current subjects for each active section
          buildBlankAllocations(subjects);
        }
      })
      .catch((err) => console.warn(err));
  };

  const formatNotificationDateTime = (dateStr?: string | null) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${day}/${month}/${year} ${time}`;
  };

  // 4. Fetch Multi-Section Timetables from backend
  const fetchTimetables = () => {
    setIsLoading(true);
    authFetch(
      `/api/timetables/structured?departmentId=${encodeURIComponent(activeDeptId)}&year=${selectedYear}&semester=${encodeURIComponent(
        getOrdinalSemester(selectedSemester)
      )}`
    )
      .then((r) => (r.ok ? r.json() : []))
      .then((data: StructuredTimetable[]) => {
        const freshMap: Record<string, any> = {};
        ['Section A', 'Section B', 'Section C', 'Section D'].forEach((sec, idx) => {
          freshMap[sec] = {
            roomNumber: `Room Number:- ${301 + idx}`,
            classTeacher: '',
            schedule: createDefaultMITMGrid(sec),
          };
        });

        if (Array.isArray(data) && data.length > 0) {
          data.forEach((tt) => {
            if (freshMap[tt.section]) {
              freshMap[tt.section] = {
                roomNumber: tt.roomNumber || freshMap[tt.section].roomNumber,
                classTeacher: tt.classTeacher || freshMap[tt.section].classTeacher,
                schedule: tt.schedule && tt.schedule.length > 0 ? tt.schedule : freshMap[tt.section].schedule,
              };
            }
          });

          // Adjust number of sections to match data if sections exist
          const returnedSections = Array.from(new Set(data.map((tt) => tt.section))).filter(Boolean);
          if (returnedSections.length > 0) {
            setNumberOfSections(Math.min(4, Math.max(1, returnedSections.length)));
            if (officialPreviewSection !== 'ALL' && !returnedSections.includes(officialPreviewSection)) {
              setOfficialPreviewSection('ALL');
            }
          }
        }
        setSectionTimetables(freshMap);
      })
      .catch((err) => console.warn(err))
      .finally(() => setIsLoading(false));
  };

  const fetchCommittedRecords = async () => {
    setLoadingCommitted(true);
    try {
      const res = await authFetch(`/api/timetables/committed-records?departmentId=${encodeURIComponent(activeDeptId)}`);
      if (res.ok) {
        const json = await res.json();
        if (Array.isArray(json.records)) {
          setCommittedRecords(json.records);
          const committedOnes = json.records.filter((r: any) => r.hasCommitted && r.committedAt);
          if (committedOnes.length > 0) {
            committedOnes.sort((a: any, b: any) => new Date(b.committedAt).getTime() - new Date(a.committedAt).getTime());
            setCommittedActiveYear(committedOnes[0].year);
          } else {
            setCommittedActiveYear(1);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to load committed records:', err);
    } finally {
      setLoadingCommitted(false);
    }
  };

  const handleOpenCommittedModal = () => {
    setShowCommittedModal(true);
    setCommittedViewerSection('ALL');
    fetchCommittedRecords();
  };

  const handleLoadCommittedYear = (record: any) => {
    setSelectedYear(record.year);
    const semNum = parseInt((record.semester || '').replace(/\D/g, ''), 10);
    if (!isNaN(semNum) && semNum > 0) {
      setSelectedSemester(semNum);
    } else {
      setSelectedSemester(studentSemestersByYear[record.year] || (record.year * 2 - 1));
    }
    if (record.sections && record.sections.length > 0) {
      setNumberOfSections(Math.min(4, Math.max(1, record.sections.length)));
      setOfficialPreviewSection('ALL');
    }
    setAdminTab('official-view');
    setShowCommittedModal(false);
    setSuccessMsg(`Loaded latest committed timetable for ${record.yearLabel} (${record.semester || getOrdinalSemester(studentSemestersByYear[record.year] || record.year * 2 - 1)}).`);
  };

  // Comprehensive Cohort Data Fetcher ensuring all 4 years reflect active student semesters & sections
  const fetchCohortData = async () => {
    try {
      const [studentsRes, committedRes] = await Promise.all([
        authFetch(`/api/students?departmentId=${encodeURIComponent(activeDeptId)}&status=ACTIVE`).then((r) =>
          r.ok ? r.json() : []
        ),
        authFetch(`/api/timetables/committed-records?departmentId=${encodeURIComponent(activeDeptId)}`).then((r) =>
          r.ok ? r.json() : { records: [] }
        ),
      ]);

      const students = Array.isArray(studentsRes) ? studentsRes : [];
      const records = Array.isArray(committedRes?.records) ? committedRes.records : [];

      const semMap: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 7 };
      const infoMap: Record<number, { semester: number; sections: string[] }> = {
        1: { semester: 1, sections: ['Section A', 'Section B'] },
        2: { semester: 3, sections: ['Section A', 'Section B'] },
        3: { semester: 5, sections: ['Section A', 'Section B', 'Section C'] },
        4: { semester: 7, sections: ['Section A', 'Section B'] },
      };

      [1, 2, 3, 4].forEach((yr) => {
        const yrStudents = students.filter((s: any) => s.currentYear === yr && s.currentSemester);
        const yrRecord = records.find((r: any) => r.year === yr && r.hasCommitted);

        let semester = yr * 2 - 1;
        let sections = infoMap[yr].sections;

        if (yrStudents.length > 0) {
          const semCounts: Record<number, number> = {};
          yrStudents.forEach((s: any) => {
            const sem = s.currentSemester || (yr * 2 - 1);
            semCounts[sem] = (semCounts[sem] || 0) + 1;
          });
          const top = Object.entries(semCounts).sort((a, b) => b[1] - a[1])[0];
          semester = top ? Number(top[0]) : yr * 2 - 1;

          const studentSecs = Array.from(new Set(yrStudents.map((s: any) => s.section))).filter(Boolean) as string[];
          if (studentSecs.length > 0) {
            sections = studentSecs.sort();
          }
        } else if (yrRecord) {
          const recSem = parseInt((yrRecord.semester || '').replace(/\D/g, ''), 10);
          if (!isNaN(recSem) && recSem > 0) {
            semester = recSem;
          }
          if (yrRecord.sections && yrRecord.sections.length > 0) {
            sections = yrRecord.sections;
          }
        }

        semMap[yr] = semester;
        infoMap[yr] = { semester, sections };
      });

      setStudentSemestersByYear(semMap);
      setCohortInfoByYear(infoMap);

      if (semMap[selectedYear] && semMap[selectedYear] !== selectedSemester) {
        setSelectedSemester(semMap[selectedYear]);
      }

      const cur = infoMap[selectedYear];
      if (cur) {
        if (cur.sections.length !== numberOfSections) {
          setNumberOfSections(Math.max(1, Math.min(4, cur.sections.length)));
        }
      }
    } catch (err) {
      console.warn('Error fetching cohort data:', err);
    }
  };

  const handleSelectYear = (yr: number) => {
    setSelectedYear(yr);
    const cohort = cohortInfoByYear[yr] || {
      semester: studentSemestersByYear[yr] || (yr * 2 - 1),
      sections: yr === 3 ? ['Section A', 'Section B', 'Section C'] : ['Section A', 'Section B'],
    };
    const targetSem = studentSemestersByYear[yr] || cohort.semester || (yr * 2 - 1);
    setSelectedSemester(targetSem);
    setNumberOfSections(Math.max(1, Math.min(4, cohort.sections.length)));
    if (officialPreviewSection !== 'ALL' && !cohort.sections.includes(officialPreviewSection)) {
      setOfficialPreviewSection('ALL');
    }
  };

  // 5. Fetch Faculty's personal schedule
  const fetchPersonalSchedule = () => {
    if (!isFaculty) return;
    authFetch('/api/timetables/faculty-schedule')
      .then((r) => (r.ok ? r.json() : { schedule: [] }))
      .then((data) => {
        if (Array.isArray(data.schedule)) {
          setFacultySchedule(data.schedule);
        }
      })
      .catch((err) => console.warn(err));
  };

  useEffect(() => {
    fetchFaculty();
    fetchSubjects();
    fetchCohortData();
    if (isFaculty) {
      fetchPersonalSchedule();
    }
  }, [activeDeptId, selectedYear, selectedSemester]);

  useEffect(() => {
    fetchAllocations();
    fetchTimetables();
  }, [activeDeptId, selectedYear, selectedSemester, subjects]);

  const buildBlankAllocations = (subjList: AcademicSubject[]) => {
    const list: SubjectAllocationRecord[] = [];
    sectionList.forEach((sec) => {
      subjList.forEach((s) => {
        const defaultFac = departmentFaculty[0];
        const initials = defaultFac ? generateFacultyInitials(defaultFac.fullName) : '';
        list.push({
          id: `alloc-${sec}-${s.code}`,
          departmentId: activeDeptId,
          year: selectedYear,
          semester: selectedSemester,
          section: sec,
          subjectCode: s.code,
          subjectTitle: s.title,
          subjectShortName: s.shortName,
          facultyUserId: defaultFac?.userId || '',
          facultyName: defaultFac?.fullName || '',
          facultyInitials: initials,
          isLab: s.isLab,
        });
      });
    });
    setAllocations(list);
  };

  // SUBJECT CRUD
  const handleOpenAddSubject = () => {
    setEditingSubject(null);
    setSubjectForm({
      code: `21IS${selectedYear * 10 + (subjects.length + 1)}`,
      title: '',
      shortName: '',
      isLab: false,
      category: 'THEORY',
    });
    setShowSubjectModal(true);
  };

  const handleOpenEditSubject = (subj: AcademicSubject) => {
    setEditingSubject(subj);
    setSubjectForm({
      code: subj.code,
      title: subj.title,
      shortName: subj.shortName,
      isLab: !!subj.isLab,
      category: subj.category || (subj.isLab ? 'LAB' : 'THEORY'),
    });
    setShowSubjectModal(true);
  };

  const handleSaveSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setErrorMsg(null);

    const payload = {
      departmentId: activeDeptId,
      year: selectedYear,
      semester: selectedSemester,
      code: subjectForm.code.trim().toUpperCase(),
      title: subjectForm.title.trim(),
      shortName: subjectForm.shortName.trim().toUpperCase() || subjectForm.code.trim().toUpperCase(),
      isLab: subjectForm.isLab,
      category: subjectForm.category,
    };

    try {
      const url = editingSubject
        ? `/api/academic-subjects/${editingSubject.id}`
        : `/api/academic-subjects`;
      const method = editingSubject ? 'PUT' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save subject.');
        return;
      }

      setShowSubjectModal(false);
      setSuccessMsg(
        editingSubject
          ? `Subject ${payload.code} (${payload.shortName}) updated successfully.`
          : `New Subject ${payload.code} (${payload.shortName}) added to ${getOrdinalSemester(selectedSemester)}!`
      );
      fetchSubjects();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubject = async (id: string, code: string) => {
    try {
      const res = await authFetch(`/api/academic-subjects/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setSuccessMsg(`Subject ${code} removed.`);
        fetchSubjects();
      }
    } catch (err) {
      console.warn(err);
    }
  };

  const handleClearCurriculum = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch('/api/academic-subjects/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ departmentId: activeDeptId }),
      });
      if (res.ok) {
        setSuccessMsg('All department academic curriculum subjects have been cleared.');
        fetchSubjects();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to reset curriculum.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetMITMSubjects = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch('/api/academic-subjects/seed-mitm', { method: 'POST' });
      if (res.ok) {
        setSuccessMsg('Academic subjects re-seeded with official MIT Mysore syllabus courses!');
        fetchSubjects();
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setActionLoading(false);
    }
  };

  // ALLOCATION HANDLERS
  const handleUpdateAllocationFaculty = (
    section: string,
    subjectCode: string,
    facultyUserId: string
  ) => {
    const fac = departmentFaculty.find((f) => f.userId === facultyUserId);
    const initials = fac ? generateFacultyInitials(fac.fullName) : '';

    setAllocations((prev) => {
      const index = prev.findIndex((a) => a.section === section && a.subjectCode === subjectCode);
      if (index >= 0) {
        const copy = [...prev];
        copy[index] = {
          ...copy[index],
          facultyUserId,
          facultyName: fac?.fullName || 'Assigned Faculty',
          facultyInitials: initials,
        };
        return copy;
      } else {
        const subj = subjects.find((s) => s.code === subjectCode);
        return [
          ...prev,
          {
            id: `alloc-${section}-${subjectCode}`,
            departmentId: activeDeptId,
            year: selectedYear,
            semester: selectedSemester,
            section,
            subjectCode,
            subjectTitle: subj?.title || subjectCode,
            subjectShortName: subj?.shortName || subjectCode,
            facultyUserId,
            facultyName: fac?.fullName || 'Assigned Faculty',
            facultyInitials: initials,
            isLab: subj?.isLab || false,
          },
        ];
      }
    });
  };

  const handleUpdateAllocationInitials = (section: string, subjectCode: string, customInitials: string) => {
    setAllocations((prev) => {
      const copy = [...prev];
      const index = copy.findIndex((a) => a.section === section && a.subjectCode === subjectCode);
      if (index >= 0) {
        copy[index] = { ...copy[index], facultyInitials: customInitials.toUpperCase() };
      }
      return copy;
    });
  };

  const handleSaveAllocations = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch('/api/subject-allocations/batch-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: activeDeptId,
          year: selectedYear,
          semester: selectedSemester,
          allocations,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save faculty allocations.');
        return;
      }
      setSuccessMsg('Faculty-to-subject assignments saved! Now ready for Timetable Creation.');
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  // INTERACTIVE PALETTE & STAMP MODE LOGIC
  const handleSlotClick = (section: string, day: string, periodIndex: number) => {
    if (!isAdmin) return;
    const def = MITM_PERIOD_DEFINITIONS.find((p) => p.index === periodIndex);
    if (def?.isBreak) return; // Cannot edit breaks

    setSectionTimetables((prev) => {
      const secData = prev[section];
      if (!secData) return prev;

      const scheduleCopy = [...secData.schedule];
      const slotIndex = scheduleCopy.findIndex((s) => s.day === day && s.periodIndex === periodIndex);
      if (slotIndex < 0) return prev;

      if (activeStampCode === '__ERASER__') {
        // Clear slot
        scheduleCopy[slotIndex] = {
          ...scheduleCopy[slotIndex],
          courseCode: '',
          courseTitle: '',
          courseShortName: '',
          facultyUserId: '',
          facultyName: '',
          facultyInitials: '',
          isLab: false,
        };
      } else if (activeStampCode) {
        // Stamp assigned subject and auto-map faculty assigned to this specific section!
        const alloc = allocations.find(
          (a) => a.section === section && a.subjectCode === activeStampCode
        );
        const subj = subjects.find((s) => s.code === activeStampCode);

        scheduleCopy[slotIndex] = {
          ...scheduleCopy[slotIndex],
          courseCode: activeStampCode,
          courseTitle: subj?.title || alloc?.subjectTitle || activeStampCode,
          courseShortName: subj?.shortName || alloc?.subjectShortName || activeStampCode,
          facultyUserId: alloc?.facultyUserId || '',
          facultyName: alloc?.facultyName || '',
          facultyInitials: alloc?.facultyInitials || '',
          isLab: subj?.isLab || alloc?.isLab || false,
        };
      }

      return {
        ...prev,
        [section]: {
          ...secData,
          schedule: scheduleCopy,
        },
      };
    });
  };

  // ONE-CLICK SEED MIT MYSORE 6TH SEM TIMETABLE
  const handleLoadMITM6thSemTemplate = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await authFetch('/api/timetables/seed-mitm-6th-sem', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to seed 6th sem template.');
        return;
      }
      setSelectedYear(3);
      setSelectedSemester(6);
      setNumberOfSections(3);
      setSuccessMsg('Loaded official MIT Mysore 6th Semester Weekly Academic Timetable for Sections A, B, and C!');
      fetchSubjects();
      fetchAllocations();
      fetchTimetables();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  // VALIDATE ALL SECTIONS
  const handleValidateAllSections = () => {
    const list = sectionList.map((sec) => ({
      section: sec,
      schedule: sectionTimetables[sec]?.schedule || [],
    }));
    const report = validateCrossSectionClashes(list);
    setCrossSectionConflicts(report.clashes);

    if (report.isValid) {
      setSuccessMsg('Validation Passed: Zero cross-section faculty clashes detected across all sections!');
    } else {
      setErrorMsg(`Detected ${report.clashes.length} scheduling conflict(s). Please review conflict alerts.`);
    }
    return report.isValid;
  };

  // SAVE OR PUBLISH ALL SECTIONS
  const handleSaveOrPublishMultiSection = async (publishAll: boolean) => {
    const isValid = handleValidateAllSections();
    if (publishAll && !isValid) {
      setErrorMsg('Mandatory Rule: Cannot commit timetables with unresolved cross-section clashes.');
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);

    const timetablesPayload = sectionList.map((sec) => {
      const secData = sectionTimetables[sec];
      const secAllocations = allocations.filter((a) => a.section === sec);
      const legend = secAllocations.map((a) => ({
        code: a.subjectCode,
        title: a.subjectTitle,
        shortName: a.subjectShortName,
        facultyName: a.facultyName,
        facultyInitials: a.facultyInitials,
      }));

      return {
        section: sec,
        title: `WEEKLY ACADEMIC CLASS TIMETABLE - ${activeAcademicYear} ${selectedSemester % 2 === 0 ? 'EVEN SEM' : 'ODD SEM'} - ${getSemesterRoman(selectedSemester)} SEMESTER ${sec.toUpperCase()}`,
        roomNumber: secData.roomNumber,
        classTeacher: secData.classTeacher,
        schedule: secData.schedule,
        subjectLegend: legend,
        facultyAssignments: secAllocations.map((a) => ({
          id: a.id,
          courseCode: a.subjectCode,
          courseTitle: a.subjectTitle,
          facultyUserId: a.facultyUserId,
          facultyName: a.facultyName,
          staffId: '',
          hoursPerWeek: 4,
          isLab: a.isLab || false,
          color: '#7B1113',
          facultyInitials: a.facultyInitials,
          subjectShortName: a.subjectShortName,
        })),
      };
    });

    try {
      const res = await authFetch('/api/timetables/multi-section-save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          departmentId: activeDeptId,
          year: selectedYear,
          semester: getOrdinalSemester(selectedSemester),
          timetables: timetablesPayload,
          publishAll,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to commit multi-section timetables.');
        return;
      }

      setSuccessMsg(
        publishAll
          ? `All ${sectionList.length} section timetables officially COMMITTED! Faculty schedules updated and HOD notified.`
          : `Saved ${sectionList.length} section timetable drafts successfully.`
      );
      fetchTimetables();
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setActionLoading(false);
    }
  };

  // CLEAR GRIDS HANDLERS
  const handleClearAllGrids = () => {
    setSectionTimetables((prev) => {
      const resetMap: Record<string, any> = {};
      for (const sec of ['Section A', 'Section B', 'Section C', 'Section D']) {
        resetMap[sec] = {
          roomNumber: prev[sec]?.roomNumber || '',
          classTeacher: prev[sec]?.classTeacher || '',
          schedule: createDefaultMITMGrid(sec),
        };
      }
      return resetMap;
    });
    setSuccessMsg('All section grids cleared to empty! Select any subject from the palette and click slots to assign.');
  };

  const handleClearSingleSection = (sec: string) => {
    setSectionTimetables((prev) => ({
      ...prev,
      [sec]: {
        ...prev[sec],
        schedule: createDefaultMITMGrid(sec),
      },
    }));
    setSuccessMsg(`${sec} grid cleared to empty.`);
  };

  // PRINT / DOWNLOAD HANDLERS
  const handlePrintOfficialTimetable = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    setActionLoading(true);
    try {
      const sectionsToPrint = officialPreviewSection === 'ALL' ? sectionList : [officialPreviewSection];
      if (sectionsToPrint.length === 0) return;

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 16;
      const availWidth = pageWidth - margin * 2;
      const availHeight = pageHeight - margin * 2;

      let renderedCount = 0;
      for (let i = 0; i < sectionsToPrint.length; i++) {
        const sec = sectionsToPrint[i];
        const cardId = `official-mitm-timetable-card-${sec.replace(/\s+/g, '_')}`;
        let el = document.getElementById(cardId) || document.getElementById('official-mitm-timetable-card');
        if (!el) continue;

        const scrollWidth = el.scrollWidth || el.offsetWidth;
        const scrollHeight = el.scrollHeight || el.offsetHeight;

        const dataUrl = await toPng(el, {
          quality: 0.98,
          backgroundColor: '#ffffff',
          pixelRatio: 2.3,
          skipFonts: true,
          fontEmbedCSS: '',
          width: scrollWidth,
          height: scrollHeight,
          style: {
            transform: 'none',
            maxHeight: 'none',
            maxWidth: 'none',
            overflow: 'visible',
          },
        });

        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
        });

        if (renderedCount > 0) {
          pdf.addPage('a4', 'portrait');
        }

        const scale = Math.min(availWidth / img.width, availHeight / img.height);
        const renderWidth = img.width * scale;
        const renderHeight = img.height * scale;
        const posX = margin + (availWidth - renderWidth) / 2;
        const posY = margin + (availHeight - renderHeight) / 2;

        pdf.addImage(dataUrl, 'PNG', posX, posY, renderWidth, renderHeight, undefined, 'FAST');
        renderedCount++;
      }

      if (renderedCount === 0) {
        throw new Error('No timetable elements found for export.');
      }

      const fileLabel = officialPreviewSection === 'ALL' ? 'All_Sections' : officialPreviewSection.replace(/\s+/g, '_');
      pdf.save(
        `MIT_Mysore_Timetable_${activeDeptCode}_Sem${selectedSemester}_${fileLabel}.pdf`
      );
      setSuccessMsg(`Official Timetable PDF (${fileLabel}) generated and downloaded completely!`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Direct PDF export encountered an issue. Using Print dialog as fallback.');
      window.print();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    setActionLoading(true);
    try {
      const sec = officialPreviewSection === 'ALL' ? sectionList[0] || 'Section A' : officialPreviewSection;
      const cardId = `official-mitm-timetable-card-${sec.replace(/\s+/g, '_')}`;
      const el = document.getElementById(cardId) || document.getElementById('official-mitm-timetable-card');
      if (!el) return;

      const dataUrl = await toPng(el, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });
      const link = document.createElement('a');
      link.download = `MIT_Mysore_Timetable_${activeDeptCode}_Sem${selectedSemester}_${sec.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      setSuccessMsg(`Timetable image (${sec}) downloaded successfully!`);
    } catch (err) {
      console.error(err);
      setErrorMsg('Image export failed.');
    } finally {
      setActionLoading(false);
    }
  };

  // Active Subject for Stamp Tooltip
  const currentActiveSubject = subjects.find((s) => s.code === activeStampCode);

  return (
    <div className="space-y-6 print:m-0 print:p-0">
      {/* Institutional Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#7B1113] to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-rose-950 flex flex-col md:flex-row md:items-center justify-between gap-5 print:hidden">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/20 flex items-center gap-1.5 font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-slate-300" />
              {isAdmin ? 'ADMIN AUTHORITATIVE SCHEDULING' : `${user?.role} TIMETABLE PORTAL`}
            </span>
          </div>
          <h1 className="text-xl font-extrabold tracking-tight">
            Faculty Academic Subject Assignment and Timetable Creation
          </h1>
          <p className="text-xs text-slate-300 max-w-2xl">
            Faculty academic subject assignment and timetable creation.
          </p>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center justify-between gap-2 shadow-sm animate-in fade-in-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold text-base cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center justify-between gap-2 shadow-sm animate-in fade-in-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-500 hover:text-rose-700 font-bold text-base cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}

      {crossSectionConflicts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5 shadow-sm print:hidden">
          <div className="font-bold flex items-center gap-2 text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Cross-Section Clashes Detected ({crossSectionConflicts.length}):</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 font-mono text-[11px]">
            {crossSectionConflicts.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Admin Central Nav Tabs */}
      {isAdmin && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-4 flex-wrap print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAdminTab('subjects')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                adminTab === 'subjects'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>1. Academic Subjects ({subjects.length})</span>
            </button>

            <button
              onClick={() => setAdminTab('allocation')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                adminTab === 'allocation'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>2. Faculty & Section Allocation</span>
            </button>

            <button
              onClick={() => setAdminTab('builder')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                adminTab === 'builder'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Grid3X3 className="w-3.5 h-3.5" />
              <span>3. Timetable Creation (Multi-Section Grid)</span>
            </button>

            <button
              onClick={() => setAdminTab('official-view')}
              className={`px-3.5 py-2 text-xs font-bold rounded-xl flex items-center gap-2 transition-all cursor-pointer ${
                adminTab === 'official-view'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>4. Official Timetable View & Print</span>
            </button>
          </div>

          {/* Dynamic Cohort-Aware Year & Semester Display */}
          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((yr) => {
                const isSelected = selectedYear === yr;
                return (
                  <button
                    key={yr}
                    onClick={() => handleSelectYear(yr)}
                    className={`px-3 py-1.5 rounded-lg text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7B1113] text-white font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year</span>
                  </button>
                );
              })}
            </div>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-[#7B1113] border border-rose-200 rounded-lg font-bold text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#7B1113]" />
              <span>
                {getOrdinalSemester(selectedSemester)} ({getSemesterRoman(selectedSemester)} Sem)
              </span>
            </div>

            {adminTab !== 'subjects' && (
              <>
                <span className="text-slate-300">|</span>
                <span className="text-slate-500 font-medium">Sections:</span>
                <select
                  value={numberOfSections}
                  onChange={(e) => setNumberOfSections(Number(e.target.value))}
                  className="font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
                >
                  <option value={1}>1 Section (A)</option>
                  <option value={2}>2 Sections (A, B)</option>
                  <option value={3}>3 Sections (A, B, C)</option>
                  <option value={4}>4 Sections (A, B, C, D)</option>
                </select>
              </>
            )}
          </div>
        </div>
      )}

      {/* Faculty Portal Top Nav Tabs & Year Switcher */}
      {isFaculty && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-4 flex-wrap print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFacultyActiveTab('my-schedule')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                facultyActiveTab === 'my-schedule'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>My Teaching Schedule ({facultySchedule.length} Slots)</span>
            </button>
            <button
              onClick={() => setFacultyActiveTab('dept-timetable')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-2 ${
                facultyActiveTab === 'dept-timetable'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Department Committed Timetables</span>
            </button>
          </div>

          {facultyActiveTab === 'dept-timetable' && (
            <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 text-xs">
              <span className="text-[11px] font-bold text-slate-500 pl-2">Select Year:</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((yr) => {
                  const isSelected = selectedYear === yr;
                  const sem = studentSemestersByYear[yr] || (yr * 2 - 1);
                  return (
                    <button
                      key={yr}
                      onClick={() => handleSelectYear(yr)}
                      className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#7B1113] text-white font-bold shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      }`}
                    >
                      <span>{yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year</span>
                    </button>
                  );
                })}
              </div>

              <span className="text-slate-300">|</span>

              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-[#7B1113] border border-rose-200 rounded-lg font-bold text-xs">
                <Calendar className="w-3.5 h-3.5 text-[#7B1113]" />
                <span>
                  {getOrdinalSemester(selectedSemester)} ({getSemesterRoman(selectedSemester)} Sem)
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HOD Portal Navigation & Year Switcher */}
      {isHod && (
        <div className="flex items-center justify-between border-b border-slate-200 pb-2 gap-4 flex-wrap print:hidden">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-[#7B1113]" />
              HOD Academic Timetables View:
            </span>
          </div>

          <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-slate-200 text-xs">
            <span className="text-[11px] font-bold text-slate-500 pl-2">Select Year:</span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4].map((yr) => {
                const isSelected = selectedYear === yr;
                const sem = studentSemestersByYear[yr] || (yr * 2 - 1);
                return (
                  <button
                    key={yr}
                    onClick={() => handleSelectYear(yr)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[#7B1113] text-white font-bold shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span>{yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year</span>
                  </button>
                );
              })}
            </div>

            <span className="text-slate-300">|</span>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-[#7B1113] border border-rose-200 rounded-lg font-bold text-xs">
              <Calendar className="w-3.5 h-3.5 text-[#7B1113]" />
              <span>
                {getOrdinalSemester(selectedSemester)} ({getSemesterRoman(selectedSemester)} Sem)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: ACADEMIC SUBJECTS & SYLLABUS MANAGEMENT */}
      {/* ============================================================== */}
      {isAdmin && adminTab === 'subjects' && (
        <div className="space-y-4 animate-in fade-in-50 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-[#7B1113]" />
                <span>
                  Academic Subjects: {selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year · {getOrdinalSemester(selectedSemester)} ({getSemesterRoman(selectedSemester)} Sem)
                </span>
              </h2>
            </div>

            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                onClick={handleClearCurriculum}
                className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer"
                title="Clear all academic subjects for this department"
              >
                Reset MITM Curriculum
              </button>
              <button
                onClick={handleResetMITMSubjects}
                className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                title="Load official MIT Mysore syllabus courses"
              >
                Load Official Syllabus
              </button>
              <button
                onClick={handleOpenAddSubject}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Add Academic Subject</span>
              </button>
            </div>
          </div>

          {/* Subjects Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Subject Code</th>
                  <th className="py-3 px-4">Short Name</th>
                  <th className="py-3 px-4">Official Subject Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoadingSubjects ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400">
                      Loading academic subjects...
                    </td>
                  </tr>
                ) : subjects.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500">
                      No subjects configured for Year {selectedYear} Sem {selectedSemester}.
                      Click &quot;Add Academic Subject&quot; or &quot;Load Official Syllabus&quot;.
                    </td>
                  </tr>
                ) : (
                  subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-[#7B1113]">
                        {sub.code}
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-mono font-bold px-2 py-0.5 rounded bg-rose-50 text-[#7B1113] border border-rose-200 text-[11px]">
                          {sub.shortName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {sub.title}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            sub.isLab
                              ? 'bg-amber-100 text-amber-800'
                              : sub.category === 'PROJECT'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {sub.category || (sub.isLab ? 'LAB' : 'THEORY')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEditSubject(sub)}
                            className="p-1.5 text-slate-500 hover:text-[#7B1113] hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit Subject"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubject(sub.id, sub.code)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Subject"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: FACULTY & SECTION ALLOCATION */}
      {/* ============================================================== */}
      {isAdmin && adminTab === 'allocation' && (
        <div className="space-y-4 animate-in fade-in-50 print:hidden">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Users className="w-4 h-4 text-[#7B1113]" />
                <span>
                  Faculty & Section Assignment: Year {selectedYear} · Sem {selectedSemester}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Assign which teaching faculty handles each subject per section. Faculty initials are automatically generated from their names for compact timetable stamping.
              </p>
            </div>

            <button
              onClick={handleSaveAllocations}
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Faculty Allocations</span>
            </button>
          </div>

          {/* Allocation Grid Per Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sectionList.map((sec) => (
              <div
                key={sec}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-900">{sec}</span>
                    <span className="text-[10px] font-mono text-slate-500">
                      ({getOrdinalSemester(selectedSemester)})
                    </span>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-[#7B1113] border border-rose-200">
                    {subjects.length} Subjects
                  </span>
                </div>

                <div className="p-4 space-y-3.5 divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[550px]">
                  {subjects.map((sub) => {
                    const currentAlloc = allocations.find(
                      (a) => a.section === sec && a.subjectCode === sub.code
                    );
                    const initials = currentAlloc?.facultyInitials || '';

                    return (
                      <div key={sub.code} className="pt-3 first:pt-0 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-black text-[#7B1113]">
                              {sub.shortName}
                            </span>
                            <span className="text-[10px] font-mono text-slate-400">
                              {sub.code}
                            </span>
                          </div>
                          {initials && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                              Initials: {initials}
                            </span>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-700 font-medium truncate">
                          {sub.title}
                        </div>

                        {/* Faculty Select and Initials Input */}
                        <div className="grid grid-cols-3 gap-2">
                          <div className="col-span-2">
                            <select
                              value={currentAlloc?.facultyUserId || ''}
                              onChange={(e) =>
                                handleUpdateAllocationFaculty(sec, sub.code, e.target.value)
                              }
                              className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-1 focus:ring-[#7B1113] truncate cursor-pointer"
                            >
                              <option value="">-- Select Faculty --</option>
                              {departmentFaculty.map((f) => (
                                <option key={f.userId} value={f.userId}>
                                  {f.fullName} ({generateFacultyInitials(f.fullName)})
                                </option>
                              ))}
                              <option value="user-rdf">Respective Dept Faculty (RDF)</option>
                              <option value="user-all">All Dept Faculty Guides (ALL)</option>
                              <option value="user-pt">Placement Trainers (PT)</option>
                            </select>
                          </div>
                          <div>
                            <input
                              type="text"
                              maxLength={6}
                              placeholder="Initials"
                              value={initials}
                              onChange={(e) =>
                                handleUpdateAllocationInitials(sec, sub.code, e.target.value)
                              }
                              className="w-full text-xs font-mono font-bold text-center py-1.5 px-1 rounded-xl border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7B1113] uppercase"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: TIMETABLE CREATION & MULTI-SECTION GRID (STAMP MODE) */}
      {/* ============================================================== */}
      {isAdmin && adminTab === 'builder' && (
        <div className="space-y-4 animate-in fade-in-50 print:hidden">
          {/* Controls & Stamp Palette Bar */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <Grid3X3 className="w-4 h-4 text-[#7B1113]" />
                  <span>
                    Multi-Section Timetable Grid: {getOrdinalSemester(selectedSemester)} ({getSemesterRoman(selectedSemester)} Sem)
                  </span>
                </h2>
              </div>

              {/* Actions: Clear All, Validate */}
              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <button
                  onClick={handleClearAllGrids}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                  title="Wipes all slots to blank so you can mark up afresh"
                >
                  <Eraser className="w-3.5 h-3.5 text-rose-600" />
                  <span>Clear All Grids</span>
                </button>
                <button
                  onClick={handleValidateAllSections}
                  className="px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Validate All Sections</span>
                </button>
              </div>
            </div>

            {/* SUBJECT PALETTE (CONTINUOUS STAMP MODE) */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Interactive Subject Palette:
                  </span>
                  {activeStampCode && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#7B1113] text-white font-bold flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      Active Stamp: {activeStampCode === '__ERASER__' ? 'ERASER (Clear Slot)' : currentActiveSubject?.shortName || activeStampCode}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {subjects.map((sub) => {
                  const isSelected = activeStampCode === sub.code;
                  return (
                    <button
                      key={sub.code}
                      onClick={() => setActiveStampCode(sub.code)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#7B1113] text-white shadow-md ring-2 ring-[#7B1113] ring-offset-2'
                          : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      <span>{sub.shortName}</span>
                      <span className="text-[10px] opacity-75 font-normal">
                        ({sub.isLab ? 'LAB' : 'THEORY'})
                      </span>
                    </button>
                  );
                })}

                {/* Eraser / Clear Slot Tool */}
                <button
                  onClick={() => setActiveStampCode('__ERASER__')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    activeStampCode === '__ERASER__'
                      ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-600 ring-offset-2'
                      : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
                  }`}
                >
                  <Eraser className="w-3.5 h-3.5" />
                  <span>Clear / Eraser</span>
                </button>
              </div>
            </div>

            {/* View Switch: All Sections side-by-side or Single Section focused */}
            <div className="flex items-center justify-between border-t border-slate-100 pt-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-600">View Grid:</span>
                <button
                  onClick={() => setActiveBuilderSection('ALL')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                    activeBuilderSection === 'ALL'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  All {numberOfSections} Sections Simultaneously
                </button>
                {sectionList.map((sec) => (
                  <button
                    key={sec}
                    onClick={() => setActiveBuilderSection(sec as any)}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                      activeBuilderSection === sec
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {sec} Only
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Render Sections Grids */}
          {sectionList
            .filter((sec) => activeBuilderSection === 'ALL' || activeBuilderSection === sec)
            .map((sec) => {
              const secData = sectionTimetables[sec] || {
                roomNumber: '',
                classTeacher: '',
                schedule: createDefaultMITMGrid(sec),
              };

              return (
                <div
                  key={sec}
                  className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* Section Header: Room Number and Class Teacher */}
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-sm text-slate-900">
                        {sec}
                      </span>
                      <span className="text-xs text-[#7B1113] font-bold">
                        {getSemesterRoman(selectedSemester)} SEMESTER ({getOrdinalSemester(selectedSemester)})
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Room Number:</span>
                        <input
                          type="text"
                          value={secData.roomNumber}
                          placeholder="e.g. Room Number:- 301"
                          onChange={(e) =>
                            setSectionTimetables((prev) => ({
                              ...prev,
                              [sec]: { ...prev[sec], roomNumber: e.target.value },
                            }))
                          }
                          className="px-2 py-1 text-xs rounded-lg border border-slate-200 font-mono focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                        />
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium">Class Teacher:</span>
                        <input
                          type="text"
                          value={secData.classTeacher}
                          placeholder="e.g. Prof. Amruth V"
                          onChange={(e) =>
                            setSectionTimetables((prev) => ({
                              ...prev,
                              [sec]: { ...prev[sec], classTeacher: e.target.value },
                            }))
                          }
                          className="px-2 py-1 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleClearSingleSection(sec)}
                        className="px-2.5 py-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                        title={`Clear all slots in ${sec}`}
                      >
                        <Eraser className="w-3 h-3 text-rose-500" />
                        <span>Clear {sec}</span>
                      </button>
                    </div>
                  </div>

                  {/* Section Timetable Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold">
                          <th className="py-2.5 px-3 border-r border-slate-200 w-20">DAY</th>
                          <th className="py-2.5 px-2 border-r border-slate-200">
                            09.00am to 10.00am
                          </th>
                          <th className="py-2.5 px-2 border-r border-slate-200">
                            10.00am to 11.00am
                          </th>
                          <th className="py-2.5 px-2 border-r border-slate-200 bg-amber-50/70 text-amber-900 font-bold text-[10px] w-24">
                            11.00am to 11.25am
                            <br />
                            <span className="text-[9px] font-normal">SHORT BREAK</span>
                          </th>
                          <th className="py-2.5 px-2 border-r border-slate-200">
                            11.25am to 12.20pm
                          </th>
                          <th className="py-2.5 px-2 border-r border-slate-200">
                            12.20pm to 01.15pm
                          </th>
                          <th className="py-2.5 px-2 border-r border-slate-200 bg-amber-50/70 text-amber-900 font-bold text-[10px] w-24">
                            01.15pm to 02.00pm
                            <br />
                            <span className="text-[9px] font-normal">LUNCH BREAK</span>
                          </th>
                          <th className="py-2.5 px-2 border-r border-slate-200">
                            02.00pm to 03.00pm
                          </th>
                          <th className="py-2.5 px-2">
                            03.00pm to 04.00pm
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {MITM_DAYS.map((day) => (
                          <tr key={day} className="border-b border-slate-200 hover:bg-slate-50/40">
                            <td className="py-3 px-3 border-r border-slate-200 font-bold font-mono text-slate-800 bg-slate-50">
                              {day}
                            </td>

                            {MITM_PERIOD_DEFINITIONS.map((def) => {
                              if (def.isBreak) {
                                return (
                                  <td
                                    key={def.index}
                                    className="py-3 px-1 border-r border-slate-200 bg-amber-50/30 text-amber-800 text-[10px] font-bold select-none"
                                  >
                                    {def.label}
                                  </td>
                                );
                              }

                              const slot = secData.schedule.find(
                                (s) => s.day === day && s.periodIndex === def.index
                              );

                              const hasCourse = !!slot?.courseCode;
                              const isLab = !!slot?.isLab;

                              return (
                                <td
                                  key={def.index}
                                  onClick={() => handleSlotClick(sec, day, def.index)}
                                  className={`py-2 px-1.5 border-r border-slate-200 h-16 min-w-[120px] transition-all cursor-pointer relative group ${
                                    hasCourse
                                      ? isLab
                                        ? 'bg-amber-50/90 hover:bg-amber-100/90 text-amber-950'
                                        : 'bg-rose-50/70 hover:bg-rose-100/70 text-slate-900'
                                      : 'hover:bg-slate-100/80 bg-white'
                                  }`}
                                  title={hasCourse ? `${slot?.courseTitle} (${slot?.facultyName})` : 'Click to stamp selected subject'}
                                >
                                  {hasCourse ? (
                                    <div className="flex flex-col items-center justify-center space-y-0.5">
                                      <span className="font-extrabold font-mono text-xs text-[#7B1113]">
                                        {slot?.courseShortName || slot?.courseCode}
                                      </span>
                                      <span className="font-mono text-[10px] font-bold text-slate-600 bg-white/70 px-1.5 py-0.2 rounded border border-slate-200">
                                        {slot?.facultyInitials || '—'}
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="text-slate-300 text-[11px] font-mono group-hover:text-slate-500">
                                      +
                                    </div>
                                  )}
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: OFFICIAL MIT MYSORE TIMETABLE VIEW & PRINT (EXACT PDF MATCH) */}
      {/* ============================================================== */}
      {((isAdmin && adminTab === 'official-view') || isHod || (isFaculty && facultyActiveTab === 'dept-timetable')) && (
        <div className="space-y-4">
          {/* Print & Action Bar (hidden in physical printout) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setOfficialPreviewSection('ALL')}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                  officialPreviewSection === 'ALL'
                    ? 'bg-[#7B1113] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                All Sections
              </button>
              {sectionList.map((sec) => (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setOfficialPreviewSection(sec as any)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                    officialPreviewSection === sec
                      ? 'bg-[#7B1113] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {sec}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={handleDownloadPDF}
                disabled={actionLoading}
                className="px-3.5 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Directly generates and downloads high-res PDF file"
              >
                <Download className="w-4 h-4" />
                <span>Download PDF</span>
              </button>
              <button
                onClick={handleDownloadImage}
                disabled={actionLoading}
                className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                title="Download as PNG image to share easily"
              >
                <Download className="w-4 h-4 text-slate-600" />
                <span>Download Image (PNG)</span>
              </button>
              {isAdmin && (
                <button
                  onClick={handleOpenCommittedModal}
                  className="px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
                  title="View the latest committed timetable records for 1st, 2nd, 3rd, and 4th Year cohorts"
                >
                  <History className="w-4 h-4 text-[#7B1113]" />
                  <span>View Committed Timetables</span>
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => handleSaveOrPublishMultiSection(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  title="Commit timetable and publish all sections for this academic year"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-200" />
                  <span>Commit Timetable</span>
                </button>
              )}
            </div>
          </div>

          {/* OFFICIAL MIT MYSORE TIMETABLE CARDS (PRINT MEDIA EXACT) */}
          <div className="space-y-6">
            {(officialPreviewSection === 'ALL' ? sectionList : [officialPreviewSection]).map((sec) => {
              const secTimetable = sectionTimetables[sec] || {
                roomNumber: `Room Number:- ${301 + sectionList.indexOf(sec)}`,
                classTeacher: 'Class Coordinator',
                schedule: createDefaultMITMGrid(sec),
              };
              const secAllocations = allocations.filter((a) => a.section === sec);

              return (
                <div
                  key={sec}
                  id={`official-mitm-timetable-card-${sec.replace(/\s+/g, '_')}`}
                  className="bg-white p-8 rounded-2xl border border-slate-300 shadow-md font-sans text-slate-900 print:border-none print:shadow-none print:p-0 print:m-0"
                >
                  {/* Header with MIT Mysore Logo & Institutional Information */}
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                    <div className="flex items-center gap-4">
                      <img
                        src="/assets/aistudio/mit_logo_e728531b.webp"
                        alt="Maharaja Institute of Technology Mysore Crest"
                        className="w-16 h-16 object-contain shrink-0"
                      />
                      <div>
                        <h2 className="text-lg font-black tracking-tight uppercase text-slate-900">
                          MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE
                        </h2>
                        <h3 className="text-xs font-bold tracking-wide uppercase text-slate-800">
                          {activeDeptName.toUpperCase().startsWith('DEPARTMENT OF')
                            ? activeDeptName.toUpperCase()
                            : `DEPARTMENT OF ${activeDeptName.toUpperCase()}`}
                        </h3>
                        <p className="text-[11px] text-slate-600 font-medium">
                          Belawadi, Srirangapatna Taluk, Mandya - 571 477 · Affiliated to VTU, Belagavi
                        </p>
                      </div>
                    </div>

                    <div className="text-right font-mono text-xs space-y-0.5">
                      <div className="font-bold text-[#7B1113]">ACADEMIC YEAR {activeAcademicYear}</div>
                      <div className="text-slate-600">
                        {selectedSemester % 2 === 0 ? 'EVEN SEMESTER' : 'ODD SEMESTER'}
                      </div>
                      <div className="text-[10px] text-slate-500">VTU SCHEME 2022/2023</div>
                    </div>
                  </div>

                  {/* Document Title & Class Information Banner */}
                  <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-300 mb-4">
                    <h1 className="text-sm font-black tracking-wider uppercase text-slate-900">
                      WEEKLY ACADEMIC CLASS TIMETABLE – {activeAcademicYear} {selectedSemester % 2 === 0 ? 'EVEN SEM' : 'ODD SEM'}
                    </h1>
                    <div className="flex items-center justify-between px-6 text-xs font-bold text-slate-800 mt-1">
                      <span>Class: {getSemesterRoman(selectedSemester)} SEMESTER SECTION &apos;{sec.replace('Section ', '')}&apos;</span>
                      <span>{secTimetable.roomNumber || 'Room Number:- 301'}</span>
                      <span>Class Teacher: {secTimetable.classTeacher || 'Class Coordinator'}</span>
                    </div>
                  </div>

                  {/* The Strict MIT Mysore Weekly Schedule Table */}
                  <table className="w-full border-collapse border border-slate-900 text-center text-xs mb-5">
                    <thead>
                      <tr className="bg-slate-200 border-b border-slate-900 text-slate-900 font-black">
                        <th className="border border-slate-900 py-2.5 px-2 w-16 text-[11px]">DAY</th>
                        <th className="border border-slate-900 py-2 px-1 text-[11px]">
                          09.00am to 10.00am
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[11px]">
                          10.00am to 11.00am
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[10px] bg-slate-300/80 w-20">
                          11.00am to 11.25am
                          <br />
                          <span className="font-normal text-[9px]">SHORT BREAK</span>
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[11px]">
                          11.25am to 12.20pm
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[11px]">
                          12.20pm to 01.15pm
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[10px] bg-slate-300/80 w-20">
                          01.15pm to 02.00pm
                          <br />
                          <span className="font-normal text-[9px]">LUNCH BREAK</span>
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[11px]">
                          02.00pm to 03.00pm
                        </th>
                        <th className="border border-slate-900 py-2 px-1 text-[11px]">
                          03.00pm to 04.00pm
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {MITM_DAYS.map((day) => {
                        const schedule = secTimetable.schedule || [];
                        return (
                          <tr key={day} className="border-b border-slate-900">
                            <td className="border border-slate-900 py-3.5 px-2 font-black font-mono bg-slate-100">
                              {day}
                            </td>

                            {MITM_PERIOD_DEFINITIONS.map((def) => {
                              if (def.isBreak) {
                                return (
                                  <td
                                    key={def.index}
                                    className="border border-slate-900 py-2 px-1 bg-slate-200/60 font-black text-[9px] text-slate-700 uppercase"
                                  >
                                    {def.label}
                                  </td>
                                );
                              }

                              const slot = schedule.find(
                                (s) => s.day === day && s.periodIndex === def.index
                              );

                              return (
                                <td
                                  key={def.index}
                                  className={`border border-slate-900 py-2 px-1 h-14 ${
                                    slot?.isLab ? 'bg-amber-50/50' : 'bg-white'
                                  }`}
                                >
                                  {slot?.courseCode ? (
                                    <div className="flex flex-col items-center justify-center leading-tight">
                                      <span className="font-black text-xs text-slate-900 uppercase">
                                        {slot.courseShortName || slot.courseCode}
                                      </span>
                                      <span className="font-bold text-[10px] text-slate-700 font-mono mt-0.5">
                                        {slot.facultyInitials || ''}
                                      </span>
                                    </div>
                                  ) : null}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {/* Bottom Faculty & Subject Legend Table (Exact VTU/MIT Mysore Format) */}
                  <div className="space-y-3">
                    <table className="w-full border-collapse border border-slate-900 text-left text-[11px]">
                      <thead>
                        <tr className="bg-slate-200 border-b border-slate-900 text-slate-900 font-bold uppercase text-[10px]">
                          <th className="border border-slate-900 py-1.5 px-2 w-32 font-mono">SUB CODE</th>
                          <th className="border border-slate-900 py-1.5 px-3">SUBJECT TITLE</th>
                          <th className="border border-slate-900 py-1.5 px-2 w-28">SUB IN SHORT</th>
                          <th className="border border-slate-900 py-1.5 px-3">FACULTY</th>
                          <th className="border border-slate-900 py-1.5 px-2 w-28 text-center font-mono">
                            FACULTY INITIALS
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-400">
                        {secAllocations.map((item) => (
                          <tr key={item.subjectCode} className="border-b border-slate-300">
                            <td className="border border-slate-900 py-1.5 px-2 font-mono font-bold text-slate-900">
                              {item.subjectCode}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-3 font-semibold text-slate-800">
                              {item.subjectTitle}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-2 font-bold font-mono text-[#7B1113]">
                              {item.subjectShortName}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-3 text-slate-900">
                              {item.facultyName}
                            </td>
                            <td className="border border-slate-900 py-1.5 px-2 font-mono font-bold text-center text-slate-900">
                              {item.facultyInitials}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Institutional Signatures */}
                    <div className="pt-8 flex items-center justify-between text-xs font-bold text-slate-900 px-6">
                      <div className="text-center">
                        <div className="w-40 border-t-2 border-slate-900 pt-1 mb-1">
                          Head of Department (HOD)
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Dept. of {activeDeptName.replace(/^Department of\s*/i, '') || activeDeptCode}
                        </p>
                      </div>

                      <div className="text-center">
                        <div className="w-40 border-t-2 border-slate-900 pt-1 mb-1">
                          Principal / Chief Administrator
                        </div>
                        <p className="text-[10px] text-slate-500 font-normal">
                          Maharaja Institute of Technology Mysore
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* FACULTY PORTAL TIMETABLE VIEW */}
      {/* ============================================================== */}
      {isFaculty && facultyActiveTab === 'my-schedule' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 print:hidden">
          <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#7B1113]" />
            <span>Authorized Weekly Teaching Schedule for {user?.email}</span>
          </h2>

          {facultySchedule.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              No published classes currently scheduled for your account.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {facultySchedule.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1"
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-[#7B1113]">{s.day}</span>
                    <span className="text-slate-500 font-mono text-[10px]">{s.timeRange}</span>
                  </div>
                  <div className="text-xs font-extrabold text-slate-900 truncate">
                    {s.courseTitle} ({s.courseCode})
                  </div>
                  <div className="text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{s.semester} · {s.section}</span>
                    <span className="font-mono text-slate-700 font-semibold">{s.room}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* ADD / EDIT ACADEMIC SUBJECT MODAL */}
      {/* ============================================================== */}
      {showSubjectModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 text-[#7B1113] rounded-xl">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {editingSubject ? 'Edit Academic Subject' : 'Add Academic Subject'}
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Year {selectedYear} · {getOrdinalSemester(selectedSemester)} Syllabus
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSubjectModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveSubject} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Subject Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={subjectForm.code}
                    onChange={(e) => setSubjectForm({ ...subjectForm, code: e.target.value })}
                    placeholder="e.g. M23BIS601"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Short Name *
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={10}
                    value={subjectForm.shortName}
                    onChange={(e) => setSubjectForm({ ...subjectForm, shortName: e.target.value })}
                    placeholder="e.g. FSD"
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono uppercase focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Subject Title *
                </label>
                <input
                  type="text"
                  required
                  value={subjectForm.title}
                  onChange={(e) => setSubjectForm({ ...subjectForm, title: e.target.value })}
                  placeholder="e.g. FULL STACK DEVELOPMENT"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Category
                </label>
                <select
                  value={subjectForm.category}
                  onChange={(e) =>
                    setSubjectForm({
                      ...subjectForm,
                      category: e.target.value,
                      isLab: e.target.value === 'LAB',
                    })
                  }
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                >
                  <option value="THEORY">Theory Course</option>
                  <option value="LAB">Laboratory / Practical</option>
                  <option value="PROJECT">Project / Internship</option>
                  <option value="ELECTIVE">Open Elective (OE)</option>
                  <option value="TRAINING">Placement Training</option>
                  <option value="ACTIVITY">Activity / NSS / Yoga</option>
                </select>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSubjectModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {actionLoading ? 'Saving...' : 'Save Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMMITTED TIMETABLES ROSTER MODAL (MEMORY-EFFICIENT PER-YEAR COMMITS VIEWER) */}
      {showCommittedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-5xl w-full p-6 animate-in fade-in-50 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-[#7B1113] rounded-xl border border-rose-100">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-slate-900">
                      Official Committed Academic Timetables
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Authoritative Records
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Department of {activeDeptName} · Official academic class timetables per year cohort
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCommittedModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Cohort Year Selection Tabs */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3 gap-2 flex-wrap shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-slate-500 mr-1">Cohort Year:</span>
                {[1, 2, 3, 4].map((yr) => {
                  const yrRecord = committedRecords.find((r) => r.year === yr);
                  const isSelected = committedActiveYear === yr;
                  return (
                    <button
                      key={yr}
                      onClick={() => {
                        setCommittedActiveYear(yr);
                        setCommittedViewerSection('ALL');
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-[#7B1113] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      <span>{yr === 1 ? '1st' : yr === 2 ? '2nd' : yr === 3 ? '3rd' : '4th'} Year</span>
                      {yrRecord?.hasCommitted && (
                        <span
                          className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 font-bold'
                          }`}
                        >
                          {yrRecord.semester}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Section Switcher for Selected Year */}
              {(() => {
                const activeRec = committedRecords.find((r) => r.year === committedActiveYear);
                if (!activeRec || !activeRec.hasCommitted) return null;
                const recSections = activeRec.sections || [];
                return (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setCommittedViewerSection('ALL')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        committedViewerSection === 'ALL'
                          ? 'bg-[#7B1113] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      }`}
                    >
                      All Sections
                    </button>
                    {recSections.map((sec: string) => (
                      <button
                        key={sec}
                        type="button"
                        onClick={() => setCommittedViewerSection(sec)}
                        className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                          committedViewerSection === sec
                            ? 'bg-[#7B1113] text-white shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        {sec}
                      </button>
                    ))}
                    <button
                      onClick={() => handleLoadCommittedYear(activeRec)}
                      className="ml-2 px-3 py-1 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1 cursor-pointer"
                      title="Load into Timetable Builder to edit"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#7B1113]" />
                      <span>Edit in Builder</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            <div className="overflow-y-auto flex-1 pr-1 space-y-4">
              {loadingCommitted ? (
                <div className="py-16 text-center text-xs text-slate-400">
                  Loading committed timetable records...
                </div>
              ) : (() => {
                const activeRec = committedRecords.find((r) => r.year === committedActiveYear);
                if (!activeRec || !activeRec.hasCommitted || !activeRec.timetables || activeRec.timetables.length === 0) {
                  return (
                    <div className="py-16 text-center space-y-3">
                      <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div className="text-sm font-bold text-slate-800">
                        No Committed Timetable for {committedActiveYear === 1 ? '1st' : committedActiveYear === 2 ? '2nd' : committedActiveYear === 3 ? '3rd' : '4th'} Year
                      </div>
                      <p className="text-xs text-slate-500 max-w-md mx-auto">
                        Timetables are published per academic term. Complete timetable creation and click &quot;Commit Timetable&quot; to establish this cohort&apos;s authoritative record.
                      </p>
                      <button
                        onClick={() => {
                          handleSelectYear(committedActiveYear);
                          setAdminTab('builder');
                          setShowCommittedModal(false);
                        }}
                        className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-sm transition-all cursor-pointer inline-flex items-center gap-1.5"
                      >
                        <Grid3X3 className="w-3.5 h-3.5" />
                        <span>Create Timetable in Builder</span>
                      </button>
                    </div>
                  );
                }

                const visibleTimetables =
                  committedViewerSection === 'ALL'
                    ? activeRec.timetables
                    : activeRec.timetables.filter((t: any) => t.section === committedViewerSection);

                return (
                  <div className="space-y-6">
                    {/* Committed Metadata Strip */}
                    <div className="bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl flex items-center justify-between text-xs text-slate-700">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[#7B1113]">{activeRec.yearLabel}</span>
                        <span>·</span>
                        <span className="font-semibold text-slate-900">{activeRec.semester}</span>
                        <span>·</span>
                        <span className="text-slate-600">AY {activeRec.academicYear}</span>
                        <span>·</span>
                        <span className="text-slate-500 font-mono text-[11px]">
                          Committed: {formatNotificationDateTime(activeRec.committedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Committed by {activeRec.committedBy || 'Admin'}</span>
                      </div>
                    </div>

                    {visibleTimetables.map((tt: any) => {
                      const schedule = tt.schedule || [];
                      const uniqueSubjectsInGrid = Array.from(
                        new Set(schedule.map((s: any) => s.courseCode).filter(Boolean))
                      );

                      return (
                        <div
                          key={tt.id || tt.section}
                          className="bg-white p-6 rounded-2xl border border-slate-300 shadow-sm font-sans text-slate-900"
                        >
                          {/* MIT Mysore Header */}
                          <div className="flex items-center justify-between border-b-2 border-slate-900 pb-3 mb-3">
                            <div className="flex items-center gap-3">
                              <img
                                src="/assets/aistudio/mit_logo_e728531b.webp"
                                alt="Maharaja Institute of Technology Mysore Crest"
                                className="w-12 h-12 object-contain shrink-0"
                              />
                              <div>
                                <h3 className="text-base font-black tracking-tight uppercase text-slate-900">
                                  MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE
                                </h3>
                                <h4 className="text-[11px] font-bold tracking-wide uppercase text-slate-800">
                                  {activeDeptName.toUpperCase().startsWith('DEPARTMENT OF')
                                    ? activeDeptName.toUpperCase()
                                    : `DEPARTMENT OF ${activeDeptName.toUpperCase()}`}
                                </h4>
                              </div>
                            </div>
                            <div className="text-right font-mono text-xs">
                              <div className="font-bold text-[#7B1113]">ACADEMIC YEAR {activeRec.academicYear}</div>
                              <div className="text-[11px] text-slate-600 font-semibold">{activeRec.semester}</div>
                            </div>
                          </div>

                          {/* Document Title & Class Banner */}
                          <div className="text-center py-1.5 bg-slate-100 rounded-lg border border-slate-300 mb-3">
                            <div className="flex items-center justify-between px-4 text-xs font-bold text-slate-800">
                              <span>Class: {activeRec.semester} &apos;{tt.section.replace('Section ', '')}&apos;</span>
                              <span>{tt.roomNumber || 'Room Number:- 301'}</span>
                              <span>Class Teacher: {tt.classTeacher || 'Class Coordinator'}</span>
                            </div>
                          </div>

                          {/* Timetable Schedule Grid */}
                          <table className="w-full border-collapse border border-slate-900 text-center text-xs mb-4">
                            <thead>
                              <tr className="bg-slate-200 border-b border-slate-900 text-slate-900 font-black">
                                <th className="border border-slate-900 py-2 px-2 w-16 text-[10px]">DAY</th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[10px]">09.00 - 10.00</th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[10px]">10.00 - 11.00</th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[9px] bg-slate-300/80 w-16">
                                  BREAK
                                </th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[10px]">11.25 - 12.20</th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[10px]">12.20 - 01.15</th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[9px] bg-slate-300/80 w-16">
                                  LUNCH
                                </th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[10px]">02.00 - 03.00</th>
                                <th className="border border-slate-900 py-1.5 px-1 text-[10px]">03.00 - 04.00</th>
                              </tr>
                            </thead>
                            <tbody>
                              {MITM_DAYS.map((day) => (
                                <tr key={day} className="border-b border-slate-900">
                                  <td className="border border-slate-900 py-2 px-1 font-black font-mono bg-slate-100 text-[11px]">
                                    {day}
                                  </td>
                                  {MITM_PERIOD_DEFINITIONS.map((def) => {
                                    if (def.isBreak) {
                                      return (
                                        <td
                                          key={def.index}
                                          className="border border-slate-900 py-1 px-1 bg-slate-200/60 font-black text-[9px] text-slate-700 uppercase"
                                        >
                                          {def.label}
                                        </td>
                                      );
                                    }
                                    const slot = schedule.find(
                                      (s: any) => s.day === day && s.periodIndex === def.index
                                    );
                                    return (
                                      <td
                                        key={def.index}
                                        className={`border border-slate-900 py-1.5 px-1 h-12 ${
                                          slot?.isLab ? 'bg-amber-50/50' : 'bg-white'
                                        }`}
                                      >
                                        {slot?.courseCode ? (
                                          <div className="flex flex-col items-center justify-center leading-tight">
                                            <span className="font-black text-[11px] text-slate-900 uppercase">
                                              {slot.courseShortName || slot.courseCode}
                                            </span>
                                            <span className="font-bold text-[9px] text-slate-700 font-mono">
                                              {slot.facultyInitials || ''}
                                            </span>
                                          </div>
                                        ) : null}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Subject & Faculty Summary */}
                          {uniqueSubjectsInGrid.length > 0 && (
                            <div className="pt-2 border-t border-slate-200">
                              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Allocated Courses in this Schedule:
                              </div>
                              <div className="flex flex-wrap gap-2 text-xs">
                                {uniqueSubjectsInGrid.map((cCode: any) => {
                                  const matchingSlot = schedule.find((s: any) => s.courseCode === cCode);
                                  return (
                                    <span
                                      key={cCode}
                                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[11px] font-mono text-slate-800"
                                    >
                                      <strong>{matchingSlot?.courseShortName || cCode}</strong>: {matchingSlot?.facultyInitials || 'Assigned'}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
              <span className="text-[11px]">
                Tip: Only the latest committed record per cohort is preserved for optimal system efficiency.
              </span>
              <button
                onClick={() => setShowCommittedModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
