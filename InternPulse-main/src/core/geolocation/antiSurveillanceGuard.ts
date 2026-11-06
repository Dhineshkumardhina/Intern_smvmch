/**
 * Anti-Surveillance and Privacy Protection Guard
 * Sri Manakula Vinayagar Engineering College (SMVEC)
 *
 * Guarantees:
 * 1. NO Continuous Surveillance: Tracking is restricted strictly to active, authorized internship hours.
 * 2. Informed Consent: Student must explicitly grant consent before any telemetry is processed.
 * 3. Schedule Boundary Checking: Outside shift hours or internship date ranges, collection is prohibited.
 */

import { StudentConsent, AssignedGeofenceTarget } from './geolocationTypes';

export interface MonitoringScheduleValidation {
  isAuthorized: boolean;
  isWithinDateRange: boolean;
  isWithinDailyHours: boolean;
  reason?: string;
}

/**
 * Checks if the student has provided informed consent
 */
export function verifyStudentConsent(consent?: StudentConsent | null): boolean {
  if (!consent) return false;
  return Boolean(consent.consentGiven && consent.consentTimestamp);
}

/**
 * Parses time string (HH:MM or HH:MM:SS) into total minutes from midnight
 */
export function parseTimeToMinutes(timeStr: string): number {
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return -1;
  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);
  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return -1;
  }
  return hours * 60 + minutes;
}

/**
 * Evaluates whether a given timestamp falls within the authorized internship monitoring window
 */
export function evaluateMonitoringSchedule(
  target: AssignedGeofenceTarget,
  timestamp: string | Date = new Date()
): MonitoringScheduleValidation {
  const dateObj = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  if (isNaN(dateObj.getTime())) {
    return {
      isAuthorized: false,
      isWithinDateRange: false,
      isWithinDailyHours: false,
      reason: 'Invalid timestamp format',
    };
  }

  // 1. Check Date Range (YYYY-MM-DD)
  let isWithinDateRange = true;
  const dateStr = dateObj.toISOString().slice(0, 10);

  if (target.startDate && dateStr < target.startDate) {
    isWithinDateRange = false;
  }
  if (target.endDate && dateStr > target.endDate) {
    isWithinDateRange = false;
  }

  if (!isWithinDateRange) {
    return {
      isAuthorized: false,
      isWithinDateRange: false,
      isWithinDailyHours: false,
      reason: `Outside active internship date range (${target.startDate || 'start'} to ${target.endDate || 'end'})`,
    };
  }

  // 2. Check Daily Monitoring Hours (HH:MM:SS)
  // Convert current time to hours and minutes
  let isWithinDailyHours = true;
  if (target.monitoringStartTime && target.monitoringEndTime) {
    const startMinutes = parseTimeToMinutes(target.monitoringStartTime);
    const endMinutes = parseTimeToMinutes(target.monitoringEndTime);

    // Default to local/IST time components from ISO string or Date
    // Format to HH:MM in target timezone or direct time components
    const currentHours = dateObj.getUTCHours(); // or local hours depending on config
    const currentMinutes = dateObj.getUTCMinutes();
    
    // In IST (UTC + 5:30)
    const istMinutesTotal = (currentHours * 60 + currentMinutes + 330) % 1440;

    // Also support direct time match if timestamp is already local
    const localMinutesTotal = dateObj.getHours() * 60 + dateObj.getMinutes();

    // Check against either IST or local time matching schedule
    const matchesIST = istMinutesTotal >= startMinutes && istMinutesTotal <= endMinutes;
    const matchesLocal = localMinutesTotal >= startMinutes && localMinutesTotal <= endMinutes;

    if (!matchesIST && !matchesLocal) {
      isWithinDailyHours = false;
    }
  }

  if (!isWithinDailyHours) {
    return {
      isAuthorized: false,
      isWithinDateRange: true,
      isWithinDailyHours: false,
      reason: `Outside authorized daily monitoring schedule (${target.monitoringStartTime} - ${target.monitoringEndTime}). Continuous surveillance prohibited.`,
    };
  }

  return {
    isAuthorized: true,
    isWithinDateRange: true,
    isWithinDailyHours: true,
  };
}

