import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { CrestLogo } from '../components/CrestLogo.tsx';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  Building2,
  CalendarDays,
  UserCheck,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  School,
  CheckCircle2,
} from 'lucide-react';

interface LoginPageProps {
  onBackToHome?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToHome }) => {
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Please provide your institutional email / ID and password.');
      return;
    }

    setIsLoading(true);
    const res = await login(email.trim(), password);
    setIsLoading(false);
    if (!res.success) {
      setError(res.error || 'Invalid credentials. Please verify your email and password.');
    }
  };

  const handleQuickFill = (fillEmail: string, fillPass: string) => {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex flex-col justify-center py-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Decorative Ambient Rings */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#7B1113]/25 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-amber-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 mb-6 flex flex-col items-center justify-center">
        <div className="flex items-center justify-center p-3 rounded-2xl bg-white/10 border border-white/20 shadow-2xl backdrop-blur-md mb-4 ring-1 ring-white/20">
          <CrestLogo size="xl" showText={false} />
        </div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/10 border border-amber-400/25 text-amber-300 text-[11px] font-semibold tracking-wide uppercase mb-2">
          <School className="w-3.5 h-3.5 text-amber-400" />
          <span>Affiliated to VTU & AICTE Approved</span>
        </div>
        <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight text-center">
          Maharaja Institute of Technology, Mysore
        </h1>
        <p className="mt-1 text-xs text-slate-300 font-medium text-center">
          Faculty Portfolio & Academic Governance Management System (FPMS)
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-xl py-7 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20 relative">
          {/* Top-left corner: Professional Back to Home button */}
          {onBackToHome && (
            <div className="mb-4">
              <button
                type="button"
                onClick={onBackToHome}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-[#7B1113] bg-slate-50 hover:bg-rose-50/70 border border-slate-200/80 hover:border-rose-200 transition-colors duration-150 cursor-pointer shadow-xs group"
                title="Back to home"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-[#7B1113] group-hover:-translate-x-0.5 transition-all" />
                <span>Back to Home</span>
              </button>
            </div>
          )}

          <div className="mb-6 pb-4 border-b border-slate-100">
            <h2 className="text-base font-bold text-slate-900 tracking-tight">
              Institutional Portal Sign In
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Standard single login for all authorized roles & coordinators
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-in fade-in-50">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span className="leading-relaxed">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Institutional Email or Authorized ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ise.admin@mitmysore.in or masteradmin@gmail.com"
                  required
                  autoComplete="username"
                  className="block w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1113] focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Default test: mitm123
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your security credentials"
                  required
                  autoComplete="current-password"
                  className="block w-full pl-10 pr-10 py-2.5 text-xs rounded-xl border border-slate-200 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#7B1113] focus:border-transparent transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-3 py-3 px-4 text-xs font-bold text-white bg-gradient-to-r from-[#7B1113] via-[#8e1417] to-[#7B1113] hover:from-[#660c0e] hover:to-[#660c0e] rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <span>{isLoading ? 'Authenticating...' : 'Sign In to Portal'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Quick Test Accounts Pill Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Quick Test Accounts</span>
              </span>
              <span className="text-[10px] text-slate-400 font-mono">1-click fill</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* 1. Master Admin */}
              <button
                type="button"
                onClick={() => handleQuickFill('masteradmin@gmail.com', 'mitm123')}
                className="p-2.5 text-left rounded-xl border border-amber-200 bg-amber-50/70 hover:bg-amber-100/80 transition-all group"
              >
                <div className="flex items-center gap-1.5 text-amber-900 font-bold text-[11px] mb-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span className="truncate">Master Admin</span>
                </div>
                <div className="text-[10px] text-amber-700/80 truncate font-mono">
                  masteradmin@gmail.com
                </div>
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  Depts & Credentials
                </div>
              </button>

              {/* 2. Information Science Admin (NEW!) */}
              <button
                type="button"
                onClick={() => handleQuickFill('ise.admin@mitmysore.in', 'mitm123')}
                className="p-2.5 text-left rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/80 transition-all group ring-1 ring-rose-300/40"
              >
                <div className="flex items-center gap-1.5 text-[#7B1113] font-bold text-[11px] mb-0.5">
                  <CalendarDays className="w-3.5 h-3.5 text-[#7B1113] shrink-0" />
                  <span className="truncate">ISE Admin</span>
                </div>
                <div className="text-[10px] text-rose-800/80 truncate font-mono">
                  ise.admin@mitmysore.in
                </div>
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  Timetables & Generation
                </div>
              </button>

              {/* 3. HOD (ISE) */}
              <button
                type="button"
                onClick={() => handleQuickFill('hod.ise@mitmysore.in', 'mitm123')}
                className="p-2.5 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] mb-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">HOD (ISE)</span>
                </div>
                <div className="text-[10px] text-slate-600 truncate font-mono">
                  hod.ise@mitmysore.in
                </div>
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  View & Download only
                </div>
              </button>

              {/* 4. Faculty (ISE) */}
              <button
                type="button"
                onClick={() => handleQuickFill('gururaja.ise@mitmysore.in', 'mitm123')}
                className="p-2.5 text-left rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 transition-all"
              >
                <div className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] mb-0.5">
                  <UserCheck className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="truncate">Faculty (ISE)</span>
                </div>
                <div className="text-[10px] text-slate-600 truncate font-mono">
                  gururaja.ise@mitmysore.in
                </div>
                <div className="text-[9px] text-slate-500 mt-1 truncate">
                  My Teaching Schedule
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Institutional Accreditation Footnote */}
        <div className="mt-5 text-center text-[11px] text-slate-400 space-y-1">
          <p className="font-medium">
            Maharaja Institute of Technology Mysore (MIT Mysore)
          </p>
          <p className="text-[10px] text-slate-500">
            Belavadi, Srirangapatna Taluk, Mandya Dist, Karnataka — 571477
          </p>
        </div>
      </div>
    </div>
  );
};
