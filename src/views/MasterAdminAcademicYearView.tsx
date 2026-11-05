import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { CalendarDays, CheckCircle2, AlertCircle, Save } from 'lucide-react';

export const MasterAdminAcademicYearView: React.FC = () => {
  const { institution, refreshAuth } = useAuth();
  const [academicYear, setAcademicYear] = useState(institution?.currentAcademicYear || '2026-27');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (institution?.currentAcademicYear) {
      setAcademicYear(institution.currentAcademicYear);
    }
  }, [institution?.currentAcademicYear]);

  const quickOptions = ['2024-25', '2025-26', '2026-27', '2027-28', '2028-29'];

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmedYear = academicYear.trim();
    if (!trimmedYear) {
      setErrorMsg('Please specify a valid academic year (e.g. 2026-27).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentAcademicYear: trimmedYear,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update academic year.');
        setIsSubmitting(false);
        return;
      }

      await refreshAuth();
      setSuccessMsg(
        `Academic Year successfully updated to "${trimmedYear}"! This change immediately reflects throughout all department timetables, student mentor allocations, and official reports.`
      );
    } catch (err: any) {
      setErrorMsg(err.message || 'Network error.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-amber-900/40">
        <div className="flex items-center gap-2 mb-2">
          <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5 font-mono">
            <CalendarDays className="w-3.5 h-3.5 text-amber-400" />
            GLOBAL INSTITUTIONAL TIMELINE
          </span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">
          Institutional Academic Year Governance
        </h1>
        <p className="text-xs text-slate-300 max-w-xl mt-1">
          Configure the active academic year for the institution. Modifications reflect dynamically across all department portals, timetable generation templates, and mentor allocations with zero hardcoding.
        </p>
      </div>

      {/* Main Settings Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
          <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200">
            <CalendarDays className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Active Academic Year Setting
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select or type the current VTU academic cycle for Maharaja Institute of Technology Mysore.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2.5 animate-in fade-in-50">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2 animate-in fade-in-50">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-5">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                Currently Active In Database
              </span>
              <span className="font-mono font-black text-[#7B1113] bg-rose-50 px-2.5 py-1 rounded-md border border-rose-200 text-xs">
                {institution?.currentAcademicYear || '2026-27'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              All departmental portals, class schedules, and mentor rosters operate under this institutional cycle.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Select Quick Academic Year Preset
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {quickOptions.map((opt) => {
                const isSelected = academicYear === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setAcademicYear(opt)}
                    className={`py-2 px-3 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer text-center ${
                      isSelected
                        ? 'bg-[#7B1113] text-white shadow-sm ring-2 ring-[#7B1113]/30'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Custom / Specific Academic Year
            </label>
            <input
              type="text"
              required
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
              placeholder="e.g. 2026-27"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 font-mono font-semibold focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">
              Format: YYYY-YY (e.g. 2025-26, 2026-27)
            </span>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Updating Academic Year...' : 'Save & Apply Academic Year'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
