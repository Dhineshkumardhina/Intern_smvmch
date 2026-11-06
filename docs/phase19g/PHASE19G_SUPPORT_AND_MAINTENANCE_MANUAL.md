# INTERNPULSE — PHASE 19G: SUPPORT & MAINTENANCE MANUAL
## Institutional IT Support Operations, Incident Management, Patching & SLA Matrix

**Document Reference:** `docs/phase19g/PHASE19G_SUPPORT_AND_MAINTENANCE_MANUAL.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Responsible Units:** SMVEC IT Systems Department, Department Faculty Coordinators, Technical Maintainer  
**Standard Maintenance Window:** Sundays 01:00 AM – 04:00 AM IST  
**Operational Status:** **OPERATIONAL FRAMEWORK APPROVED**  

---

## 1. Division of Support Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SMVEC INSTITUTIONAL IT SYSTEMS                        │
│                       (Primary Operational Custody)                         │
│   - First-line and Second-line incident response                            │
│   - User provisioning, account unlocks, and password resets                │
│   - Database backup execution and cloud storage oversight                   │
│   - Campus DNS, SSL renewals, and institutional firewall rules              │
│   - Departmental faculty and student support coordination                   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Tier 3 Escalation
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                     EXTERNAL TECHNICAL MAINTAINER / ADVISOR                 │
│                     (Tier 3 Architectural Support)                          │
│   - Framework major upgrades (React 19 $\to$ 20, Flutter SDK updates)       │
│   - Core cryptographic and PostGIS algorithm maintenance                    │
│   - Upstream Supabase / PostgreSQL major version migrations                 │
│   - Annual independent security and penetration testing review              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Incident Classification & Severity SLA Matrix

| Severity Level | Definition & Operational Impact | Response Time | Target Resolution | Escalation Authority |
| :--- | :--- | :---: | :---: | :--- |
| **Severity 1 (Critical)** | Complete platform outage; database down; campus-wide check-in blocked. | **$< 30 Minutes** | **$< 2 Hours** | Principal / Dean of Academic Operations |
| **Severity 2 (High)** | Core feature degraded (e.g., geofence verification failing across an entire department). | **$< 2 Hours** | **$< 6 Hours** | Department HOD / Lead IT Admin |
| **Severity 3 (Medium)** | Individual student GPS discrepancy, single mentor review issue, or CSV import failure. | **$< 8 Hours** | **$< 24 Hours** | Faculty Mentor / Helpdesk Admin |
| **Severity 4 (Low)** | Minor UI layout glitch, typo, or non-urgent report formatting adjustment. | **$< 24 Hours** | Next Sprint (7 Days) | Technical Maintainer |

---

## 3. Routine Database & Server Maintenance Protocols

### 3.1 Weekly Database Maintenance (Sundays at 02:00 AM IST):
Execute via Supabase SQL Editor:
```sql
-- 1. Vacuum analyze high-write tables to reclaim space and update query plans
VACUUM ANALYZE public.location_verifications;
VACUUM ANALYZE public.verification_schedules;
VACUUM ANALYZE public.attendance_sessions;

-- 2. Reindex spatial indexes for PostGIS performance
REINDEX TABLE public.internship_locations;
```

### 3.2 Monthly Telemetry Archiving:
- In accordance with DPDP data minimization mandates, archive verified records older than 90 days from `location_verifications` into compressed cold storage.

### 3.3 Security Patching & Dependency Updates:
- Run `npm audit` monthly inside `InternPulse-main`.
- Update non-breaking dependencies with `npm update`.
- Test all updates against the 28 Vitest test suites (`npm test`) before deploying to production.

---

## 4. Troubleshooting Common Production Incidents

### 4.1 Incident: Verification Windows Not Opening Automatically
- **Root Cause:** Background scheduler cron daemon is inactive (`DB-01`).
- **Remediation:** Verify that `pg_cron` extension is active:
  ```sql
  SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 5;
  ```
  If cron is inactive, execute manual transition trigger:
  ```sql
  SELECT public.process_window_transitions(timezone('utc', now()));
  ```

### 4.2 Incident: Student Reports Repeated `LOW_ACCURACY`
- **Root Cause:** High-rise reinforced concrete construction attenuating GPS signals.
- **Remediation:** Instruct the student to step near an exterior window. Alternatively, the faculty mentor can issue a documented attendance override in the Mentor Dashboard.

### 4.3 Incident: Nginx Web Server Returning 502 Bad Gateway
- **Root Cause:** Upstream Node/Vite process halted or port collision.
- **Remediation:** Inspect service status and restart:
  ```bash
  sudo systemctl status internpulse-web
  sudo systemctl restart internpulse-web
  sudo systemctl reload nginx
  ```

