import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import VerifyEmailPage from "./VerifyEmailPage";

const { resendMock, useAuthMock, verifyEmailMock } = vi.hoisted(() => ({
  resendMock: vi.fn(),
  useAuthMock: vi.fn(),
  verifyEmailMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: useAuthMock,
}));

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

describe("email verification code page", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    verifyEmailMock.mockReset();
    resendMock.mockReset();
    verifyEmailMock.mockResolvedValue({ emailVerified: true });
    resendMock.mockResolvedValue(undefined);
    useAuthMock.mockReturnValue({
      verifyEmail: verifyEmailMock,
      resendVerificationEmail: resendMock,
    });
  });

  afterEach(() => cleanup());

  it("verifies a six-digit code and redirects the authenticated user", async () => {
    render(
      <MemoryRouter initialEntries={["/verify-email?email=writer%40example.com"]}>
        <Routes>
          <Route path="*" element={<><VerifyEmailPage /><CurrentLocation /></>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Verification code"), {
      target: { value: "123456" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Verify and continue" }));

    await waitFor(() => {
      expect(verifyEmailMock).toHaveBeenCalledWith({
        email: "writer@example.com",
        code: "123456",
      });
      expect(screen.getByTestId("location").textContent).toBe("/settings");
    });
  });
});
