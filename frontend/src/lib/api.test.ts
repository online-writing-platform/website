import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { ApiError, apiRequest } from "./api";
import { getErrorMessage } from "./error-message";

describe("API error fallbacks", () => {
  const fetchMock = vi.fn();

  beforeEach(async () => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    await i18n.changeLanguage("fa");
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("converts malformed JSON responses into a safe localized error", async () => {
    fetchMock.mockResolvedValue(
      new Response("{", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );

    const request = apiRequest("/invalid-json");

    await expect(request).rejects.toMatchObject({
      code: "INVALID_SERVER_RESPONSE",
      status: 200,
    });
    await expect(request).rejects.not.toBeInstanceOf(SyntaxError);

    try {
      await request;
    } catch (cause) {
      expect(getErrorMessage(cause)).toBe(
        "پاسخ معتبری از سرور دریافت نشد. دوباره تلاش کنید.",
      );
    }
  });

  it("uses REQUEST_FAILED for a non-JSON error response", async () => {
    fetchMock.mockResolvedValue(
      new Response("Bad gateway", {
        status: 502,
        headers: { "content-type": "text/plain" },
      }),
    );

    try {
      await apiRequest("/plain-error");
      throw new Error("Expected the request to fail");
    } catch (cause) {
      expect(cause).toMatchObject({ code: "REQUEST_FAILED", status: 502 });
      expect(getErrorMessage(cause)).toBe(
        "انجام درخواست ممکن نشد. دوباره تلاش کنید.",
      );
    }
  });

  it("localizes common server and session fallback codes in both languages", async () => {
    const serverError = new ApiError(
      500,
      "INTERNAL_SERVER_ERROR",
      "Internal Server Error",
    );
    const sessionError = new ApiError(
      403,
      "ACCOUNT_VERIFICATION_REQUIRED",
      "Verification required",
    );

    expect(getErrorMessage(serverError)).toBe(
      "خطایی در سرور رخ داد. کمی بعد دوباره تلاش کنید.",
    );
    expect(getErrorMessage(sessionError)).toBe(
      "پیش از انجام این عملیات، حساب خود را تأیید کنید.",
    );

    await i18n.changeLanguage("en");

    expect(getErrorMessage(serverError)).toBe(
      "A server error occurred. Please try again later.",
    );
    expect(getErrorMessage(sessionError)).toBe(
      "Verify your account before performing this action.",
    );
  });
});
