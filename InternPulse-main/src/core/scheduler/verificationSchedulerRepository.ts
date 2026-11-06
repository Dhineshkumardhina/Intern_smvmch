/**
 * Verification Scheduler Repository
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 */

import {
  VerificationScheduleWindow,
  ScheduleVerificationState,
} from './schedulerTypes';
import { getSupabaseClient } from '../../lib/supabase';

export class VerificationSchedulerRepository {
  private localSchedules: VerificationScheduleWindow[] = [];

  public async saveSchedules(schedules: VerificationScheduleWindow[]): Promise<void> {
    for (const sched of schedules) {
      const idx = this.localSchedules.findIndex((s) => s.id === sched.id);
      if (idx >= 0) {
        this.localSchedules[idx] = sched;
      } else {
        this.localSchedules.push(sched);
      }
    }

    const supabase = getSupabaseClient();
    if (supabase) {
      try {
        const rows = schedules.map((s) => ({
          id: s.id,
          assignment_id: s.assignmentId,
          student_id: s.studentId,
          target_date: s.targetDate,
          window_start: s.windowStart,
          window_end: s.windowEnd,
          status: s.status,
          retry_count: s.retryCount,
          max_retries: s.maxRetries,
          timezone: s.timezone,
        }));
        await supabase.from('verification_schedules').upsert(rows);
      } catch (err) {
        console.warn('[VerificationSchedulerRepository] Supabase persistence note:', err);
      }
    }
  }

  public async getSchedules(filter: {
    studentId?: string;
    assignmentId?: string;
    targetDate?: string;
    status?: ScheduleVerificationState;
  } = {}): Promise<VerificationScheduleWindow[]> {
    return this.localSchedules.filter((s) => {
      if (filter.studentId && s.studentId !== filter.studentId) return false;
      if (filter.assignmentId && s.assignmentId !== filter.assignmentId) return false;
      if (filter.targetDate && s.targetDate !== filter.targetDate) return false;
      if (filter.status && s.status !== filter.status) return false;
      return true;
    });
  }

  public async updateStatus(
    scheduleId: string,
    status: ScheduleVerificationState,
    meta: Partial<VerificationScheduleWindow> = {}
  ): Promise<VerificationScheduleWindow | null> {
    const item = this.localSchedules.find((s) => s.id === scheduleId);
    if (!item) return null;

    item.status = status;
    item.updatedAt = new Date().toISOString();
    Object.assign(item, meta);

    return item;
  }
}

export const verificationSchedulerRepository = new VerificationSchedulerRepository();

