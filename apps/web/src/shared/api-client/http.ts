import axios, {
  type AxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { type ApiErrorResponse, type AuthResponse } from '@app/shared';
import { sessionStore } from './session-store';

export const API_BASE_URL = '/api/v1';

export const http = axios.create({ baseURL: API_BASE_URL, withCredentials: true });

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

http.interceptors.request.use((config) => {
  const token = sessionStore.getAccessToken();
  if (token) config.headers.set('Authorization', `Bearer ${token}`);
  return config;
});

/** Single in-flight refresh. Concurrent 401s await the same promise instead of racing. */
let refreshInFlight: Promise<AuthResponse | null> | null = null;

export function refreshSession(): Promise<AuthResponse | null> {
  if (!refreshInFlight) {
    refreshInFlight = axios
      .post<AuthResponse>(`${API_BASE_URL}/auth/refresh`, undefined, { withCredentials: true })
      .then((res) => {
        sessionStore.setAccessToken(res.data.accessToken);
        return res.data;
      })
      .catch(() => {
        sessionStore.setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

let onSessionLost: (() => void) | null = null;
/** The auth provider registers what to do when a refresh fails after a 401 (sign the user out). */
export function setSessionLostHandler(handler: (() => void) | null): void {
  onSessionLost = handler;
}

const isAuthRoute = (config: AxiosRequestConfig): boolean =>
  (config.url ?? '').startsWith('/auth/');

http.interceptors.response.use(undefined, async (error: AxiosError<ApiErrorResponse>) => {
  const config = error.config as RetriableConfig | undefined;
  if (!config || error.response?.status !== 401 || config._retried || isAuthRoute(config)) {
    throw error;
  }
  config._retried = true;
  const refreshed = await refreshSession();
  if (!refreshed) {
    onSessionLost?.();
    throw error;
  }
  return http.request(config);
});

/** Narrow unknown errors to the API's single error shape. */
export function toApiError(error: unknown): ApiErrorResponse | null {
  if (axios.isAxiosError<ApiErrorResponse>(error) && error.response?.data?.statusCode) {
    return error.response.data;
  }
  return null;
}
