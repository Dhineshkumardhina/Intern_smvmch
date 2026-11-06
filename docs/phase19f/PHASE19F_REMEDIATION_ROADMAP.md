# INTERNPULSE — PHASE 19F: REMEDIATION ROADMAP
## Engineering Backlog, Phased Milestone Execution & Transition to Phase 19G

**Document Reference:** `docs/phase19f/PHASE19F_REMEDIATION_ROADMAP.md`  
**Target Release:** InternPulse v1.0.0 (SMVEC Free Academic Edition)  
**Next Engineering Phase:** Phase 19G — Production Hardening & Native Scaffolding Remediation  
**Target Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Audit Status:** Completed Read-Only Inspection  

---

## 1. Executive Roadmap Overview

To address the findings identified in the Phase 19F audit, a prioritized 5-milestone remediation roadmap has been designed. Execution of these milestones will transition InternPulse from its current web pilot console state to full physical device production readiness.

```
       ┌────────────────────────────────────────────────────────┐
       │   PHASE 19F AUDIT BASELINE                             │
       │   - 20 Identified Vulnerabilities / Gaps               │
       │   - Web Application: Functional                        │
       │   - Mobile Application: Headless Dart Prototype        │
       │   - Cloud Daemons & Backups: Unscheduled               │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 1: Immediate Security & Codebase Hygiene (Weeks 1–2)               │
│ - Resolve 50+ TypeScript compile errors (tsc --noEmit) [SEC-04]              │
│ - Consolidate duplicate migrations to single authoritative root [DB-02]      │
│ - Implement GitHub Actions Web & Backend CI workflow [SEC-08]                │
│ - Sanitize CSV export formula injection vulnerabilities [SEC-06]             │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 2: Mobile Scaffolding & Native Hardware Integration (Weeks 3–5)    │
│ - Regenerate native Android & iOS platform scaffolding [MOB-01, MOB-02]      │
│ - Add hardware plugins: geolocator, safe_device, firebase_messaging [MOB-05] │
│ - Replace static coordinates with physical GPS sensor telemetry [MOB-03]     │
│ - Implement native Kotlin GeolocationForegroundService [MOB-01]              │
│ - Secure JWT token persistence with Android Keystore / iOS Keychain [MOB-04]│
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 3: Cloud Infrastructure, Background Cron & Backups (Weeks 6–7)     │
│ - Deploy pg_cron scheduled window transitions (process_window_transitions)   │
│ - Implement automated encrypted pg_dump cloud backups with tested drill [INFRA-01]│
│ - Containerize web console with multi-stage Dockerfile & Nginx [INFRA-02]    │
│ - Integrate official SMVEC Google Firebase Admin SDK for real push [SEC-07]  │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 4: Privacy Governance, Minor Consent & Physical Field Tests (Weeks 8–9)│
│ - Implement parental/guardian consent flow for students < 18 [PRIV-01]       │
│ - Execute physical field validation across 20 student devices [MOB-03]       │
│ - Verify HyperOS / One UI background battery optimization survival           │
│ - Run single-department pilot with SMVEC Department of IT (30 students)      │
└──────────────────────────────────┬───────────────────────────────────────────┘
                                   │
                                   ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│ MILESTONE 5: Institutional Governance Handover & Campus Rollout (Week 10)    │
│ - Transfer Supabase project & GitHub repository to SMVEC IT Admin [GOV-02]   │
│ - Bind official domain internpulse.smvec.ac.in with institutional SSL        │
│ - Formal DPO privacy policy sign-off from SMVEC Governing Council [GOV-03]   │
│ - Perpetual Free Academic License execution (MOU-SMVEC-FOUNDING-2026)        │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Detailed Remediation Task Backlog

### Milestone 1: Immediate Security & Codebase Hygiene (Weeks 1–2)
| Task ID | Finding Ref | Action Required | Responsible | Acceptance Criteria |
| :--- | :---: | :--- | :--- | :--- |
| **TS-FIX** | `SEC-04` | Export missing `WebhookStatus`, add required `AuthUser` fields in tests, fix geofence parameter types. | Lead TS Engineer | `npm run lint` exits 0. |
| **MIG-DEDUP**| `DB-02` | Delete duplicate migration folder `InternPulse-main/supabase/migrations/`; symlink to root. | DevOps Engineer | Single migration source. |
| **CI-WEB** | `SEC-08` | Create `.github/workflows/web-ci.yml` running lint, test, and build on PRs. | DevOps Engineer | Web CI passing in Actions. |
| **CSV-SEC** | `SEC-06` | Implement single-quote prepending for cells starting with `=`, `+`, `-`, `@`. | Security Engineer | Formula injection blocked. |
| **CACHE-SEC**| `SEC-05` | Purge `localStorage` on logout and encrypt offline cached student data. | Web Engineer | No plain data in storage. |

---

### Milestone 2: Mobile Scaffolding & Native Hardware Integration (Weeks 3–5)
| Task ID | Finding Ref | Action Required | Responsible | Acceptance Criteria |
| :--- | :---: | :--- | :--- | :--- |
| **MOB-SCAF**| `MOB-01, 02`| Re-scaffold Android and iOS native projects using Flutter CLI (`flutter create .`). | Mobile Specialist | Native entrypoints present. |
| **MOB-PLUG**| `MOB-05` | Add `geolocator`, `safe_device`, `firebase_messaging`, `flutter_local_notifications`. | Mobile Specialist | Plugins resolve cleanly. |
| **GPS-REAL**| `MOB-03, PRIV-02` | Connect `Geolocator.getCurrentPosition()` to replace hardcoded mock coordinates. | Mobile Specialist | Real GPS lat/lon captured. |
| **SRV-KOT** | `MOB-01` | Write native `GeolocationForegroundService.kt` with persistent notification banner. | Android Developer | Service runs during shift. |
| **TOK-SEC** | `MOB-04` | Configure `supabase_flutter` with `flutter_secure_storage` (Keystore / Keychain). | Mobile Specialist | Tokens hardware-encrypted. |

---

### Milestone 3: Cloud Infrastructure, Background Cron & Backups (Weeks 6–7)
| Task ID | Finding Ref | Action Required | Responsible | Acceptance Criteria |
| :--- | :---: | :--- | :--- | :--- |
| **CRON-RUN**| `DB-01` | Enable `pg_cron` in Supabase running `process_window_transitions()` every 60s. | Database Admin | Expired windows close auto. |
| **BCK-AUTO**| `INFRA-01` | Deploy daily encrypted `pg_dump` to institutional S3 storage; run restore drill. | DevOps Engineer | Restoration verified 100%. |
| **DOCK-WEB**| `INFRA-02` | Write multi-stage `Dockerfile` and `nginx.conf` with SPA routing and compression. | DevOps Engineer | Container serves app cleanly. |
| **FCM-LIVE**| `SEC-07` | Replace mock `fcmGateway.ts` with real `firebase-admin` HTTP v1 dispatcher. | Backend Engineer | Real push delivered to phone. |

---

### Milestone 4: Privacy Governance, Minor Consent & Physical Field Tests (Weeks 8–9)
| Task ID | Finding Ref | Action Required | Responsible | Acceptance Criteria |
| :--- | :---: | :--- | :--- | :--- |
| **MIN-CONS**| `PRIV-01` | Implement age verification and parental consent flow for students $<18$. | Privacy Architect | DPDP Sec 9 compliant. |
| **DEV-TEST**| `MOB-03` | Execute physical field test on 20 student devices (Samsung, Xiaomi, Vivo, iPhone). | QA Team | Field validation report. |
| **BAT-OPT** | `MOB-01` | Provide in-app OEM battery optimization exemption guides for HyperOS / One UI. | QA Team | App survives 8-hour shift. |
| **PIL-DEPT**| `GOV-05` | Conduct 2-week pilot with SMVEC Department of IT (30 students, Dr. Auxilia). | Academic Cell | Pilot evaluation sign-off. |

---

### Milestone 5: Institutional Governance Handover & Campus Rollout (Week 10)
| Task ID | Finding Ref | Action Required | Responsible | Acceptance Criteria |
| :--- | :---: | :--- | :--- | :--- |
| **ADM-XFER**| `GOV-02` | Transfer Supabase project and GitHub repo to SMVEC IT Department. | Project Lead | Ownership transfer complete. |
| **DOM-SSL** | `INFRA-02` | Configure `internpulse.smvec.ac.in` with institutional SSL certificates. | IT Admin | Official domain live. |
| **DPO-SIGN**| `GOV-03` | Obtain formal institutional DPO appointment and privacy notice sign-off. | Legal / Governance | Signed DPO documentation. |
| **MOU-EXEC**| `GOV-01` | Re-certify perpetual free academic license (`MOU-SMVEC-FOUNDING-2026`). | Governing Council | Free license certified. |

---

## 3. Transition to Phase 19G

Upon user authorization, **Phase 19G** will commence with the immediate execution of **Milestone 1**:
1. Resolving the TypeScript type errors in `paymentGatewayService.ts` and test mocks.
2. Removing duplicate migration directories.
3. Establishing the `.github/workflows/web-ci.yml` pipeline.
4. Implementing CSV formula injection sanitization.

