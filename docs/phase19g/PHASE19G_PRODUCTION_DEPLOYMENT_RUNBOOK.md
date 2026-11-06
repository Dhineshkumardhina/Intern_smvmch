# INTERNPULSE — PHASE 19G: PRODUCTION DEPLOYMENT RUNBOOK
## Web Application, Mobile App Compilation, Supabase Setup & Rollback Procedures

**Document Reference:** `docs/phase19g/PHASE19G_PRODUCTION_DEPLOYMENT_RUNBOOK.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Target Environments:** React 19 Web Console, Flutter Mobile Application, Supabase Cloud PostgreSQL 15 / PostGIS  
**Production Host Domain:** `internpulse.smvec.ac.in`  
**Operational Status:** **DEPLOYMENT INSTRUCTIONS DOCUMENTED (Live Production Deployment Pending Institutional Sign-Off)**  

---

## 1. Web Application Deployment Runbook

### 1.1 Prerequisites & Hosting Requirements:
- **Node.js:** v20.x LTS or v22.x LTS.
- **Package Manager:** npm v10.x.
- **Recommended Host:** Linux Ubuntu 22.04 LTS VM or Containerized Web Service (AWS ECS, DigitalOcean App Platform, or College Private Cloud).
- **RAM / CPU:** Minimum 1 vCPU, 2 GB RAM for production web serving.

### 1.2 Production Environment Variables (`.env.production`):
Create `InternPulse-main/.env.production` with institutional values:
```bash
# Supabase Configuration
VITE_SUPABASE_URL="https://gvnakdxtjjnfcjkcnavz.supabase.co"
VITE_SUPABASE_ANON_KEY="<SMVEC_PRODUCTION_ANON_KEY>"

# Institutional Application URL
APP_URL="https://internpulse.smvec.ac.in"

# Deployment Environment
NODE_ENV="production"
```
> **Security Warning:** Never place `SUPABASE_SERVICE_ROLE_KEY` or database master passwords in the web application `.env` file!

### 1.3 Web Build Procedure:
1. Navigate to the application root:
   ```bash
   cd InternPulse-main
   ```
2. Clean existing build artifacts and install frozen dependencies:
   ```bash
   npm ci
   ```
3. Execute production static compilation:
   ```bash
   npm run build
   ```
4. Verify build artifacts in `dist/`:
   ```bash
   ls -la dist/
   # dist/index.html (Entrypoint)
   # dist/assets/index-*.js (JavaScript Bundle)
   # dist/assets/index-*.css (Tailwind CSS)
   ```

### 1.4 Web Server Configuration (Nginx SPA Reverse Proxy):
Deploy the following Nginx virtual host configuration (`/etc/nginx/sites-available/internpulse`):
```nginx
server {
    listen 80;
    server_name internpulse.smvec.ac.in;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name internpulse.smvec.ac.in;

    ssl_certificate /etc/letsencrypt/live/internpulse.smvec.ac.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/internpulse.smvec.ac.in/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    root /var/www/internpulse/dist;
    index index.html;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Gzip Compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;

    # Single Page Application (SPA) Routing Fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Static Asset Caching
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Health Check Endpoint
    location /healthz {
        access_log off;
        return 200 '{"status":"HEALTHY","version":"1.0.0"}';
        add_header Content-Type application/json;
    }
}
```

### 1.5 Web Rollback Procedure:
If a critical defect is identified post-deployment:
1. Maintain previous release symlinks:
   ```bash
   ln -sfn /var/www/internpulse_releases/release_previous /var/www/internpulse/dist
   ```
2. Reload Nginx without downtime:
   ```bash
   sudo systemctl reload nginx
   ```
3. Verify `/healthz` returns `HTTP 200`.

---

## 2. Flutter Mobile Application Deployment Runbook

> **Critical Notice from Phase 19F Audit:**  
> The Flutter application currently requires **native scaffolding regeneration** and **hardware plugin installation** before it can compile. The following runbook details the prerequisites and compilation steps required for release.

### 2.1 Native Scaffolding Prerequisite:
1. Navigate to `InternPulse-main`:
   ```bash
   cd InternPulse-main
   ```
2. Re-scaffold the missing native platform projects:
   ```bash
   flutter create --org com.smvec --project-name internpulse .
   ```
3. Add the missing hardware packages to `pubspec.yaml`:
   ```bash
   flutter pub add geolocator safe_device firebase_core firebase_messaging flutter_local_notifications workmanager
   ```

### 2.2 Android Release Build & Signing:
1. Generate SMVEC institutional keystore:
   ```bash
   keytool -genkey -v -keystore smvec-internpulse-release.jks -keyalg RSA -keysize 2048 -validity 10000 -alias smvec-release
   ```
2. Create `android/key.properties` (secured in CI secrets, never committed to git):
   ```properties
   storePassword=<SECURE_KEYSTORE_PASSWORD>
   keyPassword=<SECURE_KEY_PASSWORD>
   keyAlias=smvec-release
   storeFile=/path/to/smvec-internpulse-release.jks
   ```
3. Build Android App Bundle (AAB) for Google Play:
   ```bash
   flutter build appbundle --release
   # Output: build/app/outputs/bundle/release/app-release.aab
   ```
4. Build Universal APK for direct college side-loading:
   ```bash
   flutter build apk --release --split-per-abi
   # Output: build/app/outputs/flutter-apk/app-arm64-v8a-release.apk
   ```

### 2.3 Android Runtime Permissions Declarations:
In `android/app/src/main/AndroidManifest.xml`:
- `ACCESS_FINE_LOCATION` & `ACCESS_COARSE_LOCATION` (Geofence verification).
- `ACCESS_BACKGROUND_LOCATION` (Periodic shift verification).
- `FOREGROUND_SERVICE` & `FOREGROUND_SERVICE_LOCATION` (Active shift banner).
- `RECEIVE_BOOT_COMPLETED` (Reschedule windows after phone restart).

---

## 3. Supabase Cloud Infrastructure Deployment Runbook

### 3.1 Initial Cloud Database Setup:
1. Create a PostgreSQL 15 database instance on Supabase Cloud.
2. Enable PostGIS Extension via SQL Editor:
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis SCHEMA extensions;
   ```

### 3.2 Executing Migrations in Strict Sequence:
Execute the 24 sequential migration files located in `supabase/migrations/`:
```bash
# Using Supabase CLI
supabase db push
```
Or execute sequentially via SQL Editor from `20261105000001` through `20261106000024`.

### 3.3 Verifying Row-Level Security (RLS):
Execute the following verification query to ensure 100% of tables have RLS enabled:
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' AND rowsecurity = false;
-- Expected Result: 0 rows (All tables must return rowsecurity = true)
```

### 3.4 Deploying the Background Scheduler Cron (`pg_cron`):
To enable automated window expiration and state transitions:
```sql
-- Enable pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule window processor to execute every 60 seconds
SELECT cron.schedule(
    'internpulse-window-transitions',
    '* * * * *',
    $$SELECT public.process_window_transitions(timezone('utc', now()));$$
);

-- Schedule daily schedule generator to execute every midnight at 00:05 AM IST (18:35 UTC)
SELECT cron.schedule(
    'internpulse-daily-schedule-generator',
    '35 18 * * *',
    $$SELECT public.generate_daily_verification_schedules(CURRENT_DATE);$$
);
```

### 3.5 Storage Buckets & Policies:
Verify storage buckets exist with private permissions:
- `student-documents` (Private, max 10MB)
- `reports` (Private, max 50MB)
- `avatars` (Private, max 5MB)
Ensure storage RLS policy enforces `{institution_id}/*` prefix access.

---

## 4. Production Smoke Test & Health Check Checklist

Following deployment, execute the following operational checks:

- [ ] **Smoke Test 1 (DNS & SSL):** Navigate to `https://internpulse.smvec.ac.in`. Confirm browser displays valid green lock (TLS 1.3).
- [ ] **Smoke Test 2 (Health Endpoint):** Request `GET /healthz`. Confirm `HTTP 200 {"status":"HEALTHY"}`.
- [ ] **Smoke Test 3 (HOD Login):** Log in as IT Department HOD (`saravanan.hod@smvec.ac.in`). Confirm IT dashboard renders with 9 department selector.
- [ ] **Smoke Test 4 (Location Geofence):** Create a test location (e.g. TCS Siruseri, radius 100m). Confirm PostGIS geography point saves cleanly in database.
- [ ] **Smoke Test 5 (Mentor Allocation):** Assign a test student to an active internship. Confirm assignment status changes to `active`.
- [ ] **Smoke Test 6 (RLS Verification):** Attempt to query another department's student as an unauthorized HOD. Confirm request returns 0 rows.

