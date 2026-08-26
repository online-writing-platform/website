import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import Register from "./Register";

const { registerMock, useAuthMock } = vi.hoisted(() => ({
  registerMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: useAuthMock,
}));

vi.mock("../components/BirthDatePicker", () => ({
  default: ({ onChange }: { onChange(value: string): void }) => (
    <button type="button" onClick={() => onChange("2000-01-01")}>
      Choose test birth date
    </button>
  ),
}));

function CurrentLocation() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
}

describe("registration email verification handoff", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    registerMock.mockReset();
    registerMock.mockResolvedValue({
      email: "writer@example.com",
      verificationRequired: true,
      deliveryStatus: "sent",
    });
    useAuthMock.mockReturnValue({
      status: "anonymous",
      register: registerMock,
    });
  });

  afterEach(() => cleanup());

  it("routes a newly registered user to the code form instead of authenticating them", async () => {
    render(
      <MemoryRouter initialEntries={["/register"]}>
        <Routes>
          <Route path="*" element={<><Register /><CurrentLocation /></>} />
        </Routes>
      </MemoryRouter>,
    );

    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "writer" },
    });
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "Writer@Example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Choose test birth date" }));
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "Secure!Pass123" },
    });
    fireEvent.change(screen.getByLabelText("Confirm password"), {
      target: { value: "Secure!Pass123" },
    });
    fireEvent.click(screen.getByRole("checkbox"));
    fireEvent.click(screen.getByRole("button", { name: "Register" }));

    await waitFor(() => {
      expect(screen.getByTestId("location").textContent).toBe(
        "/verify-email?email=writer%40example.com",
      );
    });
  });
});
