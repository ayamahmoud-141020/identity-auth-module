import { type Email, type UserName, type PasswordHash } from './value-objects';
import { UserRegisteredEvent } from './events/user-registered.event';
import { InvalidRefreshTokenError, RefreshTokenReusedError } from './errors';

/** The single active refresh session of a user. Only a hash of the refresh token is kept. */
export interface Session {
  readonly id: string;
  readonly refreshTokenHash: string;
  readonly expiresAt: Date;
}

export interface UserSnapshot {
  readonly id: string;
  readonly email: Email;
  readonly name: UserName;
  readonly passwordHash: PasswordHash;
  readonly session: Session | null;
  readonly createdAt: Date;
}

export type DomainEvent = UserRegisteredEvent;

export class User {
  private session: Session | null;
  private readonly events: DomainEvent[] = [];

  private constructor(
    readonly id: string,
    readonly email: Email,
    readonly name: UserName,
    readonly passwordHash: PasswordHash,
    session: Session | null,
    readonly createdAt: Date,
  ) {
    this.session = session;
  }

  static register(props: {
    id: string;
    email: Email;
    name: UserName;
    passwordHash: PasswordHash;
    now?: Date;
  }): User {
    const now = props.now ?? new Date();
    const user = new User(props.id, props.email, props.name, props.passwordHash, null, now);
    user.events.push(new UserRegisteredEvent(user.id, user.email.value, now));
    return user;
  }

  static rehydrate(snapshot: UserSnapshot): User {
    return new User(
      snapshot.id,
      snapshot.email,
      snapshot.name,
      snapshot.passwordHash,
      snapshot.session,
      snapshot.createdAt,
    );
  }

  get currentSession(): Session | null {
    return this.session;
  }

  /** Starts a new session, replacing any existing one (single active session per user). */
  startSession(session: Session): void {
    this.session = session;
  }

  /**
   * Rotates the refresh token. Rules:
   * - no session, unknown session id, or expired session → InvalidRefreshTokenError
   * - presented hash differs from the stored one → the token was already rotated and is being
   *   reused: revoke everything and throw RefreshTokenReusedError (caller persists the revocation)
   */
  rotateRefreshToken(input: {
    sessionId: string;
    presentedTokenHash: string;
    next: { refreshTokenHash: string; expiresAt: Date };
    now?: Date;
  }): void {
    const now = input.now ?? new Date();
    const session = this.session;

    if (!session || session.id !== input.sessionId) {
      throw new InvalidRefreshTokenError();
    }
    if (session.expiresAt.getTime() <= now.getTime()) {
      this.revokeSessions();
      throw new InvalidRefreshTokenError();
    }
    if (session.refreshTokenHash !== input.presentedTokenHash) {
      this.revokeSessions();
      throw new RefreshTokenReusedError();
    }

    this.session = {
      id: session.id,
      refreshTokenHash: input.next.refreshTokenHash,
      expiresAt: input.next.expiresAt,
    };
  }

  revokeSessions(): void {
    this.session = null;
  }

  /** Returns and clears pending domain events. */
  pullEvents(): DomainEvent[] {
    return this.events.splice(0, this.events.length);
  }

  toSnapshot(): UserSnapshot {
    return {
      id: this.id,
      email: this.email,
      name: this.name,
      passwordHash: this.passwordHash,
      session: this.session,
      createdAt: this.createdAt,
    };
  }
}
