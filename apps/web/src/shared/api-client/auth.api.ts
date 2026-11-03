import {
  type AuthResponse,
  type SignInInput,
  type SignUpInput,
  type UserResponse,
} from '@app/shared';
import { http, refreshSession } from './http';
import { sessionStore } from './session-store';

export const authApi = {
  async signUp(input: SignUpInput): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/sign-up', input);
    sessionStore.setAccessToken(data.accessToken);
    return data;
  },
  async signIn(input: SignInInput): Promise<AuthResponse> {
    const { data } = await http.post<AuthResponse>('/auth/sign-in', input);
    sessionStore.setAccessToken(data.accessToken);
    return data;
  },
  async signOut(): Promise<void> {
    try {
      await http.post('/auth/sign-out');
    } finally {
      sessionStore.setAccessToken(null);
    }
  },
  refresh: refreshSession,
  async me(): Promise<UserResponse> {
    const { data } = await http.get<UserResponse>('/users/me');
    return data;
  },
};
