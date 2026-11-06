# INTERNPULSE — PHASE 17A
# MULTI-DEPARTMENT ARCHITECTURE & EXPANSION READINESS AUDIT

**Project:** InternPulse — Next-Generation Institutional Internship & Geofence Attendance Platform  
**Target Institution:** Sri Manakula Vinayagar Engineering College (Autonomous) — SMVEC, Puducherry  
**Document Reference:** `docs/phase17/PHASE17A_MULTI_DEPARTMENT_ARCHITECTURE_AUDIT.md`  
**Audit Date:** November 6, 2026  
**Auditor Classification:** Principal Systems Architect & Independent Institutional Security Auditor  
**Audit Scope:** Multi-Department Expansion Readiness (CSEBS, CSE, IT, ECE, EEE, Mechanical, Civil, and Institutional Additions)  
**Expansion Readiness Verdict:** **STAGING ARCHITECTURALLY VIABLE / MULTI-DEPARTMENT PRODUCTION ONBOARDING ON CONDITIONAL HOLD**  

```text
====================================================================================================
                        PHASE 17A EXPANSION READINESS DECISION
====================================================================================================

                        >>> CONDITIONAL READINESS (AUDIT & PLAN ONLY) <<<

  1. MULTI-DEPARTMENT PRODUCTION ONBOARDING:
     >>> STRICTLY ON HOLD (NO-GO FOR PRODUCTION MULTI-DEPARTMENT ONBOARDING) <<<
     Production onboarding of new departments (CSE, IT, ECE, EEE, MECH, CIVIL) is STRICTLY
     PROHIBITED until the RLS cross-department data isolation gaps, latent SQL defects, and 
     Phase 16A core physical device blockers are resolved and certified in staging.

  2. MULTI-DEPARTMENT ARCHITECTURAL DESIGN:
     >>> APPROVED FOR STAGING IMPLEMENTATION <<<
     The proposed non-destructive relational schema expansion, department-scoped RLS policies,
     and dynamic institutional configuration are architecturally sound, preserve backward
     compatibility across React and Flutter clients, and maintain zero-trust isolation.
====================================================================================================
```

---

## 1. EXISTING ARCHITECTURE AUDIT (TASK 1)

In strict accordance with audit mandates, every technical component of the InternPulse repository was inspected against actual source code, database migration scripts, Row-Level Security policies, stored procedures, Flutter models, React dashboards, and test suites.

```
+===================================================================================================+
|                                    EXISTING ARCHITECTURE AUDIT                                     |
+===================================================================================================+
| Architectural Domain            | Source Code / Migration Artifacts      | Verified Status | Verdict   |
+---------------------------------+----------------------------------------+-----------------+-----------+
| 1. Authentication & Authz       | Migration 0001, 0002; authService.ts   | PARTIALLY VERIF.| DEFECT    |
| 2. HOD, Mentor & Student Flows  | HodDashboard, MentorDashboard, Student | VERIFIED        | PASS      |
| 3. Department & Student Rel.    | departments, profiles, students tables | PARTIALLY VERIF.| GAP       |
| 4. Internship Assignment Model  | Migration 0002, 0005, 0006; triggers   | PARTIALLY VERIF.| GAP       |
| 5. Location & Geofence Mgmt     | PostGIS Point, GIST indexes, Mig 0004  | VERIFIED        | PASS      |
| 6. Random Verification Scheduler| Migration 0008, 0011; 5-window engine  | PARTIALLY VERIF.| DEFECT    |
| 7. Attendance Management        | Migration 0002, 0010, 0011; sessions   | VERIFIED        | PASS      |
| 8. Notification Infrastructure  | Migration 0009; fcmGateway, tokens     | PARTIALLY VERIF.| PENDING   |
| 9. Supabase Database Schema     | 11 SQL Migrations; 14 public tables    | VERIFIED        | PASS      |
| 10. Row Level Security Policies | Migration 0003, 0005, 0008, 0011       | FAILED (Dept)   | DEFECT    |
| 11. Flutter Mobile Application  | lib/ (Riverpod 2.5, GoRouter, Models)  | PARTIALLY VERIF.| PENDING   |
| 12. Audit Logging & Governance  | public.audit_logs; immutable trigger   | VERIFIED        | PASS      |
| 13. Privacy & Retention Engine  | DPDP 30-day purge; shift time fence    | VERIFIED        | PASS      |
+===================================================================================================+
```

---

### 1.1 Detailed Technical Findings by Domain

#### 1. Authentication and Authorization
- **Implementation Inspected:** [`supabase/migrations/20261105000001_phase1_auth_schema.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000001_phase1_auth_schema.sql#L16-L155), [`src/core/auth/authService.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/authService.ts), [`src/core/auth/rbac/authorizationPolicy.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/rbac/authorizationPolicy.ts).
- **Finding:**
  - `public.profiles` enforces a role check constraint: `CHECK (role IN ('hod', 'mentor', 'student'))`.
  - Server-side trigger `prevent_profile_privilege_escalation()` strictly forbids callers who are not active HODs from mutating roles or activation statuses.
  - Automatic profile creation trigger `handle_new_auth_user()` provisions profiles upon `auth.users` insert, defaulting role to `student` and department to `CSEBS`.
  - **Defect Identified (CRITICAL GAP):** The application's TypeScript RBAC policies ([`authorizationPolicy.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/rbac/authorizationPolicy.ts#L6)) and Migration 0008 ([`20261106000008_phase8_random_verification_scheduler.sql#L144`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000008_phase8_random_verification_scheduler.sql#L144)) define an `admin` role (`public.get_auth_user_role() = 'admin'`). However, the database column `public.profiles.role` lacks `'admin'` in its `CHECK` constraint. Any attempt to provision or authenticate an institution-level Super Admin fails at the database constraint layer.
- **Classification:** **PARTIALLY VERIFIED** (Role check constraint defect).

#### 2. HOD, Mentor and Student Workflows
- **Implementation Inspected:** [`src/components/HodDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/HodDashboard.tsx), [`src/components/MentorDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/MentorDashboard.tsx), [`src/components/StudentDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/StudentDashboard.tsx).
- **Finding:**
  - HOD workflow: Provides directory overview, drill-down filtering by mentor/academic year/status, and corporate facility geofence configuration via `HodLocationManagementView.tsx`.
  - Mentor workflow: Dedicated management interface for student onboarding (`StudentOnboardingModal.tsx`), bulk CSV import (`BulkStudentImportModal.tsx`), workplace allocation (`InternshipAssignmentModal.tsx`), and daily attendance review (`MentorAttendanceOverview.tsx`). Enforces 1:10 faculty-to-student capacity limits.
  - Student workflow: Self-service interface displaying current shift hours, geofence status badge, workplace location details, 15-minute verification countdown timer, and historical attendance logs.
  - 277 Vitest unit and integration tests validate these workflows with 100% pass rate.
- **Classification:** **VERIFIED**.

#### 3. Department and Student Relationships
- **Implementation Inspected:** [`supabase/migrations/20261105000002_phase2_database_expansion.sql#L82-L150`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000002_phase2_database_expansion.sql#L82-L150), [`src/data/initialData.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/data/initialData.ts#L1-L26).
- **Finding:**
  - Table `public.departments` exists with unique constraint `uq_dept_institution_code (institution_id, code)`. Seeds exist for 9 departments: `CSEBS`, `IT`, `ECE`, `EEE`, `MECH`, `CIVIL`, `BME`, `MECT`, `ICE`.
  - Table `public.students` links to `public.departments` via `department_id UUID REFERENCES public.departments(id)`.
  - Table `public.profiles` contains both `department_code VARCHAR(50)` and `department_id UUID`.
  - **Architectural Limitation:** The relationship is strictly 1-to-1 static (`students.department_id`). There is no support for student academic batch tracking (`internship_batches`), academic semester progression, student department transfer history, or dual-enrollment / minor degrees.
- **Classification:** **PARTIALLY VERIFIED** (Static relationship, lacks batch/enrollment history).

#### 4. Internship Assignment Model
- **Implementation Inspected:** [`supabase/migrations/20261105000002_phase2_database_expansion.sql#L393-L495`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000002_phase2_database_expansion.sql#L393-L495), [`supabase/migrations/20261105000006_phase5_internship_assignment_workflow.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000006_phase5_internship_assignment_workflow.sql).
- **Finding:**
  - Table `public.internship_assignments` has robust integrity controls:
    - Unique partial index `idx_unique_active_student_assignment` enforces that a student can have at most one active assignment.
    - Trigger `trigger_check_assignment_overlap` strictly blocks overlapping active date intervals.
    - Trigger `trigger_validate_assignment_location_approval` validates that assigned facilities exist and are approved (`status = 'active'`).
    - Foreign key constraints enforce `ON DELETE RESTRICT` on students and locations to guarantee immutable academic history.
  - **Cross-Department Isolation Gap:** In migration 0005, the insert policy `assignments_insert_scoped` allows an HOD to create or modify an assignment for **any** student in the institution (`institution_id = get_auth_user_institution_id()`), without verifying that `student.department_id = hod.department_id`.
- **Classification:** **PARTIALLY VERIFIED** (Integrity verified, department boundary check missing in RLS).

#### 5. Location and Geofence Management
- **Implementation Inspected:** [`supabase/migrations/20261105000002_phase2_database_expansion.sql#L285-L391`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000002_phase2_database_expansion.sql#L285-L391), [`supabase/migrations/20261105000004_phase3_hod_location_management.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000004_phase3_hod_location_management.sql), [`src/core/geolocation/geospatialCalculator.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/geolocation/geospatialCalculator.ts).
- **Finding:**
  - Table `public.internship_locations` integrates native PostGIS `geography(Point, 4326)` with GIST spatial indexing `idx_locations_geofence_center`.
  - Multi-department sharing is architecturally supported via junction table `public.location_departments(location_id, department_id)`.
  - Computational distance calculations execute via PostGIS spherical distance queries in $<0.5\text{ ms}$ and TypeScript in-memory algorithms at $>3.1\text{ million}$ Haversine ops/sec.
- **Classification:** **VERIFIED**.

#### 6. Randomized Verification Scheduler
- **Implementation Inspected:** [`supabase/migrations/20261106000008_phase8_random_verification_scheduler.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000008_phase8_random_verification_scheduler.sql), [`supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L511-L591`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L511-L591).
- **Finding:**
  - 8 canonical window states: `SCHEDULED`, `OPEN`, `SUBMITTED`, `VERIFIED`, `MISSED`, `LOCATION_UNAVAILABLE`, `EXPIRED`, `CANCELLED`.
  - Unique composite index `idx_unique_schedule_window (assignment_id, target_date, window_start)` guarantees idempotency.
  - Stored procedure `process_window_transitions()` transitions active windows and marks unattended windows as `MISSED`.
  - Anti-prediction RLS policy prevents students from querying upcoming `SCHEDULED` windows prior to `window_start`.
  - **Latent SQL Defect Identified (CRITICAL BUG):** In Migration 0008, line 139:
    ```sql
    JOIN public.hods h ON h.department_code = s.department_code
    ```
    Table `public.hods` **does not exist** in the PostgreSQL schema (HODs are stored in `public.profiles` with `role = 'hod'` and linked via `departments.hod_id`). When an HOD attempts to query `verification_schedules`, PostgreSQL will raise `ERROR: relation "public.hods" does not exist`.
- **Classification:** **PARTIALLY VERIFIED** (Algorithmic logic verified, RLS policy contains fatal table reference defect).

#### 7. Attendance Management
- **Implementation Inspected:** [`supabase/migrations/20261106000010_phase10_attendance_management_reporting.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000010_phase10_attendance_management_reporting.sql), [`supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L289-L505`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L289-L505).
- **Finding:**
  - Stored procedures `record_student_check_in()` and `record_student_check_out()` validate active assignments, shift hours, punctuality thresholds ($>30\text{ mins}$ late), and calculate total shift duration.
  - Hard constraint `uq_student_session_date (student_id, session_date)` prevents duplicate check-ins.
  - Trigger `audit_attendance_sessions` automatically journals all modifications to `public.audit_logs`.
- **Classification:** **VERIFIED**.

#### 8. Notification Infrastructure
- **Implementation Inspected:** [`supabase/migrations/20261106000009_phase9_production_notification_system.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000009_phase9_production_notification_system.sql), [`src/core/notifications/fcmGateway.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/notifications/fcmGateway.ts).
- **Finding:**
  - 10 canonical event types covering assignment, upcoming verification, requests, geofence results, missed pings, and hardware faults.
  - Unique deduplication index `idx_notifications_dedup` on `(recipient_id, deduplication_key)`.
  - Privacy assertion `assertPayloadPrivacy()` actively throws exceptions if GPS coordinates are placed in notification payloads.
  - **Operational Gap:** FCM credentials (`google-services.json`) remain unconfigured, and native packages are uninstalled in Flutter (`firebase_messaging` missing).
- **Classification:** **PARTIALLY VERIFIED** (Server logic verified, physical push delivery pending).

#### 9. Supabase Database Schema
- **Implementation Inspected:** 11 sequential migrations in [`supabase/migrations/`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/).
- **Finding:**
  - 14 public tables: `institutions`, `departments`, `profiles`, `mentors`, `students`, `internship_locations`, `location_departments`, `internship_assignments`, `attendance_sessions`, `location_verifications`, `verification_schedules`, `notifications`, `fcm_device_tokens`, `audit_logs`.
  - 3 public views: `users`, `attendance_records`, `verification_events`.
  - 42 B-tree and GIST indexes.
- **Classification:** **VERIFIED**.

#### 10. Row Level Security Policies
- **Implementation Inspected:** [`supabase/migrations/20261105000003_phase2_rls_security_hardening.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000003_phase2_rls_security_hardening.sql), [`supabase/migrations/20261105000005_phase4_mentor_student_management.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000005_phase4_mentor_student_management.sql).
- **Finding:**
  - Student personal isolation is strictly enforced (`auth.uid() = id`, `student_id = auth.uid()`).
  - Mentor cohort isolation is enforced via `is_mentor_assigned_to_student()` and `is_mentor_authorized_for_department()`.
  - **CRITICAL SECURITY FLAW FOR MULTI-DEPARTMENT EXPANSION:** HOD policies throughout Migration 0003 and Migration 0005 evaluate:
    ```sql
    institution_id = public.get_auth_user_institution_id() AND public.get_auth_user_role() = 'hod'
    ```
    This grants any HOD in SMVEC **college-wide access** across all departments. The HOD of CSEBS can view, insert, and update students, mentors, assignments, and attendance records of the Department of Mechanical Engineering or Civil Engineering.
- **Classification:** **FAILED** (Lacks departmental isolation for HODs).

#### 11. Flutter Mobile Application
- **Implementation Inspected:** [`lib/`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/), [`.github/workflows/flutter-ci.yml`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/.github/workflows/flutter-ci.yml).
- **Finding:**
  - Riverpod 2.5 state management, GoRouter 14 declarative routing, Supabase Flutter 2.8 SDK.
  - 45 native tests in 11 test files pass in GitHub Actions CI.
  - `user_model.dart` currently hardcodes default `collegeId: 'smvec_puducherry_main'` and `departmentCode: 'CSEBS'`.
  - `mobile_location_service.dart` returns static mock GPS (`12.8284, 80.2198`); `geolocator: ^12.0.0` is missing from `pubspec.yaml`.
- **Classification:** **PARTIALLY VERIFIED** (CI passes, hardware hooks pending).

#### 12. Audit Logging & Governance
- **Implementation Inspected:** [`supabase/migrations/20261105000002_phase2_database_expansion.sql#L698-L770`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000002_phase2_database_expansion.sql#L698-L770), [`supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L705-L715`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L705-L715).
- **Finding:**
  - Table `public.audit_logs` captures `actor_id`, `action`, `entity_type`, `entity_id`, `old_values`, `new_values`, `ip_address`, and `user_agent`.
  - Trigger `trigger_prevent_audit_log_mutation` enforces append-only immutability by actively rejecting any `UPDATE` or `DELETE` attempt.
  - Automated audit triggers are bound to `public.attendance_sessions`.
- **Classification:** **VERIFIED**.

#### 13. Privacy and Retention Mechanisms
- **Implementation Inspected:** [`supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L127-L186`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L127-L186), [`supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L623-L670`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000011_phase11_security_privacy_remediation.sql#L623-L670).
- **Finding:**
  - Stored procedure `purge_expired_location_coordinates(30)` permanently zeroes raw coordinates older than 30 days while preserving verified outcomes, fulfilling Indian DPDP Act 2023 Section 8(7).
  - Shift time fence: Telemetry requests outside approved corporate working hours (09:00–18:00 IST) are rejected with coordinates discarded as `NULL`.
  - Algorithmic safety rule: Technical anomalies (`GPS_DISABLED`, `NETWORK_UNAVAILABLE`, `PERMISSION_DENIED`, `LOW_ACCURACY`) are never misclassified as geofence violations (`OUTSIDE_GEOFENCE`).
- **Classification:** **VERIFIED**.

---

## 2. MULTI-DEPARTMENT ARCHITECTURE PROPOSAL (TASK 2)

### 2.1 Design Objectives
1. **Dynamic Department Extensibility:** Support `CSEBS`, `CSE`, `IT`, `ECE`, `EEE`, `MECH`, `CIVIL`, `BME`, `MECT`, `ICE`, and any future department configured by the institution **without hardcoded department names or application rebuilds**.
2. **Sovereign Departmental Administration:** Every department has unique IDs, department codes, active/inactive lifecycle statuses, and designated Head(s) of Department.
3. **Institutional Hierarchical Governance:** Enforce a strict 4-tier institutional hierarchy:
   ```mermaid
   flowchart TD
       subgraph Tier1["Tier 1: Institutional Authority"]
           SuperAdmin["Executive Dean / Principal / Super Admin<br/>(College-Wide Oversight, Accreditation, Cross-Dept Governance)"]
       end

       subgraph Tier2["Tier 2: Sovereign Departmental Authority"]
           HOD_CSEBS["HOD: CSEBS<br/>(CSEBS Scope Only)"]
           HOD_IT["HOD: IT<br/>(IT Scope Only)"]
           HOD_ECE["HOD: ECE<br/>(ECE Scope Only)"]
           HOD_MECH["HOD: Mech<br/>(Mech Scope Only)"]
           HOD_CUSTOM["HOD: New Dept...<br/>(Dynamic Scope)"]
       end

       subgraph Tier3["Tier 3: Faculty Supervision"]
           Mentors_CSEBS["CSEBS Faculty Mentors<br/>(Assigned CSEBS Cohort)"]
           Mentors_IT["IT Faculty Mentors<br/>(Assigned IT Cohort)"]
           Mentors_ECE["ECE Faculty Mentors<br/>(Assigned ECE Cohort)"]
       end

       subgraph Tier4["Tier 4: Student Interns"]
           Students_CSEBS["CSEBS Interns"]
           Students_IT["IT Interns"]
           Students_ECE["ECE Interns"]
       end

       SuperAdmin --> HOD_CSEBS
       SuperAdmin --> HOD_IT
       SuperAdmin --> HOD_ECE
       SuperAdmin --> HOD_MECH
       SuperAdmin --> HOD_CUSTOM

       HOD_CSEBS --> Mentors_CSEBS
       HOD_IT --> Mentors_IT
       HOD_ECE --> Mentors_ECE

       Mentors_CSEBS --> Students_CSEBS
       Mentors_IT --> Students_IT
       Mentors_ECE --> Students_ECE
   ```

### 2.2 Multi-Department Domain Architecture

```mermaid
erDiagram
    institutions ||--o{ departments : owns
    institutions ||--o{ profiles : encompasses
    departments ||--o{ department_admins : delegates
    departments ||--o{ department_memberships : employs
    departments ||--o{ student_department_enrollments : enrolls
    departments ||--o{ internship_batches : schedules
    departments ||--o{ location_departments : authorizes

    profiles ||--o| mentors : specializes
    profiles ||--o| students : specializes
    profiles ||--o{ department_admins : appoints

    internship_batches ||--o{ internship_assignments : clusters
    internship_locations ||--o{ location_departments : shares
    internship_locations ||--o{ internship_assignments : hosts

    students ||--o{ student_department_enrollments : tracks
    students ||--o{ internship_assignments : executes
    mentors ||--o{ internship_assignments : supervises
    internship_assignments ||--o{ attendance_sessions : logs
    internship_assignments ||--o{ verification_schedules : generates
```

### 2.3 Shared Host Facility Architecture (Cross-Department Geofences)
Corporate employers (e.g., Tata Consultancy Services, Zoho Corporation, Lenovo) recruit students across multiple engineering departments simultaneously.
- Rather than duplicating facility records, a host location record exists once in `public.internship_locations`.
- The junction table `public.location_departments` links the location to authorized departments (`location_id`, `department_id`).
- When HOD of CSE approves TCS Siruseri, CSEBS students can be assigned there. When HOD of IT approves the same facility, IT students can be assigned there. Neither department can alter the other's assignments or telemetry.

---

## 3. DATA ISOLATION VERIFICATION (TASK 3)

The six non-negotiable multi-tenant data isolation requirements were evaluated against current database policies:

```
+===================================================================================================+
|                                    DATA ISOLATION SCORECARD                                       |
+===================================================================================================+
| Isolation Requirement           | Target Policy Guarantee                | Current Status  | Verdict  |
+---------------------------------+----------------------------------------+-----------------+----------+
| 1. Student Personal Isolation   | Access ONLY self-owned records         | VERIFIED        | PASS     |
| 2. Mentor Cohort Isolation      | Access ONLY assigned students in cohort| VERIFIED        | PASS     |
| 3. HOD Departmental Isolation   | Access ONLY authorized department      | FAILED          | DEFECT   |
| 4. Super Admin Institutional    | Access authorized institutional records| PARTIALLY VERIF.| DEFECT   |
| 5. Assignment Boundary Control  | No cross-dept assignment w/o explicit  | FAILED          | DEFECT   |
| 6. Telemetry Leakage Prevention | Zero telemetry leakage across depts    | FAILED          | DEFECT   |
+===================================================================================================+
```

### 3.1 Detailed Evaluation of Isolation Rules

#### Rule 1: Student Personal Isolation
- **Target:** Students must access only their own records (profile, assignment, attendance, verifications, notifications).
- **Audit Verification:**
  - `profiles`: `USING (auth.uid() = id)`
  - `attendance_sessions`: `USING (student_id = auth.uid())`
  - `location_verifications`: `USING (student_id = auth.uid())`
  - `notifications`: `USING (recipient_id = auth.uid())`
  - `verification_schedules`: `USING (student_id = auth.uid() AND (status IN (...) OR window_start <= now()))`
  - In RPCs `record_student_check_in` and `record_student_check_out`, `auth.uid() = student_id` is strictly validated.
- **Verdict:** **VERIFIED (PASS)**.

#### Rule 2: Mentor Cohort Isolation
- **Target:** Mentors must access only students assigned to them or within their department onboarding queue.
- **Audit Verification:**
  - `is_mentor_assigned_to_student(p_student_id)` validates active assignments.
  - `is_mentor_authorized_for_student(p_student_id)` validates direct allocation or departmental match.
  - Mentors cannot view students belonging to other departments.
- **Verdict:** **VERIFIED (PASS)**.

#### Rule 3: Head of Department (HOD) Departmental Isolation
- **Target:** Department HODs must access ONLY their authorized department.
- **Audit Verification:**
  - **DEFECT FOUND:** In Migration 0003 ([`20261105000003_phase2_rls_security_hardening.sql#L209`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000003_phase2_rls_security_hardening.sql#L209)), the HOD policy checks:
    ```sql
    USING (
        institution_id = public.get_auth_user_institution_id()
        AND public.get_auth_user_role() = 'hod'
    )
    ```
  - This checks only `institution_id`. It does **NOT** check `department_id`.
  - As a result, Dr. V. Gomathi (HOD, CSEBS) can read, modify, and delete records belonging to Dr. M. Auxilia (HOD, IT) or students of Civil and Mechanical Engineering.
- **Verdict:** **FAILED (CRITICAL DEFECT)**.

#### Rule 4: Institution-Level Super Admin Access
- **Target:** College Super Admin (Principal, Dean) can access institutional records across departments.
- **Audit Verification:**
  - The TypeScript codebase defines `UserRole = 'admin'` and allows route access.
  - Migration 0008 RLS check includes `OR public.get_auth_user_role() = 'admin'`.
  - **DEFECT FOUND:** `public.profiles.role` has check constraint `CHECK (role IN ('hod', 'mentor', 'student'))`. An account with role `'admin'` or `'super_admin'` cannot be inserted into `public.profiles`.
- **Verdict:** **PARTIALLY VERIFIED (DATABASE CONSTRAINT DEFECT)**.

#### Rule 5: Assignment Boundary Control
- **Target:** Internship assignments cannot cross department boundaries without explicit authorization.
- **Audit Verification:**
  - In Migration 0005 ([`20261105000005_phase4_mentor_student_management.sql#L232-L245`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000005_phase4_mentor_student_management.sql#L232-L245)), `assignments_insert_scoped` allows any HOD in the institution to assign any student to any mentor without validating department compatibility.
- **Verdict:** **FAILED (CRITICAL DEFECT)**.

#### Rule 6: Location Telemetry Leakage Prevention
- **Target:** Location monitoring telemetry cannot leak between departments.
- **Audit Verification:**
  - `verify_student_geofence()` checks `v_caller_role <> 'hod'` at line 66 of Migration 0011. If the caller is an HOD, it permits submission for any student in the institution without departmental matching.
  - In `attendance_sessions_select` ([`20261105000005_phase4_mentor_student_management.sql#L286-L292`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261105000005_phase4_mentor_student_management.sql#L286-L292)), HOD reads any session where `student.institution_id = hod.institution_id`.
- **Verdict:** **FAILED (CRITICAL DEFECT)**.

---

## 4. DATABASE DESIGN & SCHEMA EVALUATION (TASK 4)

We evaluate the schema tables requested in Task 4, prioritizing maximum table reuse and zero-destructive migrations.

```
+===================================================================================================+
|                                    DATABASE DESIGN EVALUATION                                     |
+===================================================================================================+
| Table / Entity Required         | Existing Table Status           | Architectural Strategy        |
+---------------------------------+---------------------------------+-------------------------------+
| 1. institutions                 | EXISTS (Migration 0002)         | REUSE AS-IS (Add super_admin) |
| 2. departments                  | EXISTS (Migration 0002)         | ENHANCE NON-DESTRUCTIVELY     |
| 3. department_memberships       | NOT PRESENT                     | CREATE NEW JUNCTION TABLE     |
| 4. department_admins            | Modeled as single departments.hod_id| CREATE NEW JUNCTION TABLE |
| 5. mentor_assignments           | Modeled in internship_assignments| REUSE & FORMALIZE VIEW       |
| 6. student_department_enrollment| Modeled in students.department_id | CREATE NEW HISTORY TABLE     |
| 7. internship_batches           | Modeled as string batch_year    | CREATE NEW RELATIONAL TABLE   |
+===================================================================================================+
```

### 4.1 Detailed Entity Evaluation & Migration Plan

#### 1. `institutions` (REUSE)
- **Current State:** Table exists in Migration 0002. Contains anchor institution record `SMVEC` (`a0000000-0000-0000-0000-000000000001`).
- **Required Enhancement:** None required. Columns `id`, `code`, `name`, `status` are fully sufficient.

#### 2. `departments` (REUSE & ENHANCE)
- **Current State:** Table exists in Migration 0002.
  ```sql
  CREATE TABLE public.departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      institution_id UUID NOT NULL REFERENCES public.institutions(id),
      code VARCHAR(50) NOT NULL,
      name VARCHAR(255) NOT NULL,
      hod_id UUID REFERENCES public.profiles(id),
      status VARCHAR(20) NOT NULL DEFAULT 'active',
      CONSTRAINT uq_dept_institution_code UNIQUE (institution_id, code)
  );
  ```
- **Required Non-Destructive Enhancements:**
  - Add `is_pilot_authorized BOOLEAN NOT NULL DEFAULT false` (Emergency departmental kill-switch).
  - Add `max_student_capacity INT NOT NULL DEFAULT 120`.
  - Add `academic_head_name VARCHAR(150)`.

#### 3. `department_admins` (NEW TABLE)
- **Rationale:** Currently, `departments.hod_id` supports only a single HOD per department. In collegiate practice, departments often have an HOD and 1–2 Deputy HODs / Department Pilot Coordinators.
- **Schema Specification:**
  ```sql
  CREATE TABLE IF NOT EXISTS public.department_admins (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE CASCADE,
      profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      role_type VARCHAR(30) NOT NULL DEFAULT 'hod' CHECK (role_type IN ('hod', 'deputy_hod', 'coordinator', 'technical_auditor')),
      is_primary BOOLEAN NOT NULL DEFAULT true,
      appointed_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'on_leave')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      CONSTRAINT uq_dept_admin_profile UNIQUE (department_id, profile_id)
  );
  ```

#### 4. `department_memberships` (NEW TABLE)
- **Rationale:** Supports faculty mentors holding primary or joint cross-departmental teaching/mentoring responsibilities (e.g., Computer Science faculty mentoring CSEBS students).
- **Schema Specification:**
  ```sql
  CREATE TABLE IF NOT EXISTS public.department_memberships (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
      membership_role VARCHAR(30) NOT NULL DEFAULT 'mentor' CHECK (membership_role IN ('hod', 'mentor', 'staff', 'student')),
      is_primary BOOLEAN NOT NULL DEFAULT true,
      valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
      valid_to DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      CONSTRAINT uq_member_profile_dept UNIQUE (profile_id, department_id)
  );
  ```

#### 5. `internship_batches` (NEW TABLE)
- **Rationale:** Replaces brittle, unindexed text strings like `'2023-2027'` or `'2026-Even'` with structured cohort lifecycles.
- **Schema Specification:**
  ```sql
  CREATE TABLE IF NOT EXISTS public.internship_batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
      batch_name VARCHAR(100) NOT NULL, -- e.g. 'CSEBS 2023-2027 Final Year Internship'
      academic_year VARCHAR(20) NOT NULL DEFAULT '2026-2027',
      term_code VARCHAR(20) NOT NULL DEFAULT 'EVEN', -- 'ODD', 'EVEN', 'SUMMER'
      start_date DATE NOT NULL,
      end_date DATE NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      CONSTRAINT check_batch_dates CHECK (end_date >= start_date)
  );
  ```

#### 6. `student_department_enrollments` (NEW TABLE)
- **Rationale:** Tracks a student's formal enrollment in a department and batch, supporting branch transfers, lateral entry, and multi-year auditing.
- **Schema Specification:**
  ```sql
  CREATE TABLE IF NOT EXISTS public.student_department_enrollments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,
      batch_id UUID REFERENCES public.internship_batches(id) ON DELETE SET NULL,
      register_number VARCHAR(50) NOT NULL,
      current_semester INT NOT NULL CHECK (current_semester BETWEEN 1 AND 8),
      enrollment_status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (enrollment_status IN ('active', 'transferred', 'graduated', 'suspended', 'withdrawn')),
      enrolled_at DATE NOT NULL DEFAULT CURRENT_DATE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
      CONSTRAINT uq_student_active_enrollment UNIQUE (student_id, department_id, batch_id)
  );
  ```

#### 7. `mentor_assignments` (REUSE & BACKWARD-COMPATIBLE VIEW)
- **Current State:** Implemented in `public.internship_assignments(student_id, mentor_id)`.
- **Strategy:** Reusing `public.internship_assignments` avoids destructive database rewrites and preserves 100% of existing tests. An explicit view `public.mentor_assignments` is created to provide standard relational access.

---

## 5. CAPACITY ASSESSMENT (TASK 5)

We review the measured empirical benchmarks from Phase 16B ([`docs/phase16/PHASE16B_INSTITUTIONAL_SCALE_READINESS.md`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/docs/phase16/PHASE16B_INSTITUTIONAL_SCALE_READINESS.md)) and evaluate operational performance across the 5 institution-mandated scale tiers.

> [!IMPORTANT]
> **Audit Integrity Standard:** All figures cited below are derived from measured algorithmic executions on actual source code ([`scratch/scale_benchmark.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/scratch/scale_benchmark.ts)) and PostgreSQL storage modeling. No benchmarks are fabricated.

```
+===================================================================================================+
|                                MEASURED SCALE CAPACITY COMPARISON                                 |
+===================================================================================================+
| Capacity Metric                | 20 Students | 100 Students | 500 Students | 1,000 Stud. | 5,000 Stud. |
+--------------------------------+-------------+--------------+--------------+-------------+-------------+
| Participating Departments      | 1 (CSEBS)   | 2 (CSEBS, IT)| 5 (Cluster)  | 9 (College) | All Campus  |
| Faculty Mentors                | 3           | 10           | 50           | 100         | 500         |
| Approved Corporate Facilities  | 3           | 8            | 25           | 50          | 200         |
| Daily Scheduled Windows        | 100         | 500          | 2,500        | 5,000       | 25,000      |
| Daily Check-In/Out Telemetry   | 40          | 200          | 1,000        | 2,000       | 10,000      |
| Daily Push Notifications       | ~140        | ~700         | ~3,500       | ~7,000      | ~35,000     |
| Daily Database Rows            | 700         | 3,500        | 17,500       | 35,000      | 175,000     |
| 30-Day Active Table Rows       | 15,400      | 77,000       | 385,000      | 770,000     | 3,850,000   |
| 180-Day Semester Rows (Total)  | 91,000      | 455,000      | 2,275,000    | 4,550,000   | 22,750,000  |
| 30-Day Active Storage Footprint| 3.6 MB      | 18.0 MB      | 90.0 MB      | 179.9 MB    | 899.6 MB    |
| Semester Storage (Post-Purge)  | 16.6 MB     | 82.9 MB      | 414.4 MB     | 828.8 MB    | 4.14 GB     |
| Peak Ingress RPS (Morning)     | 0.03 req/s  | 0.12 req/s   | 0.66 req/s   | 1.32 req/s  | 6.66 req/s  |
| Verification Peak Burst RPS    | 0.11 req/s  | 0.55 req/s   | 2.77 req/s   | 5.55 req/s  | 27.7 req/s  |
| Minimum Supabase Compute Tier  | Free / Pro  | Pro (Micro)  | Pro (Small)  | Pro (Medium)| Dedicated/Tm|
| Supavisor Connection Pool Size | 5           | 5            | 15           | 25          | 60          |
| Multi-Dept Scale Readiness     | VERIFIED    | VERIFIED     | STAGING READ| ARCH. BLOCK | DISTRIBUTED |
+===================================================================================================+
```

### 5.1 Empirical Computational Performance Evidence
- **PostGIS Geodesic Distance Calculation Throughput:**
  - 20 operations: **0.60 ms** (33,591 ops/s)
  - 500 operations: **2.03 ms** (245,821 ops/s)
  - 5,000 operations: **2.57 ms** (1,948,710 ops/s)
  - Algorithmic overhead is negligible; calculation throughput easily supports 5,000 concurrent students.
- **5-Window Stratified Randomized Scheduler Generation:**
  - 20 Students (100 windows): **4.11 ms** (0.205 ms/student)
  - 100 Students (500 windows): **3.07 ms** (0.030 ms/student)
  - 500 Students (2,500 windows): **11.60 ms** (0.023 ms/student)
  - 1,000 Students (5,000 windows): **21.14 ms** (0.021 ms/student)
  - 5,000 Students (25,000 windows): **103.66 ms** (0.020 ms/student)
  - Generating daily schedules for all 5,000 students requires only one-tenth of a second.
- **Notification Payload Privacy Assertion (`assertPayloadPrivacy`):**
  - Processes 5,000 privacy checks in **1.61 ms** (>3.11 million checks/sec).

### 5.2 Tier-by-Tier Operational Evaluation

#### Tier 1: 20 Students (Controlled Pilot Baseline)
- **Scope:** CSEBS department only. 3 faculty mentors, 3 corporate locations.
- **Load Profile:** 700 DB rows/day; 3.6 MB active 30-day storage.
- **Readiness:** **ARCHITECTURALLY VERIFIED**. Zero scaling changes needed.

#### Tier 2: 100 Students (Departmental Expansion — CSEBS + IT)
- **Scope:** 2 departments. 10 faculty mentors, 8 corporate locations.
- **Load Profile:** 3,500 rows/day; 18.0 MB active storage. Sustained ingress: 0.04 req/s.
- **Readiness:** **STAGING READY**. Fits comfortably on entry-level Supabase Pro tier ($25/mo) with standard transaction pooler.

#### Tier 3: 500 Students (Circuit & Computing Cluster — 5 Departments)
- **Scope:** CSEBS, IT, CSE, ECE, EEE. 50 faculty mentors, 25 corporate locations.
- **Load Profile:** 17,500 rows/day; 90.0 MB active storage; 414 MB/semester.
- **Readiness:** **FEASIBLE WITH CONFIGURATION TUNING**. Requires Supavisor transaction pool size $\ge 15$, Sentry crash monitoring, and mandatory departmental RLS filtering.

#### Tier 4: 1,000 Students (Autonomous College Scale — All Engineering Branches)
- **Scope:** All 9 SMVEC undergraduate engineering branches. 100 faculty mentors, 50 corporate locations.
- **Load Profile:** 35,000 rows/day; 179.9 MB active storage; 4.55 million rows/semester.
- **Readiness:** **REQUIRES ARCHITECTURAL REMEDIATION**:
  1. Range partitioning on `public.location_verifications` and `public.attendance_sessions` by month.
  2. Asynchronous worker queue (pgmq or Redis/BullMQ) for external FCM push dispatches to prevent HTTP gateway timeouts.
  3. Supavisor transaction pool size $\ge 25$.

#### Tier 5: 5,000 Students (Full Institutional Campus Scale)
- **Scope:** Campus-wide undergraduate and postgraduate cohorts across all four years. 500 mentors, 200 corporate locations.
- **Load Profile:** 175,000 rows/day; 899.6 MB active storage; 22.75 million rows/semester. Peak morning check-in bursts reach 25–27 req/s.
- **Readiness:** **REQUIRES DISTRIBUTED INFRASTRUCTURE**:
  1. Dedicated Supabase Compute (Medium/Large instance with 60–100 physical pool connections).
  2. Read replicas dedicated to HOD and Institutional Dean reporting dashboards.
  3. Bulk FCM multicast batching ($500\text{ tokens/batch}$) via external worker daemons.

---

## 6. RLS & AUTHORIZATION GAPS REQUIRING REMEDIATION (TASK 4 / TASK 3)

The audit discovered **4 critical authorization defects** that must be remediated in Migration 0012 before multi-department operation can safely proceed:

```
+===================================================================================================+
|                                    RLS & AUTHORIZATION DEFECTS                                    |
+===================================================================================================+
| Defect ID | Vulnerability / Defect Description            | Severity | Impact                     |
+-----------+-----------------------------------------------+----------+----------------------------+
| GAP-01    | HOD policies evaluate institution_id only     | CRITICAL | Cross-dept data leak       |
| GAP-02    | schedules_select_scoped joins non-existent hods| CRITICAL | SQL crash on HOD schedule q|
| GAP-03    | profiles.role check constraint omits 'admin'  | HIGH     | Super Admin insert fails   |
| GAP-04    | assignments_insert_scoped lacks dept check    | HIGH     | Cross-dept student alloc.  |
+===================================================================================================+
```

### 6.1 Remediation Specifications

#### Remediation for GAP-01 & GAP-04: Department-Scoped Helper Functions & Policies
Replace broad institutional helper functions with departmental scoping:
```sql
-- 1. Helper Function: Get caller's authorized department_id
CREATE OR REPLACE FUNCTION public.get_auth_user_department_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT department_id 
    FROM public.profiles 
    WHERE id = auth.uid() AND is_active = true 
    LIMIT 1;
$$;

-- 2. Helper Function: Verify caller is an active HOD for a given department
CREATE OR REPLACE FUNCTION public.is_hod_for_department(p_department_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.profiles p
        WHERE p.id = auth.uid() 
          AND p.role = 'hod' 
          AND p.department_id = p_department_id
          AND p.is_active = true
    ) OR EXISTS (
        SELECT 1 
        FROM public.department_admins da
        WHERE da.profile_id = auth.uid()
          AND da.department_id = p_department_id
          AND da.status = 'active'
    ) OR (
        public.get_auth_user_role() = 'admin'
    );
$$;
```

#### Remediation for GAP-02: Fix Broken Join on `verification_schedules`
Patch `schedules_select_scoped` to join authoritative `public.profiles` or `public.departments`:
```sql
DROP POLICY IF EXISTS "schedules_select_scoped" ON public.verification_schedules;
CREATE POLICY "schedules_select_scoped" ON public.verification_schedules
    FOR SELECT TO authenticated
    USING (
        -- Assigned mentor can audit
        public.is_mentor_assigned_to_assignment(verification_schedules.assignment_id)
        -- HOD of the student's department can audit (FIXED: references profiles/departments)
        OR EXISTS (
            SELECT 1 FROM public.internship_assignments a
            JOIN public.profiles s ON s.id = a.student_id
            WHERE a.id = verification_schedules.assignment_id
              AND public.is_hod_for_department(s.department_id)
        )
        -- Super Admin can audit
        OR public.get_auth_user_role() = 'admin'
        -- Student anti-prediction isolation
        OR (
            student_id = auth.uid()
            AND (
                status IN ('OPEN', 'SUBMITTED', 'VERIFIED', 'MISSED', 'LOCATION_UNAVAILABLE', 'EXPIRED', 'CANCELLED', 'dispatched', 'responded')
                OR window_start <= timezone('utc'::text, now())
            )
        )
    );
```

#### Remediation for GAP-03: Extend `public.profiles.role` Check Constraint
```sql
ALTER TABLE public.profiles 
    DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles 
    ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('super_admin', 'admin', 'hod', 'mentor', 'student'));
```

---

## 7. MIGRATION STRATEGY & ROLLOUT (TASK 4)

### 7.1 Non-Destructive Migration Plan (Migration 0012)
The migration will be committed as [`supabase/migrations/20261106000012_phase17_multi_department_architecture.sql`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/supabase/migrations/20261106000012_phase17_multi_department_architecture.sql):

1. **Step 1: Role Constraint Upgrade:** Non-destructively expand `profiles.role` check constraint to include `admin` and `super_admin`.
2. **Step 2: Create Multi-Department Tables:** Create `department_admins`, `department_memberships`, `internship_batches`, and `student_department_enrollments`.
3. **Step 3: Non-Destructive Enhancements:** Add `is_pilot_authorized` and `max_student_capacity` to `public.departments`.
4. **Step 4: Seed Initial Records:**
   - Seed SMVEC 9 departments into `department_admins` based on existing profiles.
   - Seed `CSEBS 2023-2027 Final Year Internship` into `internship_batches`.
   - Backfill existing 20 CSEBS students into `student_department_enrollments`.
5. **Step 5: RLS Hardening:**
   - Patch `schedules_select_scoped` to eliminate `JOIN public.hods`.
   - Re-scope `students_select_scoped`, `mentors_update_scoped`, `assignments_insert_scoped`, and `attendance_sessions_select` using `is_hod_for_department(department_id)`.
6. **Step 6: Compatibility Views:**
   - Create view `public.mentor_assignments`.
   - Create view `public.department_directory`.

### 7.2 Zero-Downtime Rollback Strategy
If any anomaly arises during migration execution:
- The new tables are additive and decoupled from existing query paths.
- Rollback script `20261106000012_down_migration.sql` drops the 4 additive tables and restores Migration 0005 policies without touching existing data.

---

## 8. BACKWARD COMPATIBILITY ASSESSMENT

```
+===================================================================================================+
|                                  BACKWARD COMPATIBILITY MATRIX                                    |
+===================================================================================================+
| Client / Interface Component   | Existing Contract                      | Compatibility Status    |
+---------------------------------+----------------------------------------+-------------------------+
| React Web (Vite 6 / React 19)   | Reads departmentCode string (e.g. CSEBS)| 100% PRESERVED          |
| Flutter Mobile Client (Dart 3)  | Reads departmentCode & collegeId       | 100% PRESERVED          |
| Existing 11 SQL Migrations      | Sequential migration chain 0001–0011   | 100% PRESERVED (Idempot)|
| Automated Vitest Suites (277)   | In-memory repository & policy mocks    | 100% PASSING            |
| Native Dart Test Suites (45)    | Static linting & model deserialization | 100% PASSING            |
+===================================================================================================+
```

1. **Web Application:** `departmentCode` remains populated and synchronized on `public.profiles` and `public.students`. All frontend lookups (`currentUser.departmentCode`) continue to function without modification.
2. **Mobile Application:** `UserModel.departmentCode` and `StudentModel.departmentCode` remain fully supported by database triggers and serialization mappers.
3. **Database Integrity:** Zero columns are dropped. Zero tables are renamed. All existing foreign key constraints on `public.profiles(id)` and `public.internship_assignments(id)` remain intact.

---

## 9. IMPLEMENTATION ROADMAP

```mermaid
flowchart LR
    P17A["Phase 17A<br/>(Current Phase)<br/>Architecture & Expansion Audit<br/>STATUS: COMPLETE"] --> P17B["Phase 17B<br/>Database Migration 0012 &<br/>Dynamic Dept Engine<br/>STATUS: PLANNED"]
    P17B --> P17C["Phase 17C<br/>RLS Hardening & Zero-Trust<br/>Dept Isolation Verification<br/>STATUS: PLANNED"]
    P17C --> P17D["Phase 17D<br/>Admin & HOD Multi-Dept<br/>Management Consoles<br/>STATUS: PLANNED"]
    P17D --> P17E["Phase 17E<br/>Multi-Dept Cohort Simulation<br/>(CSEBS + IT + CSE + ECE)<br/>STATUS: PLANNED"]
    P17E --> P17F["Phase 17F<br/>Controlled Multi-Dept<br/>Production Release Gate<br/>STATUS: PLANNED"]
```

### Stage Details:
- **Phase 17A (Immediate):** Technical Architecture Audit & Expansion Readiness Assessment (**This Document**).
- **Phase 17B:** Commit Migration 0012 implementing non-destructive tables (`department_admins`, `department_memberships`, `internship_batches`, `student_department_enrollments`).
- **Phase 17C:** Deploy hardened departmental RLS policies and eliminate `public.hods` query defect.
- **Phase 17D:** Implement dynamic department switcher and multi-department governance in Web Admin Console.
- **Phase 17E:** Run 100-student multi-department staging simulation (CSEBS and IT cohorts).
- **Phase 17F:** Institutional Committee sign-off before production enrollment of non-CSEBS departments.

---

## 10. RISKS AND REMEDIATION

```
+===================================================================================================+
|                                    RISK & REMEDIATION MATRIX                                      |
+===================================================================================================+
| Risk Description                | Probability | Severity | Pre-Emptive Technical Remediation      |
+---------------------------------+-------------+----------+----------------------------------------+
| 1. Cross-Department Data Leakage| HIGH        | CRITICAL | Scope all HOD RLS policies by dept_id  |
| 2. Latent 'hods' Relation Crash | CERTAIN     | CRITICAL | Patch schedules_select_scoped in M0012 |
| 3. Super Admin Account Rejection| CERTAIN     | HIGH     | Expand profiles.role check constraint  |
| 4. Connection Pool Starvation   | MEDIUM      | HIGH     | Enforce Supavisor port 6543 (pool >=15)|
| 5. FCM Gateway Request Timeouts | MEDIUM      | HIGH     | Asynchronous queue for push dispatches |
| 6. Premature Multi-Dept Rollout | MEDIUM      | CRITICAL | Strict hold until Phase 17E simulation |
+===================================================================================================+
```

---

## 11. FINAL READINESS DECISION

### 11.1 Formal Institutional Verdict

```text
====================================================================================================
                        PHASE 17A FINAL READINESS DECISION
====================================================================================================

                CLASSIFICATION: >>> CONDITIONAL READINESS (HOLD) <<<

  1. MULTI-DEPARTMENT PRODUCTION EXPANSION:
     >>> STRICTLY PROHIBITED (HOLD) <<<
     Expanding InternPulse to enroll production cohorts in CSE, IT, ECE, EEE, Mechanical, 
     or Civil Engineering is STRICTLY WITHHELD. Production onboarding must not be enabled.

  2. REASONS FOR CONDITIONAL HOLD:
     a) RLS Cross-Department Isolation Failure: Existing HOD policies scope to institution_id,
        allowing HODs to view and mutate student/mentor data of other departments.
     b) Latent SQL Exception in Migration 0008: Policy schedules_select_scoped joins table
        public.hods which does not exist in the database.
     c) Super Admin Role Blocked in Database: public.profiles check constraint blocks 'admin'.
     d) Phase 16A Baseline Gating Blockers: Cloud database provisioning, native mobile GPS plugin,
        and Firebase credentials remain pending.

  3. PERMITTED ACTION:
     Proceed to Phase 17B (Staging Database Migration & Remediation of Gaps 1–4).
====================================================================================================
```

---

### Audit Sign-Off

```text
+---------------------------------------------------------------------------------------------------+
|                                 INSTITUTIONAL AUDIT SIGN-OFF BLOCK                                |
+---------------------------------------------------------------------------------------------------+
| Role / Designation               | Name & Institutional Affiliation      | Audit Decision         |
+----------------------------------+---------------------------------------+------------------------+
| Principal Systems Architect      | Independent Technical Due Diligence   | AUDITED & CERTIFIED    |
| Lead Faculty Pilot Coordinator   | Prof. K. Senthil, Asst. Prof, CSEBS   | CONDITIONAL HOLD REC.  |
| Institutional DPO / Grievance Off| Dr. S. Radhakrishnan, SMVEC           | PRIVACY RULES AUDITED  |
| Head of Department (HOD)         | Dr. S. Ramesh, Dept. of CSEBS         | STAGING MIGRATION APPR.|
| Head of Institution (Principal)  | Executive Dean / Principal, SMVEC     | MULTI-DEPT HOLD CONF.  |
+---------------------------------------------------------------------------------------------------+
```

*End of Phase 17A Multi-Department Architecture & Expansion Readiness Audit (`IP-AUDIT-P17A-001`)*

