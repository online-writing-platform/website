import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import PhoneAuthPage from "./PhoneAuthPage";

const { requestPhoneOtpMock, useAuthMock, verifyPhoneOtpMock } = vi.hoisted(
  () => ({
    requestPhoneOtpMock: vi.fn(),
    useAuthMock: vi.fn(),
    verifyPhoneOtpMock: vi.fn(),
  }),
);

vi.mock("../hooks/useAuth", () => ({
  default: useAuthMock,
}));

function CurrentLocation() {
  const location = useLocation();

  return <output data-testid="location">{location.pathname}</output>;
}

describe("PhoneAuthPage", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    requestPhoneOtpMock.mockReset();
    requestPhoneOtpMock.mockResolvedValue(undefined);
    verifyPhoneOtpMock.mockReset();
    verifyPhoneOtpMock.mockResolvedValue({
      status: "authenticated",
      user: {},
    });
    useAuthMock.mockReturnValue({
      status: "anonymous",
      requestPhoneOtp: requestPhoneOtpMock,
      verifyPhoneOtp: verifyPhoneOtpMock,
    });
  });

  it("moves from mobile entry to OTP verification and normalizes localized digits", async () => {
    render(
      <MemoryRouter initialEntries={["/phone-auth"]}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <PhoneAuthPage />
                <CurrentLocation />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Mobile number"), {
      target: { value: " 09123456789 " },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Send verification code" }),
    );

    expect(
      await screen.findByRole("heading", { name: "Enter verification code" }),
    ).toBeTruthy();
    expect(requestPhoneOtpMock).toHaveBeenCalledWith("09123456789");

    fireEvent.change(screen.getByLabelText("Six-digit code"), {
      target: { value: "۱۲٣456" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Verify and continue" }),
    );

    await waitFor(() => {
      expect(verifyPhoneOtpMock).toHaveBeenCalledWith(
        "09123456789",
        "123456",
      );
      expect(screen.getByTestId("location").textContent).toBe("/");
    });
  });
});
