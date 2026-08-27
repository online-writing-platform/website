import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type { Chapter, ChapterResponse, StoryResponse } from "../types/story";

interface LocalDraft {
  title: string;
  content: string;
  savedAt: string;
}

interface PendingDraft {
  title: string;
  content: string;
  generation: number;
}

interface ConflictInfo {
  currentVersion?: number;
  updatedAt?: string;
}

function draftKey(storyId: string, chapterId: string): string {
  return `writing-platform:draft:${storyId}:${chapterId}`;
}

export default function ChapterEditorPage() {
  const { storyId = "", chapterId = "" } = useParams();
  const { i18n } = useTranslation();
  const { request } = useAuth();

  const [chapter, setChapter] = useState<Chapter | null>(null);
  const [storyLanguage, setStoryLanguage] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [statusMessage, setStatusMessage] = useState("در حال بارگذاری…");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);

  const saveTimer = useRef<number | undefined>(undefined);
  const dirtyRef = useRef(false);
  const chapterRef = useRef<Chapter | null>(null);
  const latestDraftRef = useRef<PendingDraft | null>(null);
  const editGenerationRef = useRef(0);
  const saveLoopRef = useRef<Promise<boolean> | null>(null);
  const conflictRef = useRef<ConflictInfo | null>(null);

  const load = useCallback(async (): Promise<void> => {
    const [response, storyResponse] = await Promise.all([
      request<ChapterResponse>(
        `/api/v1/stories/mine/${storyId}/chapters/${chapterId}`,
      ),
      request<StoryResponse>(`/api/v1/stories/mine/${storyId}`),
    ]);

    const value = response.data.chapter;
    const serverContent = value.content ?? "";

    setStoryLanguage(storyResponse.data.story.language);

    chapterRef.current = value;
    conflictRef.current = null;
    editGenerationRef.current = 0;

    latestDraftRef.current = {
      title: value.title,
      content: serverContent,
      generation: 0,
    };

    dirtyRef.current = false;

    setChapter(value);
    setTitle(value.title);
    setContent(serverContent);
    setConflict(null);
    setStatusMessage(`نسخه ${value.version} از سرور بارگذاری شد.`);

    const raw = localStorage.getItem(draftKey(storyId, chapterId));

    if (!raw) {
      setLocalDraft(null);
      return;
    }

    try {
      const parsed = JSON.parse(raw) as LocalDraft;

      const differsFromServer =
        parsed.title !== value.title || parsed.content !== serverContent;

      if (differsFromServer) {
        setLocalDraft(parsed);
      } else {
        localStorage.removeItem(draftKey(storyId, chapterId));
        setLocalDraft(null);
      }
    } catch {
      localStorage.removeItem(draftKey(storyId, chapterId));
      setLocalDraft(null);
    }
  }, [chapterId, request, storyId]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => {
        setError(getErrorMessage(cause));
      });
    }, 0);

    return () => {
      window.clearTimeout(loadTimer);
      window.clearTimeout(saveTimer.current);
    };
  }, [load]);

  function persistRecoveryDraft(nextTitle: string, nextContent: string): void {
    localStorage.setItem(
      draftKey(storyId, chapterId),
      JSON.stringify({
        title: nextTitle,
        content: nextContent,
        savedAt: new Date().toISOString(),
      }),
    );
  }

  function scheduleSave(nextTitle: string, nextContent: string): void {
    if (!chapterRef.current || conflictRef.current) {
      return;
    }

    const nextGeneration = editGenerationRef.current + 1;

    editGenerationRef.current = nextGeneration;

    latestDraftRef.current = {
      title: nextTitle,
      content: nextContent,
      generation: nextGeneration,
    };

    dirtyRef.current = true;

    persistRecoveryDraft(nextTitle, nextContent);

    setStatusMessage("تغییرات محلی ذخیره شد؛ در انتظار ذخیره روی سرور…");

    window.clearTimeout(saveTimer.current);

    saveTimer.current = window.setTimeout(() => {
      void saveToServer();
    }, 900);
  }

  async function runSaveLoop(): Promise<boolean> {
    while (dirtyRef.current && !conflictRef.current) {
      const currentChapter = chapterRef.current;
      const draft = latestDraftRef.current;

      if (!currentChapter || !draft) {
        return false;
      }

      const sentGeneration = draft.generation;
      const sentTitle = draft.title;
      const sentContent = draft.content;
      const expectedVersion = currentChapter.version;

      setStatusMessage("در حال ذخیره روی سرور…");
      setError(null);

      try {
        const response = await request<ChapterResponse>(
          `/api/v1/stories/${storyId}/chapters/${chapterId}`,
          {
            method: "PATCH",
            body: JSON.stringify({
              title: sentTitle.trim() || currentChapter.title,
              content: sentContent,
              expectedVersion,
            }),
          },
        );

        const value = response.data.chapter;

        chapterRef.current = value;
        setChapter(value);

        const latestDraft = latestDraftRef.current;

        if (!latestDraft || latestDraft.generation === sentGeneration) {
          dirtyRef.current = false;

          localStorage.removeItem(draftKey(storyId, chapterId));

          setLocalDraft(null);
          setStatusMessage(`ذخیره شد · نسخه ${value.version}`);

          return true;
        }

        setStatusMessage(
          "نسخه قبلی ذخیره شد؛ تغییرات جدیدتر در حال ذخیره است…",
        );
      } catch (cause) {
        if (
          cause instanceof ApiError &&
          cause.status === 409 &&
          cause.code === "CHAPTER_EDIT_CONFLICT"
        ) {
          const details = cause.details as ConflictInfo | undefined;
          const nextConflict = details ?? {};

          conflictRef.current = nextConflict;

          setConflict(nextConflict);

          setStatusMessage("ذخیره متوقف شد: نسخه جدیدتری روی سرور وجود دارد.");

          return false;
        }

        setError(getErrorMessage(cause));

        setStatusMessage(
          "ذخیره روی سرور ناموفق بود؛ نسخه بازیابی محلی حفظ شده است.",
        );

        return false;
      }
    }

    return !dirtyRef.current && !conflictRef.current;
  }

  function saveToServer(): Promise<boolean> {
    if (saveLoopRef.current) {
      return saveLoopRef.current;
    }

    window.clearTimeout(saveTimer.current);

    const savePromise = runSaveLoop();

    saveLoopRef.current = savePromise;

    void savePromise.finally(() => {
      if (saveLoopRef.current === savePromise) {
        saveLoopRef.current = null;
      }
    });

    return savePromise;
  }

  async function togglePublish(): Promise<void> {
    if (!chapterRef.current) {
      return;
    }

    setError(null);

    try {
      const saved = await saveToServer();

      if (!saved || dirtyRef.current || conflictRef.current) {
        return;
      }

      const currentChapter = chapterRef.current;

      if (!currentChapter) {
        return;
      }

      const response = await request<ChapterResponse>(
        `/api/v1/stories/${storyId}/chapters/${chapterId}/${
          currentChapter.status === "PUBLISHED" ? "unpublish" : "publish"
        }`,
        {
          method: "POST",
        },
      );

      const value = response.data.chapter;

      chapterRef.current = value;
      setChapter(value);

      setStatusMessage(
        value.status === "PUBLISHED"
          ? "فصل منتشر شد."
          : "فصل به پیش‌نویس برگشت.",
      );
    } catch (cause) {
      setError(getErrorMessage(cause));
    }
  }

  if (!chapter) {
    return (
      <main className="page-shell">
        {error ? (
          <p className="status-message status-message--error">{error}</p>
        ) : (
          <p>{statusMessage}</p>
        )}
      </main>
    );
  }

  const storyTextAttributes = getStoryTextAttributes(storyLanguage);

  const interfaceLocale = i18n.resolvedLanguage?.startsWith("en")
    ? "en-US"
    : "fa-IR";

  const wordCount = content.trim() ? content.trim().split(/\s+/u).length : 0;

  return (
    <main className="editor-shell">
      <header className="editor-toolbar">
        <Link to={`/write/${storyId}`}>
          <span aria-hidden="true">{i18n.dir() === "rtl" ? "→" : "←"}</span>{" "}
          بازگشت به داستان
        </Link>

        <span aria-live="polite">{statusMessage}</span>

        <div className="button-row">
          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              void saveToServer();
            }}
          >
            ذخیره
          </button>

          <button
            className="button"
            type="button"
            disabled={Boolean(conflict)}
            onClick={() => {
              void togglePublish();
            }}
          >
            {chapter.status === "PUBLISHED"
              ? "خارج کردن از انتشار"
              : "انتشار فصل"}
          </button>
        </div>
      </header>

      {error ? (
        <p className="status-message status-message--error" role="alert">
          {error}
        </p>
      ) : null}

      {localDraft && !conflict ? (
        <div className="status-message status-message--warning">
          <p>یک نسخه بازیابی محلی متفاوت از نسخه سرور پیدا شد.</p>

          <div className="button-row">
            <button
              type="button"
              className="button button--secondary"
              onClick={() => {
                const nextGeneration = editGenerationRef.current + 1;

                editGenerationRef.current = nextGeneration;

                latestDraftRef.current = {
                  title: localDraft.title,
                  content: localDraft.content,
                  generation: nextGeneration,
                };

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
      ) : null}

      {conflict ? (
        <div className="status-message status-message--error" role="alert">
          <strong>تعارض ویرایش</strong>

          <p>
            فصل بعد از نسخه {chapter.version} در جای دیگری تغییر کرده است. برای
            جلوگیری از ازبین‌رفتن تغییرات جدید، autosave متوقف شده است. پیش‌نویس
            محلی شما در مرورگر حفظ می‌شود.
          </p>

          <button
            className="button button--secondary"
            type="button"
            onClick={() => {
              void load();
            }}
          >
            بارگذاری نسخه سرور
          </button>
        </div>
      ) : null}

      <section className="chapter-editor">
        <label htmlFor="chapter-title">عنوان فصل</label>

        <input
          id="chapter-title"
          className="chapter-editor__title"
          value={title}
          maxLength={200}
          {...storyTextAttributes}
          onChange={(event) => {
            const nextTitle = event.target.value;

            setTitle(nextTitle);
            scheduleSave(nextTitle, content);
          }}
        />

        <label htmlFor="chapter-content">متن فصل</label>

        <textarea
          id="chapter-content"
          className="chapter-editor__content"
          value={content}
          maxLength={100000}
          spellCheck
          {...storyTextAttributes}
          onChange={(event) => {
            const nextContent = event.target.value;

            setContent(nextContent);
            scheduleSave(title, nextContent);
          }}
        />

        <footer>
          <span>{wordCount.toLocaleString(interfaceLocale)} واژه</span>

          <span>نسخه {chapter.version}</span>
        </footer>
      </section>
    </main>
  );
}
