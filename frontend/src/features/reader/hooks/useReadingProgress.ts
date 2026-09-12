import { useEffect, type RefObject } from "react";

import type { AuthContextValue, AuthStatus } from "../../../context/AuthContext";
import { saveReadingProgress } from "../api";

interface UseReadingProgressOptions {
  status: AuthStatus;
  storyId?: string;
  chapterId?: string;
  request: AuthContextValue["request"];
  contentRef: RefObject<HTMLElement | null>;
}

export default function useReadingProgress({
  status,
  storyId,
  chapterId,
  request,
  contentRef,
}: UseReadingProgressOptions): void {
  useEffect(() => {
    if (status !== "authenticated" || !storyId || !chapterId) {
      return;
    }

    const currentStoryId = storyId;
    const currentChapterId = chapterId;
    let timeoutId: number | undefined;
    let lastProgress = -1;

    function persistProgress(): void {
      const contentElement = contentRef.current;

      if (!contentElement) {
        return;
      }

      const contentTop =
        contentElement.getBoundingClientRect().top + window.scrollY;
      const contentHeight = Math.max(1, contentElement.offsetHeight);
      const currentPosition = window.scrollY + window.innerHeight - contentTop;
      const progress = Math.min(
        1,
        Math.max(0, currentPosition / contentHeight),
      );

      if (Math.abs(progress - lastProgress) < 0.03 && progress < 0.99) {
        return;
      }

      lastProgress = progress;
      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void saveReadingProgress(
          request,
          currentStoryId,
          currentChapterId,
          progress,
        ).catch(() => undefined);
      }, 400);
    }

    window.addEventListener("scroll", persistProgress, { passive: true });
    persistProgress();

    return () => {
      window.removeEventListener("scroll", persistProgress);
      window.clearTimeout(timeoutId);
    };
  }, [chapterId, contentRef, request, status, storyId]);
}
