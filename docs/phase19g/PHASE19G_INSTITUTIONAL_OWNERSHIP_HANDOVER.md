# INTERNPULSE — PHASE 19G: INSTITUTIONAL OWNERSHIP HANDOVER
## Legal Ownership Framework, Asset Custody, Administrative Access & Governance Transfer

**Document Reference:** `docs/phase19g/PHASE19G_INSTITUTIONAL_OWNERSHIP_HANDOVER.md`  
**Beneficiary Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Affiliation:** Pondicherry University / Approved by AICTE, New Delhi  
**Governing Document:** `MOU-SMVEC-FOUNDING-2026`  
**Commercial Exemption:** **PERPETUAL FREE ACADEMIC LICENSE (100% Free of Monetization)**  

---

## 1. Principles of Institutional Ownership

This document establishes the binding legal, technical, and operational ownership transfer framework for the InternPulse platform from the development team to Sri Manakula Vinayagar Engineering College (SMVEC).

### Mandatory Guarantees:
1. **Permanent Free Educational License:** InternPulse is transferred as a permanent free academic asset to SMVEC. No subscription fees, software license charges, student seat licenses, or feature paywalls shall ever be assessed against SMVEC.
2. **Complete Data Sovereignty:** All student records, attendance metrics, GPS verification timestamps, faculty feedback, and employer information collected within InternPulse remain the sole, exclusive, and unencumbered intellectual and operational property of SMVEC.
3. **Root Anchor Immunity:** In core licensing governance ([`subscriptionService.ts`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/core/commercial/subscriptionService.ts#L84-L123)), SMVEC's institutional record (`a0000000-0000-0000-0000-000000000001`) is hardcoded with root immunity. The system prevents SMVEC from ever being suspended, expired, or cancelled.
4. **Zero Vendor Lock-In:** The entire technology stack utilizes open-standard technologies (React, TypeScript, Flutter, PostgreSQL 15, PostGIS). SMVEC retains full freedom to self-host, migrate, or customize the platform on private institutional infrastructure.

---

## 2. Institutional Asset & Custody Inventory

The following digital assets, repositories, cloud projects, and documentation trees constitute the InternPulse platform being transferred:

| Digital Asset | Custody & Current Location | Target Institutional Custodian | Transfer Method |
| :--- | :--- | :--- | :--- |
| **Source Code Repository** | `github.com/Dhineshkumardhina/Intern_smvmch.git` | Official SMVEC IT GitHub Organization | GitHub Organization Transfer |
| **Cloud PostgreSQL Database** | Supabase Project (`gvnakdxtjjnfcjkcnavz`) | SMVEC IT Systems (`itadmin@smvec.ac.in`) | Supabase Team Ownership Transfer |
| **Institutional Web Domain** | Subdomain delegation pending | SMVEC Campus Network Administration | DNS CNAME / A Record Binding (`internpulse.smvec.ac.in`) |
| **Mobile Push Notification Project**| Google Firebase (Currently Mocked) | SMVEC IT Google Cloud Console | Official Firebase Project Setup (`smvec-internpulse-prod`) |
| **Database Migrations** | `supabase/migrations/` (24 SQL files) | SMVEC Lead Database Administrator | Git Version Control |
| **Documentation Archive** | `docs/` (Phases 1 through 19G) | SMVEC Academic & Placement Cell | Official College Archival Repository |

---

## 3. Division of Operational Responsibilities

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       SMVEC INSTITUTIONAL OWNERSHIP                         │
│                                                                             │
│  ┌──────────────────────────────┐        ┌──────────────────────────────┐   │
│  │   SMVEC IT SYSTEMS ADMIN     │        │     DEPARTMENT HODs (9 Depts)│   │
│  │   - Database Administration  │        │   - Authorize Geofences      │   │
│  │   - Domain & SSL Maintenance │        │   - Assign Faculty Mentors   │   │
│  │   - Automated Backup Oversight│       │   - Review Attendance Rates  │   │
│  │   - User Account Life Cycle  │        │   - Department Reports Sign-off│ │
│  └──────────────┬───────────────┘        └──────────────┬───────────────┘   │
│                 │                                       │                   │
│                 ▼                                       ▼                   │
│  ┌──────────────────────────────┐        ┌──────────────────────────────┐   │
│  │     FACULTY MENTORS          │        │       STUDENT INTERNS        │   │
│  │   - Daily Work Log Approval  │        │   - Daily Check-In/Check-Out │   │
│  │   - Mentee Progress Tracking │        │   - Respond to Geofence Window│  │
│  │   - Blocker Resolution       │        │   - Daily Log Submission     │   │
│  └──────────────────────────────┘        └──────────────────────────────┘   │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                   EXTERNAL TECHNICAL MAINTAINER (ADVISORY)                  │
│                   - Security Patch Advisory                                 │
│                   - Framework Upgrade Guidance (Flutter / React)            │
│                   - Critical Bug Remediation                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Administrative Transfer Procedures

### 4.1 GitHub Repository Transfer:
1. The repository owner initiates the transfer from `Settings` $\to$ `General` $\to$ `Transfer Ownership`.
2. Target: Official institutional organization `github.com/smvec-official`.
3. Target administrator accepts transfer invitation via institutional email.
4. Two-Factor Authentication (2FA) is enforced on all organization members.

### 4.2 Supabase Cloud Project Transfer:
1. In Supabase Dashboard for project `gvnakdxtjjnfcjkcnavz`:
2. Navigate to `Organization Settings` $\to$ `Team Members`.
3. Invite SMVEC Chief IT Administrator (`itadmin@smvec.ac.in`) with the role of `Owner`.
4. Once accepted, transfer primary billing ownership and remove external developer personal accounts.

### 4.3 Institutional Subdomain Binding:
1. In SMVEC Campus DNS Manager (e.g. Cloudflare / BIND):
2. Create an `A` or `CNAME` record:
   ```text
   internpulse.smvec.ac.in.  IN  CNAME  <production-server-cname>
   ```
3. Enforce TLS 1.3 with automated Let's Encrypt / DigiCert institutional certificates.

---

## 5. Security Protocols: Credential Rotation & Access Revocation

> **Security Rule:** Actual production secrets, database master passwords, service role keys, and private tokens must **NEVER** be printed, transmitted via email, or committed to documentation.

### 5.1 Post-Handover Credential Rotation Checklist:
Upon transfer of ownership, SMVEC IT Administration must execute the following rotation protocol:
1. **Rotate Supabase JWT Secret:** In Supabase `Settings` $\to$ `API` $\to$ `JWT Settings`, generate a new 64-character random secret.
2. **Rotate Database Master Password:** In `Database Settings` $\to$ `Database Password`, generate a high-entropy master password ($\ge 32$ characters) and store in SMVEC's institutional Bitwarden/Doppler vault.
3. **Rotate Service Role Key:** Generate a new `service_role` secret and update serverless functions and backup cron jobs.
4. **Purge Developer Test Sessions:** Execute `SELECT auth.sign_out_all_users();` in SQL Editor to invalidate any active development sessions.

### 5.2 Staff Transition Protocol (Faculty Mentor / HOD Departure):
- **When a Mentor leaves or transitions:**
  1. Department HOD reassigns the mentor's mentees to an active faculty member using the mentor reallocation tool.
  2. Institutional IT Admin toggles `is_active = false` on the departing mentor's profile in the `profiles` table.
  3. The departing mentor's session is revoked instantly upon next request.
- **When an HOD transitions:**
  1. Principal/Deanery designates the incoming HOD in writing.
  2. Institutional IT Admin updates `department_code` and assigns `role = 'hod'` to the new faculty member's profile.
  3. The previous HOD's administrative privileges are downgraded to faculty mentor.

---

## 6. Institutional Ownership Transfer Checklist

The following checklist tracks the step-by-step transfer of institutional custody:

- [ ] **Transfer Item 1:** GitHub repository transferred to official SMVEC organization.
- [ ] **Transfer Item 2:** Supabase cloud project `gvnakdxtjjnfcjkcnavz` ownership transferred to `itadmin@smvec.ac.in`.
- [ ] **Transfer Item 3:** Official institutional DNS record `internpulse.smvec.ac.in` configured and resolving with valid TLS 1.3 certificate.
- [ ] **Transfer Item 4:** All database master credentials, JWT secrets, and service keys rotated by SMVEC IT Systems.
- [ ] **Transfer Item 5:** External developer administrative and contributor write permissions revoked.
- [ ] **Transfer Item 6:** Formal execution of software intellectual property assignment to SMVEC Management.
- [ ] **Transfer Item 7:** Re-certification of permanent free academic license (`MOU-SMVEC-FOUNDING-2026`).

