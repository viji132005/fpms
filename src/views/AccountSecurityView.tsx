import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { authFetch } from '../utils/api.ts';
import { KeyRound, ShieldCheck, CheckCircle2, AlertCircle, Lock, Mail, Phone, UserCheck } from 'lucide-react';

export const AccountSecurityView: React.FC = () => {
  const { user, profile, logout } = useAuth();
  
  // Contact details state
  const [email, setEmail] = useState(user?.email || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [isSubmittingContact, setIsSubmittingContact] = useState(false);
  const [contactMessage, setContactMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleContactUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setContactMessage(null);

    if (!email || !email.includes('@')) {
      setContactMessage({ type: 'error', text: 'Please enter a valid institutional email.' });
      return;
    }

    setIsSubmittingContact(true);
    try {
      const res = await authFetch('/api/auth/update-contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), phone: phone.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setContactMessage({ type: 'error', text: data.error || 'Failed to update contact info.' });
      } else {
        setContactMessage({ type: 'success', text: 'Email & phone credentials updated successfully.' });
      }
    } catch (err: any) {
      setContactMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setIsSubmittingContact(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'New passwords do not match.' });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsSubmittingPassword(true);
    try {
      const res = await authFetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPasswordMessage({ type: 'error', text: data.error || 'Failed to update password.' });
      } else {
        setPasswordMessage({ type: 'success', text: 'Your password was updated successfully.' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      setPasswordMessage({ type: 'error', text: err.message || 'Network error.' });
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          Account Credentials & Security
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Manage your institutional sign-in email, contact phone number, and password.
        </p>
      </div>

      {/* Account Info Box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3 text-xs">
        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          Active Institutional Identity
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-slate-500 block">Signed In As:</span>
            <span className="font-mono font-semibold text-slate-800">{user?.email}</span>
          </div>
          <div>
            <span className="text-slate-500 block">System Role:</span>
            <span className="font-bold text-[#7B1113]">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* SECTION 1: Update Email & Phone */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#7B1113]" />
          <span>Update Institutional Email & Phone Number</span>
        </h2>

        {contactMessage && (
          <div
            className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              contactMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {contactMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{contactMessage.text}</span>
          </div>
        )}

        <form onSubmit={handleContactUpdate} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5 text-slate-400" />
              <span>Official Email Address</span>
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. yourname.ise@mitmysore.in"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Used as your primary login identifier for FPMS.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1 flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>Contact Phone Number</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 9845012345"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmittingContact}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmittingContact ? 'Saving Changes...' : 'Save Email & Phone'}
            </button>
          </div>
        </form>
      </div>

      {/* SECTION 2: Password Change Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-[#7B1113]" />
          <span>Change Sign-In Password</span>
        </h2>

        {passwordMessage && (
          <div
            className={`p-3 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              passwordMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {passwordMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{passwordMessage.text}</span>
          </div>
        )}

        <form onSubmit={handlePasswordChange} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Password (Min. 6 chars)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter new strong password"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              className="w-full px-3 py-1.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#7B1113]"
            />
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#7B1113] hover:bg-[#600d0f] rounded-lg shadow-sm disabled:opacity-50 transition-colors"
            >
              {isSubmittingPassword ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
