import { describe, expect, it } from 'vitest';
import { emailSchema, nameSchema, passwordSchema, signUpSchema } from './auth.schemas.js';

const messages = (result: { success: boolean; error?: { issues: { message: string }[] } }) =>
  result.success ? [] : (result.error?.issues.map((i) => i.message) ?? []);

describe('emailSchema', () => {
  it('accepts a valid email and normalizes case and whitespace', () => {
    expect(emailSchema.parse('  John.Doe@Example.COM ')).toBe('john.doe@example.com');
  });
  it.each(['', 'plain', 'a@', '@b.com', 'a b@c.com'])('rejects %p', (value) => {
    expect(emailSchema.safeParse(value).success).toBe(false);
  });
});

describe('nameSchema', () => {
  it('rejects 2 characters and accepts 3', () => {
    expect(nameSchema.safeParse('ab').success).toBe(false);
    expect(nameSchema.safeParse('abc').success).toBe(true);
  });
  it('trims before measuring length', () => {
    expect(nameSchema.safeParse('  a  ').success).toBe(false);
  });
});

describe('passwordSchema', () => {
  it('accepts a password meeting every rule', () => {
    expect(passwordSchema.safeParse('abcd123!').success).toBe(true);
  });
  it('rejects 7 characters and accepts 8', () => {
    expect(passwordSchema.safeParse('abc123!').success).toBe(false);
    expect(passwordSchema.safeParse('abcd123!').success).toBe(true);
  });
  it('requires a letter', () => {
    expect(messages(passwordSchema.safeParse('12345678!'))).toContain('At least one letter');
  });
  it('requires a number', () => {
    expect(messages(passwordSchema.safeParse('abcdefgh!'))).toContain('At least one number');
  });
  it('requires a special character', () => {
    expect(messages(passwordSchema.safeParse('abcd1234'))).toContain(
      'At least one special character',
    );
  });
  it('does not count whitespace as a special character', () => {
    expect(passwordSchema.safeParse('abcd 1234').success).toBe(false);
  });
  it('reports every failing rule, not just the first', () => {
    expect(messages(passwordSchema.safeParse('abc'))).toHaveLength(3);
  });
});

describe('signUpSchema', () => {
  it('strips unknown keys and returns normalized data', () => {
    const parsed = signUpSchema.parse({
      email: 'A@B.CO',
      name: ' Jane ',
      password: 'Secret1!x',
      isAdmin: true,
    });
    expect(parsed).toEqual({ email: 'a@b.co', name: 'Jane', password: 'Secret1!x' });
  });
});
