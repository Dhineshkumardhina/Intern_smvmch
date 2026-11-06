/**
 * ============================================================================
 * INTERNPULSE — PHASE 18E: STRUCTURED DPDP-COMPLIANT LOGGING SERVICE
 * Implements high-throughput JSON logging, multi-tenant correlation IDs,
 * and automated anti-surveillance / privacy redaction for student telemetry.
 * ============================================================================
 */

import { StructuredLogEntry, LogLevel } from './infrastructureTypes';

const SENSITIVE_LOCATION_PATTERNS = [
  'latitude',
  'longitude',
  'targetlatitude',
  'targetlongitude',
  'lat',
  'lng',
  'coords',
  'coordinates',
  'rawlocation',
  'gpslocation',
  'currentlocation'
];

const SENSITIVE_SECRET_PATTERNS = [
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
  'apikey',
  'bearer',
  'access_token',
  'refresh_token',
  'sessiontoken',
  'authtoken'
];

export class StructuredLogger {
  private static instance: StructuredLogger;
  private logBuffer: StructuredLogEntry[] = [];
  private maxBufferSize: number = 1000;
  private isTestMode: boolean = true;

  private constructor() {}

  public static getInstance(): StructuredLogger {
    if (!StructuredLogger.instance) {
      StructuredLogger.instance = new StructuredLogger();
    }
    return StructuredLogger.instance;
  }

  /**
   * Deeply sanitizes payload to protect student privacy under DPDP Act 2023.
   * Strips exact GPS coordinates and credentials while preserving diagnostic metadata.
   */
  public sanitize(data: any): any {
    if (data === null || data === undefined) {
      return data;
    }

    if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitize(item));
    }

    if (typeof data === 'object') {
      const sanitized: Record<string, any> = {};

      for (const [key, value] of Object.entries(data)) {
        const lowerKey = key.toLowerCase();

        const isLocation = SENSITIVE_LOCATION_PATTERNS.some(p => 
          lowerKey === p || 
          lowerKey.endsWith(p) || 
          lowerKey.includes('latitude') || 
          lowerKey.includes('longitude') || 
          lowerKey.includes('location')
        );

        const isSecret = SENSITIVE_SECRET_PATTERNS.some(p => 
          lowerKey === p || 
          lowerKey.includes('token') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('password') || 
          lowerKey.includes('cookie')
        );

        if (isLocation) {
          sanitized[key] = '[REDACTED_DPDP_LOCATION]';
        } else if (isSecret) {
          sanitized[key] = '[REDACTED_SECRET]';
        } else if (lowerKey === 'accuracy' && typeof value === 'number') {
          // Coarsen accuracy into privacy-compliant buckets
          sanitized[key] = value <= 50 ? '<=50m' : '>50m';
        } else if (typeof value === 'object' && value !== null) {
          sanitized[key] = this.sanitize(value);
        } else {
          sanitized[key] = value;
        }
      }

      return sanitized;
    }

    return String(data);
  }

  /**
   * Core logging function
   */
  public log(entry: Omit<StructuredLogEntry, 'timestamp'>): StructuredLogEntry {
    const fullEntry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level: entry.level,
      service: entry.service,
      event: entry.event,
      message: entry.message,
      institutionId: entry.institutionId || null,
      institutionCode: entry.institutionCode || null,
      actorId: entry.actorId || null,
      actorRole: entry.actorRole || null,
      correlationId: entry.correlationId || `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      latencyMs: entry.latencyMs,
      metadata: entry.metadata ? this.sanitize(entry.metadata) : undefined,
      error: entry.error ? {
        name: entry.error.name,
        message: entry.error.message,
        stack: entry.error.stack ? entry.error.stack.split('\n').slice(0, 3).join('\n') : undefined
      } : undefined
    };

    // Store in circular buffer
    this.logBuffer.push(fullEntry);
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift();
    }

    // In production or console logging, emit formatted JSON
    if (!this.isTestMode) {
      console.log(JSON.stringify(fullEntry));
    }

    return fullEntry;
  }

  public debug(service: string, event: string, message: string, context: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ ...context, level: 'DEBUG', service, event, message, correlationId: context.correlationId || '' });
  }

  public info(service: string, event: string, message: string, context: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ ...context, level: 'INFO', service, event, message, correlationId: context.correlationId || '' });
  }

  public warn(service: string, event: string, message: string, context: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ ...context, level: 'WARN', service, event, message, correlationId: context.correlationId || '' });
  }

  public error(service: string, event: string, message: string, context: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ ...context, level: 'ERROR', service, event, message, correlationId: context.correlationId || '' });
  }

  public fatal(service: string, event: string, message: string, context: Partial<StructuredLogEntry> = {}): StructuredLogEntry {
    return this.log({ ...context, level: 'FATAL', service, event, message, correlationId: context.correlationId || '' });
  }

  public getRecentLogs(filter?: { institutionId?: string; level?: LogLevel; event?: string }): StructuredLogEntry[] {
    let logs = [...this.logBuffer];

    if (filter) {
      if (filter.institutionId) {
        logs = logs.filter(l => l.institutionId === filter.institutionId);
      }
      if (filter.level) {
        logs = logs.filter(l => l.level === filter.level);
      }
      if (filter.event) {
        logs = logs.filter(l => l.event === filter.event);
      }
    }

    return logs;
  }

  public clearLogs(): void {
    this.logBuffer = [];
  }
}

export const structuredLogger = StructuredLogger.getInstance();
