import { 
  StudentRecord, 
  MentorRecord, 
  HodRecord 
} from '../../data/initialData';
import { 
  getSupabaseClient, 
  isSupabaseConfigured, 
  DbStudent, 
  DbMentor, 
  DbHod 
} from '../../lib/supabase';

export interface IInternshipRepository {
  // Status
  isConfigured(): boolean;
  getSyncStatus(): { isSyncing: boolean; lastSyncTime: Date | null; error: string | null };

  // Scoped student access
  getStudentById(studentId: string): StudentRecord | null;
  getStudentsForStudent(studentId: string): StudentRecord[];
  getStudentsForMentor(mentorIdOrName: string): StudentRecord[];
  getStudentsForHod(departmentCode: string): StudentRecord[];
  getAllStudentsForAdmin(): StudentRecord[];

  // Scoped mentor access
  getMentorById(mentorId: string): MentorRecord | null;
  getMentorsForHod(departmentCode: string): MentorRecord[];
  getAllMentorsForAdmin(): MentorRecord[];

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
    }
  ): Promise<StudentRecord>;
  
  saveStudent(student: StudentRecord): Promise<void>;
  updateStudentMentor(studentId: string, newMentorId: string, newMentorName: string): Promise<void>;
  replaceDataset(newStudents: StudentRecord[]): void;
  clearAllDataset(): void;
  getAllStudents(): StudentRecord[];
}

const STORAGE_KEY = 'internpulse_students_store_v3';
const MENTORS_STORAGE_KEY = 'internpulse_mentors_store_v3';
const HODS_STORAGE_KEY = 'internpulse_hods_store_v3';

class SupabaseIntegratedRepository implements IInternshipRepository {
  private students: StudentRecord[] = [];
  private mentors: MentorRecord[] = [];
  private hods: HodRecord[] = [];
  private listeners: Set<() => void> = new Set();
  private isSyncing = false;
  private lastSyncTime: Date | null = null;
  private syncError: string | null = null;

  constructor() {
    // Clear legacy mock cached keys if any
    try {
      localStorage.removeItem('internpulse_dataset');
      localStorage.removeItem('internpulse_students_store_v2');
      localStorage.removeItem('internpulse_mentors_store_v2');
      localStorage.removeItem('internpulse_hods_store_v2');
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
      const savedStudents = localStorage.getItem(STORAGE_KEY);
      if (savedStudents) {
        const parsed = JSON.parse(savedStudents);
        if (Array.isArray(parsed)) {
          this.students = this.normalizeStudentRecords(parsed);
        }
      }

      const savedMentors = localStorage.getItem(MENTORS_STORAGE_KEY);
      if (savedMentors) {
        const parsed = JSON.parse(savedMentors);
        if (Array.isArray(parsed)) {
          this.mentors = parsed;
        }
      }

      const savedHods = localStorage.getItem(HODS_STORAGE_KEY);
      if (savedHods) {
        const parsed = JSON.parse(savedHods);
        if (Array.isArray(parsed)) {
          this.hods = parsed;
        }
      }
    } catch (e) {
      console.error('Error loading data from localStorage:', e);
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
        progress: typeof s.progress === 'number' ? s.progress : 0,
        hours: typeof s.hours === 'number' ? s.hours : 0,
        work: s.work || 'No logs submitted yet.',
        blocker: s.blocker || undefined,
        time: s.last_log_at ? new Date(s.last_log_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : (s.time || 'Recent'),
      };
    });
  }

  private persistToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.students));
      localStorage.setItem(MENTORS_STORAGE_KEY, JSON.stringify(this.mentors));
      localStorage.setItem(HODS_STORAGE_KEY, JSON.stringify(this.hods));
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
  public getStudentById(studentId: string): StudentRecord | null {
    if (!studentId) return null;
    const query = studentId.trim().toLowerCase();
    return this.students.find(s => s.studentId.toLowerCase() === query || s.id.toLowerCase() === query || (s.email && s.email.toLowerCase() === query)) || null;
  }

  public getStudentsForStudent(studentId: string): StudentRecord[] {
    const student = this.getStudentById(studentId);
    return student ? [student] : [];
  }

  // ====================================================
  // 2. MENTOR SCOPED DATA ACCESS (ONLY ASSIGNED STUDENTS)
  // ====================================================
  public getStudentsForMentor(mentorIdOrName: string): StudentRecord[] {
    if (!mentorIdOrName) return [];
    const query = mentorIdOrName.trim().toLowerCase();
    return this.students.filter(s => 
      s.mentorId?.toLowerCase() === query || 
      s.mentor.toLowerCase() === query
    );
  }

  // ====================================================
  // 3. HOD SCOPED DATA ACCESS (DEPARTMENT-SEPARATED)
  // ====================================================
  public getStudentsForHod(departmentCode: string): StudentRecord[] {
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
  public getAllStudentsForAdmin(): StudentRecord[] {
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
    }
  ): Promise<StudentRecord> {
    const index = this.students.findIndex(
      s => s.studentId.toLowerCase() === studentId.trim().toLowerCase() || s.id.toLowerCase() === studentId.trim().toLowerCase()
    );

    let current = index !== -1 ? this.students[index] : null;
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

  public async updateStudentMentor(studentId: string, newMentorId: string, newMentorName: string): Promise<void> {
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
    this.persistToStorage();
    this.notifyListeners();
  }
}

export const internshipRepository = new SupabaseIntegratedRepository();
