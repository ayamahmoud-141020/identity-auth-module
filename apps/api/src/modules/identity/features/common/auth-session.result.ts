import { type UserResponse } from '@app/shared';
import { type IssuedRefreshToken } from '../../domain/ports';

/** What sign-up, sign-in and refresh hand back to their controllers. */
export interface AuthSessionResult {
  accessToken: string;
  refreshToken: IssuedRefreshToken;
  user: UserResponse;
}
