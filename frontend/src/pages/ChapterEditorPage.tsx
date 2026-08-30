import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpenText,
  Check,
  CircleAlert,
  Cloud,
  CloudUpload,
  FileClock,
  Languages,
  LoaderCircle,
  RotateCcw,
  Save,
  Send,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import RichTextEditor from "../components/RichTextEditor";
import useAuth from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type { Chapter, ChapterResponse, StoryResponse } from "../types/story";

import "./ChapterEditorPage.css";

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

type InterfaceLanguage = "fa" | "en";

type EditorStatus =
  | { type: "loading" }
  | { type: "loaded"; version: number }
  | { type: "local-pending" }
  | { type: "saving" }
  | { type: "saved"; version: number }
  | { type: "saving-newer" }
  | { type: "conflict" }
  | { type: "save-failed" }
  | { type: "recovered" }
  | { type: "published" }
  | { type: "unpublished" };

const COPY = {
  fa: {
    locale: "fa-IR",
    loading: "در حال دریافت فصل…",
    back: "بازگشت به داستان",
    workspace: "فضای نوشتن",
    autosave: "ذخیرهٔ خودکار فعال است",
    draft: "پیش‌نویس",
    published: "منتشرشده",
    save: "ذخیره",
    saving: "در حال ذخیره…",
    publish: "انتشار فصل",
    unpublish: "خارج‌کردن از انتشار",
    titleLabel: "عنوان فصل",
    contentLabel: "متن فصل",
    contentPlaceholder: "نوشتن این فصل را شروع کنید…",
    persian: "فارسی",
    english: "انگلیسی",
    automatic: "تشخیص خودکار",
    loadedVersion: (version: number) => `نسخه ${version} از سرور بارگذاری شد.`,
    localPending: "تغییرات محلی ذخیره شد؛ در انتظار ذخیره روی سرور…",
    savingServer: "در حال ذخیره روی سرور…",
    savedVersion: (version: number) => `ذخیره شد · نسخه ${version}`,
    savingNewer: "نسخه قبلی ذخیره شد؛ تغییرات جدیدتر در حال ذخیره است…",
    saveStoppedConflict: "ذخیره متوقف شد: نسخه جدیدتری روی سرور وجود دارد.",
    saveFailed: "ذخیره روی سرور ناموفق بود؛ نسخه بازیابی محلی حفظ شده است.",
    recovered: "نسخه بازیابی محلی آماده ذخیره است.",
    chapterPublished: "فصل منتشر شد.",
    chapterUnpublished: "فصل به پیش‌نویس برگشت.",
    recoveryTitle: "یک نسخهٔ بازیابی محلی پیدا شد",
    recoveryDescription: (date: string) =>
      `این نسخه در ${date} ذخیره شده و با نسخهٔ سرور متفاوت است.`,
    restore: "بازیابی نسخه",
    discard: "کنار گذاشتن",
    conflictTitle: "تعارض ویرایش",
    conflictDescription:
      "این فصل در جای دیگری تغییر کرده است. برای جلوگیری از ازدست‌رفتن نوشته‌ها، ذخیرهٔ خودکار متوقف شده و نسخهٔ محلی در مرورگر باقی مانده است.",
    serverVersion: (version: number) => `آخرین نسخهٔ سرور: ${version}`,
    loadServer: "دریافت نسخهٔ سرور",
    words: (value: number) => `${value.toLocaleString("fa-IR")} واژه`,
    characters: (value: number) =>
      `${value.toLocaleString("fa-IR")} از ۱۰۰٬۰۰۰ نویسه`,
    version: (value: number) => `نسخه ${value.toLocaleString("fa-IR")}`,
  },
  en: {
    locale: "en-US",
    loading: "Loading chapter…",
    back: "Back to story",
    workspace: "Writing desk",
    autosave: "Autosave is active",
    draft: "Draft",
    published: "Published",
    save: "Save",
    saving: "Saving…",
    publish: "Publish chapter",
    unpublish: "Unpublish chapter",
    titleLabel: "Chapter title",
    contentLabel: "Chapter text",
    contentPlaceholder: "Start writing this chapter…",
    persian: "Persian",
    english: "English",
    automatic: "Automatic detection",
    loadedVersion: (version: number) =>
      `Version ${version} was loaded from the server.`,
    localPending:
      "Changes were saved locally and are waiting to be saved to the server…",
    savingServer: "Saving to the server…",
    savedVersion: (version: number) => `Saved · Version ${version}`,
    savingNewer:
      "The previous version was saved; newer changes are now being saved…",
    saveStoppedConflict:
      "Saving stopped because a newer server version exists.",
    saveFailed:
      "The server save failed; the local recovery copy was preserved.",
    recovered: "The local recovery copy is ready to be saved.",
    chapterPublished: "The chapter was published.",
    chapterUnpublished: "The chapter was returned to draft.",
    recoveryTitle: "A local recovery copy was found",
    recoveryDescription: (date: string) =>
      `This copy was saved at ${date} and differs from the server version.`,
    restore: "Restore copy",
    discard: "Discard",
    conflictTitle: "Editing conflict",
    conflictDescription:
      "This chapter was changed elsewhere. Autosave has stopped to prevent data loss, and your local copy remains in the browser.",
    serverVersion: (version: number) => `Latest server version: ${version}`,
    loadServer: "Load server version",
    words: (value: number) =>
      `${value.toLocaleString("en-US")} ${value === 1 ? "word" : "words"}`,
    characters: (value: number) =>
      `${value.toLocaleString("en-US")} of 100,000 characters`,
    version: (value: number) => `Version ${value.toLocaleString("en-US")}`,
  },
} as const;

function draftKey(storyId: string, chapterId: string): string {
  return `writing-platform:draft:${storyId}:${chapterId}`;
}

function getStatusMessage(
  status: EditorStatus,
  copy: (typeof COPY)[InterfaceLanguage],
): string {
  switch (status.type) {
    case "loading":
      return copy.loading;

    case "loaded":
      return copy.loadedVersion(status.version);

    case "local-pending":
      return copy.localPending;

    case "saving":
      return copy.savingServer;

    case "saved":
      return copy.savedVersion(status.version);

    case "saving-newer":
      return copy.savingNewer;

    case "conflict":
      return copy.saveStoppedConflict;

    case "save-failed":
      return copy.saveFailed;

    case "recovered":
      return copy.recovered;

    case "published":
      return copy.chapterPublished;

    case "unpublished":
      return copy.chapterUnpublished;
  }
}

function getStatusKind(status: EditorStatus): string {
  switch (status.type) {
    case "saved":
    case "published":
    case "unpublished":
      return "success";

    case "saving":
    case "saving-newer":
      return "saving";

    case "local-pending":
    case "recovered":
      return "local";

    case "conflict":
    case "save-failed":
      return "error";

    default:
      return "neutral";
  }
}

export default function ChapterEditorPage() {
  const { storyId = "", chapterId = "" } = useParams();

  const { i18n } = useTranslation();
  const { request } = useAuth();

  const interfaceLanguage: InterfaceLanguage =
    i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";

  const copy = COPY[interfaceLanguage];

  const direction = interfaceLanguage === "fa" ? "rtl" : "ltr";

  const [chapter, setChapter] = useState<Chapter | null>(null);

  const [storyLanguage, setStoryLanguage] = useState("");

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [wordCount, setWordCount] = useState(0);
  const [characterCount, setCharacterCount] = useState(0);

  const [editorStatus, setEditorStatus] = useState<EditorStatus>({
    type: "loading",
  });

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
    setError(null);

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
    setWordCount(value.wordCount);
    setCharacterCount(0);
    setConflict(null);

    setEditorStatus({
      type: "loaded",
      version: value.version,
    });

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

        setEditorStatus({
          type: "save-failed",
        });
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

    setEditorStatus({
      type: "local-pending",
    });

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

      setEditorStatus({
        type: "saving",
      });

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

          setEditorStatus({
            type: "saved",
            version: value.version,
          });

          return true;
        }

        setEditorStatus({
          type: "saving-newer",
        });
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

          setEditorStatus({
            type: "conflict",
          });

          return false;
        }

        setError(getErrorMessage(cause));

        setEditorStatus({
          type: "save-failed",
        });

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

      setEditorStatus({
        type: value.status === "PUBLISHED" ? "published" : "unpublished",
      });
    } catch (cause) {
      setError(getErrorMessage(cause));

      setEditorStatus({
        type: "save-failed",
      });
    }
  }

  function recoverLocalDraft(): void {
    if (!localDraft) {
      return;
    }

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

    setEditorStatus({
      type: "recovered",
    });

    persistRecoveryDraft(localDraft.title, localDraft.content);
  }

  function discardLocalDraft(): void {
    localStorage.removeItem(draftKey(storyId, chapterId));

    setLocalDraft(null);
  }

  const statusMessage = getStatusMessage(editorStatus, copy);

  const statusKind = getStatusKind(editorStatus);

  const isSaving =
    editorStatus.type === "saving" || editorStatus.type === "saving-newer";

  if (!chapter) {
    return (
      <main
        className="chapter-write-loading"
        dir={direction}
        lang={interfaceLanguage}
        aria-busy={!error}
      >
        <div
          className={
            error
              ? "chapter-write-loading__card chapter-write-loading__card--error"
              : "chapter-write-loading__card"
          }
        >
          {error ? (
            <>
              <CircleAlert aria-hidden="true" size={30} />

              <p role="alert">{error}</p>
            </>
          ) : (
            <>
              <LoaderCircle
                className="chapter-write-spin"
                aria-hidden="true"
                size={34}
              />

              <p aria-live="polite">{statusMessage}</p>
            </>
          )}
        </div>
      </main>
    );
  }

  const storyTextAttributes = getStoryTextAttributes(storyLanguage);

  const storyLanguageLabel =
    storyTextAttributes.lang === "fa"
      ? copy.persian
      : storyTextAttributes.lang === "en"
        ? copy.english
        : copy.automatic;

  const storyDirectionLabel = storyTextAttributes.dir.toUpperCase();

  const displayTitle = title.trim();

  const headingTextAttributes = displayTitle
    ? storyTextAttributes
    : { dir: direction, lang: interfaceLanguage };

  const formattedRecoveryDate = localDraft
    ? new Date(localDraft.savedAt).toLocaleString(copy.locale)
    : "";

  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <main
      className="chapter-write-page"
      dir={direction}
      lang={interfaceLanguage}
      aria-busy={isSaving}
    >
      <div className="chapter-write-page__decoration" aria-hidden="true" />

      <div className="chapter-write-page__container">
        <header className="chapter-write-toolbar">
          <div className="chapter-write-toolbar__identity">
            <Link
              className="chapter-write-toolbar__back"
              to={`/write/${storyId}`}
            >
              <BackIcon aria-hidden="true" size={18} />

              <span>{copy.back}</span>
            </Link>

            <div className="chapter-write-toolbar__chapter">
              <span className="chapter-write-toolbar__icon" aria-hidden="true">
                <BookOpenText size={21} />
              </span>

              <div>
                <span className="chapter-write-toolbar__eyebrow">
                  {copy.workspace}
                </span>

                <strong {...storyTextAttributes}>{chapter.title}</strong>
              </div>
            </div>
          </div>

          <div
            className="chapter-write-status"
            data-kind={statusKind}
            aria-live="polite"
          >
            {isSaving ? (
              <LoaderCircle
                className="chapter-write-spin"
                aria-hidden="true"
                size={16}
              />
            ) : statusKind === "success" ? (
              <Check aria-hidden="true" size={16} />
            ) : statusKind === "error" ? (
              <CircleAlert aria-hidden="true" size={16} />
            ) : statusKind === "local" ? (
              <CloudUpload aria-hidden="true" size={16} />
            ) : (
              <Cloud aria-hidden="true" size={16} />
            )}

            <span>{statusMessage}</span>
          </div>

          <div className="chapter-write-toolbar__actions">
            <button
              className="chapter-write-button chapter-write-button--secondary"
              type="button"
              disabled={isSaving || Boolean(conflict)}
              onClick={() => {
                void saveToServer();
              }}
            >
              {isSaving ? (
                <LoaderCircle
                  className="chapter-write-spin"
                  aria-hidden="true"
                  size={17}
                />
              ) : (
                <Save aria-hidden="true" size={17} />
              )}

              <span>{isSaving ? copy.saving : copy.save}</span>
            </button>

            <button
              className="chapter-write-button chapter-write-button--publish"
              type="button"
              disabled={isSaving || Boolean(conflict)}
              onClick={() => {
                void togglePublish();
              }}
            >
              <Send aria-hidden="true" size={17} />

              <span>
                {chapter.status === "PUBLISHED" ? copy.unpublish : copy.publish}
              </span>
            </button>
          </div>
        </header>

        {error ? (
          <div
            className="chapter-write-alert chapter-write-alert--error"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={22} />

            <p>{error}</p>
          </div>
        ) : null}

        {localDraft && !conflict ? (
          <aside className="chapter-write-alert chapter-write-alert--recovery">
            <FileClock aria-hidden="true" size={23} />

            <div className="chapter-write-alert__content">
              <strong>{copy.recoveryTitle}</strong>

              <p>{copy.recoveryDescription(formattedRecoveryDate)}</p>
            </div>

            <div className="chapter-write-alert__actions">
              <button
                className="chapter-write-button chapter-write-button--secondary"
                type="button"
                onClick={recoverLocalDraft}
              >
                <RotateCcw aria-hidden="true" size={16} />

                <span>{copy.restore}</span>
              </button>

              <button
                className="chapter-write-button chapter-write-button--quiet"
                type="button"
                onClick={discardLocalDraft}
              >
                <Trash2 aria-hidden="true" size={16} />

                <span>{copy.discard}</span>
              </button>
            </div>
          </aside>
        ) : null}

        {conflict ? (
          <aside
            className="chapter-write-alert chapter-write-alert--conflict"
            role="alert"
          >
            <CircleAlert aria-hidden="true" size={24} />

            <div className="chapter-write-alert__content">
              <strong>{copy.conflictTitle}</strong>

              <p>{copy.conflictDescription}</p>

              {conflict.currentVersion ? (
                <small>{copy.serverVersion(conflict.currentVersion)}</small>
              ) : null}
            </div>

            <div className="chapter-write-alert__actions">
              <button
                className="chapter-write-button chapter-write-button--secondary"
                type="button"
                onClick={() => {
                  setEditorStatus({
                    type: "loading",
                  });

                  void load();
                }}
              >
                <RotateCcw aria-hidden="true" size={16} />

                <span>{copy.loadServer}</span>
              </button>
            </div>
          </aside>
        ) : null}

        <section
          className="chapter-writing-paper"
          aria-labelledby="chapter-writing-heading"
        >
          <div className="chapter-writing-paper__fields">
            <label className="chapter-writing-field" htmlFor="chapter-title">
              <span>{copy.titleLabel}</span>

              <input
                id="chapter-title"
                className="chapter-writing-field__title"
                value={title}
                maxLength={200}
                {...storyTextAttributes}
                onChange={(event) => {
                  const nextTitle = event.target.value;

                  setTitle(nextTitle);

                  scheduleSave(nextTitle, content);
                }}
              />
            </label>

            <div className="chapter-writing-field">
              <div className="chapter-writing-field__heading">
                <label htmlFor="chapter-content">{copy.contentLabel}</label>

                <span
                  className="chapter-writing-field__direction"
                  aria-label={`${storyLanguageLabel} · ${storyDirectionLabel}`}
                >
                  <Languages aria-hidden="true" size={14} />

                  <span>{storyLanguageLabel}</span>

                  <bdi dir="ltr">{storyDirectionLabel}</bdi>
                </span>
              </div>

              <RichTextEditor
                id="chapter-content"
                label={copy.contentLabel}
                value={content}
                direction={storyTextAttributes.dir}
                language={storyTextAttributes.lang}
                placeholder={copy.contentPlaceholder}
                onCharacterCountChange={setCharacterCount}
                onWordCountChange={setWordCount}
                onChange={(nextContent) => {
                  setContent(nextContent);

                  scheduleSave(title, nextContent);
                }}
              />
            </div>
          </div>

          <footer className="chapter-writing-paper__footer">
            <div className="chapter-writing-paper__stats">
              <span>{copy.words(wordCount)}</span>

              <span>{copy.characters(characterCount)}</span>

              <span>{copy.version(chapter.version)}</span>
            </div>

            <span className="chapter-writing-paper__autosave">
              <Cloud aria-hidden="true" size={14} />

              {copy.autosave}
            </span>
          </footer>
        </section>
      </div>
    </main>
  );
}
