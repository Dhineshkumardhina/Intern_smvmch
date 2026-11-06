/**
 * ============================================================================
 * INTERNPULSE — PHASE 18E: ERROR TRACKING & OPERATIONAL TELEMETRY SERVICE
 * Aggregates, fingerprints, and categorizes operational errors, tenant security
 * violations, quota limits, and external integration failures across institutions.
 * ============================================================================
 */

import { ErrorTraceRecord } from './infrastructureTypes';
import { structuredLogger } from './structuredLogger';
import { canonicalizeInstitutionId } from '../../data/initialData';

export class ErrorTrackingService {
  private static instance: ErrorTrackingService;
  private errorTraces: Map<string, ErrorTraceRecord> = new Map();

  private constructor() {}

  public static getInstance(): ErrorTrackingService {
    if (!ErrorTrackingService.instance) {
      ErrorTrackingService.instance = new ErrorTrackingService();
    }
    return ErrorTrackingService.instance;
  }

  /**
   * Capture and aggregate error occurrence
   */
  public captureError(
    error: Error | string,
    context: {
      category?: ErrorTraceRecord['category'];
      institutionId?: string;
      endpoint?: string;
      statusCode?: number;
      metadata?: Record<string, any>;
    } = {}
  ): ErrorTraceRecord {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const errorStack = typeof error === 'string' ? undefined : error.stack;
    const category = context.category || 'SYSTEM_ERROR';
    const institutionId = context.institutionId ? canonicalizeInstitutionId(context.institutionId) : undefined;
    const endpoint = context.endpoint || 'unknown';
    const statusCode = context.statusCode || 500;

    // Error fingerprint key
    const fingerprint = `${category}:${errorMessage}:${endpoint}:${institutionId || 'global'}`;
    const now = new Date().toISOString();

    let record = this.errorTraces.get(fingerprint);

    if (record) {
      record.count += 1;
      record.lastSeenAt = now;
      record.statusCode = statusCode;
    } else {
      record = {
        id: `err-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        category,
        institutionId,
        endpoint,
        errorMessage,
        errorStack,
        statusCode,
        count: 1,
        firstSeenAt: now,
        lastSeenAt: now
      };
      this.errorTraces.set(fingerprint, record);
    }

    // Emit structured log
    const logLevel = category === 'TENANT_SECURITY_VIOLATION' || statusCode >= 500 ? 'ERROR' : 'WARN';
    structuredLogger.log({
      level: logLevel,
      service: 'error-tracker',
      event: category,
      message: errorMessage,
      institutionId,
      correlationId: `err-${record.id}`,
      metadata: {
        statusCode,
        endpoint,
        occurrenceCount: record.count,
        ...(context.metadata || {})
      },
      error: typeof error !== 'string' ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    });

    return record;
  }

  /**
   * Retrieve aggregated error traces, optionally filtered by institution
   */
  public getAggregatedErrors(rawInstitutionId?: string): ErrorTraceRecord[] {
    let traces = Array.from(this.errorTraces.values());

    if (rawInstitutionId) {
      const institutionId = canonicalizeInstitutionId(rawInstitutionId);
      traces = traces.filter(t => t.institutionId === institutionId);
    }

    return traces.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
  }

  /**
   * Clear error traces (for testing or reset)
   */
  public clearErrors(): void {
    this.errorTraces.clear();
  }
}

export const errorTrackingService = ErrorTrackingService.getInstance();

