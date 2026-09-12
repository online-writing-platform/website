import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import AppErrorBoundary from "./AppErrorBoundary";

function BrokenView(): never {
  throw new Error("render failed");
}

describe("AppErrorBoundary", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fa");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows a localized recovery screen when a descendant crashes", () => {
    render(
      <AppErrorBoundary>
        <BrokenView />
      </AppErrorBoundary>,
    );

    expect(
      screen.getByRole("heading", { name: "این صفحه با خطا روبه‌رو شد" }),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "بارگذاری دوباره" })).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "بازگشت به خانه" }).getAttribute("href"),
    ).toBe("/");
  });
});
