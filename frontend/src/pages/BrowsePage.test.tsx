import { cleanup, render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import BrowsePage from "./BrowsePage";

const { apiRequestMock, useAuthMock } = vi.hoisted(() => ({
  apiRequestMock: vi.fn(),
  useAuthMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: useAuthMock,
}));

vi.mock("../lib/api", () => ({
  apiRequest: apiRequestMock,
}));

describe("BrowsePage API connection", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");

    apiRequestMock.mockReset();

    useAuthMock.mockReturnValue({
      status: "anonymous",
      request: vi.fn(),
    });

    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/api/v1/stories/genres") {
        return Promise.resolve({
          data: {
            genres: [
              {
                slug: "fantasy",
                name: "Fantasy",
              },
            ],
          },
        });
      }

      return Promise.resolve({
        data: {
          stories: [],
          pagination: {
            page: 1,
            limit: 20,
            hasMore: false,
          },
        },
      });
    });
  });

  afterEach(() => {
    cleanup();
  });

  it("sends the URL search and filters to the stories search API", async () => {
    render(
      <MemoryRouter
        initialEntries={[
          "/browse?q=magic&genre=fantasy&language=en&sort=mostVoted",
        ]}
      >
        <Routes>
          <Route path="/browse" element={<BrowsePage />} />
        </Routes>
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(apiRequestMock).toHaveBeenCalledWith(
        "/api/v1/search?type=stories&sort=mostVoted&page=1&limit=20&q=magic&genre=fantasy&language=en",
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        }),
      );
    });
  });
});
