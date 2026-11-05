import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { KeyRound, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle } from 'lucide-react';

export const MasterAdminSecurityView: React.FC = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    newEmail: user?.email || 'admin@mitmysore.in',
    newPassword: '',
    confirmPassword: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setErrorMsg('New password and confirmation password do not match.');
      return;
    }

    if (form.newPassword && form.newPassword.length < 4) {
      setErrorMsg('New password must be at least 4 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/admin/change-credentials', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: user?.id,
          newEmail: form.newEmail.trim(),
          newPassword: form.newPassword || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to update Master Admin credentials.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Master Admin credentials successfully updated! Email: ${data.user.email}.`);
      setForm((prev) => ({
        ...prev,
        newEmail: data.user.email,
        newPassword: '',
        confirmPassword: '',
      }));
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
            <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
            MASTER ADMINISTRATOR SECURITY
          </span>
        </div>
        <h1 className="text-xl font-extrabold tracking-tight">
          Change Master Admin Email ID & Password
        </h1>
        <p className="text-xs text-slate-300 max-w-xl mt-1">
          Update the institutional Master Administrator credentials governing central portal access.
        </p>
      </div>

      {/* Main Credentials Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-start gap-4 pb-4 border-b border-slate-100">
          <div className="p-3 bg-amber-50 text-amber-800 rounded-2xl border border-amber-200">
            <KeyRound className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Institutional Master Administrator Security
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Modify your official Master Admin login email ID and master password.
            </p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-medium text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-xs font-medium text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 text-xs space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Current Active Session
            </span>
            <div className="flex items-center justify-between font-mono">
              <span className="text-slate-800 font-bold">{user?.email}</span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                MASTER ADMIN (SUPERUSER)
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Master Admin Login Email ID *
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={form.newEmail}
                onChange={(e) => setForm({ ...form, newEmail: e.target.value })}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                placeholder="admin@mitmysore.in"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                New Master Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  placeholder="Leave blank to keep unchanged"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  placeholder="Re-type new password"
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-none focus:ring-2 focus:ring-[#7B1113]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Changes take effect immediately on next login.
            </span>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-xl shadow-md transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Changes...' : 'Save Master Admin Credentials'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
