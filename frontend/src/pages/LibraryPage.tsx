import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  Bookmark,
  CircleAlert,
  Clock3,
  Globe2,
  History,
  LibraryBig,
  ListPlus,
  LoaderCircle,
  LockKeyhole,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { Link } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type { Story } from "../types/story";

import "./LibraryPage.css";

interface Pagination {
  hasMore: boolean;
  nextCursor: string | null;
}

interface LibraryResponse {
  data: {
    entries: Array<{
      addedAt: string;
      story: Story;
    }>;
    pagination: Pagination;
  };
}

interface ProgressItem {
  progress: number;
  lastReadAt: string;
  chapter: {
    id: string;
    title: string;
  } | null;
  story: Story;
}

interface ProgressResponse {
  data: {
    items: ProgressItem[];
    pagination: Pagination;
  };
}

interface HistoryItem {
  lastReadAt: string;
  chapter: {
    id: string;
    title: string;
  };
  story: {
    id: string;
    slug: string;
    title: string;
    coverUrl: string | null;
    isMature: boolean;
    author: {
      username: string;
      displayName: string;
    };
  };
}

interface HistoryResponse {
  data: {
    items: HistoryItem[];
    pagination: Pagination;
  };
}

interface ReadingList {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
}

interface ListsResponse {
  data: {
    lists: ReadingList[];
  };
}

const EMPTY_PAGINATION: Pagination = {
  hasMore: false,
  nextCursor: null,
};

const COPY = {
  fa: {
    language: "fa",
    locale: "fa-IR",
    eyebrow: "فضای مطالعه",
    title: "کتابخانه من",
    description:
      "داستان‌های ذخیره‌شده، ادامهٔ مطالعه، تاریخچه و فهرست‌های شخصی شما در یک مکان.",
    refresh: "به‌روزرسانی کتابخانه",
    refreshing: "در حال به‌روزرسانی…",
    summary: {
      saved: "ذخیره‌شده",
      progress: "در حال مطالعه",
      lists: "فهرست مطالعه",
    },
    loading: "در حال آماده‌کردن کتابخانه…",
    retry: "تلاش دوباره",
    sections: {
      progressEyebrow: "از همان‌جا ادامه بده",
      progress: "ادامه مطالعه",
      historyEyebrow: "آخرین بازدیدها",
      history: "تاریخچه مطالعه",
      savedEyebrow: "مجموعه شخصی",
      saved: "ذخیره‌شده‌ها",
      listsEyebrow: "مرتب‌سازی دلخواه",
      lists: "فهرست‌های مطالعه",
    },
    count: (value: number) => value.toLocaleString("fa-IR") + " مورد",
    empty: {
      progressTitle: "مطالعه‌ای برای ادامه وجود ندارد",
      progress:
        "با خواندن یک داستان، آخرین فصل و درصد پیشرفت آن اینجا نمایش داده می‌شود.",
      historyTitle: "تاریخچه هنوز خالی است",
      history: "فصل‌هایی که می‌خوانید در این بخش ثبت خواهند شد.",
      savedTitle: "هنوز داستانی ذخیره نکرده‌اید",
      saved:
        "از صفحهٔ هر داستان می‌توانید آن را به کتابخانه شخصی خود اضافه کنید.",
      listsTitle: "هنوز فهرستی نساخته‌اید",
      lists: "برای دسته‌بندی داستان‌ها، اولین فهرست مطالعه خود را بسازید.",
    },
    startStory: "شروع داستان",
    continue: "ادامه خواندن",
    view: "مشاهده داستان",
    progressLabel: (title: string) => "پیشرفت مطالعه " + title,
    percent: (value: number) => value.toLocaleString("fa-IR") + "٪",
    lastRead: (date: string) => "آخرین مطالعه: " + date,
    loadMoreProgress: "نمایش بیشتر ادامه مطالعه",
    loadMoreHistory: "نمایش بیشتر تاریخچه مطالعه",
    loadMoreLibrary: "نمایش بیشتر ذخیره‌شده‌ها",
    loadingMore: "در حال دریافت…",
    createList: {
      title: "ساخت فهرست جدید",
      description:
        "یک مجموعه عمومی یا خصوصی برای داستان‌هایی که می‌خواهید بخوانید بسازید.",
      label: "نام فهرست",
      placeholder: "مثلاً بعداً می‌خوانم",
      public: "فهرست عمومی باشد",
      submit: "ساخت فهرست",
      submitting: "در حال ساخت…",
    },
    visibility: {
      public: "عمومی",
      private: "خصوصی",
    },
    storyCount: (value: number) => value.toLocaleString("fa-IR") + " داستان",
    openList: (name: string) => "بازکردن فهرست " + name,
    coverAlt: (title: string) => "جلد " + title,
  },
  en: {
    language: "en",
    locale: "en-US",
    eyebrow: "Reading space",
    title: "My Library",
    description:
      "Your saved stories, reading progress, history, and personal lists in one place.",
    refresh: "Refresh library",
    refreshing: "Refreshing…",
    summary: {
      saved: "Saved",
      progress: "In progress",
      lists: "Reading lists",
    },
    loading: "Preparing your library…",
    retry: "Try again",
    sections: {
      progressEyebrow: "Pick up where you left off",
      progress: "Continue reading",
      historyEyebrow: "Recent visits",
      history: "Reading history",
      savedEyebrow: "Personal collection",
      saved: "Saved stories",
      listsEyebrow: "Organize your way",
      lists: "Reading lists",
    },
    count: (value: number) => value.toLocaleString("en-US") + " items",
    empty: {
      progressTitle: "Nothing to continue yet",
      progress:
        "Once you start a story, its latest chapter and progress will appear here.",
      historyTitle: "Your history is empty",
      history: "Chapters you read will be recorded in this section.",
      savedTitle: "No saved stories yet",
      saved: "Use the story page to add stories to your personal library.",
      listsTitle: "No reading lists yet",
      lists: "Create your first list to organize stories you want to read.",
    },
    startStory: "Start story",
    continue: "Continue reading",
    view: "View story",
    progressLabel: (title: string) => "Reading progress for " + title,
    percent: (value: number) => value.toLocaleString("en-US") + "%",
    lastRead: (date: string) => "Last read: " + date,
    loadMoreProgress: "Load more reading progress",
    loadMoreHistory: "Load more reading history",
    loadMoreLibrary: "Load more saved stories",
    loadingMore: "Loading…",
    createList: {
      title: "Create a new list",
      description:
        "Build a public or private collection for stories you want to read.",
      label: "List name",
      placeholder: "For example, Read later",
      public: "Make this list public",
      submit: "Create list",
      submitting: "Creating…",
    },
    visibility: {
      public: "Public",
      private: "Private",
    },
    storyCount: (value: number) => value.toLocaleString("en-US") + " stories",
    openList: (name: string) => "Open " + name + " list",
    coverAlt: (title: string) => "Cover of " + title,
  },
} as const;

function normalizedProgress(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(1, Math.max(0, value));
}

export default function LibraryPage() {
  const { i18n } = useTranslation();
  const { request } = useAuth();

  const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;
  const copy = isEnglish ? COPY.en : COPY.fa;
  const direction = isEnglish ? "ltr" : "rtl";

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(copy.locale, {
        year: "numeric",
        month: "short",
        day: "numeric",
      }),
    [copy.locale],
  );

  const [entries, setEntries] = useState<LibraryResponse["data"]["entries"]>(
    [],
  );
  const [progress, setProgress] = useState<ProgressItem[]>([]);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [libraryPagination, setLibraryPagination] =
    useState<Pagination>(EMPTY_PAGINATION);
  const [progressPagination, setProgressPagination] =
    useState<Pagination>(EMPTY_PAGINATION);
  const [historyPagination, setHistoryPagination] =
    useState<Pagination>(EMPTY_PAGINATION);

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingLibraryMore, setLoadingLibraryMore] = useState(false);
  const [loadingProgressMore, setLoadingProgressMore] = useState(false);
  const [loadingHistoryMore, setLoadingHistoryMore] = useState(false);
  const [creatingList, setCreatingList] = useState(false);

  const [listName, setListName] = useState("");
  const [listPublic, setListPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [library, readingProgress, readingLists, readingHistory] =
      await Promise.all([
        request<LibraryResponse>("/api/v1/library?limit=30"),
        request<ProgressResponse>("/api/v1/reading-progress?limit=30"),
        request<ListsResponse>("/api/v1/reading-lists"),
        request<HistoryResponse>("/api/v1/analytics/history?limit=20"),
      ]);

    setEntries(library.data.entries);
    setLibraryPagination(library.data.pagination);
    setProgress(readingProgress.data.items);
    setProgressPagination(readingProgress.data.pagination);
    setLists(readingLists.data.lists);
    setHistory(readingHistory.data.items);
    setHistoryPagination(readingHistory.data.pagination);
  }, [request]);

  useEffect(() => {
    let active = true;

    const loadTimer = window.setTimeout(() => {
      void load()
        .then(() => {
          if (active) {
            setError(null);
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setError(getErrorMessage(cause));
          }
        })
        .finally(() => {
          if (active) {
            setLoadingInitial(false);
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function refreshLibrary(): Promise<void> {
    if (refreshing) {
      return;
    }

    setRefreshing(true);
    setError(null);

    try {
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setRefreshing(false);
      setLoadingInitial(false);
    }
  }

  async function loadMoreLibrary(): Promise<void> {
    const cursor = libraryPagination.nextCursor;

    if (!libraryPagination.hasMore || !cursor || loadingLibraryMore) {
      return;
    }

    setLoadingLibraryMore(true);
    setError(null);

    try {
      const response = await request<LibraryResponse>(
        "/api/v1/library?limit=30&cursor=" + encodeURIComponent(cursor),
      );

      setEntries((current) => [...current, ...response.data.entries]);
      setLibraryPagination(response.data.pagination);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoadingLibraryMore(false);
    }
  }

  async function loadMoreProgress(): Promise<void> {
    const cursor = progressPagination.nextCursor;

    if (!progressPagination.hasMore || !cursor || loadingProgressMore) {
      return;
    }

    setLoadingProgressMore(true);
    setError(null);

    try {
      const response = await request<ProgressResponse>(
        "/api/v1/reading-progress?limit=30&cursor=" +
          encodeURIComponent(cursor),
      );

      setProgress((current) => [...current, ...response.data.items]);
      setProgressPagination(response.data.pagination);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoadingProgressMore(false);
    }
  }

  async function loadMoreHistory(): Promise<void> {
    const cursor = historyPagination.nextCursor;

    if (!historyPagination.hasMore || !cursor || loadingHistoryMore) {
      return;
    }

    setLoadingHistoryMore(true);
    setError(null);

    try {
      const response = await request<HistoryResponse>(
        "/api/v1/analytics/history?limit=20&cursor=" +
          encodeURIComponent(cursor),
      );

      setHistory((current) => [...current, ...response.data.items]);
      setHistoryPagination(response.data.pagination);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setLoadingHistoryMore(false);
    }
  }

  async function createList(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedName = listName.trim();

    if (!normalizedName || creatingList) {
      return;
    }

    setCreatingList(true);
    setError(null);

    try {
      await request("/api/v1/reading-lists", {
        method: "POST",
        body: JSON.stringify({
          name: normalizedName,
          isPublic: listPublic,
        }),
      });

      setListName("");
      await load();
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setCreatingList(false);
    }
  }

  function formatDate(value: string): string {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
  }

  return (
    <main
      className="page-shell library-page"
      dir={direction}
      lang={copy.language}
    >
      <section className="library-page__hero" aria-labelledby="library-title">
        <div className="library-page__hero-main">
          <span className="library-page__hero-icon" aria-hidden="true">
            <LibraryBig />
          </span>

          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h1 id="library-title">{copy.title}</h1>
            <p>{copy.description}</p>
          </div>
        </div>

        <button
          className="button button--secondary library-page__refresh"
          type="button"
          disabled={refreshing || loadingInitial}
          onClick={() => void refreshLibrary()}
        >
          <RefreshCw
            className={refreshing ? "is-spinning" : undefined}
            aria-hidden="true"
          />
          <span>{refreshing ? copy.refreshing : copy.refresh}</span>
        </button>

        <div className="library-page__summary">
          <article>
            <span aria-hidden="true">
              <Bookmark />
            </span>
            <div>
              <strong>{entries.length.toLocaleString(copy.locale)}</strong>
              <small>{copy.summary.saved}</small>
            </div>
          </article>

          <article>
            <span aria-hidden="true">
              <BookOpen />
            </span>
            <div>
              <strong>{progress.length.toLocaleString(copy.locale)}</strong>
              <small>{copy.summary.progress}</small>
            </div>
          </article>

          <article>
            <span aria-hidden="true">
              <ListPlus />
            </span>
            <div>
              <strong>{lists.length.toLocaleString(copy.locale)}</strong>
              <small>{copy.summary.lists}</small>
            </div>
          </article>
        </div>
      </section>

      {error ? (
        <div className="library-page__error" role="alert">
          <CircleAlert aria-hidden="true" />
          <p>{error}</p>

          <button
            className="button button--secondary"
            type="button"
            disabled={refreshing}
            onClick={() => void refreshLibrary()}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}

      {loadingInitial ? (
        <section
          className="library-page__loading"
          aria-live="polite"
          aria-busy="true"
        >
          <LoaderCircle aria-hidden="true" />
          <p>{copy.loading}</p>
        </section>
      ) : (
        <>
          <section
            className="library-panel"
            aria-labelledby="library-progress-title"
          >
            <header className="library-panel__header">
              <div className="library-panel__title">
                <span aria-hidden="true">
                  <BookOpen />
                </span>

                <div>
                  <p>{copy.sections.progressEyebrow}</p>
                  <h2 id="library-progress-title">{copy.sections.progress}</h2>
                </div>
              </div>

              <strong>{copy.count(progress.length)}</strong>
            </header>

            {progress.length === 0 ? (
              <div className="library-empty">
                <span aria-hidden="true">
                  <Sparkles />
                </span>
                <h3>{copy.empty.progressTitle}</h3>
                <p>{copy.empty.progress}</p>
              </div>
            ) : (
              <>
                <div className="library-progress-list">
                  {progress.map((item) => {
                    const progressValue = normalizedProgress(item.progress);
                    const percentage = Math.round(progressValue * 100);
                    const storyAttributes = getStoryTextAttributes(
                      item.story.language,
                    );

                    const destination = item.chapter
                      ? "/stories/" +
                        encodeURIComponent(item.story.slug) +
                        "/chapters/" +
                        encodeURIComponent(item.chapter.id)
                      : "/stories/" + encodeURIComponent(item.story.slug);

                    return (
                      <article
                        className="library-progress-card"
                        key={item.story.id}
                      >
                        <Link
                          className="library-progress-card__cover"
                          to={destination}
                          aria-label={item.story.title}
                        >
                          {item.story.coverUrl ? (
                            <img
                              src={item.story.coverUrl}
                              alt={copy.coverAlt(item.story.title)}
                            />
                          ) : (
                            <BookOpen aria-hidden="true" />
                          )}
                        </Link>

                        <div className="library-progress-card__body">
                          <div>
                            <Link to={destination}>
                              <h3 {...storyAttributes}>{item.story.title}</h3>
                            </Link>

                            <p dir="auto">
                              {item.chapter?.title ?? copy.startStory}
                            </p>
                          </div>

                          <div className="library-progress-card__progress">
                            <div>
                              <span>
                                {copy.progressLabel(item.story.title)}
                              </span>
                              <strong>{copy.percent(percentage)}</strong>
                            </div>

                            <progress
                              value={progressValue}
                              max={1}
                              aria-label={copy.progressLabel(item.story.title)}
                            >
                              {percentage}%
                            </progress>
                          </div>

                          <div className="library-progress-card__footer">
                            <time dateTime={item.lastReadAt}>
                              <Clock3 aria-hidden="true" />
                              <span>
                                {copy.lastRead(formatDate(item.lastReadAt))}
                              </span>
                            </time>

                            <Link
                              className="button button--primary"
                              to={destination}
                            >
                              {item.chapter ? copy.continue : copy.view}
                            </Link>
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>

                {progressPagination.hasMore && progressPagination.nextCursor ? (
                  <div className="library-panel__load-more">
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={loadingProgressMore}
                      onClick={() => void loadMoreProgress()}
                    >
                      {loadingProgressMore
                        ? copy.loadingMore
                        : copy.loadMoreProgress}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section
            className="library-panel"
            aria-labelledby="library-history-title"
          >
            <header className="library-panel__header">
              <div className="library-panel__title">
                <span aria-hidden="true">
                  <History />
                </span>

                <div>
                  <p>{copy.sections.historyEyebrow}</p>
                  <h2 id="library-history-title">{copy.sections.history}</h2>
                </div>
              </div>

              <strong>{copy.count(history.length)}</strong>
            </header>

            {history.length === 0 ? (
              <div className="library-empty">
                <span aria-hidden="true">
                  <History />
                </span>
                <h3>{copy.empty.historyTitle}</h3>
                <p>{copy.empty.history}</p>
              </div>
            ) : (
              <>
                <ul className="library-history-list">
                  {history.map((item) => {
                    const destination =
                      "/stories/" +
                      encodeURIComponent(item.story.slug) +
                      "/chapters/" +
                      encodeURIComponent(item.chapter.id);

                    return (
                      <li key={item.story.id + ":" + item.chapter.id}>
                        <Link
                          className="library-history-list__main"
                          to={destination}
                        >
                          <span className="library-history-list__cover">
                            {item.story.coverUrl ? (
                              <img src={item.story.coverUrl} alt="" />
                            ) : (
                              <BookOpen aria-hidden="true" />
                            )}
                          </span>

                          <span className="library-history-list__copy">
                            <strong dir="auto">{item.story.title}</strong>
                            <small dir="auto">{item.chapter.title}</small>
                          </span>
                        </Link>

                        <time dateTime={item.lastReadAt}>
                          <Clock3 aria-hidden="true" />
                          <span>{formatDate(item.lastReadAt)}</span>
                        </time>
                      </li>
                    );
                  })}
                </ul>

                {historyPagination.hasMore && historyPagination.nextCursor ? (
                  <div className="library-panel__load-more">
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={loadingHistoryMore}
                      onClick={() => void loadMoreHistory()}
                    >
                      {loadingHistoryMore
                        ? copy.loadingMore
                        : copy.loadMoreHistory}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section
            className="library-panel"
            aria-labelledby="library-saved-title"
          >
            <header className="library-panel__header">
              <div className="library-panel__title">
                <span aria-hidden="true">
                  <Bookmark />
                </span>

                <div>
                  <p>{copy.sections.savedEyebrow}</p>
                  <h2 id="library-saved-title">{copy.sections.saved}</h2>
                </div>
              </div>

              <strong>{copy.count(entries.length)}</strong>
            </header>

            {entries.length === 0 ? (
              <div className="library-empty">
                <span aria-hidden="true">
                  <Bookmark />
                </span>
                <h3>{copy.empty.savedTitle}</h3>
                <p>{copy.empty.saved}</p>
              </div>
            ) : (
              <>
                <div className="library-story-grid">
                  {entries.map((entry) => (
                    <StoryCard key={entry.story.id} story={entry.story} />
                  ))}
                </div>

                {libraryPagination.hasMore && libraryPagination.nextCursor ? (
                  <div className="library-panel__load-more">
                    <button
                      className="button button--secondary"
                      type="button"
                      disabled={loadingLibraryMore}
                      onClick={() => void loadMoreLibrary()}
                    >
                      {loadingLibraryMore
                        ? copy.loadingMore
                        : copy.loadMoreLibrary}
                    </button>
                  </div>
                ) : null}
              </>
            )}
          </section>

          <section
            className="library-panel library-lists"
            aria-labelledby="library-lists-title"
          >
            <header className="library-panel__header">
              <div className="library-panel__title">
                <span aria-hidden="true">
                  <ListPlus />
                </span>

                <div>
                  <p>{copy.sections.listsEyebrow}</p>
                  <h2 id="library-lists-title">{copy.sections.lists}</h2>
                </div>
              </div>

              <strong>{copy.count(lists.length)}</strong>
            </header>

            <div className="library-lists__layout">
              <form
                className="library-list-form"
                onSubmit={(event) => void createList(event)}
              >
                <span className="library-list-form__icon" aria-hidden="true">
                  <ListPlus />
                </span>

                <h3>{copy.createList.title}</h3>
                <p>{copy.createList.description}</p>

                <label htmlFor="reading-list-name">
                  <span>{copy.createList.label}</span>
                  <input
                    id="reading-list-name"
                    value={listName}
                    maxLength={100}
                    placeholder={copy.createList.placeholder}
                    required
                    onChange={(event) => setListName(event.target.value)}
                  />
                </label>

                <label className="library-list-form__check">
                  <input
                    type="checkbox"
                    checked={listPublic}
                    onChange={(event) => setListPublic(event.target.checked)}
                  />
                  <Globe2 aria-hidden="true" />
                  <span>{copy.createList.public}</span>
                </label>

                <button
                  className="button button--primary"
                  type="submit"
                  disabled={creatingList || !listName.trim()}
                >
                  {creatingList
                    ? copy.createList.submitting
                    : copy.createList.submit}
                </button>
              </form>

              {lists.length === 0 ? (
                <div className="library-empty library-empty--compact">
                  <span aria-hidden="true">
                    <ListPlus />
                  </span>
                  <h3>{copy.empty.listsTitle}</h3>
                  <p>{copy.empty.lists}</p>
                </div>
              ) : (
                <ul className="library-reading-lists">
                  {lists.map((list) => (
                    <li key={list.id}>
                      <Link
                        to={"/reading-lists/" + encodeURIComponent(list.id)}
                        aria-label={copy.openList(list.name)}
                      >
                        <span
                          className="library-reading-lists__icon"
                          aria-hidden="true"
                        >
                          {list.isPublic ? <Globe2 /> : <LockKeyhole />}
                        </span>

                        <span className="library-reading-lists__copy">
                          <strong dir="auto">{list.name}</strong>

                          {list.description ? (
                            <small dir="auto">{list.description}</small>
                          ) : null}
                        </span>

                        <span className="library-reading-lists__meta">
                          <small>{copy.storyCount(list.itemCount)}</small>
                          <small>
                            {list.isPublic
                              ? copy.visibility.public
                              : copy.visibility.private}
                          </small>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
