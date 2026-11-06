# INTERNPULSE — PHASE 19G: SECURITY & PRIVACY HANDOVER
## Security Architecture, Anti-Surveillance Safeguards, DPDP Compliance & Incident Response

**Document Reference:** `docs/phase19g/PHASE19G_SECURITY_AND_PRIVACY_HANDOVER.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Statutory Frameworks:** Digital Personal Data Protection (DPDP) Act 2023 (India), IT Act 2000, AICTE Internship Norms  
**Handover Status:** **TECHNICAL PRIVACY ENFORCED (Institutional DPO Formal Sign-Off Pending)**  

---

## 1. Security Architecture & RLS Boundary Summary

InternPulse integrates a defense-in-depth security model separating client-side state, API access, and database records:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            CLIENT BROWSER LAYER                             │
│   - React 19 SPA with Declarative Route Guards                              │
│   - JWT Bearer Tokens in Secure HTTP Context                                │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ HTTPS / TLS 1.3
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                          SERVER SERVICE LAYER (RBAC)                        │
│   - AuthorizationPolicy: Validates Identity, Role, Dept Scope & Tenant      │
│   - Constant-Time Cryptographic Primitives (crypto.timingSafeEqual)         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       │ Parameterized SQL / RPC
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      DATABASE ZERO-TRUST LAYER (POSTGRESQL 15)              │
│   - 100% Row-Level Security (RLS) across 63 Tables (206 Policies)           │
│   - PostGIS Geodesic Verification Functions (Hardened search_path)          │
│   - Immutable Append-Only Audit Logs (audit_logs, subscription_audit_logs)  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Geolocation Privacy & Anti-Surveillance Safeguards

### 2.1 The Non-Penalizing Safety Rule:
InternPulse enforces a strict institutional policy in both code and operations:
> **Technical failures must NEVER be treated as disciplinary attendance infractions.**

The verification engine discriminates across 8 canonical states:
1. `WITHIN_GEOFENCE`: Attendance confirmed.
2. `OUTSIDE_GEOFENCE`: Confirmed outside perimeter (requires mentor inquiry; only valid if accuracy $\le 65$m).
3. `LOCATION_UNAVAILABLE`: Mock GPS or sensor fault (neutral / non-penalizing).
4. `GPS_DISABLED`: Device location turned off (neutral / prompt user).
5. `PERMISSION_DENIED`: Out of shift bounds or consent withdrawn (neutral / collection blocked).
6. `LOW_ACCURACY`: Signal drift $> 65$m (neutral / retry allowed).
7. `NETWORK_UNAVAILABLE`: Cellular disconnection (neutral / cached for offline sync).
8. `VERIFICATION_PENDING`: Window open, awaiting student presence confirmation.

### 2.2 Purpose Limitation & Operating Shift Bounds:
- Handled by [`antiSurveillanceGuard.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/geolocation/antiSurveillanceGuard.ts#L30-L75).
- Telemetry collection is restricted to the student's authorized work shift (e.g. 08:30 to 17:30).
- Location requests attempted outside shift hours are automatically rejected with `PERMISSION_DENIED` and **never** recorded as an unverified absence.

---

## 3. Data Protection (DPDP Act 2023) Assessment & Handover Blockers

InternPulse was architected with data minimization and student privacy as primary requirements. However, full legal compliance requires institutional administrative actions:

| DPDP Act Requirement | Implementation Status in InternPulse | Institutional Handover Blocker? |
| :--- | :--- | :---: |
| **Notice & Informed Consent (Sec 5 & 6)** | In-app consent modal records affirmative consent boolean and ISO timestamp. | **NO (Technical Control Verified)** |
| **Consent Withdrawal** | Students can withdraw consent in profile settings, halting verification instantly. | **NO (Technical Control Verified)** |
| **Data Minimization & Truncation** | Coordinates truncated to 3 decimals (~110m) in audit logs; streaming breadcrumbs prohibited. | **NO (Technical Control Verified)** |
| **Right to Erasure (Sec 8)** | Stored procedure `purge_student_personal_data()` implemented in SQL migration 0011. | **NO (Technical Control Verified)** |
| **Minor Student Consent (Sec 9)** | **GAP:** No parental consent verification for students under 18 years of age. | **YES (HANDOVER BLOCKER)** |
| **Formal DPO Appointment** | **GAP:** Institutional Data Protection Officer not officially appointed in documentation. | **YES (HANDOVER BLOCKER)** |
| **Institutional Privacy Policy** | **GAP:** Official SMVEC Governing Council Privacy Notice not yet linked in UI footer. | **YES (HANDOVER BLOCKER)** |

> **Explicit Handover Blocker Notice:**  
> The system must not onboard minor students ($< 18$ years) until SMVEC executes the parental consent workflow (`PRIV-01`), appoints an institutional DPO (`GOV-03`), and approves the institutional privacy policy.

---

## 4. Security Incident Response & Data Breach Protocol

In the event of an unauthorized access attempt, credentials leak, or telemetry exposure:

### 4.1 Incident Escalation Matrix:
```
[Level 1: Detection]
Faculty Mentor / Student reports unexpected discrepancy or security alert
       │
       ▼
[Level 2: Triage - Within 1 Hour]
SMVEC Lead IT Systems Administrator isolates affected accounts via `is_active = false`
       │
       ▼
[Level 3: Escalation - Within 4 Hours]
Principal / Deanery notified; database logs audited via `SELECT * FROM public.audit_logs`
       │
       ▼
[Level 4: Statutory Action - Within 72 Hours]
SMVEC Data Protection Officer evaluates breach severity under DPDP Act requirements
```

### 4.2 Emergency Revocation Runbook:
To immediately revoke all active sessions during a security incident:
```sql
-- Revoke all active GoTrue authentication sessions instantly
DELETE FROM auth.sessions;
DELETE FROM auth.refresh_tokens;

-- Lock down all student check-in RPCs temporarily
ALTER FUNCTION public.verify_student_geofence REVOKE EXECUTE FROM authenticated;
```

