export interface Preferences {
  allowMatureContent: boolean;
  readerTheme: "SYSTEM" | "LIGHT" | "DARK" | "SEPIA";
  fontScale: number;
  lineHeight: number;
  notifyFollow: boolean;
  notifyComment: boolean;
  notifyReply: boolean;
  notifyVote: boolean;
  notifyChapterPublished: boolean;
  notifyModeration: boolean;
  notifySecurity: boolean;
}

export interface Session {
  id: string;
  userAgent: string | null;
  ipAddress: string | null;
  lastUsedAt: string;
  expiresAt: string;
  createdAt: string;
  current: boolean;
}

export interface PreferencesResponse {
  data: { preferences: Preferences };
}

export interface SessionsResponse {
  data: { sessions: Session[] };
}

export interface RevokeOtherSessionsResponse {
  data: { revokedCount: number };
}

export interface ProfileImageUploadResponse {
  data: {
    media: {
      assetId: string;
      url: string;
      width: number;
      height: number;
    };
  };
}

export type SettingsRequest = <T>(
  path: string,
  options?: RequestInit,
) => Promise<T>;

export const SETTINGS_ENDPOINTS = {
  preferences: "/api/v1/preferences",
  profileImage: "/api/v1/media/profile-images",
  password: "/api/v1/auth/password",
  username: "/api/v1/auth/username",
  emailChange: "/api/v1/auth/email-change/request",
  emailVerification: "/api/v1/auth/email-verification/resend",
  sessions: "/api/v1/auth/sessions",
  revokeOtherSessions: "/api/v1/auth/sessions/revoke-others",
  account: "/api/v1/auth/account",
} as const;

export function uploadProfileImage(
  request: SettingsRequest,
  file: File,
): Promise<ProfileImageUploadResponse> {
  const body = new FormData();
  body.append("file", file);

  return request<ProfileImageUploadResponse>(SETTINGS_ENDPOINTS.profileImage, {
    method: "POST",
    body,
  });
}

export function getPreferences(
  request: SettingsRequest,
  signal?: AbortSignal,
): Promise<PreferencesResponse> {
  return request<PreferencesResponse>(SETTINGS_ENDPOINTS.preferences, {
    signal,
  });
}

export function updatePreferences(
  request: SettingsRequest,
  input: Partial<Preferences>,
): Promise<PreferencesResponse> {
  return request<PreferencesResponse>(SETTINGS_ENDPOINTS.preferences, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function changePassword(
  request: SettingsRequest,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  return request<void>(SETTINGS_ENDPOINTS.password, {
    method: "PATCH",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function changeUsername(
  request: SettingsRequest,
  currentPassword: string,
  newUsername: string,
): Promise<void> {
  return request<void>(SETTINGS_ENDPOINTS.username, {
    method: "PATCH",
    body: JSON.stringify({
      currentPassword,
      newUsername: newUsername.trim(),
    }),
  });
}

export function requestEmailChange(
  request: SettingsRequest,
  currentPassword: string,
  newEmail: string,
): Promise<{ data: { status: "sent" } }> {
  return request<{ data: { status: "sent" } }>(SETTINGS_ENDPOINTS.emailChange, {
    method: "POST",
    body: JSON.stringify({
      currentPassword,
      newEmail: newEmail.trim().toLowerCase(),
    }),
  });
}

export function resendEmailVerification(
  request: SettingsRequest,
  email: string,
): Promise<{ data: { status: "sent" } }> {
  return request<{ data: { status: "sent" } }>(
    SETTINGS_ENDPOINTS.emailVerification,
    {
      method: "POST",
      body: JSON.stringify({ email: email.trim().toLowerCase() }),
    },
  );
}

export function getSessions(
  request: SettingsRequest,
  signal?: AbortSignal,
): Promise<SessionsResponse> {
  return request<SessionsResponse>(SETTINGS_ENDPOINTS.sessions, { signal });
}

export function revokeSession(
  request: SettingsRequest,
  sessionId: string,
): Promise<void> {
  return request<void>(
    `${SETTINGS_ENDPOINTS.sessions}/${encodeURIComponent(sessionId)}`,
    { method: "DELETE" },
  );
}

export function revokeOtherSessions(
  request: SettingsRequest,
): Promise<RevokeOtherSessionsResponse> {
  return request<RevokeOtherSessionsResponse>(
    SETTINGS_ENDPOINTS.revokeOtherSessions,
    { method: "POST" },
  );
}

export function deleteAccount(
  request: SettingsRequest,
  currentPassword: string,
): Promise<void> {
  return request<void>(SETTINGS_ENDPOINTS.account, {
    method: "DELETE",
    body: JSON.stringify({ currentPassword }),
  });
}
