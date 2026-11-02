export const TOKEN_ISSUER = Symbol('TOKEN_ISSUER');

export interface AccessTokenClaims {
  readonly userId: string;
  readonly email: string;
}

export interface RefreshTokenClaims {
  readonly userId: string;
  readonly sessionId: string;
}

export interface IssuedRefreshToken {
  readonly token: string;
  /** Hash stored in the aggregate; the raw token never touches the database. */
  readonly hash: string;
  readonly expiresAt: Date;
}

export interface TokenIssuer {
  issueAccessToken(claims: AccessTokenClaims): Promise<string>;
  issueRefreshToken(claims: RefreshTokenClaims): Promise<IssuedRefreshToken>;
  /** Returns null for malformed, tampered, or expired tokens. */
  verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null>;
  hashRefreshToken(token: string): string;
}
