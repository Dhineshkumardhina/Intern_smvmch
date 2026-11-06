# INTERNPULSE — PHASE 19G: DATABASE BACKUP & RECOVERY MANUAL
## Disaster Recovery Runbook, Backup Encryption, Restoration Protocols & RPO/RTO Metrics

**Document Reference:** `docs/phase19g/PHASE19G_DATABASE_BACKUP_AND_RECOVERY_MANUAL.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Target Database:** Supabase Cloud PostgreSQL 15 / PostGIS 3.3 (`gvnakdxtjjnfcjkcnavz`)  
**Recovery Target Objectives:** RPO $\le 1$ hour | RTO $\le 2$ hours  
**Restoration Verification Status:** **PENDING (Awaiting First Live Institutional Test Drill)**  

---

## 1. Objectives & Recovery Targets

This manual establishes the authoritative disaster recovery protocol for the InternPulse institutional database to ensure zero data loss of student attendance logs, location verification history, and faculty evaluations.

### 1.1 Recovery Objectives:
- **Recovery Point Objective (RPO):** Maximum acceptable data loss window is **$\le 1$ hour**. Achieved through automated daily snapshot backups combined with continuous Write-Ahead Logging (WAL) archiving.
- **Recovery Time Objective (RTO):** Maximum acceptable system downtime to restore the database to an operational state is **$\le 2$ hours**.

---

## 2. Backup Architecture & Encryption Specifications

```
┌─────────────────────────────────┐
│     SUPABASE POSTGRESQL 15      │
│     (Production Cloud DB)       │
└────────────────┬────────────────┘
                 │
                 │ 1. Daily pg_dump Export (02:00 AM IST)
                 ▼
┌─────────────────────────────────┐
│     ENCRYPTION ENGINE (GPG)     │
│     AES-256 Symmetric / RSA     │
└────────────────┬────────────────┘
                 │
                 │ 2. Encrypted TLS 1.3 Transport
                 ▼
┌─────────────────────────────────┐
│    SMVEC INSTITUTIONAL S3 /     │
│    CAMPUS NAS ARCHIVE           │
│    (Owner: IT Administration)   │
└─────────────────────────────────┘
```

### 2.1 Backup Retention Schedule:
- **Hourly Incremental (WAL Archives):** Retained for 7 days (continuous point-in-time recovery).
- **Daily Full Logical Snapshots:** Retained for 30 days.
- **Weekly Full Snapshots:** Retained for 12 weeks (full academic semester).
- **Semester-End Archives:** Retained for 5 years (statutory AICTE / Pondicherry University compliance).

### 2.2 Encryption Standards:
All exported database snapshots must be encrypted at rest using **AES-256** encryption:
```bash
gpg --symmetric --cipher-algo AES256 -o internpulse_backup_$(date +%F).sql.gz.gpg internpulse_backup.sql.gz
```
Encryption keys are managed exclusively in SMVEC IT Administration's institutional password vault (Bitwarden / Doppler), restricted to the Principal, Lead IT Admin, and Database Administrator.

---

## 3. Automated Backup Execution Script

Deploy the following script as a daily cron job on an SMVEC administrative utility host:

```bash
#!/usr/bin/env bash
# ==============================================================================
# InternPulse Automated Database Backup Script
# Sri Manakula Vinayagar Engineering College (SMVEC)
# ==============================================================================
set -euo pipefail

BACKUP_DATE=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="/var/backups/internpulse"
DB_HOST="db.gvnakdxtjjnfcjkcnavz.supabase.co"
DB_PORT="5432"
DB_NAME="postgres"
DB_USER="postgres"
ENCRYPTION_RECIPIENT="itadmin@smvec.ac.in"
S3_BUCKET="s3://smvec-institutional-backups/internpulse/"

mkdir -p "${BACKUP_DIR}"

echo "[INFO] Commencing InternPulse database backup: ${BACKUP_DATE}"

# 1. Execute pg_dump with custom compressed format
PGPASSWORD="${DB_PASSWORD}" pg_dump \
    -h "${DB_HOST}" \
    -p "${DB_PORT}" \
    -U "${DB_USER}" \
    -d "${DB_NAME}" \
    -F c \
    -b \
    -v \
    -f "${BACKUP_DIR}/internpulse_${BACKUP_DATE}.dump"

# 2. Encrypt snapshot with GPG AES-256
gpg --batch --yes --encrypt --recipient "${ENCRYPTION_RECIPIENT}" \
    -o "${BACKUP_DIR}/internpulse_${BACKUP_DATE}.dump.gpg" \
    "${BACKUP_DIR}/internpulse_${BACKUP_DATE}.dump"

# 3. Clean up unencrypted file
rm -f "${BACKUP_DIR}/internpulse_${BACKUP_DATE}.dump"

# 4. Upload to institutional S3 storage
aws s3 cp "${BACKUP_DIR}/internpulse_${BACKUP_DATE}.dump.gpg" "${S3_BUCKET}"

echo "[SUCCESS] InternPulse backup completed and secured: internpulse_${BACKUP_DATE}.dump.gpg"
```

---

## 4. Step-by-Step Restoration & Disaster Recovery Runbook

If a critical database corruption, cloud region failure, or accidental administrative deletion occurs:

### Step 1: Declare Incident & Notify Emergency Contacts
1. Incident Lead: SMVEC Lead Database Administrator.
2. Escalation Authority: Principal / Dean of Academic Operations.
3. Inform stakeholders that a database restoration is commencing; transition web portal to maintenance mode.

### Step 2: Download & Decrypt Backup Snapshot
```bash
# Retrieve latest encrypted snapshot from S3
aws s3 cp s3://smvec-institutional-backups/internpulse/internpulse_latest.dump.gpg .

# Decrypt using institutional private GPG key
gpg --decrypt internpulse_latest.dump.gpg > internpulse_restore.dump
```

### Step 3: Provision Staging / Clean Database Target
Never restore directly over a live corrupted database without backing up the corrupted state for forensic analysis:
```bash
# Terminate existing active connections
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'postgres' AND pid <> pg_backend_pid();
```

### Step 4: Execute Restoration via `pg_restore`
```bash
pg_restore \
    -h "${TARGET_DB_HOST}" \
    -p "${TARGET_DB_PORT}" \
    -U "${DB_USER}" \
    -d postgres \
    --clean \
    --if-exists \
    --no-owner \
    --no-privileges \
    -v \
    internpulse_restore.dump
```

### Step 5: Post-Restoration Data Integrity Verification
Execute the following verification queries to confirm table completeness and RLS integrity:
```sql
-- 1. Verify all 63 tables restored
SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 63

-- 2. Verify Row-Level Security is active on 100% of tables
SELECT count(*) FROM pg_tables WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected: 0

-- 3. Verify SMVEC Root Anchor Subscription is active
SELECT id, institution_id, status, is_grandfathered 
FROM public.institution_subscriptions 
WHERE institution_id = 'a0000000-0000-0000-0000-000000000001';
-- Expected: status = 'ACTIVE', is_grandfathered = true

-- 4. Verify latest student attendance record count matches backup log
SELECT count(*) FROM public.location_verifications;
```

---

## 5. Recovery Verification Status & Testing Schedule

> **Forensic Audit Finding from Phase 19F:**  
> Prior documentation claimed that "Automated daily WAL-G PITR backups were verified". The audit confirmed this was an unverified assumption. No actual recovery drill has been conducted.

### 5.1 Current Status: **PENDING INDEPENDENT TEST DRILL**
- Database backup scripts are documented and tested in mock.
- An end-to-end cloud recovery drill must be scheduled and executed prior to full campus launch.

### 5.2 Scheduled Disaster Recovery Drills:
- **Initial Handover Test Drill:** Scheduled within 14 days of institutional handover.
- **Bi-Annual Routine Drills:** Scheduled at the conclusion of every academic semester (December and May).

