import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { FacultyPersonalGridCell } from '../types/index.ts';
import {
  generatePersonalTimetablePdf,
  PERSONAL_DAYS,
  PERSONAL_PERIODS,
} from '../utils/personalTimetablePdf.ts';
import {
  Save,
  Download,
  Trash2,
  Sparkles,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Plus,
  BookOpen,
  MapPin,
  RefreshCw,
} from 'lucide-react';

export const FacultyPersonalTimetableGrid: React.FC = () => {
  const { user, profile, department } = useAuth();

  const [grid, setGrid] = useState<Record<string, FacultyPersonalGridCell>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Active cell editor modal state
  const [editingCellKey, setEditingCellKey] = useState<string | null>(null);
  const [cellForm, setCellForm] = useState<FacultyPersonalGridCell>({
    subject: '',
    year: '2nd Year',
    room: 'LH-201',
    batch: '',
    notes: '',
  });

  // Confirm Clear Modal
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Department subjects for autocomplete/dropdown
  const [deptSubjects, setDeptSubjects] = useState<any[]>([]);

  useEffect(() => {
    loadPersonalSchedule();
    loadDeptSubjects();
  }, []);

  const loadPersonalSchedule = async () => {
    setIsLoading(true);
    try {
      const res = await authFetch('/api/faculty/personal-schedule');
      if (res.ok) {
        const data = await res.json();
        if (data.schedule && data.schedule.grid) {
          setGrid(data.schedule.grid);
        }
      }
    } catch (err) {
      console.error('Failed to load personal schedule:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDeptSubjects = async () => {
    try {
      const res = await authFetch('/api/academic-subjects');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setDeptSubjects(data);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenCellEditor = (dayKey: string, periodIndex: number) => {
    const key = `${dayKey}-${periodIndex}`;
    const existing = grid[key] || {
      subject: '',
      year: '2nd Year',
      room: 'LH-201',
      batch: '',
      notes: '',
    };
    setEditingCellKey(key);
    setCellForm({ ...existing });
  };

  const handleSaveCell = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCellKey) return;

    if (!cellForm.subject.trim()) {
      // If subject is blank, remove cell
      const newGrid = { ...grid };
      delete newGrid[editingCellKey];
      setGrid(newGrid);
    } else {
      setGrid((prev) => ({
        ...prev,
        [editingCellKey]: {
          subject: cellForm.subject.trim(),
          year: cellForm.year || '2nd Year',
          room: cellForm.room?.trim() || '',
          batch: cellForm.batch?.trim() || '',
          notes: cellForm.notes?.trim() || '',
        },
      }));
    }
    setEditingCellKey(null);
  };

  const handleClearSingleCell = (key: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newGrid = { ...grid };
    delete newGrid[key];
    setGrid(newGrid);
  };

  const handleSaveToBackend = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    setErrorMessage(null);
    try {
      const res = await authFetch('/api/faculty/personal-schedule', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ grid }),
      });
      if (res.ok) {
        setStatusMessage('Personal timetable saved successfully! Retained across all future logins.');
      } else {
        const err = await res.json();
        setErrorMessage(err.error || 'Failed to save timetable.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Network error saving timetable.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmClearAll = async () => {
    setShowClearConfirm(false);
    setIsSaving(true);
    try {
      const res = await authFetch('/api/faculty/personal-schedule', {
        method: 'DELETE',
      });
      if (res.ok) {
        setGrid({});
        setStatusMessage('Personal timetable records cleared.');
      }
    } catch (err) {
      console.error(err);
      setErrorMessage('Failed to clear records.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    try {
      const doc = await generatePersonalTimetablePdf({
        institutionName: 'MAHARAJA INSTITUTE OF TECHNOLOGY MYSORE',
        departmentName: department?.name || 'Department of Information Science and Engineering',
        deptCode: department?.code || 'ISE',
        academicYear: '2026-27',
        facultyName: profile?.fullName || user?.email || 'Faculty Member',
        designation: profile?.designation || 'Assistant Professor',
        staffId: profile?.staffId || '',
        email: user?.email,
        grid,
      });

      const safeName = (profile?.fullName || 'Faculty').replace(/\s+/g, '_');
      doc.save(`MITM_Personal_Teaching_Schedule_${safeName}.pdf`);
    } catch (err) {
      console.error('PDF generation error:', err);
      setErrorMessage('Failed to generate timetable PDF.');
    }
  };

  const handleAutoFillFromDept = async () => {
    setIsSaving(true);
    try {
      const res = await authFetch('/api/faculty/personal-schedule');
      if (res.ok) {
        const data = await res.json();
        if (data.schedule && data.schedule.grid) {
          setGrid((prev) => ({
            ...prev,
            ...data.schedule.grid,
          }));
          setStatusMessage('Imported published department classes into your personal schedule! Click "Save Personal Timetable" to persist.');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate statistics
  const totalSlotsCount = Object.values(grid).filter((c) => c && c.subject && c.subject.trim().length > 0).length;

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-rose-50 text-[#7B1113]">
              <Calendar className="w-4 h-4" />
            </span>
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              My Personal Teaching Schedule ({totalSlotsCount} Weekly Slots)
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Pre-configured Monday to Friday layout matching MIT Mysore lecture slots. Click any cell to add or edit classes, save your changes, or export as PDF.
          </p>
        </div>

        {/* Buttons: Save, Clear, Export, Auto-fill */}
        <div className="flex items-center gap-2 flex-wrap self-start md:self-auto">
          <button
            onClick={handleAutoFillFromDept}
            disabled={isSaving}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Auto-fill classes assigned in department published timetables"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Auto-fill Dept Classes</span>
          </button>

          <button
            onClick={() => setShowClearConfirm(true)}
            disabled={isSaving || totalSlotsCount === 0}
            className="px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Reset and clear all entered timetable records"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
            <span>Clear Records</span>
          </button>

          <button
            onClick={handleExportPdf}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
            title="Download printable official PDF format"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export as PDF</span>
          </button>

          <button
            onClick={handleSaveToBackend}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-sm transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Personal Timetable'}</span>
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between gap-2 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-600 hover:text-rose-800">
            &times;
          </button>
        </div>
      )}

      {/* Main Single Grid Table (Excel-like Interactive Table) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-900 text-white text-xs border-b border-slate-800">
                <th className="py-3 px-4 font-bold uppercase tracking-wider w-28 text-center border-r border-slate-800 bg-[#7B1113]">
                  Day / Period
                </th>
                {PERSONAL_PERIODS.map((period, idx) => (
                  <th
                    key={idx}
                    className={`py-2.5 px-3 font-semibold text-center border-r border-slate-800 ${
                      period.isBreak ? 'bg-slate-800 text-amber-300 w-24' : 'min-w-[150px]'
                    }`}
                  >
                    {period.isBreak ? (
                      <div className="py-1">
                        <div className="font-extrabold text-[10px] tracking-wider">{period.label}</div>
                        <div className="text-[9px] text-slate-400 font-mono mt-0.5">{period.timeRange}</div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-bold text-[11px] text-slate-200">
                          Period {idx < 2 ? idx + 1 : idx < 5 ? idx : idx - 1}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{period.timeRange}</div>
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERSONAL_DAYS.map((day, rIdx) => (
                <tr
                  key={day.key}
                  className={`border-b border-slate-200 transition-colors ${
                    rIdx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                  }`}
                >
                  {/* Day Header Column */}
                  <td className="py-3 px-4 font-extrabold text-xs text-[#7B1113] border-r border-slate-200 bg-rose-50/40 text-center">
                    <div>{day.label}</div>
                    <div className="text-[10px] font-mono text-slate-400 font-normal">({day.key})</div>
                  </td>

                  {/* Period Columns */}
                  {PERSONAL_PERIODS.map((period) => {
                    if (period.isBreak) {
                      return (
                        <td
                          key={period.index}
                          className="py-3 px-2 text-center bg-slate-100/70 border-r border-slate-200 select-none"
                        >
                          <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest writing-mode-vertical">
                            {period.index === 2 ? 'Tea Break' : 'Lunch Break'}
                          </div>
                        </td>
                      );
                    }

                    const cellKey = `${day.key}-${period.index}`;
                    const cellData = grid[cellKey];
                    const hasData = cellData && cellData.subject && cellData.subject.trim().length > 0;

                    return (
                      <td
                        key={period.index}
                        onClick={() => handleOpenCellEditor(day.key, period.index)}
                        className={`p-2 border-r border-slate-200 relative group cursor-pointer transition-all hover:bg-rose-50/60 ${
                          hasData ? 'bg-rose-50/20' : ''
                        }`}
                      >
                        {hasData ? (
                          <div className="p-2 bg-white rounded-xl border border-rose-200 shadow-xs space-y-1 hover:border-[#7B1113] transition-colors">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-extrabold text-xs text-[#7B1113] truncate">
                                {cellData.subject}
                              </span>
                              <button
                                onClick={(e) => handleClearSingleCell(cellKey, e)}
                                title="Clear slot"
                                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-600 rounded transition-opacity"
                              >
                                &times;
                              </button>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                              <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded font-semibold">
                                {cellData.year || '2nd Year'}
                              </span>
                              {cellData.room && (
                                <span className="flex items-center gap-0.5 font-mono text-slate-600">
                                  <MapPin className="w-2.5 h-2.5" />
                                  <span>{cellData.room}</span>
                                </span>
                              )}
                            </div>
                            {cellData.batch && (
                              <div className="text-[9px] text-slate-400 italic">
                                Batch: {cellData.batch}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="h-14 border border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-[#7B1113] group-hover:border-[#7B1113]/50 transition-colors">
                            <Plus className="w-4 h-4 opacity-40 group-hover:opacity-100" />
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

      {/* Cell Editor Modal */}
      {editingCellKey && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full p-5 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-rose-50 text-[#7B1113] rounded-lg">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Edit Timetable Slot ({editingCellKey})
                  </h3>
                  <p className="text-[10px] text-slate-500">Enter subject, year & room</p>
                </div>
              </div>
              <button
                onClick={() => setEditingCellKey(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveCell} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Subject / Course Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={cellForm.subject}
                  onChange={(e) => setCellForm({ ...cellForm, subject: e.target.value })}
                  placeholder="e.g. FSD, ML, AI & Cloud, Web Tech Lab"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Class / Year</label>
                  <select
                    value={cellForm.year}
                    onChange={(e) => setCellForm({ ...cellForm, year: e.target.value })}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Room / Lab</label>
                  <input
                    type="text"
                    value={cellForm.room}
                    onChange={(e) => setCellForm({ ...cellForm, room: e.target.value })}
                    placeholder="e.g. LH-201, Lab 2"
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Batch / Section (Optional)
                </label>
                <input
                  type="text"
                  value={cellForm.batch}
                  onChange={(e) => setCellForm({ ...cellForm, batch: e.target.value })}
                  placeholder="e.g. Section A or Batch 1"
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newGrid = { ...grid };
                    delete newGrid[editingCellKey];
                    setGrid(newGrid);
                    setEditingCellKey(null);
                  }}
                  className="text-rose-600 hover:text-rose-800 text-xs font-semibold"
                >
                  Clear Slot
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingCellKey(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm"
                  >
                    Apply Cell
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Clear Records Confirmation Dialog */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-sm w-full p-5 text-center animate-in fade-in-50">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 mb-1">Clear Personal Timetable?</h3>
            <p className="text-xs text-slate-500 mb-4">
              This will wipe all entered classes from your personal teaching schedule. Department published timetables will NOT be affected.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmClearAll}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm cursor-pointer"
              >
                Yes, Clear All
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
