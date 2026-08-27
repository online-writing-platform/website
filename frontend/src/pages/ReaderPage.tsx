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

function getChapterPath(slug: string, chapterId: string): string {
  return `/stories/${encodeURIComponent(
    slug,
  )}/chapters/${encodeURIComponent(chapterId)}`;
}

function getInitials(value: string): string {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "?";
  }

  return normalizedValue.slice(0, 1).toUpperCase();
}

export default function ReaderPage() {
  const { slug = "", chapterId } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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

  const interfaceLocale = i18n.resolvedLanguage?.startsWith("en")
    ? "en-US"
    : "fa-IR";

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

  const storyStatusLabel = story
    ? t(`reader.status.${story.status}`, {
        defaultValue: story.status,
      })
    : "";

  useDocumentMeta({
    title:
      story && chapter
        ? t("reader.document.chapterTitle", {
            chapter: chapter.title,
            story: story.title,
          })
        : story
          ? story.title
          : t("reader.document.defaultTitle"),

    description: story?.description.slice(0, 160),

    canonicalPath:
      story && chapter
        ? getChapterPath(story.slug, chapter.id)
        : `/stories/${slug}`,

    image: story?.coverUrl ?? undefined,
  });

  /*
   * دریافت اطلاعات داستان و فهرست فصل‌ها.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadStory(): Promise<void> {
      setStoryLoading(true);
      setError(null);
      setChapterResponse(null);
      setLibraryState(null);
      setLibraryMessage(null);
      setShareMessage(null);
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
   * دریافت فصل انتخاب‌شده یا اولین فصل منتشرشده.
   *
   * currentStory باعث می‌شود TypeScript بداند مقدار story در
   * تابع async نیز undefined نیست.
   */
  useEffect(() => {
    if (!story || !requestedChapterId) {
      setChapterResponse(null);
      return;
    }

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
   * دریافت تنظیمات مطالعه برای کاربر واردشده.
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
         * در صورت شکست دریافت تنظیمات، صفحه با مقادیر پیش‌فرض
         * همچنان قابل استفاده است.
         */
      });

    return () => controller.abort();
  }, [request, status]);

  /*
   * بررسی حضور داستان در کتابخانه.
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
   * ذخیره پیشرفت مطالعه.
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
        shouldAdd ? t("reader.library.added") : t("reader.library.removed"),
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

        setShareMessage(t("reader.share.shared"));
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setShareMessage(t("reader.share.copied"));
    } catch (cause) {
      if (cause instanceof DOMException && cause.name === "AbortError") {
        return;
      }

      setShareMessage(t("reader.share.failed"));
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

          <h1>{t("reader.errors.loadStoryTitle")}</h1>

          <p>{error}</p>

          <Link className="reader-button reader-button--primary" to="/">
            {t("reader.actions.backHome")}
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

          <p>{t("reader.loading.story")}</p>
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

          {t("reader.actions.back")}
        </Link>

        <section className="reader-story" aria-labelledby="reader-story-title">
          <div className="reader-story__cover-column">
            <div className="reader-story__cover">
              {story.coverUrl ? (
                <img
                  src={story.coverUrl}
                  alt={t("reader.story.coverAlt", {
                    title: story.title,
                  })}
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
                  {t(`genres.items.${story.genre.slug}`, {
                    defaultValue: story.genre.name,
                  })}
                </Link>
              ) : null}

              <span className="reader-badge">{storyStatusLabel}</span>

              <span className="reader-badge" dir="ltr">
                {story.language.toUpperCase()}
              </span>

              {story.isMature ? (
                <span className="reader-badge reader-badge--mature">
                  {t("reader.story.mature")}
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
                {t("reader.story.by")} <bdi>{story.author.displayName}</bdi>
              </span>
            </Link>

            <div className="reader-story__statistics">
              <span>
                <BookOpen aria-hidden="true" size={17} />

                {t("reader.story.chapterCount", {
                  count: publishedChapters.length,
                  value:
                    publishedChapters.length.toLocaleString(interfaceLocale),
                })}
              </span>

              {story.status === "COMPLETED" ? (
                <span>
                  <Check aria-hidden="true" size={17} />
                  {t("reader.status.COMPLETED")}
                </span>
              ) : null}
            </div>

            {story.tags.length > 0 ? (
              <ul
                className="reader-story__tags"
                aria-label={t("reader.story.tagsAriaLabel")}
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
                    ? t("reader.library.pending")
                    : isInLibrary === null
                      ? t("reader.library.checking")
                      : isInLibrary
                        ? t("reader.library.remove")
                        : t("reader.library.add")}
                </button>
              ) : (
                <Link
                  className="reader-button reader-button--secondary"
                  to="/login"
                >
                  <Library aria-hidden="true" size={17} />
                  {t("reader.library.add")}
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
                {t("reader.toc.title")}
              </button>

              <button
                className="reader-button reader-button--secondary"
                type="button"
                onClick={() => void shareStory()}
              >
                <Share2 aria-hidden="true" size={17} />
                {t("reader.actions.share")}
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
            {t("reader.story.matureWarning")}
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
                <span>{t("reader.toc.eyebrow")}</span>

                <h2 id="reader-toc-title">{t("reader.toc.title")}</h2>
              </div>

              <button
                className="reader-icon-button"
                type="button"
                aria-label={t("reader.toc.close")}
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
                          {t("reader.chapter.wordCount", {
                            value:
                              item.wordCount.toLocaleString(interfaceLocale),
                          })}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <p className="reader-empty-message">{t("reader.toc.empty")}</p>
            )}
          </section>
        ) : null}

        <div
          className="reader__toolbar"
          aria-label={t("reader.toolbar.ariaLabel")}
        >
          <div className="reader__toolbar-chapter">
            <BookOpen aria-hidden="true" size={18} />

            <span {...storyTextAttributes}>
              {chapter?.title ?? t("reader.chapter.fallbackTitle")}
            </span>
          </div>

          <div className="reader__toolbar-actions">
            <button
              className="reader-toolbar-button"
              type="button"
              aria-expanded={showTableOfContents}
              onClick={() => setShowTableOfContents((current) => !current)}
            >
              <List aria-hidden="true" size={18} />
              <span>{t("reader.toolbar.chapters")}</span>
            </button>

            <button
              className="reader-toolbar-button"
              type="button"
              aria-expanded={showReaderSettings}
              aria-controls="reader-settings"
              onClick={() => setShowReaderSettings((current) => !current)}
            >
              <Settings2 aria-hidden="true" size={18} />
              <span>{t("reader.toolbar.settings")}</span>
            </button>
          </div>
        </div>

        {showReaderSettings ? (
          <section
            id="reader-settings"
            className="reader-settings"
            aria-label={t("reader.settings.ariaLabel")}
          >
            <label className="reader-settings__field">
              <span>{t("reader.settings.theme")}</span>

              <select
                value={settings.theme}
                onChange={(event) =>
                  void updateSettings({
                    theme: event.target.value as ReaderTheme,
                  })
                }
              >
                <option value="SYSTEM">
                  {t("reader.settings.themes.SYSTEM")}
                </option>

                <option value="LIGHT">
                  {t("reader.settings.themes.LIGHT")}
                </option>

                <option value="DARK">{t("reader.settings.themes.DARK")}</option>

                <option value="SEPIA">
                  {t("reader.settings.themes.SEPIA")}
                </option>
              </select>
            </label>

            <label className="reader-settings__field">
              <span>
                {t("reader.settings.fontScale", {
                  value: Math.round(settings.fontScale * 100).toLocaleString(
                    interfaceLocale,
                  ),
                })}
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
                {t("reader.settings.lineHeight", {
                  value: settings.lineHeight.toLocaleString(interfaceLocale),
                })}
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

            <h2>{t("reader.chapter.emptyTitle")}</h2>

            <p>{t("reader.chapter.emptyDescription")}</p>

            <ReportForm targetType="STORY" targetId={story.id} />
          </section>
        ) : chapterLoading || !chapter ? (
          <section className="reader-empty-chapter">
            <BookOpen
              className="reader-loading-icon"
              aria-hidden="true"
              size={42}
            />

            <p>{t("reader.loading.chapter")}</p>
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
                    {t("reader.chapter.position", {
                      current: (currentChapterIndex + 1).toLocaleString(
                        interfaceLocale,
                      ),

                      total:
                        publishedChapters.length.toLocaleString(
                          interfaceLocale,
                        ),
                    })}
                  </span>

                  <span aria-hidden="true">•</span>

                  <span>
                    {t("reader.chapter.wordCount", {
                      value: chapter.wordCount.toLocaleString(interfaceLocale),
                    })}
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

            <nav
              className="reader__navigation"
              aria-label={t("reader.navigation.ariaLabel")}
            >
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
                    <small>{t("reader.navigation.previous")}</small>

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
                    <small>{t("reader.navigation.next")}</small>

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
              <ReaderInteractions
                chapterId={chapter.id}
                contentLanguage={story.language}
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
