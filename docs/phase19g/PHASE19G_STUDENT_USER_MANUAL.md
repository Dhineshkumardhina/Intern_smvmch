# INTERNPULSE — PHASE 19G: STUDENT INTERN USER MANUAL
## Step-by-Step Operational Guide for Student Interns

**Document Reference:** `docs/phase19g/PHASE19G_STUDENT_USER_MANUAL.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Target User Role:** Student Intern (`student`)  
**Portal View:** [`StudentDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/StudentDashboard.tsx)  

---

## 1. Overview of Student Workflow

InternPulse allows SMVEC engineering students to maintain accredited internship records, verify physical workplace presence during work hours, submit daily progress logs to faculty mentors, and track attendance toward Pondicherry University degree credits.

---

## 2. Signing In & Account Setup

1. Open your web browser or mobile browser and navigate to `https://internpulse.smvec.ac.in`.
2. Enter your SMVEC Student Register Number (e.g. `23IT001`) or official student email (e.g. `23it001@smvec.ac.in`).
3. Enter your password and click **"Sign In"**.
4. If this is your first time signing in:
   - Complete your profile with your full name, phone number, and academic department.
   - Review and accept the **Informed Consent & Privacy Notice**.

---

## 3. Understanding Your Informed Consent & Privacy Rights

### 3.1 Your Statutory Privacy Protections:
- **Shift Hours Only:** InternPulse **only** queries your physical location during your authorized internship work shift (e.g. 08:30 to 17:30).
- **No 24/7 Surveillance:** The application **never** tracks you before your shift starts, after your shift ends, on weekends, or during holidays.
- **Data Minimization:** Coordinates are securely encrypted and truncated; breadcrumb tracking trails are prohibited.

### 3.2 Managing or Withdrawing Consent:
- You have the statutory right under India's Digital Personal Data Protection (DPDP) Act 2023 to withdraw location consent at any time.
- In your profile settings, locate **"Location Consent Settings"**.
- Toggling consent OFF immediately halts all location queries.
- *Note:* If consent is withdrawn, automated presence verification cannot proceed; you must submit manual work logs and obtain faculty mentor physical sign-off for attendance credit.

---

## 4. Daily Internship Workflow: Check-In & Check-Out

### 4.1 Daily Check-In:
1. Upon arriving at your assigned host company workplace, log in to your dashboard.
2. In the **Attendance Action Card**, verify your assigned location (e.g. `TCS Siruseri Innovation Hub`).
3. When prompted, allow browser / device location permissions.
4. Click **"Punch In (Check-In)"**.
5. The system verifies that your current location matches the approved geofence perimeter and records your check-in timestamp.

### 4.2 Responding to Verification Windows:
1. During your shift, the server schedules randomized presence verification checks (typically 5 windows per day).
2. You will receive an in-app alert stating **"Verification Window Open"**.
3. You have a **15-minute window** to confirm your presence by tapping **"Verify Current Presence"**.
4. Once verified, the window marks `WITHIN_GEOFENCE` (Attendance Confirmed).

### 4.3 Daily Check-Out:
1. At the conclusion of your work shift, click **"Punch Out (Check-Out)"**.
2. The system records your shift conclusion timestamp and calculates total logged shift hours.

---

## 5. Submitting Daily Work Logs

At the end of each work day, you must submit a brief summary of your technical tasks:
1. On the **Daily Progress Log** panel:
2. In the **Work Completed Today** text area, describe:
   - Features coded, test cases executed, hardware circuits tested, or client meetings attended.
3. Enter **Logged Hours** (standard: 8 hours).
4. If you encountered technical delays, select **"Report Blocker"** and describe the issue (e.g. *"Awaiting AWS credentials from host team"*).
5. Click **"Submit Daily Log"**. Your faculty mentor receives the log for review and approval.

---

## 6. Reviewing Your Attendance & Progress Metrics

- In the top KPI metrics bar:
  - **Overall Attendance Rate:** Your verified attendance percentage (Minimum 75% required for AICTE/University credit).
  - **Total Hours Logged:** Cumulative internship hours accrued.
  - **Log Approval Status:** Displays whether your logs have been verified by your faculty mentor.

---

## 7. Reporting Technical Problems or GPS Drift

If you experience GPS inaccuracies, building shielding attenuation, or technical glitches:
1. If your verification fails due to indoor concrete shielding, the system displays **`LOW_ACCURACY`** or **`LOCATION_UNAVAILABLE`**.
2. **Do not panic:** Under SMVEC's Non-Penalizing Safety Rule, technical sensor failures **are never treated as an unexcused absence**.
3. Step near an exterior window or building entrance and click **"Retry Verification"**.
4. If technical problems persist, click **"Report Technical Issue"** to notify your faculty mentor directly with an explanation.

