export interface AuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterInput {
  email: string;
  username: string;
  displayName: string;
  password: string;
  acceptTerms: true;
}

export interface LoginInput {
  identifier: string;
  password: string;
  rememberMe: boolean;
}

export interface UpdateProfileInput {
  username?: string;
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

export interface UserResponse {
  data: {
    user: AuthUser;
  };
}
