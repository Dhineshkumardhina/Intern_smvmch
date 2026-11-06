# INTERNPULSE — PHASE 20A: FINAL GO-LIVE GAP REGISTER
## Master Defect, Technical Gap & Pre-Go-Live Remediation Register

**Document Reference:** `docs/phase20a/PHASE20A_FINAL_GO_LIVE_GAP_REGISTER.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Audit Standard:** Independent Post-Handover Operational Verification & Pre-Go-Live Review  
**Audit Status:** Completed Read-Only Execution  

---

## 1. Executive Summary & Defect Categorization

This register identifies all unresolved technical bugs, mobile compilation failures, infrastructure gaps, privacy omissions, and governance dependencies that currently block official campus-wide go-live.

```
Total Identified Gaps / Defects: 16
-----------------------------------------------------------
- CRITICAL Blockers:     2  (12.5%) - Fatal Mobile Scaffolding
- HIGH Blockers:         6  (37.5%) - TS Compile, GPS, Cron, Backups, DPO, Minors
- MEDIUM Prerequisites:  6  (37.5%) - Storage Cache, CSV Injection, Duplications, etc.
- LOW / Operational:     2  (12.5%) - UI Link, Cohort Archiving
```

---

## 2. Master Pre-Go-Live Gap Register

| Gap ID | Severity | Category | Component | Technical Reality & Forensic Evidence | Remediation Action Required | Target Phase |
| :--- | :---: | :---: | :--- | :--- | :--- | :---: |
| **`GAP-MOB-01`** | **CRITICAL** | Mobile | `android/app/` | `MainActivity.kt` and `res/` missing; app cannot compile to an APK. | Re-scaffold Android platform via `flutter create .`. | **Phase 20B** |
| **`GAP-MOB-02`** | **CRITICAL** | Mobile | `ios/Runner/` | `AppDelegate.swift` and Xcode project files missing; cannot build iOS IPA. | Re-scaffold iOS platform via Flutter CLI. | **Phase 20B** |
| **`GAP-SEC-01`** | **HIGH** | Web/AppSec | `src/` (Core TS) | `npm run lint` (`tsc --noEmit`) fails with 50+ type compilation errors. | Fix missing type exports (`WebhookStatus`) and test mock properties. | **Phase 20B** |
| **`GAP-MOB-03`** | **HIGH** | Mobile | `lib/core/geolocation/` | Static mock coordinates (`12.8284, 80.2198`) hardcoded in `mobile_location_service.dart`. | Add `geolocator` plugin and bind real hardware sensor telemetry. | **Phase 20B** |
| **`GAP-MOB-04`** | **HIGH** | Mobile | `pubspec.yaml` | Essential hardware plugins (`geolocator`, `safe_device`, `firebase_messaging`) absent. | Add required packages to `pubspec.yaml` and resolve dependencies. | **Phase 20B** |
| **`GAP-DB-01`** | **HIGH** | Database | `supabase/migrations/0008` | `process_window_transitions()` unscheduled; verification windows never expire automatically. | Configure `pg_cron` job running every 60 seconds in Supabase. | **Phase 20B** |
| **`GAP-INFRA-01`**| **HIGH** | Infra | Cloud Backups | Automated `pg_dump` cron absent; backup restoration has never been tested. | Deploy automated backup script and execute verified restore drill. | **Phase 20B** |
| **`GAP-PRIV-01`** | **HIGH** | Privacy | `src/components/` | No parental/guardian consent verification workflow for students under 18 (DPDP Sec 9). | Implement age verification gate and parental consent workflow. | **Phase 20B** |
| **`GAP-GOV-01`** | **HIGH** | Governance | Legal Authority | Formal institutional DPO not appointed; SMVEC Privacy Policy not linked in UI. | Governing Council formally appoints DPO and approves Privacy Notice. | **Phase 20B** |
| **`GAP-DB-02`** | **MEDIUM** | Database | `supabase/migrations/` | 24 migrations duplicated across root and `InternPulse-main/`. | Remove duplicate directory; point Supabase CLI to single root. | **Phase 20B** |
| **`GAP-SEC-02`** | **MEDIUM** | Web/AppSec | `src/core/analytics/` | CSV export does not sanitize cells starting with `=`, `+`, `-`, `@` (Formula Injection). | Implement single-quote prepending on all exported CSV cells. | **Phase 20B** |
| **`GAP-SEC-03`** | **MEDIUM** | Web/AppSec | `src/core/repository/` | `localStorage` caches student rosters in plain text (`internpulse_students_store_v3`). | Invalidate local storage cache on logout; use encrypted storage. | **Phase 20B** |
| **`GAP-INFRA-02`**| **MEDIUM** | Infra | Deployment | No `Dockerfile`, `docker-compose.yml`, or `nginx.conf` exists for production web hosting. | Create multi-stage Dockerfile and Nginx SPA virtual host config. | **Phase 20B** |
| **`GAP-SEC-04`** | **MEDIUM** | DevOps | `.github/workflows/` | Absence of Web/Node Vitest CI automation in GitHub Actions. | Create `.github/workflows/web-ci.yml` running lint, test, build. | **Phase 20B** |
| **`GAP-GOV-02`** | **MEDIUM** | Governance | Asset Custody | Cloud Supabase project and GitHub repo owned by individual developer accounts. | Transfer ownership to official SMVEC IT administrative accounts. | **Phase 20B** |
| **`GAP-GOV-03`** | **LOW** | Governance | Administration | Unexecuted acceptance templates; all instruments remain PENDING. | Present templates to Principal, HODs, and IT Admin for execution. | **Phase 20B** |

---

## 3. The 6 Statutory Go-Live Status Classifications

| Dimension | 1. Genuinely Complete | 2. Tested in Mocks | 3. Verified in Production | 4. Physically Tested | 5. Requires Inst. Approval | 6. Remains Before Go-Live |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **Database Schema (24 Migrations)** | **YES** | **YES** | **PARTIAL** | N/A | No | Consolidate duplicate copy |
| **PostGIS Spatial RLS Policies** | **YES** | **YES** | **PARTIAL** | N/A | No | Execute live cloud validation |
| **React Web Admin Dashboards** | **YES** | **YES** | **NO** | N/A | Yes (HOD Review) | Fix TS errors; deploy Nginx |
| **Verification Scheduler Engine** | **YES** | **YES** | **NO** | N/A | No | Enable `pg_cron` runner |
| **Anti-Surveillance Bounds** | **YES** | **YES** | **NO** | N/A | Yes (DPO Sign-off)| Minor consent workflow |
| **Flutter Mobile Application** | **NO (Dart UI Only)**| **PARTIAL** | **NO** | **NO (0%)** | Yes (Play Store) | Recreate native scaffolding |
| **Push Notifications (FCM/APNs)** | **NO (Simulated)** | **PARTIAL** | **NO** | **NO (0%)** | Yes (Firebase) | Connect official SMVEC credentials|
| **Automated Database Backups** | **NO (Script Only)** | **NO** | **NO** | N/A | Yes (IT Admin) | Execute live restoration drill |
| **Institutional Handover Order** | **NO (Template Only)**| N/A | N/A | N/A | **YES** | Formal Principal execution |

