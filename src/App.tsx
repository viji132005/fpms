import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { LandingPage } from './views/LandingPage.tsx';
import { LoginPage } from './views/LoginPage.tsx';
import { AdminDashboard } from './views/AdminDashboard.tsx';
import { FacultyDashboard } from './views/FacultyDashboard.tsx';
import { StaffManagement } from './views/StaffManagement.tsx';
import { DepartmentManagement } from './views/DepartmentManagement.tsx';
import { StudentManagement } from './views/StudentManagement.tsx';
import { MentorAllocationView } from './views/MentorAllocationView.tsx';
import { TimetableManagement } from './views/TimetableManagement.tsx';
import { FacultyPortfolioView } from './views/FacultyPortfolioView.tsx';
import { DepartmentPortfolioView } from './views/DepartmentPortfolioView.tsx';
import { MentorStudentsView } from './views/MentorStudentsView.tsx';
import { AcademicFeedView } from './views/AcademicFeedView.tsx';
import { NotificationsView } from './views/NotificationsView.tsx';
import { InstitutionSettingsView } from './views/InstitutionSettingsView.tsx';
import { AuditLogsView } from './views/AuditLogsView.tsx';
import { AccountSecurityView } from './views/AccountSecurityView.tsx';
import { FacultyProfileView } from './views/FacultyProfileView.tsx';
import { MasterAdminPortal } from './views/MasterAdminPortal.tsx';
import { MasterAdminSecurityView } from './views/MasterAdminSecurityView.tsx';
import { MasterAdminAcademicYearView } from './views/MasterAdminAcademicYearView.tsx';
import { StudentSectionAllocationView } from './views/StudentSectionAllocationView.tsx';

function MainApp() {
  const { user, activeTab, isLoading, isMasterAdmin } = useAuth();
  const [showLogin, setShowLogin] = useState<boolean>(false);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-xs text-slate-400">
        Initializing FPMS Institutional Environment...
      </div>
    );
  }

  // Unauthenticated Flow
  if (!user) {
    if (showLogin) {
      return <LoginPage onBackToHome={() => setShowLogin(false)} />;
    }
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Navbar onSignInClick={() => setShowLogin(true)} />
        <LandingPage onSignInClick={() => setShowLogin(true)} />
      </div>
    );
  }

  // Master Admin Dedicated Portal Flow
  if (isMasterAdmin) {
    const renderMasterAdminContent = () => {
      switch (activeTab) {
        case 'academic-year':
          return <MasterAdminAcademicYearView />;
        case 'security':
        case 'account-security':
          return <MasterAdminSecurityView />;
        case 'departments':
        case 'master-departments':
        default:
          return <DepartmentManagement />;
      }
    };

    return (
      <div className="min-h-screen flex flex-col bg-slate-100 font-sans antialiased text-slate-900">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">{renderMasterAdminContent()}</div>
          </main>
        </div>
      </div>
    );
  }

  // Authenticated Portal Flow for Admin, HOD, Faculty, Non-Teaching
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return user.role === 'FACULTY' || user.role === 'NON_TEACHING' ? <FacultyDashboard /> : <AdminDashboard />;
      case 'staff':
        return <StaffManagement />;
      case 'departments':
        return <DepartmentManagement />;
      case 'students':
        return <StudentManagement />;
      case 'section-allocation':
        return user.role === 'ADMIN' ? <StudentSectionAllocationView /> : <AdminDashboard />;
      case 'mentor-allocation':
        return <MentorAllocationView />;
      case 'timetables':
        return <TimetableManagement />;
      case 'portfolio':
      case 'department-portfolio':
        return <FacultyPortfolioView />;
      case 'mentees':
        return <MentorStudentsView />;
      case 'feed':
        return <AcademicFeedView />;
      case 'notifications':
        return <NotificationsView />;
      case 'settings':
        return <InstitutionSettingsView />;
      case 'audit-logs':
        return <AuditLogsView />;
      case 'security':
        return <AccountSecurityView />;
      case 'profile':
        return <FacultyProfileView />;
      default:
        return user.role === 'FACULTY' || user.role === 'NON_TEACHING' ? <FacultyDashboard /> : <AdminDashboard />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 font-sans antialiased text-slate-900">
      <Navbar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
