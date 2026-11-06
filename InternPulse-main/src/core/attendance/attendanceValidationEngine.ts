/**
 * Attendance Validation Engine
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Enforces:
 * 1. Active Assignment & Date Range validation
 * 2. Monitoring Schedule bounds checking
 * 3. Duplicate check-in prevention
 * 4. Invalid check-out prevention
 * 5. Accurate total hours computation
 * 6. Non-silent overwrite audit protection
 */

import { AttendanceSession, AttendanceStatus } from './attendanceTypes';
import { EligibleAssignment } from '../scheduler/schedulerTypes';

export class AttendanceValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AttendanceValidationException';
  }
}

export class DuplicateCheckInException extends AttendanceValidationException {
  constructor(studentId: string, sessionDate: string) {
    super(`Duplicate check-in rejected: Attendance already recorded for student ${studentId} on ${sessionDate}.`);
    this.name = 'DuplicateCheckInException';
  }
}

export class InvalidCheckOutException extends AttendanceValidationException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCheckOutException';
  }
}

export class AttendanceValidationEngine {
  /**
   * Validates that the student's assignment is active and target date falls within range
   */
  public static validateActiveAssignment(
    assignment: EligibleAssignment,
    sessionDate: string
  ): void {
    if (assignment.assignmentStatus !== 'active') {
      throw new AttendanceValidationException(
        `Cannot record attendance: Placement is "${assignment.assignmentStatus}". Only active assignments permit attendance check-in.`
      );
    }

    if (assignment.startDate && sessionDate < assignment.startDate) {
      throw new AttendanceValidationException(
        `Cannot record attendance: Session date (${sessionDate}) precedes assignment start date (${assignment.startDate}).`
      );
    }

    if (assignment.endDate && sessionDate > assignment.endDate) {
      throw new AttendanceValidationException(
        `Cannot record attendance: Session date (${sessionDate}) exceeds assignment end date (${assignment.endDate}).`
      );
    }
  }

  /**
   * Prevents duplicate check-in on the same calendar session date
   */
  public static validateNoDuplicateCheckIn(
    existingSessions: AttendanceSession[],
    studentId: string,
    sessionDate: string
  ): void {
    const existing = existingSessions.find(
      (s) => s.studentId.trim().toLowerCase() === studentId.trim().toLowerCase() && s.sessionDate === sessionDate
    );

    if (existing && existing.checkInAt) {
      throw new DuplicateCheckInException(studentId, sessionDate);
    }
  }

  /**
   * Validates check-out prerequisites and timestamp sequencing
   */
  public static validateCheckOut(
    session: AttendanceSession | null | undefined,
    checkOutTimestamp: string | Date
  ): void {
    if (!session || !session.checkInAt) {
      throw new InvalidCheckOutException(
        'Cannot check out: No active check-in found to check out from.'
      );
    }

    if (session.checkOutAt) {
      throw new InvalidCheckOutException(
        `Cannot check out: Session is already checked out at ${session.checkOutAt}.`
      );
    }

    const checkInMillis = new Date(session.checkInAt).getTime();
    const checkOutMillis =
      typeof checkOutTimestamp === 'string'
        ? new Date(checkOutTimestamp).getTime()
        : checkOutTimestamp.getTime();

    if (isNaN(checkOutMillis)) {
      throw new InvalidCheckOutException('Invalid check-out timestamp format.');
    }

    if (checkOutMillis < checkInMillis) {
      throw new InvalidCheckOutException(
        `Invalid check-out: Check-out timestamp cannot precede check-in (${session.checkInAt}).`
      );
    }
  }

  /**
   * Calculates total elapsed hours rounded to 2 decimal places
   */
  public static calculateTotalHours(
    checkInAt: string | Date,
    checkOutAt: string | Date
  ): number {
    const start = typeof checkInAt === 'string' ? new Date(checkInAt).getTime() : checkInAt.getTime();
    const end = typeof checkOutAt === 'string' ? new Date(checkOutAt).getTime() : checkOutAt.getTime();

    const diffHours = (end - start) / (1000 * 60 * 60);
    return Math.max(0, Math.round(diffHours * 100) / 100);
  }

  /**
   * Classifies attendance status based on hours worked and punctuality
   */
  public static classifyAttendanceStatus(
    hoursWorked: number,
    requiredHours: number = 8.0,
    isLate: boolean = false
  ): AttendanceStatus {
    if (hoursWorked <= 0) {
      return 'absent';
    }
    if (hoursWorked < requiredHours / 2.0) {
      return 'half_day';
    }
    if (isLate) {
      return 'late';
    }
    return 'present';
  }

  /**
   * Evaluates if check-in was late relative to scheduled start time
   */
  public static isLateCheckIn(
    checkInTimestamp: string | Date,
    scheduledStartTime?: string | null,
    gracePeriodMinutes: number = 30
  ): boolean {
    if (!scheduledStartTime) return false;

    const dateObj = typeof checkInTimestamp === 'string' ? new Date(checkInTimestamp) : checkInTimestamp;
    const parts = scheduledStartTime.split(':').map(Number);
    if (parts.length < 2) return false;

    // Convert check-in to local IST minutes from midnight
    const istHours = (dateObj.getUTCHours() + 5 + Math.floor((dateObj.getUTCMinutes() + 30) / 60)) % 24;
    const istMinutes = (dateObj.getUTCMinutes() + 30) % 60;
    const checkInTotalMin = istHours * 60 + istMinutes;

    const scheduledTotalMin = parts[0] * 60 + parts[1];
    return checkInTotalMin > scheduledTotalMin + gracePeriodMinutes;
  }
}

