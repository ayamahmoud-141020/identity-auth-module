/**
 * The access token lives only here, in memory. It is never written to localStorage,
 * sessionStorage or cookies, so an XSS payload cannot exfiltrate a persisted token.
 */
let accessToken: string | null = null;

export const sessionStore = {
  getAccessToken: (): string | null => accessToken,
  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },
};
