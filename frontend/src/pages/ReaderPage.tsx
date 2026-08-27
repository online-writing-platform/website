import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Heart,
  Library,
  List,
  Settings2,
  Share2,
  X,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import ReaderInteractions from "../components/ReaderInteractions";
import ReportForm from "../components/ReportForm";
import useAuth from "../hooks/useAuth";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type { Chapter, ChapterResponse, StoryResponse } from "../types/story";

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

interface LibraryStatusResponse {
  data: {
    inLibrary: boolean;
  };
}

interface LibraryState {
  key: string;
  inLibrary: boolean;
}

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: "SYSTEM",
  fontScale: 1,
  lineHeight: 1.75,
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  SCHEDULED: "زمان‌بندی‌شده",
  ONGOING: "در حال انتشار",
  COMPLETED: "تکمیل‌شده",
  HIATUS: "متوقف‌شده",
};

function getChapterPath(slug: string, chapterId: string): string {
  return `/stories/${encodeURIComponent(
    slug,
  )}/chapters/${encodeURIComponent(chapterId)}`;
}

function getInitials(value: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "؟";
  }

  return normalizedValue.slice(0, 1).toUpperCase();
}

export default function ReaderPage() {
  const { slug = "", chapterId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { status, request, user } = useAuth();

  const [storyResponse, setStoryResponse] = useState<StoryResponse | null>(
    null,
  );

  const [chapterResponse, setChapterResponse] =
    useState<ChapterResponse | null>(null);

  const [settings, setSettings] = useState<ReaderSettings>(DEFAULT_SETTINGS);

  const [showTableOfContents, setShowTableOfContents] = useState(false);
  const [showReaderSettings, setShowReaderSettings] = useState(false);

  const [storyLoading, setStoryLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  const [libraryState, setLibraryState] = useState<LibraryState | null>(null);

  const [libraryPending, setLibraryPending] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);

  const lastProgressRef = useRef(-1);
  const chapterContentRef = useRef<HTMLElement | null>(null);

  const story = storyResponse?.data.story;
  const chapter = chapterResponse?.data.chapter;

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

  const interfaceLocale = i18n.resolvedLanguage?.startsWith("en")
    ? "en-US"
    : "fa-IR";

  const storyTextAttributes = story
    ? getStoryTextAttributes(story.language)
    : undefined;

  const libraryKey =
    status === "authenticated" && user && story
      ? `${user.id}:${story.id}`
      : null;

  const isInLibrary =
    libraryKey !== null && libraryState?.key === libraryKey
      ? libraryState.inLibrary
      : null;

  useDocumentMeta({
    title:
      story && chapter
        ? `${chapter.title} — ${story.title}`
        : story
          ? story.title
          : "مطالعه",

    description: story?.description.slice(0, 160),

    canonicalPath:
      story && chapter
        ? getChapterPath(story.slug, chapter.id)
        : `/stories/${slug}`,

    image: story?.coverUrl ?? undefined,
  });

  /*
   * ابتدا اطلاعات کلی داستان و فهرست فصل‌های منتشرشده دریافت می‌شود.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadStory(): Promise<void> {
      setStoryLoading(true);
      setError(null);
      setChapterResponse(null);
      setLibraryState(null);
      setLibraryMessage(null);
      lastProgressRef.current = -1;

      const path = `/api/v1/stories/${encodeURIComponent(slug)}`;

      try {
        const result =
          status === "authenticated"
            ? await request<StoryResponse>(path, {
                signal: controller.signal,
              })
            : await apiRequest<StoryResponse>(path, {
                signal: controller.signal,
              });

        if (controller.signal.aborted) {
          return;
        }

        setStoryResponse(result);
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

  /*
   * بعد از دریافت داستان، فصل انتخاب‌شده یا اولین فصل منتشرشده
   * در همان صفحه دریافت می‌شود.
   */
  useEffect(() => {
    if (!story || !requestedChapterId) {
      setChapterResponse(null);
      return;
    }

    /*
     * پس از این بررسی، یک ارجاع ثابت می‌سازیم تا TypeScript
     * بداند مقدار داستان داخل تابع async نیز تعریف‌شده است.
     */
    const currentStory = story;
    const currentChapterId = requestedChapterId;
    const controller = new AbortController();

    async function loadChapter(): Promise<void> {
      setChapterLoading(true);
      setError(null);
      lastProgressRef.current = -1;

      const path =
        `/api/v1/stories/${encodeURIComponent(currentStory.slug)}` +
        `/chapters/${encodeURIComponent(currentChapterId)}`;

      try {
        const result =
          status === "authenticated"
            ? await request<ChapterResponse>(path, {
                signal: controller.signal,
              })
            : await apiRequest<ChapterResponse>(path, {
                signal: controller.signal,
              });

        if (controller.signal.aborted) {
          return;
        }

        setChapterResponse(result);

        /*
         * اگر کاربر از مسیر اصلی داستان وارد شده باشد،
         * آدرس مرورگر با شناسهٔ فصل واقعی هماهنگ می‌شود.
         */
        if (!chapterId) {
          navigate(getChapterPath(currentStory.slug, result.data.chapter.id), {
            replace: true,
          });
        }

        if (status === "authenticated") {
          void request("/api/v1/analytics/reads", {
            method: "POST",
            body: JSON.stringify({
              storyId: currentStory.id,
              chapterId: result.data.chapter.id,
            }),
          }).catch(() => undefined);
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
  }, [chapterId, navigate, request, requestedChapterId, status, story]);
  /*
   * تنظیمات مطالعه فقط برای کاربر واردشده از سرور دریافت می‌شود.
   */
  useEffect(() => {
    if (status !== "authenticated") {
      setSettings(DEFAULT_SETTINGS);
      return;
    }

    const controller = new AbortController();

    void request<PreferenceResponse>("/api/v1/preferences", {
      signal: controller.signal,
    })
      .then((result) => {
        if (controller.signal.aborted) {
          return;
        }

        setSettings({
          theme: result.data.preferences.readerTheme,
          fontScale: result.data.preferences.fontScale,
          lineHeight: result.data.preferences.lineHeight,
        });
      })
      .catch(() => {
        /*
         * در صورت خطای تنظیمات، خواندن داستان با تنظیمات پیش‌فرض
         * همچنان ممکن خواهد بود.
         */
      });

    return () => controller.abort();
  }, [request, status]);

  /*
   * وضعیت حضور داستان در کتابخانه.
   */
  useEffect(() => {
    if (status !== "authenticated" || !story || !libraryKey) {
      return;
    }

    const controller = new AbortController();

    void request<LibraryStatusResponse>(`/api/v1/library/${story.id}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) {
          return;
        }

        setLibraryState({
          key: libraryKey,
          inLibrary: response.data.inLibrary,
        });

        setLibraryMessage(null);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setLibraryMessage(getErrorMessage(cause));
        }
      });

    return () => controller.abort();
  }, [libraryKey, request, status, story]);

  /*
   * ذخیرهٔ پیشرفت مطالعه.
   */
  useEffect(() => {
    if (status !== "authenticated" || !story || !chapter) {
      return undefined;
    }

    const currentStoryId = story.id;
    const currentChapterId = chapter.id;

    let timeoutId: number | undefined;

    function persistProgress(): void {
      const contentElement = chapterContentRef.current;

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

    window.addEventListener("scroll", persistProgress, {
      passive: true,
    });

    persistProgress();

    return () => {
      window.removeEventListener("scroll", persistProgress);
      window.clearTimeout(timeoutId);
    };
  }, [chapter, request, status, story]);

  async function updateSettings(next: Partial<ReaderSettings>): Promise<void> {
    const value = {
      ...settings,
      ...next,
    };

    setSettings(value);

    if (status !== "authenticated") {
      return;
    }

    await request("/api/v1/preferences", {
      method: "PATCH",
      body: JSON.stringify({
        readerTheme: value.theme,
        fontScale: value.fontScale,
        lineHeight: value.lineHeight,
      }),
    }).catch(() => undefined);
  }

  async function toggleLibrary(): Promise<void> {
    if (
      !story ||
      !libraryKey ||
      status !== "authenticated" ||
      isInLibrary === null ||
      libraryPending
    ) {
      return;
    }

    const shouldAdd = !isInLibrary;

    setLibraryPending(true);
    setLibraryMessage(null);

    try {
      await request<void>(`/api/v1/library/${story.id}`, {
        method: shouldAdd ? "POST" : "DELETE",
      });

      setLibraryState({
        key: libraryKey,
        inLibrary: shouldAdd,
      });

      setLibraryMessage(
        shouldAdd
          ? "داستان به کتابخانه اضافه شد."
          : "داستان از کتابخانه حذف شد.",
      );
    } catch (cause) {
      setLibraryMessage(getErrorMessage(cause));
    } finally {
      setLibraryPending(false);
    }
  }

  async function shareStory(): Promise<void> {
    if (!story) {
      return;
    }

    const shareUrl = chapter
      ? `${window.location.origin}${getChapterPath(story.slug, chapter.id)}`
      : `${window.location.origin}/stories/${encodeURIComponent(story.slug)}`;

    setShareMessage(null);

    try {
      if (navigator.share) {
        await navigator.share({
          title: story.title,
          text: story.description,
          url: shareUrl,
        });

        setShareMessage("داستان به اشتراک گذاشته شد.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("پیوند داستان کپی شد.");
    } catch (cause) {
      /*
       * بستن پنجرهٔ اشتراک‌گذاری توسط کاربر نباید به‌عنوان خطای
       * اصلی صفحه نمایش داده شود.
       */
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }

      setShareMessage("کپی‌کردن پیوند امکان‌پذیر نبود.");
    }
  }

  function selectChapter(selectedChapter: Chapter): void {
    if (!story) {
      return;
    }

    setShowTableOfContents(false);

    navigate(getChapterPath(story.slug, selectedChapter.id));

    window.requestAnimationFrame(() => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    });
  }

  if (error && !story) {
    return (
      <main className="reader-status-page">
        <div className="reader-status-card" role="alert">
          <BookOpen aria-hidden="true" size={40} />

          <h1>امکان دریافت داستان وجود ندارد</h1>

          <p>{error}</p>

          <Link className="reader-button reader-button--primary" to="/">
            بازگشت به صفحهٔ اصلی
          </Link>
        </div>
      </main>
    );
  }

  if (storyLoading || !story) {
    return (
      <main className="reader-status-page">
        <div className="reader-status-card">
          <BookOpen
            className="reader-loading-icon"
            aria-hidden="true"
            size={40}
          />

          <p>در حال دریافت داستان…</p>
        </div>
      </main>
    );
  }

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
      <div className="reader__container">
        <Link className="reader__back-link" to="/">
          <span aria-hidden="true">{i18n.dir() === "rtl" ? "→" : "←"}</span>
          بازگشت
        </Link>

        <section className="reader-story" aria-labelledby="reader-story-title">
          <div className="reader-story__cover-column">
            <div className="reader-story__cover">
              {story.coverUrl ? (
                <img
                  src={story.coverUrl}
                  alt={`جلد ${story.title}`}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div
                  className="reader-story__cover-placeholder"
                  {...storyTextAttributes}
                >
                  <BookOpen aria-hidden="true" size={40} />

                  <span>{story.title}</span>
                </div>
              )}
            </div>
          </div>

          <div className="reader-story__information">
            <div className="reader-story__badges">
              {story.genre ? (
                <Link
                  className="reader-badge reader-badge--genre"
                  to={`/browse/genres/${encodeURIComponent(story.genre.slug)}`}
                >
                  {story.genre.name}
                </Link>
              ) : null}

              <span className="reader-badge">
                {STATUS_LABELS[story.status] ?? story.status}
              </span>

              <span className="reader-badge" dir="ltr">
                {story.language.toUpperCase()}
              </span>

              {story.isMature ? (
                <span className="reader-badge reader-badge--mature">
                  محتوای +۱۸
                </span>
              ) : null}
            </div>

            <h1
              id="reader-story-title"
              className="reader-story__title"
              {...storyTextAttributes}
            >
              {story.title}
            </h1>

            <p className="reader-story__description" {...storyTextAttributes}>
              {story.description}
            </p>

            <Link
              className="reader-story__author"
              to={`/users/${encodeURIComponent(story.author.username)}`}
            >
              <span className="reader-story__avatar">
                {story.author.avatarUrl ? (
                  <img
                    src={story.author.avatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  getInitials(story.author.displayName)
                )}
              </span>

              <span>
                نوشتهٔ <bdi>{story.author.displayName}</bdi>
              </span>
            </Link>

            <div className="reader-story__statistics">
              <span>
                <BookOpen aria-hidden="true" size={17} />
                {publishedChapters.length.toLocaleString(interfaceLocale)} فصل
              </span>

              {story.status === "COMPLETED" ? (
                <span>
                  <Check aria-hidden="true" size={17} />
                  تکمیل‌شده
                </span>
              ) : null}
            </div>

            {story.tags.length > 0 ? (
              <ul
                className="reader-story__tags"
                aria-label="برچسب‌های داستان"
                {...storyTextAttributes}
              >
                {story.tags.map((tag) => (
                  <li key={tag.slug}>
                    <Link to={`/browse/tags/${encodeURIComponent(tag.slug)}`}>
                      #{tag.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="reader-story__actions">
              {status === "authenticated" ? (
                <button
                  className={`reader-button ${
                    isInLibrary
                      ? "reader-button--primary"
                      : "reader-button--secondary"
                  }`}
                  type="button"
                  disabled={libraryPending || isInLibrary === null}
                  aria-pressed={isInLibrary === true}
                  onClick={() => void toggleLibrary()}
                >
                  <Library aria-hidden="true" size={17} />

                  {libraryPending
                    ? "در حال انجام…"
                    : isInLibrary === null
                      ? "در حال بررسی…"
                      : isInLibrary
                        ? "حذف از کتابخانه"
                        : "افزودن به کتابخانه"}
                </button>
              ) : (
                <Link
                  className="reader-button reader-button--secondary"
                  to="/login"
                >
                  <Library aria-hidden="true" size={17} />
                  افزودن به کتابخانه
                </Link>
              )}

              <button
                className="reader-button reader-button--secondary"
                type="button"
                aria-expanded={showTableOfContents}
                aria-controls="reader-table-of-contents"
                onClick={() => setShowTableOfContents((current) => !current)}
              >
                <List aria-hidden="true" size={17} />
                فهرست فصل‌ها
              </button>

              <button
                className="reader-button reader-button--secondary"
                type="button"
                onClick={() => void shareStory()}
              >
                <Share2 aria-hidden="true" size={17} />
                اشتراک‌گذاری
              </button>
            </div>

            {libraryMessage ? (
              <p className="reader-inline-message" aria-live="polite">
                {libraryMessage}
              </p>
            ) : null}

            {shareMessage ? (
              <p className="reader-inline-message" aria-live="polite">
                {shareMessage}
              </p>
            ) : null}
          </div>
        </section>

        {story.isMature ? (
          <div className="reader-warning">
            محتوای این داستان برای حساب‌های بزرگسال است. دسترسی به متن فصل‌ها در
            سمت سرور و براساس تنظیمات حساب کنترل می‌شود.
          </div>
        ) : null}

        {showTableOfContents ? (
          <section
            id="reader-table-of-contents"
            className="reader-toc"
            aria-labelledby="reader-toc-title"
          >
            <header className="reader-toc__header">
              <div>
                <span>داستان</span>
                <h2 id="reader-toc-title">فهرست فصل‌ها</h2>
              </div>

              <button
                className="reader-icon-button"
                type="button"
                aria-label="بستن فهرست فصل‌ها"
                onClick={() => setShowTableOfContents(false)}
              >
                <X aria-hidden="true" size={20} />
              </button>
            </header>

            {publishedChapters.length > 0 ? (
              <ol className="reader-toc__list">
                {publishedChapters.map((item) => {
                  const isCurrent = item.id === requestedChapterId;

                  return (
                    <li key={item.id}>
                      <button
                        className={
                          isCurrent
                            ? "reader-toc__item reader-toc__item--active"
                            : "reader-toc__item"
                        }
                        type="button"
                        aria-current={isCurrent ? "page" : undefined}
                        onClick={() => selectChapter(item)}
                      >
                        <span
                          className="reader-toc__position"
                          aria-hidden="true"
                        >
                          {item.position.toLocaleString(interfaceLocale)}
                        </span>

                        <span
                          className="reader-toc__title"
                          {...storyTextAttributes}
                        >
                          {item.title}
                        </span>

                        <span className="reader-toc__words">
                          {item.wordCount.toLocaleString(interfaceLocale)} واژه
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="reader-empty-message">
                هنوز فصل منتشرشده‌ای برای این داستان وجود ندارد.
              </p>
            )}
          </section>
        ) : null}

        <div className="reader__toolbar" aria-label="ابزارها و تنظیمات مطالعه">
          <div className="reader__toolbar-chapter">
            <BookOpen aria-hidden="true" size={18} />

            <span {...storyTextAttributes}>{chapter?.title ?? "فصل"}</span>
          </div>

          <div className="reader__toolbar-actions">
            <button
              className="reader-toolbar-button"
              type="button"
              aria-expanded={showTableOfContents}
              onClick={() => setShowTableOfContents((current) => !current)}
            >
              <List aria-hidden="true" size={18} />
              <span>فصل‌ها</span>
            </button>

            <button
              className="reader-toolbar-button"
              type="button"
              aria-expanded={showReaderSettings}
              aria-controls="reader-settings"
              onClick={() => setShowReaderSettings((current) => !current)}
            >
              <Settings2 aria-hidden="true" size={18} />
              <span>تنظیمات</span>
            </button>
          </div>
        </div>

        {showReaderSettings ? (
          <section
            id="reader-settings"
            className="reader-settings"
            aria-label="تنظیمات مطالعه"
          >
            <label className="reader-settings__field">
              <span>پوسته</span>

              <select
                value={settings.theme}
                onChange={(event) =>
                  void updateSettings({
                    theme: event.target.value as ReaderTheme,
                  })
                }
              >
                <option value="SYSTEM">سیستم</option>
                <option value="LIGHT">روشن</option>
                <option value="DARK">تیره</option>
                <option value="SEPIA">سپیا</option>
              </select>
            </label>

            <label className="reader-settings__field">
              <span>
                اندازهٔ متن:{" "}
                {Math.round(settings.fontScale * 100).toLocaleString(
                  interfaceLocale,
                )}
                ٪
              </span>

              <input
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                value={settings.fontScale}
                onChange={(event) =>
                  void updateSettings({
                    fontScale: Number(event.target.value),
                  })
                }
              />
            </label>

            <label className="reader-settings__field">
              <span>
                فاصلهٔ خطوط:{" "}
                {settings.lineHeight.toLocaleString(interfaceLocale)}
              </span>

              <input
                type="range"
                min="1.3"
                max="2.2"
                step="0.05"
                value={settings.lineHeight}
                onChange={(event) =>
                  void updateSettings({
                    lineHeight: Number(event.target.value),
                  })
                }
              />
            </label>
          </section>
        ) : null}

        {error && story ? (
          <p className="reader-error-message" role="alert">
            {error}
          </p>
        ) : null}

        {publishedChapters.length === 0 ? (
          <section className="reader-empty-chapter">
            <BookOpen aria-hidden="true" size={42} />

            <h2>هنوز فصلی منتشر نشده است</h2>

            <p>
              پس از انتشار اولین فصل، متن داستان در همین صفحه نمایش داده خواهد
              شد.
            </p>

            <ReportForm targetType="STORY" targetId={story.id} />
          </section>
        ) : chapterLoading || !chapter ? (
          <section className="reader-empty-chapter">
            <BookOpen
              className="reader-loading-icon"
              aria-hidden="true"
              size={42}
            />

            <p>در حال دریافت فصل…</p>
          </section>
        ) : (
          <>
            <article
              ref={chapterContentRef}
              className="reader__paper"
              {...storyTextAttributes}
            >
              <header className="reader__heading">
                <p className="reader__story-name">{story.title}</p>

                <h2>{chapter.title}</h2>

                <div className="reader__chapter-meta">
                  <span>
                    فصل{" "}
                    {(currentChapterIndex + 1).toLocaleString(interfaceLocale)}{" "}
                    از{" "}
                    {publishedChapters.length.toLocaleString(interfaceLocale)}
                  </span>

                  <span aria-hidden="true">•</span>

                  <span>
                    {chapter.wordCount.toLocaleString(interfaceLocale)} واژه
                  </span>
                </div>
              </header>

              <div className="reader__content">
                {(chapter.content ?? "")
                  .split(/\n{2,}/u)
                  .map((paragraph, index) => (
                    <p key={`${index}-${paragraph.slice(0, 24)}`}>
                      {paragraph}
                    </p>
                  ))}
              </div>
            </article>

            <nav className="reader__navigation" aria-label="حرکت میان فصل‌ها">
              {navigation.previous ? (
                <Link
                  className="reader-chapter-link"
                  to={getChapterPath(story.slug, navigation.previous.id)}
                  onClick={() =>
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    })
                  }
                >
                  <ChevronRight
                    className="reader-chapter-link__icon reader-chapter-link__icon--previous"
                    aria-hidden="true"
                    size={20}
                  />

                  <span>
                    <small>فصل قبل</small>

                    <bdi {...storyTextAttributes}>
                      {navigation.previous.title}
                    </bdi>
                  </span>
                </Link>
              ) : (
                <span />
              )}

              {navigation.next ? (
                <Link
                  className="reader-chapter-link reader-chapter-link--next"
                  to={getChapterPath(story.slug, navigation.next.id)}
                  onClick={() =>
                    window.scrollTo({
                      top: 0,
                      behavior: "smooth",
                    })
                  }
                >
                  <span>
                    <small>فصل بعد</small>

                    <bdi {...storyTextAttributes}>{navigation.next.title}</bdi>
                  </span>

                  <ChevronLeft
                    className="reader-chapter-link__icon reader-chapter-link__icon--next"
                    aria-hidden="true"
                    size={20}
                  />
                </Link>
              ) : (
                <span />
              )}
            </nav>

            <section className="reader__report">
              <ReportForm targetType="STORY" targetId={story.id} />
            </section>

            <div className="reader__discussion">
              <ReaderInteractions chapterId={chapter.id} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
