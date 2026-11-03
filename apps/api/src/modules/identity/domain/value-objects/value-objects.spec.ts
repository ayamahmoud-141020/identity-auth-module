import { Email, PasswordHash, PlainPassword, UserName } from './index';
import { ValidationError } from '../errors';

describe('Email', () => {
  it('normalizes case and whitespace', () => {
    expect(Email.create('  Jane@Example.COM ').value).toBe('jane@example.com');
  });
  it('rejects invalid format with a ValidationError on the email field', () => {
    expect(() => Email.create('nope')).toThrow(ValidationError);
    try {
      Email.create('nope');
    } catch (e) {
      expect((e as ValidationError).field).toBe('email');
    }
  });
  it('compares by value', () => {
    expect(Email.create('a@b.co').equals(Email.create('A@B.CO'))).toBe(true);
  });
});

describe('UserName', () => {
  it('rejects 2 characters, accepts 3', () => {
    expect(() => UserName.create('ab')).toThrow(ValidationError);
    expect(UserName.create('abc').value).toBe('abc');
  });
});

describe('PlainPassword', () => {
  it('rejects 7 characters, accepts 8', () => {
    expect(() => PlainPassword.create('abc123!')).toThrow(ValidationError);
    expect(PlainPassword.create('abcd123!').reveal()).toBe('abcd123!');
  });
  it.each([
    ['missing letter', '12345678!'],
    ['missing number', 'abcdefgh!'],
    ['missing special', 'abcd1234'],
  ])('rejects %s', (_label, value) => {
    expect(() => PlainPassword.create(value)).toThrow(ValidationError);
  });
  it('never leaks the secret through string or JSON conversion', () => {
    const p = PlainPassword.create('abcd123!');
    expect(`${String(p)}`).toBe('[PlainPassword]');
    expect(JSON.stringify({ p })).toBe('{"p":"[PlainPassword]"}');
  });
});

describe('PasswordHash', () => {
  it('rejects empty hashes and hides its value from serialization', () => {
    expect(() => PasswordHash.fromString('')).toThrow(ValidationError);
    expect(JSON.stringify(PasswordHash.fromString('$argon2id$x'))).toBe('"[PasswordHash]"');
  });
});
