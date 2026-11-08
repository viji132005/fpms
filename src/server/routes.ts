import express, { type Request, type Response, type NextFunction } from 'express';
import {
  db,
  type User,
  type AuditLog,
  type Notification,
  type Department,
  type StaffProfile,
  type Student,
  type MentorAllocation,
  type Task,
  type StructuredTimetable,
  type AcademicSubject,
  type SubjectAllocationRecord,
} from './db.ts';
import { calculateBalancedMentorAllocation, calculateCombinedMultiYearAllocation } from '../utils/allocation.ts';
import {
  generatePromotionPlan,
  executePromotion,
  checkPromotionCollision,
  executeCascadeAnnualPromotion,
  generateCascadePromotionPlan,
  generateSemesterProgressionPreview,
  executeSemesterProgression,
  detectDepartmentSemesterCycle,
} from '../utils/promotion.ts';
import {
  executeRandomBalancedAllocation,
  executePerformanceBalancedAllocation,
  calculateBalancedSectionSizes,
  DEFAULT_PERFORMANCE_BANDS,
} from '../utils/sectionAllocation.ts';
import {
  generatePerformanceTemplate,
  parsePerformanceExcel,
  exportSectionAllocationWorkbook,
  exportSectionAllocationCsv,
} from '../utils/sectionAllocationExcel.ts';
import type { StudentSectionAllocationRun } from '../types/index.ts';
import { validateSubmissionTransition } from '../utils/taskStateMachine.ts';
import { calculateProfileCompleteness } from '../utils/completeness.ts';
import { generateGroundedGeminiReport, generateDeterministicReport, consultReportAssistant } from './gemini.ts';
import { generateVtuCohortStudents, detectUsnCollisions } from '../utils/cohortGenerator.ts';
import {
  validateTimetableRules,
  canPublishTimetable,
  generateAutomatedTimetableGrid,
  extractFacultyPersonalSchedule,
  type FacultyAssignment,
  type TimetableSlot,
} from '../utils/timetableValidation.ts';
import {
  getInitialAcademicSubjects,
  getInitialSubjectAllocations,
  getInitial6thSemTimetables,
} from './seedTimetableData.ts';
import { validateCrossSectionClashes, getOrdinalSemester } from '../utils/timetableMultiSection.ts';

export const apiRouter = express.Router();

// Helper to log audit events
function logAudit(
  actor: { id: string; email: string; role: string },
  action: string,
  targetEntity: string,
  targetId: string,
  details: string,
  req?: Request
) {
  const log: AuditLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    actorUserId: actor.id,
    actorEmail: actor.email,
    actorRole: actor.role,
    action,
    targetEntity,
    targetId,
    details,
    ipAddress: req?.ip || '127.0.0.1',
    timestamp: new Date().toISOString(),
  };
  db.getData().auditLogs.unshift(log);
  db.save();
}

// Helper to dispatch in-app notifications
function dispatchNotification(
  recipientUserId: string,
  title: string,
  message: string,
  type: Notification['type'],
  linkUrl?: string,
  actor?: { id: string; name: string }
) {
  const notif: Notification = {
    id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    recipientUserId,
    actorUserId: actor?.id,
    actorName: actor?.name,
    title,
    message,
    type,
    linkUrl,
    isRead: false,
    createdAt: new Date().toISOString(),
  };
  db.getData().notifications.unshift(notif);
  db.save();
}

// Authentication Middleware
export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function authMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  // Support both cookie and Authorization header Bearer token / userId
  const sessionToken =
    req.cookies?.fpms_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : null);

  if (!sessionToken) {
    return res.status(401).json({ error: 'Authentication required. Please sign in.' });
  }

  const user = db.getData().users.find(
    (u) => u.id === sessionToken || u.email === sessionToken
  );

  if (!user || user.status !== 'ACTIVE') {
    return res.status(401).json({ error: 'Invalid or deactivated session. Please sign in again.' });
  }

  req.user = user;
  next();
}

// Role Guard Middleware
export function requireRole(allowedRoles: ('ADMIN' | 'HOD' | 'FACULTY' | 'NON_TEACHING')[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
    }
    next();
  };
}

// ==========================================
// 1. AUTHENTICATION & PROFILE
// ==========================================

// In-memory Master Admin OTP verification store
const masterAdminOtpStore = new Map<string, { code: string; expiresAt: number }>();

apiRouter.post('/auth/master-admin/request-otp', (req: Request, res: Response) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Master Admin email address is required.' });
  }

  const normalized = String(email).trim().toLowerCase();
  const allowedMasterEmails = [
    'masteradmin@gmail.com',
    '4mh23is119@gmail.com',
    'admin@mitmysore.in',
  ];

  // Verify that the requested email is either an authorized master admin email or has ADMIN role in DB
  const data = db.getData();
  const dbUser = data.users.find((u) => u.email.toLowerCase() === normalized);
  const isMasterAdmin =
    allowedMasterEmails.includes(normalized) || (dbUser && dbUser.role === 'ADMIN');

  if (!isMasterAdmin) {
    return res.status(403).json({
      error: `Access denied. "${email}" is not authorized for Master Administrator access. Use masteradmin@gmail.com or 4MH23IS119@gmail.com.`,
    });
  }

  // Generate 6-digit verification code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

  masterAdminOtpStore.set(normalized, { code, expiresAt });

  logAudit(
    { id: dbUser?.id || 'master-system', email: normalized, role: 'ADMIN' },
    'MASTER_ADMIN_OTP_REQUESTED',
    'SECURITY',
    normalized,
    `Master Admin 6-digit OTP dispatched to ${normalized}.`,
    req
  );

  return res.json({
    success: true,
    email: normalized,
    otp: code, // Provided for instant simulation & auto-fill in development environment
    expiresInSeconds: 600,
    message: `Official MIT Mysore Master Admin verification code dispatched to ${normalized}.`,
  });
});

apiRouter.post('/auth/master-admin/verify-otp', (req: Request, res: Response) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    return res.status(400).json({ error: 'Master Admin email and 6-digit verification code are required.' });
  }

  const normalized = String(email).trim().toLowerCase();
  const normalizedOtp = String(otp).trim();
  const entry = masterAdminOtpStore.get(normalized);

  // Validate OTP
  if (!entry || entry.code !== normalizedOtp) {
    return res.status(400).json({ error: 'Invalid 6-digit verification code. Please check or request a new code.' });
  }

  if (Date.now() > entry.expiresAt) {
    masterAdminOtpStore.delete(normalized);
    return res.status(400).json({ error: 'Verification code has expired. Please request a new code.' });
  }

  // Clear OTP on successful verification
  masterAdminOtpStore.delete(normalized);

  // Find or provision Master Admin user
  const data = db.getData();
  let user = data.users.find((u) => u.email.toLowerCase() === normalized);

  if (!user) {
    const newId = `user-master-${Date.now().toString(36)}`;
    user = {
      id: newId,
      email: normalized,
      passwordHash: 'mitm123',
      role: 'ADMIN',
      departmentId: null,
      status: 'ACTIVE',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };
    data.users.push(user);

    data.staffProfiles.push({
      id: `sp-${newId}`,
      userId: newId,
      staffId: normalized.includes('4mh') ? 'MITM-MASTER-002' : 'MITM-MASTER-001',
      fullName: normalized.includes('4mh')
        ? 'Executive Master Administrator (4MH23IS119)'
        : 'Master Administrator',
      phone: '9880011223',
      designation: 'Chief Executive Master Admin',
      qualification: 'Ph.D, M.Tech',
      specialization: 'Institutional Academic Governance & Accreditation',
      isTeachingFaculty: false,
      isMentorEligible: false,
      bio: 'Verified Master Administrator authenticated for institutional governance and department delegation.',
    });
    db.save();
  }

  const staffProfile = data.staffProfiles.find((sp) => sp.userId === user!.id);

  // Set session cookie
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('fpms_session', user.id, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logAudit(
    { id: user.id, email: user.email, role: 'ADMIN' },
    'MASTER_ADMIN_OTP_VERIFIED_LOGIN',
    'USER',
    user.id,
    `Master Admin authenticated via verified email code: ${user.email}`,
    req
  );

  return res.json({
    success: true,
    token: user.id,
    isMasterAdmin: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: null,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    profile: staffProfile,
    department: null,
  });
});

apiRouter.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Institutional email and password are required.' });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const user = db
    .getData()
    .users.find((u) => u.email.toLowerCase() === normalizedEmail);

  if (!user) {
    return res.status(401).json({ error: 'Invalid institutional credentials.' });
  }

  if (user.status !== 'ACTIVE') {
    return res.status(403).json({ error: 'Account is deactivated. Contact the Administrator.' });
  }

  // Check password
  if (user.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid institutional credentials.' });
  }

  const staffProfile = db
    .getData()
    .staffProfiles.find((sp) => sp.userId === user.id);
  const department = user.departmentId
    ? db.getData().departments.find((d) => d.id === user.departmentId)
    : null;

  // Set session cookie (supports both standard and iframe embedding)
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie('fpms_session', user.id, {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  logAudit(
    { id: user.id, email: user.email, role: user.role },
    'USER_LOGIN',
    'USER',
    user.id,
    `User ${user.email} signed in successfully.`,
    req
  );

  return res.json({
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId,
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    profile: staffProfile,
    department,
  });
});

apiRouter.post('/auth/logout', (req: Request, res: Response) => {
  const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie('fpms_session', {
    httpOnly: true,
    sameSite: isSecure ? 'none' : 'lax',
    secure: isSecure,
  });
  return res.json({ success: true, message: 'Signed out successfully.' });
});

apiRouter.get('/auth/me', (req: AuthenticatedRequest, res: Response) => {
  const sessionToken =
    req.cookies?.fpms_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : null);

  if (!sessionToken) {
    return res.json({ user: null });
  }

  const user = db
    .getData()
    .users.find((u) => u.id === sessionToken || u.email === sessionToken);

  if (!user || user.status !== 'ACTIVE') {
    return res.json({ user: null });
  }

  const data = db.getData();
  const defaultDept =
    data.departments.find((d) => d.id === data.institution.defaultDepartmentId) ||
    data.departments[0];
  const department = user.departmentId
    ? data.departments.find((d) => d.id === user.departmentId)
    : defaultDept;
  const profile = data.staffProfiles.find((sp) => sp.userId === user.id) || null;

  return res.json({
    token: user.id,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      departmentId: user.departmentId || defaultDept?.id || 'dept-ise',
      status: user.status,
      mustChangePassword: user.mustChangePassword,
    },
    profile,
    department,
    institution: data.institution,
  });
});

apiRouter.post(
  '/auth/change-password',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const user = req.user!;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    if (user.passwordHash !== currentPassword) {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }

    user.passwordHash = newPassword;
    user.mustChangePassword = false;
    db.save();

    logAudit(
      { id: user.id, email: user.email, role: user.role },
      'PASSWORD_CHANGE',
      'USER',
      user.id,
      'User successfully changed their password.',
      req
    );

    return res.json({ success: true, message: 'Password updated successfully.' });
  }
);

apiRouter.post(
  '/auth/update-contact',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { email, phone } = req.body;
    const user = req.user!;
    const data = db.getData();

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'A valid institutional email address is required.' });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPhone = phone ? String(phone).trim() : '';

    // Check if email already taken by another user
    const existing = data.users.find((u) => u.email === trimmedEmail && u.id !== user.id);
    if (existing) {
      return res.status(400).json({ error: 'This email address is already in use by another account.' });
    }

    user.email = trimmedEmail;
    const profile = data.staffProfiles.find((sp) => sp.userId === user.id);
    if (profile && trimmedPhone) {
      profile.phone = trimmedPhone;
    }

    db.save();

    logAudit(
      { id: user.id, email: user.email, role: user.role },
      'UPDATE_CONTACT_INFO',
      'USER',
      user.id,
      `Updated contact credentials: email ${trimmedEmail}, phone ${trimmedPhone}`,
      req
    );

    return res.json({
      success: true,
      message: 'Contact credentials updated successfully.',
      email: user.email,
      phone: profile?.phone || trimmedPhone,
    });
  }
);

apiRouter.post(
  '/admin/change-credentials',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { targetUserId, targetEmail, newEmail, newStaffId, newPassword, newFullName } = req.body;
    const data = db.getData();

    let targetUser: User | undefined;
    if (targetUserId) {
      targetUser = data.users.find((u) => u.id === targetUserId);
    } else if (targetEmail) {
      targetUser = data.users.find((u) => u.email.toLowerCase() === targetEmail.trim().toLowerCase());
    } else {
      targetUser = req.user!;
    }

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user account not found.' });
    }

    if (newEmail && newEmail.trim().toLowerCase() !== targetUser.email.toLowerCase()) {
      const trimmedEmail = newEmail.trim().toLowerCase();
      const existing = data.users.find((u) => u.email.toLowerCase() === trimmedEmail && u.id !== targetUser!.id);
      if (existing) {
        return res.status(400).json({ error: `Email ${trimmedEmail} is already taken by another account.` });
      }
      targetUser.email = trimmedEmail;
    }

    if (newPassword && newPassword.trim().length >= 4) {
      targetUser.passwordHash = newPassword.trim();
    }

    const profile = data.staffProfiles.find((sp) => sp.userId === targetUser!.id);
    if (profile) {
      if (newStaffId && newStaffId.trim()) {
        profile.staffId = newStaffId.trim();
      }
      if (newFullName && newFullName.trim()) {
        profile.fullName = newFullName.trim();
      }
    }

    if (targetUser.departmentId) {
      const dept = data.departments.find((d) => d.id === targetUser!.departmentId);
      if (dept) {
        dept.savedCredentials = {
          email: targetUser.email,
          temporaryPassword: targetUser.passwordHash,
          issuedAt: new Date().toISOString(),
          role: targetUser.role === 'ADMIN' ? 'Department Admin' : 'Head of Department',
          staffId: profile?.staffId,
        };
      }
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'ADMIN_CHANGE_USER_CREDENTIALS',
      'USER',
      targetUser.id,
      `Master Admin updated credentials for ${targetUser.email} (staffId: ${profile?.staffId}).`,
      req
    );

    return res.json({
      success: true,
      message: `Credentials updated successfully for ${targetUser.email}.`,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        departmentId: targetUser.departmentId,
      },
      profile,
    });
  }
);

// ==========================================
// 2. INSTITUTION & DEPARTMENTS
// ==========================================

apiRouter.get('/institution', (req: Request, res: Response) => {
  const data = db.getData();
  return res.json({
    institution: data.institution,
    departmentsCount: data.departments.filter((d) => d.active).length,
    facultyCount: data.staffProfiles.filter((s) => s.isTeachingFaculty).length,
    studentsCount: data.students.filter((s) => s.status === 'ACTIVE').length,
  });
});

apiRouter.put(
  '/institution',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const {
      institutionName,
      institutionShortName,
      tagline,
      currentAcademicYear,
      primaryColor,
      secondaryColor,
      logoUrl,
      defaultDepartmentId,
    } = req.body;

    if (institutionName) data.institution.institutionName = institutionName;
    if (institutionShortName) data.institution.institutionShortName = institutionShortName;
    if (tagline !== undefined) data.institution.tagline = tagline;
    if (currentAcademicYear) data.institution.currentAcademicYear = currentAcademicYear;
    if (primaryColor) data.institution.primaryColor = primaryColor;
    if (secondaryColor) data.institution.secondaryColor = secondaryColor;
    if (logoUrl !== undefined) data.institution.logoUrl = logoUrl;
    if (defaultDepartmentId) data.institution.defaultDepartmentId = defaultDepartmentId;

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'UPDATE_INSTITUTION_SETTINGS',
      'INSTITUTION',
      'settings',
      'Updated institutional branding and academic year settings.',
      req
    );

    return res.json({ success: true, institution: data.institution });
  }
);

apiRouter.get('/departments', (req: Request, res: Response) => {
  const data = db.getData();
  const departmentsWithDetails = data.departments.map((dept) => {
    const hodUser = dept.hodId ? data.users.find((u) => u.id === dept.hodId) : null;
    const hodProfile = hodUser
      ? data.staffProfiles.find((sp) => sp.userId === hodUser.id)
      : null;

    const teachingFacultyCount = data.staffProfiles.filter((sp) => {
      const u = data.users.find((user) => user.id === sp.userId);
      return u?.departmentId === dept.id && sp.isTeachingFaculty && u.status === 'ACTIVE';
    }).length;

    const nonTeachingStaffCount = data.staffProfiles.filter((sp) => {
      const u = data.users.find((user) => user.id === sp.userId);
      return u?.departmentId === dept.id && !sp.isTeachingFaculty && u.status === 'ACTIVE';
    }).length;

    const activeStudentsCount = data.students.filter(
      (s) => s.departmentId === dept.id && s.status === 'ACTIVE'
    ).length;

    return {
      ...dept,
      hod: hodProfile
        ? {
            id: hodProfile.userId,
            fullName: hodProfile.fullName,
            email: hodUser?.email,
            phone: hodProfile.phone,
            designation: hodProfile.designation,
          }
        : null,
      stats: {
        teachingFacultyCount,
        nonTeachingStaffCount,
        activeStudentsCount,
      },
    };
  });

  return res.json(departmentsWithDetails);
});

apiRouter.post(
  '/departments',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { name, code, description } = req.body;
    if (!name || !code) {
      return res.status(400).json({ error: 'Department name and unique code are required.' });
    }

    const data = db.getData();
    const normalizedCode = code.trim().toUpperCase();
    if (data.departments.some((d) => d.code === normalizedCode)) {
      return res.status(400).json({ error: `Department code ${normalizedCode} already exists.` });
    }

    const newDept: Department = {
      id: `dept-${normalizedCode.toLowerCase()}`,
      code: normalizedCode,
      name: name.trim(),
      description: description || '',
      hodId: null,
      active: true,
      createdAt: new Date().toISOString(),
    };

    data.departments.push(newDept);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CREATE_DEPARTMENT',
      'DEPARTMENT',
      newDept.id,
      `Created department ${newDept.name} (${newDept.code}).`,
      req
    );

    return res.status(201).json(newDept);
  }
);

apiRouter.post(
  '/departments/provision',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      name,
      code,
      description,
      adminName,
      adminEmail,
      adminPhone,
      adminPassword,
      adminDesignation,
      hodName,
      hodEmail,
      hodPhone,
      hodPassword,
      hodDesignation,
    } = req.body;

    const finalAdminName = (adminName || hodName || '').trim();
    const finalAdminEmail = (adminEmail || hodEmail || '').trim();

    if (!name || !code || !finalAdminName || !finalAdminEmail) {
      return res.status(400).json({
        error: 'Department name, unique code, Department Admin full name, and official email are required.',
      });
    }

    const data = db.getData();
    const normalizedCode = code.trim().toUpperCase();
    const normalizedEmail = finalAdminEmail.toLowerCase();

    if (data.departments.some((d) => d.code === normalizedCode)) {
      return res.status(400).json({ error: `Department code "${normalizedCode}" already exists.` });
    }

    if (data.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({
        error: `User with email "${normalizedEmail}" already exists. Please provide a distinct departmental email.`,
      });
    }

    const deptId = `dept-${normalizedCode.toLowerCase()}`;
    const adminUserId = `user-admin-${normalizedCode.toLowerCase()}-${Date.now().toString(36)}`;
    const rawPass = adminPassword || hodPassword;
    const initialPassword = rawPass && rawPass.trim().length >= 4 ? rawPass.trim() : 'mitm123';
    const finalDesignation = (adminDesignation || hodDesignation || 'Associate Professor & Timetable Coordinator').trim();

    // STRICT USER REQUIREMENT: Provision individual department admin (ADMIN role), NOT HOD
    const adminUser: User = {
      id: adminUserId,
      email: normalizedEmail,
      passwordHash: initialPassword,
      role: 'ADMIN',
      departmentId: deptId,
      status: 'ACTIVE',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    };

    const adminProfile: StaffProfile = {
      id: `sp-${adminUserId}`,
      userId: adminUserId,
      staffId: `MITM-${normalizedCode}-ADM`,
      fullName: finalAdminName,
      phone: (adminPhone || hodPhone || '').trim(),
      designation: finalDesignation,
      qualification: 'M.Tech, Ph.D',
      specialization: name.trim(),
      isTeachingFaculty: true,
      isMentorEligible: true,
      bio: `Authorized Department Administrator for ${name.trim()}, MIT Mysore. Oversees timetable creation, academic courses, faculty allocations, and departmental operations.`,
    };

    const newDept: Department = {
      id: deptId,
      code: normalizedCode,
      name: name.trim(),
      description:
        description ||
        `Department of ${name.trim()} at Maharaja Institute of Technology Mysore`,
      hodId: null,
      active: true,
      createdAt: new Date().toISOString(),
      savedCredentials: {
        email: normalizedEmail,
        temporaryPassword: initialPassword,
        issuedAt: new Date().toISOString(),
        role: 'Department Administrator (ADMIN)',
        staffId: `MITM-${normalizedCode}-ADM`,
        adminName: finalAdminName,
      },
    };

    data.users.push(adminUser);
    data.departments.push(newDept);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'PROVISION_DEPARTMENT_AND_ADMIN',
      'DEPARTMENT',
      deptId,
      `Master Admin created department ${newDept.name} (${newDept.code}) and provisioned Department Admin credentials for ${adminProfile.fullName} (${adminUser.email}).`,
      req
    );

    return res.status(201).json({
      success: true,
      department: newDept,
      adminUser: {
        id: adminUser.id,
        email: adminUser.email,
        role: adminUser.role,
        departmentId: adminUser.departmentId,
      },
      adminProfile,
      handoverCard: {
        departmentName: newDept.name,
        departmentCode: newDept.code,
        adminName: adminProfile.fullName,
        email: adminUser.email,
        temporaryPassword: initialPassword,
        role: 'Department Administrator (ADMIN)',
        designation: adminProfile.designation,
        phone: adminProfile.phone,
        loginUrl: '/login',
        issuedAt: newDept.savedCredentials?.issuedAt || new Date().toISOString(),
        instructions:
          'Official credentials issued by Institutional Master Admin. Use institutional email and password to log in and manage departmental timetables, academic courses, faculty allocations, and student cohorts.',
      },
    });
  }
);

// Delete department (exclusive to Master Admin, prevents deleting primary ISE dept)
apiRouter.delete(
  '/departments/:id',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();

    if (id === 'dept-ise') {
      return res.status(400).json({
        error: 'Information Science & Engineering is the primary institutional department and cannot be deleted.',
      });
    }

    const deptIdx = data.departments.findIndex((d) => d.id === id);
    if (deptIdx === -1) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    const removedDept = data.departments.splice(deptIdx, 1)[0];

    // Clean up associated users and profiles for this department
    data.users = data.users.filter((u) => u.departmentId !== id);
    data.staffProfiles = data.staffProfiles.filter((sp) => {
      const u = data.users.find((user) => user.id === sp.userId);
      return !u || u.departmentId !== id;
    });

    // Clean up isolated data for this department
    if (data.structuredTimetables) {
      data.structuredTimetables = data.structuredTimetables.filter((t) => t.departmentId !== id);
    }
    if (data.academicSubjects) {
      data.academicSubjects = data.academicSubjects.filter((s) => s.departmentId !== id);
    }
    if (data.subjectAllocations) {
      data.subjectAllocations = data.subjectAllocations.filter((a) => a.departmentId !== id);
    }
    if (data.students) {
      data.students = data.students.filter((st) => st.departmentId !== id);
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'DELETE_DEPARTMENT',
      'DEPARTMENT',
      id,
      `Master Admin deleted department ${removedDept.name} (${removedDept.code}) and associated data.`,
      req
    );

    return res.json({
      success: true,
      message: `Department ${removedDept.name} (${removedDept.code}) and its associated portal data removed successfully.`,
    });
  }
);

apiRouter.post(
  '/departments/:id/reset-admin-credentials',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { newPassword, fullName, email, phone, designation } = req.body;
    const data = db.getData();
    const dept = data.departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    let adminUser = data.users.find((u) => u.departmentId === dept.id && u.role === 'ADMIN');
    let adminProfile = adminUser ? data.staffProfiles.find((sp) => sp.userId === adminUser!.id) : null;

    const initialPassword =
      newPassword && newPassword.trim().length >= 4 ? newPassword.trim() : 'mitm123';

    if (!adminUser) {
      const adminUserId = `user-admin-${dept.code.toLowerCase()}-${Date.now().toString(36)}`;
      adminUser = {
        id: adminUserId,
        email: (email || `${dept.code.toLowerCase()}.admin@mitmysore.in`).trim().toLowerCase(),
        passwordHash: initialPassword,
        role: 'ADMIN',
        departmentId: dept.id,
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      adminProfile = {
        id: `sp-${adminUserId}`,
        userId: adminUserId,
        staffId: `MITM-${dept.code}-ADM`,
        fullName: (fullName || `${dept.name} Admin`).trim(),
        phone: phone ? phone.trim() : '',
        designation: designation || 'Associate Professor & Timetable Coordinator',
        qualification: 'M.Tech, Ph.D',
        specialization: dept.name,
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: `Authorized Department Administrator for ${dept.name}, MIT Mysore.`,
      };
      data.users.push(adminUser);
      data.staffProfiles.push(adminProfile);
    } else {
      if (email && email.trim()) {
        const normEmail = email.trim().toLowerCase();
        if (data.users.some((u) => u.email.toLowerCase() === normEmail && u.id !== adminUser!.id)) {
          return res.status(400).json({ error: `Email ${normEmail} is already taken.` });
        }
        adminUser.email = normEmail;
      }
      if (fullName && adminProfile) {
        adminProfile.fullName = fullName.trim();
      }
      if (phone && adminProfile) adminProfile.phone = phone.trim();
      if (designation && adminProfile) adminProfile.designation = designation.trim();
      if (newPassword && newPassword.trim().length >= 4) {
        adminUser.passwordHash = newPassword.trim();
      }
    }

    dept.savedCredentials = {
      email: adminUser.email,
      temporaryPassword: adminUser.passwordHash,
      issuedAt: new Date().toISOString(),
      role: 'Department Administrator (ADMIN)',
      staffId: adminProfile?.staffId || `MITM-${dept.code}-ADM`,
      adminName: adminProfile?.fullName || `${dept.name} Admin`,
    };

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'RESET_ADMIN_CREDENTIALS',
      'DEPARTMENT',
      dept.id,
      `Master Admin updated credentials for department ${dept.code} Admin (${adminUser.email}).`,
      req
    );

    return res.json({
      success: true,
      handoverCard: {
        departmentName: dept.name,
        departmentCode: dept.code,
        adminName: adminProfile?.fullName || 'Department Admin',
        email: adminUser.email,
        temporaryPassword: adminUser.passwordHash,
        role: 'Department Administrator (ADMIN)',
        designation: adminProfile?.designation || 'Department Administrator',
        phone: adminProfile?.phone || '',
        loginUrl: '/login',
        issuedAt: dept.savedCredentials?.issuedAt || new Date().toISOString(),
        instructions:
          'Updated Department Admin credentials. Use institutional email and password to access timetable generation and departmental administration.',
      },
    });
  }
);

apiRouter.put(
  '/departments/:id',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { name, code, description, active } = req.body;

    const data = db.getData();
    const dept = data.departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    if (name) dept.name = name.trim();
    if (code) dept.code = code.trim().toUpperCase();
    if (description !== undefined) dept.description = description;
    if (active !== undefined) dept.active = !!active;

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'UPDATE_DEPARTMENT',
      'DEPARTMENT',
      dept.id,
      `Updated department ${dept.code}.`,
      req
    );

    return res.json(dept);
  }
);

apiRouter.post(
  '/departments/:id/assign-hod',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { hodUserId } = req.body;

    const data = db.getData();
    const dept = data.departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    // Demote current HOD if exists
    if (dept.hodId && dept.hodId !== hodUserId) {
      const oldHod = data.users.find((u) => u.id === dept.hodId);
      if (oldHod) {
        oldHod.role = 'FACULTY';
      }
    }

    if (hodUserId) {
      const newHod = data.users.find((u) => u.id === hodUserId);
      if (!newHod) {
        return res.status(404).json({ error: 'Selected faculty user not found.' });
      }
      newHod.role = 'HOD';
      newHod.departmentId = dept.id;
      dept.hodId = newHod.id;
    } else {
      dept.hodId = null;
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'ASSIGN_HOD',
      'DEPARTMENT',
      dept.id,
      `Assigned HOD ${hodUserId || 'None'} to department ${dept.code}.`,
      req
    );

    return res.json({ success: true, department: dept });
  }
);

apiRouter.post(
  '/departments/:id/hod-details',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { fullName, email, phone, designation } = req.body;
    if (!fullName || !email) {
      return res.status(400).json({ error: 'Full name and official email are required for HOD.' });
    }

    const data = db.getData();
    const dept = data.departments.find((d) => d.id === id);
    if (!dept) {
      return res.status(404).json({ error: 'Department not found.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let hodUser = data.users.find((u) => u.email.toLowerCase() === normalizedEmail);

    // If there is an existing different HOD user, demote to FACULTY
    if (dept.hodId && (!hodUser || dept.hodId !== hodUser.id)) {
      const prevHod = data.users.find((u) => u.id === dept.hodId);
      if (prevHod && prevHod.role === 'HOD') {
        prevHod.role = 'FACULTY';
      }
    }

    if (!hodUser) {
      const newUserId = `user-hod-${Date.now()}`;
      hodUser = {
        id: newUserId,
        email: normalizedEmail,
        passwordHash: 'mitm123',
        role: 'HOD',
        departmentId: id,
        status: 'ACTIVE',
        mustChangePassword: true,
        createdAt: new Date().toISOString(),
      };
      data.users.push(hodUser);

      const newProfile: StaffProfile = {
        id: `sp-${Date.now()}`,
        userId: newUserId,
        staffId: `MITM-${dept.code}-HOD`,
        fullName: fullName.trim(),
        phone: phone ? phone.trim() : '',
        designation: designation ? designation.trim() : 'Professor & Head of Department',
        qualification: 'Ph.D, M.Tech',
        specialization: dept.name,
        isTeachingFaculty: true,
        isMentorEligible: true,
        bio: `Head of Department, ${dept.name}`,
      };
      data.staffProfiles.push(newProfile);
    } else {
      hodUser.role = 'HOD';
      hodUser.departmentId = id;
      let sp = data.staffProfiles.find((p) => p.userId === hodUser!.id);
      if (sp) {
        sp.fullName = fullName.trim();
        if (phone) sp.phone = phone.trim();
        if (designation) sp.designation = designation.trim();
      }
    }

    dept.hodId = hodUser!.id;
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CONFIGURE_HOD_DETAILS',
      'DEPARTMENT',
      dept.id,
      `Configured HOD ${fullName} (${email}) for department ${dept.code}.`,
      req
    );

    return res.json({ success: true, hodUser, department: dept });
  }
);

// ==========================================
// 3. STAFF & FACULTY MANAGEMENT
// ==========================================

apiRouter.get(
  '/staff',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const currentUser = req.user!;
    const { departmentId, type, mentorOnly, search } = req.query;

    let profiles = data.staffProfiles.map((sp) => {
      const user = data.users.find((u) => u.id === sp.userId);
      const department = user?.departmentId
        ? data.departments.find((d) => d.id === user.departmentId)
        : null;
      const activityCount = data.portfolioItems.filter(
        (p) => p.facultyUserId === sp.userId
      ).length;
      const completeness = calculateProfileCompleteness({
        ...sp,
        activityCount,
      });

      return {
        ...sp,
        user: user
          ? {
              id: user.id,
              email: user.email,
              role: user.role,
              departmentId: user.departmentId,
              status: user.status,
            }
          : null,
        department,
        activityCount,
        completeness,
      };
    });

    // STRICT USER REQUIREMENT: Admin credentials are only for login/operations.
    // Never treat admins as teaching faculty or staff records.
    profiles = profiles.filter((p) => p.user?.role !== 'ADMIN');

    // Scoping: If HOD, limit to their department unless they want peer overview
    if (currentUser.role === 'HOD' && currentUser.departmentId) {
      profiles = profiles.filter(
        (p) => p.user?.departmentId === currentUser.departmentId
      );
    } else if (departmentId) {
      profiles = profiles.filter((p) => p.user?.departmentId === departmentId);
    }

    if (type === 'teaching') {
      profiles = profiles.filter((p) => p.isTeachingFaculty);
    } else if (type === 'non-teaching') {
      profiles = profiles.filter((p) => !p.isTeachingFaculty);
    }

    if (mentorOnly === 'true') {
      profiles = profiles.filter((p) => p.isMentorEligible);
    }

    if (search) {
      const q = String(search).toLowerCase();
      profiles = profiles.filter(
        (p) =>
          p.fullName.toLowerCase().includes(q) ||
          p.staffId.toLowerCase().includes(q) ||
          p.user?.email.toLowerCase().includes(q) ||
          p.specialization.toLowerCase().includes(q)
      );
    }

    return res.json(profiles);
  }
);

apiRouter.post(
  '/staff',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      fullName,
      email,
      phone,
      staffId,
      departmentId,
      designation,
      qualification,
      specialization,
      isTeachingFaculty,
      staffType,
      isMentorEligible,
      bio,
    } = req.body;

    const data = db.getData();
    const targetDeptId = departmentId || data.institution.defaultDepartmentId || 'dept-ise';

    if (!fullName || !email || !designation) {
      return res.status(400).json({ error: 'Full name, email, and designation are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (data.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ error: 'A staff user with this official email already exists.' });
    }

    const targetDept = data.departments.find((d) => d.id === targetDeptId) || data.departments[0];
    const deptCode = targetDept?.code || 'ISE';
    const finalStaffId = staffId && staffId.trim()
      ? staffId.trim().toUpperCase()
      : `MITM-${deptCode.toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const isTeaching =
      isTeachingFaculty !== undefined
        ? !!isTeachingFaculty
        : staffType !== 'non-teaching';

    const newUserId = `user-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const newUser: User = {
      id: newUserId,
      email: normalizedEmail,
      passwordHash: 'mitm123', // Initial development temporary password
      role: 'FACULTY',
      departmentId: targetDeptId,
      status: 'ACTIVE',
      mustChangePassword: true, // Forces rotation on first login
      createdAt: new Date().toISOString(),
    };

    const newProfile: StaffProfile = {
      id: `sp-${Date.now()}`,
      userId: newUserId,
      staffId: finalStaffId,
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : '',
      designation: designation.trim(),
      qualification: qualification || (isTeaching ? 'M.Tech' : 'Diploma / Degree'),
      specialization: specialization ? specialization.trim() : targetDept.name,
      isTeachingFaculty: isTeaching,
      isMentorEligible: isMentorEligible !== undefined ? !!isMentorEligible : isTeaching,
      bio: bio || `${isTeaching ? 'Faculty member' : 'Technical staff'}, ${targetDept.name}`,
    };

    data.users.push(newUser);
    data.staffProfiles.push(newProfile);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CREATE_STAFF',
      'STAFF',
      newUserId,
      `Created staff member ${newProfile.fullName} (${newProfile.staffId}).`,
      req
    );

    return res.status(201).json({
      user: newUser,
      profile: newProfile,
    });
  }
);

apiRouter.put(
  '/staff/:userId',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Faculty can only edit permitted fields on own profile; Admin can edit all
    const isSelf = currentUser.id === userId;
    const isAdmin = currentUser.role === 'ADMIN';

    if (!isSelf && !isAdmin) {
      return res.status(403).json({ error: 'Permission denied to edit this profile.' });
    }

    const data = db.getData();
    const profile = data.staffProfiles.find((sp) => sp.userId === userId);
    const user = data.users.find((u) => u.id === userId);

    if (!profile || !user) {
      return res.status(404).json({ error: 'Staff profile not found.' });
    }

    const {
      fullName,
      phone,
      qualification,
      specialization,
      bio,
      profilePhotoUrl,
      cvUrl,
      designation,
      isTeachingFaculty,
      isMentorEligible,
      departmentId,
      status,
    } = req.body;

    // Self-editable fields
    if (phone !== undefined) profile.phone = phone;
    if (qualification !== undefined) profile.qualification = qualification;
    if (specialization !== undefined) profile.specialization = specialization;
    if (bio !== undefined) profile.bio = bio;
    if (profilePhotoUrl !== undefined) profile.profilePhotoUrl = profilePhotoUrl;
    if (cvUrl !== undefined) profile.cvUrl = cvUrl;

    // Admin-only fields
    if (isAdmin) {
      if (fullName) profile.fullName = fullName;
      if (designation) profile.designation = designation;
      if (isTeachingFaculty !== undefined) profile.isTeachingFaculty = !!isTeachingFaculty;
      if (isMentorEligible !== undefined) profile.isMentorEligible = !!isMentorEligible;
      if (departmentId && departmentId !== user.departmentId) {
        user.departmentId = departmentId;
      }
      if (status && ['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status)) {
        user.status = status;
      }
    }

    db.save();

    logAudit(
      { id: currentUser.id, email: currentUser.email, role: currentUser.role },
      'UPDATE_STAFF',
      'STAFF',
      userId,
      `Updated profile for ${profile.fullName}.`,
      req
    );

    return res.json({ profile, user });
  }
);

apiRouter.put(
  '/staff/:userId/toggle-mentor',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const data = db.getData();
    const profile = data.staffProfiles.find((sp) => sp.userId === userId);

    if (!profile) {
      return res.status(404).json({ error: 'Staff profile not found.' });
    }

    profile.isMentorEligible = !profile.isMentorEligible;
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'TOGGLE_MENTOR_ELIGIBILITY',
      'STAFF',
      userId,
      `Toggled mentor eligibility for ${profile.fullName} to ${profile.isMentorEligible}.`,
      req
    );

    return res.json({
      success: true,
      isMentorEligible: profile.isMentorEligible,
    });
  }
);

apiRouter.delete(
  '/staff/:userId',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { userId } = req.params;
    const data = db.getData();

    const userIndex = data.users.findIndex((u) => u.id === userId);
    const profileIndex = data.staffProfiles.findIndex((sp) => sp.userId === userId);

    if (userIndex === -1 && profileIndex === -1) {
      return res.status(404).json({ error: 'Staff member not found.' });
    }

    const removedName = profileIndex !== -1 ? data.staffProfiles[profileIndex].fullName : userId;

    if (userIndex !== -1) data.users.splice(userIndex, 1);
    if (profileIndex !== -1) data.staffProfiles.splice(profileIndex, 1);

    // Clean up mentor allocations
    data.mentorAllocations.forEach((alloc) => {
      alloc.groups = alloc.groups.filter((g) => g.mentorId !== userId);
    });

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'DELETE_STAFF',
      'STAFF',
      userId,
      `Removed faculty member ${removedName} from institutional database.`,
      req
    );

    return res.json({ success: true, message: `Staff member ${removedName} removed successfully.` });
  }
);

// ==========================================
// 4. STUDENT MANAGEMENT & PROMOTION
// ==========================================

apiRouter.get('/students', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUser = req.user!;
  const { departmentId, year, status, search } = req.query;

  let students = [...data.students];

  // Scoping: HOD restricted to their department
  if (currentUser.role === 'HOD' && currentUser.departmentId) {
    students = students.filter((s) => s.departmentId === currentUser.departmentId);
  } else if (departmentId) {
    students = students.filter((s) => s.departmentId === departmentId);
  }

  if (year) {
    const yrNum = Number(year);
    students = students.filter((s) => {
      if (s.currentYear !== yrNum) return false;
      // If a specific status was requested, allow it; otherwise exclude GRADUATED alumni from active year cohorts
      if (!status && s.status === 'GRADUATED') return false;
      return true;
    });
  }

  if (status) {
    students = students.filter((s) => s.status === status);
  }

  if (search) {
    const q = String(search).toLowerCase();
    students = students.filter(
      (s) =>
        s.fullName.toLowerCase().includes(q) ||
        s.usn.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q)
    );
  }

  // Attach mentor info if assigned
  const studentsWithMentor = students.map((s) => {
    // Find active allocation for student's department and year
    const allocation = data.mentorAllocations.find(
      (a) =>
        a.departmentId === s.departmentId &&
        a.studentYear === s.currentYear &&
        a.status === 'PUBLISHED'
    );

    let mentorName: string | null = null;
    let mentorStaffId: string | null = null;

    if (allocation) {
      const group = allocation.groups.find((g) => g.studentIds.includes(s.id));
      if (group) {
        mentorName = group.mentorName;
        mentorStaffId = group.staffId;
      }
    }

    return {
      ...s,
      mentorName,
      mentorStaffId,
    };
  });

  return res.json(studentsWithMentor);
});

apiRouter.post(
  '/students',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { usn, fullName, email, phone, parentPhone, departmentId, currentYear, admissionCohort } = req.body;

    if (!usn || !fullName || !departmentId || !currentYear) {
      return res.status(400).json({ error: 'USN, Full Name, Department, and Current Year are required.' });
    }

    const data = db.getData();
    const normalizedUsn = usn.trim().toUpperCase();

    if (data.students.some((s) => s.usn === normalizedUsn)) {
      return res.status(400).json({ error: `Student with USN ${normalizedUsn} already exists.` });
    }

    const yr = Number(currentYear);
    const sem = req.body.currentSemester
      ? Number(req.body.currentSemester)
      : (yr === 1 ? 1 : yr === 2 ? 3 : yr === 3 ? 5 : 7);

    const newStudent: Student = {
      id: `stud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      usn: normalizedUsn,
      fullName: fullName.trim(),
      email: email || `${normalizedUsn.toLowerCase()}@mitmysore.in`,
      phone: phone || '',
      parentPhone: parentPhone || '',
      departmentId,
      currentYear: yr,
      currentSemester: sem,
      section: req.body.section ? String(req.body.section).trim() : undefined,
      admissionCohort: admissionCohort || '2024',
      status: 'ACTIVE',
    };

    data.students.push(newStudent);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'ADD_STUDENT',
      'STUDENT',
      newStudent.id,
      `Added student ${newStudent.fullName} (${newStudent.usn}) to department ${newStudent.departmentId}.`,
      req
    );

    return res.status(201).json(newStudent);
  }
);

apiRouter.post(
  '/students/clear-all',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId } = req.body;
    const data = db.getData();
    const deptId = departmentId || (req.user?.role === 'HOD' ? req.user?.departmentId : 'dept-ise');

    const previousCount = data.students.filter((s) => !deptId || s.departmentId === deptId).length;
    data.students = data.students.filter((s) => deptId && s.departmentId !== deptId);
    data.studentPromotionHistory = (data.studentPromotionHistory || []).filter(
      (h: any) => deptId && h.departmentId !== deptId
    );

    if (data.mentorAllocations) {
      data.mentorAllocations.forEach((a) => {
        if (!deptId || a.departmentId === deptId) {
          if (a.groups) {
            a.groups.forEach((g) => {
              g.studentIds = [];
            });
          }
        }
      });
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CLEAR_ALL_STUDENTS',
      'STUDENT',
      deptId || 'all',
      `Cleared ${previousCount} student records from department ${deptId} for clean testing from scratch.`,
      req
    );

    return res.json({
      success: true,
      message: `Successfully cleared ${previousCount} student records. Database is now clean for fresh input.`,
      clearedCount: previousCount,
    });
  }
);

apiRouter.post(
  '/students/import-batch',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { students: rawRows, departmentId, defaultYear, defaultSemester } = req.body;
    if (!Array.isArray(rawRows) || rawRows.length === 0) {
      return res.status(400).json({ error: 'No student rows provided for import.' });
    }

    const data = db.getData();
    const activeDeptId = departmentId || data.institution.defaultDepartmentId || 'dept-ise';
    const fallbackYear = Number(defaultYear) || 1;

    // Determine overall department systematic cycle (ODD vs EVEN)
    const deptActiveStudents = data.students.filter(
      (s) => s.departmentId === activeDeptId && s.status === 'ACTIVE'
    );
    let deptOdd = 0;
    let deptEven = 0;
    for (const s of deptActiveStudents) {
      const sSem = s.currentSemester || (s.currentYear === 1 ? 1 : s.currentYear === 2 ? 3 : s.currentYear === 3 ? 5 : 7);
      if (sSem % 2 === 1) deptOdd++;
      else deptEven++;
    }
    const deptCycle: 'ODD' | 'EVEN' = deptEven > deptOdd && deptActiveStudents.length > 0 ? 'EVEN' : 'ODD';

    let importedCount = 0;
    let updatedCount = 0;
    const errors: { row: number; usn?: string; reason: string }[] = [];

    rawRows.forEach((rawRow, index) => {
      const rowNum = index + 1;
      if (!rawRow || typeof rawRow !== 'object') {
        errors.push({ row: rowNum, reason: 'Invalid row format' });
        return;
      }

      // Normalize row keys to lower alphanumeric
      const normalized: Record<string, any> = {};
      Object.keys(rawRow).forEach((k) => {
        const cleanKey = k.toLowerCase().replace(/[^a-z0-9]/g, '');
        normalized[cleanKey] = rawRow[k];
      });

      const usn = String(
        normalized.usn ||
        normalized.universityseatnumber ||
        normalized.rollno ||
        normalized.slnousn ||
        normalized.usnname ||
        ''
      ).trim().toUpperCase();

      const fullName = String(
        normalized.name ||
        normalized.fullname ||
        normalized.studentname ||
        normalized.candidatename ||
        ''
      ).trim();

      // Check if semester is explicitly provided in the row (1 to 8)
      const rawSemNumber = Number(
        normalized.semester ||
        normalized.sem ||
        normalized.currentsemester ||
        normalized.semesternumber ||
        normalized.term ||
        0
      );
      const isExplicitSem = rawSemNumber >= 1 && rawSemNumber <= 8;

      const parsedYear = Number(
        normalized.year ||
        normalized.currentyear ||
        normalized.cohort ||
        normalized.cohortyear ||
        (isExplicitSem ? Math.ceil(rawSemNumber / 2) : 0)
      );
      const studentYear = parsedYear >= 1 && parsedYear <= 4 ? parsedYear : fallbackYear;

      // Systematic VTU semester based on department cycle:
      // ODD term: Year 1 -> Sem 1, Year 2 -> Sem 3, Year 3 -> Sem 5, Year 4 -> Sem 7
      // EVEN term: Year 1 -> Sem 2, Year 2 -> Sem 4, Year 3 -> Sem 6, Year 4 -> Sem 8
      const systematicSem = deptCycle === 'EVEN' ? studentYear * 2 : studentYear * 2 - 1;

      let studentSem: number;
      if (isExplicitSem) {
        if ((rawSemNumber % 2 === 1 && deptCycle === 'ODD') || (rawSemNumber % 2 === 0 && deptCycle === 'EVEN')) {
          studentSem = rawSemNumber;
        } else {
          studentSem = systematicSem;
        }
      } else if (
        defaultSemester &&
        Number(defaultSemester) >= 1 &&
        Number(defaultSemester) <= 8 &&
        Math.ceil(Number(defaultSemester) / 2) === studentYear
      ) {
        studentSem = Number(defaultSemester);
      } else {
        studentSem = systematicSem;
      }

      // Format section if present in row
      const rawSec = String(
        normalized.section ||
        normalized.currentsection ||
        normalized.sec ||
        ''
      ).trim();
      let studentSection = 'Section A';
      if (rawSec) {
        studentSection = rawSec.toUpperCase().startsWith('SECTION')
          ? rawSec
          : `Section ${rawSec.replace(/[^A-Za-z0-9]/g, '').toUpperCase()}`;
      }

      const email = String(
        normalized.email ||
        normalized.studentemail ||
        normalized.officialemail ||
        (usn ? `${usn.toLowerCase()}@mitmysore.in` : '')
      ).trim();

      const phone = String(
        normalized.phone ||
        normalized.studentphone ||
        normalized.mobile ||
        normalized.studentmobile ||
        normalized.contact ||
        ''
      ).trim();

      const parentPhone = String(
        normalized.parentphone ||
        normalized.parentphoneno ||
        normalized.parentcontact ||
        normalized.parentscontact ||
        normalized.fatherphone ||
        normalized.motherphone ||
        normalized.fathermobile ||
        normalized.guardianphone ||
        ''
      ).trim();

      if (!usn) {
        errors.push({ row: rowNum, reason: 'USN is required' });
        return;
      }
      if (!fullName) {
        errors.push({ row: rowNum, usn, reason: 'Full Name is required' });
        return;
      }

      const existing = data.students.find((s) => s.usn === usn);
      if (existing) {
        existing.fullName = fullName;
        if (email) existing.email = email;
        if (phone) existing.phone = phone;
        if (parentPhone) existing.parentPhone = parentPhone;
        existing.currentYear = studentYear;
        existing.currentSemester = studentSem;
        if (rawSec) existing.section = studentSection;
        existing.departmentId = activeDeptId;
        updatedCount++;
      } else {
        data.students.push({
          id: `stud-${Date.now()}-${rowNum}-${Math.random().toString(36).substring(2, 6)}`,
          usn,
          fullName,
          email: email || `${usn.toLowerCase()}@mitmysore.in`,
          phone,
          parentPhone,
          departmentId: activeDeptId,
          currentYear: studentYear,
          currentSemester: studentSem,
          section: studentSection,
          admissionCohort: String(new Date().getFullYear() - (studentYear - 1)),
          status: 'ACTIVE',
        });
        importedCount++;
      }
    });

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'EXCEL_STUDENT_IMPORT',
      'STUDENT_BATCH',
      activeDeptId,
      `Processed ${importedCount + updatedCount} students (${importedCount} new, ${updatedCount} updated). ${errors.length} rows excluded.`,
      req
    );

    return res.json({
      success: true,
      importedCount,
      updatedCount,
      errorsCount: errors.length,
      errors,
      message: `Processed ${importedCount + updatedCount} students successfully (${importedCount} newly added, ${updatedCount} updated).`,
    });
  }
);

apiRouter.post(
  '/students/promote-preview',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, fromYear } = req.body;
    if (!departmentId || !fromYear) {
      return res.status(400).json({ error: 'Department and fromYear are required.' });
    }

    const data = db.getData();
    const collision = checkPromotionCollision(data.students, departmentId, Number(fromYear));
    if (!collision.canPromote) {
      return res.status(400).json({ error: collision.reason });
    }

    const plan = generatePromotionPlan(data.students, departmentId, Number(fromYear));
    return res.json(plan);
  }
);

apiRouter.post(
  '/students/promote',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, fromYear, academicYear } = req.body;
    if (!departmentId || !fromYear) {
      return res.status(400).json({ error: 'Department and fromYear are required.' });
    }

    const data = db.getData();
    const collision = checkPromotionCollision(data.students, departmentId, Number(fromYear));
    if (!collision.canPromote) {
      return res.status(400).json({ error: collision.reason });
    }

    const currentAcademicYear = academicYear || data.institution.currentAcademicYear;

    const { updatedStudents, historyRecords } = executePromotion(
      data.students,
      departmentId,
      Number(fromYear),
      currentAcademicYear,
      req.user!.id
    );

    // Save
    data.students = updatedStudents as any;
    data.studentPromotionHistory.unshift(...(historyRecords as any));
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'STUDENT_PROMOTION',
      'STUDENT_COHORT',
      departmentId,
      `Promoted Year ${fromYear} students in department ${departmentId} for ${currentAcademicYear}.`,
      req
    );

    return res.json({
      success: true,
      promotedCount: historyRecords.filter((h) => h.status === 'PROMOTED').length,
      heldBackCount: historyRecords.filter((h) => h.status === 'HELD_BACK').length,
      graduatedCount: historyRecords.filter((h) => h.status === 'GRADUATED').length,
      historyRecords,
    });
  }
);

apiRouter.post(
  '/students/promote-cascade-preview',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId } = req.body;
    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID is required.' });
    }

    const data = db.getData();
    const plan = generateCascadePromotionPlan(data.students, departmentId);
    return res.json(plan);
  }
);

apiRouter.post(
  '/students/promote-cascade',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, academicYear } = req.body;
    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID is required.' });
    }

    const data = db.getData();
    const currentAcademicYear = academicYear || data.institution.currentAcademicYear;

    const { updatedStudents, historyRecords, summary } = executeCascadeAnnualPromotion(
      data.students,
      departmentId,
      currentAcademicYear,
      req.user!.id
    );

    // Persist updated records
    data.students = updatedStudents as any;
    data.studentPromotionHistory.unshift(...(historyRecords as any));
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'ANNUAL_CASCADE_PROMOTION',
      'STUDENT_COHORTS',
      departmentId,
      `Executed full departmental annual cascade promotion for ${currentAcademicYear}. 4th->Graduated (${summary.year4Graduated}), 3rd->4th (${summary.year3To4Promoted}), 2nd->3rd (${summary.year2To3Promoted}), 1st->2nd (${summary.year1To2Promoted}). Year 1 is now vacated.`,
      req
    );

    return res.json({
      success: true,
      summary,
      historyRecords,
    });
  }
);

apiRouter.post(
  '/students/promote-semester-preview',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId } = req.body;
    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID is required.' });
    }

    const data = db.getData();
    const preview = generateSemesterProgressionPreview(data.students, departmentId);
    return res.json(preview);
  }
);

apiRouter.post(
  '/students/promote-semester',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, academicYear } = req.body;
    if (!departmentId) {
      return res.status(400).json({ error: 'Department ID is required.' });
    }

    const data = db.getData();
    const currentAcademicYear = academicYear || data.institution.currentAcademicYear;

    const activeDeptStudents = data.students.filter(
      (s) => s.departmentId === departmentId && s.status === 'ACTIVE'
    );
    if (activeDeptStudents.length === 0) {
      return res.status(400).json({
        error:
          '1st, 2nd, 3rd, and 4th year cohort details are empty. You cannot perform cohort promotion without active students.',
      });
    }

    const { updatedStudents, historyRecords, summary } = executeSemesterProgression(
      data.students,
      departmentId,
      currentAcademicYear,
      req.user!.id
    );

    data.students = updatedStudents as any;
    data.studentPromotionHistory.unshift(...(historyRecords as any));
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'SEMESTER_PROGRESSION',
      'STUDENT_COHORTS',
      departmentId,
      `Executed simultaneous semester progression for ${currentAcademicYear} (${summary.cycleCompleted} cycle). Promoted: ${summary.promotedCount}, Graduated: ${summary.graduatedCount}, Held back: ${summary.heldBackCount}.`,
      req
    );

    const message = summary.cycleCompleted === 'ODD'
      ? `Successfully advanced ${summary.promotedCount} students from Odd Semesters (1st, 3rd, 5th, 7th) to Even Semesters (2nd, 4th, 6th, 8th).`
      : `Successfully executed annual academic progression! ${summary.promotedCount} students advanced to senior cohorts, ${summary.graduatedCount} 4th-year students graduated to alumni. 1st Year is now vacant for new admissions.`;

    return res.json({
      success: true,
      message,
      summary,
      historyRecords,
    });
  }
);

apiRouter.put(
  '/students/:id/status',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { status } = req.body;

    const data = db.getData();
    const student = data.students.find((s) => s.id === id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Strict rule: once graduated, no editing option of active or detained for graduated students
    if (student.status === 'GRADUATED' && status && status !== 'GRADUATED') {
      return res.status(400).json({
        error: 'Graduated alumni records are permanently archived and cannot be reverted to Active or Detained.',
      });
    }

    student.status = status;
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'UPDATE_STUDENT_STATUS',
      'STUDENT',
      id,
      `Updated status for ${student.fullName} (${student.usn}) to ${status}.`,
      req
    );

    return res.json(student);
  }
);

apiRouter.put(
  '/students/:id',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { usn, fullName, email, phone, parentPhone, currentYear, currentSemester, section, status, admissionCohort } = req.body;

    const data = db.getData();
    const student = data.students.find((s) => s.id === id);
    if (!student) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    // Strict rule: once graduated, no editing option of active or detained for graduated students
    if (student.status === 'GRADUATED' && status && status !== 'GRADUATED') {
      return res.status(400).json({
        error: 'Graduated alumni records are permanently archived and cannot be reverted to Active or Detained.',
      });
    }

    if (usn) {
      const normalizedUsn = usn.trim().toUpperCase();
      const existing = data.students.find((s) => s.usn === normalizedUsn && s.id !== id);
      if (existing) {
        return res.status(400).json({ error: `USN ${normalizedUsn} is already assigned to another student.` });
      }
      student.usn = normalizedUsn;
    }
    if (fullName) student.fullName = fullName.trim();
    if (email) student.email = email.trim();
    if (phone !== undefined) student.phone = phone.trim();
    if (parentPhone !== undefined) student.parentPhone = parentPhone.trim();
    if (currentYear) student.currentYear = Number(currentYear);
    if (currentSemester) student.currentSemester = Number(currentSemester);
    if (section !== undefined) student.section = section ? String(section).trim() : undefined;
    if (status && student.status !== 'GRADUATED') student.status = status;
    if (admissionCohort) student.admissionCohort = admissionCohort;

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'UPDATE_STUDENT',
      'STUDENT',
      id,
      `Updated details for student ${student.fullName} (${student.usn}).`,
      req
    );

    return res.json(student);
  }
);

apiRouter.delete(
  '/students/:id',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();

    const idx = data.students.findIndex((s) => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Student not found.' });
    }

    const removed = data.students.splice(idx, 1)[0];

    // Remove from mentor allocations
    data.mentorAllocations.forEach((alloc) => {
      alloc.groups.forEach((g) => {
        g.studentIds = g.studentIds.filter((sid) => sid !== id);
      });
    });

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'DELETE_STUDENT',
      'STUDENT',
      id,
      `Deleted student record for ${removed.fullName} (${removed.usn}).`,
      req
    );

    return res.json({ success: true, message: `Student ${removed.fullName} deleted successfully.` });
  }
);

// ==========================================
// 5. MENTOR ALLOCATION ENGINE
// ==========================================

apiRouter.get(
  '/mentor-allocation',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, year } = req.query;
    const data = db.getData();

    const allocations = data.mentorAllocations
      .filter((a) => {
        let match = true;
        if (departmentId) match = match && a.departmentId === departmentId;
        if (year !== undefined && year !== '') match = match && a.studentYear === Number(year);
        return match;
      })
      .map((alloc) => ({
        ...alloc,
        groups: alloc.groups.map((g) => ({
          ...g,
          students: g.studentIds
            .map((sId) => {
              const stud = data.students.find((s) => s.id === sId);
              return stud
                ? {
                    id: stud.id,
                    usn: stud.usn,
                    fullName: stud.fullName,
                    email: stud.email,
                    phone: stud.phone,
                    parentPhone: stud.parentPhone,
                    currentYear: stud.currentYear,
                    status: stud.status,
                  }
                : null;
            })
            .filter(Boolean),
        })),
      }));

    return res.json(allocations);
  }
);

apiRouter.post(
  '/mentor-allocation/generate',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, studentYear, academicYear, selectedMentorIds } = req.body;
    if (!departmentId || studentYear === undefined) {
      return res.status(400).json({ error: 'Department and studentYear are required.' });
    }

    const data = db.getData();
    const currentYear = Number(studentYear);
    const currAcademicYear = academicYear || data.institution.currentAcademicYear;

    // Build mentor list with eligibility
    let eligibleFaculty = data.staffProfiles
      .filter((sp) => {
        const u = data.users.find((user) => user.id === sp.userId);
        return (
          u !== undefined &&
          (u.departmentId === departmentId || !u.departmentId || u.departmentId === data.institution.defaultDepartmentId) &&
          u.status === 'ACTIVE' &&
          sp.isTeachingFaculty
        );
      })
      .map((sp) => {
        const u = data.users.find((user) => user.id === sp.userId)!;
        return {
          id: sp.userId,
          staffId: sp.staffId,
          fullName: sp.fullName,
          departmentId,
          isMentorEligible: sp.isMentorEligible !== false,
          status: u.status as 'ACTIVE' | 'INACTIVE',
        };
      });

    // If specific mentors are selected by admin, filter by those IDs
    if (Array.isArray(selectedMentorIds) && selectedMentorIds.length > 0) {
      eligibleFaculty = eligibleFaculty.filter((f) => selectedMentorIds.includes(f.id));
    }

    // Build student list with email and parent phone
    const eligibleStudents = data.students.map((s) => ({
      id: s.id,
      usn: s.usn,
      fullName: s.fullName,
      departmentId: s.departmentId || departmentId,
      currentYear: s.currentYear,
      status: s.status as any,
      email: s.email,
      phone: s.phone,
      parentPhone: s.parentPhone,
    }));

    const allocMode: 'LINEAR' | 'RANDOM' = req.body.mode === 'RANDOM' ? 'RANDOM' : 'LINEAR';
    const result =
      currentYear === 0
        ? calculateCombinedMultiYearAllocation(
            eligibleStudents,
            eligibleFaculty,
            departmentId,
            currAcademicYear,
            [2, 3, 4],
            allocMode
          )
        : calculateBalancedMentorAllocation(
            eligibleStudents,
            eligibleFaculty,
            departmentId,
            currAcademicYear,
            currentYear,
            allocMode
          );

    return res.json({
      ...result,
      allocationMode: allocMode,
    });
  }
);

apiRouter.post(
  '/mentor-allocation/save',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, studentYear, academicYear, groups, publishImmediately, allocationMode } = req.body;
    if (!departmentId || studentYear === undefined || !Array.isArray(groups)) {
      return res.status(400).json({ error: 'Invalid allocation data.' });
    }

    const data = db.getData();
    const currAcademicYear = academicYear || data.institution.currentAcademicYear;
    const yearNum = Number(studentYear);

    // Archive or update existing allocation for this cohort
    const existing = data.mentorAllocations.find(
      (a) => a.departmentId === departmentId && a.studentYear === yearNum
    );

    const versionNumber = existing ? existing.versionNumber + 1 : 1;
    const status = publishImmediately ? 'PUBLISHED' : 'DRAFT';
    const publishedAt = publishImmediately ? new Date().toISOString() : undefined;
    const publishedByName = publishImmediately ? req.user?.email || 'Academic Office' : undefined;

    const newAllocation: MentorAllocation = {
      id: `alloc-${departmentId}-${yearNum}-${Date.now()}`,
      departmentId,
      academicYear: currAcademicYear,
      studentYear: yearNum,
      status,
      versionNumber,
      createdById: req.user!.id,
      publishedAt,
      publishedByName,
      createdAt: new Date().toISOString(),
      allocationMode: allocationMode === 'RANDOM' ? 'RANDOM' : 'LINEAR',
      groups: groups.map((g: any) => ({
        mentorId: g.mentorId,
        mentorName: g.mentorName,
        staffId: g.staffId,
        studentIds: Array.isArray(g.students)
          ? g.students.map((s: any) => (typeof s === 'string' ? s : s.id))
          : g.studentIds || [],
      })),
    };

    if (existing) {
      existing.status = 'ARCHIVED';
    }
    data.mentorAllocations.unshift(newAllocation);

    if (publishImmediately) {
      // Update mentor assignment directly on Student records
      for (const group of newAllocation.groups) {
        const mentorProfile = data.staffProfiles.find((sp) => sp.userId === group.mentorId);
        for (const sId of group.studentIds) {
          const student = data.students.find((s) => s.id === sId);
          if (student) {
            student.mentorId = group.mentorId;
            student.mentorName = group.mentorName;
            student.mentorStaffId = group.staffId || mentorProfile?.staffId;
          }
        }
      }

      // Dispatch ONE single official broadcast circular for the department
      const cohortLabel = yearNum === 0 ? 'Combined 2nd, 3rd & 4th Years' : `Year ${yearNum}`;
      dispatchNotification(
        'FACULTY',
        'Official Mentor-Mentee Allocation Committed',
        `Official mentor allocation for ${cohortLabel} (${currAcademicYear}) has been committed and published across ${newAllocation.groups.length} faculty mentors.`,
        'CIRCULAR',
        '/faculty/mentees',
        { id: req.user!.id, name: 'Academic Office' }
      );
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      publishImmediately ? 'PUBLISH_MENTOR_ALLOCATION' : 'SAVE_MENTOR_ALLOCATION_DRAFT',
      'MENTOR_ALLOCATION',
      newAllocation.id,
      `Allocation version ${versionNumber} for department ${departmentId} (${yearNum === 0 ? 'Combined 2nd, 3rd & 4th Years' : `Year ${yearNum}`}) set to ${status}.`,
      req
    );

    const allocationWithStudents = {
      ...newAllocation,
      groups: newAllocation.groups.map((g) => ({
        ...g,
        students: g.studentIds
          .map((sId) => {
            const stud = data.students.find((s) => s.id === sId);
            return stud
              ? {
                  id: stud.id,
                  usn: stud.usn,
                  fullName: stud.fullName,
                  email: stud.email,
                  phone: stud.phone,
                  parentPhone: stud.parentPhone,
                  currentYear: stud.currentYear,
                  status: stud.status,
                }
              : null;
          })
          .filter(Boolean),
      })),
    };

    return res.status(201).json(allocationWithStudents);
  }
);

apiRouter.delete(
  '/mentor-allocation/:id',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      if (!data.mentorAllocations) data.mentorAllocations = [];
      const idx = data.mentorAllocations.findIndex((a) => a.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: 'Mentor allocation record not found.' });
      }

      const record = data.mentorAllocations[idx];
      data.mentorAllocations.splice(idx, 1);
      db.save();

      logAudit(
        { id: req.user!.id, email: req.user!.email, role: req.user!.role },
        'DELETE_MENTOR_ALLOCATION',
        'MENTOR_ALLOCATION',
        id,
        `Deleted mentor allocation record ${id} (Year ${record.studentYear === 0 ? 'Combined' : record.studentYear}, AY ${record.academicYear}).`,
        req
      );

      return res.json({ success: true, message: 'Committed mentor allocation record deleted successfully.' });
    } catch (err: any) {
      console.error('Delete mentor allocation failed:', err);
      return res.status(500).json({ error: 'Failed to delete committed record.' });
    }
  }
);

apiRouter.post(
  '/mentor-allocation/clear-history',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { departmentId } = req.body;
      const data = db.getData();
      if (!data.mentorAllocations) data.mentorAllocations = [];
      data.mentorAllocations = data.mentorAllocations.filter((a) => {
        if (departmentId && a.departmentId !== departmentId) return true;
        return false;
      });
      db.save();

      logAudit(
        { id: req.user!.id, email: req.user!.email, role: req.user!.role },
        'CLEAR_MENTOR_ALLOCATION_HISTORY',
        'MENTOR_ALLOCATION',
        departmentId || 'all',
        `Cleared committed mentor allocation history for department ${departmentId || 'all'}.`,
        req
      );

      return res.json({ success: true, message: 'Committed mentor allocation history cleared successfully.' });
    } catch (err: any) {
      console.error('Clear mentor allocation history failed:', err);
      return res.status(500).json({ error: 'Failed to clear history.' });
    }
  }
);

apiRouter.get(
  '/mentor-allocation/my-students',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const facultyUserId = req.user!.id;

    // Find all published allocations containing this mentor
    const mentees: {
      student: Student;
      academicYear: string;
      studentYear: number;
    }[] = [];

    const activeAllocations = data.mentorAllocations.filter(
      (a) => a.status === 'PUBLISHED'
    );

    const addedStudentIds = new Set<string>();

    for (const alloc of activeAllocations) {
      const group = alloc.groups.find((g) => g.mentorId === facultyUserId);
      if (group) {
        for (const sId of group.studentIds) {
          if (!addedStudentIds.has(sId)) {
            const s = data.students.find((stud) => stud.id === sId);
            if (s) {
              addedStudentIds.add(sId);
              mentees.push({
                student: s,
                academicYear: alloc.academicYear,
                studentYear: s.currentYear || alloc.studentYear,
              });
            }
          }
        }
      }
    }

    // Also check direct mentorId link on student
    data.students
      .filter((s) => s.mentorId === facultyUserId && !addedStudentIds.has(s.id))
      .forEach((s) => {
        addedStudentIds.add(s.id);
        mentees.push({
          student: s,
          academicYear: data.institution.currentAcademicYear,
          studentYear: s.currentYear,
        });
      });

    return res.json(mentees);
  }
);

// ==========================================
// 6. ACADEMIC SUBJECTS & TIMETABLE MANAGEMENT
// Mandatory rule: Timetable configuration, generation, regeneration,
// manual editing, validation, publication, replacement, and version
// management are exclusively Admin-controlled operations.
// ==========================================

// ------------------------------------------
// ACADEMIC SUBJECTS MANAGEMENT
// ------------------------------------------
apiRouter.get('/academic-subjects', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { departmentId, year, semester } = req.query;
  const data = db.getData();
  let list = [...(data.academicSubjects || [])];

  if (departmentId) {
    list = list.filter((s) => s.departmentId === departmentId);
  }
  if (year) {
    list = list.filter((s) => s.year === Number(year));
  }
  if (semester) {
    list = list.filter((s) => s.semester === Number(semester));
  }

  return res.json(list);
});

apiRouter.post('/academic-subjects', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { departmentId, year, semester, code, title, shortName, isLab, category, hoursPerWeek } = req.body;
  if (!code || !title || !year || !semester) {
    return res.status(400).json({ error: 'Subject code, title, year, and semester are required.' });
  }

  const data = db.getData();
  if (!data.academicSubjects) data.academicSubjects = [];

  const newSubject: AcademicSubject = {
    id: `subj-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    departmentId: departmentId || 'dept-ise',
    year: Number(year),
    semester: Number(semester),
    code: String(code).trim().toUpperCase(),
    title: String(title).trim(),
    shortName: shortName ? String(shortName).trim().toUpperCase() : String(code).trim().toUpperCase(),
    isLab: !!isLab,
    category: category || (isLab ? 'LAB' : 'THEORY'),
    hoursPerWeek: Number(hoursPerWeek) || (isLab ? 3 : 4),
  };

  data.academicSubjects.push(newSubject);
  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'CREATE_ACADEMIC_SUBJECT',
    'ACADEMIC_SUBJECT',
    newSubject.id,
    `Added subject ${newSubject.code} (${newSubject.title}) for Year ${newSubject.year} Sem ${newSubject.semester}.`,
    req
  );

  return res.status(201).json(newSubject);
});

apiRouter.put('/academic-subjects/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const subj = data.academicSubjects?.find((s) => s.id === id);

  if (!subj) {
    return res.status(404).json({ error: 'Academic subject not found.' });
  }

  const { code, title, shortName, isLab, category, hoursPerWeek, year, semester } = req.body;
  if (code) subj.code = String(code).trim().toUpperCase();
  if (title) subj.title = String(title).trim();
  if (shortName) subj.shortName = String(shortName).trim().toUpperCase();
  if (isLab !== undefined) subj.isLab = !!isLab;
  if (category) subj.category = category;
  if (hoursPerWeek !== undefined) subj.hoursPerWeek = Number(hoursPerWeek);
  if (year !== undefined) subj.year = Number(year);
  if (semester !== undefined) subj.semester = Number(semester);

  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'UPDATE_ACADEMIC_SUBJECT',
    'ACADEMIC_SUBJECT',
    subj.id,
    `Updated subject ${subj.code} (${subj.title}).`,
    req
  );

  return res.json(subj);
});

apiRouter.delete('/academic-subjects/:id', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const data = db.getData();
  const idx = data.academicSubjects?.findIndex((s) => s.id === id);

  if (idx === -1 || idx === undefined) {
    return res.status(404).json({ error: 'Academic subject not found.' });
  }

  const removed = data.academicSubjects.splice(idx, 1)[0];
  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'DELETE_ACADEMIC_SUBJECT',
    'ACADEMIC_SUBJECT',
    id,
    `Removed academic subject ${removed.code} (${removed.title}).`,
    req
  );

  return res.json({ success: true, message: `Subject ${removed.code} deleted.` });
});

apiRouter.post('/academic-subjects/seed-mitm', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  data.academicSubjects = getInitialAcademicSubjects();
  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'SEED_ACADEMIC_SUBJECTS',
    'ACADEMIC_SUBJECT',
    'seed',
    `Re-seeded official MIT Mysore academic curriculum subjects.`,
    req
  );

  return res.json({ success: true, count: data.academicSubjects.length, subjects: data.academicSubjects });
});

apiRouter.post('/academic-subjects/reset', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { departmentId } = req.body;
  const data = db.getData();
  const targetDeptId = departmentId || req.user!.departmentId || 'dept-ise';
  const initialCount = data.academicSubjects.length;
  data.academicSubjects = (data.academicSubjects || []).filter((s) => s.departmentId !== targetDeptId);
  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'RESET_ACADEMIC_SUBJECTS',
    'ACADEMIC_SUBJECTS',
    targetDeptId,
    `Reset MITM Curriculum: cleared all academic subjects for department ${targetDeptId}.`,
    req
  );

  return res.json({
    success: true,
    removedCount: initialCount - data.academicSubjects.length,
    subjects: [],
    message: 'Curriculum reset successfully. All academic subjects have been cleared and are now empty.',
  });
});

// ------------------------------------------
// SUBJECT-TO-FACULTY-SECTION ALLOCATIONS
// ------------------------------------------
apiRouter.get('/subject-allocations', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const { departmentId, year, semester, section } = req.query;
  const data = db.getData();
  let list = [...(data.subjectAllocations || [])];

  if (departmentId) list = list.filter((a) => a.departmentId === departmentId);
  if (year) list = list.filter((a) => a.year === Number(year));
  if (semester) list = list.filter((a) => a.semester === Number(semester));
  if (section) list = list.filter((a) => a.section.toLowerCase().includes(String(section).toLowerCase().replace('section ', '')));

  return res.json(list);
});

apiRouter.post('/subject-allocations/batch-save', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { departmentId, year, semester, allocations } = req.body;
  if (!Array.isArray(allocations)) {
    return res.status(400).json({ error: 'Allocations array is required.' });
  }

  const data = db.getData();
  if (!data.subjectAllocations) data.subjectAllocations = [];

  const depId = departmentId || 'dept-ise';
  const yr = Number(year) || 3;
  const sem = Number(semester) || 6;

  // Remove existing allocations for this dept + year + sem
  data.subjectAllocations = data.subjectAllocations.filter(
    (a) => !(a.departmentId === depId && a.year === yr && a.semester === sem)
  );

  // Add new allocations
  for (const item of allocations) {
    data.subjectAllocations.push({
      id: item.id || `alloc-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      departmentId: depId,
      year: yr,
      semester: sem,
      section: item.section,
      subjectCode: item.subjectCode,
      subjectTitle: item.subjectTitle,
      subjectShortName: item.subjectShortName || item.subjectCode,
      facultyUserId: item.facultyUserId || '',
      facultyName: item.facultyName || '',
      facultyInitials: item.facultyInitials || '',
      isLab: !!item.isLab,
      labBatches: item.labBatches || [],
    });
  }

  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'SAVE_SUBJECT_ALLOCATIONS',
    'SUBJECT_ALLOCATION',
    `${depId}-y${yr}-s${sem}`,
    `Saved ${allocations.length} faculty subject assignments for Year ${yr} Sem ${sem}.`,
    req
  );

  return res.json({ success: true, count: allocations.length, allocations: data.subjectAllocations.filter((a) => a.departmentId === depId && a.year === yr && a.semester === sem) });
});

// Multi-section timetable save / publish
apiRouter.post('/timetables/multi-section-save', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const { departmentId, year, semester, timetables, publishAll } = req.body;
  if (!Array.isArray(timetables) || timetables.length === 0) {
    return res.status(400).json({ error: 'Timetables array is required.' });
  }

  const data = db.getData();
  const now = new Date().toISOString();
  const depId = departmentId || 'dept-ise';
  const yr = Number(year) || 3;
  const semName = typeof semester === 'string' ? semester : getOrdinalSemester(Number(semester));

  // Cross-section collision check
  const crossCheck = validateCrossSectionClashes(
    timetables.map((t: any) => ({ section: t.section, schedule: t.schedule || [] }))
  );

  const savedResults: StructuredTimetable[] = [];

  if (publishAll && crossCheck.isValid) {
    // When a new semester is committed for this year cohort (e.g. 1st Year Sem 2),
    // remove the previous committed semester records (e.g. Sem 1) so only the latest semester is active
    data.structuredTimetables = data.structuredTimetables.filter(
      (st) => !(st.departmentId === depId && st.studentYear === yr && st.semester !== semName)
    );
  }

  for (const t of timetables) {
    let existing = data.structuredTimetables.find(
      (st) => st.departmentId === depId && st.semester === semName && st.section === t.section && st.status !== 'REPLACED' && st.status !== 'ARCHIVED'
    );

    const validationReport = {
      isValid: crossCheck.isValid,
      checkedAt: now,
      conflicts: crossCheck.clashes,
      warnings: [],
    };

    if (existing) {
      existing.title = t.title || existing.title;
      existing.roomNumber = t.roomNumber || existing.roomNumber;
      existing.classTeacher = t.classTeacher || existing.classTeacher;
      existing.schedule = t.schedule || existing.schedule;
      existing.facultyAssignments = t.facultyAssignments || existing.facultyAssignments;
      existing.subjectLegend = t.subjectLegend || existing.subjectLegend;
      existing.validationReport = validationReport;
      existing.isValidated = crossCheck.isValid;
      existing.updatedAt = now;
      if (publishAll && crossCheck.isValid) {
        existing.status = 'PUBLISHED';
        existing.isActive = true;
        existing.publishedAt = now;
        existing.publishedBy = `${req.user!.email} (${req.user!.role})`;
      }
      savedResults.push(existing);
    } else {
      const newTt: StructuredTimetable = {
        id: `st-${depId}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        departmentId: depId,
        academicYear: data.institution.currentAcademicYear,
        semester: semName,
        section: t.section,
        studentYear: yr,
        title: t.title || `${depId.toUpperCase()} - ${semName} (${t.section}) Timetable`,
        roomNumber: t.roomNumber || '',
        classTeacher: t.classTeacher || '',
        status: (publishAll && crossCheck.isValid) ? 'PUBLISHED' : (crossCheck.isValid ? 'VALIDATED' : 'DRAFT'),
        isValidated: crossCheck.isValid,
        version: 1,
        isActive: !!(publishAll && crossCheck.isValid),
        facultyAssignments: t.facultyAssignments || [],
        schedule: t.schedule || [],
        subjectLegend: t.subjectLegend || [],
        validationReport,
        publishedAt: (publishAll && crossCheck.isValid) ? now : undefined,
        publishedBy: (publishAll && crossCheck.isValid) ? `${req.user!.email} (${req.user!.role})` : undefined,
        createdAt: now,
        updatedAt: now,
      };
      data.structuredTimetables.unshift(newTt);
      savedResults.push(newTt);
    }
  }

  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    publishAll ? 'MULTI_SECTION_PUBLISH_TIMETABLE' : 'MULTI_SECTION_SAVE_TIMETABLE',
    'TIMETABLE',
    `${depId}-${semName}`,
    `Saved/Published ${savedResults.length} section timetables for ${semName}. Clashes: ${crossCheck.clashes.length}.`,
    req
  );

  return res.json({
    success: true,
    crossSectionValidation: crossCheck,
    timetables: savedResults,
  });
});

apiRouter.post('/timetables/seed-mitm-6th-sem', authMiddleware, requireRole(['ADMIN']), (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const mitmTimetables = getInitial6thSemTimetables();

  // Replace or add 6th sem timetables
  data.structuredTimetables = data.structuredTimetables.filter(
    (t) => !(t.departmentId === 'dept-ise' && t.semester === '6th Semester')
  );
  data.structuredTimetables.unshift(...mitmTimetables);
  db.save();

  logAudit(
    { id: req.user!.id, email: req.user!.email, role: req.user!.role },
    'SEED_MITM_6TH_SEM_TIMETABLE',
    'TIMETABLE',
    'dept-ise-6th-sem',
    'Seeded official MIT Mysore 6th Semester timetables for Sections A, B, and C.',
    req
  );

  return res.json({ success: true, timetables: mitmTimetables });
});

// Structured Timetable Query
apiRouter.get(
  '/timetables/structured',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, semester, section, year, status } = req.query;
    const data = db.getData();
    const currentUser = req.user!;

    let list = [...(data.structuredTimetables || [])];

    // Role-based Resource Authorization:
    if (currentUser.role === 'ADMIN') {
      // Admin can view all timetables including DRAFT, VALIDATED, PUBLISHED, REPLACED, ARCHIVED
      if (departmentId) {
        list = list.filter((t) => t.departmentId === departmentId);
      }
    } else if (currentUser.role === 'HOD') {
      // HOD may view only published timetables for their assigned department
      const userDeptId = currentUser.departmentId || 'dept-ise';
      list = list.filter(
        (t) => t.departmentId === userDeptId && t.status === 'PUBLISHED'
      );
    } else {
      // FACULTY & NON_TEACHING may view only published timetables for their department
      const userDeptId = currentUser.departmentId || 'dept-ise';
      list = list.filter(
        (t) => (t.departmentId === userDeptId || !t.departmentId) && t.status === 'PUBLISHED'
      );
    }

    if (year) {
      const yrNum = Number(year);
      list = list.filter((t) => t.studentYear === yrNum);
      if (semester) {
        const semReq = String(semester).trim().toLowerCase();
        const reqNum = parseInt(semReq.replace(/\D/g, ''), 10);
        list = list.filter((t) => {
          const tSem = String(t.semester || '').trim().toLowerCase();
          const tNum = parseInt(tSem.replace(/\D/g, ''), 10);
          if (!isNaN(reqNum) && !isNaN(tNum)) {
            return reqNum === tNum;
          }
          return tSem === semReq;
        });
      }
    } else if (semester) {
      const semReq = String(semester).trim().toLowerCase();
      const reqNum = parseInt(semReq.replace(/\D/g, ''), 10);
      list = list.filter((t) => {
        const tSem = String(t.semester || '').trim().toLowerCase();
        const tNum = parseInt(tSem.replace(/\D/g, ''), 10);
        if (!isNaN(reqNum) && !isNaN(tNum)) {
          return reqNum === tNum;
        }
        return tSem === semReq;
      });
    }

    if (section) {
      list = list.filter((t) => t.section === section);
    }
    if (status && currentUser.role === 'ADMIN') {
      list = list.filter((t) => t.status === status);
    }

    return res.json(list);
  }
);

// Memory-Efficient Committed Timetables Overview (Last committed record per year 1st-4th)
apiRouter.get(
  '/timetables/committed-records',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId } = req.query;
    const data = db.getData();
    const currentUser = req.user!;
    const depId = (currentUser.role === 'ADMIN' && departmentId)
      ? (departmentId as string)
      : (currentUser.departmentId || 'dept-ise');

    // Only active published/committed timetables for this department
    const published = (data.structuredTimetables || []).filter(
      (t) => t.departmentId === depId && t.status === 'PUBLISHED'
    );

    // Build the latest committed snapshot for each academic year cohort (1st, 2nd, 3rd, 4th)
    const records = [1, 2, 3, 4].map((yr) => {
      const yrTimetables = published.filter((t) => t.studentYear === yr);
      const yearLabel = yr === 1 ? '1st Year' : yr === 2 ? '2nd Year' : yr === 3 ? '3rd Year' : '4th Year';

      if (yrTimetables.length > 0) {
        // Sort by publishedAt or updatedAt descending to pick latest committed session
        yrTimetables.sort(
          (a, b) =>
            new Date(b.publishedAt || b.updatedAt).getTime() -
            new Date(a.publishedAt || a.updatedAt).getTime()
        );
        const latest = yrTimetables[0];
        const matchingBatch = yrTimetables.filter((t) => t.semester === latest.semester);
        const sections = Array.from(new Set(matchingBatch.map((t) => t.section))).sort();
        const totalSlots = matchingBatch.reduce(
          (acc, t) => acc + (t.schedule?.filter((s) => s.courseCode).length || 0),
          0
        );

        return {
          year: yr,
          yearLabel,
          hasCommitted: true,
          semester: latest.semester,
          academicYear: latest.academicYear || data.institution.currentAcademicYear,
          committedAt: latest.publishedAt || latest.updatedAt,
          committedBy: latest.publishedBy || 'Department Admin',
          sections,
          totalSlots,
          timetables: matchingBatch,
        };
      }

      return {
        year: yr,
        yearLabel,
        hasCommitted: false,
        semester: getOrdinalSemester(yr * 2 - 1),
        academicYear: data.institution.currentAcademicYear,
        committedAt: null,
        committedBy: null,
        sections: [],
        totalSlots: 0,
        timetables: [],
      };
    });

    return res.json({ success: true, departmentId: depId, records });
  }
);

// Timetable Configuration: Semester-Specific Faculty Assignments (Admin only)
apiRouter.post(
  '/timetables/configure-assignments',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, semester, section, studentYear, facultyAssignments, title } = req.body;
    if (!departmentId || !semester || !Array.isArray(facultyAssignments)) {
      return res.status(400).json({ error: 'Department, semester, and faculty assignments array are required.' });
    }

    const data = db.getData();
    const yearNum = Number(studentYear) || 3;
    const sec = section || 'Section A';

    // Find or create a draft structured timetable
    let timetable = data.structuredTimetables.find(
      (t) =>
        t.departmentId === departmentId &&
        t.semester === semester &&
        t.section === sec &&
        t.status !== 'REPLACED' &&
        t.status !== 'ARCHIVED'
    );

    const now = new Date().toISOString();

    if (!timetable) {
      timetable = {
        id: `st-${departmentId}-${Date.now()}`,
        departmentId,
        academicYear: data.institution.currentAcademicYear,
        semester,
        section: sec,
        studentYear: yearNum,
        title: title || `${departmentId.replace('dept-', '').toUpperCase()} - ${semester} (${sec}) Timetable`,
        status: 'DRAFT',
        isValidated: false,
        version: 1,
        isActive: false,
        facultyAssignments,
        schedule: [],
        createdAt: now,
        updatedAt: now,
      };
      data.structuredTimetables.push(timetable);
    } else {
      timetable.facultyAssignments = facultyAssignments;
      timetable.studentYear = yearNum;
      timetable.updatedAt = now;
      if (timetable.status === 'PUBLISHED') {
        // If altering assignments of a published timetable, flag as draft until re-validated and replaced
        timetable.isValidated = false;
      }
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CONFIGURE_SEMESTER_FACULTY_ASSIGNMENTS',
      'TIMETABLE',
      timetable.id,
      `Configured ${facultyAssignments.length} semester-specific faculty assignments for ${departmentId} ${semester} (${sec}). Previous semester assignments not assumed.`,
      req
    );

    return res.json(timetable);
  }
);

// Timetable Generation: Automated conflict-free generation (Admin only)
apiRouter.post(
  '/timetables/generate',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      departmentId,
      semester,
      section,
      studentYear,
      facultyAssignments,
      defaultRoom,
      defaultLabRoom,
    } = req.body;

    if (!departmentId || !semester || !Array.isArray(facultyAssignments) || facultyAssignments.length === 0) {
      return res.status(400).json({
        error: 'Department, semester, and non-empty semester-specific faculty assignments are required to generate timetable.',
      });
    }

    const data = db.getData();
    const sec = section || 'Section A';
    const yearNum = Number(studentYear) || 3;
    const now = new Date().toISOString();

    // Generate schedule grid
    const schedule = generateAutomatedTimetableGrid(
      facultyAssignments,
      defaultRoom || 'LH-302',
      defaultLabRoom || 'ISE Advanced Computing Lab'
    );

    // Collect concurrent schedules from other active sections for cross-section clash detection
    const otherSchedules = data.structuredTimetables
      .filter((t) => t.departmentId === departmentId && (t.semester !== semester || t.section !== sec) && t.isActive)
      .flatMap((t) => t.schedule);

    // Validate generated schedule
    const validationReport = validateTimetableRules(facultyAssignments, schedule, otherSchedules);

    // Find existing draft/active or create new
    let timetable = data.structuredTimetables.find(
      (t) =>
        t.departmentId === departmentId &&
        t.semester === semester &&
        t.section === sec &&
        t.status !== 'REPLACED' &&
        t.status !== 'ARCHIVED'
    );

    if (!timetable) {
      timetable = {
        id: `st-${departmentId}-${Date.now()}`,
        departmentId,
        academicYear: data.institution.currentAcademicYear,
        semester,
        section: sec,
        studentYear: yearNum,
        title: `${departmentId.replace('dept-', '').toUpperCase()} - ${semester} (${sec}) Official Timetable`,
        status: validationReport.isValid ? 'VALIDATED' : 'DRAFT',
        isValidated: validationReport.isValid,
        version: 1,
        isActive: false,
        facultyAssignments,
        schedule,
        validationReport,
        createdAt: now,
        updatedAt: now,
      };
      data.structuredTimetables.unshift(timetable);
    } else {
      timetable.facultyAssignments = facultyAssignments;
      timetable.schedule = schedule;
      timetable.isValidated = validationReport.isValid;
      timetable.status = validationReport.isValid ? 'VALIDATED' : 'DRAFT';
      timetable.validationReport = validationReport;
      timetable.updatedAt = now;
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'GENERATE_TIMETABLE',
      'TIMETABLE',
      timetable.id,
      `Generated timetable for ${departmentId} ${semester} (${sec}). Validation status: ${validationReport.isValid ? 'PASS' : 'FAIL'}.`,
      req
    );

    return res.json({
      timetable,
      validationReport,
    });
  }
);

// Timetable Regeneration (Admin only)
apiRouter.post(
  '/timetables/:id/regenerate',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { defaultRoom, defaultLabRoom } = req.body;
    const data = db.getData();
    const timetable = data.structuredTimetables.find((t) => t.id === id);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    const schedule = generateAutomatedTimetableGrid(
      timetable.facultyAssignments,
      defaultRoom || 'LH-302',
      defaultLabRoom || 'ISE Advanced Computing Lab'
    );

    const otherSchedules = data.structuredTimetables
      .filter((t) => t.id !== id && t.isActive)
      .flatMap((t) => t.schedule);

    const validationReport = validateTimetableRules(
      timetable.facultyAssignments,
      schedule,
      otherSchedules
    );

    timetable.schedule = schedule;
    timetable.isValidated = validationReport.isValid;
    timetable.status = validationReport.isValid ? 'VALIDATED' : 'DRAFT';
    timetable.validationReport = validationReport;
    timetable.updatedAt = new Date().toISOString();

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'REGENERATE_TIMETABLE',
      'TIMETABLE',
      timetable.id,
      `Regenerated timetable grid for ${timetable.title}. Validation status: ${validationReport.isValid ? 'VALIDATED' : 'CONFLICTS'}.`,
      req
    );

    return res.json({ timetable, validationReport });
  }
);

// Manual Slot Editing (Admin only)
apiRouter.put(
  '/timetables/:id/manual-edit',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { schedule, facultyAssignments } = req.body;
    const data = db.getData();
    const timetable = data.structuredTimetables.find((t) => t.id === id);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    if (Array.isArray(facultyAssignments)) {
      timetable.facultyAssignments = facultyAssignments;
    }
    if (Array.isArray(schedule)) {
      timetable.schedule = schedule;
    }

    const otherSchedules = data.structuredTimetables
      .filter((t) => t.id !== id && t.isActive)
      .flatMap((t) => t.schedule);

    const validationReport = validateTimetableRules(
      timetable.facultyAssignments,
      timetable.schedule,
      otherSchedules
    );

    timetable.isValidated = validationReport.isValid;
    timetable.status = validationReport.isValid ? 'VALIDATED' : 'DRAFT';
    timetable.validationReport = validationReport;
    timetable.updatedAt = new Date().toISOString();

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'MANUAL_EDIT_TIMETABLE',
      'TIMETABLE',
      timetable.id,
      `Manually updated timetable slots for ${timetable.title}. Validation status: ${validationReport.isValid ? 'PASS' : 'FAIL'}.`,
      req
    );

    return res.json({ timetable, validationReport });
  }
);

// Validate Timetable (Admin only)
apiRouter.post(
  '/timetables/:id/validate',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const timetable = data.structuredTimetables.find((t) => t.id === id);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    const otherSchedules = data.structuredTimetables
      .filter((t) => t.id !== id && t.isActive)
      .flatMap((t) => t.schedule);

    const report = validateTimetableRules(
      timetable.facultyAssignments,
      timetable.schedule,
      otherSchedules
    );

    timetable.isValidated = report.isValid;
    if (timetable.status !== 'PUBLISHED') {
      timetable.status = report.isValid ? 'VALIDATED' : 'DRAFT';
    }
    timetable.validationReport = report;
    timetable.updatedAt = new Date().toISOString();

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'VALIDATE_TIMETABLE',
      'TIMETABLE',
      timetable.id,
      `Executed validation audit for ${timetable.title}. Valid: ${report.isValid}, Conflicts: ${report.conflicts.length}, Warnings: ${report.warnings.length}.`,
      req
    );

    return res.json({ timetable, report });
  }
);

// Publish Timetable: Mandatory Permission Rule Enforced (Admin only)
// Only validated timetables may be published.
// On publish: notifies affected faculty members and HOD, and archives previous published version.
apiRouter.post(
  '/timetables/:id/publish',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const timetable = data.structuredTimetables.find((t) => t.id === id);

    if (!timetable) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    // MANDATORY PERMISSION RULE: Only validated timetables may be published.
    const publishCheck = canPublishTimetable(timetable.status, timetable.validationReport);
    if (!publishCheck.allowed) {
      return res.status(400).json({
        error: publishCheck.reason || 'Only validated timetables may be published.',
      });
    }

    const now = new Date().toISOString();

    // Find previous active published timetable for the same department, semester, and section to archive/replace
    const previousPublished = data.structuredTimetables.find(
      (t) =>
        t.id !== id &&
        t.departmentId === timetable.departmentId &&
        t.semester === timetable.semester &&
        t.section === timetable.section &&
        t.status === 'PUBLISHED'
    );

    if (previousPublished) {
      previousPublished.status = 'REPLACED';
      previousPublished.isActive = false;
      previousPublished.replacedByVersion = timetable.version;
      previousPublished.retentionNote = `Replaced by Version ${timetable.version} published on ${new Date().toLocaleDateString()} by ${req.user!.email}. Retained for institutional record retention policy.`;
    }

    timetable.status = 'PUBLISHED';
    timetable.isActive = true;
    timetable.publishedAt = now;
    timetable.publishedBy = `${req.user!.email} (${req.user!.role})`;
    timetable.updatedAt = now;

    // MANDATORY RULE: Notify affected faculty members and HOD
    const affectedFacultyIds = new Set<string>();
    for (const a of timetable.facultyAssignments) {
      if (a.facultyUserId) affectedFacultyIds.add(a.facultyUserId);
    }
    for (const s of timetable.schedule) {
      if (s.facultyUserId) affectedFacultyIds.add(s.facultyUserId);
    }

    // Notify each affected faculty member
    affectedFacultyIds.forEach((facUserId) => {
      dispatchNotification(
        facUserId,
        `Official Timetable Published: ${timetable.semester}`,
        `Admin published the authoritative timetable for ${timetable.title}. Your assigned teaching schedule has been updated.`,
        'CIRCULAR',
        '/faculty/timetables',
        { id: req.user!.id, name: 'Admin Office' }
      );
    });

    // Notify HOD of department
    const dept = data.departments.find((d) => d.id === timetable.departmentId);
    if (dept?.hodId) {
      dispatchNotification(
        dept.hodId,
        `Department Timetable Published: ${timetable.title}`,
        `Admin officially published ${timetable.title} (Version ${timetable.version}). Ready for departmental view and download.`,
        'CIRCULAR',
        '/hod/timetables',
        { id: req.user!.id, name: 'Admin Office' }
      );
    }

    // Also sync with legacy officialTimetables for general download
    const legacyIdx = data.officialTimetables.findIndex(
      (ot) => ot.departmentId === timetable.departmentId && ot.studentYear === timetable.studentYear
    );
    const legacyRecord = {
      id: `tt-legacy-${timetable.id}`,
      departmentId: timetable.departmentId,
      academicYear: timetable.academicYear,
      semester: timetable.semester,
      studentYear: timetable.studentYear,
      title: timetable.title,
      fileUrl: 'https://placehold.co/800x600/png?text=Published+Official+Timetable',
      fileName: `${timetable.departmentId}_${timetable.semester.replace(/[^a-zA-Z0-9]/g, '_')}_Timetable.pdf`,
      version: timetable.version,
      isActive: true,
      uploadedBy: req.user!.email,
      uploadedAt: now,
    };
    if (legacyIdx >= 0) {
      data.officialTimetables[legacyIdx] = legacyRecord;
    } else {
      data.officialTimetables.unshift(legacyRecord);
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'PUBLISH_TIMETABLE',
      'TIMETABLE',
      timetable.id,
      `Admin published official timetable ${timetable.title} (v${timetable.version}). Notified ${affectedFacultyIds.size} assigned faculty members and HOD.`,
      req
    );

    return res.json({
      success: true,
      timetable,
      notifiedFacultyCount: affectedFacultyIds.size,
      message: `Timetable ${timetable.title} (Version ${timetable.version}) published successfully. All assigned faculty members and HOD have been notified.`,
    });
  }
);

// Replace Timetable with New Version (Admin only)
apiRouter.post(
  '/timetables/:id/replace',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { retentionNote, newAssignments, newSchedule } = req.body;
    const data = db.getData();
    const existing = data.structuredTimetables.find((t) => t.id === id);

    if (!existing) {
      return res.status(404).json({ error: 'Timetable to replace not found.' });
    }

    const now = new Date().toISOString();
    const newVersionNum = existing.version + 1;

    // Archive current timetable under retention policy
    existing.status = 'REPLACED';
    existing.isActive = false;
    existing.replacedByVersion = newVersionNum;
    existing.retentionNote =
      retentionNote ||
      `Archived pursuant to timetable replacement on ${new Date().toLocaleDateString()} by ${req.user!.email}. Previous version remains preserved for institutional audit.`;

    const assignments = newAssignments || existing.facultyAssignments;
    const schedule = newSchedule || existing.schedule;

    // Validate the replacement schedule
    const validationReport = validateTimetableRules(assignments, schedule);
    if (!validationReport.isValid) {
      return res.status(400).json({
        error: 'Cannot publish replacement: scheduling conflicts detected in replacement draft.',
        validationReport,
      });
    }

    const replacement: StructuredTimetable = {
      id: `st-${existing.departmentId}-${Date.now()}`,
      departmentId: existing.departmentId,
      academicYear: existing.academicYear,
      semester: existing.semester,
      section: existing.section,
      studentYear: existing.studentYear,
      title: `${existing.title.replace(/\(v\d+\)/, '')} (v${newVersionNum})`,
      status: 'PUBLISHED',
      isValidated: true,
      version: newVersionNum,
      isActive: true,
      facultyAssignments: assignments,
      schedule,
      validationReport,
      publishedAt: now,
      publishedBy: `${req.user!.email} (${req.user!.role})`,
      retentionNote: `Current active version replacing Version ${existing.version}.`,
      createdAt: now,
      updatedAt: now,
    };

    data.structuredTimetables.unshift(replacement);

    // Notify affected faculty
    const affectedFacultyIds = new Set<string>();
    for (const a of replacement.facultyAssignments) {
      if (a.facultyUserId) affectedFacultyIds.add(a.facultyUserId);
    }
    affectedFacultyIds.forEach((facUserId) => {
      dispatchNotification(
        facUserId,
        `Official Timetable Updated (Version ${newVersionNum})`,
        `Admin issued a replacement timetable for ${replacement.semester}. Please review your updated teaching schedule.`,
        'CIRCULAR',
        '/faculty/timetables',
        { id: req.user!.id, name: 'Admin Office' }
      );
    });

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'REPLACE_TIMETABLE',
      'TIMETABLE',
      replacement.id,
      `Admin replaced timetable version ${existing.version} with new version ${newVersionNum} for ${existing.departmentId} ${existing.semester}.`,
      req
    );

    return res.status(201).json({
      success: true,
      replacement,
      archivedPreviousVersion: existing,
    });
  }
);

// Authenticated Faculty Personalized Schedule View (read-only)
apiRouter.get(
  '/timetables/faculty-schedule',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const facultyUserId = req.user!.id;

    // Mandatory rule: Faculty views are constructed from persisted authoritative published database records
    const personalSchedule = extractFacultyPersonalSchedule(
      data.structuredTimetables || [],
      facultyUserId
    );

    return res.json({
      facultyUserId,
      totalWeeklyHours: personalSchedule.length,
      schedule: personalSchedule,
    });
  }
);

// Version Management & Retention History (Admin, HOD, and Faculty can inspect historical versions)
apiRouter.get(
  '/timetables/:id/versions',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const target = data.structuredTimetables.find((t) => t.id === id);

    if (!target) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    // Role check for HOD
    if (req.user!.role === 'HOD' && target.departmentId !== req.user!.departmentId) {
      return res.status(403).json({ error: 'Access denied to other departmental records.' });
    }

    // All versions for this department, semester, and section
    const versions = data.structuredTimetables
      .filter(
        (t) =>
          t.departmentId === target.departmentId &&
          t.semester === target.semester &&
          t.section === target.section
      )
      .sort((a, b) => b.version - a.version);

    return res.json(versions);
  }
);

// Delete Structured Timetable (Admin only)
apiRouter.delete(
  '/timetables/structured/:id',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const idx = data.structuredTimetables.findIndex((t) => t.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }

    const removed = data.structuredTimetables.splice(idx, 1)[0];
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'DELETE_TIMETABLE',
      'TIMETABLE',
      id,
      `Deleted timetable ${removed.title} (v${removed.version}).`,
      req
    );

    return res.json({ success: true, message: 'Timetable deleted successfully.' });
  }
);

// Legacy Official Timetable query
apiRouter.get('/timetables/official', (req: Request, res: Response) => {
  const { departmentId, year } = req.query;
  const data = db.getData();
  const activeDeptId = (departmentId as string) || data.institution.defaultDepartmentId || 'dept-ise';

  let tts = data.officialTimetables.filter((t) => t.isActive);
  if (activeDeptId) {
    tts = tts.filter((t) => t.departmentId === activeDeptId || t.departmentId === 'dept-ise' || !t.departmentId);
  }
  if (year) {
    tts = tts.filter((t) => t.studentYear === Number(year));
  }

  return res.json(tts);
});

// Legacy Official Timetable Upload (Exclusively ADMIN per mandatory permission rule)
apiRouter.post(
  '/timetables/official',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { departmentId, academicYear, semester, studentYear, title, fileUrl, fileName } =
      req.body;

    if (!departmentId || !studentYear || !title || !fileUrl) {
      return res.status(400).json({ error: 'Department, year, title, and file are required.' });
    }

    const data = db.getData();
    const yearNum = Number(studentYear);

    data.officialTimetables = data.officialTimetables.filter(
      (t) => !(t.departmentId === departmentId && t.studentYear === yearNum)
    );

    const newTt: any = {
      id: `tt-${departmentId}-${yearNum}-${Date.now()}`,
      departmentId,
      academicYear: academicYear || data.institution.currentAcademicYear,
      semester: semester || 'Odd Semester',
      studentYear: yearNum,
      title: title.trim(),
      fileUrl,
      fileName: fileName || 'official_timetable.pdf',
      version: 1,
      isActive: true,
      uploadedBy: req.user!.email,
      uploadedAt: new Date().toISOString(),
    };

    data.officialTimetables.unshift(newTt);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'UPLOAD_OFFICIAL_TIMETABLE',
      'OFFICIAL_TIMETABLE',
      newTt.id,
      `Uploaded official timetable for ${departmentId} Year ${yearNum}.`,
      req
    );

    return res.status(201).json(newTt);
  }
);

apiRouter.get(
  '/timetables/personal',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const myTt = data.personalTimetables.filter(
      (pt) => pt.facultyUserId === req.user!.id
    );
    return res.json(myTt);
  }
);

apiRouter.post(
  '/timetables/personal',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { title, fileUrl, fileName, semester, academicYear } = req.body;
    if (!title || !fileUrl) {
      return res.status(400).json({ error: 'Title and timetable file are required.' });
    }

    const data = db.getData();
    const newPt: any = {
      id: `pt-${Date.now()}`,
      facultyUserId: req.user!.id,
      academicYear: academicYear || data.institution.currentAcademicYear,
      semester: semester || 'Odd Semester',
      title: title.trim(),
      fileUrl,
      fileName: fileName || 'personal_timetable.pdf',
      uploadedAt: new Date().toISOString(),
    };

    data.personalTimetables.unshift(newPt);
    db.save();

    return res.status(201).json(newPt);
  }
);

apiRouter.delete(
  '/timetables/official/:id',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const idx = data.officialTimetables.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Timetable not found.' });
    }
    data.officialTimetables.splice(idx, 1);
    db.save();
    return res.json({ success: true, message: 'Timetable deleted.' });
  }
);

apiRouter.delete(
  '/timetables/personal/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const idx = data.personalTimetables.findIndex(
      (t) => t.id === id && (t.facultyUserId === req.user!.id || req.user!.role === 'ADMIN')
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'Timetable not found or unauthorized.' });
    }
    data.personalTimetables.splice(idx, 1);
    db.save();
    return res.json({ success: true, message: 'Schedule deleted.' });
  }
);

// ==========================================
// 7. FACULTY PORTFOLIOS & EVIDENCE
// ==========================================

apiRouter.get(
  '/portfolio',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const currentUser = req.user!;
    const { facultyUserId, departmentId, category } = req.query;

    let items = [...data.portfolioItems];

    if (currentUser.role === 'FACULTY') {
      // Faculty can view their own, or public/department if authorized
      items = items.filter((p) => p.facultyUserId === currentUser.id);
    } else if (currentUser.role === 'HOD' && currentUser.departmentId) {
      // HOD views their department faculty
      items = items.filter((p) => p.departmentId === currentUser.departmentId);
    } else if (departmentId) {
      items = items.filter((p) => p.departmentId === departmentId);
    }

    if (facultyUserId) {
      items = items.filter((p) => p.facultyUserId === facultyUserId);
    }

    if (category) {
      items = items.filter((p) => p.category === category);
    }

    return res.json(items);
  }
);

apiRouter.post(
  '/portfolio',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { category, title, academicYear, eventDate, details, evidenceDocUrl, evidenceDocName } =
      req.body;

    if (!category || !title || !eventDate) {
      return res.status(400).json({ error: 'Category, title, and event date are required.' });
    }

    const data = db.getData();
    const profile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);

    const newItem: any = {
      id: `port-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      facultyUserId: req.user!.id,
      facultyName: profile?.fullName || req.user!.email,
      departmentId: req.user!.departmentId || 'dept-ise',
      category,
      title: title.trim(),
      academicYear: academicYear || data.institution.currentAcademicYear,
      eventDate,
      details: details || {},
      evidenceDocUrl,
      evidenceDocName,
      status: 'VERIFIED',
      createdAt: new Date().toISOString(),
    };

    data.portfolioItems.unshift(newItem);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'ADD_PORTFOLIO_ITEM',
      'PORTFOLIO',
      newItem.id,
      `Added [${category}] record: "${newItem.title}".`,
      req
    );

    return res.status(201).json(newItem);
  }
);

apiRouter.put(
  '/portfolio/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const item = data.portfolioItems.find((p) => p.id === id);

    if (!item) {
      return res.status(404).json({ error: 'Portfolio record not found.' });
    }

    // Only owner or admin can edit
    if (item.facultyUserId !== req.user!.id && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied.' });
    }

    const { title, eventDate, details, evidenceDocUrl, evidenceDocName, academicYear } = req.body;
    if (title) item.title = title.trim();
    if (eventDate) item.eventDate = eventDate;
    if (academicYear) item.academicYear = academicYear;
    if (details) item.details = { ...item.details, ...details };
    if (evidenceDocUrl !== undefined) item.evidenceDocUrl = evidenceDocUrl;
    if (evidenceDocName !== undefined) item.evidenceDocName = evidenceDocName;

    db.save();

    return res.json(item);
  }
);

apiRouter.delete(
  '/portfolio/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const index = data.portfolioItems.findIndex((p) => p.id === id);

    if (index === -1) {
      return res.status(404).json({ error: 'Record not found.' });
    }

    const item = data.portfolioItems[index];
    const canDelete =
      item.facultyUserId === req.user!.id ||
      req.user!.role === 'ADMIN' ||
      (req.user!.role === 'HOD' && item.departmentId === req.user!.departmentId);

    if (!canDelete) {
      return res.status(403).json({ error: 'Access denied.' });
    }

    data.portfolioItems.splice(index, 1);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'DELETE_PORTFOLIO_ITEM',
      'PORTFOLIO',
      id,
      `Removed portfolio record "${item.title}".`,
      req
    );

    return res.json({ success: true });
  }
);

// ==========================================
// 8. TASKS & SUBMISSIONS WORKFLOW
// ==========================================

apiRouter.get('/tasks', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  const data = db.getData();
  const currentUser = req.user!;

  let tasks = [...data.tasks];

  if (currentUser.role === 'HOD') {
    tasks = tasks.filter((t) => t.departmentId === currentUser.departmentId);
  } else if (currentUser.role === 'FACULTY') {
    tasks = tasks.filter(
      (t) =>
        t.departmentId === currentUser.departmentId &&
        (t.assignedToFacultyIds.length === 0 ||
          t.assignedToFacultyIds.includes(currentUser.id))
    );
  }

  // Attach submission status for current user if faculty, or stats if HOD/Admin
  const tasksWithDetails = tasks.map((t) => {
    const submissions = data.taskSubmissions.filter((sub) => sub.taskId === t.id);

    if (currentUser.role === 'FACULTY') {
      const mySubmission = submissions.find(
        (sub) => sub.facultyUserId === currentUser.id
      );
      return {
        ...t,
        mySubmission,
        isSubmitted: !!mySubmission && mySubmission.status !== 'ASSIGNED',
      };
    } else {
      return {
        ...t,
        submissionsCount: submissions.length,
        approvedCount: submissions.filter((s) => s.status === 'APPROVED').length,
        pendingReviewCount: submissions.filter(
          (s) => s.status === 'SUBMITTED' || s.status === 'RESUBMITTED'
        ).length,
        returnedCount: submissions.filter(
          (s) => s.status === 'RETURNED_FOR_CORRECTION'
        ).length,
      };
    }
  });

  return res.json(tasksWithDetails);
});

apiRouter.post(
  '/tasks',
  authMiddleware,
  requireRole(['HOD', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      title,
      description,
      priority,
      dueDate,
      requiredDeliverableType,
      assignedToFacultyIds,
      circularNumber,
      circularDate,
      circularFileUrl,
      circularFileName,
    } = req.body;

    if (!title || !description || !dueDate) {
      return res.status(400).json({ error: 'Title, description, and due date are required.' });
    }

    const data = db.getData();
    const departmentId = req.user!.departmentId || 'dept-ise';
    const profile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);

    const newTask: Task = {
      id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      title: title.trim(),
      description: description.trim(),
      departmentId,
      createdById: req.user!.id,
      createdByName: profile?.fullName || req.user!.email,
      priority: priority || 'MEDIUM',
      dueDate,
      requiredDeliverableType: requiredDeliverableType || 'PDF Document',
      assignedToFacultyIds: Array.isArray(assignedToFacultyIds) ? assignedToFacultyIds : [],
      status: 'OPEN',
      createdAt: new Date().toISOString(),
      circularNumber: circularNumber?.trim() || undefined,
      circularDate: circularDate || undefined,
      circularFileUrl: circularFileUrl || undefined,
      circularFileName: circularFileName || undefined,
    };

    data.tasks.unshift(newTask);

    // Initialize submission records and dispatch notifications
    const targetFaculty = data.users.filter((u) => {
      const inDept = u.departmentId === departmentId;
      const isFaculty = u.role === 'FACULTY';
      const isSelected =
        newTask.assignedToFacultyIds.length === 0 ||
        newTask.assignedToFacultyIds.includes(u.id);
      return inDept && isFaculty && isSelected && u.status === 'ACTIVE';
    });

    for (const f of targetFaculty) {
      const fProfile = data.staffProfiles.find((sp) => sp.userId === f.id);
      data.taskSubmissions.push({
        id: `sub-${newTask.id}-${f.id}`,
        taskId: newTask.id,
        facultyUserId: f.id,
        facultyName: fProfile?.fullName || f.email,
        departmentId,
        status: 'ASSIGNED',
        currentVersion: 0,
        reviews: [],
      });

      const notifTitle = newTask.circularNumber
        ? `Official Circular #${newTask.circularNumber}: ${newTask.title}`
        : 'New Department Task Assigned';
      const notifMsg = newTask.circularNumber
        ? `Official circular #${newTask.circularNumber} published by ${newTask.createdByName}. Action deliverable due by ${newTask.dueDate}.`
        : `${newTask.createdByName} assigned "${newTask.title}". Deliverable due by ${newTask.dueDate}.`;

      dispatchNotification(
        f.id,
        notifTitle,
        notifMsg,
        'TASK_ASSIGNED',
        '/faculty/tasks',
        { id: req.user!.id, name: newTask.createdByName }
      );
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CREATE_TASK',
      'TASK',
      newTask.id,
      `Created task "${newTask.title}" for department ${departmentId}.`,
      req
    );

    return res.status(201).json(newTask);
  }
);

apiRouter.delete(
  '/tasks/:id',
  authMiddleware,
  requireRole(['HOD', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const idx = data.tasks.findIndex((t) => t.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Task not found.' });
    }
    const removed = data.tasks.splice(idx, 1)[0];
    data.taskSubmissions = data.taskSubmissions.filter((s) => s.taskId !== id);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'DELETE_TASK',
      'TASK',
      id,
      `Deleted task "${removed.title}".`,
      req
    );

    return res.json({ success: true, message: `Task "${removed.title}" deleted.` });
  }
);

apiRouter.get(
  '/tasks/:taskId/submissions',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;
    const data = db.getData();
    const currentUser = req.user!;

    let submissions = data.taskSubmissions.filter((s) => s.taskId === taskId);

    if (currentUser.role === 'FACULTY') {
      submissions = submissions.filter((s) => s.facultyUserId === currentUser.id);
    }

    return res.json(submissions);
  }
);

apiRouter.post(
  '/tasks/:taskId/submit',
  authMiddleware,
  requireRole(['FACULTY']),
  (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;
    const { notes, fileUrl, fileName } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ error: 'Deliverable file is required for submission.' });
    }

    const data = db.getData();
    const task = data.tasks.find((t) => t.id === taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    let submission = data.taskSubmissions.find(
      (s) => s.taskId === taskId && s.facultyUserId === req.user!.id
    );

    const profile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);
    const facultyName = profile?.fullName || req.user!.email;

    if (!submission) {
      submission = {
        id: `sub-${taskId}-${req.user!.id}`,
        taskId,
        facultyUserId: req.user!.id,
        facultyName,
        departmentId: req.user!.departmentId || 'dept-ise',
        status: 'ASSIGNED',
        currentVersion: 0,
        reviews: [],
      };
      data.taskSubmissions.push(submission);
    }

    // Validate state transition
    const transition = validateSubmissionTransition(submission.status, 'SUBMIT');
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.error });
    }

    submission.status = transition.nextStatus!;
    submission.currentVersion += 1;
    submission.submittedAt = new Date().toISOString();
    submission.submissionNotes = notes || '';
    submission.fileUrl = fileUrl;
    submission.fileName = fileName || 'Deliverable.pdf';

    // Notify HOD
    const dept = data.departments.find((d) => d.id === task.departmentId);
    if (dept?.hodId) {
      dispatchNotification(
        dept.hodId,
        'Submission Received for Review',
        `${facultyName} submitted deliverable for "${task.title}".`,
        'SUBMISSION_RECEIVED',
        '/hod/tasks',
        { id: req.user!.id, name: facultyName }
      );
    }

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'SUBMIT_TASK_DELIVERABLE',
      'SUBMISSION',
      submission.id,
      `Submitted version ${submission.currentVersion} for task "${task.title}".`,
      req
    );

    return res.json(submission);
  }
);

apiRouter.post(
  '/tasks/:taskId/review',
  authMiddleware,
  requireRole(['HOD', 'ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const { taskId } = req.params;
    const { submissionId, action, remarks } = req.body;

    if (!submissionId || !action) {
      return res.status(400).json({ error: 'Submission ID and review action are required.' });
    }

    const data = db.getData();
    const submission = data.taskSubmissions.find((s) => s.id === submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found.' });
    }

    const task = data.tasks.find((t) => t.id === taskId);
    const profile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);
    const reviewerName = profile?.fullName || req.user!.email;

    // Validate state machine transition
    const transition = validateSubmissionTransition(
      submission.status,
      action as any,
      remarks
    );
    if (!transition.allowed) {
      return res.status(400).json({ error: transition.error });
    }

    submission.status = transition.nextStatus!;
    submission.reviews.push({
      reviewerId: req.user!.id,
      reviewerName,
      action: action as any,
      remarks: remarks || '',
      reviewedAt: new Date().toISOString(),
    });

    // Notify faculty of review verdict
    let notifTitle = 'Submission Reviewed';
    let notifType: Notification['type'] = 'SUBMISSION_APPROVED';
    if (action === 'RETURN') {
      notifTitle = 'Submission Returned for Correction';
      notifType = 'SUBMISSION_RETURNED';
    } else if (action === 'REJECT') {
      notifTitle = 'Submission Rejected';
      notifType = 'SUBMISSION_RETURNED';
    }

    dispatchNotification(
      submission.facultyUserId,
      notifTitle,
      `HOD ${reviewerName} ${action === 'APPROVE' ? 'approved' : 'returned'} your submission for "${task?.title || 'Task'}". Remarks: "${remarks || 'Approved.'}"`,
      notifType,
      '/faculty/tasks',
      { id: req.user!.id, name: reviewerName }
    );

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      `REVIEW_TASK_${action}`,
      'SUBMISSION',
      submission.id,
      `HOD reviewed submission: ${action}. Remarks: ${remarks || 'None'}`,
      req
    );

    return res.json(submission);
  }
);

// ==========================================
// 9. ACADEMIC FEED & INSTITUTIONAL POSTS
// ==========================================

apiRouter.get('/feed', (req: Request, res: Response) => {
  const data = db.getData();
  const sessionToken =
    req.cookies?.fpms_session ||
    (req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.substring(7)
      : null);

  const isAuthenticated = !!sessionToken && data.users.some((u) => u.id === sessionToken);
  const now = new Date();

  let posts = data.feedPosts.filter((p) => {
    if (p.expiresAt && !p.isPinned && new Date(p.expiresAt) < now) {
      return false;
    }
    return true;
  });

  if (!isAuthenticated) {
    // Public landing page only shows approved PUBLIC posts
    posts = posts.filter((p) => p.visibility === 'PUBLIC' && p.isApproved);
  }

  // If no posts are active, fallback to pinned default post
  if (posts.length === 0) {
    posts = data.feedPosts.filter((p) => p.isPinned);
  }

  return res.json(posts);
});

apiRouter.post(
  '/feed',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const {
      title,
      content,
      category,
      eventDate,
      mediaUrl,
      mediaUrls,
      mediaType,
      visibility,
      durationDays,
      isPinned,
    } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required.' });
    }

    const data = db.getData();
    const profile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);

    const dur = durationDays ? Number(durationDays) : 0;
    const now = new Date();
    let expiresAt: string | undefined = undefined;
    if (req.body.expiresAt) {
      expiresAt = new Date(req.body.expiresAt).toISOString();
    } else if (dur > 0) {
      const expDate = new Date(now.getTime() + dur * 24 * 60 * 60 * 1000);
      expiresAt = expDate.toISOString();
    }

    const finalMediaUrls = Array.isArray(mediaUrls) && mediaUrls.length > 0
      ? mediaUrls
      : mediaUrl
      ? [mediaUrl]
      : [];

    const newPost: any = {
      id: `post-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      authorUserId: req.user!.id,
      authorName: profile?.fullName || req.user!.email,
      authorRole: req.user!.role,
      authorDesignation: profile?.designation,
      title: title.trim(),
      content: content.trim(),
      category: category || 'ACADEMIC_EVENT',
      eventDate: eventDate || new Date().toISOString().split('T')[0],
      mediaUrl: finalMediaUrls[0] || undefined,
      mediaUrls: finalMediaUrls,
      mediaType: mediaType || 'IMAGE',
      visibility: visibility || 'PUBLIC',
      durationDays: dur,
      expiresAt,
      isPinned: !!isPinned,
      isApproved: true,
      likes: [],
      comments: [],
      createdAt: now.toISOString(),
    };

    data.feedPosts.unshift(newPost);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CREATE_FEED_POST',
      'FEED_POST',
      newPost.id,
      `Published post: "${newPost.title}".`,
      req
    );

    return res.status(201).json(newPost);
  }
);

apiRouter.post(
  '/feed/:id/like',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const post = data.feedPosts.find((p) => p.id === id);

    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const idx = post.likes.indexOf(req.user!.id);
    if (idx === -1) {
      post.likes.push(req.user!.id);
    } else {
      post.likes.splice(idx, 1);
    }

    db.save();
    return res.json({ likesCount: post.likes.length, isLiked: idx === -1 });
  }
);

apiRouter.post(
  '/feed/:id/comment',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const { text } = req.body;
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required.' });
    }

    const data = db.getData();
    const post = data.feedPosts.find((p) => p.id === id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const profile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);
    const comment = {
      id: `c-${Date.now()}`,
      userId: req.user!.id,
      userName: profile?.fullName || req.user!.email,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    post.comments.push(comment);
    db.save();

    return res.status(201).json(comment);
  }
);

apiRouter.delete(
  '/feed/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const data = db.getData();
    const idx = data.feedPosts.findIndex(
      (p) => p.id === id && (p.authorUserId === req.user!.id || req.user!.role === 'ADMIN')
    );
    if (idx === -1) {
      return res.status(404).json({ error: 'Post not found or unauthorized.' });
    }
    data.feedPosts.splice(idx, 1);
    db.save();
    return res.json({ success: true, message: 'Post removed successfully.' });
  }
);

apiRouter.put(
  '/feed/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const { id } = req.params;
    const {
      title,
      content,
      category,
      eventDate,
      mediaUrl,
      mediaUrls,
      mediaType,
      visibility,
      durationDays,
      isPinned,
    } = req.body;

    const data = db.getData();
    const post = data.feedPosts.find((p) => p.id === id);
    if (!post) {
      return res.status(404).json({ error: 'Post not found.' });
    }

    const canEdit =
      post.authorUserId === req.user!.id ||
      req.user!.role === 'ADMIN' ||
      req.user!.role === 'HOD';

    if (!canEdit) {
      return res.status(403).json({ error: 'Access denied to edit this post.' });
    }

    if (title) post.title = title.trim();
    if (content) post.content = content.trim();
    if (category) post.category = category;
    if (eventDate) post.eventDate = eventDate;
    if (visibility) post.visibility = visibility;
    if (isPinned !== undefined) (post as any).isPinned = !!isPinned;

    if (req.body.expiresAt !== undefined) {
      post.expiresAt = req.body.expiresAt ? new Date(req.body.expiresAt).toISOString() : undefined;
    } else if (durationDays !== undefined) {
      const dur = Number(durationDays);
      (post as any).durationDays = dur;
      if (dur > 0) {
        post.expiresAt = new Date(Date.now() + dur * 24 * 60 * 60 * 1000).toISOString();
      } else {
        post.expiresAt = undefined;
      }
    }

    if (mediaUrls && Array.isArray(mediaUrls)) {
      (post as any).mediaUrls = mediaUrls;
      post.mediaUrl = mediaUrls[0] || undefined;
    } else if (mediaUrl !== undefined) {
      post.mediaUrl = mediaUrl;
      (post as any).mediaUrls = mediaUrl ? [mediaUrl] : [];
    }
    if (mediaType) post.mediaType = mediaType;

    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'UPDATE_FEED_POST',
      'FEED_POST',
      post.id,
      `Updated post: "${post.title}".`,
      req
    );

    return res.json(post);
  }
);

// ==========================================
// 10. AI REPORT GENERATION & EXPORTS
// ==========================================

apiRouter.post(
  '/reports/generate',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { facultyUserId, academicYear, scope, useAi } = req.body;
    const data = db.getData();
    const currentUser = req.user!;

    // Resolve target faculty and department
    const targetUserId =
      currentUser.role === 'ADMIN' || currentUser.role === 'HOD'
        ? facultyUserId || currentUser.id
        : currentUser.id;

    const targetUser = data.users.find((u) => u.id === targetUserId);
    const targetProfile = data.staffProfiles.find((sp) => sp.userId === targetUserId);
    const targetDept = targetUser?.departmentId
      ? data.departments.find((d) => d.id === targetUser.departmentId)
      : null;

    const selectedYear = academicYear || data.institution.currentAcademicYear;

    // Retrieve verified records strictly from database
    const records = data.portfolioItems.filter(
      (p) =>
        p.facultyUserId === targetUserId &&
        (p.academicYear === selectedYear || !academicYear)
    );

    const reportPayload = {
      facultyName: targetProfile?.fullName || 'Faculty Member',
      designation: targetProfile?.designation || 'Faculty',
      departmentName: targetDept?.name || 'Information Science and Engineering',
      academicYear: selectedYear,
      records,
      profile: targetProfile,
    };

    try {
      if (useAi === false) {
        const report = generateDeterministicReport(reportPayload);
        return res.json(report);
      } else {
        const report = await generateGroundedGeminiReport(reportPayload);
        return res.json(report);
      }
    } catch (err: any) {
      console.error('Report generation error:', err);
      const fallback = generateDeterministicReport(reportPayload);
      return res.json(fallback);
    }
  }
);

apiRouter.post(
  '/reports/assistant-chat',
  authMiddleware,
  async (req: AuthenticatedRequest, res: Response) => {
    const { message, academicYear, conversationHistory } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message prompt is required.' });
    }

    const data = db.getData();
    const currentUser = req.user!;
    const profile = data.staffProfiles.find((sp) => sp.userId === currentUser.id);
    const userDept = currentUser.departmentId
      ? data.departments.find((d) => d.id === currentUser.departmentId)
      : null;

    const selectedYear = academicYear || data.institution.currentAcademicYear;
    const records = data.portfolioItems.filter(
      (p) => p.facultyUserId === currentUser.id && (p.academicYear === selectedYear || !academicYear)
    );

    // Look up assigned mentees for this faculty member
    const allocations = data.mentorAllocations.filter(
      (a) => (!academicYear || a.academicYear === selectedYear)
    );
    const myAllocGroups = allocations.flatMap((a) =>
      a.groups.filter((g) => g.mentorId === currentUser.id)
    );
    const myMenteeIds = Array.from(new Set(myAllocGroups.flatMap((g) => g.studentIds)));
    const mentees = data.students.filter((s) => myMenteeIds.includes(s.id));

    const context = {
      facultyName: profile?.fullName || currentUser.email,
      designation: profile?.designation || 'Faculty Member',
      departmentName: userDept?.name || 'Department of Information Science and Engineering',
      academicYear: selectedYear,
      records,
      profile,
      mentees,
    };

    try {
      const reply = await consultReportAssistant(message, context, conversationHistory);
      return res.json({ reply, generatedAt: new Date().toISOString() });
    } catch (err: any) {
      console.error('AI assistant chat error:', err);
      return res.status(500).json({ error: err.message || 'Assistant response failed.' });
    }
  }
);

// ==========================================
// 11. NOTIFICATIONS & AUDIT LOGS
// ==========================================

apiRouter.get(
  '/notifications',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getData();
      const currentUser = req.user!;
      const now = Date.now();

      // Automatically purge expired notifications from database if not saved by any user
      if (Array.isArray(data.notifications)) {
        const initialCount = data.notifications.length;
        data.notifications = data.notifications.filter((n) => {
          if (n.validUntil) {
            const exp = new Date(n.validUntil).getTime();
            if (exp < now) {
              const isSavedByAnyone = Array.isArray(n.savedByUserIds) && n.savedByUserIds.length > 0;
              return isSavedByAnyone;
            }
          }
          return true;
        });
        if (data.notifications.length !== initialCount) {
          db.save();
        }
      }

      const notifs = (data.notifications || []).filter((n) => {
        // If user hid/deleted this notification from their inbox
        if (n.hiddenByUserIds && n.hiddenByUserIds.includes(currentUser.id)) {
          return false;
        }

        // Check if expired for this user (unless bookmarked/saved)
        if (n.validUntil && new Date(n.validUntil).getTime() < now) {
          const isSavedByMe = n.savedByUserIds && n.savedByUserIds.includes(currentUser.id);
          if (!isSavedByMe) return false;
        }

        // Direct recipient or broadcast
        if (n.recipientUserId === currentUser.id || n.recipientUserId === 'ALL') return true;
        if (n.recipientUserId === 'FACULTY' && currentUser.role === 'FACULTY') return true;

        // Author of circular always sees their circulated notices
        if (n.actorUserId === currentUser.id) return true;

        // Circulars sent by institution ADMIN / Master Admin are visible to all users
        if (n.type === 'CIRCULAR') {
          const author = data.users.find((u) => u.id === n.actorUserId);
          if (author?.role === 'ADMIN') return true;
          // If sent by HOD of the current user's department
          if (currentUser.departmentId && author?.departmentId === currentUser.departmentId) return true;
          // In academic institution, circulars without restriction are open
          if (!n.recipientUserId || n.recipientUserId === 'ALL') return true;
        }
        return false;
      });

      // Deduplicate circulars and broadcast notifications by title + approximate timestamp to prevent duplicate copies
      const seen = new Set<string>();
      const result: Notification[] = [];
      for (const n of notifs) {
        const isBroadcastOrCircular =
          n.type === 'CIRCULAR' ||
          n.type === 'MENTOR_ALLOCATED' ||
          n.title.toLowerCase().includes('mentor') ||
          n.title.toLowerCase().includes('circular');

        const dedupeKey = isBroadcastOrCircular
          ? `${n.title}_${(n.createdAt || '').substring(0, 16)}`
          : n.id;

        if (!seen.has(dedupeKey)) {
          seen.add(dedupeKey);
          const isRead =
            (n.readByUserIds && n.readByUserIds.includes(currentUser.id)) ||
            (n.recipientUserId === currentUser.id && !!n.isRead) ||
            false;
          const isSaved = (n.savedByUserIds && n.savedByUserIds.includes(currentUser.id)) || false;
          result.push({
            ...n,
            isRead: !!isRead,
            isSaved: !!isSaved,
          });
        }
      }

      return res.json(result);
    } catch (err: any) {
      console.error('Failed to get notifications:', err);
      return res.status(500).json({ error: 'Failed to retrieve notifications' });
    }
  }
);

apiRouter.delete(
  '/notifications/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      const currentUser = req.user!;
      const notif = (data.notifications || []).find((n) => n.id === id);

      if (!notif) {
        return res.json({ success: true, removed: 0 });
      }

      // If user is Admin or the author or direct private recipient, delete from database
      if (
        currentUser.role === 'ADMIN' ||
        notif.actorUserId === currentUser.id ||
        notif.recipientUserId === currentUser.id
      ) {
        data.notifications = (data.notifications || []).filter((n) => n.id !== id);
      } else {
        // Otherwise hide it from this user's view
        if (!notif.hiddenByUserIds) notif.hiddenByUserIds = [];
        if (!notif.hiddenByUserIds.includes(currentUser.id)) {
          notif.hiddenByUserIds.push(currentUser.id);
        }
      }

      db.save();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to delete notification' });
    }
  }
);

apiRouter.post(
  '/notifications/batch-delete',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { ids } = req.body;
      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({ error: 'ids array is required' });
      }
      const idSet = new Set(ids);
      const data = db.getData();
      const currentUser = req.user!;

      (data.notifications || []).forEach((n) => {
        if (idSet.has(n.id)) {
          if (
            currentUser.role === 'ADMIN' ||
            n.actorUserId === currentUser.id ||
            n.recipientUserId === currentUser.id
          ) {
            // mark for global removal
          } else {
            if (!n.hiddenByUserIds) n.hiddenByUserIds = [];
            if (!n.hiddenByUserIds.includes(currentUser.id)) {
              n.hiddenByUserIds.push(currentUser.id);
            }
          }
        }
      });

      // Filter out permanently deleted ones
      data.notifications = (data.notifications || []).filter((n) => {
        if (idSet.has(n.id)) {
          if (
            currentUser.role === 'ADMIN' ||
            n.actorUserId === currentUser.id ||
            n.recipientUserId === currentUser.id
          ) {
            return false;
          }
        }
        return true;
      });

      db.save();
      return res.json({ success: true, removedCount: ids.length });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to batch delete notifications' });
    }
  }
);

apiRouter.delete(
  '/notifications/clear-all',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getData();
      const currentUser = req.user!;

      // Permanently remove direct or authored notifications, and hide broadcasts
      (data.notifications || []).forEach((n) => {
        if (n.recipientUserId === currentUser.id || n.actorUserId === currentUser.id) {
          // Will be filtered out
        } else {
          if (!n.hiddenByUserIds) n.hiddenByUserIds = [];
          if (!n.hiddenByUserIds.includes(currentUser.id)) {
            n.hiddenByUserIds.push(currentUser.id);
          }
        }
      });

      data.notifications = (data.notifications || []).filter(
        (n) => !(n.recipientUserId === currentUser.id || n.actorUserId === currentUser.id)
      );

      db.save();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to clear notifications' });
    }
  }
);

apiRouter.put(
  '/notifications/:id/read',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      const notif = (data.notifications || []).find((n) => n.id === id);

      if (notif) {
        if (!notif.readByUserIds) notif.readByUserIds = [];
        if (!notif.readByUserIds.includes(req.user!.id)) {
          notif.readByUserIds.push(req.user!.id);
        }
        if (notif.recipientUserId === req.user!.id) {
          notif.isRead = true;
        }
        db.save();
      }
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  }
);

apiRouter.put(
  '/notifications/:id/save',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      const notif = (data.notifications || []).find((n) => n.id === id);
      if (!notif) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      if (!notif.savedByUserIds) notif.savedByUserIds = [];
      const idx = notif.savedByUserIds.indexOf(req.user!.id);
      let isSaved = false;
      if (idx >= 0) {
        notif.savedByUserIds.splice(idx, 1);
        isSaved = false;
      } else {
        notif.savedByUserIds.push(req.user!.id);
        isSaved = true;
      }
      db.save();
      return res.json({ success: true, isSaved });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to toggle saved status' });
    }
  }
);

apiRouter.put(
  '/notifications/read-all',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getData();
      (data.notifications || []).forEach((n) => {
        if (!n.readByUserIds) n.readByUserIds = [];
        if (!n.readByUserIds.includes(req.user!.id)) {
          n.readByUserIds.push(req.user!.id);
        }
        if (n.recipientUserId === req.user!.id) {
          n.isRead = true;
        }
      });
      db.save();
      return res.json({ success: true });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to mark notifications as read' });
    }
  }
);

apiRouter.post(
  '/notifications/circular',
  authMiddleware,
  requireRole(['ADMIN', 'HOD']),
  (req: AuthenticatedRequest, res: Response) => {
    const {
      title,
      message,
      circularNumber,
      circularDate,
      attachmentUrl,
      attachmentName,
      targetAudience,
      durationDays,
      validUntil,
    } = req.body;

    if (!title || !message) {
      return res.status(400).json({ error: 'Title and notice description are required.' });
    }

    const data = db.getData();
    const actorProfile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);
    const actorName = actorProfile?.fullName || req.user!.email;

    const dur = durationDays ? Number(durationDays) : 0;
    let finalValidUntil: string | undefined = validUntil || undefined;
    if (dur > 0 && !finalValidUntil) {
      finalValidUntil = new Date(Date.now() + dur * 24 * 60 * 60 * 1000).toISOString();
    }

    const now = new Date().toISOString();
    const todayDate = now.split('T')[0];

    const dept = data.departments.find((d) => d.id === req.user!.departmentId);
    const deptCode = dept?.code || 'INST';
    const autoRefNo =
      circularNumber?.trim() ||
      `MITM/${deptCode}/CIR/${new Date().getFullYear()}/${Math.floor(100 + Math.random() * 900)}`;

    // Create exactly ONE single broadcast notification record instead of duplicating per user
    const singleNotif: Notification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      recipientUserId: targetAudience === 'FACULTY' ? 'FACULTY' : 'ALL',
      actorUserId: req.user!.id,
      actorName,
      title: title.trim(),
      message: message.trim(),
      type: 'CIRCULAR',
      circularNumber: autoRefNo,
      circularDate: todayDate,
      attachmentUrl: attachmentUrl || undefined,
      attachmentName: attachmentName || undefined,
      durationDays: dur,
      validUntil: finalValidUntil,
      isRead: false,
      readByUserIds: [req.user!.id], // sender already read their own circular
      savedByUserIds: [],
      hiddenByUserIds: [],
      createdAt: now,
    };

    data.notifications.unshift(singleNotif);
    db.save();

    logAudit(
      { id: req.user!.id, email: req.user!.email, role: req.user!.role },
      'CIRCULATE_OFFICIAL_NOTICE',
      'CIRCULAR',
      autoRefNo,
      `Circulated official notice: "${title}" (Target: ${targetAudience === 'FACULTY' ? 'Faculty' : 'All Staff'}).`,
      req
    );

    return res.status(201).json({ success: true, count: 1 });
  }
);

apiRouter.get(
  '/audit-logs',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    return res.json(data.auditLogs);
  }
);

// ==========================================
// 11B. INTELLIGENT STUDENT SECTION ALLOCATION
// ==========================================

apiRouter.get(
  '/section-allocations',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const data = db.getData();
      const currentUser = req.user!;
      const deptId = (req.query.departmentId as string) || currentUser.departmentId || 'dept-ise';

      // RBAC check: Non-admins can only view their own department
      if (currentUser.role !== 'ADMIN' && currentUser.departmentId && currentUser.departmentId !== deptId) {
        return res.status(403).json({ error: 'Access denied to other department section allocations.' });
      }

      let runs = (data.sectionAllocationRuns || []).filter((r) => r.departmentId === deptId);

      // Faculty can only view published allocations
      if (currentUser.role === 'FACULTY' || currentUser.role === 'NON_TEACHING') {
        runs = runs.filter((r) => r.status === 'PUBLISHED');
      }

      const year = req.query.year ? Number(req.query.year) : undefined;
      if (year) {
        runs = runs.filter((r) => r.yearOfStudy === year);
      }

      return res.json(runs);
    } catch (err: any) {
      console.error('Failed to get section allocations:', err);
      return res.status(500).json({ error: 'Failed to retrieve section allocations.' });
    }
  }
);

apiRouter.get(
  '/section-allocations/:id',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      const run = (data.sectionAllocationRuns || []).find((r) => r.id === id);
      if (!run) {
        return res.status(404).json({ error: 'Section allocation run not found.' });
      }

      // RBAC check
      const currentUser = req.user!;
      if (currentUser.role !== 'ADMIN' && currentUser.departmentId && currentUser.departmentId !== run.departmentId) {
        return res.status(403).json({ error: 'Access denied.' });
      }
      if ((currentUser.role === 'FACULTY' || currentUser.role === 'NON_TEACHING') && run.status !== 'PUBLISHED') {
        return res.status(403).json({ error: 'Draft allocation runs are only accessible to administrators.' });
      }

      return res.json(run);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to fetch section allocation run.' });
    }
  }
);

apiRouter.post(
  '/section-allocations/preview',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const {
        departmentId,
        yearOfStudy,
        semester,
        method,
        performanceMetric,
        sections,
        bands,
        randomSeed,
        performanceScores, // Record<usn, number>
        missingPolicy,
      } = req.body;

      if (!departmentId || !yearOfStudy || !sections || !Array.isArray(sections) || sections.length === 0) {
        return res.status(400).json({ error: 'Department, yearOfStudy, and at least one section are required.' });
      }

      const data = db.getData();
      const yr = Number(yearOfStudy);
      const eligibleStudents = data.students.filter(
        (s) => s.departmentId === departmentId && s.currentYear === yr && s.status === 'ACTIVE'
      );

      if (eligibleStudents.length === 0) {
        return res.status(400).json({ error: `No active eligible students found in Year ${yr} for department ${departmentId}.` });
      }

      const candidateInputs = eligibleStudents.map((s) => ({
        id: s.id,
        usn: s.usn,
        fullName: s.fullName,
        currentYear: s.currentYear,
        currentSemester: s.currentSemester || (yr === 1 ? 1 : yr === 2 ? 3 : yr === 3 ? 5 : 7),
        status: s.status,
        score: performanceScores ? performanceScores[s.usn.trim().toUpperCase()] : undefined,
      }));

      let result;
      if (method === 'PERFORMANCE') {
        const validMetrics = ['CGPA', 'SGPA', 'CGPA/SGPA', 'CGPA / SGPA'];
        if (!performanceMetric || !validMetrics.includes(performanceMetric)) {
          return res.status(400).json({ error: 'Valid performance metric (CGPA / SGPA) must be selected.' });
        }
        result = executePerformanceBalancedAllocation(
          candidateInputs,
          sections,
          performanceMetric,
          bands || DEFAULT_PERFORMANCE_BANDS,
          randomSeed,
          missingPolicy || 'UNASSIGNED'
        );
      } else {
        result = executeRandomBalancedAllocation(candidateInputs, sections, randomSeed);
      }

      return res.json({
        success: true,
        eligibleCount: eligibleStudents.length,
        result,
      });
    } catch (err: any) {
      console.error('Section allocation preview failed:', err);
      return res.status(400).json({ error: err.message || 'Failed to generate allocation preview.' });
    }
  }
);

apiRouter.post(
  '/section-allocations/save-draft',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const runData: Partial<StudentSectionAllocationRun> = req.body;
      if (!runData.departmentId || !runData.yearOfStudy || !runData.students || !runData.sections) {
        return res.status(400).json({ error: 'Incomplete allocation run payload.' });
      }

      const data = db.getData();
      if (!data.sectionAllocationRuns) data.sectionAllocationRuns = [];

      const now = new Date().toISOString();
      const existingIdx = runData.id ? data.sectionAllocationRuns.findIndex((r) => r.id === runData.id) : -1;

      const actorProfile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);
      const actorName = actorProfile?.fullName || req.user!.email;

      const runToSave: StudentSectionAllocationRun = {
        id: runData.id || `run-sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        departmentId: runData.departmentId,
        academicYear: runData.academicYear || data.institution.currentAcademicYear,
        yearOfStudy: Number(runData.yearOfStudy),
        semester: runData.semester ? Number(runData.semester) : undefined,
        title: runData.title || `Year ${runData.yearOfStudy} Section Allocation Draft`,
        status: 'DRAFT',
        method: runData.method || 'RANDOM',
        performanceMetric: runData.performanceMetric || null,
        sgpaSemester: runData.sgpaSemester || null,
        sgpaAcademicYear: runData.sgpaAcademicYear || null,
        randomSeed: runData.randomSeed || `seed-${Date.now()}`,
        algorithmVersion: runData.algorithmVersion || '1.0-BALANCED',
        sections: runData.sections,
        bands: runData.bands || DEFAULT_PERFORMANCE_BANDS,
        totalStudentsCount: runData.students.length,
        students: runData.students,
        summary: runData.summary || { sectionCounts: {} },
        performanceImportDetails: runData.performanceImportDetails,
        createdById: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].createdById : req.user!.id,
        createdByName: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].createdByName : actorName,
        createdAt: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].createdAt : now,
        updatedAt: now,
        versionNumber: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].versionNumber : 1,
      };

      if (existingIdx >= 0) {
        data.sectionAllocationRuns[existingIdx] = runToSave;
      } else {
        data.sectionAllocationRuns.unshift(runToSave);
      }

      db.save();
      return res.json({ success: true, run: runToSave });
    } catch (err: any) {
      console.error('Save draft failed:', err);
      return res.status(500).json({ error: 'Failed to save draft allocation.' });
    }
  }
);

apiRouter.post(
  '/section-allocations/publish',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const runData: Partial<StudentSectionAllocationRun> = req.body;
      if (!runData.departmentId || !runData.yearOfStudy || !runData.students || !runData.sections) {
        return res.status(400).json({ error: 'Incomplete allocation run payload for publishing.' });
      }

      const data = db.getData();
      if (!data.sectionAllocationRuns) data.sectionAllocationRuns = [];

      const now = new Date().toISOString();
      const existingIdx = runData.id ? data.sectionAllocationRuns.findIndex((r) => r.id === runData.id) : -1;
      const currentVer = existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].versionNumber + 1 : 1;

      const actorProfile = data.staffProfiles.find((sp) => sp.userId === req.user!.id);
      const actorName = actorProfile?.fullName || req.user!.email;

      const publishedRun: StudentSectionAllocationRun = {
        id: runData.id || `run-sec-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        departmentId: runData.departmentId,
        academicYear: runData.academicYear || data.institution.currentAcademicYear,
        yearOfStudy: Number(runData.yearOfStudy),
        semester: runData.semester ? Number(runData.semester) : undefined,
        title: runData.title || `Year ${runData.yearOfStudy} Official Section Allocation (v${currentVer})`,
        status: 'PUBLISHED',
        method: runData.method || 'RANDOM',
        performanceMetric: runData.performanceMetric || null,
        sgpaSemester: runData.sgpaSemester || null,
        sgpaAcademicYear: runData.sgpaAcademicYear || null,
        randomSeed: runData.randomSeed || `seed-${Date.now()}`,
        algorithmVersion: runData.algorithmVersion || '1.0-BALANCED',
        sections: runData.sections,
        bands: runData.bands || DEFAULT_PERFORMANCE_BANDS,
        totalStudentsCount: runData.students.length,
        students: runData.students,
        summary: runData.summary || { sectionCounts: {} },
        performanceImportDetails: runData.performanceImportDetails,
        createdById: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].createdById : req.user!.id,
        createdByName: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].createdByName : actorName,
        createdAt: existingIdx >= 0 ? data.sectionAllocationRuns[existingIdx].createdAt : now,
        updatedAt: now,
        publishedAt: now,
        publishedById: req.user!.id,
        publishedByName: actorName,
        versionNumber: currentVer,
      };

      // Transactional student record update in database
      // Assign the finalized section to the official student database records
      let updatedStudentsCount = 0;
      for (const allocated of publishedRun.students) {
        const student = data.students.find((s) => s.id === allocated.studentId || s.usn === allocated.usn);
        if (student) {
          student.section = allocated.assignedSection;
          updatedStudentsCount++;
        }
      }

      if (existingIdx >= 0) {
        data.sectionAllocationRuns[existingIdx] = publishedRun;
      } else {
        data.sectionAllocationRuns.unshift(publishedRun);
      }

      db.save();

      logAudit(
        { id: req.user!.id, email: req.user!.email, role: req.user!.role },
        'PUBLISH_SECTION_ALLOCATION',
        'SECTION_ALLOCATION',
        publishedRun.id,
        `Published Year ${publishedRun.yearOfStudy} Section Allocation (v${currentVer}) for department ${publishedRun.departmentId}. Assigned ${updatedStudentsCount} students into ${publishedRun.sections.length} sections.`,
        req
      );

      return res.json({
        success: true,
        run: publishedRun,
        updatedStudentsCount,
        message: `Section allocation published successfully! ${updatedStudentsCount} student records updated with official sections.`,
      });
    } catch (err: any) {
      console.error('Publish section allocation failed:', err);
      return res.status(500).json({ error: 'Failed to publish section allocation.' });
    }
  }
);

apiRouter.post(
  '/section-allocations/download-template',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { departmentId, yearOfStudy, metric, semesterLabel } = req.body;
      if (!departmentId || !yearOfStudy || !metric) {
        return res.status(400).json({ error: 'departmentId, yearOfStudy, and metric are required.' });
      }

      const data = db.getData();
      const yr = Number(yearOfStudy);
      const eligible = data.students
        .filter((s) => s.departmentId === departmentId && s.currentYear === yr && s.status === 'ACTIVE')
        .sort((a, b) => a.usn.localeCompare(b.usn));

      if (eligible.length === 0) {
        return res.status(400).json({ error: `No active students found in Year ${yr} for template generation.` });
      }

      const dept = data.departments.find((d) => d.id === departmentId);
      const cohortDesc = `${dept?.name || 'Department'} Year ${yr} (Total: ${eligible.length} students)`;

      const buffer = generatePerformanceTemplate(
        eligible.map((s) => ({ usn: s.usn, fullName: s.fullName })),
        metric,
        cohortDesc,
        semesterLabel
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="MITM_${dept?.code || 'ISE'}_Year${yr}_${metric}_Template.xlsx"`
      );
      return res.send(Buffer.from(buffer));
    } catch (err: any) {
      console.error('Generate template failed:', err);
      return res.status(500).json({ error: 'Failed to generate performance template.' });
    }
  }
);

apiRouter.post(
  '/section-allocations/parse-excel',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { fileBase64, departmentId, yearOfStudy } = req.body;
      if (!fileBase64 || !departmentId || !yearOfStudy) {
        return res.status(400).json({ error: 'fileBase64, departmentId, and yearOfStudy are required.' });
      }

      const data = db.getData();
      const yr = Number(yearOfStudy);
      const eligible = data.students.filter(
        (s) => s.departmentId === departmentId && s.currentYear === yr && s.status === 'ACTIVE'
      );

      const buffer = Buffer.from(fileBase64, 'base64');
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);

      const validationResult = parsePerformanceExcel(
        arrayBuffer,
        eligible.map((s) => ({ usn: s.usn, id: s.id, fullName: s.fullName }))
      );

      return res.json(validationResult);
    } catch (err: any) {
      console.error('Parse excel failed:', err);
      return res.status(400).json({ error: err.message || 'Failed to parse uploaded Excel file.' });
    }
  }
);

apiRouter.get(
  '/section-allocations/:id/export-excel',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      const run = (data.sectionAllocationRuns || []).find((r) => r.id === id);
      if (!run) {
        return res.status(404).json({ error: 'Allocation run not found.' });
      }

      const dept = data.departments.find((d) => d.id === run.departmentId);
      const buffer = exportSectionAllocationWorkbook(
        run,
        data.institution.institutionName,
        dept?.name || 'Department of Information Science & Engineering'
      );

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="MITM_${dept?.code || 'ISE'}_Year${run.yearOfStudy}_Section_Allocation.xlsx"`
      );
      return res.send(Buffer.from(buffer));
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to export section allocation spreadsheet.' });
    }
  }
);

apiRouter.get(
  '/section-allocations/:id/export-csv',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      const run = (data.sectionAllocationRuns || []).find((r) => r.id === id);
      if (!run) {
        return res.status(404).json({ error: 'Allocation run not found.' });
      }

      const dept = data.departments.find((d) => d.id === run.departmentId);
      const csv = exportSectionAllocationCsv(run);

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="MITM_${dept?.code || 'ISE'}_Year${run.yearOfStudy}_Section_Allocation.csv"`
      );
      return res.send(csv);
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to export section allocation CSV.' });
    }
  }
);

apiRouter.delete(
  '/section-allocations/:id',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const data = db.getData();
      if (!data.sectionAllocationRuns) data.sectionAllocationRuns = [];

      const index = data.sectionAllocationRuns.findIndex((r) => r.id === id);
      if (index === -1) {
        return res.status(404).json({ error: 'Section allocation run not found.' });
      }

      const run = data.sectionAllocationRuns[index];
      data.sectionAllocationRuns.splice(index, 1);
      db.save();

      logAudit(
        { id: req.user!.id, email: req.user!.email, role: req.user!.role },
        'DELETE_SECTION_ALLOCATION',
        'SECTION_ALLOCATION',
        id,
        `Deleted section allocation record ${id} (Year ${run.yearOfStudy}, Sem ${run.semester || 'N/A'}, AY ${run.academicYear}) with ${run.totalStudentsCount} students.`,
        req
      );

      return res.json({
        success: true,
        message: 'Committed section allocation record deleted successfully.',
      });
    } catch (err: any) {
      console.error('Delete section allocation failed:', err);
      return res.status(500).json({ error: 'Failed to delete section allocation record.' });
    }
  }
);

apiRouter.post(
  '/section-allocations/clear-history',
  authMiddleware,
  requireRole(['ADMIN']),
  (req: AuthenticatedRequest, res: Response) => {
    try {
      const { departmentId, yearOfStudy } = req.body;
      const data = db.getData();
      if (!data.sectionAllocationRuns) data.sectionAllocationRuns = [];

      const initialCount = data.sectionAllocationRuns.length;
      data.sectionAllocationRuns = data.sectionAllocationRuns.filter((r) => {
        if (departmentId && r.departmentId !== departmentId) return true;
        if (yearOfStudy !== undefined && yearOfStudy !== null && r.yearOfStudy !== Number(yearOfStudy)) return true;
        return false;
      });

      const clearedCount = initialCount - data.sectionAllocationRuns.length;
      db.save();

      logAudit(
        { id: req.user!.id, email: req.user!.email, role: req.user!.role },
        'CLEAR_SECTION_ALLOCATION_HISTORY',
        'SECTION_ALLOCATION',
        departmentId || 'ALL',
        `Cleared ${clearedCount} section allocation records for department ${departmentId || 'ALL'}${yearOfStudy ? ` (Year ${yearOfStudy})` : ''}.`,
        req
      );

      return res.json({
        success: true,
        clearedCount,
        message: `Successfully cleared ${clearedCount} section allocation records.`,
      });
    } catch (err: any) {
      console.error('Clear section allocation history failed:', err);
      return res.status(500).json({ error: 'Failed to clear section allocation history.' });
    }
  }
);

// ==========================================
// 12. ANALYTICS & DASHBOARD METRICS
// ==========================================

apiRouter.get(
  '/analytics/dashboard',
  authMiddleware,
  (req: AuthenticatedRequest, res: Response) => {
    const data = db.getData();
    const currentUser = req.user!;
    const defaultDeptId = data.institution.defaultDepartmentId || 'dept-ise';
    const deptId =
      (req.query.departmentId as string) ||
      currentUser.departmentId ||
      defaultDeptId;

    // Filter students
    let students = data.students.filter((s) => s.status === 'ACTIVE');
    if (deptId) students = students.filter((s) => s.departmentId === deptId);

    const year1Count = students.filter((s) => s.currentYear === 1).length;
    const year2Count = students.filter((s) => s.currentYear === 2).length;
    const year3Count = students.filter((s) => s.currentYear === 3).length;
    const year4Count = students.filter((s) => s.currentYear === 4).length;
    const graduatedCount = data.students.filter(
      (s) => (deptId ? s.departmentId === deptId : true) && s.status === 'GRADUATED'
    ).length;

    const activeDept =
      data.departments.find((d) => d.id === deptId) ||
      data.departments.find((d) => d.id === defaultDeptId) ||
      data.departments[0];

    // Filter faculty strictly for active department
    const staff = data.staffProfiles.filter((sp) => {
      const u = data.users.find((user) => user.id === sp.userId);
      return (u?.departmentId === deptId || (!u?.departmentId && deptId === defaultDeptId)) && u?.status === 'ACTIVE';
    });

    const teachingFacultyCount = staff.filter((sp) => sp.isTeachingFaculty).length;
    const nonTeachingCount = staff.filter((sp) => !sp.isTeachingFaculty).length;
    const mentorFacultyCount = staff.filter((sp) => sp.isMentorEligible).length;

    // Portfolios
    let portfolios = data.portfolioItems;
    if (deptId) portfolios = portfolios.filter((p) => p.departmentId === deptId);

    const publicationsCount = portfolios.filter((p) => p.category === 'PUBLICATION').length;
    const patentsCount = portfolios.filter((p) => p.category === 'PATENT').length;
    const fdpsCount = portfolios.filter(
      (p) => p.category === 'FDP' || p.category === 'WORKSHOP' || p.category === 'CONFERENCE'
    ).length;
    const awardsCount = portfolios.filter((p) => p.category === 'AWARD').length;

    return res.json({
      students: {
        total: students.length,
        year1: year1Count,
        year2: year2Count,
        year3: year3Count,
        year4: year4Count,
        graduated: graduatedCount,
      },
      department: activeDept,
      staff: {
        teaching: teachingFacultyCount,
        nonTeaching: nonTeachingCount,
        mentorEligible: mentorFacultyCount,
      },
      portfolio: {
        publications: publicationsCount,
        patents: patentsCount,
        fdps: fdpsCount,
        awards: awardsCount,
        total: portfolios.length,
      },
      submissions: {
        pending: 0,
        approved: 0,
        returned: 0,
      },
      departmentsCount: data.departments.filter((d) => d.active).length,
      recentFeedPosts: data.feedPosts.slice(0, 5),
      recentAuditLogs: data.auditLogs.slice(0, 5),
    });
  }
);
