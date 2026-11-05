import { 
  StudentRecord, 
  MentorRecord, 
  HodRecord,
  AttendanceSessionRecord,
  InternshipAssignmentRecord,
  DEFAULT_STUDENTS,
  DEFAULT_MENTORS,
  DEFAULT_HODS,
  DEFAULT_ATTENDANCE_SESSIONS,
  DEFAULT_ASSIGNMENTS
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
  }, caller: AuthUser): Promise<InternshipAssignmentRecord>;

  getActiveAssignmentForStudent(studentId: string, caller?: AuthUser): InternshipAssignmentRecord | null;
  getAssignmentHistoryForStudent(studentId: string, caller?: AuthUser): InternshipAssignmentRecord[];
  getAllActiveAssignments(caller?: AuthUser): InternshipAssignmentRecord[];
  completeOrTerminateAssignment(assignmentId: string, status: 'completed' | 'terminated', caller: AuthUser): Promise<InternshipAssignmentRecord>;

  // Attendance Overview & Verification
  getAttendanceSessionsForScope(mentorId: string, mentorDept: string, caller?: AuthUser): AttendanceSessionRecord[];
  verifyAttendanceSession(sessionId: string, isVerified: boolean, remarks?: string, caller?: AuthUser): Promise<void>;

  // Scoped mentor access
  getMentorById(mentorId: string): MentorRecord | null;
  getMentorsForHod(departmentCode: string, caller?: AuthUser): MentorRecord[];
  getAllMentorsForAdmin(caller?: AuthUser): MentorRecord[];

  // HOD access
  getAllHods(): HodRecord[];
  getHodByDepartment(departmentCode: string): HodRecord | null;

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
  updateStudentMentor(studentId: string, newMentorId: string, newMentorName: string, caller?: AuthUser): Promise<void>;
  replaceDataset(newStudents: StudentRecord[]): void;
  clearAllDataset(): void;
  getAllStudents(): StudentRecord[];
}

const STORAGE_KEY = 'internpulse_students_store_v3';
const MENTORS_STORAGE_KEY = 'internpulse_mentors_store_v3';
const HODS_STORAGE_KEY = 'internpulse_hods_store_v3';
const ATTENDANCE_STORAGE_KEY = 'internpulse_attendance_store_v1';
const ASSIGNMENTS_STORAGE_KEY = 'internpulse_assignments_store_v1';

class SupabaseIntegratedRepository implements IInternshipRepository {
  private students: StudentRecord[] = [];
  private mentors: MentorRecord[] = [];
  private hods: HodRecord[] = [];
  private attendanceSessions: AttendanceSessionRecord[] = [];
  private assignments: InternshipAssignmentRecord[] = [];
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
        this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
        this.mentors = [...DEFAULT_MENTORS];
        this.hods = [...DEFAULT_HODS];
        this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
        this.assignments = [...DEFAULT_ASSIGNMENTS];
        return;
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
    } catch (e) {
      console.error('Error loading data from localStorage:', e);
      this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
      this.mentors = [...DEFAULT_MENTORS];
      this.hods = [...DEFAULT_HODS];
      this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
      this.assignments = [...DEFAULT_ASSIGNMENTS];
    }
  }

  private normalizeStudentRecords(records: any[]): StudentRecord[] {
    return records.map((s, index) => {
      const deptCode = (s.department_code || s.departmentCode || s.dept || 'CSEBS').toUpperCase();
      const mentorName = s.mentor_name || s.mentor || 'Faculty Mentor';
      const mentorId = s.mentor_id || s.mentorId || 'MENTOR_001';

      return {
        id: s.id || s.student_id || s.studentId || `ST_${index + 1}`,
        studentId: s.student_id || s.studentId || s.id || `STUDENT_${index + 1}`,
        studentName: s.student_name || s.studentName || s.name || 'Student Intern',
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
      };
    });
  }

  private persistToStorage(): void {
    try {
      if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.students));
      localStorage.setItem(MENTORS_STORAGE_KEY, JSON.stringify(this.mentors));
      localStorage.setItem(HODS_STORAGE_KEY, JSON.stringify(this.hods));
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(this.attendanceSessions));
      localStorage.setItem(ASSIGNMENTS_STORAGE_KEY, JSON.stringify(this.assignments));
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

      // Assigned directly
      if (normMentorId && (sMentorId === normMentorId || (caller && sMentorName === caller.name.trim().toLowerCase()))) {
        return true;
      }

      // Department scope
      if (normDept && normDept !== 'ALL' && sDept === normDept) {
        return true;
      }

      // If caller is HOD / Admin and asked for ALL or specific dept
      if (caller && (caller.role === 'hod' || caller.role === 'admin')) {
        if (!normDept || normDept === 'ALL' || sDept === normDept) {
          return true;
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
    }
    if (!departmentCode) return [];
    const dept = departmentCode.trim().toUpperCase();
    return this.students.filter(s => 
      s.departmentCode.toUpperCase() === dept || 
      s.dept.toUpperCase() === dept
    );
  }

  public getMentorsForHod(departmentCode: string): MentorRecord[] {
    const dept = (departmentCode || 'CSEBS').trim().toUpperCase();
    
    // Filter mentors belonging to this department
    const deptMentors = this.mentors.filter(m => 
      m.departmentCode.toUpperCase() === dept || 
      m.departmentCodes.some(d => d.toUpperCase() === dept)
    );

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
  // 5. ADMIN SCOPED DATA ACCESS
  // ====================================================
  public getAllStudentsForAdmin(caller?: AuthUser): StudentRecord[] {
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller);
    }
    return [...this.students];
  }

  public getAllMentorsForAdmin(): MentorRecord[] {
    return this.mentors.map(m => {
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

  public async saveStudent(student: StudentRecord): Promise<void> {
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
    }

    // 1. Validate Register Number
    const regNo = (studentData.studentId || '').trim();
    if (!regNo) {
      throw new Error('Register number is required for student onboarding.');
    }
    const duplicateReg = this.students.find(s => s.studentId.trim().toLowerCase() === regNo.toLowerCase());
    if (duplicateReg) {
      throw new Error(`Duplicate Register Number: A student with register number '${regNo}' already exists (${duplicateReg.studentName}).`);
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
    const duplicateEmail = this.students.find(s => (s.email || '').trim().toLowerCase() === email);
    if (duplicateEmail) {
      throw new Error(`Duplicate Email: A student with email address '${email}' already exists (${duplicateEmail.studentName}).`);
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

      // Check duplicate regNo
      const regLower = row.studentId.trim().toLowerCase();
      if (this.students.some(s => s.studentId.trim().toLowerCase() === regLower)) {
        continue; // duplicate guard
      }

      // Check duplicate email
      const emailLower = (row.email || '').trim().toLowerCase();
      if (emailLower && this.students.some(s => (s.email || '').trim().toLowerCase() === emailLower)) {
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

    if (caller.role === 'mentor') {
      AuthorizationPolicy.validateMentorScope(caller, student);
    }

    // 3. Validation: Only Approved Locations Can Be Assigned
    const location = locationRepository.getLocationById(params.locationId);
    if (!location) {
      throw new Error(`Validation Error: Internship location '${params.locationId}' was not found.`);
    }
    if (location.status !== 'active' || !location.isActive) {
      throw new Error(`Validation Error: Location '${location.locationName}' is not approved (status: ${location.status}, isActive: ${location.isActive}). Only approved locations can be assigned.`);
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

    // 6. Build Assignment Record
    const assignmentId = `asgn-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const assignedMentorId = params.mentorId || (caller.role === 'mentor' ? (caller.mentorId || caller.id) : student.mentorId);
    const assignedMentorName = params.mentorName || (caller.role === 'mentor' ? caller.name : student.mentor);
    const roleTitle = (params.roleTitle || 'Intern').trim();

    const record: InternshipAssignmentRecord = {
      id: assignmentId,
      studentId: student.studentId,
      studentName: student.studentName,
      departmentCode: student.departmentCode,
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
          student_id: student.id,
          mentor_id: assignedMentorId,
          location_id: location.id,
          role_title: roleTitle,
          start_date: params.startDate,
          end_date: params.endDate,
          monitoring_start_time: record.monitoringSchedule.startTime,
          monitoring_end_time: record.monitoringSchedule.endTime,
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
      if (caller.role === 'mentor') {
        const mentorDept = (caller.departmentCode || caller.dept?.split(' ')[0] || '').toUpperCase();
        const mentorId = (caller.mentorId || caller.id).toLowerCase();
        return this.assignments.filter(a => 
          a.assignmentStatus === 'active' && 
          (a.mentorId.toLowerCase() === mentorId || a.departmentCode.toUpperCase() === mentorDept)
        );
      }
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
      if (caller.role === 'student') {
        throw new ForbiddenException('Access denied. Students cannot assign internships.');
      }
      if (caller.role === 'mentor') {
        AuthorizationPolicy.validateMentorScope(caller, student);
      }
    }

    // Validate dates
    if (new Date(assignment.endDate) < new Date(assignment.startDate)) {
      throw new Error(`Invalid assignment date range: End date (${assignment.endDate}) cannot precede start date (${assignment.startDate}).`);
    }

    // If location provided, validate approval
    let resolvedLoc: any = null;
    if (assignment.locationId) {
      resolvedLoc = locationRepository.getLocationById(assignment.locationId);
      if (resolvedLoc && (resolvedLoc.status !== 'active' || !resolvedLoc.isActive)) {
        throw new Error(`Validation Error: Location '${resolvedLoc.locationName}' is not approved. Only approved locations can be assigned.`);
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
      if (caller && (caller.role === 'hod' || caller.role === 'admin')) {
        if (!normDept || normDept === 'ALL' || sessDept === normDept) return true;
      }
      return false;
    });
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
    if (caller !== undefined) {
      AuthorizationPolicy.validateIdentity(caller);
      AuthorizationPolicy.validateHodScope(caller);
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
    this.assignments = [];
    this.attendanceSessions = [];
    this.persistToStorage();
    this.notifyListeners();
  }

  public resetToDefaults(): void {
    this.students = this.normalizeStudentRecords([...DEFAULT_STUDENTS]);
    this.mentors = [...DEFAULT_MENTORS];
    this.hods = [...DEFAULT_HODS];
    this.attendanceSessions = [...DEFAULT_ATTENDANCE_SESSIONS];
    this.assignments = [...DEFAULT_ASSIGNMENTS];
    this.persistToStorage();
    this.notifyListeners();
  }
}

export const internshipRepository = new SupabaseIntegratedRepository();
