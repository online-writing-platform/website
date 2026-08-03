import { createContext } from "react";

import type {
  AuthUser,
  LoginInput,
  RegisterInput,
  UpdateProfileInput,
} from "../types/auth";

export type AuthStatus = "loading" | "authenticated" | "anonymous";

export interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;

  login(input: LoginInput): Promise<AuthUser>;

  register(input: RegisterInput): Promise<AuthUser>;

  logout(): Promise<void>;

  updateProfile(input: UpdateProfileInput): Promise<AuthUser>;

  request<T>(path: string, options?: RequestInit): Promise<T>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export default AuthContext;
