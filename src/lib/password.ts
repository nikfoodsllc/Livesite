import bcrypt from 'bcryptjs';

/**
 * Password validation regex
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one number
 * - At least one special character (!@#$%^&*()_+)
 */
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/;

/**
 * Hash a password using bcrypt
 * @param password - Plain text password
 * @returns Hashed password
 */
export const hashPassword = async function(password: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
};

/**
 * Compare a plain text password with a hashed password
 * @param password - Plain text password
 * @param hashedPassword - Hashed password from database
 * @returns True if passwords match, false otherwise
 */
export const comparePassword = async function(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
};

/**
 * Validate password against requirements
 * @param password - Password to validate
 * @returns True if password meets requirements
 */
export const validatePassword = function(password: string): boolean {
  return PASSWORD_REGEX.test(password);
};

export interface PasswordRequirement {
  label: string;
  check: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    check: (password: string) => password.length >= 8,
  },
  {
    label: 'One uppercase letter',
    check: (password: string) => /[A-Z]/.test(password),
  },
  {
    label: 'One lowercase letter',
    check: (password: string) => /[a-z]/.test(password),
  },
  {
    label: 'One number',
    check: (password: string) => /\d/.test(password),
  },
  {
    label: 'One special character (!@#$%^&*()_+)',
    check: (password: string) => /[!@#$%^&*()_+]/.test(password),
  },
];

