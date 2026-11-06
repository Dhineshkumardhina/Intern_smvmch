# INTERNPULSE — PHASE 19G: FACULTY MENTOR USER MANUAL
## Operational Guide for Departmental Faculty Mentors

**Document Reference:** `docs/phase19g/PHASE19G_MENTOR_USER_MANUAL.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Target User Role:** Departmental Faculty Mentor (`mentor`)  
**Console View:** [`MentorDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/MentorDashboard.tsx), [`MentorStudentManagementView.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/mentor/MentorStudentManagementView.tsx)  

---

## 1. Overview of Mentor Responsibilities

As an SMVEC Faculty Mentor, you are the primary academic liaison for your assigned student interns. Your core responsibilities include:
1. Onboarding students and reviewing student registration details.
2. Assigning students to HOD-approved internship locations and setting work shift schedules.
3. Reviewing and approving daily student work logs, logged hours, and blocker alerts.
4. Monitoring student geofence verification results and investigating technical discrepancies.

---

## 2. Accessing the Mentor Dashboard

1. Navigate to `https://internpulse.smvec.ac.in`.
2. Sign in with your official faculty credentials (e.g. `anitha.mentor@smvec.ac.in` or Mentor ID `MENTOR_CSEBS_01`).
3. Upon authentication, you will be directed to the **Faculty Mentor Console** (`/mentor/dashboard`).
4. The dashboard displays your assigned mentees, active internship stats, pending work log reviews, and today's check-in status.

---

## 3. Onboarding & Importing Students

### 3.1 Single Student Onboarding:
1. On the **Students** tab, click **"+ Onboard Student"**.
2. Enter the student's Register Number (e.g. `23IT001`), Student Full Name, Email, Phone, and Academic Year (e.g. `3rd Year`).
3. Click **"Save & Allocate"**. The student record is created and linked to your mentorship roster.

### 3.2 Bulk CSV Student Import:
1. Click **"Bulk Import CSV"**.
2. Download the official CSV template or paste your spreadsheet data with headers:
   ```csv
   Register Number,Student Name,Email,Phone,Department,Academic Year
   23IT001,Arunmozhi Varman,23it001@smvec.ac.in,9840122334,IT,3rd Year
   23IT002,Bhuvaneshwari K,23it002@smvec.ac.in,9840122335,IT,3rd Year
   ```
3. Click **"Preview Validation"**. The system checks for duplicate register numbers, valid emails, and department matching.
4. Click **"Execute Import"**. All valid rows are provisioned in a single batch.

---

## 4. Assigning Internship Locations & Schedules

Every student must have an active assignment linked to an HOD-approved location before geofence verification begins.

### 4.1 Creating an Internship Assignment:
1. In your mentee list, locate the student and click **"Assign Internship"**.
2. Select the **Host Organization / Company** from the HOD-approved location catalog (e.g. `TCS Siruseri Innovation Hub`).
3. Enter the **Job / Internship Role Title** (e.g. `Full Stack Intern` or `IoT Embedded Trainee`).
4. Set the **Internship Duration**:
   - **Start Date:** Calendar date when internship commences.
   - **End Date:** Calendar date when internship concludes.
5. Set the **Daily Shift Schedule**:
   - **Required Daily Hours:** Standard 8 hours (or as approved).
   - **Monitoring Window:** Shift start (e.g. `08:30`) and shift end (e.g. `17:30`).
6. Click **"Confirm Assignment"**. The student receives an in-app notification and their dashboard transitions to active status.

---

## 5. Reviewing Daily Work Logs & Student Hours

Students submit a daily work log describing tickets resolved, modules deployed, and technical blockers encountered.

### 5.1 Reviewing and Approving a Log:
1. On the **Daily Logs** panel, review entries submitted by your mentees for the current date.
2. Read the student's log description, logged hours, and reported blockers.
3. Select an evaluation status:
   - **`Approved`:** Log is verified; student receives full credit for logged hours.
   - **`Needs Clarification`:** Mentor provides feedback requesting the student expand on blockers or tasks.
   - **`Rejected`:** Unsubstantiated log or duplicate submission.
4. Enter optional **Faculty Feedback / Guidance** and click **"Submit Review"**.

---

## 6. Monitoring Geofence Attendance & Handling Exceptions

### 6.1 Reviewing Geofence Verification Results:
Under the **Attendance & Verification** tab, review the automated presence checks:
- **Green (`WITHIN_GEOFENCE`):** Attendance verified within the assigned geofence during active work hours.
- **Red (`OUTSIDE_GEOFENCE`):** Student checked in or was verified outside the approved geofence perimeter. Contact the student to confirm whether they were dispatched on field duty or client travel.

### 6.2 Handling Technical Exceptions (Non-Penalizing Safety Rule):
- If a student's verification displays **`LOCATION_UNAVAILABLE`**, **`GPS_DISABLED`**, or **`LOW_ACCURACY`**:
  1. This represents a technical sensor, building shielding, or network connectivity issue.
  2. **Do not** immediately mark the student as absent or disciplinary.
  3. Review the student's manual check-in note or contact the student to confirm their physical presence at the workplace.
  4. Mentors possess administrative authority to manually verify attendance by clicking **"Mark Verified (Faculty Override)"** and entering an audit explanation (e.g. *"Student present at indoor basement lab; cellular GPS attenuated"*).

