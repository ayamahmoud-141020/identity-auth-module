/** Wire contract shared between API responses and the web client. */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

/** Returned by sign-up, sign-in and refresh. */
export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  path: string;
  timestamp: string;
  requestId: string;
  /** Present on 400 validation errors: field name → messages. */
  details?: Record<string, string[]>;
}
