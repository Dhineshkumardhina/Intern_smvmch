# INTERNPULSE — PHASE 19F: INSTITUTIONAL GOVERNANCE REPORT
## Institutional Ownership, Academic Governance, Asset Custody & Operational Handover

**Document Reference:** `docs/phase19f/PHASE19F_INSTITUTIONAL_GOVERNANCE_REPORT.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Affiliation:** Pondicherry University / Approved by AICTE, New Delhi  
**Academic Cell:** SMVEC Placement & Training Cell / Deanery of Academic Operations  
**Governing Instrument:** `MOU-SMVEC-FOUNDING-2026` (Founding Institutional Academic Mandate)  
**Audit Status:** Completed Read-Only Inspection  

---

## 1. Executive Summary

A comprehensive institutional governance audit was conducted to review the operational custody, asset ownership, administrative authority, and staff transition procedures for InternPulse.

### Fundamental Institutional Finding:
> **InternPulse is an institutional academic software asset created exclusively for Sri Manakula Vinayagar Engineering College (SMVEC).**  
> Under no circumstances may commercial licenses, subscriptions, billing meters, or recurring software fees be charged to SMVEC, its departments, its faculty, or its student body. All commercial SaaS features created in Phase 19 are strictly partitioned multi-tenant extensions intended for external institutions. In core licensing code ([`SubscriptionService.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/commercial/subscriptionService.ts#L84-L123)), SMVEC is explicitly grandfathered with 100% discount status and cannot be suspended or cancelled.

---

## 2. Institutional Role Hierarchy & Operational Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      SMVEC GOVERNING COUNCIL / PRINCIPAL                    │
│                      - Ultimate Institutional Authority                     │
│                      - Software Intellectual Property Custody               │
│                      - Statutory DPDP Data Fiduciary Responsibility         │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┴──────────────────────────────┐
        ▼                                                             ▼
┌─────────────────────────────┐                       ┌─────────────────────────────┐
│  DEANERY / PLACEMENT CELL   │                       │      SMVEC IT SYSTEMS       │
│  - Academic Policy          │                       │  - Infrastructure & Cloud   │
│  - Industry MoUs            │                       │  - Database Administration  │
│  - 9 Department Governance  │                       │  - Backup & Disaster Rec.   │
└──────────────┬──────────────┘                       └─────────────────────────────┘
               │
        ┌──────┴──────────────────────────────────────────────────────┐
        ▼                                                             ▼
┌─────────────────────────────┐                       ┌─────────────────────────────┐
│    DEPARTMENT HODs (9 Depts)│                       │       FACULTY MENTORS       │
│  - Authorize Geofences      │                       │  - Review Daily Work Logs   │
│  - Assign Faculty Mentors   │                       │  - Monitor Student Telemetry│
│  - Academic Credit Approval │                       │  - Intervene on Blockers    │
└─────────────────────────────┘                       └─────────────────────────────┘
```

### 2.1 Departmental Governance (9 SMVEC Engineering Departments):
InternPulse models the 9 engineering departments at SMVEC:
1. **IT:** Information Technology (HOD: Dr. M. Auxilia)
2. **ECE:** Electronics & Communication Engineering (HOD: Dr. R. Senthamilselvan)
3. **EEE:** Electrical & Electronics Engineering (HOD: Dr. S. Anbumozhi)
4. **MECH:** Mechanical Engineering (HOD: Dr. N. Alagumoorthy)
5. **CIVIL:** Civil Engineering (HOD: Dr. G. Sundararaj)
6. **BME:** Biomedical Engineering (HOD: Dr. P. Dhanalakshmi)
7. **MECT:** Mechatronics Engineering (HOD: Dr. K. Velmurugan)
8. **ICE:** Instrumentation & Control Engineering (HOD: Dr. S. Sivakumar)
9. **CSEBS:** Computer Science & Business Systems (HOD: Dr. V. Gomathi)

---

## 3. Student Data Sovereignty & Custody

### 3.1 Ownership Principles:
- All student records, attendance metrics, GPS verification timestamps, faculty evaluations, and host company records belong **exclusively to SMVEC**.
- No external third-party vendor, cloud provider, or commercial reseller has any claim, license, or right to monetize student telemetry or institution data.
- Under Section 8 of the Indian DPDP Act 2023, SMVEC is the **Data Fiduciary**, retaining full statutory accountability for student data privacy and erasure upon graduation.

---

## 4. Operational Maintenance & Staff Transition Protocols

### 4.1 Faculty & Staff Transitions (HOD / Mentor Transfer):
- **Finding GOV-01 (Medium):** Staff Reallocation Automation.
  - *Current State:* When a faculty mentor is transferred, their assigned student mentees must be manually reassigned one by one in the UI.
  - *Remediation:* Implement a bulk mentor reassignment procedure (`reassignMentorCohort()`) allowing HODs to transition all assigned mentees from one mentor to another in a single atomic transaction.

### 4.2 Technical Maintainer Handover:
- **Finding GOV-02 (High):** Cloud Asset & Master Secret Ownership.
  - *Current State:* The Supabase project (`https://gvnakdxtjjnfcjkcnavz.supabase.co`) and GitHub repository are tied to developer credentials rather than the official SMVEC IT administrative organization.
  - *Remediation:* Transfer GitHub repository ownership to `github.com/smvec-official` and transfer Supabase billing/admin ownership to `itadmin@smvec.ac.in`.

---

## 5. Actionable Institutional Governance Findings Register

### Finding GOV-03: Lack of Formal Institutional DPO Sign-Off & Privacy Policy
- **Severity:** **HIGH**
- **Affected Component:** Institutional Legal Governance
- **Evidence:** While technical privacy controls exist in code, no documented Institutional Data Protection Officer (DPO) charter or formal privacy policy resolution from the SMVEC Governing Council exists in the repository.
- **Potential Impact:** Institutional exposure to statutory scrutiny under the DPDP Act 2023.
- **Remediation:** Present the technical privacy architecture to the SMVEC Governing Council and obtain formal DPO appointment and privacy notice sign-off.
- **Verification Criteria:** Signed DPO appointment letter and approved institutional privacy policy stored in repository documentation.
- **Status:** **OPEN / CONFIRMED**

### Finding GOV-04: Absence of Automated Batch Student Archiving at Academic Term End
- **Severity:** **MEDIUM**
- **Affected Component:** `InternPulse-main/src/core/admin/institutionAdministrationService.ts`
- **Evidence:** When an academic term or academic year concludes, student records remain active indefinitely in the active roster unless individually updated.
- **Potential Impact:** Graduated students retain access to institutional dashboards; active student license capacity is consumed by past cohorts.
- **Remediation:** Implement an annual term-end archiving procedure (`archiveCompletedCohort()`) transitioning graduated students to `ALUMNI` status and disabling active geofence polling.
- **Verification Criteria:** Executing term-end rollover archives past cohorts in bulk without deleting historical attendance reports.
- **Status:** **OPEN / CONFIRMED**

### Finding GOV-05: Incident Escalation & Technical Support SLA Absence
- **Severity:** **MEDIUM**
- **Affected Component:** Operational Support Runbook
- **Evidence:** No documented Standard Operating Procedure (SOP) exists for reporting GPS anomalies, student dispute tickets, or cloud database outages.
- **Potential Impact:** Faculty mentors and students have no structured path to escalate false geofence alerts or system outages, leading to informal off-platform disputes.
- **Remediation:** Establish an in-app "Report Discrepancy" button and document the internal SMVEC IT Helpdesk escalation tier (Level 1: Mentor $\to$ Level 2: HOD $\to$ Level 3: IT Systems Admin).
- **Verification Criteria:** Documented SOP published in `docs/governance/SMVEC_OPERATIONAL_SOP.md`.
- **Status:** **OPEN / CONFIRMED**

