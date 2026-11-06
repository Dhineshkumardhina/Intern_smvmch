/**
 * Randomized Verification Window Generator
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Generates 5 unpredictable, fair, non-overlapping verification windows
 * distributed strictly within authorized daily internship monitoring hours.
 */

import {
  EligibleAssignment,
  VerificationScheduleWindow,
  ScheduleGenerationOptions,
} from './schedulerTypes';

export const DEFAULT_WINDOWS_PER_DAY = 5;
export const DEFAULT_WINDOW_DURATION_MINUTES = 15;
export const DEFAULT_MIN_BUFFER_MINUTES = 25;
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

/**
 * Parses "HH:MM" or "HH:MM:SS" string to minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) {
    throw new Error(`Invalid time format: "${timeStr}". Expected HH:MM or HH:MM:SS.`);
  }
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time components in: "${timeStr}".`);
  }
  return hours * 60 + minutes;
}

/**
 * Formats minutes from midnight to "HH:MM:SS"
 */
export function formatMinutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:00`;
}

/**
 * Returns UTC offset in minutes for supported timezones
 */
export function getTimezoneOffsetMinutes(timezone: string = DEFAULT_TIMEZONE): number {
  if (timezone === 'Asia/Kolkata' || timezone === 'IST') {
    return 330; // +05:30
  }
  if (timezone === 'UTC' || timezone === 'GMT') {
    return 0;
  }
  // Standard timezone parsing
  try {
    const now = new Date();
    const utcDate = new Date(now.toLocaleString('en-US', { timeZone: 'UTC' }));
    const tzDate = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
    return Math.round((tzDate.getTime() - utcDate.getTime()) / 60000);
  } catch {
    return 330; // Fallback to IST
  }
}

/**
 * Constructs an ISO 8601 UTC string from local date and local minutes from midnight
 */
export function constructIsoUtcTimestamp(
  targetDate: string,
  localMinutesFromMidnight: number,
  timezone: string = DEFAULT_TIMEZONE
): string {
  const [yearStr, monthStr, dayStr] = targetDate.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed
  const day = parseInt(dayStr, 10);

  const localHours = Math.floor(localMinutesFromMidnight / 60);
  const localMinutes = Math.floor(localMinutesFromMidnight % 60);
  const localSeconds = Math.floor((localMinutesFromMidnight * 60) % 60);

  // UTC offset in minutes
  const offsetMinutes = getTimezoneOffsetMinutes(timezone);

  // Compute UTC timestamp in milliseconds
  const utcMillis =
    Date.UTC(year, month, day, localHours, localMinutes, localSeconds) -
    offsetMinutes * 60 * 1000;

  return new Date(utcMillis).toISOString();
}

/**
 * Generates 5 randomized, non-overlapping verification windows for an eligible assignment
 */
export function generateRandomizedDailyWindows(
  assignment: EligibleAssignment,
  targetDate: string,
  options: ScheduleGenerationOptions = {}
): VerificationScheduleWindow[] {
  // 1. Eligibility Check: Status must be active
  if (assignment.assignmentStatus !== 'active') {
    return [];
  }

  // 2. Eligibility Check: Target date must be within assignment start and end dates
  if (assignment.startDate && targetDate < assignment.startDate) {
    return [];
  }
  if (assignment.endDate && targetDate > assignment.endDate) {
    return [];
  }

  const windowsCount = options.windowsPerDay ?? DEFAULT_WINDOWS_PER_DAY;
  const windowDuration = options.windowDurationMinutes ?? DEFAULT_WINDOW_DURATION_MINUTES;
  const minBuffer = options.minBufferBetweenWindowsMinutes ?? DEFAULT_MIN_BUFFER_MINUTES;
  const timezone = assignment.timezone ?? DEFAULT_TIMEZONE;

  const startMinutes = parseTimeToMinutes(assignment.monitoringStartTime);
  const endMinutes = parseTimeToMinutes(assignment.monitoringEndTime);

  const totalShiftMinutes = endMinutes - startMinutes;
  if (totalShiftMinutes <= 0) {
    throw new Error(
      `Invalid monitoring shift: Start (${assignment.monitoringStartTime}) must be before End (${assignment.monitoringEndTime}).`
    );
  }

  const totalRequiredMinMinutes = windowsCount * windowDuration + (windowsCount - 1) * minBuffer;
  if (totalShiftMinutes < totalRequiredMinMinutes) {
    throw new Error(
      `Monitoring shift duration (${totalShiftMinutes} mins) is too brief for ${windowsCount} windows of ${windowDuration} mins with ${minBuffer} mins buffer.`
    );
  }

  // 3. Stratified Random Jitter Distribution
  // Divide the shift into N strata to guarantee distribution across the full workday
  const stratumSize = totalShiftMinutes / windowsCount;
  const generatedWindows: VerificationScheduleWindow[] = [];
  const nowIso = new Date().toISOString();

  // Pseudo-random generator (supports optional seed for reproducible testing)
  let seed = options.randomSeed ?? (Date.now() + Math.random() * 100000);
  const pseudoRandom = () => {
    if (options.randomSeed !== undefined) {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    }
    return Math.random();
  };

  let previousWindowEndMinute = startMinutes;

  for (let i = 0; i < windowsCount; i++) {
    const stratumStart = startMinutes + i * stratumSize;
    const stratumEnd = startMinutes + (i + 1) * stratumSize;

    // Earliest possible start for window i (must respect buffer from previous window)
    const earliestStart = i === 0 ? stratumStart : Math.max(stratumStart, previousWindowEndMinute + minBuffer);

    // Latest possible start (window must finish before or at stratumEnd, and never exceed shift end)
    const latestStart = Math.min(stratumEnd - windowDuration, endMinutes - windowDuration);

    let windowStartMinute: number;
    if (latestStart > earliestStart) {
      // Apply unpredictable jitter within stratum bounds
      const jitterRange = latestStart - earliestStart;
      const jitter = Math.floor(pseudoRandom() * (jitterRange + 1));
      windowStartMinute = earliestStart + jitter;
    } else {
      windowStartMinute = earliestStart;
    }

    const windowEndMinute = windowStartMinute + windowDuration;
    previousWindowEndMinute = windowEndMinute;

    const startIso = constructIsoUtcTimestamp(targetDate, windowStartMinute, timezone);
    const endIso = constructIsoUtcTimestamp(targetDate, windowEndMinute, timezone);

    generatedWindows.push({
      id: `sch-${assignment.assignmentId}-${targetDate}-w${i + 1}`,
      assignmentId: assignment.assignmentId,
      studentId: assignment.studentId,
      institutionId: assignment.institutionId || 'inst-smvec-001',
      targetDate,
      windowStart: startIso,
      windowEnd: endIso,
      status: 'SCHEDULED',
      retryCount: 0,
      maxRetries: 3,
      timezone,
      windowIndex: i + 1,
      createdAt: nowIso,
      updatedAt: nowIso,
    });
  }

  return generatedWindows;
}
