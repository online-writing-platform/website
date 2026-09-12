import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import useAuth from "../hooks/useAuth";
import type { AuthResponse, AuthUser } from "../types/auth";
import AuthProvider from "./AuthProvider";

const { apiRequestMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();

  return { ...actual, apiRequest: apiRequestMock };
});

const user: AuthUser = {
  id: "user-1",
  email: "reader@example.com",
  username: "reader",
  displayName: "Reader",
  bio: null,
  avatarUrl: null,
  verified: true,
  emailVerified: true,
  role: "USER",
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
};

function authResponse(accessToken: string): AuthResponse {
  return { data: { user, accessToken } };
}

describe("AuthProvider request stability", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/api/v1/auth/refresh") {
        return Promise.resolve(authResponse("access-token-1"));
      }

      if (path === "/api/v1/auth/login") {
        return Promise.resolve(authResponse("access-token-2"));
      }

      throw new Error(`Unexpected request: ${path}`);
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("keeps the authenticated request function stable when the token changes", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => {
      expect(result.current.status).toBe("authenticated");
    });

    const initialRequest = result.current.request;

    await act(async () => {
      await result.current.login({
        identifier: "reader@example.com",
        password: "correct-password",
      });
    });

    expect(result.current.request).toBe(initialRequest);
  });
});
