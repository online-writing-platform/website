import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import type { Chapter, ChapterResponse } from "../types/story";

interface LocalDraft {
  title: string;
  content: string;
  savedAt: string;
}

function draftKey(storyId: string, chapterId: string): string {
  return `writing-platform:draft:${storyId}:${chapterId}`;
}

export default function ChapterEditorPage() {
  const { storyId = "", chapterId = "" } = useParams();
  const { request } = useAuth();
  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("در حال بارگذاری…");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ currentVersion?: number; updatedAt?: string } | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const dirtyRef = useRef(false);

  const load = useCallback(async (): Promise<void> => {
    const response = await request<ChapterResponse>(
      `/api/v1/stories/mine/${storyId}/chapters/${chapterId}`,
    );
    const value = response.data.chapter;
    setChapter(value);
    setTitle(value.title);
    setContent(value.content ?? "");
    setConflict(null);
    dirtyRef.current = false;
    setStatusMessage(`نسخه ${value.version} از سرور بارگذاری شد.`);

    const raw = localStorage.getItem(draftKey(storyId, chapterId));
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as LocalDraft;
        if (new Date(parsed.savedAt).getTime() > new Date(value.updatedAt).getTime()) {
          setLocalDraft(parsed);
        } else {
          localStorage.removeItem(draftKey(storyId, chapterId));
          setLocalDraft(null);
        }
      } catch {
        localStorage.removeItem(draftKey(storyId, chapterId));
      }
    }
  }, [chapterId, request, storyId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    window.clearTimeout(saveTimer.current);
    };
  }, [load]);

  function persistRecoveryDraft(nextTitle: string, nextContent: string): void {
    localStorage.setItem(
      draftKey(storyId, chapterId),
      JSON.stringify({ title: nextTitle, content: nextContent, savedAt: new Date().toISOString() }),
    );
  }

  function scheduleSave(nextTitle: string, nextContent: string): void {
    if (!chapter || conflict) return;
    dirtyRef.current = true;
    persistRecoveryDraft(nextTitle, nextContent);
    setStatusMessage("تغییرات محلی ذخیره شد؛ در انتظار ذخیره روی سرور…");
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void saveToServer(nextTitle, nextContent);
    }, 900);
  }

  async function saveToServer(nextTitle = title, nextContent = content): Promise<void> {
    if (!chapter || conflict || !dirtyRef.current) return;

    setStatusMessage("در حال ذخیره روی سرور…");
    setError(null);
    try {
      const response = await request<ChapterResponse>(
        `/api/v1/stories/${storyId}/chapters/${chapterId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: nextTitle.trim() || chapter.title,
            content: nextContent,
            expectedVersion: chapter.version,
          }),
        },
      );

      const value = response.data.chapter;
      setChapter(value);
      dirtyRef.current = false;
      localStorage.removeItem(draftKey(storyId, chapterId));
      setLocalDraft(null);
      setStatusMessage(`ذخیره شد · نسخه ${value.version}`);
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 409 && cause.code === "CHAPTER_EDIT_CONFLICT") {
        const details = cause.details as { currentVersion?: number; updatedAt?: string } | undefined;
        setConflict(details ?? {});
        setStatusMessage("ذخیره متوقف شد: نسخه جدیدتری روی سرور وجود دارد.");
        return;
      }
      setError(getErrorMessage(cause));
      setStatusMessage("ذخیره روی سرور ناموفق بود؛ نسخه بازیابی محلی حفظ شده است.");
    }
  }

  async function togglePublish(): Promise<void> {
    if (!chapter) return;
    setError(null);
    try {
      await saveToServer();
      const response = await request<ChapterResponse>(
        `/api/v1/stories/${storyId}/chapters/${chapterId}/${chapter.status === "PUBLISHED" ? "unpublish" : "publish"}`,
        { method: "POST" },
      );
      setChapter(response.data.chapter);
      setStatusMessage(response.data.chapter.status === "PUBLISHED" ? "فصل منتشر شد." : "فصل به پیش‌نویس برگشت.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  if (!chapter) {
    return <main className="page-shell">{error ? <p className="status-message status-message--error">{error}</p> : <p>{statusMessage}</p>}</main>;
  }

  return (
    <main className="editor-shell">
      <header className="editor-toolbar">
        <Link to={`/write/${storyId}`}>← بازگشت به داستان</Link>
        <span aria-live="polite">{statusMessage}</span>
        <div className="button-row">
          <button className="button button--secondary" type="button" onClick={() => void saveToServer()}>
            ذخیره
          </button>
          <button className="button" type="button" disabled={Boolean(conflict)} onClick={() => void togglePublish()}>
            {chapter.status === "PUBLISHED" ? "خارج کردن از انتشار" : "انتشار فصل"}
          </button>
        </div>
      </header>

      {error && <p className="status-message status-message--error" role="alert">{error}</p>}

      {localDraft && !conflict && (
        <div className="status-message status-message--warning">
          <p>یک نسخه بازیابی محلی جدیدتر از نسخه بارگذاری‌شده پیدا شد.</p>
          <div className="button-row">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                setTitle(localDraft.title);
                setContent(localDraft.content);
                dirtyRef.current = true;
                setLocalDraft(null);
                setStatusMessage("نسخه بازیابی محلی آماده ذخیره است.");
              }}
            >
              بازیابی نسخه محلی
            </button>
            <button
              type="button"
              className="button button--quiet"
              onClick={() => {
                localStorage.removeItem(draftKey(storyId, chapterId));
                setLocalDraft(null);
              }}
            >
              کنار گذاشتن
            </button>
          </div>
        </div>
      )}

      {conflict && (
        <div className="status-message status-message--error" role="alert">
          <strong>تعارض ویرایش</strong>
          <p>
            فصل بعد از نسخه {chapter.version} در جای دیگری تغییر کرده است. برای جلوگیری از ازبین‌رفتن تغییرات جدید،
            autosave متوقف شده است. پیش‌نویس محلی شما در مرورگر حفظ می‌شود.
          </p>
          <button className="button button--secondary" type="button" onClick={() => void load()}>
            بارگذاری نسخه سرور
          </button>
        </div>
      )}

      <section className="chapter-editor">
        <label htmlFor="chapter-title">عنوان فصل</label>
        <input
          id="chapter-title"
          className="chapter-editor__title"
          value={title}
          maxLength={200}
          onChange={(event) => {
            setTitle(event.target.value);
            scheduleSave(event.target.value, content);
          }}
        />
        <label htmlFor="chapter-content">متن فصل</label>
        <textarea
          id="chapter-content"
          className="chapter-editor__content"
          value={content}
          maxLength={100000}
          spellCheck
          onChange={(event) => {
            setContent(event.target.value);
            scheduleSave(title, event.target.value);
          }}
        />
        <footer>
          <span>{content.trim() ? content.trim().split(/\s+/u).length.toLocaleString("fa-IR") : "۰"} واژه</span>
          <span>نسخه {chapter.version}</span>
        </footer>
      </section>
    </main>
  );
}
