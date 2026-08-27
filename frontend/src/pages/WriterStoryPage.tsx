import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowRight,
  BookOpen,
  Check,
  CircleAlert,
  Eye,
  FileText,
  ImagePlus,
  LoaderCircle,
  Plus,
  Save,
  Send,
  Settings2,
  Upload,
} from "lucide-react";
import { useTranslation } from "react-i18next";

import useAuth from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type {
  Chapter,
  ChapterResponse,
  Story,
  StoryResponse,
  StoryRights,
} from "../types/story";

import "./WriterStoryPage.css";

interface GenresResponse {
  data: {
    genres: Array<{
      slug: string;
      name: string;
    }>;
  };
}

interface MediaResponse {
  data: {
    media: {
      assetId: string;
      url: string;
      width: number;
      height: number;
    };
  };
}

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

type EditorSaveState =
  | "idle"
  | "local"
  | "saving"
  | "saved"
  | "error"
  | "conflict";

const STORY_STATUS_LABELS: Record<Story["status"], string> = {
  DRAFT: "پیش‌نویس",
  SCHEDULED: "زمان‌بندی‌شده",
  ONGOING: "در حال انتشار",
  COMPLETED: "کامل‌شده",
  HIATUS: "در حال وقفه",
};

const RIGHTS_LABELS: Record<StoryRights, string> = {
  ALL_RIGHTS_RESERVED: "تمام حقوق محفوظ است",
  CREATIVE_COMMONS: "Creative Commons",
  PUBLIC_DOMAIN: "مالکیت عمومی",
};

function draftKey(storyId: string, chapterId: string): string {
  return `writing-platform:draft:${storyId}:${chapterId}`;
}

function countWords(content: string): number {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    return 0;
  }

  return normalizedContent.split(/\s+/u).length;
}

export default function WriterStoryPage() {
  const { storyId = "", chapterId } = useParams();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const { request } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [genres, setGenres] = useState<GenresResponse["data"]["genres"]>([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [language, setLanguage] = useState("fa");
  const [storyStatus, setStoryStatus] = useState<Story["status"]>("DRAFT");
  const [genreSlug, setGenreSlug] = useState("");
  const [tags, setTags] = useState("");
  const [rights, setRights] = useState<StoryRights>("ALL_RIGHTS_RESERVED");
  const [isMature, setIsMature] = useState(false);

  const [newChapterTitle, setNewChapterTitle] = useState("");

  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null);
  const [editorTitle, setEditorTitle] = useState("");
  const [editorContent, setEditorContent] = useState("");

  const [cover, setCover] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [chapterLoading, setChapterLoading] = useState(false);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [chapterBusy, setChapterBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const [saveState, setSaveState] = useState<EditorSaveState>("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [localDraft, setLocalDraft] = useState<LocalDraft | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);
  const editorRef = useRef<HTMLElement | null>(null);

  const saveTimerRef = useRef<number | undefined>(undefined);
  const dirtyRef = useRef(false);
  const chapterRef = useRef<Chapter | null>(null);
  const latestDraftRef = useRef<PendingDraft | null>(null);
  const editGenerationRef = useRef(0);
  const saveLoopRef = useRef<Promise<boolean> | null>(null);
  const conflictRef = useRef<ConflictInfo | null>(null);

  const interfaceLocale = i18n.resolvedLanguage?.startsWith("en")
    ? "en-US"
    : "fa-IR";

  const chapters = useMemo(
    () =>
      [...(story?.chapters ?? [])].sort(
        (first, second) => first.position - second.position,
      ),
    [story?.chapters],
  );

  const storyTextAttributes = getStoryTextAttributes(language);

  const loadStory = useCallback(async (): Promise<void> => {
    const [storyResponse, genreResponse] = await Promise.all([
      request<StoryResponse>(`/api/v1/stories/mine/${storyId}`),
      request<GenresResponse>("/api/v1/stories/genres"),
    ]);

    const value = storyResponse.data.story;

    setStory(value);
    setGenres(genreResponse.data.genres);

    setTitle(value.title);
    setDescription(value.description);
    setLanguage(value.language);
    setStoryStatus(value.status);
    setGenreSlug(value.genre?.slug ?? "");
    setTags(value.tags.map((tag) => tag.name).join(", "));
    setRights(value.rights);
    setIsMature(value.isMature);
  }, [request, storyId]);

  useEffect(() => {
    let active = true;

    setPageLoading(true);
    setError(null);

    void loadStory()
      .catch((cause) => {
        if (active) {
          setError(getErrorMessage(cause));
        }
      })
      .finally(() => {
        if (active) {
          setPageLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadStory]);

  const resetEditorRefs = useCallback((): void => {
    window.clearTimeout(saveTimerRef.current);

    dirtyRef.current = false;
    chapterRef.current = null;
    latestDraftRef.current = null;
    editGenerationRef.current = 0;
    saveLoopRef.current = null;
    conflictRef.current = null;

    setConflict(null);
    setLocalDraft(null);
    setSaveState("idle");
    setSaveMessage("");
  }, []);

  const loadChapter = useCallback(
    async (targetChapterId: string): Promise<void> => {
      setChapterLoading(true);
      setError(null);
      resetEditorRefs();

      try {
        const response = await request<ChapterResponse>(
          `/api/v1/stories/mine/${storyId}/chapters/${targetChapterId}`,
        );

        const chapter = response.data.chapter;
        const serverContent = chapter.content ?? "";

        chapterRef.current = chapter;
        latestDraftRef.current = {
          title: chapter.title,
          content: serverContent,
          generation: 0,
        };

        setSelectedChapter(chapter);
        setEditorTitle(chapter.title);
        setEditorContent(serverContent);
        setSaveState("saved");
        setSaveMessage(`نسخه ${chapter.version} از سرور دریافت شد.`);

        const rawDraft = localStorage.getItem(
          draftKey(storyId, targetChapterId),
        );

        if (!rawDraft) {
          setLocalDraft(null);
          return;
        }

        try {
          const parsedDraft = JSON.parse(rawDraft) as LocalDraft;

          const differsFromServer =
            parsedDraft.title !== chapter.title ||
            parsedDraft.content !== serverContent;

          if (differsFromServer) {
            setLocalDraft(parsedDraft);
          } else {
            localStorage.removeItem(draftKey(storyId, targetChapterId));
          }
        } catch {
          localStorage.removeItem(draftKey(storyId, targetChapterId));
        }
      } catch (cause) {
        setSelectedChapter(null);
        setError(getErrorMessage(cause));
      } finally {
        setChapterLoading(false);
      }
    },
    [request, resetEditorRefs, storyId],
  );

  useEffect(() => {
    if (!chapterId) {
      resetEditorRefs();
      setSelectedChapter(null);
      setEditorTitle("");
      setEditorContent("");
      return;
    }

    void loadChapter(chapterId);

    return () => {
      window.clearTimeout(saveTimerRef.current);
    };
  }, [chapterId, loadChapter, resetEditorRefs]);

  useEffect(() => {
    if (!cover) {
      setCoverPreviewUrl(null);
      return;
    }

    const objectUrl = URL.createObjectURL(cover);
    setCoverPreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [cover]);

  function persistRecoveryDraft(nextTitle: string, nextContent: string): void {
    if (!chapterId) {
      return;
    }

    localStorage.setItem(
      draftKey(storyId, chapterId),
      JSON.stringify({
        title: nextTitle,
        content: nextContent,
        savedAt: new Date().toISOString(),
      }),
    );
  }

  async function runSaveLoop(): Promise<boolean> {
    if (!chapterId) {
      return false;
    }

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

      setSaveState("saving");
      setSaveMessage("در حال ذخیره روی سرور…");
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
        setSelectedChapter(value);

        setStory((currentStory) => {
          if (!currentStory?.chapters) {
            return currentStory;
          }

          return {
            ...currentStory,
            chapters: currentStory.chapters.map((item) =>
              item.id === value.id
                ? {
                    ...item,
                    ...value,
                  }
                : item,
            ),
          };
        });

        const latestDraft = latestDraftRef.current;

        if (!latestDraft || latestDraft.generation === sentGeneration) {
          dirtyRef.current = false;

          localStorage.removeItem(draftKey(storyId, chapterId));

          setLocalDraft(null);
          setSaveState("saved");
          setSaveMessage(`ذخیره شد · نسخه ${value.version}`);

          return true;
        }

        setSaveState("saving");
        setSaveMessage("نسخهٔ قبلی ذخیره شد؛ تغییرات جدیدتر در حال ذخیره است…");
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
          setSaveState("conflict");
          setSaveMessage("ذخیره متوقف شد؛ نسخهٔ جدیدتری روی سرور وجود دارد.");

          return false;
        }

        setError(getErrorMessage(cause));
        setSaveState("error");
        setSaveMessage("ذخیره روی سرور ناموفق بود؛ نسخهٔ محلی حفظ شده است.");

        return false;
      }
    }

    return !dirtyRef.current && !conflictRef.current;
  }

  function saveToServer(): Promise<boolean> {
    if (saveLoopRef.current) {
      return saveLoopRef.current;
    }

    window.clearTimeout(saveTimerRef.current);

    const savePromise = runSaveLoop();

    saveLoopRef.current = savePromise;

    void savePromise.finally(() => {
      if (saveLoopRef.current === savePromise) {
        saveLoopRef.current = null;
      }
    });

    return savePromise;
  }

  function scheduleSave(nextTitle: string, nextContent: string): void {
    if (!chapterId || !chapterRef.current || conflictRef.current) {
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

    setSaveState("local");
    setSaveMessage("تغییرات محلی ذخیره شد؛ در انتظار ذخیره روی سرور…");

    window.clearTimeout(saveTimerRef.current);

    saveTimerRef.current = window.setTimeout(() => {
      void saveToServer();
    }, 900);
  }

  async function saveMetadata(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    if (metadataBusy) {
      return;
    }

    setMetadataBusy(true);
    setError(null);
    setMessage(null);

    try {
      const editableStatus =
        storyStatus === "ONGOING" ||
        storyStatus === "COMPLETED" ||
        storyStatus === "HIATUS"
          ? storyStatus
          : undefined;

      const response = await request<StoryResponse>(
        `/api/v1/stories/${storyId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            title: title.trim(),
            description: description.trim(),
            language: language.trim(),

            ...(editableStatus !== undefined
              ? {
                  status: editableStatus,
                }
              : {}),

            genreSlug: genreSlug || null,

            tags: tags
              .split(",")
              .map((tag) => tag.trim())
              .filter(Boolean),

            rights,
            isMature,
          }),
        },
      );

      setStory(response.data.story);
      setMessage("مشخصات داستان ذخیره شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMetadataBusy(false);
    }
  }

  function handleCoverSelection(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0] ?? null;

    setCover(selectedFile);
    setError(null);
    setMessage(null);
  }

  async function uploadCover(): Promise<void> {
    if (!cover || coverBusy) {
      return;
    }

    setCoverBusy(true);
    setError(null);
    setMessage(null);

    try {
      const form = new FormData();
      form.append("file", cover);

      const response = await request<MediaResponse>(
        `/api/v1/media/story-covers/${storyId}`,
        {
          method: "POST",
          body: form,
        },
      );

      setStory((currentStory) =>
        currentStory
          ? {
              ...currentStory,
              coverUrl: response.data.media.url,
            }
          : currentStory,
      );

      setCover(null);

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      setMessage("تصویر جلد ذخیره شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setCoverBusy(false);
    }
  }

  async function createChapter(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    const normalizedTitle = newChapterTitle.trim();

    if (!normalizedTitle || chapterBusy) {
      return;
    }

    setChapterBusy(true);
    setError(null);
    setMessage(null);

    try {
      const response = await request<ChapterResponse>(
        `/api/v1/stories/${storyId}/chapters`,
        {
          method: "POST",
          body: JSON.stringify({
            title: normalizedTitle,
            content: "",
          }),
        },
      );

      const newChapter = response.data.chapter;

      setStory((currentStory) =>
        currentStory
          ? {
              ...currentStory,
              chapters: [...(currentStory.chapters ?? []), newChapter],
            }
          : currentStory,
      );

      setNewChapterTitle("");

      navigate(`/write/${storyId}/chapters/${newChapter.id}`);

      window.requestAnimationFrame(() => {
        editorRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setChapterBusy(false);
    }
  }

  async function toggleStoryPublish(): Promise<void> {
    if (!story || metadataBusy) {
      return;
    }

    setMetadataBusy(true);
    setError(null);
    setMessage(null);

    const isPublic = story.visibility === "PUBLIC";

    try {
      await request(
        `/api/v1/stories/${storyId}/${isPublic ? "unpublish" : "publish"}`,
        {
          method: "POST",
        },
      );

      await loadStory();

      setMessage(isPublic ? "داستان از انتشار خارج شد." : "داستان منتشر شد.");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMetadataBusy(false);
    }
  }

  async function toggleChapterPublish(): Promise<void> {
    if (!selectedChapter || !chapterId || conflict || chapterBusy) {
      return;
    }

    setChapterBusy(true);
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

      const action =
        currentChapter.status === "PUBLISHED" ? "unpublish" : "publish";

      const response = await request<ChapterResponse>(
        `/api/v1/stories/${storyId}/chapters/${chapterId}/${action}`,
        {
          method: "POST",
        },
      );

      const value = response.data.chapter;

      chapterRef.current = value;
      setSelectedChapter(value);

      setStory((currentStory) => {
        if (!currentStory?.chapters) {
          return currentStory;
        }

        return {
          ...currentStory,
          chapters: currentStory.chapters.map((item) =>
            item.id === value.id
              ? {
                  ...item,
                  ...value,
                }
              : item,
          ),
        };
      });

      setSaveState("saved");
      setSaveMessage(
        value.status === "PUBLISHED"
          ? "فصل منتشر شد."
          : "فصل به پیش‌نویس برگشت.",
      );
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setChapterBusy(false);
    }
  }

  function selectChapter(targetChapter: Chapter): void {
    if (targetChapter.id === chapterId && selectedChapter) {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });

      return;
    }

    navigate(`/write/${storyId}/chapters/${targetChapter.id}`);

    window.requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }

  function recoverLocalDraft(): void {
    if (!localDraft || !chapterId) {
      return;
    }

    const nextGeneration = editGenerationRef.current + 1;

    editGenerationRef.current = nextGeneration;

    latestDraftRef.current = {
      title: localDraft.title,
      content: localDraft.content,
      generation: nextGeneration,
    };

    setEditorTitle(localDraft.title);
    setEditorContent(localDraft.content);

    dirtyRef.current = true;
    setLocalDraft(null);
    setSaveState("local");
    setSaveMessage("نسخهٔ محلی بازیابی شد و آمادهٔ ذخیره است.");

    persistRecoveryDraft(localDraft.title, localDraft.content);
  }

  function discardLocalDraft(): void {
    if (!chapterId) {
      return;
    }

    localStorage.removeItem(draftKey(storyId, chapterId));
    setLocalDraft(null);
  }

  if (pageLoading || !story) {
    return (
      <main className="writer-loading-page">
        {error ? (
          <div className="writer-status writer-status--error" role="alert">
            <CircleAlert aria-hidden="true" size={28} />
            <p>{error}</p>
          </div>
        ) : (
          <div className="writer-loading-card">
            <LoaderCircle
              className="writer-spin"
              aria-hidden="true"
              size={34}
            />
            <p>در حال دریافت داستان…</p>
          </div>
        )}
      </main>
    );
  }

  const displayedCoverUrl = coverPreviewUrl ?? story.coverUrl;
  const wordCount = countWords(editorContent);

  return (
    <main className="writer-page">
      <div className="writer-page__container">
        <header className="writer-header">
          <div className="writer-header__identity">
            <Link className="writer-back-link" to="/write">
              <ArrowRight aria-hidden="true" size={18} />
              داستان‌های من
            </Link>

            <div className="writer-header__title-row">
              <div className="writer-header__icon">
                <BookOpen aria-hidden="true" size={27} />
              </div>

              <div>
                <p className="writer-eyebrow">فضای نویسنده</p>

                <h1 {...storyTextAttributes}>{story.title}</h1>

                <div className="writer-header__meta">
                  <span>{STORY_STATUS_LABELS[story.status]}</span>
                  <span aria-hidden="true">•</span>
                  <span>
                    {story.visibility === "PUBLIC" ? "منتشرشده" : "خصوصی"}
                  </span>
                  <span aria-hidden="true">•</span>
                  <span>
                    {chapters.length.toLocaleString(interfaceLocale)} فصل
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="writer-header__actions">
            {story.visibility !== "PRIVATE" ? (
              <Link
                className="writer-button writer-button--secondary"
                to={`/stories/${encodeURIComponent(story.slug)}`}
                target="_blank"
                rel="noreferrer"
              >
                <Eye aria-hidden="true" size={17} />
                پیش‌نمایش
              </Link>
            ) : null}

            <button
              className="writer-button writer-button--publish"
              type="button"
              disabled={metadataBusy}
              onClick={() => void toggleStoryPublish()}
            >
              <Send aria-hidden="true" size={17} />

              {story.visibility === "PUBLIC"
                ? "خارج‌کردن از انتشار"
                : "انتشار داستان"}
            </button>
          </div>
        </header>

        {error ? (
          <div className="writer-status writer-status--error" role="alert">
            <CircleAlert aria-hidden="true" size={20} />
            <p>{error}</p>
          </div>
        ) : null}

        {message ? (
          <div className="writer-status writer-status--success">
            <Check aria-hidden="true" size={20} />
            <p>{message}</p>
          </div>
        ) : null}

        <section
          className="writer-card writer-story-settings"
          aria-labelledby="story-details-title"
        >
          <header className="writer-card__header">
            <div>
              <span className="writer-card__icon">
                <Settings2 aria-hidden="true" size={20} />
              </span>

              <div>
                <h2 id="story-details-title">جزئیات داستان</h2>
                <p>مشخصات اصلی و نحوهٔ نمایش داستان را تنظیم کنید.</p>
              </div>
            </div>
          </header>

          <div className="writer-story-settings__layout">
            <form
              className="writer-metadata-form"
              onSubmit={(event) => void saveMetadata(event)}
            >
              <div className="writer-form-grid writer-form-grid--two">
                <label className="writer-field">
                  <span>عنوان داستان</span>

                  <input
                    value={title}
                    minLength={1}
                    maxLength={200}
                    required
                    {...storyTextAttributes}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <label className="writer-field">
                  <span>زبان داستان</span>

                  <select
                    value={language}
                    dir="ltr"
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    <option value="fa">فارسی</option>
                    <option value="en">English</option>
                  </select>
                </label>
              </div>

              <label className="writer-field">
                <span>معرفی داستان</span>

                <textarea
                  value={description}
                  rows={5}
                  minLength={1}
                  maxLength={5000}
                  required
                  {...storyTextAttributes}
                  onChange={(event) => setDescription(event.target.value)}
                />

                <small>
                  {description.length.toLocaleString(interfaceLocale)} از ۵٬۰۰۰
                  نویسه
                </small>
              </label>

              <div className="writer-form-grid writer-form-grid--three">
                <label className="writer-field">
                  <span>ژانر</span>

                  <select
                    value={genreSlug}
                    onChange={(event) => setGenreSlug(event.target.value)}
                  >
                    <option value="">بدون ژانر</option>

                    {genres.map((genre) => (
                      <option key={genre.slug} value={genre.slug}>
                        {genre.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="writer-field">
                  <span>وضعیت داستان</span>

                  <select
                    value={storyStatus}
                    onChange={(event) =>
                      setStoryStatus(event.target.value as Story["status"])
                    }
                  >
                    <option value="DRAFT" disabled>
                      پیش‌نویس
                    </option>

                    {storyStatus === "SCHEDULED" ? (
                      <option value="SCHEDULED" disabled>
                        زمان‌بندی‌شده
                      </option>
                    ) : null}

                    <option value="ONGOING">در حال انتشار</option>
                    <option value="COMPLETED">کامل‌شده</option>
                    <option value="HIATUS">وقفه</option>
                  </select>
                </label>

                <label className="writer-field">
                  <span>حقوق اثر</span>

                  <select
                    value={rights}
                    onChange={(event) =>
                      setRights(event.target.value as StoryRights)
                    }
                  >
                    {Object.entries(RIGHTS_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="writer-field">
                <span>برچسب‌ها</span>

                <input
                  value={tags}
                  maxLength={500}
                  placeholder="فانتزی، ماجراجویی، عاشقانه"
                  {...storyTextAttributes}
                  onChange={(event) => setTags(event.target.value)}
                />

                <small>برچسب‌ها را با ویرگول جدا کنید.</small>
              </label>

              <label className="writer-checkbox">
                <input
                  type="checkbox"
                  checked={isMature}
                  onChange={(event) => setIsMature(event.target.checked)}
                />

                <span>
                  <strong>محتوای بزرگسال</strong>
                  <small>
                    این داستان برای کاربران زیر سن مجاز نمایش داده نشود.
                  </small>
                </span>
              </label>

              <button
                className="writer-button writer-button--primary"
                disabled={metadataBusy || !title.trim() || !description.trim()}
                type="submit"
              >
                {metadataBusy ? (
                  <LoaderCircle
                    className="writer-spin"
                    aria-hidden="true"
                    size={17}
                  />
                ) : (
                  <Save aria-hidden="true" size={17} />
                )}

                {metadataBusy ? "در حال ذخیره…" : "ذخیره مشخصات"}
              </button>
            </form>

            <aside className="writer-cover-panel">
              <h3>جلد داستان</h3>

              <div className="writer-cover-preview">
                {displayedCoverUrl ? (
                  <img
                    src={displayedCoverUrl}
                    alt={`جلد ${story.title}`}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="writer-cover-placeholder">
                    <ImagePlus aria-hidden="true" size={38} />
                    <span>بدون تصویر جلد</span>
                  </div>
                )}

                {coverPreviewUrl ? (
                  <span className="writer-cover-preview__badge">پیش‌نمایش</span>
                ) : null}
              </div>

              <input
                ref={coverInputRef}
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png"
                onChange={handleCoverSelection}
              />

              <button
                className="writer-button writer-button--secondary"
                type="button"
                disabled={coverBusy}
                onClick={() => coverInputRef.current?.click()}
              >
                <ImagePlus aria-hidden="true" size={17} />
                انتخاب تصویر
              </button>

              {cover ? (
                <>
                  <p className="writer-cover-panel__filename">{cover.name}</p>

                  <button
                    className="writer-button writer-button--primary"
                    type="button"
                    disabled={coverBusy}
                    onClick={() => void uploadCover()}
                  >
                    {coverBusy ? (
                      <LoaderCircle
                        className="writer-spin"
                        aria-hidden="true"
                        size={17}
                      />
                    ) : (
                      <Upload aria-hidden="true" size={17} />
                    )}

                    {coverBusy ? "در حال بارگذاری…" : "بارگذاری جلد"}
                  </button>
                </>
              ) : (
                <p className="writer-cover-panel__help">
                  تصویر JPEG یا PNG انتخاب کنید.
                </p>
              )}
            </aside>
          </div>
        </section>

        <section
          className="writer-card writer-chapters"
          aria-labelledby="chapters-title"
        >
          <header className="writer-card__header">
            <div>
              <span className="writer-card__icon">
                <FileText aria-hidden="true" size={20} />
              </span>

              <div>
                <h2 id="chapters-title">فصل‌های داستان</h2>
                <p>فصل جدید بسازید یا یکی از فصل‌های موجود را ویرایش کنید.</p>
              </div>
            </div>

            <span className="writer-count-badge">
              {chapters.length.toLocaleString(interfaceLocale)}
            </span>
          </header>

          <form
            className="writer-new-chapter"
            onSubmit={(event) => void createChapter(event)}
          >
            <label className="sr-only" htmlFor="new-chapter-title">
              عنوان فصل جدید
            </label>

            <input
              id="new-chapter-title"
              value={newChapterTitle}
              maxLength={200}
              placeholder="عنوان فصل جدید"
              {...storyTextAttributes}
              onChange={(event) => setNewChapterTitle(event.target.value)}
            />

            <button
              className="writer-button writer-button--primary"
              disabled={chapterBusy || !newChapterTitle.trim()}
              type="submit"
            >
              {chapterBusy ? (
                <LoaderCircle
                  className="writer-spin"
                  aria-hidden="true"
                  size={17}
                />
              ) : (
                <Plus aria-hidden="true" size={17} />
              )}
              ساخت فصل
            </button>
          </form>

          {chapters.length > 0 ? (
            <ol className="writer-chapter-list">
              {chapters.map((chapter) => {
                const isSelected = chapter.id === chapterId;

                return (
                  <li key={chapter.id}>
                    <button
                      className={
                        isSelected
                          ? "writer-chapter-item writer-chapter-item--active"
                          : "writer-chapter-item"
                      }
                      type="button"
                      aria-current={isSelected ? "page" : undefined}
                      onClick={() => selectChapter(chapter)}
                    >
                      <span className="writer-chapter-item__position">
                        {chapter.position.toLocaleString(interfaceLocale)}
                      </span>

                      <span className="writer-chapter-item__content">
                        <strong {...storyTextAttributes}>
                          {chapter.title}
                        </strong>

                        <small>
                          {chapter.status === "PUBLISHED"
                            ? "منتشرشده"
                            : "پیش‌نویس"}
                          {" · "}
                          {chapter.wordCount.toLocaleString(
                            interfaceLocale,
                          )}{" "}
                          واژه
                          {" · "}
                          نسخه {chapter.version.toLocaleString(interfaceLocale)}
                        </small>
                      </span>

                      <span className="writer-chapter-item__action">
                        {isSelected ? "در حال ویرایش" : "ویرایش"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="writer-empty-chapters">
              <FileText aria-hidden="true" size={38} />
              <h3>هنوز فصلی وجود ندارد</h3>
              <p>عنوان اولین فصل را وارد کنید تا نوشتن داستان را شروع کنید.</p>
            </div>
          )}
        </section>

        <section
          ref={editorRef}
          className="writer-card writer-editor"
          aria-labelledby="chapter-editor-title"
        >
          {chapterLoading ? (
            <div className="writer-editor__empty">
              <LoaderCircle
                className="writer-spin"
                aria-hidden="true"
                size={34}
              />
              <p>در حال دریافت فصل…</p>
            </div>
          ) : selectedChapter && chapterId ? (
            <>
              <header className="writer-editor__toolbar">
                <div>
                  <p className="writer-eyebrow">
                    فصل{" "}
                    {selectedChapter.position.toLocaleString(interfaceLocale)}
                  </p>

                  <h2 id="chapter-editor-title" {...storyTextAttributes}>
                    {selectedChapter.title}
                  </h2>
                </div>

                <div className="writer-editor__toolbar-actions">
                  <span
                    className={`writer-save-state writer-save-state--${saveState}`}
                    aria-live="polite"
                  >
                    {saveState === "saving" ? (
                      <LoaderCircle
                        className="writer-spin"
                        aria-hidden="true"
                        size={15}
                      />
                    ) : saveState === "saved" ? (
                      <Check aria-hidden="true" size={15} />
                    ) : saveState === "conflict" || saveState === "error" ? (
                      <CircleAlert aria-hidden="true" size={15} />
                    ) : null}

                    {saveMessage || "آمادهٔ ویرایش"}
                  </span>

                  <button
                    className="writer-button writer-button--secondary"
                    type="button"
                    disabled={saveState === "saving" || Boolean(conflict)}
                    onClick={() => void saveToServer()}
                  >
                    <Save aria-hidden="true" size={17} />
                    ذخیره
                  </button>

                  <button
                    className="writer-button writer-button--publish"
                    type="button"
                    disabled={chapterBusy || Boolean(conflict)}
                    onClick={() => void toggleChapterPublish()}
                  >
                    <Send aria-hidden="true" size={17} />

                    {selectedChapter.status === "PUBLISHED"
                      ? "خارج‌کردن فصل از انتشار"
                      : "انتشار فصل"}
                  </button>
                </div>
              </header>

              {localDraft && !conflict ? (
                <div className="writer-recovery">
                  <CircleAlert aria-hidden="true" size={21} />

                  <div>
                    <strong>یک نسخهٔ محلی پیدا شد</strong>

                    <p>
                      این نسخه در{" "}
                      {new Date(localDraft.savedAt).toLocaleString(
                        interfaceLocale,
                      )}{" "}
                      ذخیره شده و با نسخهٔ سرور متفاوت است.
                    </p>
                  </div>

                  <div className="writer-recovery__actions">
                    <button
                      className="writer-button writer-button--secondary"
                      type="button"
                      onClick={recoverLocalDraft}
                    >
                      بازیابی نسخه
                    </button>

                    <button
                      className="writer-button writer-button--quiet"
                      type="button"
                      onClick={discardLocalDraft}
                    >
                      کنار گذاشتن
                    </button>
                  </div>
                </div>
              ) : null}

              {conflict ? (
                <div className="writer-conflict" role="alert">
                  <CircleAlert aria-hidden="true" size={23} />

                  <div>
                    <strong>تعارض ویرایش</strong>

                    <p>
                      این فصل در جای دیگری تغییر کرده است. برای جلوگیری از
                      ازدست‌رفتن نوشته‌ها، ذخیرهٔ خودکار متوقف شده و نسخهٔ محلی
                      در مرورگر باقی مانده است.
                    </p>

                    {conflict.currentVersion ? (
                      <small>
                        آخرین نسخهٔ سرور:{" "}
                        {conflict.currentVersion.toLocaleString(
                          interfaceLocale,
                        )}
                      </small>
                    ) : null}
                  </div>

                  <button
                    className="writer-button writer-button--secondary"
                    type="button"
                    onClick={() => void loadChapter(chapterId)}
                  >
                    دریافت نسخهٔ سرور
                  </button>
                </div>
              ) : null}

              <div className="writer-editor__fields">
                <label className="writer-field" htmlFor="chapter-title">
                  <span>عنوان فصل</span>

                  <input
                    id="chapter-title"
                    className="writer-editor__title"
                    value={editorTitle}
                    maxLength={200}
                    {...storyTextAttributes}
                    onChange={(event) => {
                      const nextTitle = event.target.value;

                      setEditorTitle(nextTitle);
                      scheduleSave(nextTitle, editorContent);
                    }}
                  />
                </label>

                <label className="writer-field" htmlFor="chapter-content">
                  <span>متن فصل</span>

                  <textarea
                    id="chapter-content"
                    className="writer-editor__content"
                    value={editorContent}
                    maxLength={100000}
                    spellCheck
                    placeholder="نوشتن این فصل را شروع کنید…"
                    {...storyTextAttributes}
                    onChange={(event) => {
                      const nextContent = event.target.value;

                      setEditorContent(nextContent);
                      scheduleSave(editorTitle, nextContent);
                    }}
                  />
                </label>

                <footer className="writer-editor__footer">
                  <span>{wordCount.toLocaleString(interfaceLocale)} واژه</span>

                  <span>
                    {editorContent.length.toLocaleString(interfaceLocale)}
                    {" / "}
                    ۱۰۰٬۰۰۰ نویسه
                  </span>

                  <span>
                    نسخه{" "}
                    {selectedChapter.version.toLocaleString(interfaceLocale)}
                  </span>
                </footer>
              </div>
            </>
          ) : (
            <div className="writer-editor__empty">
              <BookOpen aria-hidden="true" size={42} />

              <h2 id="chapter-editor-title">
                یک فصل را برای ویرایش انتخاب کنید
              </h2>

              <p>از فهرست بالا یک فصل را انتخاب کنید یا فصل جدیدی بسازید.</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
