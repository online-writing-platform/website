import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  LoaderCircle,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

import "./AuthActionPage.css";

const COPY = {
  fa: {
    eyebrow: "امنیت حساب",
    visualTitle: "راه بازگشت به حساب، از ایمیل شما می‌گذرد.",
    visualDescription:
      "درخواست بازیابی محرمانه است و برای جلوگیری از شناسایی حساب‌ها، پاسخ همیشه به یک شکل نمایش داده می‌شود.",
    visualNote:
      "لینک بازیابی را فقط در همان دستگاه و مرورگری باز کنید که به آن اعتماد دارید.",
    backToLogin: "بازگشت به ورود",
    step: "بازیابی رمز عبور",
    title: "حساب خود را پیدا کنید",
    subtitle:
      "ایمیل یا نام کاربری حساب را وارد کنید تا راهنمای انتخاب رمز جدید برایتان ارسال شود.",
    identifierLabel: "ایمیل یا نام کاربری",
    identifierPlaceholder: "name@example.com یا username",
    identifierHelp: "برای حفظ امنیت، وجود یا نبودن حساب را اعلام نمی‌کنیم.",
    submit: "ارسال راهنمای بازیابی",
    submitting: "در حال ارسال…",
    successTitle: "درخواست ثبت شد",
    successMessage:
      "اگر حسابی با این مشخصات وجود داشته باشد، راهنمای بازیابی به ایمیل متصل به آن ارسال می‌شود.",
    footer: "رمز عبورتان را به یاد آوردید؟",
    login: "وارد شوید",
  },
  en: {
    eyebrow: "Account security",
    visualTitle: "Your email is the way back to your account.",
    visualDescription:
      "Recovery requests stay private. To prevent account discovery, the same response is shown for every request.",
    visualNote:
      "Only open the recovery link on a device and browser you trust.",
    backToLogin: "Back to sign in",
    step: "Password recovery",
    title: "Find your account",
    subtitle:
      "Enter the email address or username for your account and we’ll send instructions for choosing a new password.",
    identifierLabel: "Email or username",
    identifierPlaceholder: "name@example.com or username",
    identifierHelp:
      "For your security, we don’t reveal whether an account exists.",
    submit: "Send recovery instructions",
    submitting: "Sending…",
    successTitle: "Request received",
    successMessage:
      "If an account matches those details, recovery instructions will be sent to its email address.",
    footer: "Remembered your password?",
    login: "Sign in",
  },
} as const;

export default function ForgotPasswordPage() {
  const { i18n } = useTranslation();

  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";
  const direction = language === "fa" ? "rtl" : "ltr";
  const copy = COPY[language];
  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  const [identifier, setIdentifier] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [requestAccepted, setRequestAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmedIdentifier = identifier.trim();

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!trimmedIdentifier || isSubmitting) {
      return;
    }

    setError(null);
    setRequestAccepted(false);
    setIsSubmitting(true);

    try {
      await apiRequest("/api/v1/auth/password-reset/request", {
        method: "POST",
        body: JSON.stringify({
          identifier: trimmedIdentifier,
        }),
      });

      setRequestAccepted(true);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setIsSubmitting(false);
    }
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
              <KeyRound />
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
          aria-labelledby="forgot-password-title"
        >
          <Link className="auth-action-back" to="/login">
            <BackIcon aria-hidden="true" />
            <span>{copy.backToLogin}</span>
          </Link>

          <div className="auth-action-heading">
            <span className="auth-action-step">{copy.step}</span>

            <h1 id="forgot-password-title">{copy.title}</h1>

            <p>{copy.subtitle}</p>
          </div>

          <div className="auth-action-live-region" aria-live="polite">
            {requestAccepted && (
              <div
                className="auth-action-alert auth-action-alert--success"
                role="status"
              >
                <CheckCircle2 aria-hidden="true" />

                <div>
                  <strong>{copy.successTitle}</strong>
                  <p>{copy.successMessage}</p>
                </div>
              </div>
            )}

            {error && (
              <div
                className="auth-action-alert auth-action-alert--error"
                role="alert"
              >
                <ShieldCheck aria-hidden="true" />
                <p>{error}</p>
              </div>
            )}
          </div>

          <form
            className="auth-action-form"
            onSubmit={(event) => void submit(event)}
          >
            <div className="auth-action-field">
              <label htmlFor="recovery-identifier">
                {copy.identifierLabel}
              </label>

              <div className="auth-action-input-shell">
                <Mail className="auth-action-input-icon" aria-hidden="true" />

                <input
                  id="recovery-identifier"
                  name="identifier"
                  type="text"
                  value={identifier}
                  maxLength={320}
                  autoComplete="username"
                  autoFocus
                  required
                  dir="auto"
                  aria-describedby="recovery-identifier-help"
                  placeholder={copy.identifierPlaceholder}
                  onChange={(event) => {
                    setIdentifier(event.target.value);
                    setError(null);
                    setRequestAccepted(false);
                  }}
                />
              </div>

              <small id="recovery-identifier-help">
                <ShieldCheck aria-hidden="true" />
                {copy.identifierHelp}
              </small>
            </div>

            <button
              className="button button--primary auth-action-submit"
              type="submit"
              disabled={!trimmedIdentifier || isSubmitting}
            >
              {isSubmitting ? (
                <LoaderCircle
                  className="auth-action-spinner"
                  aria-hidden="true"
                />
              ) : (
                <Mail aria-hidden="true" />
              )}

              <span>{isSubmitting ? copy.submitting : copy.submit}</span>
            </button>
          </form>

          <p className="auth-action-footer">
            {copy.footer} <Link to="/login">{copy.login}</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
