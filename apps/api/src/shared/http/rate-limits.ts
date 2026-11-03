/** Stricter per-IP limits for credential endpoints (the global default comes from env). */
export const AUTH_RATE_LIMIT = { limit: 10, ttl: 60_000 } as const;
