import { useCallback, useEffect, useState, type FormEvent } from "react";

import { Link } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

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

interface ProgressResponse {
    data: {
        items: Array<{
            progress: number;
            lastReadAt: string;

            chapter: {
                id: string;
                title: string;
            } | null;

            story: Story;
        }>;

        pagination: Pagination;
    };
}

interface HistoryResponse {
    data: {
        items: Array<{
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
        }>;

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

export default function LibraryPage() {
    const { request } = useAuth();

    const [entries, setEntries] = useState<LibraryResponse["data"]["entries"]>(
        [],
    );

    const [progress, setProgress] = useState<ProgressResponse["data"]["items"]>(
        [],
    );

    const [lists, setLists] = useState<ReadingList[]>([]);

    const [history, setHistory] = useState<HistoryResponse["data"]["items"]>(
        [],
    );

    const [libraryPagination, setLibraryPagination] =
        useState<Pagination>(EMPTY_PAGINATION);

    const [progressPagination, setProgressPagination] =
        useState<Pagination>(EMPTY_PAGINATION);

    const [historyPagination, setHistoryPagination] =
        useState<Pagination>(EMPTY_PAGINATION);

    const [loadingLibraryMore, setLoadingLibraryMore] = useState(false);

    const [loadingProgressMore, setLoadingProgressMore] = useState(false);

    const [loadingHistoryMore, setLoadingHistoryMore] = useState(false);

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
        const loadTimer = window.setTimeout(() => {
            void load().catch((cause) => setError(getErrorMessage(cause)));
        }, 0);

        return () => {
            window.clearTimeout(loadTimer);
        };
    }, [load]);

    async function loadMoreLibrary(): Promise<void> {
        const cursor = libraryPagination.nextCursor;

        if (!libraryPagination.hasMore || !cursor || loadingLibraryMore) {
            return;
        }

        setLoadingLibraryMore(true);

        setError(null);

        try {
            const response = await request<LibraryResponse>(
                `/api/v1/library?limit=30&cursor=${encodeURIComponent(cursor)}`,
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
                `/api/v1/reading-progress?limit=30&cursor=${encodeURIComponent(cursor)}`,
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
                `/api/v1/analytics/history?limit=20&cursor=${encodeURIComponent(cursor)}`,
            );

            setHistory((current) => [...current, ...response.data.items]);

            setHistoryPagination(response.data.pagination);
        } catch (cause) {
            setError(getErrorMessage(cause));
        } finally {
            setLoadingHistoryMore(false);
        }
    }

    async function createList(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();

        if (!listName.trim()) {
            return;
        }

        setError(null);

        try {
            await request("/api/v1/reading-lists", {
                method: "POST",

                body: JSON.stringify({
                    name: listName.trim(),

                    isPublic: listPublic,
                }),
            });

            setListName("");

            await load();
        } catch (cause) {
            setError(getErrorMessage(cause));
        }
    }

    return (
        <main className="page-shell">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">کتابخانه شخصی</p>

                    <h1>کتابخانه و ادامه مطالعه</h1>
                </div>
            </header>

            {error && (
                <p
                    className="status-message status-message--error"
                    role="alert"
                >
                    {error}
                </p>
            )}

            <section className="section-block">
                <h2>ادامه مطالعه</h2>

                {progress.length === 0 ? (
                    <p className="empty-state">
                        هنوز پیشرفت مطالعه‌ای ثبت نشده است.
                    </p>
                ) : (
                    <>
                        <div className="continue-list">
                            {progress.map((item) => (
                                <article
                                    className="surface continue-item"
                                    key={item.story.id}
                                >
                                    <div>
                                        <strong>{item.story.title}</strong>

                                        <p>
                                            {item.chapter?.title ??
                                                "شروع داستان"}
                                        </p>
                                    </div>

                                    <progress value={item.progress} max={1}>
                                        {Math.round(item.progress * 100)}%
                                    </progress>

                                    {item.chapter ? (
                                        <Link
                                            className="button button--secondary"
                                            to={`/stories/${item.story.slug}/chapters/${item.chapter.id}`}
                                        >
                                            ادامه
                                        </Link>
                                    ) : (
                                        <Link
                                            className="button button--secondary"
                                            to={`/stories/${item.story.slug}`}
                                        >
                                            مشاهده
                                        </Link>
                                    )}
                                </article>
                            ))}
                        </div>

                        {progressPagination.hasMore &&
                            progressPagination.nextCursor && (
                                <button
                                    className="button button--secondary"
                                    type="button"
                                    disabled={loadingProgressMore}
                                    onClick={() => void loadMoreProgress()}
                                >
                                    نمایش بیشتر ادامه مطالعه
                                </button>
                            )}
                    </>
                )}
            </section>

            <section className="section-block">
                <h2>تاریخچه مطالعه</h2>

                {history.length === 0 ? (
                    <p className="empty-state">
                        هنوز فصلی در تاریخچه ثبت نشده است.
                    </p>
                ) : (
                    <>
                        <ul className="simple-list">
                            {history.map((item) => (
                                <li key={`${item.story.id}:${item.chapter.id}`}>
                                    <Link
                                        to={`/stories/${item.story.slug}/chapters/${item.chapter.id}`}
                                    >
                                        <strong>{item.story.title}</strong>

                                        <span>{item.chapter.title}</span>
                                    </Link>

                                    <time dateTime={item.lastReadAt}>
                                        {new Date(
                                            item.lastReadAt,
                                        ).toLocaleDateString("fa-IR")}
                                    </time>
                                </li>
                            ))}
                        </ul>

                        {historyPagination.hasMore &&
                            historyPagination.nextCursor && (
                                <button
                                    className="button button--secondary"
                                    type="button"
                                    disabled={loadingHistoryMore}
                                    onClick={() => void loadMoreHistory()}
                                >
                                    نمایش بیشتر تاریخچه مطالعه
                                </button>
                            )}
                    </>
                )}
            </section>

            <section className="section-block">
                <h2>ذخیره‌شده‌ها</h2>

                {entries.length === 0 ? (
                    <p className="empty-state">داستانی در کتابخانه ندارید.</p>
                ) : (
                    <>
                        <div className="story-grid">
                            {entries.map((entry) => (
                                <StoryCard
                                    key={entry.story.id}
                                    story={entry.story}
                                />
                            ))}
                        </div>

                        {libraryPagination.hasMore &&
                            libraryPagination.nextCursor && (
                                <button
                                    className="button button--secondary"
                                    type="button"
                                    disabled={loadingLibraryMore}
                                    onClick={() => void loadMoreLibrary()}
                                >
                                    نمایش بیشتر ذخیره‌شده‌ها
                                </button>
                            )}
                    </>
                )}
            </section>

            <section className="surface">
                <h2>فهرست‌های مطالعه</h2>

                <form
                    className="inline-form"
                    onSubmit={(event) => void createList(event)}
                >
                    <label className="sr-only" htmlFor="reading-list-name">
                        نام فهرست
                    </label>

                    <input
                        id="reading-list-name"
                        value={listName}
                        maxLength={100}
                        placeholder="مثلاً بعداً می‌خوانم"
                        onChange={(event) => setListName(event.target.value)}
                    />

                    <label className="inline-check">
                        <input
                            type="checkbox"
                            checked={listPublic}
                            onChange={(event) =>
                                setListPublic(event.target.checked)
                            }
                        />
                        عمومی
                    </label>

                    <button className="button" type="submit">
                        ساخت فهرست
                    </button>
                </form>

                <ul className="simple-list">
                    {lists.map((list) => (
                        <li key={list.id}>
                            <Link to={`/reading-lists/${list.id}`}>
                                <strong>{list.name}</strong>
                            </Link>

                            <span>
                                {list.itemCount.toLocaleString("fa-IR")} داستان
                                · {list.isPublic ? "عمومی" : "خصوصی"}
                            </span>
                        </li>
                    ))}
                </ul>
            </section>
        </main>
    );
}
