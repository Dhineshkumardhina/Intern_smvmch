# Phase 11: InternPulse Independent Security & Privacy Audit Report

**System Name:** InternPulse — Next-Generation Institutional Internship & Geofence Attendance Platform  
**Target Institution:** Sri Manakula Vinayagar Engineering College (Autonomous) — SMVEC  
**Document Reference:** `docs/phase11/INDEPENDENT_SECURITY_PRIVACY_AUDIT.md`  
**Audit Date:** November 2026  
**Audit Scope:** Full Stack (React 19 Core, Flutter 3.x Mobile, Supabase PostgreSQL, RLS Policies, Stored Procedures, APIs, Platform Permissions)  
**Classification Standard:** CRITICAL | HIGH | MEDIUM | LOW  
**Remediation Status:** Pre-Remediation Baseline Audit (No code files modified during this assessment)  

---

## 1. Executive Summary

An independent, rigorous security and privacy audit of the **InternPulse** platform was conducted across the full software repository, database migrations, authentication workflows, mobile operating system permissions (Android & iOS), and data retention architectures.

InternPulse manages sensitive academic and telemetric student records—specifically physical GPS location telemetry, attendance compliance scores, faculty mentor evaluations, and institutional accreditation logs. Consequently, security and privacy are not auxiliary concerns; they are fundamental requirements under institutional bylaws and statutory regulations, notably the **Indian Digital Personal Data Protection Act, 2023 (DPDP Act)**, AICTE statutory guidelines, and Apple/Google mobile platform policies.

### Summary of Audit Findings by Severity

| Severity Level | Count | Definition & Primary Impact |
|:---------------|:-----:|:----------------------------|
| **CRITICAL**   | **2** | Immediate exploitability allowing unauthorized data injection or location tracking outside authorized shifts. |
| **HIGH**       | **6** | Significant vulnerabilities in authorization, indefinite GPS retention, missing caller checks, or Google/Apple policy breaches. |
| **MEDIUM**     | **6** | Gaps in rate limiting, audit log triggers, token invalidation scoping, or CSV formula injection risks. |
| **LOW**        | **4** | Minor configuration exposures, missing automated SCA pipelines, or absence of concurrent session limits. |
| **Total**      | **18**| Systemic coverage across all 20 audit dimensions. |

> [!IMPORTANT]
> **LEGAL DISCLAIMER & COMPLIANCE BOUNDARY:**  
> The presence of technical controls (such as geofence calculations, scheduled shift windows, and consent boolean flags) does **not** constitute legal compliance. Formal legal compliance under the DPDP Act 2023 and university statutory mandates requires institutional policy adoption, legal counsel review, formal student notices, and parental consent frameworks for minors. Specific institutional actions are identified in Section 8 of this report.

---

## 2. Audit Scope & Evaluation Methodology

The audit systematically examined 20 distinct technical and operational security domains:

1. **Authentication** (JWT handling, PKCE flows, credential hygiene)
2. **Authorization & RBAC** (Role separation between Student, Mentor, and HOD)
3. **Supabase RLS** (Row-Level Security coverage and bypass vectors)
4. **Database Permissions** (Privilege grants, SECURITY DEFINER functions, `search_path`)
5. **API Security** (PostgREST exposure, parameterized queries)
6. **Secret Management** (Environment variables, publishable keys, service roles)
7. **Input Validation** (Coordinate bounds, text fields, CSV injection)
8. **SQL Injection** (Dynamic query examination, PL/pgSQL routines)
9. **Cross-Site Scripting (XSS)** (React DOM rendering, Flutter widget safety)
10. **Cross-Site Request Forgery (CSRF)** (Bearer tokens vs. ambient credentials)
11. **Rate Limiting** (Endpoint protection, brute-force defenses)
12. **Session Management** (Storage mechanisms, token lifetime, invalidation)
13. **Location Data Protection** (In-transit encryption, coordinate masking)
14. **Push Notification Security** (FCM payload privacy, coordinate stripping)
15. **Audit Logging** (Immutability, trigger coverage, tamper resistance)
16. **Dependency Vulnerabilities** (`npm audit`, third-party packages)
17. **Android Permissions** (Manifest declarations, background location compliance)
18. **iOS Permissions** (Info.plist declarations, Apple review guidelines)
19. **Sensitive Data Storage** (Storage at rest, client storage security)
20. **Data Retention & Deletion** (Data minimization, lifecycle policies, DPDP Section 8(7))

---

## 3. Comprehensive Technical Findings

### Finding SEC-01 [CRITICAL]: Missing Caller Authorization in `SECURITY DEFINER` RPC `verify_student_geofence`
- **Category:** Authorization / IDOR (Insecure Direct Object Reference)
- **Component:** `supabase/migrations/20261106000007_phase7_geolocation_verification_engine.sql` (Line 217)
- **Description:**  
  The stored procedure `public.verify_student_geofence` is declared as `SECURITY DEFINER` and granted to all `authenticated` users:
  ```sql
  CREATE OR REPLACE FUNCTION public.verify_student_geofence(
      p_student_id UUID,
      p_assignment_id UUID,
      ...
  ) RETURNS JSONB AS $$ ... $$ LANGUAGE plpgsql SECURITY DEFINER;
  GRANT EXECUTE ON FUNCTION public.verify_student_geofence TO authenticated;
  ```
  Inside the function, the query validates that the assignment exists for `p_student_id`, but **fails to verify that `auth.uid() = p_student_id`** or that the caller is an authorized mentor or HOD.
- **Impact:**  
  Any authenticated student who knows another student's UUID and assignment ID can invoke this RPC with arbitrary coordinates, spoofing presence or intentionally generating false violation records for other students. Because the function is `SECURITY DEFINER`, it bypasses all table-level RLS policies on `location_verifications`.
- **Recommendation:**  
  Enforce explicit caller authorization at the top of the function:
  ```sql
  IF auth.uid() <> p_student_id AND public.get_auth_user_role() NOT IN ('hod', 'mentor') THEN
      RAISE EXCEPTION 'Access Denied: You are not authorized to submit location telemetry for this student.';
  END IF;
  ```

---

### Finding SEC-02 [CRITICAL]: Database RPC Collects and Stores Exact GPS Coordinates Outside Authorized Monitoring Windows
- **Category:** Privacy & Surveillance Violation / DPDP Non-Compliance
- **Component:** `supabase/migrations/20261106000007_phase7_geolocation_verification_engine.sql` (Lines 290–335)
- **Description:**  
  In `verify_student_geofence`, the database evaluates whether the current time falls within `monitoring_start_time` and `monitoring_end_time`:
  ```sql
  v_current_time := (p_timestamp AT TIME ZONE 'Asia/Kolkata')::time;
  IF v_assignment.monitoring_start_time IS NOT NULL AND v_assignment.monitoring_end_time IS NOT NULL THEN
      IF v_current_time < v_assignment.monitoring_start_time OR v_current_time > v_assignment.monitoring_end_time THEN
          v_is_within_window := false;
      END IF;
  END IF;
  ```
  However, when `v_is_within_window` is `false`, the function **does not halt or discard coordinates**. It proceeds to calculate distance via PostGIS and executes:
  ```sql
  INSERT INTO public.location_verifications (
      ..., captured_latitude, captured_longitude, within_monitoring_window, ...
  ) VALUES (..., p_captured_latitude, p_captured_longitude, false, ...);
  ```
- **Impact:**  
  If a client or automated process transmits coordinates outside internship hours (e.g., midnight or on weekends), the student's exact coordinates and distance are permanently recorded in the database. This directly violates the anti-surveillance requirement: *"Collect location only during authorized internship monitoring periods."*
- **Recommendation:**  
  Halt execution immediately when outside the window, zeroing out coordinates before recording an unverified off-shift attempt:
  ```sql
  IF NOT v_is_within_window THEN
      INSERT INTO public.location_verifications (
          assignment_id, student_id, requested_at, verification_result, within_monitoring_window, remarks
      ) VALUES (
          p_assignment_id, p_student_id, p_timestamp, 'PERMISSION_DENIED', false,
          'Telemetry rejected: Submission occurred outside authorized internship monitoring shift.'
      );
      RETURN jsonb_build_object('verification_result', 'PERMISSION_DENIED', 'message', 'Outside monitoring hours.');
  END IF;
  ```

---

### Finding SEC-03 [HIGH]: Missing Caller Authorization in Attendance Check-In / Check-Out Stored Procedures
- **Category:** Authorization / State Manipulation
- **Component:** `supabase/migrations/20261106000010_phase10_attendance_management_reporting.sql` (Lines 156–336)
- **Description:**  
  The stored procedures `record_student_check_in` and `record_student_check_out` run as `SECURITY DEFINER` and are granted to `authenticated`. 
  - `record_student_check_in` takes `p_student_id UUID` but never asserts `auth.uid() = p_student_id`.
  - `record_student_check_out` takes `p_session_id UUID` and updates the row without checking whether `auth.uid()` matches `session.student_id`.
- **Impact:**  
  Any authenticated student can check in or check out another student by calling the RPC directly via PostgREST.
- **Recommendation:**  
  Assert caller identity against `p_student_id` and `v_session.student_id` or require HOD/mentor administrative privileges.

---

### Finding SEC-04 [HIGH]: Unrestricted Execution of Global Window Transition Routine `process_window_transitions`
- **Category:** Privilege Escalation / Denial of Service
- **Component:** `supabase/migrations/20261106000008_phase8_random_verification_scheduler.sql` (Lines 160–231)
- **Description:**  
  `process_window_transitions(p_current_timestamp TIMESTAMPTZ)` is a `SECURITY DEFINER` function granted to `authenticated`. It accepts an arbitrary timestamp and iterates through all active verification windows across the entire institution.
- **Impact:**  
  A student can invoke `process_window_transitions('2099-01-01')`. This instantly marks every currently open verification window for every student in the college as `MISSED`, causing mass false attendance anomalies.
- **Recommendation:**  
  Restrict execution of `process_window_transitions` strictly to `service_role` (for pg_cron or Supabase Edge Functions) or verify `public.get_auth_user_role() = 'hod'`. Revoke execution from standard `authenticated` users:
  ```sql
  REVOKE EXECUTE ON FUNCTION public.process_window_transitions FROM authenticated;
  GRANT EXECUTE ON FUNCTION public.process_window_transitions TO service_role;
  ```

---

### Finding SEC-05 [HIGH]: Missing Fixed `search_path` on `SECURITY DEFINER` Functions (CWE-426)
- **Category:** Database Security / Search Path Hijacking
- **Components:**
  - `verify_student_geofence` (`20261106000007_phase7_...sql`)
  - `process_window_transitions` (`20261106000008_phase8_...sql`)
  - `invalidate_expired_device_token` (`20261106000009_phase9_...sql`)
  - `record_student_check_in` (`20261106000010_phase10_...sql`)
  - `record_student_check_out` (`20261106000010_phase10_...sql`)
- **Description:**  
  In PostgreSQL, a `SECURITY DEFINER` function executes with the rights of the function owner. If `search_path` is not explicitly pinned (`SET search_path = public`), an attacker with schema creation permissions can create malicious objects in a priority schema that hijack unqualified references.
- **Impact:**  
  Potential privilege escalation to database superuser/service_role.
- **Recommendation:**  
  Append `SET search_path = public` to every `SECURITY DEFINER` routine definition.

---

### Finding SEC-06 [HIGH]: Indefinite Plaintext GPS Coordinate Storage Without Retention or Purge Policy
- **Category:** Data Retention & Privacy (DPDP Section 8(7) / GDPR Art. 5(1)(e))
- **Component:** `public.location_verifications` table
- **Description:**  
  High-resolution GPS telemetry (`captured_latitude`, `captured_longitude`, `captured_location`) is stored in plaintext. In migration `20261105000003_phase2_rls_security_hardening.sql`, the policy explicitly states: `"ZERO DELETE POLICIES: Verification records are permanent audit evidence!"`
- **Impact:**  
  Under Section 8(7) of the Indian DPDP Act 2023, personal data must be erased once the purpose for collection is fulfilled. Storing precise personal geolocation indefinitely exposes students to historical tracking risks if database credentials or backups are compromised.
- **Recommendation:**  
  Implement a two-stage retention policy:
  1. **Operational Stage (Shift to 30 Days):** Retain raw coordinates for faculty dispute resolution and audit verification.
  2. **Archival Stage (> 30 Days):** Retain the verification outcome (`WITHIN_GEOFENCE`, `OUTSIDE_GEOFENCE`), distance, and timestamp, but purge/nullify the raw `captured_latitude`, `captured_longitude`, and `captured_location`.

---

### Finding SEC-07 [HIGH]: Hardcoded User Consent Flags in Mobile Presentation Layer
- **Category:** Privacy / Informed Consent (DPDP Act Section 5 & 6)
- **Component:** `InternPulse-main/lib/features/student/presentation/providers/student_dashboard_provider.dart` (Lines 203–204)
- **Description:**  
  During check-in and location recording, the mobile provider hardcodes:
  ```dart
  consentVerified: true,
  withinMonitoringWindow: true,
  ```
  There is no interactive In-App Consent Notice, Consent Undertaking screen, or consent withdrawal toggle in the UI.
- **Impact:**  
  Presuming consent without a recorded, voluntary, affirmative opt-in violates Section 6 of the DPDP Act 2023, which requires consent to be free, specific, informed, and unambiguous.
- **Recommendation:**  
  Scaffold a formal **Informed Consent Dialog & Settings Screen** that records consent timestamps and allows students to inspect or withdraw location tracking consent.

---

### Finding SEC-08 [HIGH]: Over-Permissioned Background Location and Battery Optimization Declarations
- **Category:** Mobile Security & App Store Compliance
- **Components:**
  - Android: `AndroidManifest.xml` (`ACCESS_BACKGROUND_LOCATION`, `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS`)
  - iOS: `Info.plist` (`NSLocationAlwaysUsageDescription`, `UIBackgroundModes: location`)
- **Description:**  
  The app requests continuous background location and battery optimization exemptions. However, the Phase 8 architecture utilizes server-side randomized push notifications to prompt user check-ins. If students submit location when responding to prompts in the foreground, continuous background tracking is redundant.
- **Impact:**  
  Google Play and Apple App Store review teams routinely reject apps requesting background location without clear in-foreground justification. Google Play policy specifically prohibits `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` unless indispensable to core functionality.
- **Recommendation:**  
  Align mobile permissions with actual operational needs: adopt "When in Use" foreground verification paired with high-priority FCM wake-up prompts, or prepare formal institutional justification and video demonstrations for app store submissions.

---

### Finding SEC-09 [MEDIUM]: Absence of Application-Layer Rate Limiting on Verification and Check-In RPCs
- **Category:** Denial of Service / Telemetry Flooding
- **Component:** PostgREST API / Database RPCs
- **Description:**  
  While Supabase limits general HTTP request rates at the API gateway level, there is no application-layer rate limiting restricting how frequently an individual authenticated student can invoke `verify_student_geofence` or `record_student_check_in`.
- **Impact:**  
  A rogue mobile script or compromised client could submit hundreds of verification pings per minute, filling database storage and skewing attendance compliance metrics.
- **Recommendation:**  
  Enforce a minimum cooldown period (e.g., 60 seconds) between successive verification submissions per student in the database stored procedure.

---

### Finding SEC-10 [MEDIUM]: Incomplete Database-Level Audit Triggers on Sensitive Attendance Tables
- **Category:** Audit Integrity
- **Component:** `public.attendance_sessions` and `public.location_verifications`
- **Description:**  
  Migration 2 created `public.log_table_audit_trail()` and attached it to `internship_assignments`, `internship_locations`, and `profiles`. However, it was not attached to `attendance_sessions` or `location_verifications`. Furthermore, in `attendanceService.ts`, audit logs are maintained in a volatile in-memory array (`private auditLog = []`).
- **Impact:**  
  Direct updates to attendance records (e.g., by HOD or direct DB access) do not automatically generate immutable rows in `public.audit_logs`. In-memory service logs are lost upon process restart.
- **Recommendation:**  
  Attach `log_table_audit_trail()` triggers to `attendance_sessions` and persist all service-layer audit entries directly to the database.

---

### Finding SEC-11 [MEDIUM]: Unscoped FCM Device Token Invalidation Function
- **Category:** Authorization / Denial of Service
- **Component:** `supabase/migrations/20261106000009_phase9_production_notification_system.sql` (Line 181)
- **Description:**  
  `invalidate_expired_device_token(p_token TEXT)` is a `SECURITY DEFINER` function granted to `authenticated`. It marks `is_active = false` for any token matching `p_token` without checking whether the calling user owns the token.
- **Impact:**  
  If a user discovers or guesses device push tokens, they can deactivate push notifications for other students or faculty members.
- **Recommendation:**  
  Verify token ownership:
  ```sql
  UPDATE public.fcm_device_tokens
  SET is_active = false, expired_at = timezone('utc'::text, now())
  WHERE token = p_token AND (user_id = auth.uid() OR public.get_auth_user_role() = 'hod');
  ```

---

### Finding SEC-12 [MEDIUM]: Potential CSV Formula Injection in Attendance Reporting (CWE-1236)
- **Category:** Input Validation / Output Encoding
- **Component:** `InternPulse-main/src/core/attendance/attendanceReportingEngine.ts` (Line 163)
- **Description:**  
  The CSV export engine wraps cells containing commas, quotes, or newlines in quotes, but does not sanitize cells that begin with formula trigger characters (`=`, `+`, `-`, `@`, `\t`, `\r`).
- **Impact:**  
  If a malicious user submits a student name, roll number, or check-in note such as `=cmd|' /C calc'!A0`, opening the exported CSV in Microsoft Excel or Google Sheets could execute unauthorized external commands.
- **Recommendation:**  
  Prepend an apostrophe (`'`) to any cell value that begins with `=`, `+`, `-`, or `@`.

---

### Finding SEC-13 [MEDIUM]: Browser `localStorage` Token Storage in Web Client
- **Category:** Session Management / Credential Storage
- **Component:** `InternPulse-main/src/lib/supabase.ts` (Line 45)
- **Description:**  
  `getSupabaseClient()` enables `persistSession: true`, which defaults to storing active JWT access and refresh tokens in browser `window.localStorage`.
- **Impact:**  
  `localStorage` is accessible to any script executing on the same origin. In the event of an XSS vulnerability, session tokens can be extracted.
- **Recommendation:**  
  Consider using secure HTTP-only cookies for web-based sessions or document origin-isolation policies and Content Security Policy (CSP) headers.

---

### Finding SEC-14 [MEDIUM]: Lack of Multi-Factor Authentication (MFA) for Administrative Roles
- **Category:** Authentication Hardening
- **Component:** HOD and Mentor authentication workflows
- **Description:**  
  HOD and Mentor accounts access institutional student records, approve locations, and modify attendance. Currently, all roles authenticate using single-factor password credentials.
- **Impact:**  
  Credential stuffing or phishing targeting faculty email addresses could allow unauthorized access to institutional telemetry.
- **Recommendation:**  
  Enable Supabase TOTP-based Multi-Factor Authentication (MFA) for `mentor` and `hod` roles.

---

### Finding SEC-15 [LOW]: Hardcoded Live Cloud Endpoint Defaults in Client Configurations
- **Category:** Information Disclosure / Configuration Hygiene
- **Components:**
  - `InternPulse-main/lib/core/config/supabase_config.dart` (Line 10)
  - `InternPulse-main/src/lib/supabase.ts` (Line 25)
- **Description:**  
  The live Supabase project URL (`https://gvnakdxtjjnfcjkcnavz.supabase.co`) and Anon Key are hardcoded as fallback default values in client source code.
- **Impact:**  
  While Anon Keys are designed to be public, hardcoding active cloud project URLs in source repositories exposes instance endpoints to automated search scanners.
- **Recommendation:**  
  Require build-time environment variable injection without default production URL fallbacks in public/open source commits.

---

### Finding SEC-16 [LOW]: Presence of Pre-Configured Demo Credentials in Repository Code
- **Category:** Credential Management
- **Component:** `InternPulse-main/src/core/auth/demoAccounts.ts`
- **Description:**  
  Default demo passwords (e.g., `SMVEC@2026!`) are hardcoded for HOD, Mentor, and Student test accounts.
- **Impact:**  
  If demo seed accounts are not removed or disabled in production deployments, attackers can gain immediate access using published credentials.
- **Recommendation:**  
  Enforce a build-time guard ensuring `demoAccounts.ts` is stripped from production release builds.

---

### Finding SEC-17 [LOW]: Absence of Concurrent Session Governance
- **Category:** Session Management
- **Component:** Supabase Auth Client
- **Description:**  
  There is no restriction preventing a student from logging in simultaneously from multiple physical mobile devices.
- **Impact:**  
  A student could share their login credentials with an on-site peer who checks in on their behalf using a second device while the student is absent.
- **Recommendation:**  
  Bind attendance check-in sessions to a registered hardware device UUID (`device_id`) stored in `public.profiles` or `fcm_device_tokens`.

---

### Finding SEC-18 [LOW]: Missing Automated Software Composition Analysis (SCA) in CI/CD
- **Category:** Dependency Management
- **Component:** Build & Deployment Pipeline
- **Description:**  
  While `npm audit` currently reports **0 vulnerabilities**, there is no automated CI workflow (such as GitHub Dependabot or Snyk) scanning dependencies for newly disclosed CVEs on pull requests.
- **Impact:**  
  Future updates to third-party packages could introduce unmonitored supply-chain vulnerabilities.
- **Recommendation:**  
  Configure automated weekly dependency security scans in the repository.

---

## 4. Privacy & Anti-Surveillance Architecture Review

InternPulse's core privacy premise is **anti-surveillance**: students must not be subjected to continuous, covert tracking. Telemetry must be collected strictly during authorized internship shifts, for verified educational objectives, and with transparent user feedback.

```
+---------------------------------------------------------------------------------------------------+
|                                  PRIVACY COMPLIANCE EVALUATION                                    |
+---------------------------------------------------------------------------------------------------+
| Requirement                              | Current Implementation Status   | Evaluation           |
+------------------------------------------+---------------------------------+----------------------+
| 1. Collect only during authorized hours  | Partially Enforced (SEC-02 gap) | Needs DB Halt Fix    |
| 2. Obtain informed user consent          | Booleans Hardcoded (SEC-07 gap) | Needs In-App UI      |
| 3. Explain why location is collected     | In Manifest/Info.plist strings  | Needs Onboarding UI  |
| 4. Transparent monitoring status         | Basic shift text on dashboard   | Needs Real-Time Pill |
| 5. Limit access to location history      | Strictly Scoped via RLS         | Satisfied            |
| 6. Define retention & deletion policies  | Indefinite storage (SEC-06 gap) | Needs 30-Day Purge   |
| 7. Protect data in transit & at rest     | TLS 1.3 + Disk Encryption       | Plaintext in DB      |
| 8. Avoid unnecessary location collection | 5 random windows vs continuous  | Architecture Sound   |
| 9. Indian DPDP Act compliance            | Technical foundations exist     | Needs Legal Review   |
+------------------------------------------+---------------------------------+----------------------+
```

### 4.1 Evaluation of Anti-Surveillance Safeguards
1. **Stratified Randomized Windows (Phase 8):**  
   The choice to use 5 randomized verification windows per day (15-minute response window) rather than continuous background GPS breadcrumbing is an exemplary architectural safeguard. It completely eliminates continuous tracking.
2. **Push Notification Coordinate Stripping (Phase 9):**  
   `FcmGateway.assertPayloadPrivacy()` actively throws an exception if raw coordinates are embedded in push notifications dispatched through third-party infrastructure (Apple APNs / Google FCM). This satisfies strict privacy expectations.
3. **Database Telemetry Leak Outside Shifts (SEC-02):**  
   As identified in Finding SEC-02, the database stored procedure must be patched to reject and discard coordinates submitted outside authorized shift hours rather than recording them with `within_monitoring_window = false`.

---

## 5. Indian Digital Personal Data Protection Act (DPDP Act, 2023) Assessment

As an Indian Autonomous Engineering Institution operating in Puducherry / Tamil Nadu, Sri Manakula Vinayagar Engineering College (SMVEC) operates as a **Data Fiduciary**, and its enrolled students are **Data Principals** under the DPDP Act, 2023.

### 5.1 Statutory Analysis

| DPDP Section | Legal Requirement | InternPulse Technical Status | Compliance Finding |
|:-------------|:------------------|:-----------------------------|:-------------------|
| **Section 5** | Notice accompanying consent describing data collected, purpose, and grievance mechanism | Usage strings in mobile OS plists only; no dedicated in-app Notice | **Non-Compliant** (Action Required) |
| **Section 6(1)** | Consent must be free, specific, informed, unconditional, and affirmative | `consentVerified: true` is hardcoded in Riverpod provider | **Non-Compliant** (Action Required) |
| **Section 6(4)** | Ease of withdrawing consent at any time | No UI toggle exists for a student to withdraw tracking consent | **Non-Compliant** (Action Required) |
| **Section 8(6)** | Data accuracy and completeness | PostGIS verification engine and accuracy filtering ($<65$ m) ensure high fidelity | **Compliant** |
| **Section 8(7)** | Erasure of personal data upon purpose fulfillment or consent withdrawal | Zero delete policies; coordinates stored permanently in DB | **Non-Compliant** (Action Required) |
| **Section 9** | Processing of children's data (parental consent if student is $<18$ years old) | System assumes all students are adults; no age gate or parental flow | **Institutional Review Required** |
| **Section 11–13**| Rights to access, correction, erasure, and grievance redressal | No self-service data export or formal grievance portal | **Action Required** |
| **Section 14** | Appointment of Grievance Redressal Officer | Institutional contact not yet integrated into app UI | **Institutional Review Required** |

---

## 6. Institutional Legal & Governance Requirements

> [!WARNING]
> **MANDATORY LEGAL & INSTITUTIONAL REVIEW ITEMS:**  
> The following items cannot be resolved by software engineers alone and require formal governance and legal determination by the SMVEC Academic Council, Principal, and Legal Counsel:

1. **Academic Regulations vs. Data Erasure Conflict:**
   - *Conflict:* AICTE, NAAC, and Pondicherry University accreditation guidelines require colleges to preserve student attendance and internship audit evidence for **3 to 5 years**. Conversely, DPDP Section 8(7) mandates erasing personal data when the collection purpose ends.
   - *Resolution Required:* SMVEC Legal Counsel must formally establish an **Institutional Retention Schedule** stipulating that attendance verification outcomes (`WITHIN_GEOFENCE`, hours worked) be retained for academic accreditation, while high-precision GPS coordinates (`captured_latitude`, `captured_longitude`) be truncated or purged after 30 days.
2. **Student Internship Agreement & Consent Undertaking:**
   - Prior to deployment, the college must issue a standardized **Digital Consent Undertaking** signed during internship registration, explicitly notifying students that location telemetry will be collected during work hours to fulfill degree curriculum requirements.
3. **Minor Students ($<18$ Years of Age):**
   - First-year or second-year diploma/degree students may be under 18 years old. Under DPDP Section 9, processing a child's personal data requires verifiable parental consent, and tracking or behavioral monitoring of children is restricted. SMVEC must identify if any interns are minors and obtain parental consent undertakings.
4. **Appointment of Data Protection & Grievance Redressal Officer:**
   - SMVEC must officially designate a faculty member or administrator as the **InternPulse Grievance Officer**, whose official email and institutional address must be displayed within the mobile app and college portal.

---

## 7. Mobile Platform Permission Compliance (Android & iOS)

### 7.1 Android (Google Play Policy Compliance)
- **Background Location Policy:** Google Play requires an in-app prominent disclosure before the OS runtime permission dialog appears. The disclosure must explain:
  - What data is collected (precise location).
  - How it is used (verifying attendance at approved workplace).
  - That it is collected only during scheduled shift hours.
- **Battery Optimization Exemption:** `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` will trigger rejection during Google Play review unless the app is distributed via internal enterprise MDM/APK sideloading, or an exception is approved.

### 7.2 iOS (Apple App Store Review Guidelines)
- **Guideline 5.1.5 (Location Services):** Apple prohibits using background location unless it provides a direct benefit to the user.
- **Usage Descriptions:** `Info.plist` usage descriptions must explicitly mention battery impact and state clearly that location is queried only during authorized work shifts.

---

## 8. Prioritized Remediation Roadmap

The findings identified in this audit must be remediated in four sequential phases:

```
+---------------------------------------------------------------------------------------------------+
|                                  PRIORITIZED REMEDIATION ROADMAP                                  |
+---------------------------------------------------------------------------------------------------+
| Phase A: CRITICAL SECURITY & AUTHORIZATION PATCHES (Immediate Priority)                           |
|   1. Patch verify_student_geofence RPC: Enforce auth.uid() check and halt off-shift storage       |
|   2. Patch record_student_check_in & record_student_check_out: Enforce caller identity            |
|   3. Restrict process_window_transitions: Revoke authenticated; grant service_role only           |
|   4. Add SET search_path = public to all SECURITY DEFINER routines                                |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Phase B: PRIVACY & DATA MINIMIZATION IMPLEMENTATION                                               |
|   5. Implement 30-Day Coordinate Purge Trigger (nullify raw lat/long after dispute window)        |
|   6. Patch invalidate_expired_device_token: Scope to token owner                                  |
|   7. Attach automated audit triggers to attendance_sessions and location_verifications            |
|   8. Add application-layer rate limiting (60s cooldown) on verification submissions               |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Phase C: CLIENT-SIDE PRIVACY & UI ENHANCEMENTS                                                    |
|   9. Build interactive In-App Consent Dialog & Notice Screen in Flutter mobile app                |
|  10. Add prominent Real-Time Monitoring Status Bar ("Shift Active" vs "Monitoring Dormant")      |
|  11. Sanitize CSV export against formula injection (CWE-1236)                                     |
|  12. Refine mobile permissions (prominent disclosures on Android, review battery exemptions)      |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
| Phase D: INSTITUTIONAL GOVERNANCE & LEGAL APPROVAL                                                |
|  13. SMVEC Legal Counsel review of retention schedule & parental consent for minors               |
|  14. Publish DPO / Grievance Redressal Officer contact details in mobile app                      |
+---------------------------------------------------------------------------------------------------+
```

---

## 9. Conclusion

The InternPulse architecture demonstrates strong security engineering foundations: zero dynamic SQL injection vectors, full PostGIS geospatial calculation integrity, robust FCM push notification privacy sanitization, and strict student-level isolation across standard database queries.

However, the presence of **unauthorized caller invocation vectors in `SECURITY DEFINER` RPCs**, **off-shift coordinate storage**, **indefinite raw GPS retention**, and **unregistered user consent** create critical vulnerabilities that must be addressed prior to institutional production deployment. 

Implementing the remediations outlined in this report will bring InternPulse into compliance with **OWASP Top 10 API Security Standards**, **Google Play / Apple Store Location Guidelines**, and the **Indian Digital Personal Data Protection Act, 2023**.

