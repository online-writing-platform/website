import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import AuthContext, {
  type AuthContextValue,
  type AuthStatus,
} from "./AuthContext";

import { ApiError, apiRequest } from "../lib/api";

import type {
  AuthResponse,
  AuthUser,
  CompleteExternalSignupInput,
  ExternalAuthResponse,
  ExternalAuthResult,
  LoginInput,
  RegisterInput,
  RegistrationResponse,
  RegistrationResult,
  UpdateProfileInput,
  UserResponse,
  VerifyEmailInput,
} from "../types/auth";

interface AuthProviderProps {
  children: ReactNode;
}

function addAccessToken(
  options: RequestInit,
  accessToken: string,
): RequestInit {
  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${accessToken}`);

  return {
    ...options,
    headers,
  };
}

function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [accessToken, setAccessToken] = useState<string | null>(null);

  const [status, setStatus] = useState<AuthStatus>("loading");

  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);

  const clearAuthentication = useCallback((): void => {
    setUser(null);
    setAccessToken(null);
    setStatus("anonymous");
  }, []);

  const applyAuthentication = useCallback((response: AuthResponse): string => {
    const { user: authenticatedUser, accessToken: nextAccessToken } =
      response.data;

    setUser(authenticatedUser);
    setAccessToken(nextAccessToken);
    setStatus("authenticated");

    return nextAccessToken;
  }, []);

  const executeRefresh = useCallback(async (): Promise<string | null> => {
    try {
      const response = await apiRequest<AuthResponse>("/api/v1/auth/refresh", {
        method: "POST",
      });

      return applyAuthentication(response);
    } catch (error) {
      clearAuthentication();

      if (
        error instanceof ApiError &&
        (error.status === 401 || error.status === 403)
      ) {
        return null;
      }

      throw error;
    }
  }, [applyAuthentication, clearAuthentication]);

  const refreshSession = useCallback((): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const refreshPromise = executeRefresh().finally(() => {
      refreshPromiseRef.current = null;
    });

    refreshPromiseRef.current = refreshPromise;

    return refreshPromise;
  }, [executeRefresh]);

  useEffect(() => {
    void refreshSession().catch(() => {
      clearAuthentication();
    });
  }, [clearAuthentication, refreshSession]);

  const register = useCallback(
    async (input: RegisterInput): Promise<RegistrationResult> => {
      const response = await apiRequest<RegistrationResponse>(
        "/api/v1/auth/register",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );

      return response.data;
    },
    [],
  );

  const verifyEmail = useCallback(
    async (input: VerifyEmailInput): Promise<AuthUser> => {
      const response = await apiRequest<AuthResponse>(
        "/api/v1/auth/email-verification/verify",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );

      applyAuthentication(response);

      return response.data.user;
    },
    [applyAuthentication],
  );

  const resendVerificationEmail = useCallback(
    async (email: string): Promise<void> => {
      await apiRequest("/api/v1/auth/email-verification/resend", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },
    [],
  );

  const applyExternalAuthentication = useCallback(
    (response: ExternalAuthResponse): ExternalAuthResult => {
      if (response.data.status === "signup_required") {
        return response.data;
      }

      const authResponse: AuthResponse = {
        data: {
          user: response.data.user,
          accessToken: response.data.accessToken,
        },
      };
      applyAuthentication(authResponse);
      return { status: "authenticated", user: response.data.user };
    },
    [applyAuthentication],
  );

  const requestPhoneOtp = useCallback(async (phoneNumber: string): Promise<void> => {
    await apiRequest("/api/v1/auth/phone/request-code", {
      method: "POST",
      body: JSON.stringify({ phoneNumber }),
    });
  }, []);

  const verifyPhoneOtp = useCallback(
    async (phoneNumber: string, code: string): Promise<ExternalAuthResult> => {
      const response = await apiRequest<ExternalAuthResponse>(
        "/api/v1/auth/phone/verify-code",
        {
          method: "POST",
          body: JSON.stringify({ phoneNumber, code }),
        },
      );
      return applyExternalAuthentication(response);
    },
    [applyExternalAuthentication],
  );

  const loginWithGoogle = useCallback(
    async (credential: string): Promise<ExternalAuthResult> => {
      const response = await apiRequest<ExternalAuthResponse>(
        "/api/v1/auth/oauth/google",
        {
          method: "POST",
          body: JSON.stringify({ credential }),
        },
      );
      return applyExternalAuthentication(response);
    },
    [applyExternalAuthentication],
  );

  const loginWithApple = useCallback(
    async (code: string, displayName?: string): Promise<ExternalAuthResult> => {
      const response = await apiRequest<ExternalAuthResponse>(
        "/api/v1/auth/oauth/apple",
        {
          method: "POST",
          body: JSON.stringify({ code, ...(displayName ? { displayName } : {}) }),
        },
      );
      return applyExternalAuthentication(response);
    },
    [applyExternalAuthentication],
  );

  const completeExternalSignup = useCallback(
    async (input: CompleteExternalSignupInput): Promise<AuthUser> => {
      const response = await apiRequest<AuthResponse>(
        "/api/v1/auth/external-signup/complete",
        {
          method: "POST",
          body: JSON.stringify(input),
        },
      );
      applyAuthentication(response);
      return response.data.user;
    },
    [applyAuthentication],
  );

  const login = useCallback(
    async (input: LoginInput): Promise<AuthUser> => {
      const response = await apiRequest<AuthResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify({
          identifier: input.identifier,
          password: input.password,
        }),
      });

      applyAuthentication(response);

      return response.data.user;
    },
    [applyAuthentication],
  );

  const logout = useCallback(async (): Promise<void> => {
    try {
      await apiRequest<void>("/api/v1/auth/logout", {
        method: "POST",
      });
    } finally {
      clearAuthentication();
    }
  }, [clearAuthentication]);

  const request = useCallback(
    async <T,>(path: string, options: RequestInit = {}): Promise<T> => {
      let currentAccessToken = accessToken;

      if (!currentAccessToken) {
        currentAccessToken = await refreshSession();
      }

      if (!currentAccessToken) {
        throw new ApiError(401, "UNAUTHORIZED", "Authentication is required.");
      }

      try {
        return await apiRequest<T>(
          path,
          addAccessToken(options, currentAccessToken),
        );
      } catch (error) {
        if (!(error instanceof ApiError) || error.status !== 401) {
          throw error;
        }

        setAccessToken(null);

        const refreshedAccessToken = await refreshSession();

        if (!refreshedAccessToken) {
          throw error;
        }

        return apiRequest<T>(
          path,
          addAccessToken(options, refreshedAccessToken),
        );
      }
    },
    [accessToken, refreshSession],
  );

  const updateProfile = useCallback(
    async (input: UpdateProfileInput): Promise<AuthUser> => {
      const response = await request<UserResponse>("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify(input),
      });

      setUser(response.data.user);

      return response.data.user;
    },
    [request],
  );

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      status,
      login,
      register,
      verifyEmail,
      resendVerificationEmail,
      requestPhoneOtp,
      verifyPhoneOtp,
      loginWithGoogle,
      loginWithApple,
      completeExternalSignup,
      logout,
      updateProfile,
      request,
    }),
    [
      user,
      status,
      login,
      register,
      verifyEmail,
      resendVerificationEmail,
      requestPhoneOtp,
      verifyPhoneOtp,
      loginWithGoogle,
      loginWithApple,
      completeExternalSignup,
      logout,
      updateProfile,
      request,
    ],
  );

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}

export default AuthProvider;
