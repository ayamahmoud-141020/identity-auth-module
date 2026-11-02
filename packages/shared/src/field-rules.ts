/**
 * Single source of truth for field rules.
 * Consumed by: web forms (zodResolver), API request validation (Zod pipe),
 * domain value objects (invariants), and Swagger metadata.
 */
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 100;

export const EMAIL_MAX_LENGTH = 254;

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const PASSWORD_HAS_LETTER = /\p{L}/u;
export const PASSWORD_HAS_NUMBER = /\d/;
export const PASSWORD_HAS_SPECIAL = /[^\p{L}\d\s]/u;

export interface PasswordRule {
  readonly id: 'minLength' | 'letter' | 'number' | 'special';
  readonly label: string;
  readonly test: (password: string) => boolean;
}

/** Ordered list used both for validation messages and the live UI checklist. */
export const PASSWORD_RULES: readonly PasswordRule[] = [
  {
    id: 'minLength',
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (p) => p.length >= PASSWORD_MIN_LENGTH,
  },
  { id: 'letter', label: 'At least one letter', test: (p) => PASSWORD_HAS_LETTER.test(p) },
  { id: 'number', label: 'At least one number', test: (p) => PASSWORD_HAS_NUMBER.test(p) },
  {
    id: 'special',
    label: 'At least one special character',
    test: (p) => PASSWORD_HAS_SPECIAL.test(p),
  },
];
