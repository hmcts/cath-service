const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_FILE_TYPES = new Set(["image/jpeg", "image/png", "application/pdf"]);
const ALLOWED_FILE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".pdf"]);
const MAX_EMAIL_LENGTH = 254; // RFC 5321 maximum
// ReDoS-safe email regex - requires at least one dot in domain
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface ValidationError {
  field: string;
  message: string;
  href: string;
}

export interface FormData {
  fullName: string;
  email: string;
  employer: string;
  termsAccepted: boolean;
}

export interface FileData {
  mimetype: string;
  size: number;
  originalname: string;
}

export function validateFullName(fullName: string | undefined, errorMessage: string): ValidationError | null {
  if (!fullName || fullName.trim().length === 0) {
    return {
      field: "fullName",
      message: errorMessage,
      href: "#fullName"
    };
  }
  if (fullName.trim().length > 100) {
    return {
      field: "fullName",
      message: "Full name must be 100 characters or less",
      href: "#fullName"
    };
  }
  return null;
}

export function validateEmail(email: string | undefined, errorMessage: string): ValidationError | null {
  if (!email || email.trim().length === 0) {
    return {
      field: "email",
      message: errorMessage,
      href: "#email"
    };
  }
  const trimmedEmail = email.trim();
  // Prevent ReDoS by checking length before regex
  if (trimmedEmail.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(trimmedEmail)) {
    return {
      field: "email",
      message: errorMessage,
      href: "#email"
    };
  }
  return null;
}

export function validateEmployer(employer: string | undefined, errorMessage: string): ValidationError | null {
  if (!employer || employer.trim().length === 0) {
    return {
      field: "employer",
      message: errorMessage,
      href: "#employer"
    };
  }
  if (employer.trim().length > 120) {
    return {
      field: "employer",
      message: "Employer must be 120 characters or less",
      href: "#employer"
    };
  }
  return null;
}

export function validateFile(
  file: FileData | undefined,
  errorMessageRequired: string,
  errorMessageType: string,
  errorMessageSize: string
): ValidationError | null {
  if (!file) {
    return {
      field: "idProof",
      message: errorMessageRequired,
      href: "#idProof"
    };
  }

  const fileExtension = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf("."));
  if (!ALLOWED_FILE_TYPES.has(file.mimetype) || !ALLOWED_FILE_EXTENSIONS.has(fileExtension)) {
    return {
      field: "idProof",
      message: errorMessageType,
      href: "#idProof"
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      field: "idProof",
      message: errorMessageSize,
      href: "#idProof"
    };
  }

  return null;
}

export function validateTerms(termsAccepted: boolean | undefined, errorMessage: string): ValidationError | null {
  if (!termsAccepted || termsAccepted !== true) {
    return {
      field: "termsAccepted",
      message: errorMessage,
      href: "#termsAccepted"
    };
  }
  return null;
}

export function validateForm(
  formData: FormData,
  file: FileData | undefined,
  errorMessages: {
    fullName: string;
    email: string;
    employer: string;
    fileRequired: string;
    fileType: string;
    fileSize: string;
    terms: string;
  }
): ValidationError[] {
  const errors: ValidationError[] = [];

  const fullNameError = validateFullName(formData.fullName, errorMessages.fullName);
  if (fullNameError) errors.push(fullNameError);

  const emailError = validateEmail(formData.email, errorMessages.email);
  if (emailError) errors.push(emailError);

  const employerError = validateEmployer(formData.employer, errorMessages.employer);
  if (employerError) errors.push(employerError);

  const fileError = validateFile(file, errorMessages.fileRequired, errorMessages.fileType, errorMessages.fileSize);
  if (fileError) errors.push(fileError);

  const termsError = validateTerms(formData.termsAccepted, errorMessages.terms);
  if (termsError) errors.push(termsError);

  return errors;
}
