/**
 * ============================================================================
 * INTERNPULSE — PHASE 19B: SUBSCRIPTION LIFECYCLE STATE MACHINE
 * Formal state transition rules, operational permissions, dunning gates,
 * and educational duty of care enforcement for academic institutions.
 * ============================================================================
 */

import { SubscriptionState, SubscriptionStateException } from './commercialTypes';

export class SubscriptionStateMachine {
  /**
   * Deterministic transition matrix defining permissible state migrations.
   */
  private static readonly TRANSITION_MATRIX: Record<SubscriptionState, SubscriptionState[]> = {
    TRIAL: ['ACTIVE', 'EXPIRED', 'CANCELLED'],
    ACTIVE: ['PAST_DUE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED', 'EXPIRED'],
    PAST_DUE: ['ACTIVE', 'GRACE_PERIOD', 'SUSPENDED', 'CANCELLED'],
    GRACE_PERIOD: ['ACTIVE', 'SUSPENDED', 'CANCELLED'],
    SUSPENDED: ['ACTIVE', 'CANCELLED', 'EXPIRED'],
    EXPIRED: ['ACTIVE', 'CANCELLED'],
    CANCELLED: ['ACTIVE'], // Reinstatement by platform super admin only
  };

  /**
   * Check whether a transition from one state to another is permissible.
   */
  public static canTransition(from: SubscriptionState, to: SubscriptionState): boolean {
    if (from === to) {
      return true; // No-op transition is always valid
    }
    const allowed = this.TRANSITION_MATRIX[from];
    return Array.isArray(allowed) && allowed.includes(to);
  }

  /**
   * Validates state transition, throwing a detailed SubscriptionStateException if illegal.
   */
  public static validateTransition(from: SubscriptionState, to: SubscriptionState): void {
    if (from === to) return;

    if (!this.canTransition(from, to)) {
      const allowed = this.getAllowedNextStates(from);
      throw new SubscriptionStateException(
        `Illegal subscription state transition from '${from}' to '${to}'. Allowed transitions from '${from}': [${allowed.join(', ')}].`
      );
    }
  }

  /**
   * Return the list of valid next states from a given status.
   */
  public static getAllowedNextStates(current: SubscriptionState): SubscriptionState[] {
    return this.TRANSITION_MATRIX[current] ? [...this.TRANSITION_MATRIX[current]] : [];
  }

  /**
   * Determines if the subscription is operationally active for standard operations.
   * TRIAL, ACTIVE, and GRACE_PERIOD are considered operationally live.
   */
  public static isOperationallyActive(status: SubscriptionState): boolean {
    return status === 'ACTIVE' || status === 'TRIAL' || status === 'GRACE_PERIOD';
  }

  /**
   * Educational Duty of Care:
   * Student attendance verification windows and geofence check-ins MUST continue
   * during GRACE_PERIOD and PAST_DUE so ongoing student internship degree credits
   * are never compromised by administrative or invoice payment delays.
   */
  public static isStudentVerificationPermitted(status: SubscriptionState): boolean {
    return (
      status === 'ACTIVE' ||
      status === 'TRIAL' ||
      status === 'PAST_DUE' ||
      status === 'GRACE_PERIOD'
    );
  }

  /**
   * Resource provisioning (creating new departments, importing new student cohorts,
   * assigning mentors) is permitted only when strictly in good standing (ACTIVE or TRIAL).
   */
  public static isResourceProvisioningPermitted(status: SubscriptionState): boolean {
    return status === 'ACTIVE' || status === 'TRIAL';
  }

  /**
   * Determines if the institution is in a read-only governance mode.
   * When SUSPENDED, EXPIRED, or CANCELLED, administrative logbook exports
   * and DPDP compliance reports remain readable, but all write mutations are blocked.
   */
  public static isReadOnlyMode(status: SubscriptionState): boolean {
    return status === 'SUSPENDED' || status === 'EXPIRED' || status === 'CANCELLED';
  }
}

