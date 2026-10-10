import bcrypt from 'bcryptjs';

/**
 * Password rule (same in the customer site, the admin and the app):
 * 8 or more characters, any characters allowed, at most 72 bytes
 * (bcrypt ignores everything after 72 bytes). Simple passwords are fine on purpose.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_BYTES = 72;

/** The first thing wrong with a new password, or null when it is fine. */
export const passwordProblem = function(password: string): string | null {
  if (!password || !password.trim()) return 'Password is required';
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_BYTES) {
    return 'Password is too long';
  }
  return null;
};

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
 * Validate password against the rule above
 * @param password - Password to validate
 * @returns True if password meets requirements
 */
export const validatePassword = function(password: string): boolean {
  return passwordProblem(password) === null;
};

export interface PasswordRequirement {
  label: string;
  check: (password: string) => boolean;
}

export const PASSWORD_REQUIREMENTS: PasswordRequirement[] = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    check: (password: string) => password.length >= PASSWORD_MIN_LENGTH,
  },
];
