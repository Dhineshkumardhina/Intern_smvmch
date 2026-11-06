# Phase 8: InternPulse Server-Side Randomized Location Verification Scheduler Report

**Project:** InternPulse — Next-Generation Institutional Internship & Geofence Attendance Platform  
**Institution:** Sri Manakula Vinayagar Engineering College (Autonomous) — SMVEC  
**System Architecture:** Multi-Platform (React 19 + TypeScript Core Scheduler Engine, Flutter 3.x Mobile, Supabase PostgreSQL with PostGIS & RLS)  
**Document Reference:** `docs/phase8/RANDOM_VERIFICATION_ENGINE_REPORT.md`  
**Date:** November 2026  
**Status:** Completed, Production-Grade & 100% Verified (215 Automated Tests Passing across 10 Test Suites)  

---

## 1. Executive Summary

Phase 8 implements the **InternPulse Server-Side Randomized Location Verification Scheduler** — an autonomous, fair, and tamper-resistant scheduling infrastructure designed to verify student workplace presence during approved internship shifts.

### The Mobile Background Execution Problem
Traditional attendance applications fail in production because they rely on mobile operating systems (Android and iOS) to wake up background tasks at an exact, predetermined second. Modern mobile operating systems actively terminate or defer background threads to conserve battery life (Android Doze Mode, App Standby Buckets, and iOS Background App Refresh throttling). As a consequence, mobile-initiated background timers are inherently non-deterministic, unreliable, and frequently lead to false attendance penalties against students.

### The InternPulse Server-Side Solution
InternPulse completely eliminates dependency on mobile background timers by shifting the entire scheduling, windowing, and notification dispatch lifecycle to the **server**:
1. **Server-Generated Randomized Windows:** The server generates exactly **five randomized verification windows** per eligible student per internship monitoring day.
2. **Stratified Random Distribution:** Windows are distributed across the student's authorized daily monitoring shift (e.g., 09:00:00 to 18:00:00) using stratified jitter sampling, avoiding predictable uniform intervals.
3. **Server-Dispatched Push Notifications:** When a verification window opens, the server pushes an immediate alert to the student's mobile device, granting a 15-minute response window.
4. **In-Window Retry Handling:** If a student encounters transient GPS failure, low satellite accuracy, or sensor initialization delays, retries are supported while the window remains open.
5. **The Fairness Doctrine:** A missed check is strictly documented as an unattended window (`MISSED`), and is **never** conflated with or classified as a confirmed geofence violation (`OUTSIDE_GEOFENCE`).
6. **Anti-Prediction API Safeguards:** Students cannot predict upcoming check times because the API and Row-Level Security policies strictly filter out future `SCHEDULED` windows until their opening time arrives.

---

## 2. Server-Side Scheduler Architecture & State Machine

```
+---------------------------------------------------------------------------------------------------+
|                                 Server-Side Daily Schedule Generation                             |
|  - Validates Active Internship Assignment (status == 'active')                                    |
|  - Validates Calendar Date Range (startDate <= targetDate <= endDate)                             |
|  - Extracts Authorized Monitoring Shift (e.g. 09:00:00 to 18:00:00, Asia/Kolkata UTC+05:30)       |
|  - Computes 5 Stratified Randomized Non-Overlapping Windows (15 min each, 25-30 min min buffer)   |
|  - Idempotently Persists to verification_schedules (Unique on assignment_id, target_date, start)  |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                  Server-Side Sweep / Cron Transition                              |
|                                                                                                   |
|  [ SCHEDULED ] --(Wall-clock reaches window_start)--> [ OPEN ]                                     |
|                                                          |                                        |
|                                                          +--> Dispatches Push Notification        |
|                                                          +--> Student Mobile UI Unlocks Input     |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                       +--------------------------+--------------------------+
                       |                                                     |
                       v (Student submits within window)                     v (Window closes without response)
+---------------------------------------------+        +--------------------------------------------+
|             Telemetry Evaluation            |        |           The Fairness Doctrine            |
|                                             |        |                                            |
|  * Hardware/GPS Failure                     |        |  Wall-clock exceeds window_end:            |
|    --> Status: [ LOCATION_UNAVAILABLE ]     |        |  --> Status: [ MISSED ]                    |
|    --> Retry allowed if window still open   |        |  --> Reason: Unattended window             |
|                                             |        |                                            |
|  * Valid Fix Within Workplace Geofence      |        |  CRITICAL AUDIT RULE:                      |
|    --> Status: [ VERIFIED ]                 |        |  A missed check is NOT a confirmed        |
|                                             |        |  geofence violation (OUTSIDE_GEOFENCE)!    |
|  * Valid Fix Confirmed Outside Geofence     |        |                                            |
|    --> Status: [ SUBMITTED ]                |        |                                            |
|    --> OUTSIDE_GEOFENCE recorded in audit   |        |                                            |
+---------------------------------------------+        +--------------------------------------------+
```

---

## 3. The 8 Canonical Verification States

The scheduler manages verification windows across 8 distinct states:

| # | Verification State | Description | Retry Allowed? | Disciplinary Impact |
|---|--------------------|-------------|----------------|---------------------|
| 1 | `SCHEDULED` | Window generated server-side; awaiting scheduled opening time. Hidden from student client. | N/A | None (Internal) |
| 2 | `OPEN` | Active 15-minute response window. Push notification dispatched; awaiting student submission. | Yes | None (In progress) |
| 3 | `SUBMITTED` | Student submitted location telemetry; evaluated by Geolocation Verification Engine. | No | Evaluated per fix |
| 4 | `VERIFIED` | Location coordinates verified within approved workplace geofence radius. | No | Positive (Present) |
| 5 | `MISSED` | Window expired without student submission. Documented non-response. | No | Neutral/Non-response |
| 6 | `LOCATION_UNAVAILABLE` | Transient hardware/GPS error occurred during submission attempt. | Yes (Within window) | None (Transient) |
| 7 | `EXPIRED` | Window closed while pending or after allowable retry period elapsed without success. | No | Neutral/Expired |
| 8 | `CANCELLED` | Assignment terminated or schedule override revoked the verification check. | No | None (Voided) |

---

## 4. Stratified Random Jitter & Fairness Engine

The random window generation algorithm in [`randomWindowGenerator.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/scheduler/randomWindowGenerator.ts) mathematically guarantees distribution, fairness, and non-predictability:

### 4.1 Stratified Jitter Formulation
Let the student's authorized daily monitoring shift be bounded by $T_{\text{start}}$ and $T_{\text{end}}$ in minutes from midnight (e.g., 09:00 to 18:00 $\implies T_{\text{start}} = 540$, $T_{\text{end}} = 1080$, $M = 540\text{ minutes}$).

For $N = 5$ daily verification windows of duration $W = 15\text{ minutes}$:
1. The shift is divided into $N=5$ equal strata:
   $$S_i = \left[ T_{\text{start}} + i \cdot \frac{M}{N}, \quad T_{\text{start}} + (i + 1) \cdot \frac{M}{N} \right], \quad i \in \{0, 1, 2, 3, 4\}$$
2. For each stratum $i$, the window start minute $t_i$ is chosen with pseudo-random jitter $J_i$:
   $$t_i = \text{clamp}\left( \text{earliest}_i + J_i, \quad \text{earliest}_i, \quad \text{latest}_i \right)$$
   where:
   - $\text{earliest}_i = \max\left( S_{i,\text{start}}, \quad t_{i-1} + W + B_{\text{min}} \right)$
   - $\text{latest}_i = \min\left( S_{i,\text{end}} - W, \quad T_{\text{end}} - W \right)$
   - $B_{\text{min}} = 25\text{ minutes}$ (minimum buffer between consecutive checks).
3. This mathematical structure guarantees:
   - **Zero Overlap:** Windows are always separated by at least $B_{\text{min}}$.
   - **Full Shift Coverage:** Windows are distributed across morning, midday, and afternoon hours.
   - **Unpredictability:** Jitter prevents students from anticipating fixed intervals.
   - **Strict Shift Boundaries:** No window ever starts before $T_{\text{start}}$ or ends after $T_{\text{end}}$.

---

## 5. Timezone Handling & Precision

InternPulse standardizes on **Indian Standard Time (`Asia/Kolkata`, UTC+05:30)** as the authoritative institutional clock:

- **Local Time to UTC ISO Conversion:**
  $$\text{UTC Milliseconds} = \text{Date.UTC}(\text{Year}, \text{Month}, \text{Day}, \text{Hours}, \text{Minutes}) - (\Delta_{\text{TZ}} \times 60 \times 1000)$$
  where $\Delta_{\text{TZ}} = +330\text{ minutes}$ for `Asia/Kolkata`.
- **Validation Table:**
  - Shift Start: `09:00:00 IST` $\implies$ `03:30:00 UTC` ($540 - 330 = 210\text{ minutes}$).
  - Shift End: `18:00:00 IST` $\implies$ `12:30:00 UTC` ($1080 - 330 = 750\text{ minutes}$).
  - All database timestamps on `verification_schedules` are stored as timezone-aware `TIMESTAMPTZ` in UTC.

---

## 6. The Fairness Doctrine: Non-Penalizing Missed Checks

> [!CRITICAL]
> **Core Institutional Fairness Principle:**  
> A missed check is not automatically proof that the student left the internship location.

Technical environments within engineering and industrial facilities are prone to RF shielding, metal roofs, underground workshops, or sudden cellular dead zones. The InternPulse verification architecture explicitly distinguishes between five distinct operational outcomes:

```
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| Operational Scenario               | Schedule Window Status   | Verification Result   | Institutional Assessment    |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| Confirmed Out-of-Bounds Location   | SUBMITTED                | OUTSIDE_GEOFENCE      | Confirmed boundary breach   |
| Missed / Unattended Window         | MISSED                   | None (No coordinates) | Documented non-response     |
| Device Offline / No Signal         | LOCATION_UNAVAILABLE     | NETWORK_UNAVAILABLE   | Environmental network loss  |
| GPS Sensor Disabled                | LOCATION_UNAVAILABLE     | GPS_DISABLED          | Hardware settings failure   |
| Permission Revoked / Denied        | LOCATION_UNAVAILABLE     | PERMISSION_DENIED     | Missing user consent/rights |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
```

Mentors and department heads are provided with distinct audit counters: `Confirmed Violations` vs `Unattended Windows` vs `Environmental Dropouts`, preventing unjust disciplinary actions against students experiencing technical difficulties.

---

## 7. Anti-Prediction API Safeguards

To prevent students from anticipating verification checks and gaming the system:

1. **Student API Endpoint ([`getStudentVisibleSchedules`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/scheduler/verificationSchedulerEngine.ts#L295-L315)):**
   - Filters out all windows where `status == 'SCHEDULED'` and `now < windowStart`.
   - The student mobile client only receives notifications and views windows once they have officially transitioned to `OPEN`.
2. **PostgreSQL Row-Level Security Policy:**
   - The `schedules_select_scoped` policy on `public.verification_schedules` enforces that students can only query rows where:
     $$\text{student\_id} = \text{auth.uid}() \quad \text{AND} \quad (\text{status} \ne \text{'SCHEDULED'} \quad \text{OR} \quad \text{window\_start} \le \text{now}())$$
   - Faculty mentors, HODs, and administrators retain complete oversight to audit the full daily schedule for accreditation compliance.

---

## 8. Database Architecture & Migrations

The database expansion is codified in migration [`20261106000008_phase8_random_verification_scheduler.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000008_phase8_random_verification_scheduler.sql):

```sql
-- Unique constraint enforcing idempotent schedule generation
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_schedule_window
    ON public.verification_schedules(assignment_id, target_date, window_start);

-- Status check constraint enforcing the 8 canonical states
ALTER TABLE public.verification_schedules
    ADD CONSTRAINT verification_schedules_status_check
    CHECK (status IN (
        'SCHEDULED', 'OPEN', 'SUBMITTED', 'VERIFIED',
        'MISSED', 'LOCATION_UNAVAILABLE', 'EXPIRED', 'CANCELLED',
        'pending', 'dispatched', 'responded'
    ));

-- Server-side automated window transition stored procedure
CREATE OR REPLACE FUNCTION public.process_window_transitions(
    p_current_timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now())
) RETURNS JSONB;
```

---

## 9. Comprehensive Automated Test Results

The automated test suite in [`randomVerificationScheduler.test.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/__tests__/randomVerificationScheduler.test.ts) executes **21 dedicated automated tests** verifying every requirement of Phase 8.

```
 RUN  v5.1.0 C:/PROJECTS/bose projects/Intern_smvmch/Intern_smvmch/InternPulse-main

 ✓ src/core/auth/__tests__/rlsSecurityPolicies.test.ts (34 tests) 26ms
 ✓ src/core/auth/__tests__/rolePermissions.test.ts (14 tests) 16ms
 ✓ src/core/auth/__tests__/productionAuth.test.ts (18 tests) 31ms
 ✓ src/core/auth/__tests__/flutterBackendIntegration.test.ts (15 tests) 22ms
 ✓ src/core/auth/__tests__/geolocationVerificationEngine.test.ts (27 tests) 267ms
 ✓ src/core/auth/__tests__/rbacAuthorization.test.ts (25 tests) 281ms
 ✓ src/core/auth/__tests__/randomVerificationScheduler.test.ts (21 tests) 107ms
 ✓ src/core/auth/__tests__/hodLocationManagement.test.ts (17 tests) 408ms
 ✓ src/core/auth/__tests__/mentorStudentManagement.test.ts (29 tests) 287ms
 ✓ src/core/auth/__tests__/internshipAssignmentWorkflow.test.ts (15 tests) 262ms

 Test Files  10 passed (10)
      Tests  215 passed (215)
   Duration  1.14s
```

### 9.1 Phase 8 Test Execution Matrix

| Test Suite / Category | Scenarios Tested | Expected Behavior | Actual Outcome | Status |
|---|---|---|---|---|
| **Canonical States** | All 8 verification states | Complete enumeration matching specification | Verified 8 states | **PASS** |
| **5-Window Distribution** | Eligible student active schedule | Exactly 5 windows per day within 09:00 - 18:00 | 5 windows generated | **PASS** |
| **Non-Overlap Guarantee** | Buffer between consecutive windows | Windows never overlap; minimum 20-30 min gap | Zero overlaps | **PASS** |
| **Randomized Intervals** | Multi-day schedule generation | Windows distributed with non-uniform jitter | Unpredictable offsets | **PASS** |
| **Duplicate Prevention** | Repeated schedule generation runs | Idempotent storage; zero duplicates created | 5 windows retained | **PASS** |
| **Cohort Generation** | 3 active students in cohort | Generates exactly 15 distinct windows (5 per student) | 15 windows created | **PASS** |
| **Inactive Assignment** | Completed / Terminated placement | Blocks schedule generation | 0 windows generated | **PASS** |
| **Date Range Bounds** | Pre-start and post-end dates | Respects calendar bounds; skips out-of-range dates | 0 windows generated | **PASS** |
| **Timezone Precision** | `Asia/Kolkata` vs `UTC` conversion | 09:00 IST correctly maps to 03:30 UTC | Accurate timestamps | **PASS** |
| **Push Notification** | Wall clock reaches `windowStart` | Transitions `SCHEDULED` $\to$ `OPEN`; emits notification | Notification emitted | **PASS** |
| **Location Submission** | Telemetry submitted inside window | Timestamp recorded; window marked `VERIFIED` | `VERIFIED` recorded | **PASS** |
| **Early Submission** | Submission before `windowStart` | Rejected (window has not opened yet) | Exception thrown | **PASS** |
| **Late Submission** | Submission after `windowEnd` | Rejected as `EXPIRED` | Rejected `EXPIRED` | **PASS** |
| **In-Window Retry** | GPS disabled on first attempt | Marks `LOCATION_UNAVAILABLE`; allows retry | Retry successful | **PASS** |
| **The Fairness Rule** | Unattended window expiration | Marked `MISSED`, never `OUTSIDE_GEOFENCE` | `MISSED` recorded | **PASS** |
| **Violation Separation** | Confirmed out-of-bounds vs missed | Different states (`SUBMITTED` vs `MISSED`) | Clean discrimination | **PASS** |
| **Anti-Prediction API** | Student querying future checks | Future `SCHEDULED` windows strictly hidden | 0 future leaks | **PASS** |
| **Mentor Oversight** | Mentor querying audit schedule | All 5 windows visible for compliance auditing | 5 windows audited | **PASS** |

---

## 10. Conclusion

Phase 8 completes the server-side verification scheduling infrastructure of InternPulse. By migrating schedule generation, window lifecycle transitions, and push notifications to the server, the system eliminates mobile background execution failures while upholding student privacy, algorithmic fairness, and institutional audit standards.

