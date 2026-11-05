import React, { useEffect, useState } from 'react';
import { InstitutionSettings, Department } from '../types/index.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { CrestLogo } from '../components/CrestLogo.tsx';
import {
  Settings,
  Building,
  Save,
  CheckCircle2,
  Calendar,
  Layers,
  GraduationCap,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const InstitutionSettingsView: React.FC = () => {
  const { user, refreshAuth, department: currentDept } = useAuth();
  const [settings, setSettings] = useState<InstitutionSettings | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-ise');
  const [customDeptCode, setCustomDeptCode] = useState<string>('ISE');
  const [customDeptName, setCustomDeptName] = useState<string>('Information Science and Engineering');
  const [academicYear, setAcademicYear] = useState<string>('2026-27');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      authFetch('/api/institution').then((r) => (r.ok ? r.json() : null)),
      authFetch('/api/departments').then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([instData, deptsData]) => {
        const initialDeptId =
          user?.departmentId ||
          currentDept?.id ||
          instData?.institution?.defaultDepartmentId ||
          'dept-ise';

        if (instData?.institution) {
          setSettings(instData.institution);
          setSelectedDeptId(initialDeptId);
          setAcademicYear(instData.institution.currentAcademicYear || '2026-27');
        }
        if (Array.isArray(deptsData)) {
          setDepartments(deptsData);
          const active = deptsData.find((d) => d.id === initialDeptId) || deptsData[0];
          if (active) {
            setSelectedDeptId(active.id);
            setCustomDeptCode(active.code);
            setCustomDeptName(active.name);
          }
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setIsLoading(false));
  }, [user?.departmentId, currentDept?.id]);

  const handleDeptSelect = (deptId: string) => {
    setSelectedDeptId(deptId);
    const found = departments.find((d) => d.id === deptId);
    if (found) {
      setCustomDeptCode(found.code);
      setCustomDeptName(found.name);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      // 1. Update active department name & code if changed
      if (selectedDeptId) {
        await authFetch(`/api/departments/${selectedDeptId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: customDeptName.trim(),
            description: `Department of ${customDeptName.trim()} at MIT Mysore`,
          }),
        });
      }

      // 2. Update institution settings
      const payload = {
        ...settings,
        defaultDepartmentId: selectedDeptId,
        currentAcademicYear: academicYear.trim(),
      };

      const res = await authFetch('/api/institution', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSuccessMsg(
          `Configuration saved! Active department set to ${customDeptName} (${customDeptCode}). Changes are now reflected across the entire portal.`
        );
        // Refresh session to update global navbar, header, and active department context
        await refreshAuth();
      } else {
        const data = await res.json();
        setErrorMsg(data.error || 'Failed to save configuration.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving settings.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !settings) {
    return <div className="p-8 text-xs text-slate-500">Loading settings...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Institution & Department Settings
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-50 text-[#7B1113] border border-rose-200">
              Active: {customDeptCode}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure the active department scope, academic year cycle, and institutional identity parameters.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs font-medium text-emerald-800 flex items-center gap-2 animate-in fade-in-50">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-800 flex items-center gap-2 animate-in fade-in-50">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Institutional Branding Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <Building className="w-4 h-4 text-[#7B1113]" />
          <span>Institutional Identity & Accreditation</span>
        </h2>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-white border-2 border-[#7B1113]/30 p-1 shadow-sm flex items-center justify-center shrink-0">
              <CrestLogo size="md" showText={false} />
            </div>
            <div>
              <p className="font-bold text-slate-900 text-sm">
                Maharaja Institute of Technology, Mysore
              </p>
              <p className="text-xs text-slate-500">
                Affiliated to VTU, Belagavi · Approved by AICTE, New Delhi
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Belawadi, Srirangapatna Taluk, Mandya Dist, Karnataka - 571477
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
            <ShieldCheck className="w-4 h-4" />
            <span>Official Institutional Crest Locked</span>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <form onSubmit={handleSave} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#7B1113]" />
            <span>Active Department Configuration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Setting the active department here dynamically updates the entire portal (Dashboard headers, faculty rosters, student cohorts, and timetable management).
          </p>
        </div>

        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Select Active Operating Department
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => handleDeptSelect(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-800"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} ({d.code})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-400 mt-1">
              Allows running this FPMS instance tailored for any department (ISE, CSE, ECE, AIML, etc.) without hardcoding.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department Name</label>
              <input
                type="text"
                required
                value={customDeptName}
                onChange={(e) => setCustomDeptName(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Department Code / Acronym</label>
              <input
                type="text"
                required
                value={customDeptCode}
                onChange={(e) => setCustomDeptCode(e.target.value.toUpperCase())}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Current Academic Assessment Cycle
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Institution Short Code
              </label>
              <input
                type="text"
                disabled
                value={settings.institutionShortName}
                className="w-full px-3 py-2 border border-slate-200 bg-slate-100 rounded-lg text-slate-600 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? 'Applying Changes...' : 'Save & Apply Department Configuration'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
