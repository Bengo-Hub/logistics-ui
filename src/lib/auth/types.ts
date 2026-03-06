export interface SessionTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  sessionId: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  role: string;
  permissions: string[];
  tenantId: string;
  tenantSlug: string;
}

export interface AuthResponse {
  session: SessionTokens;
  user: UserProfile;
}
