import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowUpRight,
  BarChart3,
  BookOpen,
  Bookmark,
  Eye,
  Inbox,
  LoaderCircle,
  MessageCircle,
  RefreshCw,
  ThumbsUp,
  TrendingUp,
  Users,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type { GetStoriesResponse, Story } from "../types/story";

import "./AnalyticsPage.css";

interface StoryAnalytics {
  story: {
    id: string;
    title: string;
    slug: string;
  };

  uniqueReaders: number;
  librarySaves: number;
  activeProgressReaders: number;

  chapters: Array<{
    id: string;
    title: string;
    position: number;
    uniqueReaders: number;
    votes: number;
    comments: number;
  }>;
}

interface AnalyticsResponse {
  data: {
    analytics: StoryAnalytics;
  };
}

type LoadState = "idle" | "loading" | "ready" | "error";

const COPY = {
  fa: {
    locale: "fa-IR",

    eyebrow: "فضای نویسنده",
    title: "آمار داستان‌ها",
    description:
      "رفتار خوانندگان و میزان تعامل هر فصل را بررسی کنید و برای ادامهٔ داستان تصمیم دقیق‌تری بگیرید.",

    refresh: "به‌روزرسانی آمار",
    refreshing: "در حال به‌روزرسانی…",

    selectorTitle: "داستان موردنظر",
    selectorDescription: "آمار کدام داستان نمایش داده شود؟",
    storyLabel: "انتخاب داستان",
    selectStory: "یک داستان انتخاب کنید",
    viewStory: "مشاهدهٔ صفحه داستان",

    uniqueReaders: "خوانندهٔ یکتا",
    uniqueReadersHint: "افرادی که دست‌کم یک فصل را خوانده‌اند",

    librarySaves: "ذخیره در کتابخانه",
    librarySavesHint: "دفعاتی که داستان به کتابخانه اضافه شده",

    activeReaders: "خوانندهٔ در حال مطالعه",
    activeReadersHint: "خوانندگانی که پیشرفت فعال دارند",

    overview: "عملکرد فصل‌ها",
    overviewDescription:
      "مقایسهٔ خواننده‌های یکتا، رأی‌ها و نظرهای ثبت‌شده برای هر فصل.",

    chaptersLoaded: (value: number) => `${value.toLocaleString("fa-IR")} فصل`,

    totalInteractions: (value: number) =>
      `${value.toLocaleString("fa-IR")} تعامل`,

    chapter: "فصل",
    readers: "خواننده",
    votes: "رأی",
    comments: "نظر",

    loadingStories: "در حال دریافت داستان‌های شما…",
    loadingAnalytics: "در حال آماده‌سازی آمار داستان…",

    storiesError: "دریافت فهرست داستان‌ها ناموفق بود.",
    analyticsError: "دریافت آمار این داستان ناموفق بود.",

    retry: "تلاش دوباره",

    noStoriesTitle: "هنوز داستانی برای تحلیل وجود ندارد",
    noStoriesDescription:
      "پس از ساخت داستان، آمار خوانندگان و فصل‌ها در این صفحه نمایش داده می‌شود.",
    startWriting: "شروع نوشتن",

    noChaptersTitle: "هنوز فصلی ثبت نشده است",
    noChaptersDescription:
      "بعد از ساخت فصل، آمار خواندن و تعامل آن در این جدول ظاهر می‌شود.",

    chooseStory: "برای دیدن آمار، یک داستان انتخاب کنید.",
  },

  en: {
    locale: "en-US",

    eyebrow: "Writer workspace",
    title: "Story analytics",
    description:
      "Review reader behavior and chapter engagement to make more informed decisions about what to write next.",

    refresh: "Refresh analytics",
    refreshing: "Refreshing…",

    selectorTitle: "Selected story",
    selectorDescription: "Which story would you like to analyze?",
    storyLabel: "Choose a story",
    selectStory: "Select a story",
    viewStory: "View story page",

    uniqueReaders: "Unique readers",
    uniqueReadersHint: "People who read at least one chapter",

    librarySaves: "Library saves",
    librarySavesHint: "Times this story was added to a library",

    activeReaders: "Active progress readers",
    activeReadersHint: "Readers with active reading progress",

    overview: "Chapter performance",
    overviewDescription:
      "Compare unique readers, votes, and comments recorded for each chapter.",

    chaptersLoaded: (value: number) =>
      `${value.toLocaleString("en-US")} chapters`,

    totalInteractions: (value: number) =>
      `${value.toLocaleString("en-US")} interactions`,

    chapter: "Chapter",
    readers: "Readers",
    votes: "Votes",
    comments: "Comments",

    loadingStories: "Loading your stories…",
    loadingAnalytics: "Preparing story analytics…",

    storiesError: "Your stories could not be loaded.",
    analyticsError: "Analytics for this story could not be loaded.",

    retry: "Try again",

    noStoriesTitle: "There are no stories to analyze yet",
    noStoriesDescription:
      "After you create a story, its reader and chapter analytics will appear here.",
    startWriting: "Start writing",

    noChaptersTitle: "No chapters have been created yet",
    noChaptersDescription:
      "Once you create a chapter, its reading and engagement data will appear in this table.",

    chooseStory: "Choose a story to view its analytics.",
  },
} as const;

const PAGE_SIZE = 50;

export default function AnalyticsPage() {
  const { i18n } = useTranslation();
  const { request } = useAuth();

  const [params, setParams] = useSearchParams();

  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";

  const direction = language === "fa" ? "rtl" : "ltr";

  const copy = COPY[language];

  const selectedStoryId = params.get("story") ?? "";

  const [stories, setStories] = useState<Story[]>([]);

  const [storiesState, setStoriesState] = useState<LoadState>("loading");

  const [storiesError, setStoriesError] = useState<string | null>(null);

  const [storiesReloadKey, setStoriesReloadKey] = useState(0);

  const [analytics, setAnalytics] = useState<StoryAnalytics | null>(null);

  const [analyticsState, setAnalyticsState] = useState<LoadState>("idle");

  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [analyticsReloadKey, setAnalyticsReloadKey] = useState(0);

  const selectedStory = useMemo(
    () => stories.find((story) => story.id === selectedStoryId) ?? null,
    [selectedStoryId, stories],
  );

  const selectedStoryText = getStoryTextAttributes(selectedStory?.language);

  useEffect(() => {
    let active = true;

    const timer = window.setTimeout(() => {
      const loadStories = async (): Promise<void> => {
        const collectedStories: Story[] = [];

        let cursor: string | null = null;

        do {
          const query = new URLSearchParams({
            limit: String(PAGE_SIZE),
          });

          if (cursor) {
            query.set("cursor", cursor);
          }

          const response = await request<GetStoriesResponse>(
            `/api/v1/stories/mine?${query.toString()}`,
          );

          collectedStories.push(...response.data.stories);

          cursor = response.data.pagination.nextCursor;
        } while (cursor);

        if (!active) {
          return;
        }

        setStories(collectedStories);
        setStoriesState("ready");
        setStoriesError(null);

        setParams(
          (currentParams) => {
            const currentStoryId = currentParams.get("story");

            const currentStoryExists = collectedStories.some(
              (story) => story.id === currentStoryId,
            );

            if (currentStoryExists || !collectedStories[0]) {
              return currentParams;
            }

            const nextParams = new URLSearchParams(currentParams);

            nextParams.set("story", collectedStories[0].id);

            return nextParams;
          },
          {
            replace: true,
          },
        );
      };

      void loadStories().catch((cause: unknown) => {
        if (!active) {
          return;
        }

        setStories([]);
        setStoriesState("error");
        setStoriesError(getErrorMessage(cause));
      });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [request, setParams, storiesReloadKey]);

  useEffect(() => {
    if (storiesState !== "ready" || !selectedStory) {
      return;
    }

    let active = true;

    const timer = window.setTimeout(() => {
      setAnalyticsState("loading");
      setAnalyticsError(null);

      void request<AnalyticsResponse>(
        `/api/v1/analytics/stories/${encodeURIComponent(selectedStory.id)}`,
      )
        .then((response) => {
          if (!active) {
            return;
          }

          setAnalytics(response.data.analytics);

          setAnalyticsState("ready");
          setAnalyticsError(null);
        })
        .catch((cause: unknown) => {
          if (!active) {
            return;
          }

          setAnalytics(null);
          setAnalyticsState("error");
          setAnalyticsError(getErrorMessage(cause));
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [analyticsReloadKey, request, selectedStory, storiesState]);

  const sortedChapters = useMemo(
    () =>
      [...(analytics?.chapters ?? [])].sort(
        (first, second) => first.position - second.position,
      ),
    [analytics?.chapters],
  );

  const maximumChapterReaders = Math.max(
    1,
    ...sortedChapters.map((chapter) => chapter.uniqueReaders),
  );

  const totalInteractions = sortedChapters.reduce(
    (total, chapter) => total + chapter.votes + chapter.comments,
    0,
  );

  function selectStory(storyId: string): void {
    const nextParams = new URLSearchParams(params);

    nextParams.set("story", storyId);

    setAnalytics(null);
    setAnalyticsError(null);
    setAnalyticsState("loading");

    setParams(nextParams);
  }

  function retryStories(): void {
    setStoriesState("loading");
    setStoriesError(null);

    setStoriesReloadKey((current) => current + 1);
  }

  function refreshAnalytics(): void {
    if (!selectedStory || analyticsState === "loading") {
      return;
    }

    setAnalyticsState("loading");
    setAnalyticsError(null);

    setAnalyticsReloadKey((current) => current + 1);
  }

  return (
    <main className="analytics-page" dir={direction} lang={language}>
      <section
        className="analytics-page__hero"
        aria-labelledby="analytics-title"
      >
        <div className="analytics-page__hero-copy">
          <span className="analytics-page__hero-icon" aria-hidden="true">
            <BarChart3 />
          </span>

          <div>
            <p>{copy.eyebrow}</p>

            <h1 id="analytics-title">{copy.title}</h1>

            <span>{copy.description}</span>
          </div>
        </div>

        <button
          className="button button--secondary analytics-page__refresh"
          type="button"
          disabled={!selectedStory || analyticsState === "loading"}
          onClick={refreshAnalytics}
        >
          {analyticsState === "loading" ? (
            <LoaderCircle
              className="analytics-page__spinner"
              aria-hidden="true"
            />
          ) : (
            <RefreshCw aria-hidden="true" />
          )}

          {analyticsState === "loading" ? copy.refreshing : copy.refresh}
        </button>
      </section>

      {storiesState === "loading" && (
        <section className="analytics-page__state" aria-live="polite">
          <LoaderCircle
            className="analytics-page__spinner"
            aria-hidden="true"
          />

          <p>{copy.loadingStories}</p>
        </section>
      )}

      {storiesState === "error" && (
        <section className="analytics-page__state analytics-page__state--error">
          <Inbox aria-hidden="true" />

          <h2>{copy.storiesError}</h2>

          {storiesError && <p role="alert">{storiesError}</p>}

          <button
            className="button button--primary"
            type="button"
            onClick={retryStories}
          >
            <RefreshCw aria-hidden="true" />
            {copy.retry}
          </button>
        </section>
      )}

      {storiesState === "ready" && stories.length === 0 && (
        <section className="analytics-page__state">
          <BookOpen aria-hidden="true" />

          <h2>{copy.noStoriesTitle}</h2>

          <p>{copy.noStoriesDescription}</p>

          <Link className="button button--primary" to="/write">
            <BookOpen aria-hidden="true" />
            {copy.startWriting}
          </Link>
        </section>
      )}

      {storiesState === "ready" && stories.length > 0 && (
        <>
          <section
            className="analytics-page__selector"
            aria-labelledby="story-selector-title"
          >
            <div>
              <span className="analytics-page__section-icon" aria-hidden="true">
                <BookOpen />
              </span>

              <div>
                <h2 id="story-selector-title">{copy.selectorTitle}</h2>

                <p>{copy.selectorDescription}</p>
              </div>
            </div>

            <label className="analytics-page__story-select">
              <span>{copy.storyLabel}</span>

              <select
                value={selectedStoryId}
                dir={selectedStoryText.dir}
                onChange={(event) => selectStory(event.target.value)}
              >
                <option value="" disabled>
                  {copy.selectStory}
                </option>

                {stories.map((story) => (
                  <option
                    key={story.id}
                    value={story.id}
                    dir={getStoryTextAttributes(story.language).dir}
                  >
                    {story.title}
                  </option>
                ))}
              </select>
            </label>
          </section>

          {analyticsState === "loading" && (
            <section className="analytics-page__loading" aria-live="polite">
              <div
                className="analytics-page__metric-skeletons"
                aria-hidden="true"
              >
                <span />
                <span />
                <span />
              </div>

              <p>
                <LoaderCircle
                  className="analytics-page__spinner"
                  aria-hidden="true"
                />

                {copy.loadingAnalytics}
              </p>
            </section>
          )}

          {analyticsState === "error" && (
            <section className="analytics-page__state analytics-page__state--error">
              <BarChart3 aria-hidden="true" />

              <h2>{copy.analyticsError}</h2>

              {analyticsError && <p role="alert">{analyticsError}</p>}

              <button
                className="button button--primary"
                type="button"
                onClick={refreshAnalytics}
              >
                <RefreshCw aria-hidden="true" />
                {copy.retry}
              </button>
            </section>
          )}

          {analyticsState === "ready" && analytics && (
            <div className="analytics-page__content">
              <div className="analytics-page__story-heading">
                <div>
                  <span>{copy.selectorTitle}</span>

                  <h2 {...selectedStoryText}>{analytics.story.title}</h2>
                </div>

                <Link
                  className="analytics-page__story-link"
                  to={`/stories/${encodeURIComponent(analytics.story.slug)}`}
                >
                  {copy.viewStory}

                  <ArrowUpRight aria-hidden="true" />
                </Link>
              </div>

              <section
                className="analytics-page__metrics"
                aria-label={copy.title}
              >
                <article className="analytics-page__metric analytics-page__metric--readers">
                  <span
                    className="analytics-page__metric-icon"
                    aria-hidden="true"
                  >
                    <Users />
                  </span>

                  <div>
                    <span>{copy.uniqueReaders}</span>

                    <strong>
                      {analytics.uniqueReaders.toLocaleString(copy.locale)}
                    </strong>

                    <small>{copy.uniqueReadersHint}</small>
                  </div>
                </article>

                <article className="analytics-page__metric analytics-page__metric--saves">
                  <span
                    className="analytics-page__metric-icon"
                    aria-hidden="true"
                  >
                    <Bookmark />
                  </span>

                  <div>
                    <span>{copy.librarySaves}</span>

                    <strong>
                      {analytics.librarySaves.toLocaleString(copy.locale)}
                    </strong>

                    <small>{copy.librarySavesHint}</small>
                  </div>
                </article>

                <article className="analytics-page__metric analytics-page__metric--active">
                  <span
                    className="analytics-page__metric-icon"
                    aria-hidden="true"
                  >
                    <TrendingUp />
                  </span>

                  <div>
                    <span>{copy.activeReaders}</span>

                    <strong>
                      {analytics.activeProgressReaders.toLocaleString(
                        copy.locale,
                      )}
                    </strong>

                    <small>{copy.activeReadersHint}</small>
                  </div>
                </article>
              </section>

              <section
                className="analytics-page__chapters"
                aria-labelledby="chapter-performance-title"
              >
                <header>
                  <div>
                    <span
                      className="analytics-page__section-icon"
                      aria-hidden="true"
                    >
                      <Eye />
                    </span>

                    <div>
                      <h2 id="chapter-performance-title">{copy.overview}</h2>

                      <p>{copy.overviewDescription}</p>
                    </div>
                  </div>

                  <div className="analytics-page__chapter-summary">
                    <span>{copy.chaptersLoaded(sortedChapters.length)}</span>

                    <span>{copy.totalInteractions(totalInteractions)}</span>
                  </div>
                </header>

                {sortedChapters.length === 0 ? (
                  <div className="analytics-page__chapters-empty">
                    <BookOpen aria-hidden="true" />

                    <h3>{copy.noChaptersTitle}</h3>

                    <p>{copy.noChaptersDescription}</p>
                  </div>
                ) : (
                  <div className="analytics-page__table-scroll">
                    <table>
                      <caption className="sr-only">{copy.overview}</caption>

                      <thead>
                        <tr>
                          <th>{copy.chapter}</th>
                          <th>{copy.readers}</th>
                          <th>{copy.votes}</th>
                          <th>{copy.comments}</th>
                        </tr>
                      </thead>

                      <tbody>
                        {sortedChapters.map((chapter) => (
                          <tr key={chapter.id}>
                            <td data-label={copy.chapter}>
                              <div className="analytics-page__chapter-name">
                                <span>
                                  {chapter.position.toLocaleString(copy.locale)}
                                </span>

                                <strong {...selectedStoryText}>
                                  {chapter.title}
                                </strong>
                              </div>
                            </td>

                            <td data-label={copy.readers}>
                              <div className="analytics-page__reader-cell">
                                <strong>
                                  {chapter.uniqueReaders.toLocaleString(
                                    copy.locale,
                                  )}
                                </strong>

                                <progress
                                  value={chapter.uniqueReaders}
                                  max={maximumChapterReaders}
                                  aria-label={`${copy.readers}: ${chapter.uniqueReaders.toLocaleString(
                                    copy.locale,
                                  )}`}
                                />
                              </div>
                            </td>

                            <td data-label={copy.votes}>
                              <span className="analytics-page__table-value">
                                <ThumbsUp aria-hidden="true" />

                                {chapter.votes.toLocaleString(copy.locale)}
                              </span>
                            </td>

                            <td data-label={copy.comments}>
                              <span className="analytics-page__table-value">
                                <MessageCircle aria-hidden="true" />

                                {chapter.comments.toLocaleString(copy.locale)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </div>
          )}

          {analyticsState === "idle" && !selectedStory && (
            <p className="analytics-page__choose-story">{copy.chooseStory}</p>
          )}
        </>
      )}
    </main>
  );
}
