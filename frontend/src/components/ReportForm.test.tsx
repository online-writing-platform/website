import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { ApiError } from "../lib/api";
import ReportForm from "./ReportForm";

const authMocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({
    status: "authenticated",
    request: authMocks.request,
  }),
}));

describe("ReportForm feedback", () => {
  beforeEach(async () => {
    authMocks.request.mockReset();
    await i18n.changeLanguage("fa");
  });

  it("announces an API failure as a local error", async () => {
    authMocks.request.mockRejectedValue(
      new ApiError(409, "REPORT_ALREADY_EXISTS", "Duplicate report"),
    );

    render(<ReportForm targetType="COMMENT" targetId="comment-1" />);

    fireEvent.click(screen.getByRole("button", { name: "گزارش محتوا" }));
    fireEvent.click(screen.getByRole("button", { name: "ثبت گزارش" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "قبلاً یک گزارش فعال برای این محتوا ثبت کرده‌اید.",
    );
    expect(alert.classList.contains("report-form__message--error")).toBe(true);
    expect(alert.closest("form")).toBeTruthy();
  });

  it("announces a successful report separately from errors", async () => {
    authMocks.request.mockResolvedValue({ data: {} });

    render(<ReportForm targetType="COMMENT" targetId="comment-1" />);

    fireEvent.click(screen.getByRole("button", { name: "گزارش محتوا" }));
    fireEvent.click(screen.getByRole("button", { name: "ثبت گزارش" }));

    const status = await screen.findByRole("status");
    expect(status.textContent).toBe(
      "گزارش ثبت شد و برای بررسی در صف مدیریت قرار گرفت.",
    );
    expect(status.classList.contains("report-form__message--success")).toBe(
      true,
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
