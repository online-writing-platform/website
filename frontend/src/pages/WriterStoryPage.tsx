import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type FormEvent,
} from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type {
    ChapterResponse,
    Story,
    StoryResponse,
    StoryRights,
} from "../types/story";

interface GenresResponse {
    data: { genres: Array<{ slug: string; name: string }> };
}
interface MediaResponse {
    data: {
        media: { assetId: string; url: string; width: number; height: number };
    };
}

export default function WriterStoryPage() {
    const { storyId = "" } = useParams();
    const { request } = useAuth();
    const navigate = useNavigate();
    const [story, setStory] = useState<Story | null>(null);
    const [genres, setGenres] = useState<Array<{ slug: string; name: string }>>(
        [],
    );
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [language, setLanguage] = useState("fa");
    const [storyStatus, setStoryStatus] = useState<Story["status"]>("DRAFT");
    const [genreSlug, setGenreSlug] = useState("");
    const [tags, setTags] = useState("");
    const [rights, setRights] = useState<StoryRights>("ALL_RIGHTS_RESERVED");
    const [isMature, setIsMature] = useState(false);
    const [chapterTitle, setChapterTitle] = useState("");
    const [cover, setCover] = useState<File | null>(null);
    const coverInputRef = useRef<HTMLInputElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);

    const load = useCallback(async (): Promise<void> => {
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
        const loadTimer = window.setTimeout(() => {
            void load().catch((cause) => setError(getErrorMessage(cause)));
        }, 0);

        return () => {
            window.clearTimeout(loadTimer);
        };
    }, [load]);

    const chapters = useMemo(
        () =>
            [...(story?.chapters ?? [])].sort(
                (a, b) => a.position - b.position,
            ),
        [story],
    );

    async function saveMetadata(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        setError(null);
        setMessage(null);

        try {
            const response = await request<StoryResponse>(
                `/api/v1/stories/${storyId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({
                        title: title.trim(),
                        description: description.trim(),
                        language: language.trim(),
                        ...(storyStatus !== "DRAFT"
                            ? { status: storyStatus }
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
            setBusy(false);
        }
    }

    async function uploadCover(): Promise<void> {
        if (!cover || busy) return;
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const form = new FormData();
            form.append("file", cover);
            const response = await request<MediaResponse>(
                `/api/v1/media/story-covers/${storyId}`,
                { method: "POST", body: form },
            );
            setStory((current) =>
                current
                    ? { ...current, coverUrl: response.data.media.url }
                    : current,
            );
            setCover(null);
            setMessage("تصویر جلد ذخیره شد.");
        } catch (cause) {
            setError(getErrorMessage(cause));
        } finally {
            setBusy(false);
        }
    }

    async function createChapter(
        event: FormEvent<HTMLFormElement>,
    ): Promise<void> {
        event.preventDefault();
        if (!chapterTitle.trim() || busy) return;
        setBusy(true);
        setError(null);
        try {
            const response = await request<ChapterResponse>(
                `/api/v1/stories/${storyId}/chapters`,
                {
                    method: "POST",
                    body: JSON.stringify({
                        title: chapterTitle.trim(),
                        content: "",
                    }),
                },
            );
            navigate(`/write/${storyId}/chapters/${response.data.chapter.id}`);
        } catch (cause) {
            setError(getErrorMessage(cause));
        } finally {
            setBusy(false);
        }
    }

    async function togglePublish(): Promise<void> {
        if (!story || busy) return;
        setBusy(true);
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
            await load();
            setMessage(
                isPublic ? "داستان از انتشار خارج شد." : "داستان منتشر شد.",
            );
        } catch (cause) {
            setError(getErrorMessage(cause));
        } finally {
            setBusy(false);
        }
    }

    if (!story) {
        return (
            <main className="page-shell">
                {error ? (
                    <p className="status-message status-message--error">
                        {error}
                    </p>
                ) : (
                    <p>در حال بارگذاری…</p>
                )}
            </main>
        );
    }

    return (
        <main className="page-shell">
            <header className="page-heading">
                <div>
                    <p className="eyebrow">مدیریت داستان</p>
                    <h1>{story.title}</h1>
                    <p>
                        {story.visibility === "PUBLIC" ? "منتشرشده" : "خصوصی"} ·{" "}
                        {story.status}
                    </p>
                </div>
                <div className="button-row">
                    {story.visibility !== "PRIVATE" && (
                        <Link
                            className="button button--secondary"
                            to={`/stories/${story.slug}`}
                        >
                            پیش‌نمایش عمومی
                        </Link>
                    )}
                    <button
                        className="button"
                        type="button"
                        disabled={busy}
                        onClick={() => void togglePublish()}
                    >
                        {story.visibility === "PUBLIC"
                            ? "خارج کردن از انتشار"
                            : "انتشار داستان"}
                    </button>
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
            {message && (
                <p className="status-message status-message--success">
                    {message}
                </p>
            )}

            <div className="two-column">
                <section className="surface">
                    <h2>مشخصات</h2>
                    <form
                        className="stack-form"
                        onSubmit={(event) => void saveMetadata(event)}
                    >
                        <label>
                            عنوان
                            <input
                                value={title}
                                maxLength={200}
                                onChange={(event) =>
                                    setTitle(event.target.value)
                                }
                            />
                        </label>
                        <label>
                            توضیحات
                            <textarea
                                value={description}
                                rows={6}
                                maxLength={5000}
                                onChange={(event) =>
                                    setDescription(event.target.value)
                                }
                            />
                        </label>
                        <label>
                            زبان
                            <input
                                value={language}
                                maxLength={10}
                                onChange={(event) =>
                                    setLanguage(event.target.value)
                                }
                            />
                        </label>
                        <label>
                            وضعیت داستان
                            <select
                                value={storyStatus}
                                onChange={(event) =>
                                    setStoryStatus(
                                        event.target.value as Story["status"],
                                    )
                                }
                            >
                                <option value="DRAFT" disabled>
                                    پیش‌نویس
                                </option>
                                <option value="ONGOING">در حال انتشار</option>
                                <option value="COMPLETED">کامل‌شده</option>
                                <option value="HIATUS">وقفه</option>
                            </select>
                        </label>
                        <label>
                            ژانر
                            <select
                                value={genreSlug}
                                onChange={(event) =>
                                    setGenreSlug(event.target.value)
                                }
                            >
                                <option value="">بدون ژانر</option>
                                {genres.map((genre) => (
                                    <option key={genre.slug} value={genre.slug}>
                                        {genre.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>
                            برچسب‌ها
                            <input
                                value={tags}
                                onChange={(event) =>
                                    setTags(event.target.value)
                                }
                                placeholder="فانتزی، ماجراجویی"
                            />
                        </label>
                        <label>
                            حقوق اثر
                            <select
                                value={rights}
                                onChange={(event) =>
                                    setRights(event.target.value as StoryRights)
                                }
                            >
                                <option value="ALL_RIGHTS_RESERVED">
                                    تمام حقوق محفوظ است
                                </option>
                                <option value="CREATIVE_COMMONS">
                                    Creative Commons
                                </option>
                                <option value="PUBLIC_DOMAIN">
                                    مالکیت عمومی
                                </option>
                            </select>
                        </label>
                        <label className="inline-check">
                            <input
                                type="checkbox"
                                checked={isMature}
                                onChange={(event) =>
                                    setIsMature(event.target.checked)
                                }
                            />
                            محتوای بزرگسال
                        </label>
                        <button
                            className="button"
                            disabled={busy}
                            type="submit"
                        >
                            ذخیره مشخصات
                        </button>
                    </form>
                </section>

                <section className="surface">
                    <h2>جلد</h2>

                    {story.coverUrl ? (
                        <img
                            referrerPolicy="no-referrer"
                            className="cover-preview"
                            src={story.coverUrl}
                            alt={`جلد ${story.title}`}
                        />
                    ) : (
                        <div className="cover-placeholder">بدون جلد</div>
                    )}

                    <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png"
                        style={{ display: "none" }}
                        onChange={(event) => {
                            const file = event.target.files?.[0] ?? null;

                            setCover(file);
                            setError(null);
                            setMessage(null);
                        }}
                    />

                    <div className="file-field">
                        <span>فایل JPEG یا PNG</span>

                        <button
                            className="button button--secondary"
                            type="button"
                            disabled={busy}
                            onClick={() => {
                                coverInputRef.current?.click();
                            }}
                        >
                            انتخاب تصویر
                        </button>

                        {cover ? (
                            <p className="muted">
                                فایل انتخاب‌شده: {cover.name}
                            </p>
                        ) : (
                            <p className="muted">
                                هنوز تصویری انتخاب نشده است.
                            </p>
                        )}
                    </div>

                    <button
                        className="button"
                        disabled={!cover || busy}
                        type="button"
                        onClick={() => {
                            void uploadCover();
                        }}
                    >
                        {busy ? "در حال بارگذاری..." : "بارگذاری جلد"}
                    </button>
                </section>
            </div>

            <section className="surface">
                <div className="section-heading">
                    <h2>فصل‌ها</h2>
                    <span>{chapters.length.toLocaleString("fa-IR")}</span>
                </div>
                <form
                    className="inline-form"
                    onSubmit={(event) => void createChapter(event)}
                >
                    <label className="sr-only" htmlFor="new-chapter-title">
                        عنوان فصل جدید
                    </label>
                    <input
                        id="new-chapter-title"
                        value={chapterTitle}
                        maxLength={200}
                        placeholder="عنوان فصل جدید"
                        onChange={(event) =>
                            setChapterTitle(event.target.value)
                        }
                    />
                    <button
                        className="button"
                        disabled={busy || !chapterTitle.trim()}
                        type="submit"
                    >
                        ساخت فصل
                    </button>
                </form>
                <ol className="chapter-list">
                    {chapters.map((chapter) => (
                        <li key={chapter.id}>
                            <div>
                                <strong>
                                    {chapter.position}. {chapter.title}
                                </strong>
                                <span>
                                    {chapter.status === "PUBLISHED"
                                        ? "منتشرشده"
                                        : "پیش‌نویس"}{" "}
                                    · نسخه {chapter.version}
                                </span>
                            </div>
                            <Link
                                className="text-link"
                                to={`/write/${storyId}/chapters/${chapter.id}`}
                            >
                                ویرایش
                            </Link>
                        </li>
                    ))}
                </ol>
            </section>
        </main>
    );
}
