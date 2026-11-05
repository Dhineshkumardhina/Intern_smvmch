# Phase 6: InternPulse Flutter Mobile Backend Integration Report

## Executive Summary

Phase 6 delivers the production integration of the **InternPulse Flutter mobile application** with the live **Supabase PostgreSQL backend** (`https://gvnakdxtjjnfcjkcnavz.supabase.co`). All simulated authentication, hardcoded demo identities, and mocked repository responses have been eliminated. The mobile application now operates exclusively against authenticated PostgreSQL database tables protected by Row-Level Security (RLS) policies established in Phase 2.

The implementation preserves the existing Flutter UI architecture, Riverpod 2.x state management, GoRouter navigation, and Sri Manakula Vinayagar Engineering College (SMVEC) design tokens while introducing robust, production-grade repositories, resilient network retry mechanisms, and native platform configurations for Android and iOS.

---

## Architecture & Integration Design

```
+-----------------------------------------------------------------------------------+
|                           Flutter UI Presentation Layer                           |
|  - StudentDashboardScreen     - StudentAttendanceScreen     - LoginScreen         |
|  - StudentNotificationsScreen - StudentInternshipDetailScreen                     |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Riverpod State Management Layer                            |
|  - studentDashboardProvider (AsyncNotifier / StateNotifier)                       |
|  - authProvider / authNotifier (Session state, role checks, token monitoring)      |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                             Repository & Service Layer                            |
|  - SupabaseStudentRepository       - SupabaseInternshipRepository                 |
|  - SupabaseAttendanceRepository    - SupabaseVerificationRepository               |
|  - SupabaseNotificationRepository  - SupabaseAuthService                          |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                            Core Infrastructure Layer                              |
|  - NetworkRetry (Exponential backoff, jitter, transient error discrimination)     |
|  - SupabaseConfig (Centralized credentials, 15s timeout, 3 retry ceiling)        |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Supabase PostgreSQL Backend (Cloud)                        |
|  - profiles               - students                  - departments               |
|  - internship_assignments - internship_locations      - attendance_sessions       |
|  - location_verifications - verification_schedules    - notifications             |
+-----------------------------------------------------------------------------------+
```

---

## 10 Core Capabilities Implementation Details

### 1. Supabase Authentication
- **Service**: [`SupabaseAuthService`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/auth/supabase_auth_service.dart)
- **Login Screen**: [`LoginScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/authentication/presentation/screens/login_screen.dart)
- **Implementation**:
  - Replaced hardcoded credentials with live Supabase Auth `signInWithPassword()`.
  - Added student register number resolution: students can enter their institutional register number (e.g. `23CSEBS001`) or college email address; the service queries the `students` table to map the register number to the registered auth email.
  - Queries the authoritative `profiles` table to verify user identity, account status (`account_status = 'active'`), and assigned role (`student`, `mentor`, `hod`).
  - Disallows login if `is_active` is false, raising a clear user-facing error.
  - Supported self-registration via `signUpWithStudentDetails()` storing both Supabase Auth user credentials and the corresponding `profiles` + `students` records.

### 2. Session Persistence & Token Handling
- **Service**: [`SupabaseAuthService`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/auth/supabase_auth_service.dart#L13-L50)
- **Implementation**:
  - Uses `supabase_flutter` built-in secure storage for token persistence across cold app restarts.
  - Automatically verifies session validity on launch via `restoreSession()`.
  - Evaluates `session.isExpired` against device wall clock; if expired, triggers `client.auth.refreshSession()`.
  - Listens to `client.auth.onAuthStateChange` to reactively update the application routing and user state.

### 3. Student Profile Retrieval
- **Repository**: [`SupabaseStudentRepository`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_student_repository.dart)
- **Domain Model**: [`StudentModel`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/models/student_model.dart)
- **Implementation**:
  - Queries `profiles` joined with `students` using the authenticated user's UUID.
  - Maps register number, department code, academic year, assigned faculty mentor, contact email, and phone number.
  - Dynamic initials avatar generated from student's authentic `full_name`.

### 4. Internship Assignment Retrieval
- **Repository**: [`SupabaseInternshipRepository`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_internship_repository.dart)
- **Domain Model**: [`InternshipModel`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/models/internship_model.dart)
- **Implementation**:
  - Queries `internship_assignments` filtered by `student_id = auth.uid()` and `assignment_status = 'active'`.
  - Executes foreign join with `internship_locations` to retrieve the host organization name, address, latitude, longitude, and geofence radius.
  - Formats date bounds (`start_date` to `end_date`), daily monitoring schedule (`monitoring_start_time` to `monitoring_end_time`), and required daily hours.
  - Gracefully displays an institutional Empty Placement Banner if no active assignment is configured for the student.

### 5. Internship Location & Geofence Retrieval
- **Repository**: [`SupabaseInternshipRepository`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_internship_repository.dart#L75-L100)
- **Domain Model**: [`LocationModel`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/models/location_model.dart)
- **Detail Screen**: [`StudentInternshipDetailScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_internship_detail_screen.dart)
- **Implementation**:
  - Exposes geofence radius in meters (e.g. 200m), GPS coordinates (latitude / longitude), facility address, and HOD approval metadata.
  - Passes the live active assignment directly into the detail screen via GoRouter `extra` parameter.

### 6. Attendance History & Real-Time Actions
- **Repository**: [`SupabaseAttendanceRepository`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_attendance_repository.dart)
- **Domain Model**: [`AttendanceModel`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/models/attendance_model.dart)
- **Attendance Screen**: [`StudentAttendanceScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_attendance_screen.dart)
- **Implementation**:
  - **Check-In**: Records timestamp `check_in_at = NOW()`, creates row in `attendance_sessions`, links active assignment and current location ID.
  - **Check-Out**: Computes elapsed session duration (`total_hours = diff(check_out_at - check_in_at)`), marks session completed.
  - **History**: Displays reverse chronological session logs with date formatting, total hours worked, and verification status badges.
  - **Real-time Status Bar**: Interactive Check In / Check Out button on the dashboard reflecting current shift state.

### 7. Location Verification History
- **Repository**: [`SupabaseVerificationRepository`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_verification_repository.dart)
- **Domain Model**: [`LocationVerificationModel`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/models/location_verification_model.dart)
- **Implementation**:
  - Queries `location_verifications` for the authenticated student.
  - Logs verification events: timestamp, captured coordinates, accuracy in meters, calculated distance to geofence centroid, and `is_within_geofence`.
  - Flags spoofed or simulated coordinates via `mock_location_detected` and marks status as `spoof_detected`.

### 8. Notification Retrieval & Actions
- **Repository**: [`SupabaseNotificationRepository`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_notification_repository.dart)
- **Domain Model**: [`NotificationModel`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/models/notification_model.dart)
- **Notifications Screen**: [`StudentNotificationsScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_notifications_screen.dart)
- **Implementation**:
  - Fetches notifications targeted to `recipient_id = auth.uid()`.
  - Displays dynamic unread count badge on the dashboard app bar.
  - Supports filtering by "All Notifications" vs "Unread Only".
  - One-tap "Mark as Read" per item and bulk "Mark all as read" button invoking Supabase update.

### 9. Secure Logout
- **Implementation**:
  - Implemented across all four user roles:
    - Student: [`StudentDashboardScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_dashboard_screen.dart)
    - Mentor: [`MentorDashboardScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/mentor/presentation/screens/mentor_dashboard_screen.dart#L140-L175)
    - HOD: [`HodDashboardScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/hod/presentation/screens/hod_dashboard_screen.dart#L160-L195)
    - Admin: [`AdminDashboardScreen`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/admin/presentation/screens/admin_dashboard_screen.dart#L18-L45)
  - Shows a confirmation modal dialog before destroying the session.
  - Calls `SupabaseAuthService().signOut()`, revoking the refresh token with the Supabase auth server.
  - Purges local session tokens and resets Riverpod provider state.
  - Uses `context.go(AppRoutes.login)` to return to the authentication entry point.

### 10. Error & Offline-State Handling
- **Engine**: [`NetworkRetry`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/network/network_retry.dart)
- **Configuration**: [`SupabaseConfig`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/config/supabase_config.dart)
- **Implementation**:
  - **Timeout Protection**: Strict 15-second timeout on all remote requests.
  - **Exponential Backoff**: Up to 3 attempts with exponential delay (`delay * 2^(attempt-1)`).
  - **Transient Error Discrimination**: Retries socket timeouts, connection drops, and HTTP 5xx errors; immediately aborts non-transient errors (401 Unauthorized, 403 Forbidden, 404 Not Found).
  - **Exception Mapping**: Translates raw network exceptions into typed domain exceptions: `NetworkException`, `AuthExpiredException`, `ServerException`, `DataNotFoundException`.
  - **UI States**: Skeletons for loading, user-friendly error banners with retry action buttons, and empty state illustrations.

---

## Native Platform Configurations

### Android Configuration
- **Manifest**: [`android/app/src/main/AndroidManifest.xml`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/android/app/src/main/AndroidManifest.xml)
  - `android.permission.INTERNET`
  - `android.permission.ACCESS_NETWORK_STATE`
  - `android.permission.ACCESS_FINE_LOCATION`
  - `android.permission.ACCESS_COARSE_LOCATION`
  - `android.permission.ACCESS_BACKGROUND_LOCATION`
  - Intent filter for Supabase deep-linking:
    ```xml
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="io.supabase.internpulse" android:host="login-callback" />
    </intent-filter>
    ```
- **Build Scripts**:
  - [`android/app/build.gradle`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/android/app/build.gradle): `namespace: "com.smvec.internpulse"`, `minSdkVersion: 21`, `targetSdkVersion: 34`, `compileSdkVersion: 34`.
  - [`android/build.gradle`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/android/build.gradle) & [`android/settings.gradle`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/android/settings.gradle).

### iOS Configuration
- **Property List**: [`ios/Runner/Info.plist`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/ios/Runner/Info.plist)
  - `NSLocationWhenInUseUsageDescription`: Clear institutional explanation of GPS verification during working hours.
  - `NSLocationAlwaysAndWhenInUseUsageDescription`: Geofence compliance verification during designated monitoring schedules.
  - `NSLocationAlwaysUsageDescription`: Background verification within workplace boundary.
  - `CFBundleURLTypes`: Custom URL scheme `io.supabase.internpulse` for OAuth / Magic Link callbacks.
- **CocoaPods**: [`ios/Podfile`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/ios/Podfile): Minimum deployment target iOS 13.0 with modular headers.

---

## Testing & Quality Assurance Verification

### Automated Test Suites
The complete test suite runs via Vitest, encompassing 8 test suites with **167 passing tests** and **0 failures**:

```bash
 RUN  v5.1.0 C:/PROJECTS/bose projects/Intern_smvmch/Intern_smvmch/InternPulse-main

 ✓ src/core/auth/__tests__/rlsSecurityPolicies.test.ts (34 tests)
 ✓ src/core/auth/__tests__/rolePermissions.test.ts (14 tests)
 ✓ src/core/auth/__tests__/rbacAuthorization.test.ts (25 tests)
 ✓ src/core/auth/__tests__/hodLocationManagement.test.ts (17 tests)
 ✓ src/core/auth/__tests__/productionAuth.test.ts (18 tests)
 ✓ src/core/auth/__tests__/mentorStudentManagement.test.ts (29 tests)
 ✓ src/core/auth/__tests__/internshipAssignmentWorkflow.test.ts (15 tests)
 ✓ src/core/auth/__tests__/flutterBackendIntegration.test.ts (15 tests)

 Test Files  8 passed (8)
      Tests  167 passed (167)
   Duration  1.25s
```

### Flutter & Dart Test Coverage
Created specialized Dart test specifications in [`InternPulse-main/test/`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/test/):
- [`test/models/attendance_model_test.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/test/models/attendance_model_test.dart): Validates `fromMap` / `toMap` serialization matching Supabase `attendance_sessions` schema.
- [`test/models/location_verification_model_test.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/test/models/location_verification_model_test.dart): Verifies spatial field mapping and spoof detection logic.
- [`test/models/notification_model_test.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/test/models/notification_model_test.dart): Verifies notification model serialization and unread indicators.
- [`test/models/location_model_test.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/test/models/location_model_test.dart): Verifies geofence radius, lat/lng, and monitoring hour serialization.
- [`test/core/network_retry_test.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/test/core/network_retry_test.dart): Validates exponential backoff recovery, 401 token expiration mapping, and non-retryable 404 fast-failure.

---

## File Manifest & Deliverables

| File / Component | Path | Description |
|---|---|---|
| Supabase Configuration | [`supabase_config.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/config/supabase_config.dart) | Centralized Supabase credentials, URL, timeouts, and retry parameters |
| Network Retry Engine | [`network_retry.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/network/network_retry.dart) | Exponential backoff, jitter, and typed exception mapping |
| Supabase Auth Service | [`supabase_auth_service.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/core/auth/supabase_auth_service.dart) | Authentication, session persistence, role validation, token refresh |
| Student Repository | [`supabase_student_repository.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_student_repository.dart) | Live student profile retrieval and updates |
| Internship Repository | [`supabase_internship_repository.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_internship_repository.dart) | Active assignment and approved location queries with realtime streaming |
| Attendance Repository | [`supabase_attendance_repository.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_attendance_repository.dart) | Session check-in, check-out, and attendance history logs |
| Verification Repository | [`supabase_verification_repository.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_verification_repository.dart) | Spatial verification event logging and audit query |
| Notification Repository | [`supabase_notification_repository.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/repositories/supabase_notification_repository.dart) | Notification fetching, unread count tracking, and read marking |
| Dashboard Provider | [`student_dashboard_provider.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/providers/student_dashboard_provider.dart) | Riverpod state orchestrator handling loading, error/retry, and data states |
| Student Dashboard Screen | [`student_dashboard_screen.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_dashboard_screen.dart) | Live placement card, geofence radius, check-in bar, and secure logout |
| Attendance Screen | [`student_attendance_screen.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_attendance_screen.dart) | Complete attendance logs with loading, error/retry, and empty states |
| Notifications Screen | [`student_notifications_screen.dart`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/lib/features/student/presentation/screens/student_notifications_screen.dart) | Unread filter, mark as read, loading, error, and empty states |
| Android Manifest | [`AndroidManifest.xml`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/android/app/src/main/AndroidManifest.xml) | Permissions (location, internet) and OAuth deep link scheme |
| iOS Info.plist | [`Info.plist`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/ios/Runner/Info.plist) | Location usage descriptions and URL scheme callback |
| Integration Tests | [`flutterBackendIntegration.test.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/auth/__tests__/flutterBackendIntegration.test.ts) | 15 integration tests validating data contracts, retry, and auth flow |

---

## Conclusion

The InternPulse Flutter mobile application is fully connected to the real Supabase PostgreSQL backend. It reliably enforces authentication, securely persists sessions, retrieves verified student placements and geofence specifications, logs attendance and verification events with spoof protection, and handles network disruptions with exponential backoff.

