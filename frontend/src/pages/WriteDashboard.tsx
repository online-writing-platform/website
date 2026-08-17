import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";

import StoryCard from "../components/StoryCard";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { GetStoriesResponse, StoryResponse } from "../types/story";

export default function WriteDashboard() {
  const { request, user } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<GetStoriesResponse["data"]["stories"]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async (): Promise<void> => {
    const response = await request<GetStoriesResponse>("/api/v1/stories/mine?limit=50");
    setStories(response.data.stories);
  }, [request]);

  useEffect(() => {
    const loadTimer = window.setTimeout(() => {
      void load().catch((cause) => setError(getErrorMessage(cause)));
    }, 0);

    return () => {
    window.clearTimeout(loadTimer);
    };
  }, [load]);

  async function createStory(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const response = await request<StoryResponse>("/api/v1/stories", {
        method: "POST",
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          language: "fa",
        }),
      });
      navigate(`/write/${response.data.story.id}`);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
      <main className="page-shell">
          <header className="page-heading">
              <div>
                  <p className="eyebrow">فضای نویسنده</p>
                  <h1>داستان‌های من</h1>
                  <p>
                      پیش‌نویس، فصل‌ها و وضعیت انتشار را از اینجا مدیریت کنید.
                  </p>
              </div>
          </header>

          {!user?.emailVerified && (
              <p className="status-message status-message--warning">
                  برای ساخت یا انتشار محتوا ابتدا ایمیل حساب را تأیید کنید.{" "}
                  <Link to="/settings">تنظیمات حساب</Link>
              </p>
          )}

          {error && (
              <p className="status-message status-message--error" role="alert">
                  {error}
              </p>
          )}

          <section className="surface">
              <h2>داستان جدید</h2>
              <form
                  className="stack-form"
                  onSubmit={(event) => void createStory(event)}
              >
                  <label>
                      عنوان
                      <input
                          value={title}
                          minLength={1}
                          maxLength={200}
                          required
                          onChange={(event) => setTitle(event.target.value)}
                      />
                  </label>
                  <label>
                      معرفی کوتاه
                      <textarea
                          value={description}
                          minLength={1}
                          maxLength={5000}
                          required
                          rows={4}
                          onChange={(event) =>
                              setDescription(event.target.value)
                          }
                      />
                  </label>
                  <button
                      className="button"
                      disabled={busy || !user?.emailVerified}
                      type="submit"
                  >
                      {busy ? "در حال ساخت…" : "ساخت پیش‌نویس"}
                  </button>
              </form>
          </section>

          <section className="section-block">
              <div className="section-heading">
                  <h2>همه داستان‌ها</h2>
                  <span>{stories.length.toLocaleString("fa-IR")}</span>
              </div>
              {stories.length === 0 ? (
                  <p className="empty-state">هنوز داستانی نساخته‌اید.</p>
              ) : (
                  <div className="story-grid">
                      {stories.map((story) => (
                          <div key={story.id}>
                              <StoryCard
                                  story={story}
                                  to={`/write/${story.id}`}
                              />

                              <Link
                                  className="text-link"
                                  to={`/write/${story.id}`}
                              >
                                  مدیریت داستان
                              </Link>
                          </div>
                      ))}
                  </div>
              )}
          </section>
      </main>
  );
}
