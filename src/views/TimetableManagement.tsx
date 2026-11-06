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
  const [selectedYear, setSelectedYear] = useState<number>(3); // 1, 2, 3, 4
  const [selectedSemester, setSelectedSemester] = useState<number>(6); // 1 to 8
  const [numberOfSections, setNumberOfSections] = useState<number>(3); // 1 to 4
  const [activeBuilderSection, setActiveBuilderSection] = useState<'ALL' | 'Section A' | 'Section B' | 'Section C' | 'Section D'>('ALL');
  const [officialPreviewSection, setOfficialPreviewSection] = useState<'Section A' | 'Section B' | 'Section C' | 'Section D'>('Section A');

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

  // Track active running semester per year from enrolled students
  const [studentSemestersByYear, setStudentSemestersByYear] = useState<Record<number, number>>({
    1: 1,
    2: 4,
    3: 6,
    4: 8,
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

  // 4. Fetch Multi-Section Timetables from backend
  const fetchTimetables = () => {
    setIsLoading(true);
    authFetch(
      `/api/timetables/structured?departmentId=${encodeURIComponent(activeDeptId)}&semester=${encodeURIComponent(
        `${selectedSemester}th Semester`
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
        }
        setSectionTimetables(freshMap);
      })
      .catch((err) => console.warn(err))
      .finally(() => setIsLoading(false));
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

  const fetchCohortSemesters = () => {
    authFetch(`/api/students?departmentId=${encodeURIComponent(activeDeptId)}&status=ACTIVE`)
      .then((r) => (r.ok ? r.json() : []))
      .then((students: any[]) => {
        const map: Record<number, number> = { 1: 1, 2: 3, 3: 5, 4: 7 };
        if (Array.isArray(students) && students.length > 0) {
          [1, 2, 3, 4].forEach((yr) => {
            const yrStudents = students.filter((s) => s.currentYear === yr && s.currentSemester);
            if (yrStudents.length > 0) {
              map[yr] = yrStudents[0].currentSemester;
            }
          });
        }
        setStudentSemestersByYear(map);
      })
      .catch((err) => console.warn(err));
  };

  useEffect(() => {
    fetchFaculty();
    fetchSubjects();
    fetchCohortSemesters();
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
          : `New Subject ${payload.code} (${payload.shortName}) added to ${selectedSemester}th Semester!`
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
      setErrorMsg('Mandatory Rule: Cannot publish timetables with unresolved cross-section clashes.');
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
        title: `WEEKLY ACADEMIC CLASS TIMETABLE - ${activeAcademicYear} EVEN SEM - ${getSemesterRoman(selectedSemester)} SEMESTER ${sec.toUpperCase()}`,
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
          staffId: `MITM-ISE-${a.facultyInitials}`,
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
          semester: `${selectedSemester}th Semester`,
          timetables: timetablesPayload,
          publishAll,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to save multi-section timetables.');
        return;
      }

      setSuccessMsg(
        publishAll
          ? `All ${sectionList.length} section timetables officially PUBLISHED! Faculty schedules updated and HOD notified.`
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
    const el = document.getElementById('official-mitm-timetable-card');
    if (!el) return;
    setActionLoading(true);
    try {
      const dataUrl = await toPng(el, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });

      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
      });

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(dataUrl, 'PNG', 0, 15, pdfWidth, pdfHeight);
      pdf.save(
        `MIT_Mysore_Timetable_${activeDeptCode}_Sem${selectedSemester}_${officialPreviewSection.replace(/\s+/g, '_')}.pdf`
      );
      setSuccessMsg('Official Timetable PDF generated and downloaded!');
    } catch (err) {
      console.error(err);
      setErrorMsg('Direct PDF export encountered an issue. Using Print dialog as fallback.');
      window.print();
    } finally {
      setActionLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    const el = document.getElementById('official-mitm-timetable-card');
    if (!el) return;
    setActionLoading(true);
    try {
      const dataUrl = await toPng(el, {
        quality: 0.98,
        backgroundColor: '#ffffff',
        pixelRatio: 2,
        skipFonts: true,
        fontEmbedCSS: '',
      });
      const link = document.createElement('a');
      link.download = `MIT_Mysore_Timetable_${activeDeptCode}_Sem${selectedSemester}_${officialPreviewSection.replace(/\s+/g, '_')}.png`;
      link.href = dataUrl;
      link.click();
      setSuccessMsg('Timetable image (PNG) downloaded successfully!');
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
                    onClick={() => {
                      setSelectedYear(yr);
                      const sem = studentSemestersByYear[yr] || (yr * 2 - 1);
                      setSelectedSemester(sem);
                    }}
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
                {selectedSemester}th Semester ({getSemesterRoman(selectedSemester)} Sem)
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
                  Academic Subjects: {selectedYear === 1 ? '1st' : selectedYear === 2 ? '2nd' : selectedYear === 3 ? '3rd' : '4th'} Year · {selectedSemester}th Semester ({getSemesterRoman(selectedSemester)} Sem)
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
                      ({selectedSemester}th Sem)
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
                    Multi-Section Timetable Grid: {selectedSemester}th Semester ({getSemesterRoman(selectedSemester)} Sem)
                  </span>
                </h2>
                <p className="text-xs text-slate-500">
                  Select a subject stamp from below, then click any period slot across any section to rapidly assign.
                </p>
              </div>

              {/* Actions: Clear All, Save Draft, Publish, Validate */}
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
                <button
                  onClick={() => handleSaveOrPublishMultiSection(false)}
                  disabled={actionLoading}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Draft</span>
                </button>
                <button
                  onClick={() => handleSaveOrPublishMultiSection(true)}
                  disabled={actionLoading}
                  className="px-4 py-2 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-amber-300" />
                  <span>Publish All Sections</span>
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
                        VI SEMESTER ({selectedSemester}th Sem)
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
      {(adminTab === 'official-view' || !isAdmin) && (
        <div className="space-y-4">
          {/* Print Bar (hidden in physical printout) */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-700">Preview Section:</span>
              <div className="flex items-center gap-1.5">
                {sectionList.map((sec) => (
                  <button
                    key={sec}
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
              <button
                onClick={handlePrintOfficialTimetable}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5"
                title="Open system print dialog / Save as PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Print</span>
              </button>
            </div>
          </div>

          {/* OFFICIAL MIT MYSORE TIMETABLE DOCUMENT CARD (PRINT MEDIA EXACT) */}
          <div
            id="official-mitm-timetable-card"
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
                <div className="text-slate-600">EVEN SEMESTER</div>
                <div className="text-[10px] text-slate-500">VTU SCHEME 2022/2023</div>
              </div>
            </div>

            {/* Document Title & Class Information Banner */}
            <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-300 mb-4">
              <h1 className="text-sm font-black tracking-wider uppercase text-slate-900">
                WEEKLY ACADEMIC CLASS TIMETABLE – {activeAcademicYear} EVEN SEM
              </h1>
              <div className="flex items-center justify-between px-6 text-xs font-bold text-slate-800 mt-1">
                <span>Class: {getSemesterRoman(selectedSemester)} SEMESTER SECTION &apos;{officialPreviewSection.replace('Section ', '')}&apos;</span>
                <span>{sectionTimetables[officialPreviewSection]?.roomNumber || 'Room Number:- 301'}</span>
                <span>Class Teacher: {sectionTimetables[officialPreviewSection]?.classTeacher || 'Class Coordinator'}</span>
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
                  const schedule = sectionTimetables[officialPreviewSection]?.schedule || [];
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
                  {allocations
                    .filter((a) => a.section === officialPreviewSection)
                    .map((item) => (
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
        </div>
      )}

      {/* ============================================================== */}
      {/* FACULTY PORTAL TIMETABLE VIEW */}
      {/* ============================================================== */}
      {isFaculty && (
        <div className="space-y-4 print:hidden">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
            <button
              onClick={() => setFacultyActiveTab('my-schedule')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                facultyActiveTab === 'my-schedule'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              My Personal Teaching Schedule ({facultySchedule.length} Slots)
            </button>
            <button
              onClick={() => setFacultyActiveTab('dept-timetable')}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-colors cursor-pointer ${
                facultyActiveTab === 'dept-timetable'
                  ? 'bg-[#7B1113] text-white shadow-sm'
                  : 'bg-white text-slate-700 hover:bg-slate-100'
              }`}
            >
              Published Department Timetable
            </button>
          </div>

          {facultyActiveTab === 'my-schedule' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
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
                    Year {selectedYear} · {selectedSemester}th Semester Syllabus
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
    </div>
  );
};
