/**
 * ============================================================================
 * INTERNPULSE — PHASE 19D: CRYPTOGRAPHIC UTILITIES & SIGNATURE VERIFIERS
 * Constant-Time HMAC-SHA256 Signature Generation & Verification
 * Hardened Against Timing Side-Channel Attacks.
 * ============================================================================
 */

import * as crypto from 'crypto';

export class CryptoUtils {
  /**
   * Generates a hex-encoded HMAC-SHA256 digest of the given data using the secret.
   */
  public static generateHmacSha256(data: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(data, 'utf8').digest('hex');
  }

  /**
   * Constant-time comparison of two signature strings to prevent timing attacks.
   */
  public static timingSafeCompare(a: string, b: string): boolean {
    if (typeof a !== 'string' || typeof b !== 'string') {
      return false;
    }

    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');

    if (bufA.length !== bufB.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(bufA, bufB);
    } catch {
      // Fallback constant-time XOR comparison if buffers have issues
      let result = 0;
      for (let i = 0; i < bufA.length; i++) {
        result |= bufA[i] ^ bufB[i];
      }
      return result === 0;
    }
  }

  /**
   * Verifies an HMAC-SHA256 signature in constant time.
   */
  public static verifyHmacSha256(data: string, expectedSignature: string, secret: string): boolean {
    if (!data || !expectedSignature || !secret) {
      return false;
    }
    const computed = this.generateHmacSha256(data, secret);
    return this.timingSafeCompare(computed, expectedSignature);
  }
}

