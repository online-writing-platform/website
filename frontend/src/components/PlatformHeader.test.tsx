import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import PlatformHeader from "./PlatformHeader";

const { logoutMock, useAuthMock } = vi.hoisted(() => ({
  logoutMock: vi.fn(() => Promise.resolve()),
  useAuthMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: useAuthMock,
}));

vi.mock("./LanguageSwitcher", () => ({
  default: () => null,
}));

vi.mock("./ThemeButton", () => ({
  default: () => null,
}));

const authenticatedUser = {
  id: "user-1",
  email: "writer@example.com",
  username: "writer",
  displayName: "Test Writer",
  bio: null,
  avatarUrl: null,
  emailVerified: true,
  role: "USER",
  createdAt: "2026-08-19T00:00:00.000Z",
  updatedAt: "2026-08-19T00:00:00.000Z",
};

function renderHeader() {
  return render(
    <MemoryRouter>
      <PlatformHeader />
    </MemoryRouter>,
  );
}

describe("PlatformHeader profile menu", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    logoutMock.mockClear();
    useAuthMock.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("opens the authenticated account actions when the profile is hovered", async () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: authenticatedUser,
      logout: logoutMock,
    });

    renderHeader();

    const mainNavigation = screen.getByRole("navigation", {
      name: "Main navigation",
    });
    expect(
      within(mainNavigation).queryByRole("link", { name: "Library" }),
    ).toBeNull();

    const profileTrigger = screen.getByRole("button", {
      name: "Test Writer",
    });
    expect(profileTrigger.getAttribute("data-popup-open")).toBeNull();

    fireEvent.mouseEnter(profileTrigger);

    await waitFor(() => {
      expect(profileTrigger.getAttribute("data-popup-open")).not.toBeNull();
    });

    expect(await screen.findByRole("link", { name: "Library" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Write" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Notifications" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Analytics" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Log out" })).toBeTruthy();
  });

  it("logs out from the profile menu", async () => {
    useAuthMock.mockReturnValue({
      status: "authenticated",
      user: authenticatedUser,
      logout: logoutMock,
    });

    renderHeader();

    const profileTrigger = screen.getByRole("button", {
      name: "Test Writer",
    });
    fireEvent.mouseEnter(profileTrigger);
    fireEvent.click(await screen.findByRole("button", { name: "Log out" }));

    expect(logoutMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the anonymous login and registration actions unchanged", () => {
    useAuthMock.mockReturnValue({
      status: "anonymous",
      user: null,
      logout: logoutMock,
    });

    renderHeader();

    expect(screen.getByRole("link", { name: "Log in" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Register" })).toBeTruthy();
    expect(
      screen.queryByRole("navigation", { name: "Account menu" }),
    ).toBeNull();
  });
});
