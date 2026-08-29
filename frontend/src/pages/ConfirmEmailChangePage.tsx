import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Home,
  LoaderCircle,
  LogIn,
  MailCheck,
  RefreshCw,
  Settings,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { ApiError, apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

import "./AuthActionPage.css";

const COPY = {
  fa: {
    eyebrow: "تأیید هویت",
    visualTitle: "ایمیل تازه، پس از یک تأیید امن.",
    visualDescription:
      "با تأیید این لینک، ایمیل جدید به حساب شما متصل می‌شود و ایمیل قبلی دیگر برای ورود قابل استفاده نیست.",
    visualNote:
      "پس از تغییر ایمیل، برای محافظت از حساب همهٔ نشست‌های فعال بسته می‌شوند.",
    backHome: "بازگشت به خانه",
    step: "تأیید تغییر ایمیل",
    title: "در حال بررسی لینک تأیید",
    subtitle: "این مرحله فقط چند لحظه زمان می‌برد. این صفحه را نبندید.",
    loadingTitle: "در حال تأیید ایمیل جدید…",
    loadingMessage:
      "لینک امن شما در حال بررسی و اطلاعات حساب در حال به‌روزرسانی است.",
    successTitle: "ایمیل حساب تغییر کرد",
    successMessage:
      "ایمیل جدید با موفقیت تأیید شد. همهٔ نشست‌های قبلی بسته شده‌اند؛ لطفاً دوباره وارد شوید.",
    errorTitle: "تأیید ایمیل انجام نشد",
    invalidToken:
      "این لینک تغییر ایمیل نامعتبر یا منقضی شده است. از تنظیمات حساب، درخواست تازه‌ای ثبت کنید.",
    missingTitle: "لینک تأیید کامل نیست",
    missingMessage:
      "توکن تغییر ایمیل در این آدرس وجود ندارد. لینک کامل ارسال‌شده به ایمیل را باز کنید.",
    login: "ورود دوباره",
    settings: "رفتن به تنظیمات",
    retry: "تلاش دوباره",
    home: "صفحهٔ اصلی",
  },
  en: {
    eyebrow: "Identity confirmation",
    visualTitle: "A new email, after one secure check.",
    visualDescription:
      "Confirming this link connects the new email address to your account. The previous address can no longer be used to sign in.",
    visualNote:
      "To protect your account, every active session is closed after the email changes.",
    backHome: "Back to home",
    step: "Confirm email change",
    title: "Checking your confirmation link",
    subtitle: "This should only take a moment. Please keep this page open.",
    loadingTitle: "Confirming your new email…",
    loadingMessage:
      "We’re checking your secure link and updating your account details.",
    successTitle: "Account email updated",
    successMessage:
      "Your new email was confirmed successfully. All previous sessions are closed, so please sign in again.",
    errorTitle: "We couldn’t confirm the email change",
    invalidToken:
      "This email-change link is invalid or expired. Start a new request from your account settings.",
    missingTitle: "The confirmation link is incomplete",
    missingMessage:
      "There is no email-change token in this address. Open the complete link from your email.",
    login: "Sign in again",
    settings: "Go to settings",
    retry: "Try again",
    home: "Home page",
  },
} as const;

type ConfirmationState =
  | {
      kind: "loading";
    }
  | {
      kind: "success";
    }
  | {
      kind: "error";
      cause: unknown;
    };

export default function ConfirmEmailChangePage() {
  const { i18n } = useTranslation();
  const [params] = useSearchParams();

  const token = params.get("token")?.trim() ?? "";
  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";
  const direction = language === "fa" ? "rtl" : "ltr";
  const copy = COPY[language];

  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<ConfirmationState>({
    kind: "loading",
  });

  useEffect(() => {
    if (!token) {
      return;
    }

    let active = true;

    /*
     * عقب‌انداختن درخواست تا event loop بعدی باعث
     * جلوگیری از ارسال دوباره در React Strict Mode می‌شود.
     */
    const timer = window.setTimeout(() => {
      if (active) {
        setState({
          kind: "loading",
        });
      }

      void apiRequest("/api/v1/auth/email-change/confirm", {
        method: "POST",
        body: JSON.stringify({
          token,
        }),
      })
        .then(() => {
          if (active) {
            setState({
              kind: "success",
            });
          }
        })
        .catch((cause: unknown) => {
          if (active) {
            setState({
              kind: "error",
              cause,
            });
          }
        });
    }, 0);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [attempt, token]);

  const effectiveKind = token ? state.kind : "missing";

  const errorMessage =
    state.kind === "error"
      ? state.cause instanceof ApiError &&
        state.cause.code === "INVALID_OR_EXPIRED_EMAIL_CHANGE_TOKEN"
        ? copy.invalidToken
        : getErrorMessage(state.cause)
      : null;

  function retry(): void {
    setState({
      kind: "loading",
    });

    setAttempt((current) => current + 1);
  }

  return (
    <main className="auth-action-page" dir={direction} lang={language}>
      <div className="auth-action-shell">
        <aside className="auth-action-visual">
          <div className="auth-action-visual__content">
            <span className="auth-action-visual__eyebrow">
              <ShieldCheck aria-hidden="true" />
              {copy.eyebrow}
            </span>

            <div className="auth-action-visual__symbol" aria-hidden="true">
              <MailCheck />
              <span />
            </div>

            <h2>{copy.visualTitle}</h2>
            <p>{copy.visualDescription}</p>
          </div>

          <div className="auth-action-visual__note">
            <ShieldCheck aria-hidden="true" />
            <span>{copy.visualNote}</span>
          </div>
        </aside>

        <section
          className="auth-action-content"
          aria-labelledby="confirm-email-title"
        >
          <Link className="auth-action-back" to="/">
            <BackIcon aria-hidden="true" />
            <span>{copy.backHome}</span>
          </Link>

          <div className="auth-action-heading">
            <span className="auth-action-step">{copy.step}</span>

            <h1 id="confirm-email-title">{copy.title}</h1>

            <p>{copy.subtitle}</p>
          </div>

          <div className="auth-action-result" aria-live="polite">
            {effectiveKind === "loading" && (
              <>
                <div
                  className="auth-action-result__icon auth-action-result__icon--loading"
                  aria-hidden="true"
                >
                  <LoaderCircle className="auth-action-spinner" />
                </div>

                <h2>{copy.loadingTitle}</h2>
                <p>{copy.loadingMessage}</p>
              </>
            )}

            {effectiveKind === "success" && (
              <>
                <div
                  className="auth-action-result__icon auth-action-result__icon--success"
                  aria-hidden="true"
                >
                  <CheckCircle2 />
                </div>

                <h2>{copy.successTitle}</h2>
                <p>{copy.successMessage}</p>

                <div className="auth-action-result__actions">
                  <Link className="button button--primary" to="/login">
                    <LogIn aria-hidden="true" />
                    {copy.login}
                  </Link>

                  <Link className="button button--secondary" to="/">
                    <Home aria-hidden="true" />
                    {copy.home}
                  </Link>
                </div>
              </>
            )}

            {effectiveKind === "error" && (
              <>
                <div
                  className="auth-action-result__icon auth-action-result__icon--error"
                  aria-hidden="true"
                >
                  <TriangleAlert />
                </div>

                <h2>{copy.errorTitle}</h2>
                <p role="alert">{errorMessage}</p>

                <div className="auth-action-result__actions">
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={retry}
                  >
                    <RefreshCw aria-hidden="true" />
                    {copy.retry}
                  </button>

                  <Link className="button button--secondary" to="/settings">
                    <Settings aria-hidden="true" />
                    {copy.settings}
                  </Link>
                </div>
              </>
            )}

            {effectiveKind === "missing" && (
              <>
                <div
                  className="auth-action-result__icon auth-action-result__icon--error"
                  aria-hidden="true"
                >
                  <TriangleAlert />
                </div>

                <h2>{copy.missingTitle}</h2>
                <p role="alert">{copy.missingMessage}</p>

                <div className="auth-action-result__actions">
                  <Link className="button button--primary" to="/settings">
                    <Settings aria-hidden="true" />
                    {copy.settings}
                  </Link>

                  <Link className="button button--secondary" to="/">
                    <Home aria-hidden="true" />
                    {copy.home}
                  </Link>
                </div>
              </>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
