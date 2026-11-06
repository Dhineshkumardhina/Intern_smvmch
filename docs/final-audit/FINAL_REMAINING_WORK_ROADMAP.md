# INTERNPULSE — FINAL REMAINING WORK ROADMAP
## Engineering Backlog, Production Remediation & Release Milestone Plan

**Document Reference:** `docs/final-audit/FINAL_REMAINING_WORK_ROADMAP.md`  
**Target Release:** InternPulse v1.0.0 Institutional Release (SMVEC Free Academic Edition)  
**Target Architecture:** React 19 Web Console + Flutter Android/iOS + Supabase PostgreSQL 15 / PostGIS  
**Current Milestone State:** **CONDITIONAL GO (Web Pilot Console) / NO-GO (Mobile Production)**  

---

## 1. Executive Roadmap Overview

The audit confirms that InternPulse possesses a complete database architecture, robust server-side RBAC, and rich web administration dashboards. However, releasing a production-grade mobile monitoring system to real students on physical Android and iOS devices requires completing native mobile scaffolding, hardware plugin integration, scheduled cloud background workers, and CI/CD pipelines.

This document outlines the phased engineering roadmap required to take InternPulse from its current audit state to complete physical production operations.

```
       ┌────────────────────────────────────────────────────────┐
       │   CURRENT STATE: 62.8% Completion                      │
       │   - Web Dashboard & Admin Console: FUNCTIONAL          │
       │   - Server-Side Logic & Database RLS: COMPLETE         │
       │   - Mobile Native & Physical Hardware: UNIMPLEMENTED   │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 1: Codebase Hygiene & Build Stabilization (Weeks 1–2)              │
│ - Fix TypeScript compile errors (tsc --noEmit)                               │
│ - Consolidate duplicate migrations                                           │
│ - Set up GitHub Actions CI for Web & Backend Vitest                          │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 2: Mobile Native Scaffolding & Hardware Plugins (Weeks 3–5)        │
│ - Recreate Android / iOS native project scaffolding                          │
│ - Add geolocator, safe_device, firebase_messaging, workmanager               │
│ - Replace static coordinates with real GPS hardware queries                  │
│ - Implement Android foreground service & OEM battery exemptions              │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 3: Cloud Infrastructure, Background Cron & Backups (Weeks 6–7)     │
│ - Schedule process_window_transitions() via Supabase Edge Function / pg_cron │
│ - Deploy production Nginx reverse proxy with Dockerfile                      │
│ - Implement automated encrypted pg_dump cloud backups                        │
│ - Connect official SMVEC Firebase HTTP v1 project for push                   │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 4: Physical Device Field Testing & Institutional Pilot (Weeks 8–9) │
│ - Test on 20 physical student smartphones (Samsung, Xiaomi, Vivo, iOS)       │
│ - Evaluate geofence accuracy, GPS drift, battery drain, and notification lag │
│ - Departmental pilot with SMVEC Department of Information Technology (IT)    │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 5: Campus-Wide Institutional Handover (Week 10)                    │
│ - Onboard all 9 SMVEC Engineering Departments (3,000 students)               │
│ - Transfer cloud credentials to SMVEC IT Administration                      │
│ - Permanent Free Academic License Certification                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Work Breakdown Structure (WBS)

### Milestone 1: Codebase Hygiene & Build Stabilization
- [ ] **TS-01: Fix TypeScript Static Analysis Errors**
  - Resolve 50+ type errors detected by `tsc --noEmit` in `src/core/auth/__tests__/`, `paymentGatewayService.ts`, and `verificationSchedulerEngine.ts`.
  - Ensure `npm run lint` passes with 0 errors.
- [ ] **FS-02: Eliminate Duplicate Migrations**
  - Consolidate root `supabase/migrations/` and `InternPulse-main/supabase/migrations/` to prevent dual-copy divergence.
- [ ] **CI-03: Implement Web & Backend CI Automation**
  - Create `.github/workflows/web-ci.yml` running `npm run lint`, `npm test`, and `npm run build` on all pull requests.
- [ ] **BD-04: Optimize Web Bundle Size**
  - Implement dynamic code-splitting via `React.lazy()` for Admin, HOD, and Mentor dashboards to reduce the monolithic 1.57 MB JS chunk below 500 kB.

---

### Milestone 2: Mobile Native Scaffolding & Hardware Integration
- [ ] **MOB-01: Recreate Native Project Scaffolding**
  - Execute `flutter create .` inside `InternPulse-main` to generate missing `MainActivity.kt`, `AppDelegate.swift`, `Runner.xcodeproj`, and Android resource folders.
- [ ] **MOB-02: Install Production Hardware Plugins**
  - Update `pubspec.yaml` with:
    - `geolocator: ^12.0.0` (Hardware GPS sensor acquisition)
    - `safe_device: ^1.1.4` (Mock location and root/jailbreak detection)
    - `firebase_core: ^3.0.0` and `firebase_messaging: ^15.0.0` (Push notifications)
    - `flutter_local_notifications: ^17.0.0` (In-tray notification alerts)
    - `workmanager: ^0.5.2` (Background window execution)
- [ ] **MOB-03: Replace Hardcoded GPS Telemetry**
  - Refactor `MobileLocationService.getCurrentLocation()` in Dart to read real device GPS coordinates with horizontal accuracy thresholds ($\le 65$ meters).
- [ ] **MOB-04: Implement Mock Location Shield**
  - Hook Android `Position.isMocked` and iOS mock location flags to enforce `LOCATION_UNAVAILABLE` on fake GPS attempts.
- [ ] **MOB-05: Implement Android Geolocation Foreground Service**
  - Write native Kotlin foreground service class `GeolocationForegroundService.kt` with a persistent notification banner displayed during active internship shifts.

---

### Milestone 3: Cloud Infrastructure, Background Cron & Backups
- [ ] **OPS-01: Automate Verification Window Cron**
  - Deploy a Supabase Scheduled Edge Function or configure `pg_cron` to execute `process_window_transitions(timezone('utc', now()))` every 60 seconds.
- [ ] **OPS-02: Containerize Web Application**
  - Write a multi-stage `Dockerfile` and `nginx.conf` for production hosting with Gzip compression and security headers.
- [ ] **OPS-03: Implement Real Firebase Admin Push Dispatcher**
  - Replace the mock simulation in `fcmGateway.ts` with real Google `firebase-admin` SDK calls using official SMVEC service account credentials.
- [ ] **OPS-04: Configure Daily Encrypted Database Backups**
  - Schedule an automated `pg_dump` script with AES-256 encryption exporting daily snapshots to institutional cloud storage.

---

### Milestone 4: Physical Device Field Testing & Academic Pilot
- [ ] **TEST-01: Physical Device Compatibility Matrix**
  - Test on real physical smartphones across major Indian student OEM ecosystems:
    - Samsung One UI (Galaxy A/M series, Android 13/14)
    - Xiaomi HyperOS / Redmi Note (MIUI 14, Android 13/14)
    - Realme UI / Oppo ColorOS (Android 12/13)
    - Apple iPhone (iOS 16/17/18)
- [ ] **TEST-02: Real-World Geofence Calibration**
  - Validate GPS geofence boundary calculations at actual industrial locations (e.g. TCS Siruseri, Zoho Estancia, Integra Puducherry).
- [ ] **TEST-03: Network Resilience & Offline Sync**
  - Verify check-in behavior under cellular dropouts (EDGE, 4G, 5G handover) and low-signal indoor enterprise environments.
- [ ] **TEST-04: Departmental Single-Cohort Pilot**
  - Run a 2-week pilot with 30 student interns from the Department of Information Technology (IT) under Dr. M. Auxilia (HOD).

---

### Milestone 5: Institutional Campus-Wide Handover
- [ ] **GOV-01: Transfer Cloud & Repository Ownership**
  - Transition GitHub admin and Supabase project credentials to the official SMVEC IT administrative department.
- [ ] **GOV-02: Domain & DNS Configuration**
  - Bind official domain `internpulse.smvec.ac.in` with institutional TLS 1.3 certificates.
- [ ] **GOV-03: Execute Permanent Free Academic MOU**
  - Sign formal handover documentation confirming 100% free, perpetual institutional use for SMVEC.

---

## 3. Risk Management & Mitigation Matrix

| Identified Risk | Severity | Impact | Mitigation Strategy |
| :--- | :---: | :--- | :--- |
| **Aggressive OEM Battery Killers** | **HIGH** | Windows missed due to background killed apps. | Enforce prominent in-app guidance directing students to disable battery optimization and enable autostart on Xiaomi/Samsung devices. |
| **GPS Drift in Multi-Story Tech Parks** | **MEDIUM** | False `OUTSIDE_GEOFENCE` readings indoors. | Apply adaptive accuracy thresholding ($\le 65$m) and geofence padding (+25m buffer) for certified high-rise tech parks. |
| **Push Notification Latency** | **MEDIUM** | Students receive window alert after window closes. | Enforce high-priority FCM payload (`priority: 'high'`) and minimum 15-minute verification window duration. |
| **Accidental Billing Activation** | **LOW** | System prompts SMVEC for payment. | Root anchor protection hardcoded in database triggers and service code; SMVEC grandfathered permanently with zero-value invoices. |

