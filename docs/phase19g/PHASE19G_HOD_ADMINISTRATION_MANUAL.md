# INTERNPULSE — PHASE 19G: HOD ADMINISTRATION MANUAL
## Operational Guide for Academic Department Heads (9 SMVEC Engineering Departments)

**Document Reference:** `docs/phase19g/PHASE19G_HOD_ADMINISTRATION_MANUAL.md`  
**Governing Institution:** Sri Manakula Vinayagar Engineering College (Autonomous), Puducherry  
**Applicable Departments:** IT, ECE, EEE, MECH, CIVIL, BME, MECT, ICE, CSEBS  
**Console View:** [`HodDashboard.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/HodDashboard.tsx), [`HodLocationManagementView.tsx`](file:///c:/PROJECTS/bose%20projects/Intern_smvmch/Intern_smvmch/InternPulse-main/src/components/locations/HodLocationManagementView.tsx)  
**Access Role Required:** `hod`  

---

## 1. Overview of HOD Responsibilities

As an Academic Department Head at SMVEC, you hold overall operational authority over your department's internship programs. The HOD console enables you to:
1. Approve and manage verified host company locations and geofence perimeters.
2. Oversee faculty mentors and reallocate student cohorts.
3. Monitor daily student attendance, geofence compliance, and safety exceptions.
4. Export accredited internship reports for AICTE, NAAC, and Pondicherry University audits.

---

## 2. Accessing the HOD Console

1. Navigate to `https://internpulse.smvec.ac.in` in your web browser.
2. Sign in using your official SMVEC institutional email (e.g. `saravanan.hod@smvec.ac.in` or `auxilia.hod@smvec.ac.in`) and password.
3. Upon authentication, the system automatically redirects you to the **HOD Departmental Governance Console** (`/hod/dashboard`).
4. In the top banner, verify that your Department Badge (e.g., **INFORMATION TECHNOLOGY DEPARTMENT**) and HOD name are displayed.

---

## 3. Managing Internship Locations & Geofence Perimeters

All student internship attendance must be tied to an HOD-approved location with certified GPS coordinates and a geofence radius.

### 3.1 Viewing Department Locations:
- Click the **📍 Locations** tab in the top navigation bar.
- The view displays all active company locations, physical street addresses, assigned geofence radii, operating shift hours, and the number of active interns at each site.

### 3.2 Creating a New Approved Location:
1. Click the **"+ Add Location"** button in the top right corner.
2. In the modal, fill in the required fields:
   - **Location / Facility Name:** e.g. `TCS Siruseri Innovation Hub` or `Zoho Estancia Campus`.
   - **Company / Host Organization:** e.g. `Tata Consultancy Services`.
   - **Street Address:** Physical street, building name, city, state, postal code.
   - **GPS Coordinates (Latitude & Longitude):** Enter exact decimal coordinates (e.g., `12.8284` Latitude, `80.2198` Longitude).
   - **Geofence Radius (Meters):** Select or enter a radius between **50 meters** (compact office) and **5,000 meters** (large industrial park).
   - **Operating Shift Hours:** Define authorized work shift (e.g., `08:30` to `17:30`). *Anti-Surveillance Protection:* Telemetry collection is strictly locked to these hours.
3. Click **"Save Approved Location"**. The location is immediately available for faculty mentors to assign to students.

---

## 4. Managing Faculty Mentors & Student Cohorts

### 4.1 Viewing Department Mentors:
- Click the **👨‍🏫 Mentors** tab.
- The roster lists all faculty mentors in your department, their assigned mentee counts, and active internship progress rates.

### 4.2 Reassigning a Student Cohort to a New Mentor:
1. If a faculty mentor is on leave, deputed, or transitioning:
2. Select the student or cohort from the student roster.
3. Click **"Reassign Mentor"**.
4. Select the replacement faculty mentor from the dropdown list of active departmental mentors.
5. Click **"Confirm Transfer"**. The student's dashboard and review logs immediately route to the new mentor.

---

## 5. Reviewing Attendance & Verification Results

### 5.1 Monitoring Departmental Attendance:
- On the **📊 Overview** tab, review real-time KPI metrics:
  - **Total Interns:** Total students currently registered.
  - **Active in Shift:** Students who have checked in today.
  - **Average Attendance Rate:** Departmental attendance percentage.
  - **Verification Exceptions:** Alerts requiring review.

### 5.2 Understanding the 8 Verification Result States:
When reviewing student geofence verification records:
- **`WITHIN_GEOFENCE` (Green):** Student verified inside the assigned geofence during authorized hours. Attendance confirmed.
- **`OUTSIDE_GEOFENCE` (Red):** Student verified outside the geofence during shift hours with valid GPS accuracy. Requires mentor inquiry.
- **`LOCATION_UNAVAILABLE` (Yellow):** Mock GPS detected, sensor fault, or permission blocked. Non-penalizing technical state.
- **`LOW_ACCURACY` (Orange):** GPS signal drift $>65$m due to indoor building attenuation. System automatically allows in-shift retry.
- **`PERMISSION_DENIED` (Gray):** Verification attempted outside authorized shift hours or student consent revoked. Anti-surveillance safe state.

---

## 6. Generating Institutional Reports & Audit Exports

1. Click the **📑 Reports** tab.
2. Select the report scope:
   - **Full Department Internship Registry:** Complete list of all students, companies, mentors, and progress percentages.
   - **Attendance Compliance Audit:** Date-range attendance records, present days, hours logged, and verification summaries.
   - **At-Risk Interventions:** Students with attendance $<75\%$ or unassigned mentors.
3. Click **"Export CSV"** for spreadsheet analysis or **"Print Institutional Report"** for an accredited PDF-ready layout featuring official SMVEC headers and HOD signature blocks.

