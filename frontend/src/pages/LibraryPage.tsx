import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { Story } from "../types/story";

interface LibraryResponse {
  data: {
    entries: Array<{ addedAt: string; story: Story }>;
    pagination: { hasMore: boolean; nextCursor: string | null };
  };
}

interface ProgressResponse {
  data: {
    items: Array<{
      progress: number;
      lastReadAt: string;
      chapter: { id: string; title: string } | null;
      story: Story;
    }>;
    pagination: { hasMore: boolean; nextCursor: string | null };
  };
}

interface HistoryResponse {
  data: {
    items: Array<{
      lastReadAt: string;
      chapter: { id: string; title: string };
      story: {
        id: string;
        slug: string;
        title: string;
        coverUrl: string | null;
        isMature: boolean;
        author: { username: string; displayName: string };
      };
    }>;
    pagination: { hasMore: boolean; nextCursor: string | null };
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
  data: { lists: ReadingList[] };
}

export default function LibraryPage() {
  const { request } = useAuth();
  const [entries, setEntries] = useState<LibraryResponse["data"]["entries"]>([]);
  const [progress, setProgress] = useState<ProgressResponse["data"]["items"]>([]);
  const [lists, setLists] = useState<ReadingList[]>([]);
  const [history, setHistory] = useState<HistoryResponse["data"]["items"]>([]);
  const [listName, setListName] = useState("");
  const [listPublic, setListPublic] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [library, readingProgress, readingLists, readingHistory] = await Promise.all([
      request<LibraryResponse>("/api/v1/library?limit=30"),
      request<ProgressResponse>("/api/v1/reading-progress?limit=30"),
      request<ListsResponse>("/api/v1/reading-lists"),
      request<HistoryResponse>("/api/v1/analytics/history?limit=20"),
    ]);
    setEntries(library.data.entries);
    setProgress(readingProgress.data.items);
    setLists(readingLists.data.lists);
    setHistory(readingHistory.data.items);
  }, [request]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function createList(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!listName.trim()) return;
    setError(null);
    try {
      await request("/api/v1/reading-lists", {
        method: "POST",
        body: JSON.stringify({ name: listName.trim(), isPublic: listPublic }),
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

      {error && <p className="status-message status-message--error" role="alert">{error}</p>}

      <section className="section-block">
        <h2>ادامه مطالعه</h2>
        {progress.length === 0 ? (
          <p className="empty-state">هنوز پیشرفت مطالعه‌ای ثبت نشده است.</p>
        ) : (
          <div className="continue-list">
            {progress.map((item) => (
              <article className="surface continue-item" key={item.story.id}>
                <div>
                  <strong>{item.story.title}</strong>
                  <p>{item.chapter?.title ?? "شروع داستان"}</p>
                </div>
                <progress value={item.progress} max={1}>
                  {Math.round(item.progress * 100)}%
                </progress>
                {item.chapter ? (
                  <Link className="button button--secondary" to={`/stories/${item.story.slug}/chapters/${item.chapter.id}`}>
                    ادامه
                  </Link>
                ) : (
                  <Link className="button button--secondary" to={`/stories/${item.story.slug}`}>مشاهده</Link>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="section-block">
        <h2>تاریخچه مطالعه</h2>
        {history.length === 0 ? (
          <p className="empty-state">هنوز فصلی در تاریخچه ثبت نشده است.</p>
        ) : (
          <ul className="simple-list">
            {history.map((item) => (
              <li key={`${item.story.id}:${item.chapter.id}`}>
                <Link to={`/stories/${item.story.slug}/chapters/${item.chapter.id}`}>
                  <strong>{item.story.title}</strong>
                  <span>{item.chapter.title}</span>
                </Link>
                <time dateTime={item.lastReadAt}>
                  {new Date(item.lastReadAt).toLocaleDateString("fa-IR")}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="section-block">
        <h2>ذخیره‌شده‌ها</h2>
        {entries.length === 0 ? (
          <p className="empty-state">داستانی در کتابخانه ندارید.</p>
        ) : (
          <div className="story-grid">
            {entries.map((entry) => <StoryCard key={entry.story.id} story={entry.story} />)}
          </div>
        )}
      </section>

      <section className="surface">
        <h2>فهرست‌های مطالعه</h2>
        <form className="inline-form" onSubmit={(event) => void createList(event)}>
          <label className="sr-only" htmlFor="reading-list-name">نام فهرست</label>
          <input id="reading-list-name" value={listName} maxLength={100} placeholder="مثلاً بعداً می‌خوانم" onChange={(event) => setListName(event.target.value)} />
          <label className="inline-check">
            <input type="checkbox" checked={listPublic} onChange={(event) => setListPublic(event.target.checked)} />
            عمومی
          </label>
          <button className="button" type="submit">ساخت فهرست</button>
        </form>
        <ul className="simple-list">
          {lists.map((list) => (
            <li key={list.id}>
              <Link to={`/reading-lists/${list.id}`}><strong>{list.name}</strong></Link>
              <span>{list.itemCount.toLocaleString("fa-IR")} داستان · {list.isPublic ? "عمومی" : "خصوصی"}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
