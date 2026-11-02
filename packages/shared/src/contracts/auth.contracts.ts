/** Wire contract shared between API responses and the web client. */
export interface UserResponse {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

export interface AuthResponse {
  accessToken: string;
  user: UserResponse;
}

export interface RefreshResponse {
  accessToken: string;
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
