import {
  type AccessTokenClaims,
  type IssuedRefreshToken,
  type RefreshTokenClaims,
  type TokenIssuer,
} from '../../src/modules/identity/domain/ports';

/** Tokens are readable JSON so tests can inspect them; hashes are a reversible prefix. */
export class FakeTokenIssuer implements TokenIssuer {
  private counter = 0;
  readonly refreshTtlMs = 7 * 24 * 60 * 60 * 1000;

  issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    return Promise.resolve(`access:${claims.userId}:${claims.email}`);
  }

  issueRefreshToken(claims: RefreshTokenClaims): Promise<IssuedRefreshToken> {
    const token = JSON.stringify({ ...claims, n: ++this.counter });
    return Promise.resolve({
      token,
      hash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + this.refreshTtlMs),
    });
  }

  verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    try {
      const parsed = JSON.parse(token) as Partial<RefreshTokenClaims>;
      return Promise.resolve(
        typeof parsed.userId === 'string' && typeof parsed.sessionId === 'string'
          ? { userId: parsed.userId, sessionId: parsed.sessionId }
          : null,
      );
    } catch {
      return Promise.resolve(null);
    }
  }

  hashRefreshToken(token: string): string {
    return `sha:${token}`;
  }
}
