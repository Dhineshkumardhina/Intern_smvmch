# INTERNPULSE — PHASE 20A: PRODUCTION INFRASTRUCTURE VALIDATION
## Cloud Database Setup, PostGIS Verification, Background Daemons & Deployment Infrastructure

**Document Reference:** `docs/phase20a/PHASE20A_PRODUCTION_INFRASTRUCTURE_VALIDATION.md`  
**Target Infrastructure:** Supabase Cloud PostgreSQL 15 / PostGIS 3.3, Docker, Nginx, GitHub Actions  
**Audit Standard:** Independent Post-Handover Operational Verification  
**Audit Status:** Completed Read-Only Execution  

---

## 1. Configured Infrastructure vs. Production-Verified Infrastructure

A critical responsibility of this audit is distinguishing between **code configurations** and **infrastructure actively verified in a live cloud production environment**:

| Infrastructure Component | Configured in Code / Repository? | Verified in Live Production? | Operational Status & Gap Analysis |
| :--- | :---: | :---: | :--- |
| **PostgreSQL 15 Database** | **YES** (24 migrations) | **PARTIAL** | Cloud instance provisioned (`gvnakdxtjjnfcjkcnavz`). Full migration run verified in mocks. |
| **PostGIS Spatial Extension** | **YES** (`geography` points) | **PARTIAL** | `verify_student_geofence()` RPC written; live spatial queries verified in unit tests. |
| **Row Level Security (RLS)** | **YES** (63 tables, 206 policies) | **YES (Mock)** | 100% RLS coverage verified via SQL definitions and unit test suites. |
| **Background Scheduler Daemon** | **NO** | **NO** | `process_window_transitions()` exists in SQL, but **no active pg_cron schedule is running**. |
| **FCM / APNs Push Service** | **PARTIAL** | **NO** | In-app notification inbox works; push gateway is an **in-memory simulation**. |
| **Production Web Hosting** | **NO** | **NO** | No `Dockerfile`, `docker-compose.yml`, or `nginx.conf`. Runs via local Vite development server. |
| **Institutional Domain & HTTPS** | **NO** | **NO** | Subdomain `internpulse.smvec.ac.in` DNS delegation and SSL certificate are **pending**. |
| **Automated Database Backups** | **NO** | **NO** | Manual SQL scripts documented; no automated cron `pg_dump` or offsite replication exists. |
| **Backup Restoration Drill** | **NO** | **NO** | Database recovery drill has **never been executed or verified**. |
| **Logging & APM Monitoring** | **NO** | **NO** | No Sentry, Datadog, or external APM configured. Errors log exclusively to console. |

---

## 2. Cloud Database Architecture & PostGIS Functions

### 2.1 Database Migration Schema:
- 24 sequential SQL migrations exist from `20261105000001` through `20261106000024`.
- Core architectural tables:
  - `profiles`, `students`, `mentors`, `hods`, `departments`, `institutions`.
  - `internship_locations`, `internship_assignments`, `internship_batches`.
  - `location_verifications`, `verification_schedules`, `attendance_sessions`.
  - `audit_logs`, `subscription_audit_logs`, `payment_orders`, `payment_transactions`, `payment_webhooks_log`.

### 2.2 PostGIS Function Security:
- Stored procedure `public.verify_student_geofence()` implements geodesic calculations using `ST_DWithin` and `ST_Distance`:
  ```sql
  SELECT ST_DWithin(
      loc.geog_location,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      loc.geofence_radius_meters
  ) INTO v_is_within;
  ```
- **Security Control Verified:** Explicit `search_path = public, postgis, pg_temp` prevents function hijack vulnerabilities.

---

## 3. Scheduled Verification Daemons & Cron Execution

### 3.1 The Production Cron Gap:
- In migration `20261106000008`, `process_window_transitions(p_current_timestamp)` was created to evaluate open verification windows, transition expired windows to `MISSED` or `EXPIRED`, and trigger alerts.
- **Forensic Reality:** Neither `pg_cron` nor an external Supabase Scheduled Edge Function is configured to invoke this procedure automatically.
- **Operational Consequence:** In cloud production, verification windows will open when students check in, but will **never automatically expire** without an external worker invoking the procedure every minute.

---

## 4. Web Hosting & Environment Variable Management

### 4.1 Environment Configuration:
- `.env` in `InternPulse-main/` contains:
  ```env
  VITE_SUPABASE_URL=https://gvnakdxtjjnfcjkcnavz.supabase.co
  VITE_SUPABASE_ANON_KEY=sb_publishable_9rHXjELSfv1I-BH8o3_qLQ_o212kYfQ
  APP_URL=http://localhost:3000
  ```
- **Observations:**
  - `VITE_SUPABASE_ANON_KEY` is a client-safe publishable token governed strictly by RLS.
  - `SUPABASE_SERVICE_ROLE_KEY` is properly absent from client configuration.
  - `APP_URL` remains set to `http://localhost:3000` rather than the official domain `https://internpulse.smvec.ac.in`.

---

## 5. Infrastructure Validation Verdict

$$\mathbf{INFRASTRUCTURE\ VERDICT:\ NO-GO\ FOR\ LIVE\ PRODUCTION}$$

While the PostgreSQL database schema and PostGIS RLS policies are complete and well-architected, live production hosting is blocked by:
1. Absence of containerization / Nginx web server configuration.
2. Unscheduled verification window cron daemon (`pg_cron`).
3. Simulated FCM/APNs push notification gateway.
4. Absence of automated offsite backup pipelines and untested disaster recovery.

