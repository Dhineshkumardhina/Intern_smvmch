import { StudentRecord } from '../../data/initialData';

export interface ValidatedStudentRow {
  rowNumber: number;
  studentId: string; // Register Number
  studentName: string;
  email: string;
  phone: string;
  departmentCode: string;
  academicYear: string;
  company?: string;
  role?: string;
  accountStatus: 'active' | 'inactive' | 'suspended' | 'pending_approval';
  mentor?: string;
  mentorId?: string;
}

export interface InvalidStudentRow {
  rowNumber: number;
  rawLine: string;
  data: Record<string, string>;
  errors: string[];
}

export interface CsvValidationResult {
  isValid: boolean;
  totalRows: number;
  validRows: ValidatedStudentRow[];
  invalidRows: InvalidStudentRow[];
  errorsSummary: string[];
  duplicateRegNosCount: number;
  duplicateEmailsCount: number;
  headerErrors: string[];
}

// Canonical header aliases
const HEADER_MAP: Record<string, keyof ValidatedStudentRow | 'company' | 'role' | 'mentor'> = {
  // Register Number
  'registernumber': 'studentId',
  'register_number': 'studentId',
  'registerno': 'studentId',
  'reg_no': 'studentId',
  'regno': 'studentId',
  'studentid': 'studentId',
  'student_id': 'studentId',
  'rollno': 'studentId',
  'roll_no': 'studentId',

  // Name
  'name': 'studentName',
  'studentname': 'studentName',
  'student_name': 'studentName',
  'fullname': 'studentName',
  'full_name': 'studentName',

  // Email
  'email': 'email',
  'studentemail': 'email',
  'student_email': 'email',
  'emailaddress': 'email',
  'email_address': 'email',

  // Phone
  'phone': 'phone',
  'phonenumber': 'phone',
  'phone_number': 'phone',
  'mobile': 'phone',
  'mobilenumber': 'phone',
  'contact': 'phone',

  // Department
  'department': 'departmentCode',
  'dept': 'departmentCode',
  'departmentcode': 'departmentCode',
  'department_code': 'departmentCode',
  'branch': 'departmentCode',

  // Academic Year
  'academicyear': 'academicYear',
  'academic_year': 'academicYear',
  'year': 'academicYear',

  // Host Company
  'company': 'company',
  'hostcompany': 'company',
  'host_company': 'company',
  'organization': 'company',

  // Role
  'role': 'role',
  'internshiprole': 'role',
  'internship_role': 'role',
  'title': 'role',
  'jobtitle': 'role',

  // Account Status
  'accountstatus': 'accountStatus',
  'account_status': 'accountStatus',
  'status': 'accountStatus',

  // Mentor
  'mentor': 'mentor',
  'mentorname': 'mentor',
  'facultymentor': 'mentor',
};

const REQUIRED_CANONICAL_FIELDS = ['studentId', 'studentName', 'email', 'phone', 'departmentCode', 'academicYear'] as const;

export class CsvImportValidator {
  /**
   * Parses raw CSV text into rows, handling quotes, escapes, and delimiters.
   */
  public static parseCsv(csvText: string): string[][] {
    const lines: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let insideQuotes = false;

    const text = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // skip escaped quote
        } else {
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        currentCell = '';
      } else if (char === '\n' && !insideQuotes) {
        currentRow.push(currentCell.trim());
        // Only push non-empty lines
        if (currentRow.some(c => c.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell.length > 0 || currentRow.length > 0) {
      currentRow.push(currentCell.trim());
      if (currentRow.some(c => c.length > 0)) {
        lines.push(currentRow);
      }
    }

    return lines;
  }

  /**
   * Validates parsed CSV content against institutional rules, mentor department scope,
   * in-file duplicates, and existing database duplicates.
   */
  public static validate(
    csvText: string,
    authorizedDepartment: string,
    existingStudents: StudentRecord[],
    defaultMentorName = 'Faculty Mentor',
    defaultMentorId = 'MENTOR_001'
  ): CsvValidationResult {
    const parsedRows = this.parseCsv(csvText);

    const headerErrors: string[] = [];
    const errorsSummary: string[] = [];
    const validRows: ValidatedStudentRow[] = [];
    const invalidRows: InvalidStudentRow[] = [];

    if (parsedRows.length === 0) {
      headerErrors.push('CSV file is empty. Please provide headers and at least one student data row.');
      return {
        isValid: false,
        totalRows: 0,
        validRows: [],
        invalidRows: [],
        errorsSummary: ['CSV file is empty.'],
        duplicateRegNosCount: 0,
        duplicateEmailsCount: 0,
        headerErrors,
      };
    }

    // 1. Validate Headers
    const rawHeaders = parsedRows[0];
    const headerMapping: Array<{ index: number; field: string; raw: string }> = [];
    const detectedFields = new Set<string>();

    rawHeaders.forEach((h, idx) => {
      const cleanKey = h.toLowerCase().replace(/[^a-z0-9_]/g, '');
      const mapped = HEADER_MAP[cleanKey];
      if (mapped) {
        headerMapping.push({ index: idx, field: mapped, raw: h });
        detectedFields.add(mapped);
      }
    });

    const missingFields: string[] = [];
    REQUIRED_CANONICAL_FIELDS.forEach(req => {
      if (!detectedFields.has(req)) {
        missingFields.push(req);
      }
    });

    if (missingFields.length > 0) {
      const readable = missingFields.map(f => {
        switch (f) {
          case 'studentId': return 'Register Number (student_id)';
          case 'studentName': return 'Student Name (name)';
          case 'email': return 'Email (email)';
          case 'phone': return 'Phone Number (phone)';
          case 'departmentCode': return 'Department (dept)';
          case 'academicYear': return 'Academic Year (year)';
          default: return f;
        }
      });
      headerErrors.push(`Missing required CSV column(s): ${readable.join(', ')}`);
      return {
        isValid: false,
        totalRows: parsedRows.length - 1,
        validRows: [],
        invalidRows: [],
        errorsSummary: headerErrors,
        duplicateRegNosCount: 0,
        duplicateEmailsCount: 0,
        headerErrors,
      };
    }

    // Maps to track in-file duplicates
    const inCsvRegNos = new Map<string, number>(); // regNo -> rowNumber
    const inCsvEmails = new Map<string, number>(); // email -> rowNumber

    // Set of existing DB values for quick lookup
    const existingRegNos = new Map<string, string>(); // regNo -> studentName
    const existingEmails = new Map<string, string>(); // email -> studentName

    existingStudents.forEach(st => {
      if (st.studentId) existingRegNos.set(st.studentId.trim().toLowerCase(), st.studentName);
      if (st.email) existingEmails.set(st.email.trim().toLowerCase(), st.studentName);
    });

    let duplicateRegNosCount = 0;
    let duplicateEmailsCount = 0;

    const normMentorDept = authorizedDepartment.trim().toUpperCase();

    // 2. Validate Rows (Starting from line 2)
    for (let r = 1; r < parsedRows.length; r++) {
      const row = parsedRows[r];
      const rowNumber = r + 1; // 1-indexed including header
      const rowErrors: string[] = [];
      const rowObj: Record<string, string> = {};

      headerMapping.forEach(hm => {
        rowObj[hm.field] = (row[hm.index] || '').trim();
      });

      const studentId = (rowObj.studentId || '').trim();
      const studentName = (rowObj.studentName || '').trim();
      const email = (rowObj.email || '').trim().toLowerCase();
      const phone = (rowObj.phone || '').trim();
      const dept = (rowObj.departmentCode || '').trim().toUpperCase();
      const academicYear = (rowObj.academicYear || '').trim();
      const company = (rowObj.company || '').trim() || 'Unassigned';
      const role = (rowObj.role || '').trim() || 'Intern';
      const rawStatus = (rowObj.accountStatus || '').trim().toLowerCase();
      const mentor = (rowObj.mentor || '').trim() || defaultMentorName;

      // Field: Register Number
      if (!studentId) {
        rowErrors.push('Register Number is required.');
      } else {
        if (!/^[a-zA-Z0-9_\-]+$/.test(studentId)) {
          rowErrors.push(`Invalid Register Number format: '${studentId}'. Must be alphanumeric.`);
        }
        const lowerReg = studentId.toLowerCase();
        // In-file duplicate check
        if (inCsvRegNos.has(lowerReg)) {
          duplicateRegNosCount++;
          rowErrors.push(
            `Duplicate Register Number in CSV: '${studentId}' was already declared in Row ${inCsvRegNos.get(lowerReg)}.`
          );
        } else {
          inCsvRegNos.set(lowerReg, rowNumber);
        }

        // Database duplicate check
        if (existingRegNos.has(lowerReg)) {
          rowErrors.push(
            `Register Number '${studentId}' already exists in database (Student: ${existingRegNos.get(lowerReg)}). Duplicates are prevented.`
          );
        }
      }

      // Field: Student Name
      if (!studentName) {
        rowErrors.push('Student Name is required.');
      } else if (studentName.length < 2) {
        rowErrors.push('Student Name must contain at least 2 characters.');
      }

      // Field: Email Address
      if (!email) {
        rowErrors.push('Email address is required.');
      } else {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          rowErrors.push(`Invalid email format: '${email}'.`);
        }
        // In-file duplicate check
        if (inCsvEmails.has(email)) {
          duplicateEmailsCount++;
          rowErrors.push(
            `Duplicate Email in CSV: '${email}' was already declared in Row ${inCsvEmails.get(email)}.`
          );
        } else {
          inCsvEmails.set(email, rowNumber);
        }

        // Database duplicate check
        if (existingEmails.has(email)) {
          rowErrors.push(
            `Email '${email}' is already registered in database (Student: ${existingEmails.get(email)}). Duplicates are prevented.`
          );
        }
      }

      // Field: Phone Number
      if (!phone) {
        rowErrors.push('Phone Number is required.');
      } else {
        const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
        if (cleanPhone.length < 7 || cleanPhone.length > 15 || !/^\d+$/.test(cleanPhone)) {
          rowErrors.push(`Invalid Phone Number format: '${phone}'. Must contain 7 to 15 digits.`);
        }
      }

      // Field: Department (Strict Mentor Scope Enforcement)
      if (!dept) {
        rowErrors.push('Department code is required.');
      } else if (normMentorDept && dept !== normMentorDept && normMentorDept !== 'ALL') {
        rowErrors.push(
          `Unauthorized Department: Student belongs to '${dept}', but your authorized scope is restricted to '${normMentorDept}'. Mentors cannot import students across departments.`
        );
      }

      // Field: Academic Year
      let normYear = '3rd Year';
      if (!academicYear) {
        rowErrors.push('Academic Year is required (e.g., 1st Year, 2nd Year, 3rd Year, 4th Year).');
      } else {
        const lowerYr = academicYear.toLowerCase();
        if (lowerYr.includes('1') || lowerYr.includes('first')) normYear = '1st Year';
        else if (lowerYr.includes('2') || lowerYr.includes('second')) normYear = '2nd Year';
        else if (lowerYr.includes('3') || lowerYr.includes('third')) normYear = '3rd Year';
        else if (lowerYr.includes('4') || lowerYr.includes('fourth') || lowerYr.includes('final')) normYear = '4th Year';
        else normYear = academicYear;
      }

      // Field: Account Status
      let accountStatus: 'active' | 'inactive' | 'suspended' | 'pending_approval' = 'active';
      if (rawStatus === 'inactive' || rawStatus === 'deactivated') accountStatus = 'inactive';
      else if (rawStatus === 'suspended') accountStatus = 'suspended';
      else if (rawStatus === 'pending' || rawStatus === 'pending_approval') accountStatus = 'pending_approval';

      if (rowErrors.length > 0) {
        invalidRows.push({
          rowNumber,
          rawLine: row.join(','),
          data: rowObj,
          errors: rowErrors,
        });
        errorsSummary.push(`Row ${rowNumber}: ${rowErrors.join(' | ')}`);
      } else {
        validRows.push({
          rowNumber,
          studentId,
          studentName,
          email,
          phone,
          departmentCode: dept,
          academicYear: normYear,
          company,
          role,
          accountStatus,
          mentor,
          mentorId: defaultMentorId,
        });
      }
    }

    return {
      isValid: invalidRows.length === 0 && validRows.length > 0,
      totalRows: parsedRows.length - 1,
      validRows,
      invalidRows,
      errorsSummary,
      duplicateRegNosCount,
      duplicateEmailsCount,
      headerErrors,
    };
  }

  /**
   * Generates a pre-filled sample CSV template customized for the mentor's department.
   */
  public static generateSampleCsv(departmentCode: string): string {
    const dept = (departmentCode || 'CSEBS').toUpperCase();
    return [
      'Register Number,Student Name,Email,Phone,Department,Academic Year,Host Company,Role,Account Status',
      `23${dept}101,Aakash Raman,23${dept.toLowerCase()}101@college.edu,+91 98401 11223,${dept},3rd Year,Tata Consultancy Services,Software Engineer Intern,active`,
      `23${dept}102,Bhavani Selvam,23${dept.toLowerCase()}102@college.edu,+91 98401 22334,${dept},3rd Year,Zoho Corporation,Cloud Operations Intern,active`,
      `23${dept}103,Chandran Nathan,23${dept.toLowerCase()}103@college.edu,+91 98401 33445,${dept},4th Year,Cognizant Technology Solutions,QA Analyst Intern,active`,
    ].join('\n');
  }
}

