export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  emailVerified: boolean;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  password: string;
  birthDate: string;
  acceptTerms: true;
}

export interface RegistrationResult {
  email: string;
  verificationRequired: true;
  deliveryStatus: "sent" | "failed";
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
}

export interface UpdateProfileInput {
  displayName?: string;
  bio?: string | null;
  avatarUrl?: string | null;
}

export interface AuthResponse {
  data: {
    user: AuthUser;
    accessToken: string;
  };
}

export interface RegistrationResponse {
  data: RegistrationResult;
}

export interface UserResponse {
  data: {
    user: AuthUser;
  };
}
