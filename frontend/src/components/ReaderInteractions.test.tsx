import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../i18n";
import ReaderInteractions from "./ReaderInteractions";

const authMocks = vi.hoisted(() => ({
  request: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({
    status: "authenticated",
    user: { id: "viewer-1", username: "viewer" },
    request: authMocks.request,
  }),
}));

const baseComment = {
  id: "comment-1",
  chapterId: "chapter-1",
  parentId: null,
  content: "نظر اصلی",
  status: "ACTIVE" as const,
  createdAt: "2026-01-01T10:00:00.000Z",
  updatedAt: "2026-01-01T10:00:00.000Z",
  replyCount: 1,
  author: {
    id: "author-2",
    username: "author",
    displayName: "نویسنده",
    avatarUrl: null,
  },
};

const reply = {
  ...baseComment,
  id: "reply-1",
  parentId: "comment-1",
  content: "پاسخ موجود",
  replyCount: 0,
};

function page(
  comments: Array<typeof baseComment | typeof reply>,
  hasMore = false,
  nextCursor: string | null = null,
) {
  return {
    data: {
      comments,
      pagination: { hasMore, nextCursor },
    },
  };
}

function installRequestHandler(
  topComment = baseComment,
  topPage = page([topComment]),
) {
  authMocks.request.mockImplementation(
    (path: string, options: RequestInit = {}) => {
      const method = options.method ?? "GET";

      if (path.endsWith("/votes")) {
        return Promise.resolve({ data: { votes: 4 } });
      }

      if (path.endsWith("/vote") && method === "GET") {
        return Promise.resolve({ data: { votes: 4, voted: false } });
      }

      if (path.includes("/comments/comment-1/replies")) {
        return Promise.resolve(page([reply]));
      }

      if (path.endsWith("/comments") && method === "POST") {
        return Promise.resolve({
          data: {
            comment: {
              ...reply,
              id: "reply-2",
              content: "پاسخ تازه",
              author: {
                id: "viewer-1",
                username: "viewer",
                displayName: "خواننده",
                avatarUrl: null,
              },
            },
          },
        });
      }

      if (path.includes("/comments?") && method === "GET") {
        return Promise.resolve(topPage);
      }

      throw new Error(`Unexpected request: ${method} ${path}`);
    },
  );
}

describe("ReaderInteractions", () => {
  beforeEach(async () => {
    authMocks.request.mockReset();
    await i18n.changeLanguage("fa");
  });

  it("loads replies and creates a reply with the parent id", async () => {
    installRequestHandler();
    render(
      <MemoryRouter initialEntries={["/stories/story/chapters/chapter-1"]}>
        <ReaderInteractions chapterId="chapter-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("نظر اصلی")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: /نمایش پاسخ‌ها \(۱\)/u }),
    );
    expect(await screen.findByText("پاسخ موجود")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /^پاسخ$/u }));
    fireEvent.change(screen.getByLabelText("پاسخ شما"), {
      target: { value: "پاسخ تازه" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ارسال پاسخ" }));

    expect(await screen.findByText("پاسخ تازه")).toBeTruthy();
    const postCall = authMocks.request.mock.calls.find(
      ([path, options]) =>
        String(path).endsWith("/comments") && options?.method === "POST",
    );

    expect(postCall).toBeTruthy();
    expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
      content: "پاسخ تازه",
      parentId: "comment-1",
    });
  });

  it("edits and soft-deletes an owned comment", async () => {
    const ownedComment = {
      ...baseComment,
      replyCount: 0,
      author: {
        id: "viewer-1",
        username: "viewer",
        displayName: "خواننده",
        avatarUrl: null,
      },
    };
    installRequestHandler(ownedComment, page([ownedComment]));
    const baseHandler = authMocks.request.getMockImplementation();
    authMocks.request.mockImplementation(
      (path: string, options: RequestInit = {}) => {
        if (path === "/api/v1/comments/comment-1" && options.method === "PATCH") {
          return Promise.resolve({
            data: {
              comment: {
                ...ownedComment,
                content: "نظر ویرایش‌شده",
                updatedAt: "2026-01-01T10:05:00.000Z",
              },
            },
          });
        }

        if (path === "/api/v1/comments/comment-1" && options.method === "DELETE") {
          return Promise.resolve(undefined);
        }

        return baseHandler?.(path, options);
      },
    );

    render(
      <MemoryRouter>
        <ReaderInteractions chapterId="chapter-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("نظر اصلی")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ویرایش" }));
    fireEvent.change(screen.getByLabelText("ویرایش نظر"), {
      target: { value: "نظر ویرایش‌شده" },
    });
    fireEvent.click(screen.getByRole("button", { name: "ذخیره ویرایش" }));
    expect(await screen.findByText("نظر ویرایش‌شده")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "حذف" }));
    fireEvent.click(screen.getByRole("button", { name: "بله، حذف شود" }));
    expect(
      await screen.findByText("این نظر در دسترس نیست."),
    ).toBeTruthy();
    expect(authMocks.request).toHaveBeenCalledWith(
      "/api/v1/comments/comment-1",
      { method: "DELETE" },
    );
  });

  it("loads the next page without discarding the first page", async () => {
    const secondComment = {
      ...baseComment,
      id: "comment-2",
      content: "نظر صفحه دوم",
      replyCount: 0,
    };
    installRequestHandler(baseComment, page([baseComment], true, "comment-1"));
    const baseHandler = authMocks.request.getMockImplementation();
    authMocks.request.mockImplementation(
      (path: string, options: RequestInit = {}) => {
        if (path.includes("cursor=comment-1")) {
          return Promise.resolve(page([secondComment]));
        }

        return baseHandler?.(path, options);
      },
    );

    render(
      <MemoryRouter>
        <ReaderInteractions chapterId="chapter-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("نظر اصلی")).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "نمایش نظرهای بیشتر" }),
    );

    expect(await screen.findByText("نظر صفحه دوم")).toBeTruthy();
    expect(screen.getByText("نظر اصلی")).toBeTruthy();
    await waitFor(() => {
      expect(authMocks.request).toHaveBeenCalledWith(
        expect.stringContaining("cursor=comment-1"),
      );
    });
  });

  it("uses the interface direction for comments", async () => {
    await i18n.changeLanguage("en");
    installRequestHandler();

    render(
      <MemoryRouter>
        <ReaderInteractions chapterId="chapter-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("نظر اصلی")).toBeTruthy();
    expect(document.getElementById("comment-comment-1")?.dir).toBe("ltr");
    expect(
      screen.getByRole("heading", { name: "Discussion about this chapter" }),
    ).toBeTruthy();
  });

  it("reveals and expands a directly linked reply", async () => {
    installRequestHandler(baseComment, page([]));
    const baseHandler = authMocks.request.getMockImplementation();
    authMocks.request.mockImplementation(
      (path: string, options: RequestInit = {}) => {
        if (path.endsWith("/comments/comment-1")) {
          return Promise.resolve({ data: { comment: baseComment } });
        }

        if (path.endsWith("/comments/reply-1")) {
          return Promise.resolve({ data: { comment: reply } });
        }

        return baseHandler?.(path, options);
      },
    );

    render(
      <MemoryRouter
        initialEntries={[
          "/stories/story/chapters/chapter-1#comment=reply-1&parent=comment-1",
        ]}
      >
        <ReaderInteractions chapterId="chapter-1" />
      </MemoryRouter>,
    );

    expect(await screen.findByText("نظر اصلی")).toBeTruthy();
    expect(await screen.findByText("پاسخ موجود")).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "بستن پاسخ‌ها" }).getAttribute(
        "aria-expanded",
      ),
    ).toBe("true");
  });
});
