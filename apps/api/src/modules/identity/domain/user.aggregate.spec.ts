import { User } from './user.aggregate';
import { Email, PasswordHash, UserName } from './value-objects';
import { InvalidRefreshTokenError, RefreshTokenReusedError } from './errors';
import { UserRegisteredEvent } from './events/user-registered.event';

const now = new Date('2026-01-01T00:00:00Z');
const later = new Date('2026-01-08T00:00:00Z');

function makeUser(): User {
  return User.register({
    id: 'user-1',
    email: Email.create('jane@example.com'),
    name: UserName.create('Jane'),
    passwordHash: PasswordHash.fromString('hash'),
    now,
  });
}

describe('User aggregate', () => {
  it('records a UserRegistered event once on registration', () => {
    const user = makeUser();
    const events = user.pullEvents();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(UserRegisteredEvent);
    expect(events[0]).toMatchObject({ userId: 'user-1', email: 'jane@example.com' });
    expect(user.pullEvents()).toHaveLength(0);
  });

  it('starts with no session and startSession replaces the previous one', () => {
    const user = makeUser();
    expect(user.currentSession).toBeNull();
    user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: later });
    user.startSession({ id: 's2', refreshTokenHash: 'h2', expiresAt: later });
    expect(user.currentSession?.id).toBe('s2');
  });

  describe('rotateRefreshToken', () => {
    it('rotates when the presented hash matches the current one', () => {
      const user = makeUser();
      user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: later });
      user.rotateRefreshToken({
        sessionId: 's1',
        presentedTokenHash: 'h1',
        next: { refreshTokenHash: 'h2', expiresAt: later },
        now,
      });
      expect(user.currentSession).toEqual({ id: 's1', refreshTokenHash: 'h2', expiresAt: later });
    });

    it('detects reuse of an already-rotated token and revokes the session', () => {
      const user = makeUser();
      user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: later });
      user.rotateRefreshToken({
        sessionId: 's1',
        presentedTokenHash: 'h1',
        next: { refreshTokenHash: 'h2', expiresAt: later },
        now,
      });
      expect(() =>
        user.rotateRefreshToken({
          sessionId: 's1',
          presentedTokenHash: 'h1',
          next: { refreshTokenHash: 'h3', expiresAt: later },
          now,
        }),
      ).toThrow(RefreshTokenReusedError);
      expect(user.currentSession).toBeNull();
    });

    it('rejects rotation after revocation, including with the latest token', () => {
      const user = makeUser();
      user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: later });
      user.revokeSessions();
      expect(() =>
        user.rotateRefreshToken({
          sessionId: 's1',
          presentedTokenHash: 'h1',
          next: { refreshTokenHash: 'h2', expiresAt: later },
          now,
        }),
      ).toThrow(InvalidRefreshTokenError);
    });

    it('rejects an unknown session id without touching the current session', () => {
      const user = makeUser();
      user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: later });
      expect(() =>
        user.rotateRefreshToken({
          sessionId: 'other',
          presentedTokenHash: 'h1',
          next: { refreshTokenHash: 'h2', expiresAt: later },
          now,
        }),
      ).toThrow(InvalidRefreshTokenError);
      expect(user.currentSession?.id).toBe('s1');
    });

    it('rejects and revokes an expired session', () => {
      const user = makeUser();
      user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: now });
      expect(() =>
        user.rotateRefreshToken({
          sessionId: 's1',
          presentedTokenHash: 'h1',
          next: { refreshTokenHash: 'h2', expiresAt: later },
          now,
        }),
      ).toThrow(InvalidRefreshTokenError);
      expect(user.currentSession).toBeNull();
    });
  });

  it('round-trips through a snapshot', () => {
    const user = makeUser();
    user.startSession({ id: 's1', refreshTokenHash: 'h1', expiresAt: later });
    const copy = User.rehydrate(user.toSnapshot());
    expect(copy.toSnapshot()).toEqual(user.toSnapshot());
  });
});
