/**
 * Attendance Management & Advanced Reporting Service
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Implements complete multi-role attendance features:
 * - Student: Check in, check out, history, status, daily summary
 * - Mentor: Assigned student attendance, exception review, reports
 * - HOD: Institution-wide overview, department analytics, location analytics, exception reports
 * - Reporting: Daily, monthly, student-level, department, location, compliance, CSV & PDF exports
 */

import {
  AttendanceSession,
  DailyInternshipSummary,
  DepartmentAttendanceAnalytics,
  LocationAttendanceAnalytics,
  AttendanceExceptionRecord,
  AttendanceExportResult,
  ExportFormat,
} from './attendanceTypes';
import {
  AttendanceValidationEngine,
  AttendanceValidationException,
} from './attendanceValidationEngine';
import { AttendanceReportingEngine } from './attendanceReportingEngine';
import { EligibleAssignment } from '../scheduler/schedulerTypes';
import { AuthUser } from '../auth/authUser';
import { AuthorizationPolicy, ForbiddenException } from '../auth/rbac/authorizationPolicy';
import { canonicalizeInstitutionId } from '../../data/initialData';

export interface CheckInRequest {
  studentId: string;
  studentName: string;
  departmentCode: string;
  assignment: EligibleAssignment;
  locationId?: string;
  locationName?: string;
  sessionDate?: string; // YYYY-MM-DD
  checkInTimestamp?: string | Date;
  latitude?: number | null;
  longitude?: number | null;
  distanceMeters?: number | null;
  isOffline?: boolean;
  notes?: string;
}

export interface CheckOutRequest {
  sessionId: string;
  checkOutTimestamp?: string | Date;
  locationId?: string;
  distanceMeters?: number | null;
  notes?: string;
}

export class AttendanceService {
  private sessions: AttendanceSession[] = [];
  private auditLog: Array<{
    id: string;
    action: string;
    sessionId: string;
    actor: string;
    timestamp: string;
    details: string;
  }> = [];

  constructor() {
    this.seedDefaultSessions();
  }

  public reset(): void {
    this.sessions = [];
    this.auditLog = [];
    this.seedDefaultSessions();
  }

  private seedDefaultSessions(): void {
    // Representative historical sessions
    this.sessions.push({
      id: 'att-session-001',
      assignmentId: 'asg-tcs-001',
      studentId: '23CSEBS001',
      studentName: 'Harish V',
      departmentCode: 'CSEBS',
      sessionDate: '2026-03-02',
      checkInAt: '2026-03-02T03:30:00.000Z', // 09:00 IST
      checkOutAt: '2026-03-02T12:30:00.000Z', // 18:00 IST
      scheduledStartTime: '09:00:00',
      scheduledEndTime: '18:00:00',
      totalHours: 9.0,
      requiredHours: 8.0,
      status: 'present',
      isVerified: true,
      locationId: 'loc-tcs-001',
      locationName: 'TCS Siruseri Innovation Hub',
      geofenceStatus: 'verified',
      checkInDistanceMeters: 6.8,
      checkOutDistanceMeters: 12.4,
      complianceRate: 100.0,
      offlineQueued: false,
      createdAt: '2026-03-02T03:30:00.000Z',
      updatedAt: '2026-03-02T12:30:00.000Z',
    });

    this.sessions.push({
      id: 'att-session-002',
      assignmentId: 'asg-tcs-002',
      studentId: '23CSEBS002',
      studentName: 'Karthik R',
      departmentCode: 'CSEBS',
      sessionDate: '2026-03-02',
      checkInAt: '2026-03-02T04:15:00.000Z', // 09:45 IST (Late)
      checkOutAt: '2026-03-02T12:30:00.000Z', // 18:00 IST
      scheduledStartTime: '09:00:00',
      scheduledEndTime: '18:00:00',
      totalHours: 8.25,
      requiredHours: 8.0,
      status: 'late',
      isVerified: false,
      locationId: 'loc-tcs-001',
      locationName: 'TCS Siruseri Innovation Hub',
      geofenceStatus: 'verified',
      checkInDistanceMeters: 18.0,
      complianceRate: 80.0,
      offlineQueued: false,
      exceptionReason: 'Checked in 45 minutes after shift start time.',
      createdAt: '2026-03-02T04:15:00.000Z',
      updatedAt: '2026-03-02T12:30:00.000Z',
    });
  }

  // =========================================================================
  // 1. Student Features: Check-In, Check-Out, History, Status, Summary
  // =========================================================================

  public async checkIn(request: CheckInRequest): Promise<AttendanceSession> {
    const sessionDate = request.sessionDate ?? new Date().toISOString().slice(0, 10);
    const checkInTime = request.checkInTimestamp
      ? new Date(request.checkInTimestamp)
      : new Date();

    // 1. Validate Active Assignment
    AttendanceValidationEngine.validateActiveAssignment(request.assignment, sessionDate);

    // 2. Prevent Duplicate Check-In
    AttendanceValidationEngine.validateNoDuplicateCheckIn(this.sessions, request.studentId, sessionDate);

    // 3. Punctuality check
    const isLate = AttendanceValidationEngine.isLateCheckIn(
      checkInTime,
      request.assignment.monitoringStartTime,
      30
    );

    const nowIso = new Date().toISOString();
    const instId = request.assignment.institutionId || 'inst-smvec-001';
    const newSession: AttendanceSession = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      assignmentId: request.assignment.assignmentId,
      institutionId: instId,
      studentId: request.studentId,
      studentName: request.studentName,
      departmentCode: request.departmentCode,
      sessionDate,
      checkInAt: checkInTime.toISOString(),
      checkOutAt: null,
      scheduledStartTime: request.assignment.monitoringStartTime,
      scheduledEndTime: request.assignment.monitoringEndTime,
      totalHours: 0.0,
      requiredHours: request.assignment.requiredDailyHours ?? 8.0,
      status: isLate ? 'late' : 'present',
      isVerified: false,
      locationId: request.locationId ?? request.assignment.locationId,
      locationName: request.locationName,
      geofenceStatus: request.distanceMeters !== undefined && request.distanceMeters !== null
        ? request.distanceMeters <= 200.0 ? 'verified' : 'out_of_bounds'
        : 'pending',
      checkInDistanceMeters: request.distanceMeters ?? null,
      checkOutDistanceMeters: null,
      complianceRate: 100.0,
      offlineQueued: request.isOffline ?? false,
      clientTimestamp: checkInTime.toISOString(),
      notes: request.notes ?? null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    // Store session and audit log
    this.sessions.push(newSession);
    this.logAudit('CHECK_IN', newSession.id, request.studentId, `Checked in at ${checkInTime.toISOString()}`);

    return newSession;
  }

  public async checkOut(request: CheckOutRequest): Promise<AttendanceSession> {
    const session = this.sessions.find((s) => s.id === request.sessionId);
    const checkOutTime = request.checkOutTimestamp
      ? new Date(request.checkOutTimestamp)
      : new Date();

    // 1. Validate Check-Out
    AttendanceValidationEngine.validateCheckOut(session, checkOutTime);

    // 2. Compute Hours & Classification
    const totalHours = AttendanceValidationEngine.calculateTotalHours(session!.checkInAt!, checkOutTime);
    const isLate = session!.status === 'late';
    const finalStatus = AttendanceValidationEngine.classifyAttendanceStatus(
      totalHours,
      session!.requiredHours,
      isLate
    );

    // 3. Update Session
    session!.checkOutAt = checkOutTime.toISOString();
    session!.totalHours = totalHours;
    session!.status = finalStatus;
    if (request.distanceMeters !== undefined && request.distanceMeters !== null) {
      session!.checkOutDistanceMeters = request.distanceMeters;
    }
    if (request.notes) {
      session!.notes = session!.notes ? `${session!.notes} | ${request.notes}` : request.notes;
    }
    session!.updatedAt = new Date().toISOString();

    this.logAudit(
      'CHECK_OUT',
      session!.id,
      session!.studentId,
      `Checked out at ${checkOutTime.toISOString()} with ${totalHours} hours worked.`
    );

    return session!;
  }

  public getAttendanceHistory(
    studentId: string,
    filter: { startDate?: string; endDate?: string; status?: string } = {}
  ): AttendanceSession[] {
    let list = this.sessions.filter(
      (s) => s.studentId.trim().toLowerCase() === studentId.trim().toLowerCase()
    );

    if (filter.startDate) {
      list = list.filter((s) => s.sessionDate >= filter.startDate!);
    }
    if (filter.endDate) {
      list = list.filter((s) => s.sessionDate <= filter.endDate!);
    }
    if (filter.status) {
      list = list.filter((s) => s.status === filter.status);
    }

    return list.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }

  public getAttendanceStatus(studentId: string, sessionDate: string): string {
    const session = this.sessions.find(
      (s) => s.studentId.trim().toLowerCase() === studentId.trim().toLowerCase() && s.sessionDate === sessionDate
    );

    if (!session || !session.checkInAt) return 'not_checked_in';
    if (session.checkInAt && !session.checkOutAt) return 'checked_in';
    return session.status;
  }

  public getDailyInternshipSummary(
    studentId: string,
    sessionDate: string,
    studentName: string = 'Student',
    locationName: string = 'Assigned Facility'
  ): DailyInternshipSummary {
    const session = this.sessions.find(
      (s) => s.studentId.trim().toLowerCase() === studentId.trim().toLowerCase() && s.sessionDate === sessionDate
    );

    const hasSession = Boolean(session && session.checkInAt);
    const hoursWorked = session?.totalHours ?? 0.0;
    const reqHours = session?.requiredHours ?? 8.0;

    let punctuality: 'on_time' | 'late' | 'not_checked_in' = 'not_checked_in';
    if (session?.checkInAt) {
      punctuality = session.status === 'late' ? 'late' : 'on_time';
    }

    return {
      studentId,
      studentName: session?.studentName ?? studentName,
      date: sessionDate,
      hasActiveSession: hasSession,
      session: session ?? null,
      status: session?.status ?? 'not_checked_in',
      hoursWorked,
      requiredHours: reqHours,
      punctuality,
      locationName: session?.locationName ?? locationName,
      geofenceRadiusMeters: 200.0,
      verificationWindowsCount: 5,
      verifiedPings: session?.isVerified ? 5 : 4,
      missedPings: session?.isVerified ? 0 : 1,
      outOfBoundsPings: 0,
      compliancePercentage: session?.complianceRate ?? 100.0,
    };
  }

  // =========================================================================
  // 2. Mentor Features: Assigned Students, Exceptions, Verification, Reports
  // =========================================================================

  public getAssignedStudentAttendance(
    assignedStudentIds: string[],
    filter: { targetDate?: string; departmentCode?: string } = {}
  ): AttendanceSession[] {
    const ids = new Set(assignedStudentIds.map((id) => id.trim().toLowerCase()));
    let list = this.sessions.filter((s) => ids.has(s.studentId.trim().toLowerCase()));

    if (filter.targetDate) {
      list = list.filter((s) => s.sessionDate === filter.targetDate);
    }
    if (filter.departmentCode && filter.departmentCode !== 'ALL') {
      list = list.filter((s) => s.departmentCode.toUpperCase() === filter.departmentCode!.toUpperCase());
    }

    return list.sort((a, b) => b.sessionDate.localeCompare(a.sessionDate));
  }

  public reviewAttendanceExceptions(
    assignedStudentIds: string[],
    filter: { departmentCode?: string } = {}
  ): AttendanceExceptionRecord[] {
    const ids = new Set(assignedStudentIds.map((id) => id.trim().toLowerCase()));
    const matching = this.sessions.filter((s) => ids.has(s.studentId.trim().toLowerCase()));

    const exceptions: AttendanceExceptionRecord[] = [];

    for (const s of matching) {
      // Condition 1: Out of bounds
      if (s.geofenceStatus === 'out_of_bounds') {
        exceptions.push({
          id: `exc-${s.id}-oob`,
          sessionId: s.id,
          studentId: s.studentId,
          studentName: s.studentName,
          departmentCode: s.departmentCode,
          sessionDate: s.sessionDate,
          status: s.status,
          hoursLogged: s.totalHours,
          requiredHours: s.requiredHours,
          exceptionType: 'OUT_OF_BOUNDS',
          description: `Confirmed location fix outside workplace geofence radius (${s.checkInDistanceMeters ?? 0}m).`,
          isReviewed: s.isVerified,
        });
      }

      // Condition 2: Incomplete hours
      if (s.checkOutAt && s.totalHours < s.requiredHours) {
        exceptions.push({
          id: `exc-${s.id}-hrs`,
          sessionId: s.id,
          studentId: s.studentId,
          studentName: s.studentName,
          departmentCode: s.departmentCode,
          sessionDate: s.sessionDate,
          status: s.status,
          hoursLogged: s.totalHours,
          requiredHours: s.requiredHours,
          exceptionType: 'INCOMPLETE_HOURS',
          description: `Logged ${s.totalHours} hours, below required ${s.requiredHours} daily hours.`,
          isReviewed: s.isVerified,
        });
      }

      // Condition 3: Late check-in
      if (s.status === 'late') {
        exceptions.push({
          id: `exc-${s.id}-late`,
          sessionId: s.id,
          studentId: s.studentId,
          studentName: s.studentName,
          departmentCode: s.departmentCode,
          sessionDate: s.sessionDate,
          status: s.status,
          hoursLogged: s.totalHours,
          requiredHours: s.requiredHours,
          exceptionType: 'LATE_CHECKIN',
          description: `Checked in after scheduled monitoring shift start.`,
          isReviewed: s.isVerified,
        });
      }
    }

    return exceptions;
  }

  public verifyAttendanceSession(
    sessionId: string,
    isVerified: boolean,
    remarks?: string,
    mentorUser?: AuthUser
  ): AttendanceSession {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session) {
      throw new Error(`Attendance session '${sessionId}' was not found.`);
    }

    if (mentorUser) {
      AuthorizationPolicy.validateIdentity(mentorUser);
      if (mentorUser.role !== 'platform_super_admin') {
        const callerInst = canonicalizeInstitutionId(mentorUser.institutionId || mentorUser.college);
        const sessionInst = canonicalizeInstitutionId(session.institutionId);
        if (sessionInst && callerInst && sessionInst !== callerInst) {
          throw new ForbiddenException(`Tenant Isolation Violation: Mentor cannot verify attendance belonging to another institution.`);
        }
      }
    }

    session.isVerified = isVerified;
    if (remarks) {
      session.notes = session.notes ? `${session.notes} | ${remarks}` : remarks;
    }
    if (mentorUser) {
      session.mentorReviewedAt = new Date().toISOString();
      session.mentorReviewedBy = mentorUser.id;
    }
    session.updatedAt = new Date().toISOString();

    this.logAudit(
      'MENTOR_VERIFY',
      session.id,
      mentorUser?.id ?? 'mentor',
      `Session marked isVerified=${isVerified}. Remarks: ${remarks ?? 'None'}`
    );

    return session;
  }

  // =========================================================================
  // 3. HOD Features: Institution Overview, Dept Analytics, Location Analytics
  // =========================================================================

  public getInstitutionWideAttendanceOverview(departmentCode?: string, caller?: AuthUser): {
    totalActiveInterns: number;
    presentToday: number;
    absentToday: number;
    lateToday: number;
    flaggedToday: number;
    attendanceRate: number;
    totalLocationsMonitored: number;
  } {
    let list = this.sessions;
    if (caller && caller.role !== 'platform_super_admin') {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      list = list.filter((s) => !s.institutionId || canonicalizeInstitutionId(s.institutionId) === callerInst);
    }
    if (departmentCode && departmentCode !== 'ALL') {
      list = list.filter((s) => s.departmentCode.toUpperCase() === departmentCode.toUpperCase());
    }

    const uniqueStudents = new Set(list.map((s) => s.studentId)).size;
    const uniqueLocations = new Set(list.map((s) => s.locationId).filter(Boolean)).size;

    const present = list.filter((s) => s.status === 'present').length;
    const late = list.filter((s) => s.status === 'late').length;
    const absent = list.filter((s) => s.status === 'absent').length;
    const flagged = list.filter((s) => s.status === 'flagged' || s.geofenceStatus === 'out_of_bounds').length;

    const total = list.length;
    const rate = total > 0 ? Math.round(((present + late) / total) * 1000) / 10 : 0;

    return {
      totalActiveInterns: uniqueStudents,
      presentToday: present,
      absentToday: absent,
      lateToday: late,
      flaggedToday: flagged,
      attendanceRate: rate,
      totalLocationsMonitored: uniqueLocations,
    };
  }

  public getDepartmentLevelAttendanceAnalytics(
    departmentCode: string,
    period: string
  ): DepartmentAttendanceAnalytics {
    return AttendanceReportingEngine.generateDepartmentMonthlyAnalytics(
      this.sessions,
      departmentCode,
      period
    );
  }

  public getInternshipLocationAnalytics(
    locationId: string,
    companyName: string,
    locationName: string
  ): LocationAttendanceAnalytics {
    return AttendanceReportingEngine.generateLocationAnalytics(
      this.sessions,
      locationId,
      companyName,
      locationName
    );
  }

  // =========================================================================
  // 4. Reporting & Export Engine (CSV and PDF)
  // =========================================================================

  public exportDailyAttendance(
    targetDate: string,
    departmentCode: string = 'ALL',
    format: ExportFormat = 'csv',
    caller?: AuthUser
  ): AttendanceExportResult {
    let scopedSessions = this.sessions;
    let instCode = 'SMVEC';
    if (caller) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role !== 'platform_super_admin') {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        scopedSessions = scopedSessions.filter(s => !s.institutionId || canonicalizeInstitutionId(s.institutionId) === callerInst);
        instCode = caller.institutionCode || (callerInst.includes('smvec') ? 'SMVEC' : callerInst);
      }
    }
    const report = AttendanceReportingEngine.generateDailyReport(scopedSessions, targetDate, departmentCode);

    const headers = [
      'Student ID',
      'Student Name',
      'Department',
      'Session Date',
      'Check In',
      'Check Out',
      'Hours Worked',
      'Required Hours',
      'Status',
      'Geofence',
      'Verified',
    ];

    const rows = report.records.map((r) => [
      r.studentId,
      r.studentName,
      r.departmentCode,
      r.sessionDate,
      r.checkInAt ? r.checkInAt.slice(11, 16) : '--:--',
      r.checkOutAt ? r.checkOutAt.slice(11, 16) : '--:--',
      r.totalHours,
      r.requiredHours,
      r.status.toUpperCase(),
      (r.geofenceStatus ?? 'PENDING').toUpperCase(),
      r.isVerified ? 'YES' : 'NO',
    ]);

    const title = `${instCode} Daily Attendance Report - ${targetDate}`;

    if (format === 'csv') {
      return AttendanceReportingEngine.exportToCsv(title, headers, rows);
    } else {
      return AttendanceReportingEngine.exportToPdf(
        title,
        `Department: ${departmentCode} | Attendance Rate: ${report.attendanceRate}%`,
        {
          Date: targetDate,
          Department: departmentCode,
          TotalExpected: String(report.totalExpected),
          Present: String(report.presentCount),
          Late: String(report.lateCount),
          AttendanceRate: `${report.attendanceRate}%`,
        },
        headers,
        rows
      );
    }
  }

  public exportMonthlyAttendance(
    yearMonth: string,
    departmentCode: string = 'ALL',
    format: ExportFormat = 'csv',
    caller?: AuthUser
  ): AttendanceExportResult {
    let scopedSessions = this.sessions;
    let instCode = 'SMVEC';
    if (caller) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role !== 'platform_super_admin') {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        scopedSessions = scopedSessions.filter(s => !s.institutionId || canonicalizeInstitutionId(s.institutionId) === callerInst);
        instCode = caller.institutionCode || (callerInst.includes('smvec') ? 'SMVEC' : callerInst);
      }
    }
    const analytics = AttendanceReportingEngine.generateDepartmentMonthlyAnalytics(
      scopedSessions,
      departmentCode,
      yearMonth
    );

    const headers = [
      'Department',
      'Period',
      'Active Interns',
      'Present Count',
      'Late Count',
      'Half-Day Count',
      'Absent Count',
      'Avg Daily Hours',
      'Attendance Rate',
      'Geofence Compliance',
    ];

    const rows = [
      [
        analytics.departmentCode,
        analytics.period,
        analytics.totalInterns,
        analytics.presentCount,
        analytics.lateCount,
        analytics.halfDayCount,
        analytics.absentCount,
        analytics.averageDailyHours,
        `${analytics.averageAttendanceRate}%`,
        `${analytics.complianceRate}%`,
      ],
    ];

    const title = `${instCode} Monthly Attendance Summary - ${yearMonth}`;

    if (format === 'csv') {
      return AttendanceReportingEngine.exportToCsv(title, headers, rows);
    } else {
      return AttendanceReportingEngine.exportToPdf(
        title,
        `Monthly Accreditation Review - ${departmentCode}`,
        {
          Department: departmentCode,
          Period: yearMonth,
          TotalInterns: String(analytics.totalInterns),
          AverageAttendanceRate: `${analytics.averageAttendanceRate}%`,
          GeofenceComplianceRate: `${analytics.complianceRate}%`,
        },
        headers,
        rows
      );
    }
  }

  // =========================================================================
  // 5. Audit Trail & Non-Silent Overwrites
  // =========================================================================

  private logAudit(action: string, sessionId: string, actor: string, details: string): void {
    this.auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      action,
      sessionId,
      actor,
      timestamp: new Date().toISOString(),
      details,
    });
  }

  public getAuditLogs(sessionId?: string): Array<{
    id: string;
    action: string;
    sessionId: string;
    actor: string;
    timestamp: string;
    details: string;
  }> {
    if (sessionId) {
      return this.auditLog.filter((a) => a.sessionId === sessionId);
    }
    return [...this.auditLog];
  }
}

export const attendanceService = new AttendanceService();

