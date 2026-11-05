import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, StaffProfile, Department, Notification, InstitutionSettings } from '../types/index.ts';
import { authFetch, authFetchJson, setAuthToken, getAuthToken } from '../utils/api.ts';

interface AuthContextType {
  user: User | null;
  profile: StaffProfile | null;
  department: Department | null;
  institution: InstitutionSettings | null;
  isLoading: boolean;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notifications: Notification[];
  unreadCount: number;
  isMasterAdmin: boolean;
  login: (email: string, pass: string) => Promise<{ success: boolean; error?: string }>;
  loginWithMasterOtp: (email: string, otp: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<StaffProfile | null>(null);
  const [department, setDepartment] = useState<Department | null>(null);
  const [institution, setInstitution] = useState<InstitutionSettings | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const fetchAuthUser = async () => {
    try {
      const { data, status } = await authFetchJson<{
        user?: User;
        profile?: StaffProfile;
        department?: Department;
        institution?: InstitutionSettings;
        token?: string;
      }>('/api/auth/me');

      if (status === 200 && data?.user) {
        setUser(data.user);
        setProfile(data.profile || null);
        setDepartment(data.department || null);
        if (data.institution) {
          setInstitution(data.institution);
        }
        if (data.token) {
          setAuthToken(data.token);
        }
        return;
      }
      setUser(null);
      setProfile(null);
      setDepartment(null);
      setInstitution(null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    try {
      const { data, status } = await authFetchJson<Notification[]>('/api/notifications');
      if (status === 200 && Array.isArray(data)) {
        setNotifications(data);
      } else if (status === 401) {
        setNotifications([]);
      }
    } catch {
      // Benign catch for background polling during offline or reload states
    }
  };

  useEffect(() => {
    fetchAuthUser();
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      // Periodically refresh notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [user]);

  const login = async (email: string, pass: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password: pass }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      setProfile(data.profile);
      setDepartment(data.department);
      const isMaster = Boolean(
        data.user?.role === 'ADMIN' &&
          (!data.user.departmentId ||
            data.user.email.toLowerCase().includes('masteradmin') ||
            data.user.email.toLowerCase().includes('4mh23is119'))
      );
      setActiveTab(isMaster ? 'departments' : 'dashboard');
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const loginWithMasterOtp = async (email: string, otp: string) => {
    try {
      const res = await fetch('/api/auth/master-admin/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, otp }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Verification failed.' };
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      setUser(data.user);
      setProfile(data.profile);
      setDepartment(null);
      setActiveTab('departments'); // Direct to Master Admin Department management
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error' };
    }
  };

  const logout = async () => {
    try {
      await authFetch('/api/auth/logout', { method: 'POST' });
    } finally {
      setAuthToken(null);
      setUser(null);
      setProfile(null);
      setDepartment(null);
      setActiveTab('dashboard');
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const isMasterAdmin = Boolean(
    user?.role === 'ADMIN' &&
      (!user.departmentId ||
        user.email.toLowerCase().includes('masteradmin') ||
        user.email.toLowerCase().includes('4mh23is119'))
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        department,
        institution,
        isLoading,
        activeTab,
        setActiveTab,
        notifications,
        unreadCount,
        isMasterAdmin,
        login,
        loginWithMasterOtp,
        logout,
        refreshAuth: fetchAuthUser,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
