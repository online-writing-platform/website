import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";

import { MemoryRouter, Route, Routes } from "react-router-dom";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiError } from "../lib/api";
import i18n from "../i18n";

import type { Chapter, ChapterResponse } from "../types/story";

import ChapterEditorPage from "./ChapterEditorPage";

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  default: () => ({
    request: requestMock,
  }),
}));

vi.mock("../components/RichTextEditor", () => ({
  default: ({
    id,
    label,
    direction,
    language,
    onChange,
    onCharacterCountChange,
    onWordCountChange,
    placeholder,
    value,
  }: {
    direction: "rtl" | "ltr" | "auto";
    id: string;
    label: string;
    language?: "fa" | "en";
    onChange: (value: string) => void;
    onCharacterCountChange?: (characterCount: number) => void;
    onWordCountChange?: (wordCount: number) => void;
    placeholder?: string;
    value: string;
  }) => (
    <textarea
      id={id}
      aria-label={label}
      dir={direction}
      lang={language}
      placeholder={placeholder}
      value={value}
      onChange={(event) => {
        const nextValue = event.target.value;

        onChange(nextValue);
        onCharacterCountChange?.(nextValue.length);
        onWordCountChange?.(
          nextValue.trim() ? nextValue.trim().split(/\s+/u).length : 0,
        );
      }}
    />
  ),
}));

afterEach(async () => {
  cleanup();

  await i18n.changeLanguage("fa");
});

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;

  let reject!: (reason?: unknown) => void;

  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    promise,
    resolve,
    reject,
  };
}

const initialChapter: Chapter = {
  id: "chapter-1",

  title: "فصل تست",

  position: 1,

  content: "",

  version: 1,

  status: "DRAFT",

  moderationState: "VISIBLE",

  wordCount: 0,

  publishedAt: null,

  createdAt: "2026-08-17T00:00:00.000Z",

  updatedAt: "2026-08-17T00:00:00.000Z",
};

describe("ChapterEditorPage autosave and publish concurrency", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("fa");

    requestMock.mockReset();

    localStorage.clear();
  });

  it("does not lose edits made while an older save is in flight", async () => {
    const firstPatch = deferred<ChapterResponse>();

    const secondPatch = deferred<ChapterResponse>();

    const patchBodies: Array<{
      title: string;
      content: string;
      expectedVersion: number;
    }> = [];

    requestMock.mockImplementation(
      (path: string, options: RequestInit = {}) => {
        if (path === "/api/v1/stories/mine/story-1/chapters/chapter-1") {
          return Promise.resolve({
            data: {
              chapter: initialChapter,
            },
          });
        }

        if (path === "/api/v1/stories/mine/story-1") {
          return Promise.resolve({
            data: {
              story: {
                language: "fa",
              },
            },
          });
        }

        if (
          path === "/api/v1/stories/story-1/chapters/chapter-1" &&
          options.method === "PATCH"
        ) {
          const body = JSON.parse(String(options.body)) as {
            title: string;
            content: string;
            expectedVersion: number;
          };

          patchBodies.push(body);

          if (patchBodies.length === 1) {
            return firstPatch.promise;
          }

          if (patchBodies.length === 2) {
            return secondPatch.promise;
          }
        }

        throw new Error(
          `Unexpected request: ${options.method ?? "GET"} ${path}`,
        );
      },
    );

    render(
      <MemoryRouter initialEntries={["/write/story-1/chapters/chapter-1"]}>
        <Routes>
          <Route
            path="/write/:storyId/chapters/:chapterId"
            element={<ChapterEditorPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const editor = await screen.findByLabelText("متن فصل");

    fireEvent.change(editor, {
      target: {
        value: "AAAA",
      },
    });

    await waitFor(
      () => {
        expect(patchBodies).toHaveLength(1);
      },
      {
        timeout: 2500,
      },
    );

    expect(patchBodies[0]).toMatchObject({
      content: "AAAA",
      expectedVersion: 1,
    });

    fireEvent.change(editor, {
      target: {
        value: "AAAABBBB",
      },
    });

    await act(async () => {
      firstPatch.resolve({
        data: {
          chapter: {
            ...initialChapter,

            content: "AAAA",

            version: 2,

            wordCount: 1,

            updatedAt: "2026-08-17T00:00:05.000Z",
          },
        },
      });

      await Promise.resolve();
    });

    await waitFor(
      () => {
        expect(patchBodies).toHaveLength(2);
      },
      {
        timeout: 2500,
      },
    );

    expect(patchBodies[1]).toMatchObject({
      content: "AAAABBBB",

      expectedVersion: 2,
    });

    const recoveryBeforeSecondSave = localStorage.getItem(
      "writing-platform:draft:story-1:chapter-1",
    );

    expect(recoveryBeforeSecondSave).not.toBeNull();

    expect(recoveryBeforeSecondSave).toContain("AAAABBBB");

    await act(async () => {
      secondPatch.resolve({
        data: {
          chapter: {
            ...initialChapter,

            content: "AAAABBBB",

            version: 3,

            wordCount: 1,

            updatedAt: "2026-08-17T00:00:06.000Z",
          },
        },
      });

      await Promise.resolve();
    });

    await waitFor(() => {
      expect(screen.getByText("ذخیره شد · نسخه 3")).toBeTruthy();
    });

    expect(
      localStorage.getItem("writing-platform:draft:story-1:chapter-1"),
    ).toBeNull();
  }, 7000);

  it("does not publish when saving the latest draft hits a version conflict", async () => {
    let publishWasCalled = false;

    requestMock.mockImplementation(
      (path: string, options: RequestInit = {}) => {
        if (path === "/api/v1/stories/mine/story-1/chapters/chapter-1") {
          return Promise.resolve({
            data: {
              chapter: initialChapter,
            },
          });
        }

        if (path === "/api/v1/stories/mine/story-1") {
          return Promise.resolve({
            data: {
              story: {
                language: "fa",
              },
            },
          });
        }

        if (
          path === "/api/v1/stories/story-1/chapters/chapter-1" &&
          options.method === "PATCH"
        ) {
          return Promise.reject(
            new ApiError(
              409,

              "CHAPTER_EDIT_CONFLICT",

              "The chapter has been modified by another request.",

              {
                currentVersion: 2,

                updatedAt: "2026-08-17T08:00:00.000Z",
              },
            ),
          );
        }

        if (
          path === "/api/v1/stories/story-1/chapters/chapter-1/publish" &&
          options.method === "POST"
        ) {
          publishWasCalled = true;

          return Promise.resolve({
            data: {
              chapter: {
                ...initialChapter,

                status: "PUBLISHED",

                version: 2,

                publishedAt: "2026-08-17T08:01:00.000Z",
              },
            },
          });
        }

        throw new Error(
          `Unexpected request: ${options.method ?? "GET"} ${path}`,
        );
      },
    );

    render(
      <MemoryRouter initialEntries={["/write/story-1/chapters/chapter-1"]}>
        <Routes>
          <Route
            path="/write/:storyId/chapters/:chapterId"
            element={<ChapterEditorPage />}
          />
        </Routes>
      </MemoryRouter>,
    );

    const editor = await screen.findByLabelText("متن فصل");

    fireEvent.change(editor, {
      target: {
        value: "متن جدیدی که فقط در Tab B نوشته شده",
      },
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "انتشار فصل",
      }),
    );

    await waitFor(() => {
      expect(screen.getByText("تعارض ویرایش")).toBeTruthy();
    });

    expect(publishWasCalled).toBe(false);

    const publishCalls = requestMock.mock.calls.filter(
      ([path, options]) =>
        path === "/api/v1/stories/story-1/chapters/chapter-1/publish" &&
        options?.method === "POST",
    );

    expect(publishCalls).toHaveLength(0);

    const recovery = localStorage.getItem(
      "writing-platform:draft:story-1:chapter-1",
    );

    expect(recovery).not.toBeNull();

    expect(recovery).toContain("متن جدیدی که فقط در Tab B نوشته شده");
  }, 7000);

  it.each([
    [
      "en",
      "fa",
      "ltr",
      "rtl",
      "Chapter text",
      "Start writing this chapter…",
      "Publish chapter",
      "Persian · RTL",
    ],
    [
      "fa",
      "en",
      "rtl",
      "ltr",
      "متن فصل",
      "نوشتن این فصل را شروع کنید…",
      "انتشار فصل",
      "انگلیسی · LTR",
    ],
  ] as const)(
    "keeps the %s interface independent from %s story direction",
    async (
      interfaceLanguage,
      storyLanguage,
      interfaceDirection,
      storyDirection,
      contentLabel,
      placeholder,
      publishLabel,
      languageBadge,
    ) => {
      await i18n.changeLanguage(interfaceLanguage);

      requestMock.mockImplementation((path: string) => {
        if (path === "/api/v1/stories/mine/story-1/chapters/chapter-1") {
          return Promise.resolve({
            data: {
              chapter: initialChapter,
            },
          });
        }

        if (path === "/api/v1/stories/mine/story-1") {
          return Promise.resolve({
            data: {
              story: {
                language: storyLanguage,
              },
            },
          });
        }

        throw new Error(`Unexpected request: GET ${path}`);
      });

      render(
        <MemoryRouter initialEntries={["/write/story-1/chapters/chapter-1"]}>
          <Routes>
            <Route
              path="/write/:storyId/chapters/:chapterId"
              element={<ChapterEditorPage />}
            />
          </Routes>
        </MemoryRouter>,
      );

      const editor = await screen.findByLabelText(contentLabel);
      const page = editor.closest("main");

      expect(page?.getAttribute("dir")).toBe(interfaceDirection);
      expect(page?.getAttribute("lang")).toBe(interfaceLanguage);
      expect(editor.getAttribute("dir")).toBe(storyDirection);
      expect(editor.getAttribute("lang")).toBe(storyLanguage);
      expect(editor.getAttribute("placeholder")).toBe(placeholder);
      expect(screen.getByLabelText(languageBadge)).toBeTruthy();
      expect(
        screen.getByRole("button", {
          name: publishLabel,
        }),
      ).toBeTruthy();
    },
  );
});
