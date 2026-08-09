import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";

import ReportForm from "../components/ReportForm";
import useAuth from "../hooks/useAuth";
import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";
import { useDocumentMeta } from "../hooks/useDocumentMeta";
import type { Story, StoryResponse } from "../types/story";

import "./StoryPage.css";

function StoryPage() {
  const { slug = "" } = useParams();
  const { status, request } = useAuth();
  const [story, setStory] = useState<Story | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [libraryMessage, setLibraryMessage] = useState<string | null>(
    null,
  );

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
        ? request<StoryResponse>(path, { signal: controller.signal })
        : apiRequest<StoryResponse>(path, { signal: controller.signal });

    void loadPromise
      .then((response) => {
        setStory(response.data.story);
        setError(null);
      })
      .catch((loadError: unknown) => {
        if (controller.signal.aborted) return;
        setError(getErrorMessage(loadError));
      });

    return () => controller.abort();
  }, [request, slug, status]);

  async function addToLibrary(): Promise<void> {
    if (!story || status !== "authenticated") return;

    try {
      await request<void>(`/api/v1/library/${story.id}`, {
        method: "POST",
      });
      setLibraryMessage("به کتابخانه اضافه شد.");
    } catch (libraryError) {
      setLibraryMessage(getErrorMessage(libraryError));
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

  return (
    <main className="app-main">
      <article className="story-detail">
        <aside className="story-cover-column">
          <div className="story-detail-cover surface">
            {story.coverUrl ? (
              <img referrerPolicy="no-referrer" src={story.coverUrl} alt={`جلد ${story.title}`} />
            ) : (
              <div className="story-card-placeholder">{story.title}</div>
            )}
          </div>

          {status === "authenticated" ? (
            <button
              className="primary-action"
              type="button"
              onClick={() => {
                void addToLibrary();
              }}
            >
              افزودن به کتابخانه
            </button>
          ) : (
            <Link className="primary-action story-action-link" to="/login">
              ورود برای ذخیره
            </Link>
          )}

          {libraryMessage ? (
            <p className="muted" aria-live="polite">
              {libraryMessage}
            </p>
          ) : null}
        </aside>

        <div className="story-detail-content">
          <h1 className="page-heading">{story.title}</h1>
          <p className="story-byline">
            نوشته{" "}
            <Link to={`/users/${encodeURIComponent(story.author.username)}`}>
              {story.author.displayName}
            </Link>
          </p>

          <div className="story-meta-row">
            {story.genre ? (
              <Link to={`/browse/genres/${encodeURIComponent(story.genre.slug)}`}>
                {story.genre.name}
              </Link>
            ) : null}
            <span>{story.status}</span>
            <span>{story.language.toUpperCase()}</span>
            {story.isMature ? <span>محتوای +۱۸</span> : null}
          </div>

          {story.isMature ? (
            <div className="status-message" data-kind="warning">
              محتوای این داستان برای حساب‌های بزرگسال است. دسترسی به متن
              فصل‌ها در سمت سرور با تاریخ تولد و تنظیمات محتوای شما کنترل
              می‌شود.
            </div>
          ) : null}

          <p className="story-description">{story.description}</p>
          <ReportForm targetType="STORY" targetId={story.id} />

          {story.tags.length > 0 ? (
            <ul className="tag-list" aria-label="برچسب‌ها">
              {story.tags.map((tag) => (
                <li key={tag.slug}>
                  <Link
                    to={`/browse/tags/${encodeURIComponent(tag.slug)}`}
                  >
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
                      <span>
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
              <p className="empty-state surface">
                فصل منتشرشده‌ای وجود ندارد.
              </p>
            )}
          </section>
        </div>
      </article>
    </main>
  );
}

export default StoryPage;
