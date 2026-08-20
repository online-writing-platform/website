import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, useParams } from "react-router-dom";

import ReaderInteractions from "../components/ReaderInteractions";
import useAuth from "../hooks/useAuth";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { ChapterResponse, StoryResponse } from "../types/story";

import "./ReaderPage.css";

type ReaderTheme = "SYSTEM" | "LIGHT" | "DARK" | "SEPIA";

interface PreferenceResponse {
  data: {
    preferences: {
      readerTheme: ReaderTheme;
      fontScale: number;
      lineHeight: number;
    };
  };
}

interface ReaderSettings {
  theme: ReaderTheme;
  fontScale: number;
  lineHeight: number;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "SYSTEM",
  fontScale: 1,
  lineHeight: 1.75,
};

const RTL_LANGUAGES = new Set(["fa", "ar", "ur", "he", "ps", "ku"]);

function contentDirection(language: string): "rtl" | "ltr" {
  return RTL_LANGUAGES.has(language.toLowerCase().split("-")[0] ?? "")
    ? "rtl"
    : "ltr";
}

export default function ReaderPage() {
  const { slug = "", chapterId = "" } = useParams();
  const { status, request } = useAuth();
  const [storyResponse, setStoryResponse] = useState<StoryResponse | null>(
    null,
  );
  const [chapterResponse, setChapterResponse] =
    useState<ChapterResponse | null>(null);
  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);
  const [error, setError] = useState<string | null>(null);
  const lastProgressRef = useRef(-1);

  const story = storyResponse?.data.story;
  const chapter = chapterResponse?.data.chapter;

  useDocumentMeta({
    title: chapter && story ? `${chapter.title} — ${story.title}` : "مطالعه",
    description: story?.description,
    canonicalPath:
      story && chapter
        ? `/stories/${story.slug}/chapters/${chapter.id}`
        : undefined,
  });

  useEffect(() => {
    let active = true;

    async function load(): Promise<void> {
      setError(null);
      const storyPath = `/api/v1/stories/${encodeURIComponent(slug)}`;

      const chapterPath = `/api/v1/stories/${encodeURIComponent(slug)}/chapters/${encodeURIComponent(chapterId)}`;

      const storyResult =
          status === "authenticated"
              ? await request<StoryResponse>(storyPath)
              : await apiRequest<StoryResponse>(storyPath);

      const chapterResult =
          status === "authenticated"
              ? await request<ChapterResponse>(chapterPath)
              : await apiRequest<ChapterResponse>(chapterPath);

      if (!active) return;
      setStoryResponse(storyResult);
      setChapterResponse(chapterResult);

      if (status === "authenticated") {
        try {
          const preferenceResult = await request<PreferenceResponse>(
            "/api/v1/preferences",
          );
          if (active) {
            setSettings({
              theme: preferenceResult.data.preferences.readerTheme,
              fontScale: preferenceResult.data.preferences.fontScale,
              lineHeight: preferenceResult.data.preferences.lineHeight,
            });
          }
        } catch {
          // Reading remains available with safe local defaults.
        }

        void request("/api/v1/analytics/reads", {
          method: "POST",
          body: JSON.stringify({
            storyId: storyResult.data.story.id,
            chapterId: chapterResult.data.chapter.id,
          }),
        }).catch(() => undefined);
      }
    }

    void load().catch((cause) => {
      if (active) setError(getErrorMessage(cause));
    });

    return () => {
      active = false;
    };
  }, [chapterId, request, slug, status]);

  useEffect(() => {
    if (status !== "authenticated" || !story || !chapter) return undefined;

    const currentStoryId = story.id;
    const currentChapterId = chapter.id;

    let timeoutId: number | undefined;
    function persistProgress(): void {
      const root = document.documentElement;
      const scrollable = Math.max(1, root.scrollHeight - window.innerHeight);
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable));

      if (
        Math.abs(progress - lastProgressRef.current) < 0.03 &&
        progress < 0.99
      ) {
        return;
      }
      lastProgressRef.current = progress;

      window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        void request("/api/v1/reading-progress", {
          method: "PUT",
          body: JSON.stringify({
            storyId: currentStoryId,
            chapterId: currentChapterId,
            progress,
          }),
        }).catch(() => undefined);
      }, 400);
    }

    window.addEventListener("scroll", persistProgress, { passive: true });
    persistProgress();

    return () => {
      window.removeEventListener("scroll", persistProgress);
      window.clearTimeout(timeoutId);
    };
  }, [chapter, request, status, story]);

  const navigation = useMemo(() => {
    if (!story?.chapters || !chapter)
      return { previous: undefined, next: undefined };
    const index = story.chapters.findIndex((item) => item.id === chapter.id);
    return {
      previous: index > 0 ? story.chapters[index - 1] : undefined,
      next: index >= 0 ? story.chapters[index + 1] : undefined,
    };
  }, [chapter, story]);

  async function updateSettings(next: Partial<ReaderSettings>): Promise<void> {
    const value = { ...settings, ...next };
    setSettings(value);

    if (status === "authenticated") {
      await request("/api/v1/preferences", {
        method: "PATCH",
        body: JSON.stringify({
          readerTheme: value.theme,
          fontScale: value.fontScale,
          lineHeight: value.lineHeight,
        }),
      }).catch(() => undefined);
    }
  }

  if (error) {
    return (
      <main className="page-shell">
        <p className="status-message status-message--error">{error}</p>
      </main>
    );
  }

  if (!story || !chapter) {
    return (
      <main className="page-shell">
        <p className="status-message">در حال بارگذاری فصل…</p>
      </main>
    );
  }

  const direction = contentDirection(story.language);

  return (
    <main
      className={`reader reader--${settings.theme.toLowerCase()}`}
      style={
        {
          "--reader-font-scale": String(settings.fontScale),
          "--reader-line-height": String(settings.lineHeight),
        } as CSSProperties
      }
    >
      <div className="reader__toolbar" aria-label="تنظیمات مطالعه">
        <Link to={`/stories/${story.slug}`}>← {story.title}</Link>
        <label>
          پوسته
          <select
            value={settings.theme}
            onChange={(event) =>
              void updateSettings({ theme: event.target.value as ReaderTheme })
            }
          >
            <option value="SYSTEM">سیستم</option>
            <option value="LIGHT">روشن</option>
            <option value="DARK">تیره</option>
            <option value="SEPIA">سپیا</option>
          </select>
        </label>
        <label>
          اندازه متن
          <input
            type="range"
            min="0.8"
            max="1.5"
            step="0.05"
            value={settings.fontScale}
            onChange={(event) =>
              void updateSettings({ fontScale: Number(event.target.value) })
            }
          />
        </label>
        <label>
          فاصله خطوط
          <input
            type="range"
            min="1.3"
            max="2.2"
            step="0.05"
            value={settings.lineHeight}
            onChange={(event) =>
              void updateSettings({ lineHeight: Number(event.target.value) })
            }
          />
        </label>
      </div>

      <article className="reader__paper" dir={direction}>
        <header className="reader__heading">
          <p>{story.title}</p>
          <h1>{chapter.title}</h1>
          <span>{chapter.wordCount.toLocaleString("fa-IR")} واژه</span>
        </header>
        <div className="reader__content">
          {(chapter.content ?? "").split(/\n{2,}/u).map((paragraph, index) => (
            <p key={`${index}-${paragraph.slice(0, 20)}`}>{paragraph}</p>
          ))}
        </div>
      </article>

      <nav className="reader__navigation" aria-label="فصل‌ها">
        {navigation.previous ? (
          <Link
            className="button button--secondary"
            to={`/stories/${story.slug}/chapters/${navigation.previous.id}`}
          >
            فصل قبل
          </Link>
        ) : (
          <span />
        )}
        {navigation.next ? (
          <Link
            className="button"
            to={`/stories/${story.slug}/chapters/${navigation.next.id}`}
          >
            فصل بعد
          </Link>
        ) : (
          <span />
        )}
      </nav>

      <div className="reader__discussion">
        <ReaderInteractions chapterId={chapter.id} />
      </div>
    </main>
  );
}
