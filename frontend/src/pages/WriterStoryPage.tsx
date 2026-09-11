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
import { getErrorMessage } from "../lib/error-message";
import { getStoryTextAttributes } from "../lib/story-language";
import type {
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

const STORY_RIGHTS: StoryRights[] = [
  "ALL_RIGHTS_RESERVED",
  "CREATIVE_COMMONS",
  "PUBLIC_DOMAIN",
];

export default function WriterStoryPage() {
  const { storyId = "" } = useParams();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
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

  const [cover, setCover] = useState<File | null>(null);
  const [coverPreviewUrl, setCoverPreviewUrl] = useState<string | null>(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [metadataBusy, setMetadataBusy] = useState(false);
  const [coverBusy, setCoverBusy] = useState(false);
  const [chapterBusy, setChapterBusy] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const coverInputRef = useRef<HTMLInputElement | null>(null);

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

    async function refreshStory(): Promise<void> {
      await Promise.resolve();

      if (!active) {
        return;
      }

      setPageLoading(true);
      setError(null);

      try {
        await loadStory();
      } catch (cause) {
        if (active) {
          setError(getErrorMessage(cause));
        }
      } finally {
        if (active) {
          setPageLoading(false);
        }
      }
    }

    void refreshStory();

    return () => {
      active = false;
    };
  }, [loadStory]);

  useEffect(() => {
    return () => {
      if (coverPreviewUrl) {
        URL.revokeObjectURL(coverPreviewUrl);
      }
    };
  }, [coverPreviewUrl]);

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
      setMessage(t("writer.messages.metadataSaved"));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMetadataBusy(false);
    }
  }

  function handleCoverSelection(event: ChangeEvent<HTMLInputElement>): void {
    const selectedFile = event.target.files?.[0] ?? null;

    setCover(selectedFile);
    setCoverPreviewUrl(
      selectedFile ? URL.createObjectURL(selectedFile) : null,
    );
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
      setCoverPreviewUrl(null);

      if (coverInputRef.current) {
        coverInputRef.current.value = "";
      }

      setMessage(t("writer.messages.coverSaved"));
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

      setMessage(
        isPublic
          ? t("writer.messages.storyUnpublished")
          : t("writer.messages.storyPublished"),
      );
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setMetadataBusy(false);
    }
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

            <p>{t("writer.loading.story")}</p>
          </div>
        )}
      </main>
    );
  }

  const displayedCoverUrl = coverPreviewUrl ?? story.coverUrl;

  const storyStatusLabel = t(`writer.status.${story.status}`, {
    defaultValue: story.status,
  });

  return (
    <main className="writer-page">
      <div className="writer-page__container">
        <header className="writer-header">
          <div className="writer-header__identity">
            <Link className="writer-back-link" to="/write">
              <ArrowRight aria-hidden="true" size={18} />

              {t("writer.actions.backToStories")}
            </Link>

            <div className="writer-header__title-row">
              <div className="writer-header__icon">
                <BookOpen aria-hidden="true" size={27} />
              </div>

              <div>
                <p className="writer-eyebrow">{t("writer.header.eyebrow")}</p>

                <h1 {...storyTextAttributes}>{story.title}</h1>

                <div className="writer-header__meta">
                  <span>{storyStatusLabel}</span>
                  <span aria-hidden="true">•</span>

                  <span>
                    {story.visibility === "PUBLIC"
                      ? t("writer.visibility.public")
                      : t("writer.visibility.private")}
                  </span>

                  <span aria-hidden="true">•</span>

                  <span>
                    {t("writer.chapters.count", {
                      count: chapters.length,
                      value: chapters.length.toLocaleString(interfaceLocale),
                    })}
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

                {t("writer.actions.preview")}
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
                ? t("writer.actions.unpublishStory")
                : t("writer.actions.publishStory")}
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
                <h2 id="story-details-title">{t("writer.details.title")}</h2>

                <p>{t("writer.details.description")}</p>
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
                  <span>{t("writer.fields.storyTitle")}</span>

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
                  <span>{t("writer.fields.language")}</span>

                  <select
                    value={language}
                    dir={i18n.dir()}
                    onChange={(event) => setLanguage(event.target.value)}
                  >
                    <option value="fa">{t("writer.languages.fa")}</option>

                    <option value="en">{t("writer.languages.en")}</option>
                  </select>
                </label>
              </div>

              <label className="writer-field">
                <span>{t("writer.fields.description")}</span>

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
                  {t("writer.fields.descriptionCount", {
                    value: description.length.toLocaleString(interfaceLocale),
                  })}
                </small>
              </label>

              <div className="writer-form-grid writer-form-grid--three">
                <label className="writer-field">
                  <span>{t("writer.fields.genre")}</span>

                  <select
                    value={genreSlug}
                    onChange={(event) => setGenreSlug(event.target.value)}
                  >
                    <option value="">{t("writer.genres.none")}</option>

                    {genres.map((genre) => (
                      <option key={genre.slug} value={genre.slug}>
                        {t(`genres.items.${genre.slug}`, {
                          defaultValue: genre.name,
                        })}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="writer-field">
                  <span>{t("writer.fields.status")}</span>

                  <select
                    value={storyStatus}
                    onChange={(event) =>
                      setStoryStatus(event.target.value as Story["status"])
                    }
                  >
                    <option value="DRAFT" disabled>
                      {t("writer.status.DRAFT")}
                    </option>

                    {storyStatus === "SCHEDULED" ? (
                      <option value="SCHEDULED" disabled>
                        {t("writer.status.SCHEDULED")}
                      </option>
                    ) : null}

                    <option value="ONGOING">
                      {t("writer.status.ONGOING")}
                    </option>

                    <option value="COMPLETED">
                      {t("writer.status.COMPLETED")}
                    </option>

                    <option value="HIATUS">{t("writer.status.HIATUS")}</option>
                  </select>
                </label>

                <label className="writer-field">
                  <span>{t("writer.fields.rights")}</span>

                  <select
                    value={rights}
                    onChange={(event) =>
                      setRights(event.target.value as StoryRights)
                    }
                  >
                    {STORY_RIGHTS.map((storyRight) => (
                      <option key={storyRight} value={storyRight}>
                        {t(`writer.rights.${storyRight}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="writer-field">
                <span>{t("writer.fields.tags")}</span>

                <input
                  value={tags}
                  maxLength={500}
                  placeholder={t("writer.fields.tagsPlaceholder")}
                  {...storyTextAttributes}
                  onChange={(event) => setTags(event.target.value)}
                />

                <small>{t("writer.fields.tagsHelp")}</small>
              </label>

              <label className="writer-checkbox">
                <input
                  type="checkbox"
                  checked={isMature}
                  onChange={(event) => setIsMature(event.target.checked)}
                />

                <span>
                  <strong>{t("writer.mature.title")}</strong>

                  <small>{t("writer.mature.description")}</small>
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

                {metadataBusy
                  ? t("writer.actions.saving")
                  : t("writer.actions.saveMetadata")}
              </button>
            </form>

            <aside className="writer-cover-panel">
              <h3>{t("writer.cover.title")}</h3>

              <div className="writer-cover-preview">
                {displayedCoverUrl ? (
                  <img
                    src={displayedCoverUrl}
                    alt={t("writer.cover.alt", {
                      title: story.title,
                    })}
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="writer-cover-placeholder">
                    <ImagePlus aria-hidden="true" size={38} />

                    <span>{t("writer.cover.empty")}</span>
                  </div>
                )}

                {coverPreviewUrl ? (
                  <span className="writer-cover-preview__badge">
                    {t("writer.cover.preview")}
                  </span>
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

                {t("writer.cover.select")}
              </button>

              {cover ? (
                <>
                  <p className="writer-cover-panel__filename">
                    {t("writer.cover.selectedFile", {
                      name: cover.name,
                    })}
                  </p>

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

                    {coverBusy
                      ? t("writer.cover.uploading")
                      : t("writer.cover.upload")}
                  </button>
                </>
              ) : (
                <p className="writer-cover-panel__help">
                  {t("writer.cover.help")}
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
                <h2 id="chapters-title">{t("writer.chapters.title")}</h2>

                <p>{t("writer.chapters.description")}</p>
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
              {t("writer.chapters.newTitleLabel")}
            </label>

            <input
              id="new-chapter-title"
              value={newChapterTitle}
              maxLength={200}
              placeholder={t("writer.chapters.newTitlePlaceholder")}
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

              {t("writer.chapters.create")}
            </button>
          </form>

          {chapters.length > 0 ? (
            <ol className="writer-chapter-list">
              {chapters.map((chapter) => (
                <li key={chapter.id}>
                  <Link
                    className="writer-chapter-item"
                    to={`/write/${storyId}/chapters/${chapter.id}`}
                  >
                    <span className="writer-chapter-item__position">
                      {chapter.position.toLocaleString(interfaceLocale)}
                    </span>

                    <span className="writer-chapter-item__content">
                      <strong {...storyTextAttributes}>{chapter.title}</strong>

                      <small>
                        {t(`writer.chapterStatus.${chapter.status}`)}
                        {" · "}
                        {t("writer.chapters.wordCount", {
                          value:
                            chapter.wordCount.toLocaleString(interfaceLocale),
                        })}
                        {" · "}
                        {t("writer.chapters.version", {
                          value: chapter.version.toLocaleString(interfaceLocale),
                        })}
                      </small>
                    </span>

                    <span className="writer-chapter-item__action">
                      {t("writer.chapters.edit")}
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          ) : (
            <div className="writer-empty-chapters">
              <FileText aria-hidden="true" size={38} />

              <h3>{t("writer.chapters.emptyTitle")}</h3>

              <p>{t("writer.chapters.emptyDescription")}</p>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
