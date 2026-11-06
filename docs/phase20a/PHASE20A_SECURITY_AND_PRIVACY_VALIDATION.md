# INTERNPULSE — PHASE 20A: SECURITY & PRIVACY VALIDATION
## Technical Anti-Surveillance Safeguards, DPDP Act 2023 Compliance & Failure Discrimination Audit

**Document Reference:** `docs/phase20a/PHASE20A_SECURITY_AND_PRIVACY_VALIDATION.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Statutory Frameworks:** Digital Personal Data Protection (DPDP) Act 2023 (India), IT Act 2000, AICTE Norms  
**Audit Standard:** Independent Post-Handover Operational Verification  
**Audit Status:** Completed Read-Only Execution  

---

## 1. Executive Summary & Anti-Surveillance Guarantees

This validation review assesses the technical privacy protections, anti-surveillance bounds, and statutory compliance mechanisms implemented across the InternPulse platform.

### Core Institutional Privacy Rule:
> **Location presence verification must operate strictly as an affirmative presence verification tool during authorized work shifts. It must NEVER function as a 24/7 tracking or surveillance mechanism.**  
> Technical failures (GPS dropouts, network timeouts, building attenuation, sensor unavailability) must **NEVER** automatically convert into confirmed disciplinary violations or accusations of absenteeism.

---

## 2. Discrimination of Technical Failures vs. Confirmed Violations

InternPulse enforces an explicit **Non-Penalizing Safety Rule** across its TypeScript and Dart verification engines:

```
                                [TELEMETRY SUBMISSION RECEIVED]
                                               │
                                               ▼
                                 [Mock Location / Fake GPS?]
                                ┌──────────────┴──────────────┐
                                ▼ YES                         ▼ NO
                    LOCATION_UNAVAILABLE          [Within Authorized Shift?]
                    (Neutral / Rejected)         ┌────────────┴────────────┐
                                                 ▼ NO                      ▼ YES
                                         PERMISSION_DENIED         [Active Consent?]
                                         (Anti-Surveillance)      ┌────────┴────────┐
                                                                  ▼ NO              ▼ YES
                                                          PERMISSION_DENIED  [Accuracy <= 65m?]
                                                          (Collection Off)  ┌───────┴───────┐
                                                                            ▼ NO            ▼ YES
                                                                       LOW_ACCURACY    [Inside Geofence?]
                                                                       (Safe Retry)   ┌─────┴─────┐
                                                                                      ▼ YES       ▼ NO
                                                                                   WITHIN      OUTSIDE
                                                                                  GEOFENCE    GEOFENCE
                                                                                  (Verified)  (Flagged)
```

### 2.1 The 8 Canonical Telemetry States Evaluated:
1. **`WITHIN_GEOFENCE`:** Geodesic distance $\le$ radius; horizontal accuracy $\le 65$m; within shift hours. Attendance verified with full academic credit.
2. **`OUTSIDE_GEOFENCE`:** Distance $>$ radius; valid accuracy; within shift. Flagged for mentor review. *Never assigned if accuracy is invalid or signal is lost.*
3. **`LOCATION_UNAVAILABLE`:** Fake GPS / mock provider detected or device GPS chip unresponsive. Treated as neutral technical failure.
4. **`GPS_DISABLED`:** Student device location toggled OFF in OS settings. Prompts student to enable GPS; non-penalizing.
5. **`PERMISSION_DENIED`:** Verification attempted outside authorized shift hours OR student consent withdrawn. Collection halted immediately.
6. **`LOW_ACCURACY`:** Horizontal accuracy $> 65$ meters due to indoor concrete shielding. Automatically prompts in-shift retry; non-penalizing.
7. **`NETWORK_UNAVAILABLE`:** Cellular radio disconnected. Telemetry cached in offline queue; non-penalizing.
8. **`VERIFICATION_PENDING`:** Window open, awaiting student presence confirmation.

---

## 3. Anti-Surveillance Lifecycle Audit

### 3.1 Purpose Limitation (Authorized Shift Hours Only):
- Handled by [`antiSurveillanceGuard.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/geolocation/antiSurveillanceGuard.ts#L30-L75).
- Location requests attempted before shift start (e.g. 08:30) or after shift end (e.g. 17:30) are rejected with `PERMISSION_DENIED`.
- Telemetry collection is prohibited on weekends, holidays, or post-internship dates.

### 3.2 Notification Privacy:
- When a verification window opens, push notification payloads contain only window identifiers (`windowId`, `expiresAt`).
- Raw latitude and longitude coordinates are **never transmitted over push notification channels**, eliminating eavesdropping risks on notification delivery networks.

### 3.3 Data Minimization & Retention:
- Coordinates stored in audit logs are truncated to 3 decimal places (~110 meters), eliminating high-precision residential breadcrumb tracking.
- Stored procedure `purge_student_personal_data()` in migration `20261106000011` enables complete erasure of telemetry upon internship completion or consent revocation.

---

## 4. Outstanding Institutional & Legal Approvals (Handover Blockers)

While technical privacy safeguards are well-implemented in code, full legal compliance under India's Digital Personal Data Protection (DPDP) Act 2023 requires the following outstanding institutional actions:

1. **Minor Student Consent Workflow (DPDP Act Sec 9):**
   - *Status:* **BLOCKER (UNRESOLVED)**.
   - *Detail:* The registration and onboarding flows lack a verifiable parental/guardian consent verification mechanism for polytechnic or junior students under 18 years of age.
2. **Formal Institutional DPO Appointment:**
   - *Status:* **BLOCKER (UNRESOLVED)**.
   - *Detail:* An official Data Protection Officer (DPO) has not been formally appointed by the SMVEC Governing Council.
3. **Institutional Privacy Policy Publication:**
   - *Status:* **BLOCKER (UNRESOLVED)**.
   - *Detail:* SMVEC's institutional privacy notice and statutory Grievance Redressal Officer contact details are not yet linked in the application footer.

---

## 5. Security & Privacy Validation Verdict

$$\mathbf{SECURITY\ \&\ PRIVACY\ VERDICT:\ CONDITIONAL\ GO}$$

- **Technical Privacy Controls:** **VERIFIED & COMPLIANT** (Non-penalizing safety rule, shift bounds, coordinate truncation, right to erasure).
- **Institutional Governance Gaps:** **PENDING DPO APPOINTMENT & MINOR CONSENT WORKFLOW**.

