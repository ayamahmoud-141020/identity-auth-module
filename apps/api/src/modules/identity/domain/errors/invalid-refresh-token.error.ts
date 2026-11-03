import { DomainError } from './domain.error';

export class InvalidRefreshTokenError extends DomainError {
  readonly code: string = 'INVALID_REFRESH_TOKEN';

  constructor(message = 'Refresh token is invalid or expired') {
    super(message);
  }
}

/**
 * A previously rotated refresh token was presented again. The aggregate has already revoked the
 * session when this is thrown; the caller must persist that revocation.
 */
export class RefreshTokenReusedError extends InvalidRefreshTokenError {
  override readonly code = 'REFRESH_TOKEN_REUSED';

  constructor() {
    super('Refresh token has already been used; session revoked');
  }
}
