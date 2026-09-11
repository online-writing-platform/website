import { createContext } from "react";

import type {
  AuthUser,
  CompleteExternalSignupInput,
  ExternalAuthResult,
  LoginInput,
  RegisterInput,
  RegistrationResult,
  UpdateProfileInput,
  VerifyEmailInput,
} from "../types/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;

  login(input: LoginInput): Promise<AuthUser>;

  register(input: RegisterInput): Promise<RegistrationResult>;

  verifyEmail(input: VerifyEmailInput): Promise<AuthUser>;

  resendVerificationEmail(email: string): Promise<void>;

  requestPhoneOtp(phoneNumber: string): Promise<void>;

  verifyPhoneOtp(phoneNumber: string, code: string): Promise<ExternalAuthResult>;

  loginWithGoogle(credential: string): Promise<ExternalAuthResult>;

  loginWithApple(code: string, displayName?: string): Promise<ExternalAuthResult>;

  completeExternalSignup(input: CompleteExternalSignupInput): Promise<AuthUser>;

  logout(): Promise<void>;

  updateProfile(input: UpdateProfileInput): Promise<AuthUser>;

  request<T>(path: string, options?: RequestInit): Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default AuthContext;
