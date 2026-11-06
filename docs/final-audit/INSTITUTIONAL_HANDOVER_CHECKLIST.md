# INTERNPULSE — INSTITUTIONAL HANDOVER CHECKLIST
## Perpetual Academic License, Governance, Asset Ownership & Operational Transfer

**Document Reference:** `docs/final-audit/INSTITUTIONAL_HANDOVER_CHECKLIST.md`  
**Beneficiary Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Affiliation:** Pondicherry University / Approved by AICTE, New Delhi  
**Governing Agreement:** `MOU-SMVEC-FOUNDING-2026` (Founding Institutional Academic Mandate)  
**Commercial Exemption Status:** **PERPETUAL FREE ACADEMIC LICENSE — 100% EXEMPT FROM MONETIZATION**  

---

## 1. Perpetual Institutional Academic Mandate

InternPulse was conceived, designed, and developed as an institutional academic internship tracking system specifically for Sri Manakula Vinayagar Engineering College (SMVEC). 

### Strict Binding Principles:
1. **Permanent Free Educational Use:** SMVEC, its departments (IT, ECE, EEE, MECH, CIVIL, BME, MECT, ICE, CSEBS), its students, mentors, HODs, and administrators shall have permanent, perpetual, royalty-free access to InternPulse without subscription fees, per-student licensing costs, seat charges, or feature paywalls.
2. **Absolute Root Anchor Protection:** SMVEC's institutional record (`a0000000-0000-0000-0000-000000000001`) is hardcoded in core licensing governance with protected status. Under `SubscriptionService.ts` line 326:
   ```typescript
   if (instId === canonicalizeInstitutionId('a0000000-0000-0000-0000-000000000001')) {
     throw new Error('Root anchor institution SMVEC is protected and cannot be suspended or cancelled.');
   }
   ```
3. **No Commercial Billing Imposed on SMVEC:** All commercial SaaS features, pricing tiers (Phase 19C), and payment gateways (Phase 19D) are strictly multi-tenant extensions for external third-party institutions. SMVEC is permanently grandfathered with a 100% discount, zero-value invoices (`₹0`), and unlimited student/department allocations.
4. **Institutional Data Sovereignty:** All student records, telemetry measurements, attendance statistics, company evaluations, and faculty notes collected within SMVEC belong exclusively and in perpetuity to SMVEC.

---

## 2. Institutional Asset & Codebase Inventory

| Asset Category | Description / Location | Ownership & Custody |
| :--- | :--- | :--- |
| **Source Code Repository** | `https://github.com/Dhineshkumardhina/Intern_smvmch.git` | Full rights vested with SMVEC |
| **Web Frontend Source** | `InternPulse-main/src/` (React 19, TypeScript, Tailwind) | SMVEC IT & Academic Cell |
| **Mobile Application Source** | `InternPulse-main/lib/` (Flutter Dart models & screens) | SMVEC IT & Academic Cell |
| **Database Migrations** | `supabase/migrations/` (24 SQL files with PostGIS & RLS) | SMVEC Database Administrators |
| **Documentation Archive** | `docs/` (Phases 1 through 19D + Final Audit Reports) | SMVEC Academic Governance Cell |
| **Authoritative Data Seed** | `src/data/initialData.ts` (9 Engineering Departments, Students, Locations) | SMVEC Departmental Rosters |

---

## 3. Institutional Handover Verification Checklist

### 3.1 Legal & Governance Sign-Off:
- [x] **Zero-Monetization Guarantee:** Verified that SMVEC is 100% exempt from subscription fees, billing cycles, and payment gateway requirements.
- [x] **Grandfathering Protection:** Verified that SMVEC's subscription record holds `isGrandfathered: true` and cannot transition to `SUSPENDED` or `CANCELLED`.
- [ ] **Institutional IP Assignment:** Formal execution of software intellectual property assignment to SMVEC Management.
- [ ] **DPDP Act Compliance Declaration:** Institutional Data Protection Officer (DPO) review of student consent and right-to-erasure workflows.

### 3.2 Technical & Administrative Handover:
- [ ] **GitHub Repository Ownership Transfer:** Transfer repository administrator access to official SMVEC IT GitHub Organization.
- [ ] **Supabase Cloud Project Ownership:** Transfer project ownership of `https://gvnakdxtjjnfcjkcnavz.supabase.co` to SMVEC IT cloud administrator email (`admin@smvec.ac.in`).
- [ ] **Domain & SSL DNS Delegation:** Point official institutional subdomain (e.g., `internpulse.smvec.ac.in`) to the production deployment.
- [ ] **Database Master Credentials:** Securely transfer Supabase `service_role` key and PostgreSQL master connection strings via Doppler/Bitwarden vault.
- [ ] **Google Cloud / Firebase Project:** Create official SMVEC Firebase project (`smvec-internpulse-prod`) for push notifications.

### 3.3 Operations & Maintenance Protocol:
- [ ] **Designate System Administrator:** Appoint an IT staff engineer responsible for database migrations, SSL renewal, and user provisioning.
- [ ] **Establish Automated Offsite Backups:** Schedule daily encrypted `pg_dump` exports to SMVEC institutional network-attached storage (NAS) or private AWS S3 bucket.
- [ ] **Establish Audit & Review Cadence:** Schedule semester-end automated data archiving and purging of expired internship geofence logs in compliance with data minimization mandates.

---

## 4. Academic Stakeholder Roles & Responsibilities

```
                               ┌─────────────────────────────────┐
                               │       SMVEC Management /        │
                               │      Principal / Deanery        │
                               │   (Institutional Governance)    │
                               └────────────────┬────────────────┘
                                                │
                     ┌──────────────────────────┴──────────────────────────┐
                     ▼                                                     ▼
      ┌─────────────────────────────┐                       ┌─────────────────────────────┐
      │   Department HODs (9 Depts) │                       │     SMVEC IT & Systems      │
      │   - Approve geofences       │                       │   - Database administration │
      │   - Manage faculty mentors  │                       │   - Backup & disaster rec.  │
      │   - Department analytics    │                       │   - Domain & SSL oversight  │
      └──────────────┬──────────────┘                       └─────────────────────────────┘
                     │
      ┌──────────────┴──────────────┐
      ▼                             ▼
┌──────────────┐              ┌──────────────┐
│   Faculty    │              │   Student    │
│   Mentors    │              │   Interns    │
│  (Monitoring)│              │ (Field Work) │
└──────────────┘              └──────────────┘
```

---

## 5. Formal Certification of Institutional Exemption

> **Official Declaration:**  
> It is hereby certified that InternPulse is delivered as a free educational infrastructure project for Sri Manakula Vinayagar Engineering College. The platform shall remain free of commercial subscription fees, license expiration dates, and payment gates for all recognized SMVEC students, faculty, and administrative departments in perpetuity.

