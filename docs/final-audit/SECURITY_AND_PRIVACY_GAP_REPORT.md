# INTERNPULSE — SECURITY AND PRIVACY GAP REPORT
## Zero-Trust Audit, DPDP Act 2023 Compliance & Cryptographic Assessment

**Document Reference:** `docs/final-audit/SECURITY_AND_PRIVACY_GAP_REPORT.md`  
**Audit Target:** Application Security, RLS Database Policies, Cryptography, and Privacy Controls  
**Legal Frameworks Evaluated:** India Digital Personal Data Protection (DPDP) Act 2023, RBI Payment Mandates, PCI-DSS Scope Minimization  
**Audit Status:** Completed  

---

## 1. Executive Summary

InternPulse's server-side architecture exhibits robust security design patterns: zero-trust Row-Level Security (RLS) across 63 tables, cryptographic HMAC-SHA256 signature verification with constant-time equality comparisons, role-based access control (RBAC) enforced server-side, and strict multi-tenant isolation.

However, forensic inspection reveals several critical security and privacy gaps that must be remediated prior to processing real student biometric or live location telemetry:
1. **Frontend Type Safety Breakdown:** `tsc --noEmit` fails with 50+ type errors, creating runtime vulnerability risks if unvalidated objects bypass TypeScript compilation.
2. **Hardcoded Coordinates in Client Code:** Static coordinates in `mobile_location_service.dart` (`12.8284, 80.2198`) bypass location spoofing detection.
3. **Unscheduled Cloud Background Daemon:** Window transition and expiration procedures in PostgreSQL rely on external invocation rather than a hardened, isolated internal daemon.
4. **Mocked Firebase Dispatcher:** `fcmGateway.ts` runs in simulated mode, leaving push authorization tokens and device authentication keys unvalidated against Google Firebase APIs.

---

## 2. Authentication & Authorization (RBAC) Audit

### 2.1 Strengths Verified:
- **Authoritative Profile Binding:** `ProductionSupabaseAuthService` queries the database `profiles` table to resolve user roles, preventing client-side JWT claims manipulation or email-domain heuristic guessing.
- **Immediate Inactive Account Revocation:** Both login and `restoreSession()` explicitly assert `is_active === true`. Deactivated accounts trigger an immediate `auth.signOut()` and session destruction.
- **Defense-in-Depth RBAC:** `AuthorizationPolicy` validates caller identity, active status, and role hierarchies (`student`, `mentor`, `hod`, `admin`, `super_admin`, `platform_super_admin`) on every repository and service call.
- **Tenant Scope Enforcement:** Any cross-tenant resource access (e.g., SMVEC user attempting to query SMVMCH or PEC records) throws a `ForbiddenException`.

### 2.2 Residual Gaps Identified:
- **Client Fallback Storage Cache:** When Supabase connection experiences network timeouts, `internshipRepository.ts` falls back to browser `localStorage` (`internpulse_students_store_v3`). In unmanaged lab environments, local storage can be inspected via browser developer tools.
- **Recommendation:** Encrypt cached offline data in `IndexedDB` using Web Crypto API (`AES-GCM-256`) with a key derived from user session credentials.

---

## 3. Database Security & Row Level Security (RLS)

### 3.1 RLS Coverage:
- **Total Tables with RLS Enabled:** 63 tables across 24 migrations.
- **Total Security Policies:** 206 `CREATE POLICY` statements.
- **Multi-Tenant Protection:** `institution_id` checks enforce `(institution_id = public.get_auth_user_institution_id() OR public.is_platform_admin())`.
- **Anti-Prediction Safeguard:** On `verification_schedules`, students cannot query future `SCHEDULED` windows before `window_start`, eliminating schedule predictability.

### 3.2 Storage Bucket Security:
- Migration `20261106000019` enforces tenant object key prefixes:
  ```sql
  (storage.foldername(name))[1] = public.get_auth_user_institution_id()::text
  ```
  This prevents Tenant A from downloading documents or reports uploaded by Tenant B via signed URL brute-forcing.

### 3.3 Residual Gaps Identified:
- **Supabase Anon Key in Client:** `InternPulse-main/.env` contains `VITE_SUPABASE_ANON_KEY`. While expected in client-side Supabase architectures, it relies 100% on RLS policies being flawless.
- **Public Schema Exposure:** If any newly created table omits `ENABLE ROW LEVEL SECURITY`, it immediately becomes readable to the public internet via PostgREST.
- **Recommendation:** Implement a database trigger or CI linter that automatically fails any migration where a table lacks `ENABLE ROW LEVEL SECURITY`.

---

## 4. Geolocation Privacy & DPDP Act 2023 Compliance

### 4.1 Digital Personal Data Protection (DPDP) Act 2023 Analysis:

| DPDP Act Requirement | Section | InternPulse Implementation Status | Audit Finding |
| :--- | :---: | :--- | :--- |
| **Notice & Informed Consent** | Sec 5 & 6 | `ConsentService.ts` records affirmative consent timestamps before telemetry capture. | **COMPLIANT** |
| **Purpose Limitation** | Sec 7 | Verification is strictly restricted to active internship shifts; out-of-shift requests are rejected. | **COMPLIANT** |
| **Data Minimization** | Sec 6(1) | Verification records store derived state (`WITHIN_GEOFENCE`) rather than streaming breadcrumbs. | **COMPLIANT** |
| **Storage Limitation & Erasure**| Sec 8(7) | `purge_student_personal_data()` SQL procedure implemented for right-to-erasure compliance. | **COMPLIANT** |
| **Parental Consent (Minors)** | Sec 9 | Currently assumes students are adults ($\ge 18$). If polytechnic students $<18$ onboard, parental consent flow is missing. | **ACTION REQUIRED** |

### 4.2 Anti-Surveillance Safeguards:
- `antiSurveillanceGuard.ts` strictly validates that timestamp $t$ satisfies:
  $$\text{ShiftStart} \le t \le \text{ShiftEnd} \quad \text{and} \quad \text{StartDate} \le \text{Date}(t) \le \text{EndDate}$$
- Requests submitted outside this interval are rejected with `PERMISSION_DENIED` and **never** penalized as an unverified absence.

---

## 5. Payment Gateway Security (Phase 19D)

### 5.1 Verification Strengths:
- **Zero Raw Card Storage:** No Primary Account Numbers (PAN), expiration dates, or CVVs are stored or processed. InternPulse stores only `cardLast4` and gateway transaction IDs, satisfying PCI-DSS SAQ A scope reduction.
- **Cryptographic Signature Verification:** `CryptoUtils.timingSafeEqual()` eliminates timing attack vulnerabilities when validating HMAC-SHA256 digests.
- **Server-Side Price Authority:** Payment orders reject any client-supplied amount; all charge calculations derive from authoritative database invoices.
- **Webhook Idempotency:** PostgreSQL `UNIQUE (gateway_provider, event_id)` constraint prevents replay attacks and double subscription activation.

---

## 6. Actionable Security Remediation Checklist

1. [ ] Fix TypeScript static analysis errors (`tsc --noEmit`) to ensure type guards operate as expected.
2. [ ] Replace client-side static mock coordinates in `mobile_location_service.dart` with verified device GPS telemetry.
3. [ ] Configure Supabase database linter in CI to assert `RLS = ENABLED` on every table.
4. [ ] Implement parental/guardian consent verification modal for diploma students under 18 years of age.
5. [ ] Establish secret rotation procedures for `RAZORPAY_KEY_SECRET` and `SUPABASE_SERVICE_ROLE_KEY`.

