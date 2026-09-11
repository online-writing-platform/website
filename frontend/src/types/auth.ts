export type UserRole = "USER" | "MODERATOR" | "ADMIN";
export type ExternalAuthProvider = "PHONE" | "GOOGLE" | "APPLE";

export interface AuthUser {
  id: string;
  email: string | null;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
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

export interface CompleteExternalSignupInput {
  signupToken: string;
  username: string;
  birthDate: string;
  acceptTerms: true;
}

export interface SignupRequiredResult {
  status: "signup_required";
  provider: ExternalAuthProvider;
  signupToken: string;
  email: string | null;
  displayName: string | null;
}

export type ExternalAuthResult =
  | { status: "authenticated"; user: AuthUser }
  | SignupRequiredResult;

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

export interface ExternalAuthResponse {
  data:
    | {
        status: "authenticated";
        user: AuthUser;
        accessToken: string;
      }
    | SignupRequiredResult;
}

export interface RegistrationResponse {
  data: RegistrationResult;
}

export interface UserResponse {
  data: {
    user: AuthUser;
  };
}
