# InternPulse Repository Audit Report

**Date of Audit:** November 5, 2026  
**Audited Target:** Migrated Git Repository (`Intern_smvmch`)  
**Upstream Source:** `https://github.com/BoseWilliam23/InternPulse`  
**Current Remote:** `https://github.com/Dhineshkumardhina/Intern_smvmch.git` (branch `main`)  
**Audit Scope:** Full codebase audit covering React web application, Flutter mobile application, Supabase database integration, authentication security, role-based access control, routing, builds, and test configurations.

---

## 1. Executive Summary

The **InternPulse** platform is an institutional internship monitoring and governance platform designed for Sri Manakula Vinayagar Engineering College (SMVEC). The platform aims to bridge Students, Faculty Mentors, Heads of Department (HODs), and Institutional Administrators.

The repository currently exists as a hybrid monorepo co-located in the `InternPulse-main/` folder:
- **React Web Application:** Highly developed in terms of UI components, role layouts, and Supabase client integration. Core dashboards for all four roles (Student, Mentor, HOD, Admin) render cleanly and compile with Vite without errors. However, critical security flaws exist in authentication bypasses and hardcoded fallback credentials.
- **Flutter Mobile Application:** Only partially structured at the Dart layer. While UI theme tokens, screen mockups, and routing scaffolding exist, native platform scaffolding (`android/`, `ios/`), concrete repository implementations, and backend connectivity (Supabase/Firebase) are entirely absent. Furthermore, Flutter navigation routes contain broken references causing fatal compile/runtime errors.
- **Database & Backend:** Lacks all official migration scripts, schema DDL, seeds, and Row Level Security (RLS) policies. Existing tables must be reverse-engineered from TypeScript model interfaces.

---

## 2. Existing Architecture

```
Intern_smvmch/
├── README.md
├── docs/
│   └── audit/
│       └── INTERNPULSE_REPOSITORY_AUDIT.md
└── InternPulse-main/
    ├── .env.example
    ├── .gitignore
    ├── bun.lock
    ├── index.html
    ├── metadata.json
    ├── package.json
    ├── pubspec.yaml
    ├── tsconfig.json
    ├── vite.config.ts
    ├── public/
    │   ├── logo.svg
    │   └── logo-full.svg
    ├── src/                               # React Web Application
    │   ├── App.tsx                        # Main stateful router & layout
    │   ├── index.css
    │   ├── main.tsx
    │   ├── components/                    # Dashboards, Auth modals, and UI
    │   │   ├── AdminDashboard.tsx
    │   │   ├── AppLogo.tsx
    │   │   ├── ForgotPasswordModal.tsx
    │   │   ├── HodDashboard.tsx
    │   │   ├── InternshipSetupPage.tsx
    │   │   ├── LoginPage.tsx
    │   │   ├── LogoUploadModal.tsx
    │   │   ├── MentorDashboard.tsx
    │   │   ├── RegisterPage.tsx
    │   │   └── StudentDashboard.tsx
    │   ├── core/
    │   │   ├── auth/                      # AuthService, AuthUser, Demo Accounts
    │   │   └── repository/                # Supabase Integrated Repository
    │   ├── data/
    │   │   └── initialData.ts             # TypeScript definitions & empty fallbacks
    │   └── lib/
    │       └── supabase.ts                # Supabase Client & DB Schema Interfaces
    └── lib/                               # Flutter Mobile Application
        ├── main.dart
        ├── app/
        │   ├── app.dart
        │   └── router.dart                # go_router configuration
        ├── core/
        │   ├── constants/                 # Academic, risk, and status constants
        │   └── theme/                     # AppTheme & ColorSchemes
        ├── features/
        │   ├── admin/presentation/screens/
        │   ├── authentication/presentation/screens/
        │   ├── hod/presentation/screens/
        │   ├── mentor/presentation/screens/
        │   └── student/presentation/screens/
        ├── models/                        # Domain models & UserRole enum
        ├── repositories/                  # Abstract repository contracts (unimplemented)
        └── shared/widgets/                # Stat cards & status badges
```

### Architectural Observations:
1. **Repository Layout:** Both the React web application and Flutter mobile codebase live inside a single root folder `InternPulse-main/`, sharing configuration at the root of that subfolder (`package.json` alongside `pubspec.yaml`).
2. **Web Architecture:** Single-Page Application (SPA) leveraging client-side state for navigation (`AppRoute` managed in `App.tsx`) with optimistic local caching (`localStorage`) layered over Supabase database queries and Supabase Realtime subscriptions.
3. **Mobile Architecture:** Riverpod and GoRouter architecture intended for stream-based reactive synchronization. However, repositories are abstract without concrete data-source implementations, and screen widgets bind to static in-memory lists.

---

## 3. Technology Stack

### Web Application Stack
| Layer | Technology | Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Runtime / Tooling** | Node.js | v24.21.0 | JavaScript Execution Runtime |
| **Package Management**| Bun / npm | npm 11.19.0 (bun.lock present) | Dependency management |
| **Framework** | React | 19.0.1 | UI library |
| **Build Tool** | Vite | 6.2.3 / 6.4.5 | Bundler & dev server |
| **Language** | TypeScript | ~5.8.2 | Type safety & interfaces |
| **Styling** | Tailwind CSS / PostCSS | 4.1.14 / 4.3.4 | Utility-first CSS styling |
| **Icons** | Lucide React | 0.546.0 | System iconography |
| **Animations** | Motion (Framer Motion) | 12.23.24 | Micro-interactions |
| **Backend / DB Client**| Supabase JS SDK | 2.112.3 / 2.119.0 | Auth, Database, & Realtime |
| **AI Integration** | Google GenAI SDK | 2.4.0 / 2.32.0 | AI Studio integration (declared) |

### Mobile Application Stack
| Layer | Technology | Specified Version | Purpose |
| :--- | :--- | :--- | :--- |
| **Framework** | Flutter | `>=3.10.0` | Cross-platform mobile framework |
| **SDK** | Dart | `>=3.0.0 <4.0.0` | Language runtime |
| **State Management** | Flutter Riverpod | ^2.5.1 | Reactive state container |
| **Routing** | GoRouter | ^14.0.1 | Declarative URL-based navigation |
| **Data Serialization**| Freezed / JsonSerializable | ^2.5.2 / ^6.8.0 | Immutable code generation |
| **Typography** | Google Fonts | ^6.2.1 | Inter font family (fallback) |
| **Visual Indicators** | Percent Indicator | ^4.2.3 | Progress gauges |

---

## 4. Completed Functionality

### Web Application (React)
1. **Interactive UI Shell & Branding:**
   - Full SMVEC institutional branding (`AppLogo.tsx`, `public/logo-full.svg`, header branding).
   - In-session logo upload and preview modal with `localStorage` persistence.
2. **Student Dashboard (`StudentDashboard.tsx`):**
   - Progress bar, days duration, host organization overview.
   - Daily progress log submission form (work done, status, hours, blockers).
   - Scoped data access displaying only active student records.
3. **Mentor Dashboard (`MentorDashboard.tsx`):**
   - Mentor overview metrics (Total Mentees, On Track, Delayed, Blocked, Inactive, Completed).
   - Dynamic multi-parameter filtering: Academic Year (1st to 4th), Department, Status, Search Query.
   - Mentee evaluation modal triggering feedback events.
4. **HOD Dashboard (`HodDashboard.tsx`):**
   - Department-wide metrics across all enrolled students and faculty mentors.
   - Drill-down view into individual faculty mentors and their mentee distributions.
   - Multi-filtering by academic year, status, and mentor.
5. **Admin Dashboard (`AdminDashboard.tsx`):**
   - Institutional governance tabs: Overview, Students Registry, Mentors, Departments (9 departments), Host Companies.
   - Guide re-assignment modal to reassign students to different faculty mentors.
   - Dynamic CSV export of filtered student registry.
6. **Authentication & Session Management (`authService.ts`):**
   - Student self-registration and post-registration internship setup wizard (`InternshipSetupPage.tsx`).
   - Session restoration from `localStorage`.
   - Real-time Supabase Auth state change listener (`onAuthStateChange`).
7. **Data Repository (`internshipRepository.ts`):**
   - Scoped query methods: `getStudentsForStudent`, `getStudentsForMentor`, `getStudentsForHod`, `getAllStudentsForAdmin`.
   - Bidirectional updates syncing local storage with Supabase table mutations (`students`, `student_daily_logs`).
   - Supabase Realtime channel subscription listening to table changes.

---

## 5. Partially Implemented Functionality

### Web Application (React)
1. **Mentor Feedback Persistence:**
   - In `App.tsx`, `MentorDashboard.onReviewStudent` is wired only to `console.log(...)`. It does not write feedback back to the `student_daily_logs` table or the repository.
2. **Task Assignment Workflow:**
   - In `StudentDashboard.tsx`, the "Internship Tasks" tab displays 4 hardcoded sample tasks. No database table or API endpoints exist to create, edit, assign, or mark tasks as complete.
3. **Password Reset Flow:**
   - `authService.resetPassword` calls Supabase `resetPasswordForEmail`, but no password reset confirmation or token exchange page is implemented in the router.
4. **Company & Department Registry:**
   - In `AdminDashboard.tsx`, departments are static in-memory objects (`DEPARTMENTS` array with 9 SMVEC departments). Companies are derived on-the-fly from student company strings rather than managed institutional master entities.

### Mobile Application (Flutter)
1. **Screen Layouts:**
   - `StudentDashboardScreen`, `MentorDashboardScreen`, `HodDashboardScreen`, and `AdminDashboardScreen` render UI layouts using custom widgets (`PulseStatCard`, `PulseStatusBadge`), but all values and lists are statically hardcoded in widget state.
2. **Authentication Interface:**
   - `LoginScreen` and `RegisterScreen` have form fields and input validation, but execution is simulated via `Future.delayed(700ms)` and mock role determination.

---

## 6. Missing Functionality

### Web Application (React)
1. **Document / Attachment Uploads:**
   - Daily logs and internship setup do not support file attachments (e.g., offer letters, weekly logbook PDFs, completion certificates).
2. **Automated Risk Alerts / Notifications:**
   - No email or push notifications when a student becomes `delayed`, `blocked`, or `inactive`.

### Mobile Application (Flutter)
1. **Concrete Repositories:**
   - `StudentRepository` and `TaskRepository` exist only as abstract classes (`abstract class StudentRepository extends BaseRepository<StudentModel>`). Zero concrete implementation classes exist.
2. **Backend Client Integration:**
   - No Supabase client configured for Flutter (`supabase_flutter` is missing from `pubspec.yaml`).
   - Firebase packages are commented out in `pubspec.yaml`, leaving the app disconnected from any backend.
3. **Secondary Screens Implementation:**
   - `HodStudentsScreen`, `HodDepartmentsScreen`, `HodMentorsScreen`, and `HodAtRiskScreen` are 1-line placeholder widgets (`Center(child: Text(...))`).
   - `MentorStudentMonitoringScreen`, `MentorAtRiskScreen`, and `MentorActivityScreen` are 1-line placeholder widgets.
   - `AdminStudentManagementScreen` and `AdminMentorAssignmentScreen` are 1-line placeholder widgets.
4. **Missing Native Platform Scaffolding:**
   - Missing `android/` directory (no Gradle build files, Manifest, or native activity).
   - Missing `ios/` directory (no Podfile, Xcode project, or Info.plist).
   - Missing declared font assets in `fonts/Inter-*.ttf`.

---

## 7. Security Weaknesses

> [!CAUTION]
> The repository contains serious authentication and authorization security vulnerabilities that must be remedied before production deployment.

1. **Authentication Bypass via Table Fallback (`src/core/auth/authService.ts` lines 260-302):**
   - When `client.auth.signInWithPassword` fails, the service executes a fallback check against the `students`, `mentors`, or `hods` table using the provided email.
   - If an account record exists, the service automatically logs the user in and establishes an authenticated session **without verifying the password**.
   - **Risk:** Anyone knowing the email of any HOD, mentor, or student can log in as that user with any arbitrary password.
2. **Hardcoded Fallback Credentials (`src/lib/supabase.ts` lines 5-6):**
   - The Supabase URL and anon public key are hardcoded as fallbacks if environment variables are not set.
   - **Risk:** Exposes database endpoint references in client bundles and git history.
3. **Demo Passwords in Live Data Fetching (`src/core/auth/demoAccounts.ts`):**
   - `fetchSupabaseLiveSampleLogins()` queries live Supabase tables and attaches `'password123'` to every returned account record.
   - **Risk:** Encourages default credential usage and exposes sample login access in production UI.
4. **Lack of Server-Enforced Authorization:**
   - The app relies on client-side filtering (`getStudentsForMentor`, `getStudentsForHod`). If Supabase Row Level Security (RLS) is not configured with matching PostgreSQL security policies, any user with the anon key can query all students directly via the REST endpoint.

---

## 8. Database Weaknesses

1. **Missing Schema & Migration Scripts:**
   - There are **no SQL files, migrations, or DDL definitions** anywhere in the repository.
   - Tables (`students`, `mentors`, `hods`, `student_daily_logs`) exist only in external Supabase instances and as client TypeScript types.
2. **Missing Referential Integrity Definitions:**
   - In `DbStudent` and `StudentRecord`, relations like `mentor_id` are stored as loose string IDs without declared foreign keys or cascade constraints in the repository.
3. **Lack of Committed Row Level Security (RLS) Policies:**
   - There are no committed `.sql` migration files documenting table-level RLS policies, leaving data isolation at the mercy of client-side queries.
4. **Inconsistent Department Representation:**
   - In some models, department is `department_code` (e.g., `'CSEBS'`), while in others it is `dept` (e.g., `'CSEBS Department'`), causing normalizing transformations across layers.

---

## 9. Mobile Application Weaknesses

1. **Fatal Route Crash in Admin Flow:**
   - `admin_dashboard_screen.dart` calls:
     ```dart
     context.push(AppRoutes.adminStudents);
     context.push(AppRoutes.adminMentorAssignment);
     ```
   - Neither `adminStudents` nor `adminMentorAssignment` is defined in `AppRoutes` in `lib/app/router.dart`.
   - **Result:** Attempting to compile or navigate to these routes throws a compile error / fatal runtime exception.
2. **Role Enum Inconsistency (`lib/models/user_role.dart`):**
   - `UserRole` enum only contains `student`, `mentor`, `hod`.
   - It lacks `admin`. When `UserRole.fromString('admin')` is called, it returns `UserRole.hod`.
   - The web app has a dedicated `admin` role, creating an architectural mismatch.
3. **Unimplemented Font Assets:**
   - `pubspec.yaml` specifies local assets `fonts/Inter-Regular.ttf`, `Inter-Medium.ttf`, `Inter-SemiBold.ttf`, `Inter-Bold.ttf`.
   - The directory `fonts/` does not exist in the repository.
4. **Architectural Divergence (Supabase vs. Firebase):**
   - The web app uses Supabase for database, realtime, and auth.
   - The mobile codebase comments cite Firestore and Firebase Auth, with zero Supabase packages configured.

---

## 10. Build and Testing Status

### Web Application Verification Results

| Check / Command | Execution Status | Exit Code | Result Details |
| :--- | :--- | :--- | :--- |
| **Dependency Resolution** | Executed (`npm install --dry-run` & `npm install`) | `0` | 223 packages installed cleanly, 0 audit vulnerabilities. |
| **Typecheck / Lint** | Executed (`npm run lint` -> `tsc --noEmit`) | `0` | **Passed cleanly with 0 TypeScript compiler errors.** |
| **Production Build** | Executed (`npm run build` -> `vite build`) | `0` | **Passed cleanly.** 1730 modules transformed in 4.31s. Output: `dist/index.html` (1.06 kB), `dist/assets/index-DJO5OwaR.css` (35.65 kB), `dist/assets/index-B9ZZeqxm.js` (603.38 kB). |
| **Test Suite** | Not Configured | N/A | **0 tests found.** No test scripts, test runner, or test specs exist in `package.json`. |

### Mobile Application Verification Results

| Check / Command | Execution Status | Exit Code | Result Details |
| :--- | :--- | :--- | :--- |
| **Flutter SDK Check** | Executed (`flutter --version`) | `1` (Not found) | Flutter SDK is not installed on the system PATH. |
| **Static Code Inspection** | Executed (Manual & Regex Analysis) | N/A | Found missing route constants in `router.dart`, missing `UserRole.admin`, missing platform folders (`android/`, `ios/`), and missing font files. |
| **Flutter Test Suite** | Not Executed | N/A | No `test/` directory or test files exist in the repository. |

---

## 11. Recommended Remediation Order

```
[Phase 1: Security & Auth Hardening]
       │
       ▼
[Phase 2: Database Schema & Migration Codification]
       │
       ▼
[Phase 3: React Web Functionality Completion]
       │
       ▼
[Phase 4: Flutter Architecture Alignment & Platform Scaffolding]
       │
       ▼
[Phase 5: Automated Testing & CI/CD Pipeline]
```

### Phase 1: Security & Auth Hardening
1. Remove the fallback password bypass in `src/core/auth/authService.ts`. Ensure all logins strictly require valid credentials against Supabase Auth.
2. Remove hardcoded fallback project credentials from `src/lib/supabase.ts` and require `.env` injection.
3. Clean up demo credentials and mock account provisioning from `demoAccounts.ts` and `LoginPage.tsx`.

### Phase 2: Database Schema & Migration Codification
1. Create dedicated SQL migrations under `supabase/migrations/` defining tables:
   - `students`, `mentors`, `hods`, `student_daily_logs`, `tasks`, `departments`, `companies`.
2. Define Row Level Security (RLS) policies enforcing role boundaries at the database level:
   - Students can only read/update their own logs.
   - Mentors can only read/review assigned mentees.
   - HODs can read all data within their department code.
   - Admins can manage all institutional records.

### Phase 3: React Web Functionality Completion
1. Wire mentor feedback submission in `App.tsx` and `MentorDashboard.tsx` to persist to `student_daily_logs.mentor_feedback`.
2. Connect student tasks to a real `tasks` table instead of hardcoded items.
3. Implement password reset confirmation page.

### Phase 4: Flutter Alignment & Platform Scaffolding
1. Align Flutter backend dependencies with Supabase (`supabase_flutter`) instead of Firebase comments.
2. Scaffold native platform folders (`flutter create .` with proper bundle identifiers).
3. Fix `AppRoutes` in `router.dart` and add `admin` to `UserRole`.
4. Implement concrete repositories implementing `StudentRepository` and `TaskRepository` using Supabase.
5. Provide font assets in `fonts/` or switch to standard GoogleFonts network loading.

### Phase 5: Automated Testing & CI/CD
1. Add Vitest and React Testing Library to `package.json` for web component & auth testing.
2. Add Flutter unit and widget tests under `test/`.
3. Configure GitHub Actions workflow for automated linting, testing, and building.

---

## 12. Final Synthesis & Assessment

### 1. Overall Completion Estimate
- **React Web Application:** **82% Complete**  
  (Strong UI, all 4 role dashboards built, builds and typechecks cleanly; needs security hardening, task data binding, and feedback persistence).
- **Flutter Mobile Application:** **25% Complete**  
  (Dart UI mockups and routing skeleton exist, but lacks native platform scaffolding, concrete repositories, backend connectivity, and contains broken route constants).
- **Database & DevOps:** **15% Complete**  
  (No SQL migrations, no RLS script definitions, no automated tests).
- **Composite Project Completion:** **~55% Complete**

### 2. Critical Blockers
1. **Critical Security Vulnerability:** Password-less authentication bypass in `authService.ts` allowing unauthenticated access to existing student/mentor/HOD accounts.
2. **Fatal Flutter Routing References:** Undefined routes (`AppRoutes.adminStudents`, `AppRoutes.adminMentorAssignment`) in `admin_dashboard_screen.dart`.
3. **Missing Flutter Native Scaffolding:** Complete absence of `android/` and `ios/` platform build infrastructure.
4. **Missing Database Source of Truth:** Zero SQL migration scripts committed to the repository.

### 3. Recommended Implementation Sequence
1. **Patch Security Holes:** Remove auth bypass in `authService.ts` and sanitize fallback credentials.
2. **Codify Database Schema:** Author and test SQL migrations with full RLS policies in `supabase/migrations/`.
3. **Finish Web Edge Cases:** Connect mentor feedback persistence and task management to Supabase.
4. **Scaffold & Repair Flutter App:** Generate platform wrappers, repair routing and `UserRole`, switch to `supabase_flutter`, and implement concrete repositories.
5. **Establish Test Automation:** Introduce Vitest for React and Flutter test suites.

### 4. Files that Need Modification
- `InternPulse-main/src/core/auth/authService.ts` (Remove login password bypass)
- `InternPulse-main/src/lib/supabase.ts` (Enforce strict env variables)
- `InternPulse-main/src/core/auth/demoAccounts.ts` (Sanitize mock credentials)
- `InternPulse-main/src/components/LoginPage.tsx` (Remove insecure demo provisioners)
- `InternPulse-main/src/App.tsx` (Wire mentor feedback persistence)
- `InternPulse-main/src/components/StudentDashboard.tsx` (Connect real task data)
- `InternPulse-main/pubspec.yaml` (Replace Firebase with Supabase, fix font asset declaration)
- `InternPulse-main/lib/app/router.dart` (Add missing admin routes)
- `InternPulse-main/lib/models/user_role.dart` (Add `admin` role enum)
- `InternPulse-main/lib/features/admin/presentation/screens/admin_dashboard_screen.dart` (Bind to valid routes)
- `InternPulse-main/package.json` (Add test script and test dependencies)

### 5. Files that Must Be Preserved
- `InternPulse-main/src/components/AdminDashboard.tsx` (Preserve complete SMVEC administration layout)
- `InternPulse-main/src/components/HodDashboard.tsx` (Preserve department metrics & drill-down UI)
- `InternPulse-main/src/components/MentorDashboard.tsx` (Preserve mentor filtering and mentee review layout)
- `InternPulse-main/src/components/StudentDashboard.tsx` (Preserve student UI styling & daily log submission layout)
- `InternPulse-main/src/components/AppLogo.tsx` (Preserve college branding)
- `InternPulse-main/src/core/repository/internshipRepository.ts` (Preserve scoped data access architecture)
- `InternPulse-main/lib/core/theme/app_theme.dart` & `color_schemes.dart` (Preserve SMVEC mobile design tokens)
- `InternPulse-main/public/logo-full.svg` & `logo.svg` (Preserve brand assets)
- `README.md` (Preserve repository root documentation)

