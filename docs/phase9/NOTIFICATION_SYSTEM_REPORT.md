# Phase 9: InternPulse Production Notification System & FCM Integration Report

**Project:** InternPulse — Next-Generation Institutional Internship & Geofence Attendance Platform  
**Institution:** Sri Manakula Vinayagar Engineering College (Autonomous) — SMVEC  
**System Architecture:** Multi-Platform (React 19 + TypeScript Notification Core, Flutter 3.x Mobile with FCM, Supabase PostgreSQL with RLS)  
**Document Reference:** `docs/phase9/NOTIFICATION_SYSTEM_REPORT.md`  
**Date:** November 2026  
**Status:** Completed, Production-Grade & 100% Verified (233 Automated Tests Passing across 11 Test Suites)  

---

## 1. Executive Summary

Phase 9 delivers the production implementation of the **InternPulse Notification & Alert System**, integrating **Firebase Cloud Messaging (FCM)** for cross-platform push delivery to Flutter mobile devices (Android and iOS) alongside authenticated PostgreSQL in-app notifications.

In collegiate and industrial internship monitoring, notification delivery is mission-critical: students must be alerted when randomized verification windows open, mentors must be notified when attendance anomalies occur, and department heads require high-level governance visibility. 

Phase 9 satisfies these requirements while enforcing strict privacy and institutional fairness:
1. **The 10 Canonical Notification Events:** Complete support for every milestone across the internship lifecycle.
2. **Role-Based Recipient Scoping:** Strict separation between HOD (institutional/department scope), Mentor (assigned student scope), and Student (isolated personal scope).
3. **Violation vs. Technical Failure Discrimination:** Clear separation between confirmed disciplinary infractions (`VIOLATION`) and hardware/environmental dropouts (`TECHNICAL_FAILURE`).
4. **FCM Token Lifecycle Management:** Automatic detection, failure counting, and invalidation of unregistered or expired device tokens (`UNREGISTERED` / `DEVICE_NOT_REGISTERED`).
5. **Exponential Backoff Retry Handling:** Up to 3 automatic retries for transient network drops (FCM 5xx / socket drops).
6. **Strict Privacy Sanitization:** Push payloads dispatched through third-party push gateways (Apple APNs and Google FCM) **never** contain raw GPS coordinates.
7. **Deduplication & Preference Governance:** Idempotent delivery prevents notification spam, while user quiet-hour preferences are respected without compromising urgent alerts.

---

## 2. Notification Architecture & Flow

```
+---------------------------------------------------------------------------------------------------+
|                                     Event Triggers in InternPulse                                 |
|  - Scheduler Engine (Phase 8)            - Geolocation Engine (Phase 7)                           |
|  - Assignment Workflow (Phase 5)         - Mobile Telemetry Sensors (Phase 6)                     |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                 Notification Classification & Sanitizer                           |
|  1. Categorize: [ VIOLATION ] | [ TECHNICAL_FAILURE ] | [ ATTENDANCE_PROMPT ] | [ SYSTEM_UPDATE ] |
|  2. Assign Priority: [ URGENT ] | [ HIGH ] | [ NORMAL ] | [ LOW ]                                 |
|  3. Deduplication Check: Evaluate deduplication_key (debounce duplicate pings)                    |
|  4. Privacy Sanitizer: STRIP raw latitude/longitude from telemetry payload                       |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                Role-Based Recipient Authorization (RBAC)                          |
|  - Student: Personal targeted delivery (recipient_id == student_id)                               |
|  - Mentor: Scoped strictly to assigned students (isMentorAuthorizedForStudent)                    |
|  - HOD: Scoped to department-level escalated alerts (confirmed violations, placements)            |
+-------------------------------------------------+-------------------------------------------------+
                                                  |
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                Multi-Channel Delivery & Token Management                          |
|                                                                                                   |
|  [ In-App Channel ]                                     [ Firebase Cloud Messaging (FCM) ]        |
|  - Persisted to public.notifications                    - Look up active fcm_device_tokens        |
|  - Realtime Supabase postgres_changes stream            - Exponential backoff retry on 5xx drops  |
|  - Unread badge counter tracking                        - Token Expired? --> Auto-invalidate token|
+---------------------------------------------------------------------------------------------------+
```

---

## 3. The 10 Canonical Notification Events

The notification engine standardizes on 10 explicit event types categorized by severity:

| # | Event Type String | Category | Default Priority | Authorized Recipients | Description & Action |
|---|-------------------|----------|------------------|-----------------------|----------------------|
| 1 | `new_internship_assignment` | `SYSTEM_UPDATE` | `NORMAL` | Student, Mentor, HOD | Approved workplace placement configured. Opens assignment card. |
| 2 | `upcoming_verification` | `ATTENDANCE_PROMPT` | `NORMAL` | Student | 5-minute pre-window alert notifying student of upcoming check. |
| 3 | `verification_request` | `ATTENDANCE_PROMPT` | `NORMAL` | Student | 15-minute verification window opened. Prompts location submission. |
| 4 | `successful_verification` | `ATTENDANCE_PROMPT` | `NORMAL` | Student, Mentor | Student presence verified within approved workplace geofence radius. |
| 5 | `confirmed_outside_geofence` | `VIOLATION` | `URGENT` | Student, Mentor, HOD | Valid high-accuracy GPS fix confirmed outside boundary. Escalated alert. |
| 6 | `missed_verification` | `ATTENDANCE_PROMPT` | `NORMAL` | Student, Mentor | Verification window expired without response. **Not an infraction.** |
| 7 | `gps_disabled` | `TECHNICAL_FAILURE` | `HIGH` | Student, Mentor | Device location sensor switched off. Prompts user to enable GPS. |
| 8 | `location_permission_revoked` | `TECHNICAL_FAILURE` | `HIGH` | Student, Mentor | Student app revoked permission or withheld consent. Action required. |
| 9 | `student_device_offline` | `TECHNICAL_FAILURE` | `HIGH` | Student, Mentor | Network offline / disconnected during check. Queue for retry. |
| 10| `internship_assignment_updated`| `SYSTEM_UPDATE` | `NORMAL` | Student, Mentor, HOD | Shift hours, mentor, or placement parameters updated by HOD. |

---

## 4. Recipient Scoping & Authorization Matrix

The notification authorization model in [`notificationAuthorizationPolicy.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/notifications/notificationAuthorizationPolicy.ts) strictly segregates alerts based on institutional roles:

### 4.1 Student Scope (Personal Isolation)
- Students receive alerts strictly targeted to `recipient_id = student.id`.
- Permitted events: their own assignment updates, personal verification prompts, presence verification confirmations, and device hardware troubleshooting prompts.
- Prohibited: Students cannot query, intercept, or receive alerts belonging to other students.

### 4.2 Mentor Scope (Assigned Student Scope)
- Mentors receive alerts strictly for **students assigned to their mentor roster** (`student.mentorId == mentor.id`).
- Permitted events: new placements under their guidance, confirmed geofence violations, missed check logs, device hardware failures (GPS off, offline).
- Prohibited: Cross-mentor unauthorized access is blocked; mentors cannot inspect alerts for students belonging to other faculty mentors.

### 4.3 HOD Scope (Department & Institutional Governance)
- HODs receive department-wide governance alerts for their department code (e.g. `CSEBS`, `IT`, `ECE`).
- Permitted events: all confirmed geofence violations across the department, new placements approved, schedule modifications.
- Routine individual verification requests (window open prompts) are withheld from HODs to avoid inbox fatigue.

---

## 5. Violation vs. Technical Failure Discrimination

> [!IMPORTANT]
> **Core Audit Principle:**  
> Technical sensor dropouts, dead zones, and battery shutdowns must never be communicated or classified as disciplinary violations.

The notification engine enforces structural categorization across all channels:

```
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| Operational Event                  | Notification Category    | Push Priority Level   | Visual Badge / UI Treatment |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| confirmed_outside_geofence         | VIOLATION                | URGENT (Bypasses quiet| Red badge, high-alert sound |
|                                    |                          | hours)                | "Confirmed Geofence Breach" |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| gps_disabled                       | TECHNICAL_FAILURE        | HIGH                  | Amber badge                 |
| location_permission_revoked        |                          |                       | "Hardware Sensor Required"  |
| student_device_offline             |                          |                       | "Device Offline / Offline"  |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| missed_verification                | ATTENDANCE_PROMPT        | NORMAL                | Gray badge                  |
|                                    |                          |                       | "Unattended Window Logged"  |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
| verification_request               | ATTENDANCE_PROMPT        | NORMAL                | Blue badge                  |
| upcoming_verification              |                          |                       | "Attendance Check In"       |
+------------------------------------+--------------------------+-----------------------+-----------------------------+
```

---

## 6. FCM Device Token Lifecycle & Retry Architecture

Push notification delivery via Firebase Cloud Messaging is managed in [`fcmGateway.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/notifications/fcmGateway.ts) and [`notificationService.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/notifications/notificationService.ts):

### 6.1 Token Registration & Invalidation
- Mobile clients register device tokens upon login via `registerDeviceToken(userId, deviceId, token, platform)`.
- When FCM returns registration errors (`messaging/registration-token-not-registered`, `UNREGISTERED`, `INVALID_ARGUMENT`):
  1. The gateway flags `isTokenExpired = true`.
  2. The service marks the token `isActive = false` and timestamps `expired_at = now()`.
  3. Stored procedure `public.invalidate_expired_device_token()` purges the stale token in PostgreSQL.
  4. Subsequent notification sweeps exclude dead tokens, preserving FCM quota and network bandwidth.

### 6.2 Exponential Backoff Retries
When FCM encounters transient 5xx server errors or socket timeouts:
- The gateway initiates up to **3 retry attempts**.
- Delay increases exponentially: $\text{delay} = \text{initialBackoff} \times 2^{\text{attempt} - 1}$ ($50\text{ms} \to 100\text{ms} \to 200\text{ms}$).
- If all 3 attempts fail, the record is marked `delivery_status = 'FAILED'` with incremented `retry_count`, while in-app notification persistence remains intact.

---

## 7. Privacy Protection: Zero Raw GPS Coordinates in Payloads

> [!CAUTION]
> **Privacy Security Guarantee:**  
> Push notifications travel through public networks, Google FCM, and Apple APNs servers. Push payloads must **never** expose student GPS coordinates (latitude, longitude).

1. **Service Payload Sanitization:** [`notificationService.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/notifications/notificationService.ts#L275-L285) automatically strips `latitude`, `longitude`, `captured_latitude`, `captured_longitude`, and `coords` from all metadata before constructing push envelopes.
2. **Gateway Assertive Privacy Gate:** [`fcmGateway.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/notifications/fcmGateway.ts#L85-L105) inspects all outgoing payloads. If any coordinate property is detected, it immediately throws a `SECURITY EXCEPTION` and aborts transmission.
3. **Opaque Identifiers:** Payloads carry only opaque references: `notificationId`, `notificationType`, `category`, and deep-link `actionUrl`. Coordinates remain secured inside Supabase PostgreSQL behind RLS policies.

---

## 8. Database Architecture & Migrations

The database expansion is codified in migration [`20261106000009_phase9_production_notification_system.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000009_phase9_production_notification_system.sql):

```sql
-- Deduplication index preventing identical duplicate alerts within time windows
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_dedup
    ON public.notifications(recipient_id, deduplication_key)
    WHERE deduplication_key IS NOT NULL;

-- Token lifecycle tracking
ALTER TABLE public.fcm_device_tokens
    ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN expired_at TIMESTAMPTZ,
    ADD COLUMN failure_count INT NOT NULL DEFAULT 0;

-- User notification preferences table
CREATE TABLE IF NOT EXISTS public.user_notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    push_enabled BOOLEAN NOT NULL DEFAULT true,
    in_app_enabled BOOLEAN NOT NULL DEFAULT true,
    verification_alerts BOOLEAN NOT NULL DEFAULT true,
    assignment_alerts BOOLEAN NOT NULL DEFAULT true,
    technical_alerts BOOLEAN NOT NULL DEFAULT true,
    quiet_hours_enabled BOOLEAN NOT NULL DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '07:00:00',
    CONSTRAINT uq_user_preferences UNIQUE (user_id)
);
```

---

## 9. Comprehensive Automated Test Results

The test suite in [`productionNotificationSystem.test.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/__tests__/productionNotificationSystem.test.ts) executes **18 dedicated automated tests** verifying delivery, authorization, retries, and privacy.

```
 RUN  v5.1.0 C:/PROJECTS/bose projects/Intern_smvmch/Intern_smvmch/InternPulse-main

 ✓ src/core/auth/__tests__/rlsSecurityPolicies.test.ts (34 tests) 64ms
 ✓ src/core/auth/__tests__/rolePermissions.test.ts (14 tests) 36ms
 ✓ src/core/auth/__tests__/productionNotificationSystem.test.ts (18 tests) 155ms
 ✓ src/core/auth/__tests__/geolocationVerificationEngine.test.ts (27 tests) 273ms
 ✓ src/core/auth/__tests__/randomVerificationScheduler.test.ts (21 tests) 239ms
 ✓ src/core/auth/__tests__/rbacAuthorization.test.ts (25 tests) 112ms
 ✓ src/core/auth/__tests__/flutterBackendIntegration.test.ts (15 tests) 61ms
 ✓ src/core/auth/__tests__/hodLocationManagement.test.ts (17 tests) 439ms
 ✓ src/core/auth/__tests__/productionAuth.test.ts (18 tests) 71ms
 ✓ src/core/auth/__tests__/internshipAssignmentWorkflow.test.ts (15 tests) 178ms
 ✓ src/core/auth/__tests__/mentorStudentManagement.test.ts (29 tests) 196ms

 Test Files  11 passed (11)
      Tests  233 passed (233)
   Duration  2.00s
```

### 9.1 Phase 9 Test Execution Matrix

| Test Category | Scenario Tested | Expected Result | Actual Outcome | Status |
|---|---|---|---|---|
| **10 Events** | Complete enumeration | All 10 canonical events defined and typed | 10 events verified | **PASS** |
| **Tailored Dispatch** | Dispatching all 10 events | Unique title, message, and action URL generated | All 10 dispatched | **PASS** |
| **Violation Categorization** | Confirmed outside geofence | Category `VIOLATION`, Priority `URGENT` | `VIOLATION` assigned | **PASS** |
| **Technical Failure** | GPS off, offline, permission revoked | Category `TECHNICAL_FAILURE`, Priority `HIGH` | `TECHNICAL_FAILURE` | **PASS** |
| **Missed Check Policy** | Window expired without submission | Category `ATTENDANCE_PROMPT`, non-punitive | Non-violation verified| **PASS** |
| **Student Isolation** | Verification request dispatch | Dispatched strictly to student (`recipient_id`) | Targeted to student | **PASS** |
| **Violation Escalation** | Geofence breach | Dispatched to Student, Mentor, and HOD | 3 recipients alerted | **PASS** |
| **Cross-Mentor Block** | Mentor requesting other mentor's student | Rejected by authorization policy | Blocked | **PASS** |
| **Student Privacy RBAC** | Student reading other student's inbox | Rejected by authorization policy | Blocked | **PASS** |
| **Deduplication** | Immediate duplicate dispatch attempt | Suppressed; duplicate count incremented | Duplicate prevented | **PASS** |
| **FCM Backoff Retry** | Transient FCM 503 errors (2 drops) | Retries with exponential delay; delivers | Delivered on attempt 3| **PASS** |
| **FCM Failure Ceiling** | Persistent FCM errors exceeding max | Marks `FAILED`, increments `retryCount` | `FAILED` recorded | **PASS** |
| **Expired Token Purge** | FCM reports unregistered token | Automatically marks `isActive = false`, records expiry | Purged from pool | **PASS** |
| **Category Preferences** | User opts out of assignment updates | Notification suppressed for that user | Suppressed | **PASS** |
| **URGENT Bypass** | Geofence violation during quiet hours | Bypasses quiet hours and user opt-outs | Delivered (Bypassed) | **PASS** |
| **Payload Privacy** | Dispatching alert with coordinates | Strips `latitude` and `longitude` from payload | Coords removed | **PASS** |
| **Gateway Security Gate**| Illegal payload with coords to gateway | Throws `SECURITY EXCEPTION`, halts push | Exception thrown | **PASS** |
| **Read/Unread Tracking** | Marking single and bulk read | Unread count decrements accurately | 2 $\to$ 1 $\to$ 0 | **PASS** |

---

## 10. Conclusion

Phase 9 completes the production-oriented notification and alerting system for InternPulse. By uniting server-side notification persistence, Firebase Cloud Messaging push dispatch, role-based recipient isolation, and automatic expired token invalidation, the platform ensures rapid, dependable, and privacy-preserving communication across students, faculty mentors, and department heads.

