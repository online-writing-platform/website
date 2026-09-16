import { beforeEach, describe, expect, it } from "vitest";

import i18n from "../i18n";
import { ApiError } from "./api";
import { getErrorMessage } from "./error-message";

describe("getErrorMessage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fa");
  });

  it("translates backend error codes instead of exposing backend messages", () => {
    const error = new ApiError(404, "STORY_NOT_FOUND", "The story was not found.");

    expect(getErrorMessage(error)).toBe(
      "داستان موردنظر پیدا نشد یا دیگر در دسترس نیست.",
    );
  });

  it("uses a localized request fallback for unknown API codes", () => {
    const error = new ApiError(418, "FUTURE_UNKNOWN_CODE", "raw backend message");
    const message = getErrorMessage(error);

    expect(message).toBe(i18n.t("errors.REQUEST_FAILED"));
    expect(message).not.toContain("raw backend message");
  });

  it("does not expose raw runtime error messages", () => {
    const message = getErrorMessage(new Error("sensitive implementation detail"));

    expect(message).toBe(i18n.t("errors.UNEXPECTED_ERROR"));
    expect(message).not.toContain("sensitive implementation detail");
  });

  it("uses the currently selected language", async () => {
    const error = new ApiError(404, "STORY_NOT_FOUND", "The story was not found.");

    await i18n.changeLanguage("en");

    expect(getErrorMessage(error)).toBe(
      "The requested story was not found or is no longer available.",
    );
  });
});
