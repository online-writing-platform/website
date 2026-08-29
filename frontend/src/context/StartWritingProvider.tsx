import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { CircleAlert, LoaderCircle, PenTool, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import {
  getActiveStoryLanguage,
  getStoryTextAttributes,
} from "../lib/story-language";
import type { StoryResponse } from "../types/story";
import StartWritingContext, {
  type StartWritingContextValue,
} from "./StartWritingContext";

interface StartWritingProviderProps {
  children: ReactNode;
}

const COPY = {
  fa: {
    title: "شروع یک داستان جدید",
    description: "برای ساخت فضای نوشتن، فقط عنوان اولیهٔ داستان را وارد کنید.",
    titleLabel: "عنوان داستان",
    titlePlaceholder: "مثلاً آخرین ایستگاه باران",
    cancel: "انصراف",
    submit: "شروع نوشتن",
    submitting: "در حال ساخت…",
    close: "بستن پنجره",
    count: (value: string) => `${value} از ۲۰۰ نویسه`,
    verifyEmail: "برای شروع نوشتن ابتدا ایمیل حساب خود را تأیید کنید.",
    accountSettings: "تنظیمات حساب",
  },
  en: {
    title: "Start a new story",
    description:
      "Enter only the initial story title to create your writing space.",
    titleLabel: "Story title",
    titlePlaceholder: "For example, The Last Rain Station",
    cancel: "Cancel",
    submit: "Start writing",
    submitting: "Creating…",
    close: "Close dialog",
    count: (value: string) => `${value} of 200 characters`,
    verifyEmail: "Verify your account email before you start writing.",
    accountSettings: "Account settings",
  },
} as const;

export default function StartWritingProvider({
  children,
}: StartWritingProviderProps) {
  const { i18n } = useTranslation();
  const { status, user, request } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  const isEnglish = i18n.resolvedLanguage?.startsWith("en") ?? false;
  const copy = isEnglish ? COPY.en : COPY.fa;
  const locale = isEnglish ? "en-US" : "fa-IR";
  const storyLanguage = getActiveStoryLanguage(i18n.resolvedLanguage);
  const storyTextAttributes = getStoryTextAttributes(storyLanguage);

  const closeStartWriting = useCallback((): void => {
    setIsOpen(false);
    setTitle("");
    setError(null);
  }, []);

  const openStartWriting = useCallback((): void => {
    if (status === "loading") {
      return;
    }

    if (status !== "authenticated" || !user) {
      navigate("/login", {
        state: {
          from: location,
        },
      });
      return;
    }

    setTitle("");
    setError(null);
    setIsOpen(true);
  }, [location, navigate, status, user]);

  useEffect(() => {
    function handleStartWritingLink(event: MouseEvent): void {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>('a[href="/write"]');

      if (
        !anchor ||
        anchor.classList.contains("writer-back-link") ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download")
      ) {
        return;
      }

      event.preventDefault();
      openStartWriting();
    }

    document.addEventListener("click", handleStartWritingLink, true);

    return () => {
      document.removeEventListener("click", handleStartWritingLink, true);
    };
  }, [openStartWriting]);

  useEffect(() => {
    if (location.pathname !== "/write" || status === "loading") {
      return;
    }

    const routeTimer = window.setTimeout(() => {
      if (status === "authenticated" && user) {
        navigate(`/users/${encodeURIComponent(user.username)}`, {
          replace: true,
        });
      } else {
        navigate("/login", {
          replace: true,
          state: {
            from: location,
          },
        });
      }
    }, 0);

    return () => {
      window.clearTimeout(routeTimer);
    };
  }, [location, navigate, status, user]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === "Escape" && !busy) {
        closeStartWriting();
      }
    }

    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [busy, closeStartWriting, isOpen]);

  async function createStory(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    const normalizedTitle = title.trim();

    if (
      busy ||
      !normalizedTitle ||
      status !== "authenticated" ||
      !user?.emailVerified
    ) {
      return;
    }

    setBusy(true);
    setError(null);

    try {
      const response = await request<StoryResponse>("/api/v1/stories", {
        method: "POST",
        body: JSON.stringify({
          title: normalizedTitle,
          language: storyLanguage,
        }),
      });

      const createdStory = response.data.story;

      setIsOpen(false);
      setTitle("");
      navigate(`/write/${createdStory.id}`);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function handleBackdropMouseDown(
    event: ReactMouseEvent<HTMLDivElement>,
  ): void {
    if (event.target === event.currentTarget && !busy) {
      closeStartWriting();
    }
  }

  const contextValue = useMemo<StartWritingContextValue>(
    () => ({
      openStartWriting,
      closeStartWriting,
    }),
    [closeStartWriting, openStartWriting],
  );

  const modal =
    isOpen && typeof document !== "undefined"
      ? createPortal(
          <div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
            onMouseDown={handleBackdropMouseDown}
          >
            <section
              className="w-full max-w-lg rounded-2xl border p-5 sm:p-6"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--text)",
                boxShadow: "var(--shadow)",
              }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="start-writing-title"
              aria-describedby="start-writing-description"
              dir={i18n.dir()}
              lang={isEnglish ? "en" : "fa"}
            >
              <header className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      background: "var(--primary-soft)",
                      color: "var(--primary)",
                    }}
                  >
                    <PenTool aria-hidden="true" className="h-5 w-5" />
                  </span>

                  <div>
                    <h2
                      id="start-writing-title"
                      className="m-0 text-xl font-bold"
                    >
                      {copy.title}
                    </h2>

                    <p
                      id="start-writing-description"
                      className="mt-1 text-sm leading-6"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {copy.description}
                    </p>
                  </div>
                </div>

                <button
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition-colors"
                  style={{
                    borderColor: "var(--border)",
                    background: "var(--surface)",
                    color: "var(--text-secondary)",
                  }}
                  type="button"
                  disabled={busy}
                  aria-label={copy.close}
                  onClick={closeStartWriting}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </header>

              {!user?.emailVerified ? (
                <div
                  className="mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm"
                  style={{
                    borderColor: "var(--warning)",
                    background:
                      "color-mix(in srgb, var(--warning) 10%, var(--surface))",
                    color: "var(--warning)",
                  }}
                >
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />

                  <p className="m-0">
                    {copy.verifyEmail}{" "}
                    <button
                      className="font-semibold underline underline-offset-2"
                      type="button"
                      onClick={() => {
                        closeStartWriting();
                        navigate("/settings");
                      }}
                    >
                      {copy.accountSettings}
                    </button>
                  </p>
                </div>
              ) : null}

              {error ? (
                <div
                  className="mt-5 flex items-start gap-2 rounded-xl border p-3 text-sm"
                  style={{
                    borderColor: "var(--danger)",
                    background:
                      "color-mix(in srgb, var(--danger) 9%, var(--surface))",
                    color: "var(--danger)",
                  }}
                  role="alert"
                >
                  <CircleAlert
                    aria-hidden="true"
                    className="mt-0.5 h-4 w-4 shrink-0"
                  />
                  <p className="m-0">{error}</p>
                </div>
              ) : null}

              <form
                className="mt-5"
                onSubmit={(event) => void createStory(event)}
              >
                <label className="block" htmlFor="start-writing-story-title">
                  <span className="mb-2 block text-sm font-semibold">
                    {copy.titleLabel}
                  </span>

                  <input
                    ref={inputRef}
                    id="start-writing-story-title"
                    className="w-full rounded-xl border px-3.5 py-3 outline-none transition-shadow focus:ring-2"
                    style={{
                      borderColor: "var(--input)",
                      background: "var(--background)",
                      color: "var(--text)",
                    }}
                    value={title}
                    minLength={1}
                    maxLength={200}
                    required
                    disabled={busy || !user?.emailVerified}
                    placeholder={copy.titlePlaceholder}
                    {...storyTextAttributes}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                </label>

                <p
                  className="mt-1.5 text-xs"
                  style={{ color: "var(--text-muted)" }}
                >
                  {copy.count(title.length.toLocaleString(locale))}
                </p>

                <div className="mt-6 flex flex-wrap justify-end gap-2.5">
                  <button
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: "var(--border)",
                      background: "var(--surface)",
                      color: "var(--text)",
                    }}
                    type="button"
                    disabled={busy}
                    onClick={closeStartWriting}
                  >
                    {copy.cancel}
                  </button>

                  <button
                    className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold"
                    style={{
                      background: "var(--primary)",
                      color: "var(--primary-foreground)",
                    }}
                    type="submit"
                    disabled={busy || !title.trim() || !user?.emailVerified}
                  >
                    {busy ? (
                      <LoaderCircle
                        aria-hidden="true"
                        className="h-4 w-4 animate-spin"
                      />
                    ) : (
                      <PenTool aria-hidden="true" className="h-4 w-4" />
                    )}

                    {busy ? copy.submitting : copy.submit}
                  </button>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <StartWritingContext.Provider value={contextValue}>
      {children}
      {modal}
    </StartWritingContext.Provider>
  );
}
