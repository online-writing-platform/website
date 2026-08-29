import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import WriterStoryPage from "./WriterStoryPage";

import i18n from "../i18n";

const { requestMock, apiRequestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  apiRequestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({
    status: "authenticated",

    user: {
      id: "author-1",
      username: "writer",
      displayName: "Writer",
      avatarUrl: null,
    },

    request: requestMock,
  }),
}));

vi.mock("../lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/api")>();

  return {
    ...actual,
    apiRequest: apiRequestMock,
  };
});

beforeEach(async () => {
  await i18n.changeLanguage("fa");
});

afterEach(() => {
  cleanup();

  requestMock.mockReset();
  apiRequestMock.mockReset();
});

describe("WriterStoryPage scheduled story metadata", () => {
  it("does not send SCHEDULED status when only metadata of a scheduled story is edited", async () => {
    const storyId = "11111111-1111-4111-8111-111111111111";

    const storyResponse = {
      data: {
        story: {
          id: storyId,

          slug: "scheduled-story",

          title: "عنوان قبلی",

          description: "توضیحات قبلی",

          coverUrl: null,

          language: "fa",

          rights: "ALL_RIGHTS_RESERVED",

          status: "SCHEDULED",

          visibility: "PRIVATE",

          moderationState: "VISIBLE",

          isMature: false,

          publishedAt: null,

          scheduledAt: "2026-08-18T12:00:00.000Z",

          createdAt: "2026-08-18T05:00:00.000Z",

          updatedAt: "2026-08-18T05:30:00.000Z",

          author: {
            id: "author-1",

            username: "writer",

            displayName: "Writer",

            avatarUrl: null,
          },

          genre: null,

          tags: [],

          chapters: [],
        },
      },
    };

    const genresResponse = {
      data: {
        genres: [],
      },
    };

    requestMock.mockImplementation((path: string, options?: RequestInit) => {
      if (options?.method === "PATCH") {
        return Promise.resolve(storyResponse);
      }

      if (path.includes("/genres")) {
        return Promise.resolve(genresResponse);
      }

      if (
        path.includes("/stories/mine/") ||
        path.includes(`/stories/${storyId}`)
      ) {
        return Promise.resolve(storyResponse);
      }

      return Promise.reject(
        new Error(
          `Unexpected authenticated request in WriterStoryPage test: ${path}`,
        ),
      );
    });

    apiRequestMock.mockImplementation((path: string) => {
      if (path.includes("/genres")) {
        return Promise.resolve(genresResponse);
      }

      return Promise.reject(
        new Error(
          `Unexpected anonymous request in WriterStoryPage test: ${path}`,
        ),
      );
    });

    render(
      <MemoryRouter initialEntries={[`/write/${storyId}`]}>
        <Routes>
          <Route path="/write/:storyId" element={<WriterStoryPage />} />
        </Routes>
      </MemoryRouter>,
    );

    const titleInput = await screen.findByDisplayValue("عنوان قبلی");

    fireEvent.change(titleInput, {
      target: {
        value: "عنوان جدید",
      },
    });

    const saveButton = screen.getByRole("button", {
      name: /ذخیره مشخصات/u,
    });

    fireEvent.click(saveButton);

    await waitFor(() => {
      const patchCall = requestMock.mock.calls.find((call) => {
        const options = call[1] as RequestInit | undefined;

        return options?.method === "PATCH";
      });

      expect(patchCall).toBeDefined();
    });

    const patchCall = requestMock.mock.calls.find((call) => {
      const options = call[1] as RequestInit | undefined;

      return options?.method === "PATCH";
    });

    expect(patchCall).toBeDefined();

    const patchOptions = patchCall?.[1] as RequestInit | undefined;

    expect(typeof patchOptions?.body).toBe("string");

    const body = JSON.parse(String(patchOptions?.body)) as Record<
      string,
      unknown
    >;

    expect(body.title).toBe("عنوان جدید");

    expect(Object.prototype.hasOwnProperty.call(body, "status")).toBe(false);
  });
});
