import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import { ApiError } from "../lib/api";
import Login from "./Login";

const { loginMock, useAuthMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: useAuthMock,
}));

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

describe("login for an unverified account", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    loginMock.mockReset();
    loginMock.mockRejectedValue(
      new ApiError(
        403,
        "EMAIL_VERIFICATION_REQUIRED",
        "Email verification is required before signing in.",
        { email: "writer@example.com" },
      ),
    );
    useAuthMock.mockReturnValue({
      status: "anonymous",
      login: loginMock,
    });
  });

  afterEach(() => cleanup());

  it("routes a user with valid credentials to the verification code page", async () => {
    render(
      <MemoryRouter initialEntries={["/login"]}>
        <Routes>
          <Route path="*" element={<><Login /><CurrentLocation /></>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Email or username"), {
      target: { value: "writer" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Secure!Pass123" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Log in" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/verify-email?email=writer%40example.com",
      );
    });
  });
});
