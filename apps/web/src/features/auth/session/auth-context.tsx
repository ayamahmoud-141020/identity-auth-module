import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { type SignInInput, type SignUpInput, type UserResponse } from '@app/shared';
import { authApi } from '../../../shared/api-client/auth.api';
import { setSessionLostHandler } from '../../../shared/api-client/http';

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous';

export interface AuthContextValue {
  status: AuthStatus;
  user: UserResponse | null;
  signUp: (input: SignUpInput) => Promise<void>;
  signIn: (input: SignInInput) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<UserResponse | null>(null);

  const becomeAnonymous = useCallback(() => {
    setUser(null);
    setStatus('anonymous');
  }, []);

  // Silent refresh on first load: the httpOnly cookie may still hold a valid session.
  useEffect(() => {
    let cancelled = false;
    void authApi.refresh().then((session) => {
      if (cancelled) return;
      if (session) {
        setUser(session.user);
        setStatus('authenticated');
      } else {
        becomeAnonymous();
      }
    });
    setSessionLostHandler(becomeAnonymous);
    return () => {
      cancelled = true;
      setSessionLostHandler(null);
    };
  }, [becomeAnonymous]);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      user,
      async signUp(input) {
        const session = await authApi.signUp(input);
        setUser(session.user);
        setStatus('authenticated');
      },
      async signIn(input) {
        const session = await authApi.signIn(input);
        setUser(session.user);
        setStatus('authenticated');
      },
      async signOut() {
        await authApi.signOut();
        becomeAnonymous();
      },
    }),
    [status, user, becomeAnonymous],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
