import { useEffect, useMemo, useRef, useState } from "react";
import type { NavigateFunction } from "react-router-dom";

import type { AuthContextValue, AuthStatus } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../lib/error-message";
import type { ChapterResponse, StoryResponse } from "../../../types/story";
import { getReaderChapter, getReaderStory, recordReaderVisit } from "../api";
import { getChapterPath } from "../routes";

interface KeyedStory {
  key: string;
  response: StoryResponse;
}

interface KeyedChapter {
  key: string;
  response: ChapterResponse;
}

interface UseReaderContentOptions {
  slug: string;
  chapterId?: string;
  status: AuthStatus;
  request: AuthContextValue["request"];
  navigate: NavigateFunction;
}

export default function useReaderContent({
  slug,
  chapterId,
  status,
  request,
  navigate,
}: UseReaderContentOptions) {
  const [storyState, setStoryState] = useState<KeyedStory | null>(null);
  const [chapterState, setChapterState] = useState<KeyedChapter | null>(null);
  const [storyLoading, setStoryLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastProgressRef = useRef(-1);

  const story =
    storyState?.key === slug ? storyState.response.data.story : undefined;

  const publishedChapters = useMemo(
    () =>
      [...(story?.chapters ?? [])]
        .filter(
          (item) =>
            item.status === "PUBLISHED" && item.moderationState === "VISIBLE",
        )
        .sort((first, second) => first.position - second.position),
    [story?.chapters],
  );

  const requestedChapterId = chapterId || publishedChapters[0]?.id || "";
  const chapterKey =
    story && requestedChapterId ? `${story.id}:${requestedChapterId}` : null;
  const chapter =
    chapterKey && chapterState?.key === chapterKey
      ? chapterState.response.data.chapter
      : undefined;

  const currentChapterIndex = useMemo(
    () => publishedChapters.findIndex((item) => item.id === requestedChapterId),
    [publishedChapters, requestedChapterId],
  );

  const navigation = useMemo(
    () => ({
      previous:
        currentChapterIndex > 0
          ? publishedChapters[currentChapterIndex - 1]
          : undefined,
      next:
        currentChapterIndex >= 0 &&
        currentChapterIndex < publishedChapters.length - 1
          ? publishedChapters[currentChapterIndex + 1]
          : undefined,
    }),
    [currentChapterIndex, publishedChapters],
  );

  useEffect(() => {
    if (status === "loading") {
      return;
    }

    const controller = new AbortController();

    async function loadStory(): Promise<void> {
      setStoryLoading(true);
      setError(null);
      lastProgressRef.current = -1;

      try {
        const response = await getReaderStory(
          status,
          request,
          slug,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setStoryState({ key: slug, response });
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(cause));
        }
      } finally {
        if (!controller.signal.aborted) {
          setStoryLoading(false);
        }
      }
    }

    void loadStory();

    return () => controller.abort();
  }, [request, slug, status]);

  useEffect(() => {
    if (
      status === "loading" ||
      !story ||
      !requestedChapterId ||
      !chapterKey
    ) {
      return;
    }

    const controller = new AbortController();
    const currentStory = story;
    const currentChapterId = requestedChapterId;
    const currentChapterKey = chapterKey;

    async function loadChapter(): Promise<void> {
      setChapterLoading(true);
      setError(null);
      lastProgressRef.current = -1;

      try {
        const response = await getReaderChapter(
          status,
          request,
          currentStory.slug,
          currentChapterId,
          controller.signal,
        );

        if (controller.signal.aborted) {
          return;
        }

        setChapterState({ key: currentChapterKey, response });

        if (!chapterId) {
          navigate(getChapterPath(currentStory.slug, response.data.chapter.id), {
            replace: true,
          });
        }

        if (status === "authenticated") {
          void recordReaderVisit(
            request,
            currentStory.id,
            response.data.chapter.id,
          ).catch(() => undefined);
        }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(getErrorMessage(cause));
        }
      } finally {
        if (!controller.signal.aborted) {
          setChapterLoading(false);
        }
      }
    }

    void loadChapter();

    return () => controller.abort();
  }, [chapterId, chapterKey, navigate, request, requestedChapterId, status, story]);

  return {
    story,
    chapter,
    publishedChapters,
    requestedChapterId,
    currentChapterIndex,
    navigation,
    storyLoading,
    chapterLoading,
    error,
    setError,
    lastProgressRef,
  };
}
