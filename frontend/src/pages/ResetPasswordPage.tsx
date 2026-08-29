import { useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Circle,
  Eye,
  EyeOff,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";

import { ApiError, apiRequest } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

import "./AuthActionPage.css";

const COPY = {
  fa: {
    eyebrow: "رمز امن‌تر",
    visualTitle: "یک رمز تازه؛ یک شروع امن.",
    visualDescription:
      "بعد از ثبت رمز جدید، همهٔ نشست‌های قبلی بسته می‌شوند تا فقط خودتان دوباره وارد حساب شوید.",
    visualNote:
      "رمز جدید را در جای دیگری استفاده نکنید و آن را با کسی به اشتراک نگذارید.",
    backToLogin: "بازگشت به ورود",
    step: "مرحلهٔ نهایی بازیابی",
    title: "رمز عبور جدید بسازید",
    subtitle: "رمزی انتخاب کنید که حدس‌زدن آن دشوار و فقط مخصوص این حساب باشد.",
    passwordLabel: "رمز عبور جدید",
    confirmationLabel: "تکرار رمز عبور جدید",
    showPassword: "نمایش رمز عبور",
    hidePassword: "پنهان‌کردن رمز عبور",
    strengthLabel: "قدرت رمز",
    strengthWeak: "ضعیف",
    strengthMedium: "متوسط",
    strengthStrong: "قوی",
    minLength: "حداقل ۱۰ کاراکتر",
    letterCase: "حروف کوچک و بزرگ لاتین",
    numberAndSymbol: "حداقل یک عدد و یک نویسهٔ ویژه",
    usernameHint: "رمز نباید شامل نام کاربری شما باشد.",
    passwordsMatch: "دو رمز یکسان‌اند.",
    passwordsDoNotMatch: "دو رمز یکسان نیستند.",
    requirementsError: "رمز عبور هنوز همهٔ شرایط امنیتی را ندارد.",
    mismatchError: "رمز عبور و تکرار آن یکسان نیستند.",
    submit: "ثبت رمز جدید",
    submitting: "در حال ثبت…",
    successTitle: "رمز عبور تغییر کرد",
    successMessage:
      "همهٔ نشست‌های قبلی بسته شدند. اکنون با رمز جدید وارد حساب خود شوید.",
    login: "ورود با رمز جدید",
    missingTitle: "لینک بازیابی کامل نیست",
    missingMessage:
      "توکن بازیابی در این آدرس وجود ندارد. یک لینک تازه درخواست کنید.",
    invalidToken:
      "این لینک بازیابی نامعتبر یا منقضی شده است. یک لینک تازه دریافت کنید.",
    requestNewLink: "درخواست لینک جدید",
    footer: "به لینک تازه نیاز دارید؟",
  },
  en: {
    eyebrow: "A safer password",
    visualTitle: "A new password. A secure fresh start.",
    visualDescription:
      "After your password is updated, every previous session is closed so only you can sign in again.",
    visualNote: "Don’t reuse this password elsewhere or share it with anyone.",
    backToLogin: "Back to sign in",
    step: "Final recovery step",
    title: "Create a new password",
    subtitle:
      "Choose a password that is hard to guess and unique to this account.",
    passwordLabel: "New password",
    confirmationLabel: "Confirm new password",
    showPassword: "Show password",
    hidePassword: "Hide password",
    strengthLabel: "Password strength",
    strengthWeak: "Weak",
    strengthMedium: "Medium",
    strengthStrong: "Strong",
    minLength: "At least 10 characters",
    letterCase: "Uppercase and lowercase Latin letters",
    numberAndSymbol: "At least one number and one special character",
    usernameHint: "Your password must not contain your username.",
    passwordsMatch: "The passwords match.",
    passwordsDoNotMatch: "The passwords don’t match.",
    requirementsError:
      "The password does not meet every security requirement yet.",
    mismatchError: "The password and confirmation do not match.",
    submit: "Save new password",
    submitting: "Saving…",
    successTitle: "Password updated",
    successMessage:
      "Every previous session has been closed. You can now sign in with your new password.",
    login: "Sign in with new password",
    missingTitle: "The recovery link is incomplete",
    missingMessage:
      "There is no recovery token in this address. Request a fresh link to continue.",
    invalidToken:
      "This recovery link is invalid or expired. Please request a fresh link.",
    requestNewLink: "Request a new link",
    footer: "Need a fresh link?",
  },
} as const;

function containsAsciiSpecialCharacter(value: string): boolean {
  return Array.from(value).some((character) => {
    const code = character.codePointAt(0);

    return (
      code !== undefined &&
      ((code >= 33 && code <= 47) ||
        (code >= 58 && code <= 64) ||
        (code >= 91 && code <= 96) ||
        (code >= 123 && code <= 126))
    );
  });
}

export default function ResetPasswordPage() {
  const { i18n } = useTranslation();
  const [params] = useSearchParams();

  const token = params.get("token")?.trim() ?? "";
  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";
  const direction = language === "fa" ? "rtl" : "ltr";
  const copy = COPY[language];

  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;
  const ForwardIcon = direction === "rtl" ? ArrowLeft : ArrowRight;

  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checks = useMemo(
    () => ({
      length: password.length >= 10,
      lowercase: /[a-z]/u.test(password),
      uppercase: /[A-Z]/u.test(password),
      number: /[0-9]/u.test(password),
      special: containsAsciiSpecialCharacter(password),
    }),
    [password],
  );

  const passwordScore = Object.values(checks).filter(Boolean).length;
  const passwordMeetsPolicy = passwordScore === 5;
  const hasConfirmation = confirmation.length > 0;
  const passwordsMatch = hasConfirmation && password === confirmation;

  const strengthLabel =
    passwordScore <= 2
      ? copy.strengthWeak
      : passwordScore <= 4
        ? copy.strengthMedium
        : copy.strengthStrong;

  async function submit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!token || isSubmitting) {
      return;
    }

    if (!passwordMeetsPolicy) {
      setError(copy.requirementsError);
      return;
    }

    if (password !== confirmation) {
      setError(copy.mismatchError);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await apiRequest("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        body: JSON.stringify({
          token,
          newPassword: password,
        }),
      });

      setCompleted(true);
      setPassword("");
      setConfirmation("");
    } catch (cause) {
      setError(
        cause instanceof ApiError &&
          cause.code === "INVALID_OR_EXPIRED_PASSWORD_RESET_TOKEN"
          ? copy.invalidToken
          : getErrorMessage(cause),
      );
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
              <LockKeyhole />
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
          aria-labelledby="reset-password-title"
        >
          <Link className="auth-action-back" to="/login">
            <BackIcon aria-hidden="true" />
            <span>{copy.backToLogin}</span>
          </Link>

          <div className="auth-action-heading">
            <span className="auth-action-step">{copy.step}</span>

            <h1 id="reset-password-title">{copy.title}</h1>

            <p>{copy.subtitle}</p>
          </div>

          {!token ? (
            <div className="auth-action-result">
              <div
                className="auth-action-result__icon auth-action-result__icon--error"
                aria-hidden="true"
              >
                <TriangleAlert />
              </div>

              <h2>{copy.missingTitle}</h2>
              <p>{copy.missingMessage}</p>

              <Link
                className="button button--primary auth-action-submit"
                to="/forgot-password"
              >
                <KeyRound aria-hidden="true" />
                {copy.requestNewLink}
              </Link>
            </div>
          ) : completed ? (
            <div className="auth-action-result" aria-live="polite">
              <div
                className="auth-action-result__icon auth-action-result__icon--success"
                aria-hidden="true"
              >
                <CheckCircle2 />
              </div>

              <h2>{copy.successTitle}</h2>
              <p>{copy.successMessage}</p>

              <Link
                className="button button--primary auth-action-submit"
                to="/login"
              >
                <ForwardIcon aria-hidden="true" />
                {copy.login}
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div
                  className="auth-action-alert auth-action-alert--error"
                  role="alert"
                >
                  <TriangleAlert aria-hidden="true" />
                  <p>{error}</p>
                </div>
              )}

              <form
                className="auth-action-form"
                onSubmit={(event) => void submit(event)}
              >
                <div className="auth-action-field">
                  <label htmlFor="new-password">{copy.passwordLabel}</label>

                  <div className="auth-action-input-shell auth-action-input-shell--password">
                    <LockKeyhole
                      className="auth-action-input-icon"
                      aria-hidden="true"
                    />

                    <input
                      id="new-password"
                      name="newPassword"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      minLength={10}
                      maxLength={128}
                      autoComplete="new-password"
                      autoFocus
                      required
                      dir="ltr"
                      aria-invalid={Boolean(error) && !passwordMeetsPolicy}
                      aria-describedby="password-requirements"
                      onChange={(event) => {
                        setPassword(event.target.value);
                        setError(null);
                      }}
                    />

                    <button
                      className="auth-action-password-toggle"
                      type="button"
                      aria-label={
                        showPassword ? copy.hidePassword : copy.showPassword
                      }
                      title={
                        showPassword ? copy.hidePassword : copy.showPassword
                      }
                      onClick={() => setShowPassword((current) => !current)}
                    >
                      {showPassword ? (
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>

                <div
                  id="password-requirements"
                  className="auth-action-password-guide"
                >
                  <div className="auth-action-password-strength">
                    <span>{copy.strengthLabel}</span>

                    <strong data-score={passwordScore}>{strengthLabel}</strong>
                  </div>

                  <progress
                    value={passwordScore}
                    max={5}
                    aria-label={`${copy.strengthLabel}: ${strengthLabel}`}
                  />

                  <ul>
                    <li data-met={checks.length}>
                      {checks.length ? <Check /> : <Circle />}
                      <span>{copy.minLength}</span>
                    </li>

                    <li data-met={checks.lowercase && checks.uppercase}>
                      {checks.lowercase && checks.uppercase ? (
                        <Check />
                      ) : (
                        <Circle />
                      )}
                      <span>{copy.letterCase}</span>
                    </li>

                    <li data-met={checks.number && checks.special}>
                      {checks.number && checks.special ? <Check /> : <Circle />}
                      <span>{copy.numberAndSymbol}</span>
                    </li>
                  </ul>

                  <p>{copy.usernameHint}</p>
                </div>

                <div className="auth-action-field">
                  <label htmlFor="new-password-confirmation">
                    {copy.confirmationLabel}
                  </label>

                  <div className="auth-action-input-shell auth-action-input-shell--password">
                    <LockKeyhole
                      className="auth-action-input-icon"
                      aria-hidden="true"
                    />

                    <input
                      id="new-password-confirmation"
                      name="passwordConfirmation"
                      type={showConfirmation ? "text" : "password"}
                      value={confirmation}
                      minLength={10}
                      maxLength={128}
                      autoComplete="new-password"
                      required
                      dir="ltr"
                      aria-invalid={hasConfirmation && !passwordsMatch}
                      aria-describedby={
                        hasConfirmation ? "password-match-status" : undefined
                      }
                      onChange={(event) => {
                        setConfirmation(event.target.value);
                        setError(null);
                      }}
                    />

                    <button
                      className="auth-action-password-toggle"
                      type="button"
                      aria-label={
                        showConfirmation ? copy.hidePassword : copy.showPassword
                      }
                      title={
                        showConfirmation ? copy.hidePassword : copy.showPassword
                      }
                      onClick={() => setShowConfirmation((current) => !current)}
                    >
                      {showConfirmation ? (
                        <EyeOff aria-hidden="true" />
                      ) : (
                        <Eye aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {hasConfirmation && (
                    <small
                      id="password-match-status"
                      className={`auth-action-match ${
                        passwordsMatch
                          ? "auth-action-match--success"
                          : "auth-action-match--error"
                      }`}
                    >
                      {passwordsMatch ? <Check /> : <TriangleAlert />}

                      {passwordsMatch
                        ? copy.passwordsMatch
                        : copy.passwordsDoNotMatch}
                    </small>
                  )}
                </div>

                <button
                  className="button button--primary auth-action-submit"
                  type="submit"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <LoaderCircle
                      className="auth-action-spinner"
                      aria-hidden="true"
                    />
                  ) : (
                    <KeyRound aria-hidden="true" />
                  )}

                  <span>{isSubmitting ? copy.submitting : copy.submit}</span>
                </button>
              </form>

              <p className="auth-action-footer">
                {copy.footer}{" "}
                <Link to="/forgot-password">{copy.requestNewLink}</Link>
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
