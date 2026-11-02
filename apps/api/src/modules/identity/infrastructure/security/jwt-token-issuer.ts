import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { type Env } from '../../../../shared/config/env.schema';
import {
  type AccessTokenClaims,
  type IssuedRefreshToken,
  type RefreshTokenClaims,
  type TokenIssuer,
} from '../../domain/ports';

export interface AccessTokenPayload {
  sub: string;
  email: string;
}
interface RefreshTokenPayload {
  sub: string;
  sid: string;
  jti: string;
}

@Injectable()
export class JwtTokenIssuer implements TokenIssuer {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessTtl: number;
  private readonly refreshTtl: number;

  constructor(
    private readonly jwt: JwtService,
    config: ConfigService<Env, true>,
  ) {
    this.accessSecret = config.get('JWT_ACCESS_SECRET', { infer: true });
    this.refreshSecret = config.get('JWT_REFRESH_SECRET', { infer: true });
    this.accessTtl = config.get('ACCESS_TOKEN_TTL_SECONDS', { infer: true });
    this.refreshTtl = config.get('REFRESH_TOKEN_TTL_SECONDS', { infer: true });
  }

  issueAccessToken(claims: AccessTokenClaims): Promise<string> {
    const payload: AccessTokenPayload = { sub: claims.userId, email: claims.email };
    return this.jwt.signAsync(payload, { secret: this.accessSecret, expiresIn: this.accessTtl });
  }

  async issueRefreshToken(claims: RefreshTokenClaims): Promise<IssuedRefreshToken> {
    // jti guarantees a fresh token (and hash) on every rotation, even within the same second.
    const payload: RefreshTokenPayload = {
      sub: claims.userId,
      sid: claims.sessionId,
      jti: randomUUID(),
    };
    const token = await this.jwt.signAsync(payload, {
      secret: this.refreshSecret,
      expiresIn: this.refreshTtl,
    });
    return {
      token,
      hash: this.hashRefreshToken(token),
      expiresAt: new Date(Date.now() + this.refreshTtl * 1000),
    };
  }

  async verifyRefreshToken(token: string): Promise<RefreshTokenClaims | null> {
    try {
      const payload = await this.jwt.verifyAsync<RefreshTokenPayload>(token, {
        secret: this.refreshSecret,
      });
      if (typeof payload.sub !== 'string' || typeof payload.sid !== 'string') return null;
      return { userId: payload.sub, sessionId: payload.sid };
    } catch {
      return null;
    }
  }

  /** The refresh token is high-entropy, so a fast hash is sufficient for at-rest storage. */
  hashRefreshToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
