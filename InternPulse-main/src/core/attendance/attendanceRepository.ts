/**
 * Attendance Repository
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

import { AttendanceSession, AttendanceStatus } from './attendanceTypes';
import { AttendanceService, attendanceService } from './attendanceService';
import { getSupabaseClient } from '../../lib/supabase';

export interface AttendanceQueryFilter {
  studentId?: string;
  assignmentId?: string;
  departmentCode?: string;
  targetDate?: string;
  startDate?: string;
  endDate?: string;
  status?: AttendanceStatus;
  limit?: number;
}

export class AttendanceRepository {
  private service: AttendanceService;

  constructor(service: AttendanceService = attendanceService) {
    this.service = service;
  }

  public async getSessions(filter: AttendanceQueryFilter = {}): Promise<AttendanceSession[]> {
    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        let query = supabase.from('attendance_sessions').select('*');

        if (filter.studentId) {
          query = query.eq('student_id', filter.studentId);
        }
        if (filter.assignmentId) {
          query = query.eq('assignment_id', filter.assignmentId);
        }
        if (filter.targetDate) {
          query = query.eq('session_date', filter.targetDate);
        }
        if (filter.status) {
          query = query.eq('status', filter.status);
        }
        if (filter.startDate) {
          query = query.gte('session_date', filter.startDate);
        }
        if (filter.endDate) {
          query = query.lte('session_date', filter.endDate);
        }

        const res = await query.order('session_date', { ascending: false }).limit(filter.limit ?? 100);
        if (res.data) {
          return res.data as AttendanceSession[];
        }
      } catch (err) {
        console.warn('[AttendanceRepository] Supabase query note:', err);
      }
    }

    if (filter.studentId) {
      return this.service.getAttendanceHistory(filter.studentId, filter);
    }

    return this.service.getAssignedStudentAttendance([], filter);
  }
}

export const attendanceRepository = new AttendanceRepository();

