import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthContextValue } from "../../../context/AuthContext";
import type { Chapter, ChapterResponse } from "../../../types/story";
import useChapterAutosave, {
  getChapterDraftKey,
} from "./useChapterAutosave";

const chapter: Chapter = {
  id: "chapter-1",
  title: "فصل اول",
  position: 1,
  content: "متن اولیه",
  version: 1,
  status: "DRAFT",
  moderationState: "VISIBLE",
  wordCount: 2,
  publishedAt: null,
  createdAt: "2026-08-17T00:00:00.000Z",
  updatedAt: "2026-08-17T00:00:00.000Z",
};

describe("useChapterAutosave", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it("persists a recovery copy before saving and clears it after success", async () => {
    const savedChapter: ChapterResponse = {
      data: {
        chapter: {
          ...chapter,
          content: "متن تازه",
          version: 2,
          updatedAt: "2026-08-17T00:01:00.000Z",
        },
      },
    };

    const requestMock = vi.fn().mockResolvedValue(savedChapter);
    const request = requestMock as AuthContextValue["request"];

    const { result } = renderHook(() =>
      useChapterAutosave({
        storyId: "story-1",
        chapterId: "chapter-1",
        request,
        autosaveDelay: 60_000,
      }),
    );

    act(() => {
      result.current.initializeChapter(chapter);
      result.current.changeContent("متن تازه");
    });

    const storageKey = getChapterDraftKey("story-1", "chapter-1");

    expect(localStorage.getItem(storageKey)).toContain("متن تازه");
    expect(result.current.status.type).toBe("local-pending");

    await act(async () => {
      await result.current.save();
    });

    await waitFor(() => {
      expect(result.current.status).toEqual({ type: "saved", version: 2 });
    });

    expect(localStorage.getItem(storageKey)).toBeNull();
    expect(requestMock).toHaveBeenCalledWith(
      "/api/v1/stories/story-1/chapters/chapter-1",
      expect.objectContaining({ method: "PATCH" }),
    );
  });
});
