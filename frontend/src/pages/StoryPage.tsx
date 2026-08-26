import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ReportForm from "../components/ReportForm";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import type { Story, StoryResponse } from "../types/story";
import { getStoryTextAttributes } from "../lib/story-language";

import "./StoryPage.css";

interface LibraryStatusResponse {
  data: {
    inLibrary: boolean;
  };
}

interface LibraryState {
  key: string;
  inLibrary: boolean;
}

function StoryPage() {
  const { slug = "" } = useParams();
  const { status, request, user } = useAuth();

  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [libraryState, setLibraryState] = useState<LibraryState | null>(null);

  const [libraryPending, setLibraryPending] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(null);

  const libraryKey =
    status === "authenticated" && user && story
      ? `${user.id}:${story.id}`
      : null;

  const isInLibrary =
    libraryKey !== null && libraryState?.key === libraryKey
      ? libraryState.inLibrary
      : null;

  useDocumentMeta({
    title: story ? `${story.title} | داستان` : "داستان",
    description: story?.description.slice(0, 160),
    canonicalPath: `/stories/${slug}`,
    image: story?.coverUrl ?? undefined,
  });

  useEffect(() => {
    const controller = new AbortController();

    const path = `/api/v1/stories/${encodeURIComponent(slug)}`;

    const loadPromise =
      status === "authenticated"
        ? request<StoryResponse>(path, {
            signal: controller.signal,
          })
        : apiRequest<StoryResponse>(path, {
            signal: controller.signal,
          });

    void loadPromise
      .then((response) => {
        if (controller.signal.aborted) return;

        setStory(response.data.story);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;

        setError(getErrorMessage(loadError));
      });

    return () => controller.abort();
  }, [request, slug, status]);

  useEffect(() => {
    if (status !== "authenticated" || !story || !libraryKey) {
      return;
    }

    const controller = new AbortController();

    void request<LibraryStatusResponse>(`/api/v1/library/${story.id}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (controller.signal.aborted) return;

        setLibraryState({
          key: libraryKey,
          inLibrary: response.data.inLibrary,
        });

        setLibraryMessage(null);
      })
      .catch((libraryError: unknown) => {
        if (controller.signal.aborted) return;

        setLibraryMessage(getErrorMessage(libraryError));
      });

    return () => controller.abort();
  }, [request, status, story, libraryKey]);

  async function toggleLibrary(): Promise<void> {
    if (
      !story ||
      !libraryKey ||
      status !== "authenticated" ||
      isInLibrary === null ||
      libraryPending
    ) {
      return;
    }

    const shouldAdd = !isInLibrary;

    setLibraryPending(true);
    setLibraryMessage(null);

    try {
      await request<void>(`/api/v1/library/${story.id}`, {
        method: shouldAdd ? "POST" : "DELETE",
      });

      setLibraryState({
        key: libraryKey,
        inLibrary: shouldAdd,
      });

      setLibraryMessage(
        shouldAdd ? "به کتابخانه اضافه شد." : "از کتابخانه حذف شد.",
      );
    } catch (libraryError) {
      setLibraryMessage(getErrorMessage(libraryError));
    } finally {
      setLibraryPending(false);
    }
  }

  if (error) {
    return (
      <main className="app-main">
        <p className="status-message" data-kind="error" role="alert">
          {error}
        </p>
      </main>
    );
  }

  if (!story) {
    return (
      <main className="app-main">
        <p className="status-message">در حال دریافت داستان...</p>
      </main>
    );
  }

  const storyTextAttributes = getStoryTextAttributes(story.language);

  return (
    <main className="app-main">
      <article className="story-detail">
        <aside className="story-cover-column">
          <div className="story-detail-cover surface">
            {story.coverUrl ? (
              <img
                referrerPolicy="no-referrer"
                src={story.coverUrl}
                alt={`جلد ${story.title}`}
              />
            ) : (
              <div className="story-card-placeholder" {...storyTextAttributes}>
                {story.title}
              </div>
            )}
          </div>

          {status === "authenticated" ? (
            <button
              className="primary-action"
              type="button"
              disabled={libraryPending || isInLibrary === null}
              aria-pressed={isInLibrary === true}
              onClick={() => {
                void toggleLibrary();
              }}
            >
              {libraryPending
                ? "در حال انجام..."
                : isInLibrary === null
                  ? "در حال بررسی..."
                  : isInLibrary
                    ? "حذف از کتابخانه"
                    : "افزودن به کتابخانه"}
            </button>
          ) : (
            <Link className="primary-action story-action-link" to="/login">
              افزودن به کتابخانه
            </Link>
          )}

          {libraryMessage ? (
            <p className="muted" aria-live="polite">
              {libraryMessage}
            </p>
          ) : null}
        </aside>

        <div className="story-detail-content">
          <h1 className="page-heading" {...storyTextAttributes}>
            {story.title}
          </h1>

          <p className="story-byline">
            نوشته{" "}
            <Link to={`/users/${encodeURIComponent(story.author.username)}`}>
              <bdi>{story.author.displayName}</bdi>
            </Link>
          </p>

          <div className="story-meta-row">
            {story.genre ? (
              <Link
                to={`/browse/genres/${encodeURIComponent(story.genre.slug)}`}
              >
                {story.genre.name}
              </Link>
            ) : null}

            <span>{story.status}</span>

            <span dir="ltr">{story.language.toUpperCase()}</span>

            {story.isMature ? <span>محتوای +۱۸</span> : null}
          </div>

          {story.isMature ? (
            <div className="status-message" data-kind="warning">
              محتوای این داستان برای حساب‌های بزرگسال است. دسترسی به متن فصل‌ها
              در سمت سرور با تاریخ تولد و تنظیمات محتوای شما کنترل می‌شود.
            </div>
          ) : null}

          <p className="story-description" {...storyTextAttributes}>
            {story.description}
          </p>

          <ReportForm targetType="STORY" targetId={story.id} />

          {story.tags.length > 0 ? (
            <ul
              className="tag-list"
              aria-label="برچسب‌ها"
              {...storyTextAttributes}
            >
              {story.tags.map((tag) => (
                <li key={tag.slug}>
                  <Link to={`/browse/tags/${encodeURIComponent(tag.slug)}`}>
                    #{tag.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}

          <section aria-labelledby="chapters-title">
            <h2 id="chapters-title">فصل‌ها</h2>

            {story.chapters?.length ? (
              <ol className="chapter-list surface">
                {story.chapters.map((chapter) => (
                  <li key={chapter.id}>
                    <Link
                      to={`/stories/${encodeURIComponent(
                        story.slug,
                      )}/chapters/${chapter.id}`}
                    >
                      <span {...storyTextAttributes}>
                        {chapter.position}. {chapter.title}
                      </span>

                      <span className="muted">
                        {chapter.wordCount.toLocaleString("fa-IR")} واژه
                      </span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="empty-state surface">فصل منتشرشده‌ای وجود ندارد.</p>
            )}
          </section>
        </div>
      </article>
    </main>
  );
}

export default StoryPage;
