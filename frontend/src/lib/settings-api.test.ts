import { describe, expect, it, vi } from "vitest";

import {
  SETTINGS_ENDPOINTS,
  changePassword,
  changeUsername,
  deleteAccount,
  getPreferences,
  getSessions,
  requestEmailChange,
  resendEmailVerification,
  revokeOtherSessions,
  revokeSession,
  uploadProfileImage,
  updatePreferences,
  type SettingsRequest,
} from "./settings-api";

function createRequestMock() {
  return vi.fn(async () => ({ data: {} })) as unknown as SettingsRequest;
}

describe("settings API contract", () => {
  it("uploads a device image as multipart data to the profile-image route", async () => {
    const request = createRequestMock();
    const file = new File(["avatar"], "avatar.png", { type: "image/png" });

    await uploadProfileImage(request, file);

    expect(request).toHaveBeenCalledWith(SETTINGS_ENDPOINTS.profileImage, {
      method: "POST",
      body: expect.any(FormData),
    });

    const options = (request as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as
      | RequestInit
      | undefined;
    const body = options?.body as FormData;

    expect(body.get("file")).toBe(file);
  });

  it("uses the preferences routes and payloads expected by the backend", async () => {
    const request = createRequestMock();
    const controller = new AbortController();

    await getPreferences(request, controller.signal);
    await updatePreferences(request, { notifyFollow: false });

    expect(request).toHaveBeenNthCalledWith(1, SETTINGS_ENDPOINTS.preferences, {
      signal: controller.signal,
    });
    expect(request).toHaveBeenNthCalledWith(2, SETTINGS_ENDPOINTS.preferences, {
      method: "PATCH",
      body: JSON.stringify({ notifyFollow: false }),
    });
  });

  it("uses the security routes and schema-compatible payloads", async () => {
    const request = createRequestMock();

    await changePassword(request, "current-password", "New-password-123!");
    await changeUsername(request, "current-password", "  new_writer  ");
    await requestEmailChange(
      request,
      "current-password",
      "  WRITER@EXAMPLE.COM  ",
    );
    await resendEmailVerification(request);

    expect(request).toHaveBeenNthCalledWith(1, SETTINGS_ENDPOINTS.password, {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "current-password",
        newPassword: "New-password-123!",
      }),
    });
    expect(request).toHaveBeenNthCalledWith(2, SETTINGS_ENDPOINTS.username, {
      method: "PATCH",
      body: JSON.stringify({
        currentPassword: "current-password",
        newUsername: "new_writer",
      }),
    });
    expect(request).toHaveBeenNthCalledWith(3, SETTINGS_ENDPOINTS.emailChange, {
      method: "POST",
      body: JSON.stringify({
        currentPassword: "current-password",
        newEmail: "writer@example.com",
      }),
    });
    expect(request).toHaveBeenNthCalledWith(
      4,
      SETTINGS_ENDPOINTS.emailVerification,
      { method: "POST" },
    );
  });

  it("uses the session and account routes expected by the backend", async () => {
    const request = createRequestMock();
    const controller = new AbortController();

    await getSessions(request, controller.signal);
    await revokeSession(request, "session/id");
    await revokeOtherSessions(request);
    await deleteAccount(request, "current-password");

    expect(request).toHaveBeenNthCalledWith(1, SETTINGS_ENDPOINTS.sessions, {
      signal: controller.signal,
    });
    expect(request).toHaveBeenNthCalledWith(
      2,
      `${SETTINGS_ENDPOINTS.sessions}/session%2Fid`,
      { method: "DELETE" },
    );
    expect(request).toHaveBeenNthCalledWith(
      3,
      SETTINGS_ENDPOINTS.revokeOtherSessions,
      { method: "POST" },
    );
    expect(request).toHaveBeenNthCalledWith(4, SETTINGS_ENDPOINTS.account, {
      method: "DELETE",
      body: JSON.stringify({ currentPassword: "current-password" }),
    });
  });
});
