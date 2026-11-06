import { 
  StudentRecord, 
  MentorRecord, 
  HodRecord,
  DepartmentRecord,
  AttendanceSessionRecord,
  InternshipAssignmentRecord,
  InternshipBatchRecord,
  StudentTransferRecord,
  InternshipProviderRecord,
  InstitutionRecord,
  DEFAULT_STUDENTS,
  DEFAULT_MENTORS,
  DEFAULT_HODS,
  DEFAULT_DEPARTMENTS,
  DEFAULT_ATTENDANCE_SESSIONS,
  DEFAULT_ASSIGNMENTS,
  DEFAULT_INTERNSHIP_BATCHES,
  DEFAULT_INSTITUTIONS,
  canonicalizeInstitutionId
} from '../../data/initialData';
import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  DbStudent, 
  DbMentor, 
  DbHod 
} from '../../lib/supabase';
import { AuthUser } from '../auth/authUser';
import { 
  AuthorizationPolicy, 
  UnauthorizedException, 
  ForbiddenException 
} from '../auth/rbac/authorizationPolicy';
import { locationRepository } from './locationRepository';
import { LicensingEngine } from '../commercial/licensingEngine';

export interface IInternshipRepository {
  // Status
  isConfigured(): boolean;
  getSyncStatus(): { isSyncing: boolean; lastSyncTime: Date | null; error: string | null };

  // Scoped student access
  getStudentById(studentId: string, caller?: AuthUser): StudentRecord | null;
  getStudentsForStudent(studentId: string, caller?: AuthUser): StudentRecord[];
  getStudentsForMentor(mentorIdOrName: string, caller?: AuthUser): StudentRecord[];
  getStudentsForMentorScope(mentorId: string, mentorDept: string, caller?: AuthUser): StudentRecord[];
  getStudentsForHod(departmentCode: string, caller?: AuthUser): StudentRecord[];
  getAllStudentsForAdmin(caller?: AuthUser): StudentRecord[];

  // Mentor Student Management (Phase 4)
  onboardStudent(student: Omit<StudentRecord, 'id'>, caller?: AuthUser): Promise<StudentRecord>;
  bulkImportStudents(csvStudents: Array<Omit<StudentRecord, 'id'>>, caller?: AuthUser): Promise<{ imported: StudentRecord[]; count: number }>;
  setStudentAccountStatus(studentId: string, accountStatus: 'active' | 'inactive' | 'suspended' | 'pending_approval', caller?: AuthUser): Promise<StudentRecord>;
  assignInternship(assignment: { 
    studentId: string; 
    company: string; 
    role: string; 
    locationId?: string; 
    startDate: string; 
    endDate: string; 
    mentorId?: string; 
    mentorName?: string; 
    dailyHours?: number 
  }, caller?: AuthUser): Promise<StudentRecord>;

  // Complete Internship Assignment Workflow (Phase 5)
  createInternshipAssignment(params: {
    studentId: string;
    locationId: string;
    roleTitle?: string;
    startDate: string;
    endDate: string;
    monitoringSchedule?: {
      startTime: string;
      endTime: string;
      requiredDailyHours: number;
    };
    mentorId?: string;
    mentorName?: string;
    notes?: string;
    batchId?: string;
    batchName?: string;
  }, caller: AuthUser): Promise<InternshipAssignmentRecord>;

  getActiveAssignmentForStudent(studentId: string, caller?: AuthUser): InternshipAssignmentRecord | null;
  getAssignmentHistoryForStudent(studentId: string, caller?: AuthUser): InternshipAssignmentRecord[];
  getAllActiveAssignments(caller?: AuthUser): InternshipAssignmentRecord[];
  completeOrTerminateAssignment(assignmentId: string, status: 'completed' | 'terminated', caller: AuthUser): Promise<InternshipAssignmentRecord>;

  // Attendance Overview & Verification
  getAttendanceSessionsForScope(mentorId: string, mentorDept: string, caller?: AuthUser): AttendanceSessionRecord[];
  getAllAttendanceSessions(caller?: AuthUser): AttendanceSessionRecord[];
  verifyAttendanceSession(sessionId: string, isVerified: boolean, remarks?: string, caller?: AuthUser): Promise<void>;

  // Scoped mentor access
  getMentorById(mentorId: string): MentorRecord | null;
  getMentorsForHod(departmentCode: string, caller?: AuthUser): MentorRecord[];
  getAllMentorsForAdmin(caller?: AuthUser): MentorRecord[];

  // HOD access
  getAllHods(): HodRecord[];
  getHodByDepartment(departmentCode: string): HodRecord | null;

  // Multi-Institution Management (Phase 18B)
  getInstitutionById(id: string): InstitutionRecord | null;
  getInstitutionByCode(code: string): InstitutionRecord | null;
  getInstitutionByDomain(domain: string): InstitutionRecord | null;
  getAllInstitutions(caller?: AuthUser): InstitutionRecord[];
  saveInstitution(institution: InstitutionRecord, caller: AuthUser): Promise<void>;

  // Department Governance & Management (Phase 17B & 17C)
  getAllDepartments(caller?: AuthUser): DepartmentRecord[];
  getDepartmentByCode(code: string, caller?: AuthUser): DepartmentRecord | null;
  createDepartment(dept: { 
    code: string; 
    name: string; 
    institutionId?: string; 
    hodId?: string; 
    hodName?: string; 
    maxStudentCapacity?: number;
    contactEmail?: string;
    contactPhone?: string;
    academicHeadName?: string;
    description?: string;
    defaultMonitoringStartTime?: string;
    defaultMonitoringEndTime?: string;
  }, caller: AuthUser): Promise<DepartmentRecord>;
  deactivateDepartment(departmentCode: string, caller: AuthUser): Promise<DepartmentRecord>;
  reactivateDepartment(departmentCode: string, caller: AuthUser): Promise<DepartmentRecord>;
  assignDepartmentHod(departmentCode: string, hodId: string, hodName: string, caller: AuthUser): Promise<DepartmentRecord>;
  updateDepartmentConfig(
    departmentCode: string, 
    config: {
      maxStudentCapacity?: number;
      contactEmail?: string;
      contactPhone?: string;
      academicHeadName?: string;
      description?: string;
      defaultMonitoringStartTime?: string;
      defaultMonitoringEndTime?: string;
    }, 
    caller: AuthUser
  ): Promise<DepartmentRecord>;

  getInstitutionStatistics(caller: AuthUser): {
    totalDepartments: number;
    activeDepartments: number;
    totalStudents: number;
    totalMentors: number;
    activeAssignments: number;
    departmentBreakdown: Array<{ code: string; name: string; studentCount: number; mentorCount: number; status: string }>;
  };
  getDepartmentAttendanceSummary(departmentCode: string, caller?: AuthUser): {
    departmentCode: string;
    totalStudents: number;
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    verifiedCount: number;
    attendanceRate: number;
  };

  // Internship Batches (Phase 17C)
  createInternshipBatch(
    batchData: {
      departmentCode: string;
      batchName: string;
      academicYear: string;
      termCode: 'ODD' | 'EVEN' | 'SUMMER';
      semester: number;
      startDate: string;
      endDate: string;
      maxCapacity?: number;
    },
    caller: AuthUser
  ): Promise<InternshipBatchRecord>;
  getInternshipBatches(departmentCode?: string, caller?: AuthUser): InternshipBatchRecord[];
  getInternshipBatchById(batchId: string, caller?: AuthUser): InternshipBatchRecord | null;
  updateInternshipBatch(batchId: string, updates: Partial<InternshipBatchRecord>, caller: AuthUser): Promise<InternshipBatchRecord>;
  assignStudentToBatch(studentId: string, batchId: string, caller: AuthUser): Promise<StudentRecord>;

  // Student Transfers (Phase 17C)
  transferStudentDepartment(studentId: string, targetDepartmentCode: string, reason: string, caller: AuthUser): Promise<StudentRecord>;
  getStudentTransferHistory(studentId?: string, caller?: AuthUser): StudentTransferRecord[];

  // Providers & Multi-Department Dashboard Analytics (Phase 17C)
  getInternshipProviders(departmentCode?: string, caller?: AuthUser): InternshipProviderRecord[];
  getMultiDepartmentInternshipStats(caller?: AuthUser): Array<{
    code: string;
    name: string;
    status: string;
    isPilotAuthorized: boolean;
    totalStudents: number;
    activeInternships: number;
    completedInternships: number;
    atRiskInternships: number;
    unassignedStudents: number;
    activeMentors: number;
    approvedLocations: number;
    activeBatches: number;
    attendanceRate: number;
    verificationRate: number;
  }>;
  getDepartmentDetailedAnalytics(departmentCode: string, caller?: AuthUser): {
    departmentCode: string;
    departmentName: string;
    status: string;
    totalStudents: number;
    activeInternships: number;
    completedInternships: number;
    atRiskInternships: number;
    unassignedStudents: number;
    activeBatches: number;
    batches: InternshipBatchRecord[];
    locationsCount: number;
    attendanceRate: number;
    verificationRate: number;
  };

  // Real-time synchronization
  subscribe(listener: () => void): () => void;
  syncWithSupabase(): Promise<void>;

  // Scoped mutations & real-time log submissions
  submitStudentDailyLog(
    studentId: string, 
    log: { 
      work: string; 
      hours: number; 
      status: StudentRecord['status']; 
      blocker?: string;
    },
    caller?: AuthUser
  ): Promise<StudentRecord>;
  
  saveStudent(student: StudentRecord, caller?: AuthUser): Promise<void>;
  saveStudentsBatch(students: StudentRecord[], caller?: AuthUser): Promise<void>;
  updateStudentMentor(studentId: string, newMentorId: string, newMentorName: string, caller?: AuthUser): Promise<void>;
  replaceDataset(newStudents: StudentRecord[]): void;
  clearAllDataset(): void;
  getAllStudents(): StudentRecord[];
}

const STORAGE_KEY = 'internpulse_students_store_v3';
const MENTORS_STORAGE_KEY = 'internpulse_mentors_store_v3';
const HODS_STORAGE_KEY = 'internpulse_hods_store_v3';
const DEPARTMENTS_STORAGE_KEY = 'internpulse_departments_store_v1';
const ATTENDANCE_STORAGE_KEY = 'internpulse_attendance_store_v1';
const ASSIGNMENTS_STORAGE_KEY = 'internpulse_assignments_store_v1';
const BATCHES_STORAGE_KEY = 'internpulse_batches_store_v1';
const TRANSFERS_STORAGE_KEY = 'internpulse_transfers_store_v1';
const INSTITUTIONS_STORAGE_KEY = 'internpulse_institutions_store_v1';

class SupabaseIntegratedRepository implements IInternshipRepository {
  private institutions: InstitutionRecord[] = [...DEFAULT_INSTITUTIONS];
  private students: StudentRecord[] = [];
  private mentors: MentorRecord[] = [];
  private hods: HodRecord[] = [];
  private departments: DepartmentRecord[] = [];
  private attendanceSessions: AttendanceSessionRecord[] = [];
  private assignments: InternshipAssignmentRecord[] = [];
  private batches: InternshipBatchRecord[] = [];
  private transferHistory: StudentTransferRecord[] = [];
  private listeners: Set<() => void> = new Set();
  private isSyncing = false;
  private lastSyncTime: Date | null = null;
  private syncError: string | null = null;

  constructor() {
    // Clear legacy mock cached keys if any
    try {
      if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
        localStorage.removeItem('internpulse_dataset');
        localStorage.removeItem('internpulse_students_store_v2');
        localStorage.removeItem('internpulse_mentors_store_v2');
        localStorage.removeItem('internpulse_hods_store_v2');
      }
    } catch {
      // ignore
    }

    this.loadFromStorage();
    if (isSupabaseConfigured) {
      this.syncWithSupabase();
      this.initRealtimeSubscription();
    }
  }

  public isConfigured(): boolean {
    return isSupabaseConfigured;
  }

  public getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      lastSyncTime: this.lastSyncTime,
      error: this.syncError,
    };
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in repository listener:', err);
      }
    });
  }

  private loadFromStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
        this.institutions = [...DEFAULT_INSTITUTIONS];
        this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
        this.mentors = [...DEFAULT_MENTORS];
        this.hods = [...DEFAULT_HODS];
        this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
        this.assignments = [...DEFAULT_ASSIGNMENTS];
        return;
      }
      const savedInstitutions = localStorage.getItem(INSTITUTIONS_STORAGE_KEY);
      if (savedInstitutions) {
        const parsed = JSON.parse(savedInstitutions);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.institutions = parsed;
        } else {
          this.institutions = [...DEFAULT_INSTITUTIONS];
        }
      } else {
        this.institutions = [...DEFAULT_INSTITUTIONS];
      }

      const savedStudents = localStorage.getItem(STORAGE_KEY);
      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.students = this.normalizeStudentRecords(parsed);
        } else {
          this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
        }
      } else {
        this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
      }

      const savedMentors = localStorage.getItem(MENTORS_STORAGE_KEY);
      if (savedMentors) {
        const parsed = JSON.parse(savedMentors);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.mentors = parsed;
        } else {
          this.mentors = [...DEFAULT_MENTORS];
        }
      } else {
        this.mentors = [...DEFAULT_MENTORS];
      }

      const savedHods = localStorage.getItem(HODS_STORAGE_KEY);
      if (savedHods) {
        const parsed = JSON.parse(savedHods);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.hods = parsed;
        } else {
          this.hods = [...DEFAULT_HODS];
        }
      } else {
        this.hods = [...DEFAULT_HODS];
      }

      const savedDepartments = localStorage.getItem(DEPARTMENTS_STORAGE_KEY);
      if (savedDepartments) {
        const parsed = JSON.parse(savedDepartments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.departments = parsed;
        } else {
          this.departments = [...DEFAULT_DEPARTMENTS];
        }
      } else {
        this.departments = [...DEFAULT_DEPARTMENTS];
      }

      const savedAttendance = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      if (savedAttendance) {
        const parsed = JSON.parse(savedAttendance);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.attendanceSessions = parsed;
        } else {
          this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
        }
      } else {
        this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
      }

      const savedAssignments = localStorage.getItem(ASSIGNMENTS_STORAGE_KEY);
      if (savedAssignments) {
        const parsed = JSON.parse(savedAssignments);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.assignments = parsed;
        } else {
          this.assignments = [...DEFAULT_ASSIGNMENTS];
        }
      } else {
        this.assignments = [...DEFAULT_ASSIGNMENTS];
      }

      const savedBatches = localStorage.getItem(BATCHES_STORAGE_KEY);
      if (savedBatches) {
        const parsed = JSON.parse(savedBatches);
        if (Array.isArray(parsed) && parsed.length > 0) {
          this.batches = parsed;
        } else {
          this.batches = [...DEFAULT_INTERNSHIP_BATCHES];
        }
      } else {
        this.batches = [...DEFAULT_INTERNSHIP_BATCHES];
      }

      const savedTransfers = localStorage.getItem(TRANSFERS_STORAGE_KEY);
      if (savedTransfers) {
        const parsed = JSON.parse(savedTransfers);
        if (Array.isArray(parsed)) {
          this.transferHistory = parsed;
        } else {
          this.transferHistory = [];
        }
      } else {
        this.transferHistory = [];
      }
    } catch (e) {
      console.error('Error loading data from localStorage:', e);
      this.institutions = [...DEFAULT_INSTITUTIONS];
      this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
      this.mentors = [...DEFAULT_MENTORS];
      this.hods = [...DEFAULT_HODS];
      this.departments = [...DEFAULT_DEPARTMENTS];
      this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
      this.assignments = [...DEFAULT_ASSIGNMENTS];
      this.batches = [...DEFAULT_INTERNSHIP_BATCHES];
      this.transferHistory = [];
    }
  }

  private normalizeStudentRecords(records: any[]): StudentRecord[] {
    return records.map((s, index) => {
      const deptCode = (s.department_code || s.departmentCode || s.dept || 'CSEBS').toUpperCase();
      const mentorName = s.mentor_name || s.mentor || 'Faculty Mentor';
      const mentorId = s.mentor_id || s.mentorId || 'MENTOR_001';
      const instId = canonicalizeInstitutionId(s.institution_id || s.institutionId);
      const instCode = s.institution_code || s.institutionCode || 'SMVEC';

      return {
        id: s.id || s.student_id || s.studentId || `ST_${index + 1}`,
        studentId: s.student_id || s.studentId || s.id || `STUDENT_${index + 1}`,
        studentName: s.student_name || s.studentName || s.name || 'Student Intern',
        institutionId: instId,
        institutionCode: instCode,
        email: s.email || `${(s.student_id || s.studentId || 'student').toLowerCase()}@college.edu`,
        phone: s.phone || '+91 98401 00000',
        academicYear: s.academic_year || s.academicYear || s.year || '3rd Year',
        year: s.year || s.academic_year || s.academicYear || '3rd Year',
        departmentCode: deptCode,
        dept: deptCode,
        company: s.company || 'Not Assigned',
        mentorId: mentorId,
        mentor: mentorName,
        mentorEmail: s.mentorEmail || `${mentorId.toLowerCase()}@college.edu`,
        role: s.role || 'Intern',
        status: s.status || 'onTrack',
        accountStatus: s.account_status || s.accountStatus || 'active',
        progress: typeof s.progress === 'number' ? s.progress : 0,
        hours: typeof s.hours === 'number' ? s.hours : 0,
        work: s.work || 'No logs submitted yet.',
        blocker: s.blocker || undefined,
        time: s.last_log_at ? new Date(s.last_log_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (s.time || 'Recent'),
        internshipLocationId: s.internship_location_id || s.internshipLocationId || undefined,
        internshipStartDate: s.internship_start_date || s.internshipStartDate || undefined,
        internshipEndDate: s.internship_end_date || s.internshipEndDate || undefined,
        batchId: s.batch_id || s.batchId || undefined,
        batchName: s.batch_name || s.batchName || undefined,
      };
    });
  }

  private persistToStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      localStorage.setItem(INSTITUTIONS_STORAGE_KEY, JSON.stringify(this.institutions));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.students));
      localStorage.setItem(MENTORS_STORAGE_KEY, JSON.stringify(this.mentors));
      localStorage.setItem(HODS_STORAGE_KEY, JSON.stringify(this.hods));
      localStorage.setItem(DEPARTMENTS_STORAGE_KEY, JSON.stringify(this.departments));
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(this.attendanceSessions));
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(this.assignments));
      localStorage.setItem(BATCHES_STORAGE_KEY, JSON.stringify(this.batches));
      localStorage.setItem(TRANSFERS_STORAGE_KEY, JSON.stringify(this.transferHistory));
    } catch (e) {
      console.error('Error persisting data to localStorage:', e);
    }
  }

  // ====================================================
  // SUPABASE REALTIME & SYNC ENGINE
  // ====================================================
  public async syncWithSupabase(): Promise<void> {
    const client = getSupabaseClient();
    if (!client) return;

    this.isSyncing = true;
    this.syncError = null;
    try {
      // 1. Fetch Students from Supabase
      const { data: dbStudents, error: sErr } = await client
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (sErr) {
        console.warn('Supabase students query note:', sErr.message);
      } else if (Array.isArray(dbStudents)) {
        this.students = this.normalizeStudentRecords(dbStudents);
      }

      // 2. Fetch Mentors from Supabase
      const { data: dbMentors, error: mErr } = await client
        .from('mentors')
        .select('*');

      if (mErr) {
        console.warn('Supabase mentors query note:', mErr.message);
      } else if (Array.isArray(dbMentors)) {
        this.mentors = dbMentors.map((m: DbMentor) => ({
          id: m.mentor_id || m.id || 'MENTOR_001',
          name: m.name,
          email: m.email,
          departmentCode: (m.department_code || 'CSEBS').toUpperCase(),
          departmentCodes: [(m.department_code || 'CSEBS').toUpperCase()],
          assignedStudentsCount: 0,
          capacity: m.capacity || 10,
          designation: m.designation || 'Assistant Professor',
          studentIds: [],
        }));
      }

      // 3. Fetch HODs from Supabase
      const { data: dbHods, error: hErr } = await client
        .from('hods')
        .select('*');

      if (hErr) {
        console.warn('Supabase hods query note:', hErr.message);
      } else if (Array.isArray(dbHods)) {
        this.hods = dbHods.map((h: DbHod) => ({
          id: h.hod_id || h.id || 'HOD_001',
          hodId: h.hod_id || 'HOD_001',
          name: h.name,
          email: h.email,
          departmentCode: (h.department_code || 'CSEBS').toUpperCase(),
          phone: h.phone,
          officeLocation: h.office_location,
        }));
      }

      this.lastSyncTime = new Date();
      this.persistToStorage();
      this.notifyListeners();
    } catch (err: any) {
      this.syncError = err?.message || 'Failed to sync with Supabase';
      console.warn('Supabase sync warning:', err);
    } finally {
      this.isSyncing = false;
      this.notifyListeners();
    }
  }

  private initRealtimeSubscription(): void {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      client
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'students' },
          () => {
            this.syncWithSupabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'mentors' },
          () => {
            this.syncWithSupabase();
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'hods' },
          () => {
            this.syncWithSupabase();
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription skipped:', err);
    }
  }

  // ====================================================
  // 1. STUDENT SCOPED DATA ACCESS (OWN DATA ONLY)
  // ====================================================
  public getStudentById(studentId: string, caller?: AuthUser): StudentRecord | null {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
    }
    if (!studentId) return null;
    const query = studentId.trim().toLowerCase();
    const student = this.students.find(s => s.studentId.toLowerCase() === query || s.id.toLowerCase() === query || (s.email && s.email.toLowerCase() === query)) || null;
    if (caller && student) {
      AuthorizationPolicy.validateStudentResourceAccess(caller, studentId, student);
    }
    return student;
  }

  public getStudentsForStudent(studentId: string, caller?: AuthUser): StudentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateStudentResourceAccess(caller, studentId);
    }
    const student = this.getStudentById(studentId);
    return student ? [student] : [];
  }

  // ====================================================
  // 2. MENTOR SCOPED DATA ACCESS (ONLY ASSIGNED STUDENTS)
  // ====================================================
  public getStudentsForMentor(mentorIdOrName: string, caller?: AuthUser): StudentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot query mentor cohort lists.');
      }
      if (caller.role === 'mentor') {
        const callerId = (caller.mentorId || caller.id).trim().toLowerCase();
        const query = mentorIdOrName.trim().toLowerCase();
        if (query !== callerId && query !== caller.name.trim().toLowerCase()) {
          throw new ForbiddenException('Access denied. Mentor cannot access an unrelated mentor\'s assigned students.');
        }
      }
    }
    if (!mentorIdOrName) return [];
    const query = mentorIdOrName.trim().toLowerCase();
    return this.students.filter(s => 
      s.mentorId?.toLowerCase() === query || 
      s.mentor.toLowerCase() === query
    );
  }

  // ====================================================
  // 2B. MENTOR SCOPE DATA ACCESS (ASSIGNED OR DEPARTMENT)
  // ====================================================
  public getStudentsForMentorScope(
    mentorId: string, 
    mentorDept: string, 
    caller?: AuthUser
  ): StudentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot query mentor student rosters.');
      }
      if (caller.role === 'mentor') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        const targetDept = (mentorDept || '').trim().toUpperCase();
        if (callerDept && targetDept && callerDept !== targetDept && targetDept !== 'ALL') {
          throw new ForbiddenException(
            `Access denied. Mentor of department '${callerDept}' cannot access department '${targetDept}'.`
          );
        }
      }
    }

    const normDept = (mentorDept || '').trim().toUpperCase();
    const normMentorId = (mentorId || '').trim().toLowerCase();

    return this.students.filter(s => {
      const sDept = (s.departmentCode || s.dept || '').trim().toUpperCase();
      const sMentorId = (s.mentorId || '').trim().toLowerCase();
      const sMentorName = (s.mentor || '').trim().toLowerCase();

      // Multi-tenant boundary check: Non-platform callers cannot access students from other institutions
      if (caller && caller.role !== 'platform_super_admin') {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        if (s.institutionId && canonicalizeInstitutionId(s.institutionId) !== callerInst) {
          return false;
        }
      }

      // Assigned directly
      if (normMentorId && (sMentorId === normMentorId || (caller && sMentorName === caller.name.trim().toLowerCase()))) {
        return true;
      }

      // Department scope
      if (normDept && normDept !== 'ALL' && sDept === normDept) {
        return true;
      }

      // If caller is HOD / Admin / Super Admin and asked for ALL or specific dept
      if (caller && (caller.role === 'hod' || caller.role === 'admin' || caller.role === 'super_admin')) {
        if (caller.role === 'hod') {
          const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
          if (callerDept && sDept === callerDept) {
            return true;
          }
        } else {
          if (!normDept || normDept === 'ALL' || sDept === normDept) {
            return true;
          }
        }
      }

      return false;
    });
  }

  // ====================================================
  // 3. HOD SCOPED DATA ACCESS (DEPARTMENT-SEPARATED)
  // ====================================================
  public getStudentsForHod(departmentCode: string, caller?: AuthUser): StudentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller, departmentCode);
      const deptRecord = this.departments.find(d => d.code.toUpperCase() === departmentCode.trim().toUpperCase());
      if (deptRecord) {
        AuthorizationPolicy.validateDepartmentActive(deptRecord, caller);
      }
    }
    if (!departmentCode) return [];
    const dept = departmentCode.trim().toUpperCase();
    let list = this.students.filter(s => 
      s.departmentCode.toUpperCase() === dept || 
      s.dept.toUpperCase() === dept
    );
    if (caller && caller.role !== 'platform_super_admin') {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      list = list.filter(s => !s.institutionId || canonicalizeInstitutionId(s.institutionId) === callerInst);
    }
    return list;
  }

  public getMentorsForHod(departmentCode: string, caller?: AuthUser): MentorRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller, departmentCode);
      const deptRecord = this.departments.find(d => d.code.toUpperCase() === departmentCode.trim().toUpperCase());
      if (deptRecord) {
        AuthorizationPolicy.validateDepartmentActive(deptRecord, caller);
      }
    }
    const dept = (departmentCode || 'CSEBS').trim().toUpperCase();
    
    // Filter mentors belonging to this department
    let deptMentors = this.mentors.filter(m => 
      m.departmentCode.toUpperCase() === dept || 
      (m.departmentCodes && m.departmentCodes.some(d => d.toUpperCase() === dept))
    );
    if (caller && caller.role !== 'platform_super_admin') {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      deptMentors = deptMentors.filter(m => !m.institutionId || canonicalizeInstitutionId(m.institutionId) === callerInst);
    }

    // Calculate live analytics based on Supabase students
    return deptMentors.map(mentor => {
      const mentorStudents = this.students.filter(s => 
        (s.mentorId.toLowerCase() === mentor.id.toLowerCase() || s.mentor.toLowerCase() === mentor.name.toLowerCase()) &&
        (s.departmentCode.toUpperCase() === dept || s.dept.toUpperCase() === dept)
      );

      const totalProgress = mentorStudents.reduce((sum, st) => sum + st.progress, 0);
      const avgProgress = mentorStudents.length > 0 ? Math.round(totalProgress / mentorStudents.length) : 0;
      const atRiskCount = mentorStudents.filter(st => st.status === 'blocked' || st.status === 'inactive').length;

      return {
        ...mentor,
        assignedStudentsCount: mentorStudents.length,
        studentIds: mentorStudents.map(st => st.studentId),
        averageProgress: avgProgress,
        atRiskCount: atRiskCount,
      };
    });
  }

  public getMentorById(mentorId: string): MentorRecord | null {
    if (!mentorId) return null;
    const q = mentorId.trim().toLowerCase();
    const found = this.mentors.find(m => m.id.toLowerCase() === q || m.name.toLowerCase() === q || m.email.toLowerCase() === q);
    if (!found) return null;

    const assignedStudents = this.getStudentsForMentor(found.id);
    const avgProg = assignedStudents.length > 0 
      ? Math.round(assignedStudents.reduce((sum, s) => sum + s.progress, 0) / assignedStudents.length) 
      : 0;
    const atRisk = assignedStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').length;

    return {
      ...found,
      assignedStudentsCount: assignedStudents.length,
      studentIds: assignedStudents.map(s => s.studentId),
      averageProgress: avgProg,
      atRiskCount: atRisk,
    };
  }

  // ====================================================
  // 4. HODS CATALOG ACCESS
  // ====================================================
  public getAllHods(): HodRecord[] {
    return [...this.hods];
  }

  public getHodByDepartment(departmentCode: string): HodRecord | null {
    if (!departmentCode) return null;
    const dept = departmentCode.trim().toUpperCase();
    return this.hods.find(h => h.departmentCode.toUpperCase() === dept) || null;
  }

  // ====================================================
  // 4A. MULTI-INSTITUTION MANAGEMENT (PHASE 18B)
  // ====================================================
  public getInstitutionById(id: string): InstitutionRecord | null {
    if (!id) return null;
    const cleanId = id.trim().toLowerCase();
    return this.institutions.find(i => i.id.toLowerCase() === cleanId) || null;
  }

  public getInstitutionByCode(code: string): InstitutionRecord | null {
    if (!code) return null;
    const cleanCode = code.trim().toUpperCase();
    return this.institutions.find(i => i.code.toUpperCase() === cleanCode) || null;
  }

  public getInstitutionByDomain(domain: string): InstitutionRecord | null {
    if (!domain) return null;
    const cleanDomain = domain.trim().toLowerCase();
    return this.institutions.find(i => i.domain.toLowerCase() === cleanDomain) || null;
  }

  public getAllInstitutions(caller?: AuthUser): InstitutionRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
      if (!isPlatformOp && caller.institutionId) {
        return this.institutions.filter(i => i.id === caller.institutionId || i.code === caller.institutionCode);
      }
    }
    return [...this.institutions];
  }

  public async saveInstitution(institution: InstitutionRecord, caller: AuthUser): Promise<void> {
    AuthorizationPolicy.validateIdentity(caller);
    const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
    const isCollegeAdmin = (caller.role === 'admin' || caller.role === 'super_admin') && 
      (caller.institutionId === institution.id || caller.institutionCode === institution.code);

    if (!isPlatformOp && !isCollegeAdmin) {
      throw new ForbiddenException('Access denied. Only Platform Operators or authorized Institution Administrators can update institution configurations.');
    }

    const index = this.institutions.findIndex(i => i.id === institution.id || i.code.toUpperCase() === institution.code.toUpperCase());
    if (index !== -1) {
      this.institutions[index] = { ...institution, updatedAt: new Date().toISOString() };
    } else {
      this.institutions.push({ ...institution, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    }

    this.persistToStorage();
    this.notifyListeners();
  }

  // ====================================================
  // 4B. DEPARTMENT GOVERNANCE & MANAGEMENT (PHASE 17B)
  // ====================================================
  public getAllDepartments(caller?: AuthUser): DepartmentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
      let depts = this.departments;
      if (!isPlatformOp && caller.institutionId) {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        depts = depts.filter(d => canonicalizeInstitutionId(d.institutionId) === callerInst);
      }
      // If super admin or admin, return all departments (active & inactive)
      if (caller.role === 'admin' || caller.role === 'super_admin') {
        return [...depts];
      }
      // HODs, Mentors and Students can only see active departments or their own department
      const userDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
      return depts.filter(d => d.status === 'active' || d.code.toUpperCase() === userDept);
    }
    return [...this.departments];
  }

  public getDepartmentByCode(code: string, caller?: AuthUser): DepartmentRecord | null {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
    }
    if (!code) return null;
    const norm = code.trim().toUpperCase();
    const dept = this.departments.find(d => d.code.toUpperCase() === norm) || null;
    return dept ? { ...dept } : null;
  }

  public async createDepartment(
    deptData: {
      code: string;
      name: string;
      institutionId?: string;
      hodId?: string;
      hodName?: string;
      maxStudentCapacity?: number;
      contactEmail?: string;
      contactPhone?: string;
      academicHeadName?: string;
      description?: string;
      defaultMonitoringStartTime?: string;
      defaultMonitoringEndTime?: string;
    },
    caller: AuthUser
  ): Promise<DepartmentRecord> {
    AuthorizationPolicy.validateSuperAdminScope(caller);

    const normCode = (deptData.code || '').trim().toUpperCase();
    if (!normCode || normCode.length < 2) {
      throw new Error('Department code must be at least 2 characters long.');
    }
    const normName = (deptData.name || '').trim();
    if (!normName || normName.length < 2) {
      throw new Error('Department name must be at least 2 characters long.');
    }

    const targetInstId = canonicalizeInstitutionId(deptData.institutionId || caller.institutionId || caller.college);
    const duplicate = this.departments.find(d => 
      d.code.toUpperCase() === normCode && 
      canonicalizeInstitutionId(d.institutionId) === targetInstId
    );
    if (duplicate) {
      throw new Error(`Department with code '${normCode}' already exists (${duplicate.name}).`);
    }

    // Phase 19B: Server-Side Licensing & Department Capacity Verification
    const currentDeptCount = this.departments.filter(
      d => canonicalizeInstitutionId(d.institutionId) === targetInstId && d.status !== 'inactive'
    ).length;
    LicensingEngine.getInstance().verifyDepartmentCapacity(targetInstId, currentDeptCount, 1);

    const newDept: DepartmentRecord = {
      id: `dept-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      institutionId: targetInstId,
      code: normCode,
      name: normName,
      status: 'active',
      hodId: deptData.hodId,
      hodName: deptData.hodName,
      maxStudentCapacity: deptData.maxStudentCapacity || 120,
      contactEmail: deptData.contactEmail,
      contactPhone: deptData.contactPhone,
      academicHeadName: deptData.academicHeadName,
      description: deptData.description,
      defaultMonitoringStartTime: deptData.defaultMonitoringStartTime || '09:00:00',
      defaultMonitoringEndTime: deptData.defaultMonitoringEndTime || '17:00:00',
      isPilotAuthorized: false, // Strict safety: new departments are NOT pilot authorized in production
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.departments.push(newDept);
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('departments').insert({
          id: newDept.id,
          institution_id: newDept.institutionId,
          code: newDept.code,
          name: newDept.name,
          status: newDept.status,
          hod_id: newDept.hodId,
          hod_name: newDept.hodName,
          max_student_capacity: newDept.maxStudentCapacity,
          contact_email: newDept.contactEmail,
          contact_phone: newDept.contactPhone,
          academic_head_name: newDept.academicHeadName,
          description: newDept.description,
          default_monitoring_start_time: newDept.defaultMonitoringStartTime,
          default_monitoring_end_time: newDept.defaultMonitoringEndTime,
          is_pilot_authorized: false,
        });
      } catch (err) {
        console.warn('Supabase createDepartment insert error:', err);
      }
    }

    return newDept;
  }

  public async deactivateDepartment(departmentCode: string, caller: AuthUser): Promise<DepartmentRecord> {
    AuthorizationPolicy.validateSuperAdminScope(caller);

    const normCode = (departmentCode || '').trim().toUpperCase();
    const dept = this.departments.find(d => d.code.toUpperCase() === normCode);
    if (!dept) {
      throw new Error(`Department with code '${departmentCode}' was not found.`);
    }

    dept.status = 'inactive';
    dept.updatedAt = new Date().toISOString();
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('departments')
          .update({
            status: 'inactive',
            updated_at: dept.updatedAt,
          })
          .eq('code', dept.code);
      } catch (err) {
        console.warn('Supabase deactivateDepartment update error:', err);
      }
    }

    return dept;
  }

  public async reactivateDepartment(departmentCode: string, caller: AuthUser): Promise<DepartmentRecord> {
    AuthorizationPolicy.validateSuperAdminScope(caller);

    const normCode = (departmentCode || '').trim().toUpperCase();
    const dept = this.departments.find(d => d.code.toUpperCase() === normCode);
    if (!dept) {
      throw new Error(`Department with code '${departmentCode}' was not found.`);
    }

    dept.status = 'active';
    dept.updatedAt = new Date().toISOString();
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('departments')
          .update({
            status: 'active',
            updated_at: dept.updatedAt,
          })
          .eq('code', dept.code);
      } catch (err) {
        console.warn('Supabase reactivateDepartment update error:', err);
      }
    }

    return dept;
  }

  public async assignDepartmentHod(
    departmentCode: string,
    hodId: string,
    hodName: string,
    caller: AuthUser
  ): Promise<DepartmentRecord> {
    AuthorizationPolicy.validateSuperAdminScope(caller);

    const normCode = (departmentCode || '').trim().toUpperCase();
    const dept = this.departments.find(d => d.code.toUpperCase() === normCode);
    if (!dept) {
      throw new Error(`Department with code '${departmentCode}' was not found.`);
    }

    dept.hodId = hodId.trim();
    dept.hodName = hodName.trim();
    dept.updatedAt = new Date().toISOString();

    // Also update or add HOD record in this.hods
    const hodIndex = this.hods.findIndex(h => h.departmentCode.toUpperCase() === normCode);
    if (hodIndex !== -1) {
      this.hods[hodIndex].hodId = hodId.trim();
      this.hods[hodIndex].name = hodName.trim();
    } else {
      this.hods.push({
        id: `hod-${normCode.toLowerCase()}`,
        hodId: hodId.trim(),
        name: hodName.trim(),
        email: `${normCode.toLowerCase()}-hod@college.edu`,
        departmentCode: normCode,
        officeLocation: 'Academic Complex',
      });
    }

    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('departments')
          .update({
            hod_id: dept.hodId,
            hod_name: dept.hodName,
            updated_at: dept.updatedAt,
          })
          .eq('code', dept.code);
      } catch (err) {
        console.warn('Supabase assignDepartmentHod update error:', err);
      }
    }

    return dept;
  }

  public getInstitutionStatistics(caller: AuthUser): {
    totalDepartments: number;
    activeDepartments: number;
    totalStudents: number;
    totalMentors: number;
    activeAssignments: number;
    departmentBreakdown: Array<{ code: string; name: string; studentCount: number; mentorCount: number; status: string }>;
  } {
    AuthorizationPolicy.validateSuperAdminScope(caller);

    const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
    const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
    const targetDepts = (!isPlatformOp && caller.institutionId)
      ? this.departments.filter(d => canonicalizeInstitutionId(d.institutionId) === callerInst)
      : this.departments;
    const targetStudents = (!isPlatformOp && caller.institutionId)
      ? this.students.filter(s => canonicalizeInstitutionId(s.institutionId) === callerInst)
      : this.students;
    const targetMentors = (!isPlatformOp && caller.institutionId)
      ? this.mentors.filter(m => canonicalizeInstitutionId(m.institutionId) === callerInst)
      : this.mentors;
    const targetAssignments = (!isPlatformOp && caller.institutionId)
      ? this.assignments.filter(a => canonicalizeInstitutionId(a.institutionId) === callerInst)
      : this.assignments;

    const activeDepts = targetDepts.filter(d => d.status === 'active');
    const breakdown = targetDepts.map(d => {
      const sCount = targetStudents.filter(s => (s.departmentCode || s.dept || '').toUpperCase() === d.code.toUpperCase()).length;
      const mCount = targetMentors.filter(m => (m.departmentCode || '').toUpperCase() === d.code.toUpperCase()).length;
      return {
        code: d.code,
        name: d.name,
        studentCount: sCount,
        mentorCount: mCount,
        status: d.status,
      };
    });

    return {
      totalDepartments: targetDepts.length,
      activeDepartments: activeDepts.length,
      totalStudents: targetStudents.length,
      totalMentors: targetMentors.length,
      activeAssignments: targetAssignments.filter(a => a.assignmentStatus === 'active').length,
      departmentBreakdown: breakdown,
    };
  }

  public getDepartmentAttendanceSummary(departmentCode: string, caller?: AuthUser): {
    departmentCode: string;
    totalStudents: number;
    totalSessions: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
    verifiedCount: number;
    attendanceRate: number;
  } {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller, departmentCode);
      const targetDept = this.departments.find(d => d.code.toUpperCase() === departmentCode.trim().toUpperCase());
      if (targetDept) {
        AuthorizationPolicy.validateDepartmentActive(targetDept, caller);
      }
    }

    const normCode = (departmentCode || '').trim().toUpperCase();
    const deptStudents = this.students.filter(s => (s.departmentCode || s.dept || '').toUpperCase() === normCode);
    const studentIdSet = new Set(deptStudents.map(s => s.studentId.trim().toLowerCase()));

    const sessions = this.attendanceSessions.filter(a => studentIdSet.has(a.studentId.trim().toLowerCase()));
    const totalSessions = sessions.length;
    const presentCount = sessions.filter(s => s.status === 'present').length;
    const absentCount = sessions.filter(s => s.status === 'absent').length;
    const lateCount = sessions.filter(s => s.status === 'late').length;
    const verifiedCount = sessions.filter(s => s.isVerified).length;
    const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;

    return {
      departmentCode: normCode,
      totalStudents: deptStudents.length,
      totalSessions,
      presentCount,
      absentCount,
      lateCount,
      verifiedCount,
      attendanceRate,
    };
  }

  // ====================================================
  // 4C. DEPARTMENT CONFIGURATION & BATCHES (PHASE 17C)
  // ====================================================
  public async updateDepartmentConfig(
    departmentCode: string,
    config: {
      maxStudentCapacity?: number;
      contactEmail?: string;
      contactPhone?: string;
      academicHeadName?: string;
      description?: string;
      defaultMonitoringStartTime?: string;
      defaultMonitoringEndTime?: string;
    },
    caller: AuthUser
  ): Promise<DepartmentRecord> {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      AuthorizationPolicy.validateHodScope(caller, departmentCode);
    }

    const normCode = (departmentCode || '').trim().toUpperCase();
    const dept = this.departments.find(d => d.code.toUpperCase() === normCode);
    if (!dept) {
      throw new Error(`Department with code '${departmentCode}' was not found.`);
    }

    AuthorizationPolicy.validateDepartmentActive(dept, caller);

    if (config.maxStudentCapacity !== undefined) {
      if (typeof config.maxStudentCapacity !== 'number' || config.maxStudentCapacity < 1 || config.maxStudentCapacity > 1000) {
        throw new Error('Validation Error: Maximum student capacity must be between 1 and 1000.');
      }
      dept.maxStudentCapacity = config.maxStudentCapacity;
    }

    if (config.contactEmail !== undefined) {
      dept.contactEmail = config.contactEmail.trim();
    }
    if (config.contactPhone !== undefined) {
      dept.contactPhone = config.contactPhone.trim();
    }
    if (config.academicHeadName !== undefined) {
      dept.academicHeadName = config.academicHeadName.trim();
    }
    if (config.description !== undefined) {
      dept.description = config.description.trim();
    }
    if (config.defaultMonitoringStartTime !== undefined) {
      dept.defaultMonitoringStartTime = config.defaultMonitoringStartTime.trim();
    }
    if (config.defaultMonitoringEndTime !== undefined) {
      dept.defaultMonitoringEndTime = config.defaultMonitoringEndTime.trim();
    }

    dept.updatedAt = new Date().toISOString();
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('departments')
          .update({
            max_student_capacity: dept.maxStudentCapacity,
            contact_email: dept.contactEmail,
            contact_phone: dept.contactPhone,
            academic_head_name: dept.academicHeadName,
            description: dept.description,
            default_monitoring_start_time: dept.defaultMonitoringStartTime,
            default_monitoring_end_time: dept.defaultMonitoringEndTime,
            updated_at: dept.updatedAt,
          })
          .eq('code', dept.code);
      } catch (err) {
        console.warn('Supabase updateDepartmentConfig error:', err);
      }
    }

    return { ...dept };
  }

  // ====================================================
  // 4D. INTERNSHIP BATCHES & MANAGEMENT (PHASE 17C)
  // ====================================================
  public async createInternshipBatch(
    batchData: {
      departmentCode: string;
      batchName: string;
      academicYear: string;
      termCode: 'ODD' | 'EVEN' | 'SUMMER';
      semester: number;
      startDate: string;
      endDate: string;
      maxCapacity?: number;
    },
    caller: AuthUser
  ): Promise<InternshipBatchRecord> {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role === 'student') {
      throw new ForbiddenException('Security Violation: Students cannot create internship batches.');
    }
    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      AuthorizationPolicy.validateHodScope(caller, batchData.departmentCode);
    }

    const normDept = (batchData.departmentCode || '').trim().toUpperCase();
    const dept = this.departments.find(d => d.code.toUpperCase() === normDept);
    if (!dept) {
      throw new Error(`Department with code '${batchData.departmentCode}' was not found.`);
    }
    AuthorizationPolicy.validateDepartmentActive(dept, caller);

    const normName = (batchData.batchName || '').trim();
    if (!normName || normName.length < 3) {
      throw new Error('Validation Error: Batch name must be at least 3 characters long.');
    }

    const start = new Date(batchData.startDate);
    const end = new Date(batchData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Validation Error: Invalid date format for start or end date.');
    }
    if (end <= start) {
      throw new Error(`Validation Error: Invalid batch date range. End date (${batchData.endDate}) must be after start date (${batchData.startDate}).`);
    }

    const duplicate = this.batches.find(
      b => b.departmentCode.toUpperCase() === normDept && b.batchName.toLowerCase() === normName.toLowerCase()
    );
    if (duplicate) {
      throw new Error(`Validation Error: A batch named '${normName}' already exists in department '${normDept}'.`);
    }

    const batchInstId = dept.institutionId || caller.institutionId || 'inst-smvec-001';
    const newBatch: InternshipBatchRecord = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      institutionId: batchInstId,
      departmentCode: normDept,
      batchName: normName,
      academicYear: batchData.academicYear.trim(),
      termCode: batchData.termCode,
      semester: batchData.semester,
      startDate: batchData.startDate,
      endDate: batchData.endDate,
      maxCapacity: batchData.maxCapacity || 60,
      enrolledStudentCount: 0,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.batches.unshift(newBatch);
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('internship_batches').insert({
          id: newBatch.id,
          institution_id: newBatch.institutionId,
          department_code: newBatch.departmentCode,
          batch_name: newBatch.batchName,
          academic_year: newBatch.academicYear,
          term_code: newBatch.termCode,
          semester: newBatch.semester,
          start_date: newBatch.startDate,
          end_date: newBatch.endDate,
          max_capacity: newBatch.maxCapacity,
          status: newBatch.status,
        });
      } catch (err) {
        console.warn('Supabase createInternshipBatch insert error:', err);
      }
    }

    return { ...newBatch };
  }

  public getInternshipBatches(departmentCode?: string, caller?: AuthUser): InternshipBatchRecord[] {
    const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
    let baseBatches = this.batches;
    if (caller && !isPlatformOp && caller.institutionId) {
      const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
      baseBatches = baseBatches.filter(b => canonicalizeInstitutionId(b.institutionId) === callerInst);
    }

    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'hod') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        if (departmentCode && departmentCode.trim().toUpperCase() !== callerDept) {
          throw new ForbiddenException(`Cross-department batch access forbidden. HOD of ${callerDept} cannot access batches for ${departmentCode}.`);
        }
        return baseBatches.filter(b => b.departmentCode.toUpperCase() === callerDept);
      }
      if (caller.role === 'student') {
        const student = this.getStudentById(caller.studentId || caller.id);
        const studentDept = (student?.departmentCode || caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        return baseBatches.filter(b => b.departmentCode.toUpperCase() === studentDept);
      }
    }

    if (departmentCode && departmentCode !== 'ALL') {
      const norm = departmentCode.trim().toUpperCase();
      return baseBatches.filter(b => b.departmentCode.toUpperCase() === norm);
    }
    return [...baseBatches];
  }

  public getInternshipBatchById(batchId: string, caller?: AuthUser): InternshipBatchRecord | null {
    if (!batchId) return null;
    const batch = this.batches.find(b => b.id === batchId) || null;
    if (!batch) return null;

    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'hod') {
        AuthorizationPolicy.validateHodScope(caller, batch.departmentCode);
      }
      if (caller.role === 'student') {
        const student = this.getStudentById(caller.studentId || caller.id);
        const studentDept = (student?.departmentCode || caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        if (studentDept && batch.departmentCode.toUpperCase() !== studentDept) {
          throw new ForbiddenException(`Access forbidden. Batch belongs to ${batch.departmentCode}.`);
        }
      }
    }

    return { ...batch };
  }

  public async updateInternshipBatch(
    batchId: string,
    updates: Partial<InternshipBatchRecord>,
    caller: AuthUser
  ): Promise<InternshipBatchRecord> {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role === 'student') {
      throw new ForbiddenException('Security Violation: Students cannot modify internship batches.');
    }

    const batch = this.batches.find(b => b.id === batchId);
    if (!batch) {
      throw new Error(`Internship batch '${batchId}' was not found.`);
    }

    if (caller.role !== 'admin' && caller.role !== 'super_admin') {
      AuthorizationPolicy.validateHodScope(caller, batch.departmentCode);
    }

    if (updates.startDate && updates.endDate) {
      const start = new Date(updates.startDate);
      const end = new Date(updates.endDate);
      if (end <= start) {
        throw new Error('Validation Error: Batch end date must be after start date.');
      }
    }

    Object.assign(batch, updates);
    batch.updatedAt = new Date().toISOString();
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('internship_batches')
          .update({
            batch_name: batch.batchName,
            status: batch.status,
            max_capacity: batch.maxCapacity,
            start_date: batch.startDate,
            end_date: batch.endDate,
            updated_at: batch.updatedAt,
          })
          .eq('id', batch.id);
      } catch (err) {
        console.warn('Supabase updateInternshipBatch error:', err);
      }
    }

    return { ...batch };
  }

  public async assignStudentToBatch(
    studentId: string,
    batchId: string,
    caller: AuthUser
  ): Promise<StudentRecord> {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role === 'student') {
      throw new ForbiddenException('Security Violation: Students cannot assign themselves to batches.');
    }

    const student = this.getStudentById(studentId);
    if (!student) {
      throw new Error(`Student with ID '${studentId}' was not found.`);
    }

    AuthorizationPolicy.validateInstitutionScope(caller, student.institutionId);

    if (caller.role === 'hod') {
      AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
    }
    if (caller.role === 'mentor') {
      AuthorizationPolicy.validateMentorScope(caller, student);
    }

    const batch = this.batches.find(b => b.id === batchId);
    if (!batch) {
      throw new Error(`Internship batch '${batchId}' was not found.`);
    }

    const studInst = canonicalizeInstitutionId(student.institutionId);
    const batchInst = canonicalizeInstitutionId(batch.institutionId);
    if (studInst !== batchInst) {
      throw new ForbiddenException(
        `Tenant Isolation Violation: Cannot assign student from institution '${student.institutionId}' to batch belonging to institution '${batch.institutionId}'.`
      );
    }

    const studDept = student.departmentCode.trim().toUpperCase();
    const batchDept = batch.departmentCode.trim().toUpperCase();
    if (studDept !== batchDept) {
      throw new ForbiddenException(
        `Department mismatch: Cannot assign student '${student.studentName}' (${studDept}) to batch '${batch.batchName}' (${batchDept}). Students must belong to the batch's department.`
      );
    }

    if (batch.status !== 'active') {
      throw new Error(`Validation Error: Cannot assign student to inactive batch '${batch.batchName}'.`);
    }

    const currentEnrolled = this.students.filter(s => s.batchId === batch.id && s.studentId !== student.studentId).length;
    if (batch.maxCapacity && currentEnrolled >= batch.maxCapacity) {
      throw new Error(`Validation Error: Batch '${batch.batchName}' has reached its maximum capacity of ${batch.maxCapacity} students.`);
    }

    student.batchId = batch.id;
    student.batchName = batch.batchName;

    batch.enrolledStudentCount = this.students.filter(s => s.batchId === batch.id).length;
    batch.updatedAt = new Date().toISOString();

    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('students')
          .update({
            batch_id: batch.id,
            batch_name: batch.batchName,
          })
          .eq('student_id', student.studentId);
      } catch (err) {
        console.warn('Supabase assignStudentToBatch error:', err);
      }
    }

    return { ...student };
  }

  // ====================================================
  // 4E. STUDENT TRANSFERS (PHASE 17C)
  // ====================================================
  public async transferStudentDepartment(
    studentId: string,
    targetDepartmentCode: string,
    reason: string,
    caller: AuthUser
  ): Promise<StudentRecord> {
    AuthorizationPolicy.validateSuperAdminScope(caller);

    const student = this.getStudentById(studentId);
    if (!student) {
      throw new Error(`Student with ID '${studentId}' was not found.`);
    }

    const studentInstId = canonicalizeInstitutionId(student.institutionId);
    AuthorizationPolicy.validateInstitutionScope(caller, studentInstId);

    const normTargetDept = (targetDepartmentCode || '').trim().toUpperCase();
    const targetDept = this.departments.find(d => 
      d.code.toUpperCase() === normTargetDept && 
      canonicalizeInstitutionId(d.institutionId) === studentInstId
    );
    if (!targetDept) {
      throw new Error(`Target department '${targetDepartmentCode}' was not found in institution '${student.institutionId || 'default'}'.`);
    }
    AuthorizationPolicy.validateDepartmentActive(targetDept, caller);

    // Cross-tenant check explicit
    if (canonicalizeInstitutionId(targetDept.institutionId) !== studentInstId) {
      throw new ForbiddenException(
        `Tenant Isolation Violation: Cannot transfer student '${student.studentName}' (${student.institutionId}) across institutions to department in '${targetDept.institutionId}'.`
      );
    }

    const normReason = (reason || '').trim();
    if (!normReason || normReason.length < 5) {
      throw new Error('Validation Error: A valid transfer reason of at least 5 characters is required.');
    }

    const oldDept = student.departmentCode.trim().toUpperCase();
    if (oldDept === normTargetDept) {
      throw new Error(`Validation Error: Student is already enrolled in department '${normTargetDept}'.`);
    }

    const currentStudentsInTarget = this.students.filter(s => (s.departmentCode || s.dept || '').toUpperCase() === normTargetDept).length;
    if (targetDept.maxStudentCapacity && currentStudentsInTarget >= targetDept.maxStudentCapacity) {
      throw new Error(`Validation Error: Target department '${targetDept.name}' has reached its maximum capacity of ${targetDept.maxStudentCapacity} students.`);
    }

    const transferRecord: StudentTransferRecord = {
      id: `trsf-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: student.studentId,
      studentName: student.studentName,
      fromDepartmentCode: oldDept,
      toDepartmentCode: normTargetDept,
      authorizedById: caller.id || 'super_admin',
      authorizedByName: caller.name || caller.id || 'Super Admin',
      reason: normReason,
      academicYear: student.academicYear || '2026-2027',
      previousBatchId: student.batchId,
      transferredAt: new Date().toISOString(),
    };

    this.transferHistory.unshift(transferRecord);

    // Update student department and clear batch enrollment
    student.departmentCode = normTargetDept;
    student.dept = normTargetDept;
    student.batchId = undefined;
    student.batchName = undefined;

    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('student_department_transfers').insert({
          id: transferRecord.id,
          student_id: student.id,
          from_department_id: targetDept.id,
          to_department_id: targetDept.id,
          authorized_by: transferRecord.authorizedById,
          reason: transferRecord.reason,
          previous_batch_id: transferRecord.previousBatchId || null,
          academic_year: student.academicYear || '2026-2027',
          transferred_at: transferRecord.transferredAt,
        });

        await client
          .from('students')
          .update({
            department_code: normTargetDept,
            batch_id: null,
            batch_name: null,
          })
          .eq('student_id', student.studentId);
      } catch (err) {
        console.warn('Supabase student transfer error:', err);
      }
    }

    return { ...student };
  }

  public getStudentTransferHistory(studentId?: string, caller?: AuthUser): StudentTransferRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        const myStudentId = (caller.studentId || caller.id).trim().toLowerCase();
        return this.transferHistory.filter(t => t.studentId.trim().toLowerCase() === myStudentId);
      }
      if (caller.role === 'hod') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        return this.transferHistory.filter(
          t => t.fromDepartmentCode.toUpperCase() === callerDept || t.toDepartmentCode.toUpperCase() === callerDept
        );
      }
    }

    if (studentId) {
      const cleanId = studentId.trim().toLowerCase();
      return this.transferHistory.filter(t => t.studentId.trim().toLowerCase() === cleanId);
    }
    return [...this.transferHistory];
  }

  // ====================================================
  // 4F. PROVIDERS & MULTI-DEPARTMENT DASHBOARD ANALYTICS (PHASE 17C)
  // ====================================================
  public getInternshipProviders(departmentCode?: string, caller?: AuthUser): InternshipProviderRecord[] {
    let deptFilter: string | undefined = departmentCode;
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'hod') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        if (departmentCode && departmentCode !== 'ALL' && departmentCode.trim().toUpperCase() !== callerDept) {
          throw new ForbiddenException(`Cross-department provider access forbidden. HOD of ${callerDept} cannot access providers for ${departmentCode}.`);
        }
        deptFilter = callerDept;
      }
    }

    let locations = locationRepository.getLocations(deptFilter);
    if (departmentCode && departmentCode !== 'ALL') {
      const normDept = departmentCode.trim().toUpperCase();
      locations = locations.filter(l => (l.departmentCode || '').toUpperCase() === normDept);
    }

    const companyMap = new Map<string, {
      companyName: string;
      locations: typeof locations;
      departments: Set<string>;
    }>();

    for (const loc of locations) {
      const cName = loc.companyName.trim();
      if (!companyMap.has(cName)) {
        companyMap.set(cName, {
          companyName: cName,
          locations: [],
          departments: new Set(),
        });
      }
      const entry = companyMap.get(cName)!;
      entry.locations.push(loc);
      if (loc.departmentCode) {
        entry.departments.add(loc.departmentCode.toUpperCase());
      }
    }

    const providers: InternshipProviderRecord[] = [];
    companyMap.forEach((entry, companyName) => {
      const depts = Array.from(entry.departments);
      const totalLocations = entry.locations.length;
      const hasActive = entry.locations.some(l => l.status === 'active' || l.isActive);
      const allInactive = entry.locations.every(l => l.status === 'inactive' || (!l.isActive && l.status !== 'pending_approval'));
      
      const providerStatus: 'active' | 'pending_approval' | 'inactive' = hasActive 
        ? 'active' 
        : (allInactive ? 'inactive' : 'pending_approval');

      const activeInterns = this.students.filter(s => 
        s.company.toLowerCase() === companyName.toLowerCase() && 
        (s.status === 'inProgress' || s.status === 'onTrack') &&
        (!departmentCode || departmentCode === 'ALL' || (s.departmentCode || s.dept || '').toUpperCase() === departmentCode.toUpperCase())
      ).length;

      const firstLoc = entry.locations[0];

      providers.push({
        companyName,
        totalLocations,
        departmentCount: depts.length || 1,
        participatingDepartments: depts.length > 0 ? depts : ['CSEBS'],
        providerStatus,
        earliestStartDate: '2026-06-01',
        latestEndDate: '2026-12-31',
        activeInternsCount: activeInterns,
        contactEmail: firstLoc ? `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}@internships.com` : undefined,
        contactPhone: '+91 413 220 0000',
      });
    });

    return providers;
  }

  public getMultiDepartmentInternshipStats(caller?: AuthUser): Array<{
    code: string;
    name: string;
    status: string;
    isPilotAuthorized: boolean;
    totalStudents: number;
    activeInternships: number;
    completedInternships: number;
    atRiskInternships: number;
    unassignedStudents: number;
    activeMentors: number;
    approvedLocations: number;
    activeBatches: number;
    attendanceRate: number;
    verificationRate: number;
  }> {
    const visibleDepts = this.getAllDepartments(caller);
    const allLocations = locationRepository.getLocations();

    return visibleDepts.map(d => {
      const norm = d.code.toUpperCase();
      const deptStudents = this.students.filter(s => (s.departmentCode || s.dept || '').toUpperCase() === norm);
      const totalStudents = deptStudents.length;
      const activeInternships = deptStudents.filter(s => s.status === 'inProgress' || s.status === 'onTrack').length;
      const completedInternships = deptStudents.filter(s => s.status === 'completed').length;
      const atRiskInternships = deptStudents.filter(s => s.status === 'blocked' || s.status === 'inactive').length;
      const unassignedStudents = deptStudents.filter(s => !s.internshipLocationId || s.company === 'Not Assigned').length;

      const activeMentors = this.mentors.filter(m => (m.departmentCode || '').toUpperCase() === norm).length;
      const approvedLocations = allLocations.filter(l => (l.departmentCode || '').toUpperCase() === norm && (l.status === 'active' || l.isActive)).length;
      const activeBatches = this.batches.filter(b => b.departmentCode.toUpperCase() === norm && b.status === 'active').length;

      const studentIdSet = new Set(deptStudents.map(s => s.studentId.trim().toLowerCase()));
      const sessions = this.attendanceSessions.filter(a => studentIdSet.has(a.studentId.trim().toLowerCase()));
      const totalSessions = sessions.length;
      const presentCount = sessions.filter(s => s.status === 'present').length;
      const verifiedCount = sessions.filter(s => s.isVerified).length;
      const attendanceRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;
      const verificationRate = totalSessions > 0 ? Math.round((verifiedCount / totalSessions) * 100) : 100;

      return {
        code: d.code,
        name: d.name,
        status: d.status,
        isPilotAuthorized: !!d.isPilotAuthorized,
        totalStudents,
        activeInternships,
        completedInternships,
        atRiskInternships,
        unassignedStudents,
        activeMentors,
        approvedLocations,
        activeBatches,
        attendanceRate,
        verificationRate,
      };
    });
  }

  public getDepartmentDetailedAnalytics(departmentCode: string, caller?: AuthUser): {
    departmentCode: string;
    departmentName: string;
    status: string;
    totalStudents: number;
    activeInternships: number;
    completedInternships: number;
    atRiskInternships: number;
    unassignedStudents: number;
    activeBatches: number;
    batches: InternshipBatchRecord[];
    locationsCount: number;
    attendanceRate: number;
    verificationRate: number;
  } {
    const norm = (departmentCode || '').trim().toUpperCase();
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'hod') {
        AuthorizationPolicy.validateHodScope(caller, norm);
      }
    }

    const dept = this.departments.find(d => d.code.toUpperCase() === norm);
    if (!dept) {
      throw new Error(`Department with code '${departmentCode}' was not found.`);
    }

    const allStats = this.getMultiDepartmentInternshipStats(caller);
    const dStat = allStats.find(s => s.code.toUpperCase() === norm) || {
      code: dept.code,
      name: dept.name,
      status: dept.status,
      isPilotAuthorized: !!dept.isPilotAuthorized,
      totalStudents: 0,
      activeInternships: 0,
      completedInternships: 0,
      atRiskInternships: 0,
      unassignedStudents: 0,
      activeMentors: 0,
      approvedLocations: 0,
      activeBatches: 0,
      attendanceRate: 100,
      verificationRate: 100,
    };

    const batches = this.getInternshipBatches(norm, caller);

    return {
      departmentCode: dStat.code,
      departmentName: dStat.name,
      status: dStat.status,
      totalStudents: dStat.totalStudents,
      activeInternships: dStat.activeInternships,
      completedInternships: dStat.completedInternships,
      atRiskInternships: dStat.atRiskInternships,
      unassignedStudents: dStat.unassignedStudents,
      activeBatches: dStat.activeBatches,
      batches,
      locationsCount: dStat.approvedLocations,
      attendanceRate: dStat.attendanceRate,
      verificationRate: dStat.verificationRate,
    };
  }

  // ====================================================
  // 5. ADMIN SCOPED DATA ACCESS
  // ====================================================
  public getAllStudentsForAdmin(caller?: AuthUser): StudentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller);
      const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
      if (!isPlatformOp && caller.institutionId) {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        return this.students.filter(s => canonicalizeInstitutionId(s.institutionId) === callerInst);
      }
    }
    return [...this.students];
  }

  public getAllMentorsForAdmin(caller?: AuthUser): MentorRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller);
    }
    const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
    const callerInst = canonicalizeInstitutionId(caller?.institutionId || caller?.college);
    const targetMentors = (caller && !isPlatformOp && caller.institutionId)
      ? this.mentors.filter(m => canonicalizeInstitutionId(m.institutionId) === callerInst)
      : this.mentors;

    return targetMentors.map(m => {
      const assigned = this.getStudentsForMentor(m.id);
      const avgProg = assigned.length > 0 
        ? Math.round(assigned.reduce((sum, s) => sum + s.progress, 0) / assigned.length) 
        : 0;
      const atRisk = assigned.filter(s => s.status === 'blocked' || s.status === 'inactive').length;

      return {
        ...m,
        assignedStudentsCount: assigned.length,
        studentIds: assigned.map(s => s.studentId),
        averageProgress: avgProg,
        atRiskCount: atRisk,
      };
    });
  }

  public getAllStudents(): StudentRecord[] {
    return [...this.students];
  }

  // ====================================================
  // 6. MUTATIONS & LOG SUBMISSIONS (SUPABASE DIRECT)
  // ====================================================
  public async submitStudentDailyLog(
    studentId: string, 
    log: { 
      work: string; 
      hours: number; 
      status: StudentRecord['status']; 
      blocker?: string;
    },
    caller?: AuthUser
  ): Promise<StudentRecord> {
    const index = this.students.findIndex(
      s => s.studentId.toLowerCase() === studentId.trim().toLowerCase() || s.id.toLowerCase() === studentId.trim().toLowerCase()
    );

    let current = index !== -1 ? this.students[index] : null;

    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateStudentResourceAccess(caller, studentId, current);
    }
    const currentProgress = current ? current.progress : 0;
    const newProgress = Math.min(100, Math.max(0, currentProgress + (log.status === 'completed' ? 100 - currentProgress : 5)));

    const updated: StudentRecord = {
      id: current?.id || studentId,
      studentId: current?.studentId || studentId,
      studentName: current?.studentName || 'Student Intern',
      email: current?.email || `${studentId.toLowerCase()}@college.edu`,
      academicYear: current?.academicYear || '3rd Year',
      year: current?.year || '3rd Year',
      departmentCode: current?.departmentCode || 'CSEBS',
      dept: current?.dept || 'CSEBS',
      company: current?.company || 'Not Assigned',
      mentorId: current?.mentorId || 'MENTOR_001',
      mentor: current?.mentor || 'Faculty Mentor',
      role: current?.role || 'Intern',
      work: log.work.trim(),
      hours: log.hours,
      status: log.status,
      blocker: log.blocker?.trim() || undefined,
      progress: newProgress,
      time: 'Just now',
    };

    if (index !== -1) {
      this.students[index] = updated;
    } else {
      this.students.unshift(updated);
    }

    this.persistToStorage();
    this.notifyListeners();

    // Push update directly to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('students')
          .update({
            work: updated.work,
            hours: updated.hours,
            status: updated.status,
            blocker: updated.blocker || null,
            progress: updated.progress,
            last_log_at: new Date().toISOString(),
          })
          .eq('student_id', updated.studentId);

        // Also write entry to student_daily_logs table
        await client
          .from('student_daily_logs')
          .insert({
            student_id: updated.studentId,
            hours_logged: log.hours,
            work_summary: log.work.trim(),
            blockers_faced: log.blocker?.trim() || null,
            status: log.status,
          });
      } catch (err) {
        console.warn('Supabase log submission error:', err);
      }
    }

    return updated;
  }

  public async saveStudent(student: StudentRecord, caller?: AuthUser): Promise<void> {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);

      // Check existing student to prevent unauthorized department reassignment
      const existing = this.students.find(s => s.studentId.toLowerCase() === student.studentId.toLowerCase());
      if (existing && existing.departmentCode.toUpperCase() !== student.departmentCode.toUpperCase()) {
        AuthorizationPolicy.validateDepartmentReassignment(caller, existing.departmentCode, student.departmentCode);
      }

      if (caller.role === 'student') {
        AuthorizationPolicy.validateStudentResourceAccess(caller, student.studentId, student);
      } else if (caller.role === 'mentor') {
        AuthorizationPolicy.validateMentorScope(caller, student);
      } else if (caller.role === 'hod') {
        AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
      }
    }

    const index = this.students.findIndex(s => s.studentId.toLowerCase() === student.studentId.toLowerCase());
    if (index !== -1) {
      this.students[index] = student;
    } else {
      this.students.unshift(student);
    }
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('students')
          .upsert({
            student_id: student.studentId,
            student_name: student.studentName,
            email: student.email || `${student.studentId.toLowerCase()}@college.edu`,
            department_code: student.departmentCode,
            academic_year: student.academicYear,
            company: student.company,
            role: student.role,
            mentor_id: student.mentorId,
            mentor_name: student.mentor,
            status: student.status,
            progress: student.progress,
            hours: student.hours,
            work: student.work,
            blocker: student.blocker || null,
          }, { onConflict: 'student_id' });
      } catch (err) {
        console.warn('Supabase save student error:', err);
      }
    }
  }

  public async saveStudentsBatch(newStudents: StudentRecord[], caller?: AuthUser): Promise<void> {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot perform bulk operations.');
      }
      if (caller.role === 'hod') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        for (const s of newStudents) {
          if (s.departmentCode.toUpperCase() !== callerDept) {
            AuthorizationPolicy.validateHodScope(caller, s.departmentCode);
          }
        }
      }
    }

    for (const student of newStudents) {
      const index = this.students.findIndex(s => s.studentId.toLowerCase() === student.studentId.toLowerCase());
      if (index !== -1) {
        this.students[index] = student;
      } else {
        this.students.unshift(student);
      }
    }
    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client && newStudents.length > 0) {
      try {
        const rows = newStudents.map(student => ({
          student_id: student.studentId,
          student_name: student.studentName,
          email: student.email || `${student.studentId.toLowerCase()}@college.edu`,
          department_code: student.departmentCode,
          academic_year: student.academicYear,
          company: student.company,
          role: student.role,
          mentor_id: student.mentorId,
          mentor_name: student.mentor,
          status: student.status,
          progress: student.progress,
          hours: student.hours,
          work: student.work,
          blocker: student.blocker || null,
        }));
        await client.from('students').upsert(rows, { onConflict: 'student_id' });
      } catch (err) {
        console.warn('Supabase batch save student error:', err);
      }
    }
  }

  // ====================================================
  // 6B. MENTOR STUDENT MANAGEMENT & ONBOARDING (PHASE 4)
  // ====================================================
  public async onboardStudent(
    studentData: Omit<StudentRecord, 'id'>, 
    caller?: AuthUser
  ): Promise<StudentRecord> {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot onboard other students.');
      }
      if (caller.role === 'mentor') {
        AuthorizationPolicy.validateMentorScope(caller, studentData.departmentCode || studentData.dept);
      }
      if (caller.role === 'hod') {
        AuthorizationPolicy.validateHodScope(caller, studentData.departmentCode || studentData.dept);
      }
    }

    const targetDeptCode = (studentData.departmentCode || studentData.dept || 'CSEBS').trim().toUpperCase();
    const targetDept = this.departments.find(d => d.code.toUpperCase() === targetDeptCode);
    if (targetDept) {
      AuthorizationPolicy.validateDepartmentActive(targetDept, caller);
    }

    // 1. Validate Register Number
    const regNo = (studentData.studentId || '').trim();
    if (!regNo) {
      throw new Error('Register number is required for student onboarding.');
    }
    const targetInstId = canonicalizeInstitutionId(studentData.institutionId || caller?.institutionId || caller?.college);
    const targetInstCode = studentData.institutionCode || caller?.institutionCode || 'SMVEC';

    const duplicateReg = this.students.find(s => 
      s.studentId.trim().toLowerCase() === regNo.toLowerCase() &&
      canonicalizeInstitutionId(s.institutionId) === targetInstId
    );
    if (duplicateReg) {
      throw new Error(`Duplicate Register Number: A student with register number '${regNo}' already exists in this institution (${duplicateReg.studentName}).`);
    }

    // 2. Validate Email
    const email = (studentData.email || '').trim().toLowerCase();
    if (!email) {
      throw new Error('Email address is required for student onboarding.');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error(`Invalid email format: '${email}'.`);
    }
    const duplicateEmail = this.students.find(s => 
      (s.email || '').trim().toLowerCase() === email &&
      canonicalizeInstitutionId(s.institutionId) === targetInstId
    );
    if (duplicateEmail) {
      throw new Error(`Duplicate Email: A student with email address '${email}' already exists in this institution (${duplicateEmail.studentName}).`);
    }

    // 3. Validate Name & Department
    if (!studentData.studentName || studentData.studentName.trim().length < 2) {
      throw new Error('Student name must be at least 2 characters long.');
    }
    const dept = (studentData.departmentCode || studentData.dept || 'CSEBS').trim().toUpperCase();

    const newStudent: StudentRecord = {
      id: `st-${regNo.toLowerCase()}`,
      studentId: regNo,
      studentName: studentData.studentName.trim(),
      email: email,
      phone: studentData.phone?.trim() || '+91 98401 00000',
      academicYear: studentData.academicYear || studentData.year || '3rd Year',
      year: studentData.year || studentData.academicYear || '3rd Year',
      departmentCode: dept,
      dept: dept,
      institutionId: targetInstId,
      institutionCode: targetInstCode,
      company: studentData.company?.trim() || 'Unassigned',
      mentorId: studentData.mentorId || caller?.mentorId || caller?.id || 'MENTOR_001',
      mentor: studentData.mentor || caller?.name || 'Faculty Mentor',
      mentorEmail: studentData.mentorEmail || caller?.email || 'mentor@college.edu',
      role: studentData.role?.trim() || 'Intern',
      status: studentData.status || 'onTrack',
      accountStatus: studentData.accountStatus || 'active',
      progress: studentData.progress || 0,
      hours: studentData.hours || 0,
      work: studentData.work?.trim() || 'Student onboarded. Pending initial internship assignment.',
      time: 'Just now',
      internshipLocationId: studentData.internshipLocationId,
      internshipStartDate: studentData.internshipStartDate,
      internshipEndDate: studentData.internshipEndDate,
    };

    this.students.unshift(newStudent);
    this.persistToStorage();
    this.notifyListeners();

    // Persist to Supabase if configured
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('profiles').insert({
          id: newStudent.id,
          institution_id: newStudent.institutionId,
          email: newStudent.email,
          full_name: newStudent.studentName,
          role: 'student',
          department_code: newStudent.departmentCode,
          phone: newStudent.phone,
          account_status: newStudent.accountStatus || 'active',
          is_active: newStudent.accountStatus !== 'inactive' && newStudent.accountStatus !== 'suspended',
          student_id: newStudent.studentId,
        });

        await client.from('students').insert({
          institution_id: newStudent.institutionId,
          profile_id: newStudent.id,
          register_number: newStudent.studentId,
          academic_year: newStudent.academicYear,
          status: newStudent.status,
          company: newStudent.company,
          role: newStudent.role,
          mentor_id: newStudent.mentorId,
          mentor_name: newStudent.mentor,
        });
      } catch (err) {
        console.warn('Supabase student onboarding sync warning:', err);
      }
    }

    return newStudent;
  }

  public async bulkImportStudents(
    csvStudents: Array<Omit<StudentRecord, 'id'>>,
    caller?: AuthUser
  ): Promise<{ imported: StudentRecord[]; count: number }> {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot bulk-import student records.');
      }
    }

    const imported: StudentRecord[] = [];
    for (const row of csvStudents) {
      // Re-validate mentor scope for each row
      if (caller && caller.role === 'mentor') {
        AuthorizationPolicy.validateMentorScope(caller, row.departmentCode || row.dept);
      }

      const targetInstId = canonicalizeInstitutionId(row.institutionId || caller?.institutionId || caller?.college);
      const targetInstCode = row.institutionCode || caller?.institutionCode || 'SMVEC';

      // Check duplicate regNo within target institution
      const regLower = row.studentId.trim().toLowerCase();
      if (this.students.some(s => s.studentId.trim().toLowerCase() === regLower && canonicalizeInstitutionId(s.institutionId) === targetInstId)) {
        continue; // duplicate guard
      }

      // Check duplicate email within target institution
      const emailLower = (row.email || '').trim().toLowerCase();
      if (emailLower && this.students.some(s => (s.email || '').trim().toLowerCase() === emailLower && canonicalizeInstitutionId(s.institutionId) === targetInstId)) {
        continue; // duplicate guard
      }

      const dept = (row.departmentCode || row.dept || 'CSEBS').trim().toUpperCase();
      const newStudent: StudentRecord = {
        id: `st-${regLower}`,
        studentId: row.studentId.trim(),
        studentName: row.studentName.trim(),
        email: emailLower,
        phone: row.phone?.trim() || '+91 98401 00000',
        academicYear: row.academicYear || row.year || '3rd Year',
        year: row.year || row.academicYear || '3rd Year',
        departmentCode: dept,
        dept: dept,
        institutionId: targetInstId,
        institutionCode: targetInstCode,
        company: row.company?.trim() || 'Unassigned',
        mentorId: row.mentorId || caller?.mentorId || caller?.id || 'MENTOR_001',
        mentor: row.mentor || caller?.name || 'Faculty Mentor',
        mentorEmail: row.mentorEmail || caller?.email || 'mentor@college.edu',
        role: row.role?.trim() || 'Intern',
        status: row.status || 'onTrack',
        accountStatus: row.accountStatus || 'active',
        progress: row.progress || 0,
        hours: row.hours || 0,
        work: row.work?.trim() || 'Imported via CSV. Ready for placement tracking.',
        time: 'Just now',
      };

      this.students.unshift(newStudent);
      imported.push(newStudent);
    }

    this.persistToStorage();
    this.notifyListeners();

    // Supabase bulk sync if client available
    const client = getSupabaseClient();
    if (client && imported.length > 0) {
      try {
        const profilePayloads = imported.map(s => ({
          id: s.id,
          email: s.email,
          full_name: s.studentName,
          role: 'student',
          department_code: s.departmentCode,
          phone: s.phone,
          account_status: s.accountStatus || 'active',
          is_active: s.accountStatus !== 'inactive' && s.accountStatus !== 'suspended',
          student_id: s.studentId,
        }));
        await client.from('profiles').upsert(profilePayloads, { onConflict: 'id' });
      } catch (err) {
        console.warn('Supabase bulk profiles sync warning:', err);
      }
    }

    return { imported, count: imported.length };
  }

  public async setStudentAccountStatus(
    studentId: string, 
    accountStatus: 'active' | 'inactive' | 'suspended' | 'pending_approval', 
    caller?: AuthUser
  ): Promise<StudentRecord> {
    const student = this.getStudentById(studentId);
    if (!student) {
      throw new Error(`Student with ID '${studentId}' was not found.`);
    }

    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot alter account statuses.');
      }
      if (caller.role === 'mentor') {
        AuthorizationPolicy.validateMentorScope(caller, student);
      }
      if (caller.role === 'hod') {
        AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
      }
    }

    student.accountStatus = accountStatus;
    if (accountStatus === 'inactive' || accountStatus === 'suspended') {
      student.status = 'inactive';
    } else if (student.status === 'inactive') {
      student.status = 'onTrack';
    }

    this.persistToStorage();
    this.notifyListeners();

    // Sync to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('profiles')
          .update({
            account_status: accountStatus,
            is_active: accountStatus === 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('student_id', student.studentId);
      } catch (err) {
        console.warn('Supabase student activation status sync error:', err);
      }
    }

    return student;
  }

  // ====================================================
  // 6C. INTERNSHIP ASSIGNMENT WORKFLOW (PHASE 5)
  // ====================================================
  public async createInternshipAssignment(
    params: {
      studentId: string;
      locationId: string;
      roleTitle?: string;
      startDate: string;
      endDate: string;
      monitoringSchedule?: {
        startTime: string;
        endTime: string;
        requiredDailyHours: number;
      };
      mentorId?: string;
      mentorName?: string;
      notes?: string;
      batchId?: string;
      batchName?: string;
    },
    caller: AuthUser
  ): Promise<InternshipAssignmentRecord> {
    // 1. Identity & Role Enforcement (Anti-Tamper)
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role === 'student') {
      throw new ForbiddenException('Security Violation: Students cannot create or modify internship assignments.');
    }

    // 2. Resolve Student & Mentor Scope Check
    const student = this.getStudentById(params.studentId);
    if (!student) {
      throw new Error(`Student with ID '${params.studentId}' was not found.`);
    }

    AuthorizationPolicy.validateInstitutionScope(caller, student.institutionId);

    if (caller.role === 'mentor') {
      AuthorizationPolicy.validateMentorScope(caller, student);
    }
    if (caller.role === 'hod') {
      AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
    }

    const studentDept = this.departments.find(d => d.code.toUpperCase() === student.departmentCode.toUpperCase());
    if (studentDept) {
      AuthorizationPolicy.validateDepartmentActive(studentDept, caller);
    }

    if (params.mentorId) {
      const targetMentor = this.mentors.find(m => m.id.toLowerCase() === params.mentorId?.toLowerCase());
      if (targetMentor) {
        const studentInst = canonicalizeInstitutionId(student.institutionId);
        const mentorInst = canonicalizeInstitutionId(targetMentor.institutionId);
        if (studentInst !== mentorInst) {
          throw new ForbiddenException(
            `Tenant Isolation Violation: Mentor '${targetMentor.name}' belongs to institution '${targetMentor.institutionId}', cannot supervise student belonging to '${student.institutionId}'.`
          );
        }
      }
      if (targetMentor && caller.role !== 'admin' && caller.role !== 'super_admin' && caller.role !== 'platform_super_admin') {
        const mentorDept = targetMentor.departmentCode.toUpperCase();
        const studDept = student.departmentCode.toUpperCase();
        if (mentorDept !== studDept) {
          throw new ForbiddenException(
            `Cross-department assignment forbidden. Mentor '${targetMentor.name}' (${mentorDept}) cannot supervise student '${student.studentName}' (${studDept}).`
          );
        }
      }
    }

    // 3. Validation: Only Approved Locations Can Be Assigned
    const location = locationRepository.getLocationById(params.locationId);
    if (!location) {
      throw new Error(`Validation Error: Internship location '${params.locationId}' was not found.`);
    }
    if (location.status !== 'active' || !location.isActive) {
      throw new Error(`Validation Error: Location '${location.locationName}' is not approved (status: ${location.status}, isActive: ${location.isActive}). Only approved locations can be assigned.`);
    }
    if (location.institutionId) {
      const studentInst = canonicalizeInstitutionId(student.institutionId);
      const locInst = canonicalizeInstitutionId(location.institutionId);
      if (studentInst !== locInst) {
        throw new ForbiddenException(
          `Tenant Isolation Violation: Location '${location.locationName}' belongs to institution '${location.institutionId}', cannot be assigned to student belonging to '${student.institutionId}'.`
        );
      }
    }

    // 4. Validation: Invalid Date Ranges Must Be Rejected
    const start = new Date(params.startDate);
    const end = new Date(params.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new Error('Validation Error: Invalid date format for start or end date.');
    }
    if (end < start) {
      throw new Error(`Validation Error: Invalid assignment date range. End date (${params.endDate}) cannot precede start date (${params.startDate}).`);
    }

    // 5. Validation: Conflicting Active Assignments Prohibited
    const existingActive = this.assignments.find(a => 
      (a.studentId.toLowerCase() === student.studentId.toLowerCase() || a.studentId.toLowerCase() === student.id.toLowerCase()) && 
      a.assignmentStatus === 'active'
    );
    if (existingActive) {
      throw new Error(`Validation Error: Conflicting active assignment. Student '${student.studentName}' (${student.studentId}) already has an active assignment at '${existingActive.companyName}'. Conflicting active assignments are prohibited.`);
    }

    // 5B. Batch Assignment Handling & Validation (Phase 17C)
    let assignedBatch: InternshipBatchRecord | null = null;
    if (params.batchId) {
      assignedBatch = this.batches.find(b => b.id === params.batchId) || null;
      if (!assignedBatch) {
        throw new Error(`Validation Error: Internship batch '${params.batchId}' was not found.`);
      }
      const studentInst = canonicalizeInstitutionId(student.institutionId);
      const batchInst = canonicalizeInstitutionId(assignedBatch.institutionId);
      if (studentInst !== batchInst) {
        throw new ForbiddenException(
          `Tenant Isolation Violation: Batch '${assignedBatch.batchName}' belongs to institution '${assignedBatch.institutionId}', cannot be assigned to student belonging to '${student.institutionId}'.`
        );
      }
      if (assignedBatch.departmentCode.toUpperCase() !== student.departmentCode.toUpperCase()) {
        throw new ForbiddenException(
          `Department mismatch: Cannot assign student '${student.studentName}' (${student.departmentCode}) to batch '${assignedBatch.batchName}' (${assignedBatch.departmentCode}).`
        );
      }
      if (assignedBatch.status !== 'active') {
        throw new Error(`Validation Error: Cannot assign student to inactive batch '${assignedBatch.batchName}'.`);
      }
    }

    // 6. Build Assignment Record
    const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const assignedMentorId = params.mentorId || (caller.role === 'mentor' ? (caller.mentorId || caller.id) : student.mentorId);
    const assignedMentorName = params.mentorName || (caller.role === 'mentor' ? caller.name : student.mentor);
    const roleTitle = (params.roleTitle || 'Intern').trim();
    const assignmentInstId = student.institutionId || caller.institutionId || 'inst-smvec-001';
    const assignmentInstCode = student.institutionCode || caller.institutionCode || 'SMVEC';

    const record: InternshipAssignmentRecord = {
      id: assignmentId,
      studentId: student.studentId,
      studentName: student.studentName,
      departmentCode: student.departmentCode,
      institutionId: assignmentInstId,
      institutionCode: assignmentInstCode,
      mentorId: assignedMentorId,
      mentorName: assignedMentorName,
      mentorEmail: caller.email || student.mentorEmail,
      locationId: location.id,
      locationName: location.locationName,
      companyName: location.companyName,
      locationAddress: location.address,
      geofenceRadiusMeters: location.geofenceRadiusMeters,
      latitude: location.latitude,
      longitude: location.longitude,
      roleTitle: roleTitle,
      startDate: params.startDate,
      endDate: params.endDate,
      batchId: assignedBatch ? assignedBatch.id : params.batchId,
      batchName: assignedBatch ? assignedBatch.batchName : params.batchName,
      monitoringSchedule: params.monitoringSchedule || {
        startTime: location.monitoringStartTime || '09:00:00',
        endTime: location.monitoringEndTime || '17:00:00',
        requiredDailyHours: 8.0,
      },
      assignmentStatus: 'active',
      assignedTimestamp: new Date().toISOString(),
      assignedBy: caller.id || caller.name || 'Mentor',
    };

    // 7. Update Student State
    student.company = location.companyName;
    student.role = roleTitle;
    student.internshipLocationId = location.id;
    student.internshipStartDate = params.startDate;
    student.internshipEndDate = params.endDate;
    student.mentorId = assignedMentorId;
    student.mentor = assignedMentorName;
    student.status = 'inProgress';
    if (assignedBatch) {
      student.batchId = assignedBatch.id;
      student.batchName = assignedBatch.batchName;
      assignedBatch.enrolledStudentCount = this.students.filter(s => s.batchId === assignedBatch.id).length;
    }

    // 8. Store and Persist
    this.assignments.unshift(record);
    this.persistToStorage();
    this.notifyListeners();

    // 9. Sync to Supabase
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('internship_assignments').insert({
          id: record.id,
          institution_id: record.institutionId,
          student_id: student.id,
          mentor_id: assignedMentorId,
          location_id: location.id,
          role_title: roleTitle,
          start_date: params.startDate,
          end_date: params.endDate,
          monitoring_start_time: record.monitoringSchedule.startTime,
          monitoring_end_time: record.monitoringSchedule.endTime,
          batch_id: record.batchId || null,
          batch_name: record.batchName || null,
          status: 'active',
          assigned_at: record.assignedTimestamp,
          assigned_by: record.assignedBy,
        });
      } catch (err) {
        console.warn('Supabase createInternshipAssignment insert note:', err);
      }
    }

    return record;
  }

  public getActiveAssignmentForStudent(studentId: string, caller?: AuthUser): InternshipAssignmentRecord | null {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        AuthorizationPolicy.validateStudentResourceAccess(caller, studentId);
      }
    }
    const cleanId = studentId.trim().toLowerCase();
    return this.assignments.find(a => 
      (a.studentId.toLowerCase() === cleanId || a.id.toLowerCase() === cleanId) && 
      a.assignmentStatus === 'active'
    ) || null;
  }

  public getAssignmentHistoryForStudent(studentId: string, caller?: AuthUser): InternshipAssignmentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        AuthorizationPolicy.validateStudentResourceAccess(caller, studentId);
      }
    }
    const cleanId = studentId.trim().toLowerCase();
    return this.assignments.filter(a => 
      a.studentId.toLowerCase() === cleanId || a.id.toLowerCase() === cleanId
    );
  }

  public getAllActiveAssignments(caller?: AuthUser): InternshipAssignmentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Security Violation: Students cannot inspect institution-wide active assignments.');
      }
      const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
      let baseList = this.assignments;
      if (!isPlatformOp && caller.institutionId) {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        baseList = baseList.filter(a => canonicalizeInstitutionId(a.institutionId) === callerInst);
      }
      if (caller.role === 'mentor') {
        const mentorDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').toUpperCase();
        const mentorId = (caller.mentorId || caller.id).toLowerCase();
        return baseList.filter(a => 
          a.assignmentStatus === 'active' && 
          (a.mentorId.toLowerCase() === mentorId || a.departmentCode.toUpperCase() === mentorDept)
        );
      }
      return baseList.filter(a => a.assignmentStatus === 'active');
    }
    return this.assignments.filter(a => a.assignmentStatus === 'active');
  }

  public async completeOrTerminateAssignment(
    assignmentId: string, 
    status: 'completed' | 'terminated', 
    caller: AuthUser
  ): Promise<InternshipAssignmentRecord> {
    AuthorizationPolicy.validateIdentity(caller);
    if (caller.role === 'student') {
      throw new ForbiddenException('Security Violation: Students cannot modify assignment status.');
    }

    const assignment = this.assignments.find(a => a.id === assignmentId);
    if (!assignment) {
      throw new Error(`Assignment with ID '${assignmentId}' was not found.`);
    }

    if (caller.role === 'mentor') {
      const student = this.getStudentById(assignment.studentId);
      if (student) {
        AuthorizationPolicy.validateMentorScope(caller, student);
      }
    }
    if (caller.role === 'hod') {
      const student = this.getStudentById(assignment.studentId);
      if (student) {
        AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
      }
    }

    assignment.assignmentStatus = status;
    
    // Update student progress & status
    const student = this.getStudentById(assignment.studentId);
    if (student) {
      if (status === 'completed') {
        student.status = 'completed';
        student.progress = 100;
      } else if (status === 'terminated') {
        student.status = 'delayed';
      }
    }

    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('internship_assignments')
          .update({
            status: status,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignmentId);
      } catch (err) {
        console.warn('Supabase update assignment status note:', err);
      }
    }

    return assignment;
  }

  public async assignInternship(
    assignment: { 
      studentId: string; 
      company: string; 
      role: string; 
      locationId?: string; 
      startDate: string; 
      endDate: string; 
      mentorId?: string; 
      mentorName?: string; 
      dailyHours?: number 
    }, 
    caller?: AuthUser
  ): Promise<StudentRecord> {
    const student = this.getStudentById(assignment.studentId);
    if (!student) {
      throw new Error(`Student with ID '${assignment.studentId}' was not found.`);
    }

    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateInstitutionScope(caller, student.institutionId);
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot assign internships.');
      }
      if (caller.role === 'mentor') {
        AuthorizationPolicy.validateMentorScope(caller, student);
      }
      if (caller.role === 'hod') {
        AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
      }
    }

    // Validate dates
    if (new Date(assignment.endDate) < new Date(assignment.startDate)) {
      throw new Error(`Invalid assignment date range: End date (${assignment.endDate}) cannot precede start date (${assignment.startDate}).`);
    }

    // If location provided, validate approval and tenant
    let resolvedLoc: any = null;
    if (assignment.locationId) {
      resolvedLoc = locationRepository.getLocationById(assignment.locationId);
      if (resolvedLoc && (resolvedLoc.status !== 'active' || !resolvedLoc.isActive)) {
        throw new Error(`Validation Error: Location '${resolvedLoc.locationName}' is not approved. Only approved locations can be assigned.`);
      }
      if (resolvedLoc && resolvedLoc.institutionId) {
        const studentInst = canonicalizeInstitutionId(student.institutionId);
        const locInst = canonicalizeInstitutionId(resolvedLoc.institutionId);
        if (locInst !== studentInst) {
          throw new ForbiddenException(`Tenant Isolation Violation: Location '${resolvedLoc.locationName}' belongs to institution '${resolvedLoc.institutionId}', cannot be assigned to student of '${student.institutionId}'.`);
        }
      }
    }

    // Archive or update existing active assignment to maintain clean history
    const existingActive = this.assignments.find(a => 
      (a.studentId.toLowerCase() === student.studentId.toLowerCase() || a.studentId.toLowerCase() === student.id.toLowerCase()) && 
      a.assignmentStatus === 'active'
    );
    if (existingActive) {
      existingActive.assignmentStatus = 'completed';
    }

    student.company = assignment.company.trim();
    student.role = assignment.role.trim();
    student.internshipLocationId = assignment.locationId;
    student.internshipStartDate = assignment.startDate;
    student.internshipEndDate = assignment.endDate;
    if (assignment.mentorId) student.mentorId = assignment.mentorId;
    if (assignment.mentorName) student.mentor = assignment.mentorName;
    student.status = 'inProgress';

    // Record new assignment in history
    const newRecord: InternshipAssignmentRecord = {
      id: `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: student.studentId,
      studentName: student.studentName,
      departmentCode: student.departmentCode,
      mentorId: student.mentorId,
      mentorName: student.mentor,
      mentorEmail: student.mentorEmail,
      locationId: assignment.locationId || 'custom-loc',
      locationName: resolvedLoc?.locationName || assignment.company,
      companyName: assignment.company.trim(),
      locationAddress: resolvedLoc?.address || 'Designated Workplace',
      geofenceRadiusMeters: resolvedLoc?.geofenceRadiusMeters || 200,
      latitude: resolvedLoc?.latitude || 12.8284,
      longitude: resolvedLoc?.longitude || 80.2198,
      roleTitle: assignment.role.trim(),
      startDate: assignment.startDate,
      endDate: assignment.endDate,
      monitoringSchedule: {
        startTime: resolvedLoc?.monitoringStartTime || '09:00:00',
        endTime: resolvedLoc?.monitoringEndTime || '17:00:00',
        requiredDailyHours: assignment.dailyHours || 8.0,
      },
      assignmentStatus: 'active',
      assignedTimestamp: new Date().toISOString(),
      assignedBy: caller ? (caller.id || caller.name || 'Mentor') : 'Mentor',
    };
    this.assignments.unshift(newRecord);

    this.persistToStorage();
    this.notifyListeners();

    // Push to Supabase internship_assignments
    const client = getSupabaseClient();
    if (client) {
      try {
        await client.from('internship_assignments').insert({
          id: newRecord.id,
          student_id: student.id,
          mentor_id: student.mentorId,
          location_id: assignment.locationId || null,
          role_title: assignment.role,
          start_date: assignment.startDate,
          end_date: assignment.endDate,
          monitoring_start_time: newRecord.monitoringSchedule.startTime,
          monitoring_end_time: newRecord.monitoringSchedule.endTime,
          status: 'active',
          assigned_at: newRecord.assignedTimestamp,
          assigned_by: newRecord.assignedBy,
        });
      } catch (err) {
        console.warn('Supabase internship assignment insert error:', err);
      }
    }

    return student;
  }

  // ====================================================
  // 6C. ATTENDANCE OVERVIEW & VERIFICATION (PHASE 4)
  // ====================================================
  public getAttendanceSessionsForScope(
    mentorId: string, 
    mentorDept: string, 
    caller?: AuthUser
  ): AttendanceSessionRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        const studentReg = (caller.studentId || caller.id).trim().toLowerCase();
        return this.attendanceSessions.filter(a => a.studentId.trim().toLowerCase() === studentReg);
      }
      if (caller.role === 'mentor') {
        const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
        const targetDept = (mentorDept || '').trim().toUpperCase();
        if (callerDept && targetDept && callerDept !== targetDept && targetDept !== 'ALL') {
          throw new ForbiddenException(`Access denied. Mentor cannot access attendance for department '${targetDept}'.`);
        }
      }
    }

    const normDept = (mentorDept || '').trim().toUpperCase();
    const normMentorId = (mentorId || '').trim().toLowerCase();

    return this.attendanceSessions.filter(sess => {
      const sessDept = (sess.departmentCode || '').trim().toUpperCase();
      // Match department
      if (normDept && normDept !== 'ALL' && sessDept === normDept) return true;
      // Match mentor's mentees
      const student = this.students.find(s => s.studentId.toLowerCase() === sess.studentId.toLowerCase());
      if (student && student.mentorId.toLowerCase() === normMentorId) return true;
      if (caller && (caller.role === 'hod' || caller.role === 'admin' || caller.role === 'super_admin')) {
        if (caller.role === 'hod') {
          const callerDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').trim().toUpperCase();
          if (callerDept && sessDept === callerDept) return true;
        } else {
          if (!normDept || normDept === 'ALL' || sessDept === normDept) return true;
        }
      }
      return false;
    });
  }

  public getAllAttendanceSessions(caller?: AuthUser): AttendanceSessionRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role !== 'admin' && caller.role !== 'super_admin') {
        throw new ForbiddenException('Access denied. Only Super Admin can access all institutional attendance sessions.');
      }
      const isPlatformOp = AuthorizationPolicy.isPlatformAdmin(caller);
      if (!isPlatformOp && caller.institutionId) {
        const callerInst = canonicalizeInstitutionId(caller.institutionId || caller.college);
        return this.attendanceSessions.filter(a => canonicalizeInstitutionId(a.institutionId) === callerInst);
      }
    }
    return [...this.attendanceSessions];
  }

  public async verifyAttendanceSession(
    sessionId: string, 
    isVerified: boolean, 
    remarks?: string, 
    caller?: AuthUser
  ): Promise<void> {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      if (caller.role === 'student') {
        throw new ForbiddenException('Security Violation: Students cannot modify verification outcomes.');
      }
    }

    const session = this.attendanceSessions.find(s => s.id === sessionId);
    if (!session) {
      throw new Error(`Attendance session '${sessionId}' was not found.`);
    }

    if (caller && caller.role === 'mentor') {
      const student = this.students.find(s => s.studentId.toLowerCase() === session.studentId.toLowerCase());
      if (student) {
        AuthorizationPolicy.validateMentorScope(caller, student);
      }
    }
    if (caller && caller.role === 'hod') {
      const student = this.students.find(s => s.studentId.toLowerCase() === session.studentId.toLowerCase());
      if (student) {
        AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
      }
    }

    session.isVerified = isVerified;
    if (remarks) {
      session.notes = session.notes ? `${session.notes} | ${remarks}` : remarks;
    }
    if (isVerified && session.geofenceStatus === 'pending') {
      session.geofenceStatus = 'verified';
    }

    this.persistToStorage();
    this.notifyListeners();

    const client = getSupabaseClient();
    if (client) {
      try {
        await client
          .from('attendance_sessions')
          .update({
            is_verified: isVerified,
            notes: session.notes,
            updated_at: new Date().toISOString(),
          })
          .eq('id', sessionId);
      } catch (err) {
        console.warn('Supabase attendance session update error:', err);
      }
    }
  }

  public async updateStudentMentor(
    studentId: string, 
    newMentorId: string, 
    newMentorName: string, 
    caller?: AuthUser
  ): Promise<void> {
    const student = this.getStudentById(studentId);
    if (!student) {
      throw new Error(`Student with ID '${studentId}' was not found.`);
    }

    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller, student.departmentCode);
      const studentDept = this.departments.find(d => d.code.toUpperCase() === student.departmentCode.toUpperCase());
      if (studentDept) {
        AuthorizationPolicy.validateDepartmentActive(studentDept, caller);
      }
    }

    // Cross-department mentor check
    const targetMentor = this.mentors.find(m => m.id.toLowerCase() === newMentorId.toLowerCase());
    if (targetMentor && caller && caller.role !== 'admin' && caller.role !== 'super_admin') {
      const mentorDept = targetMentor.departmentCode.toUpperCase();
      const studDept = student.departmentCode.toUpperCase();
      if (mentorDept !== studDept) {
        throw new ForbiddenException(
          `Cross-department mentor assignment forbidden. Mentor '${targetMentor.name}' (${mentorDept}) cannot supervise student in '${studDept}'.`
        );
      }
    }

    const index = this.students.findIndex(s => s.studentId === studentId || s.id === studentId);
    if (index !== -1) {
      this.students[index] = {
        ...this.students[index],
        mentorId: newMentorId,
        mentor: newMentorName,
      };
      this.persistToStorage();
      this.notifyListeners();

      const client = getSupabaseClient();
      if (client) {
        try {
          await client
            .from('students')
            .update({
              mentor_id: newMentorId,
              mentor_name: newMentorName,
            })
            .eq('student_id', this.students[index].studentId);
        } catch (err) {
          console.warn('Failed to sync mentor reassignment to Supabase:', err);
        }
      }
    }
  }

  public replaceDataset(newStudents: StudentRecord[]): void {
    this.students = this.normalizeStudentRecords(newStudents);
    this.persistToStorage();
    this.notifyListeners();
  }

  public clearAllDataset(): void {
    this.students = [];
    this.mentors = [];
    this.hods = [];
    this.departments = [];
    this.assignments = [];
    this.attendanceSessions = [];
    this.batches = [];
    this.transferHistory = [];
    this.persistToStorage();
    this.notifyListeners();
  }

  public resetToDefaults(): void {
    this.students = this.normalizeStudentRecords(DEFAULT_STUDENTS.map(s => ({ ...s })));
    this.mentors = DEFAULT_MENTORS.map(m => ({ ...m }));
    this.hods = DEFAULT_HODS.map(h => ({ ...h }));
    this.departments = DEFAULT_DEPARTMENTS.map(d => ({ ...d }));
    this.attendanceSessions = DEFAULT_ATTENDANCE_SESSIONS.map(s => ({ ...s }));
    this.assignments = DEFAULT_ASSIGNMENTS.map(a => ({ ...a }));
    this.batches = DEFAULT_INTERNSHIP_BATCHES.map(b => ({ ...b }));
    this.transferHistory = [];
    this.persistToStorage();
    this.notifyListeners();
  }
}

export const internshipRepository = new SupabaseIntegratedRepository();
