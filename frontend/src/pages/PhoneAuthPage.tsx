import { useState, type FormEvent } from "react";
import {
  ArrowLeft,
  ArrowRight,
  KeyRound,
  LoaderCircle,
  LockKeyhole,
  MessageSquareText,
  PencilLine,
  RefreshCw,
  Smartphone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import useInterfaceLocale from "../hooks/useInterfaceLocale";
import { getErrorMessage } from "../lib/error-message";

import "../styles/Form.css";
import "./PhoneAuthPage.css";

function normalizeOtpInput(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return [...value]
    .map((character) => {
      const persianIndex = persianDigits.indexOf(character);

      if (persianIndex >= 0) {
        return String(persianIndex);
      }

      const arabicIndex = arabicDigits.indexOf(character);

      if (arabicIndex >= 0) {
        return String(arabicIndex);
      }

      return character;
    })
    .join("")
    .replace(/\D/gu, "")
    .slice(0, 6);
}

export default function PhoneAuthPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { status, requestPhoneOtp, verifyPhoneOtp } = useAuth();
  const { direction, language } = useInterfaceLocale();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  async function requestCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    const normalizedPhoneNumber = phoneNumber.trim();

    try {
      await requestPhoneOtp(normalizedPhoneNumber);
      setPhoneNumber(normalizedPhoneNumber);
      setCodeRequested(true);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode(): Promise<void> {
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      await requestPhoneOtp(phoneNumber);
      setCode("");
      setNotice(t("auth.phone.codeResent"));
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setNotice(null);

    try {
      const result = await verifyPhoneOtp(phoneNumber, code);

      if (result.status === "signup_required") {
        navigate("/complete-signup", { replace: true, state: result });
        return;
      }

      navigate("/", { replace: true });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  function changePhoneNumber(): void {
    setCodeRequested(false);
    setCode("");
    setError(null);
    setNotice(null);
  }

  const BackIcon = direction === "rtl" ? ArrowRight : ArrowLeft;

  return (
    <main className="phone-auth-page" dir={direction} lang={language}>
      <div className="phone-auth-page__decoration" aria-hidden="true" />

      <section
        className="form-card phone-auth-card"
        aria-labelledby="phone-auth-title"
      >
        <header className="phone-auth-card__header">
          <span className="phone-auth-card__icon" aria-hidden="true">
            {codeRequested ? <KeyRound size={29} /> : <Smartphone size={29} />}
          </span>

          <p className="phone-auth-card__step">
            {codeRequested
              ? t("auth.phone.stepCode")
              : t("auth.phone.stepPhone")}
          </p>

          <h1 id="phone-auth-title" className="form-title">
            {codeRequested
              ? t("auth.phone.verifyTitle")
              : t("auth.phone.title")}
          </h1>

          <p className="form-subtitle">
            {codeRequested
              ? t("auth.phone.verifySubtitle")
              : t("auth.phone.subtitle")}
          </p>

          {codeRequested ? (
            <bdi className="phone-auth-card__number" dir="ltr">
              {phoneNumber}
            </bdi>
          ) : null}
        </header>

        <div
          className="phone-auth-progress"
          role="progressbar"
          aria-label={t("auth.phone.progressLabel")}
          aria-valuemin={1}
          aria-valuemax={2}
          aria-valuenow={codeRequested ? 2 : 1}
        >
          <span data-state={codeRequested ? "complete" : "active"} />
          <span data-state={codeRequested ? "active" : "pending"} />
        </div>

        {error ? (
          <p className="form-message form-message-error" role="alert">
            {error}
          </p>
        ) : null}

        {notice ? (
          <p className="form-message form-message-success" role="status">
            {notice}
          </p>
        ) : null}

        {!codeRequested ? (
          <form
            className="form phone-auth-form"
            onSubmit={(event) => void requestCode(event)}
          >
            <div className="form-group">
              <label htmlFor="phone-number">{t("auth.phone.phoneLabel")}</label>

              <div className="phone-auth-input-shell">
                <Smartphone aria-hidden="true" size={19} />

                <input
                  id="phone-number"
                  name="phoneNumber"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  dir="ltr"
                  maxLength={16}
                  placeholder={t("auth.phone.phonePlaceholder")}
                  aria-describedby="phone-number-help"
                  value={phoneNumber}
                  onChange={(event) => {
                    setPhoneNumber(event.target.value);
                    setError(null);
                  }}
                  required
                  autoFocus
                />
              </div>

              <small id="phone-number-help" className="form-help">
                {t("auth.phone.phoneHelp")}
              </small>
            </div>

            <button
              className="button button--primary phone-auth-submit"
              type="submit"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle
                  className="phone-auth-spin"
                  aria-hidden="true"
                  size={18}
                />
              ) : (
                <MessageSquareText aria-hidden="true" size={18} />
              )}

              <span>
                {busy ? t("auth.phone.sending") : t("auth.phone.sendCode")}
              </span>
            </button>
          </form>
        ) : (
          <form
            className="form phone-auth-form"
            onSubmit={(event) => void verifyCode(event)}
          >
            <div className="form-group">
              <label htmlFor="phone-code">{t("auth.phone.codeLabel")}</label>

              <input
                id="phone-code"
                className="phone-auth-code-input"
                name="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                placeholder={t("auth.phone.codePlaceholder")}
                aria-describedby="phone-code-help"
                value={code}
                onChange={(event) => {
                  setCode(normalizeOtpInput(event.target.value));
                  setError(null);
                  setNotice(null);
                }}
                required
                autoFocus
              />

              <small id="phone-code-help" className="form-help">
                {t("auth.phone.codeHelp")}
              </small>
            </div>

            <button
              className="button button--primary phone-auth-submit"
              type="submit"
              disabled={busy || code.length !== 6}
            >
              {busy ? (
                <LoaderCircle
                  className="phone-auth-spin"
                  aria-hidden="true"
                  size={18}
                />
              ) : (
                <KeyRound aria-hidden="true" size={18} />
              )}

              <span>
                {busy ? t("auth.phone.checking") : t("auth.phone.verify")}
              </span>
            </button>

            <div className="phone-auth-form__secondary-actions">
              <button
                type="button"
                className="button button--secondary"
                disabled={busy}
                onClick={() => void resendCode()}
              >
                <RefreshCw aria-hidden="true" size={16} />
                <span>{t("auth.phone.resend")}</span>
              </button>

              <button
                type="button"
                className="button button--secondary"
                disabled={busy}
                onClick={changePhoneNumber}
              >
                <PencilLine aria-hidden="true" size={16} />
                <span>{t("auth.phone.changeNumber")}</span>
              </button>
            </div>
          </form>
        )}

        <footer className="phone-auth-card__footer">
          <p className="phone-auth-card__security-note">
            <LockKeyhole aria-hidden="true" size={15} />
            <span>{t("auth.phone.securityNote")}</span>
          </p>

          <Link className="phone-auth-card__back" to="/login">
            <BackIcon aria-hidden="true" size={16} />
            <span>{t("auth.phone.backToPassword")}</span>
          </Link>
        </footer>
      </section>
    </main>
  );
}
