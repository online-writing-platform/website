import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";

import Button from "../components/Button";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "../styles/Form.css";

interface VerificationLocationState {
  deliveryStatus?: "sent" | "failed";
}

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { verifyEmail, resendVerificationEmail } = useAuth();
  const locationState = location.state as VerificationLocationState | null;
  const [email, setEmail] = useState(params.get("email")?.trim() ?? "");
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<string | null>(
    locationState?.deliveryStatus === "failed"
      ? t("auth.verifyEmail.initialDeliveryFailed")
      : null,
  );
  const [messageKind, setMessageKind] = useState<"error" | "success">(
    "error",
  );

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setMessage(null);
    setIsSubmitting(true);

    try {
      await verifyEmail({
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      navigate("/settings", { replace: true });
    } catch (error) {
      setMessageKind("error");
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleResend(): Promise<void> {
    setMessage(null);
    setIsResending(true);

    try {
      await resendVerificationEmail(email.trim().toLowerCase());
      setMessageKind("success");
      setMessage(t("auth.verifyEmail.resendAccepted"));
    } catch (error) {
      setMessageKind("error");
      setMessage(getErrorMessage(error));
    } finally {
      setIsResending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="form-card" aria-labelledby="verify-email-title">
        <h1 id="verify-email-title" className="form-title">
          {t("auth.verifyEmail.title")}
        </h1>

        <p className="form-subtitle">{t("auth.verifyEmail.subtitle")}</p>

        <form className="form" onSubmit={(event) => void handleSubmit(event)}>
          {message && (
            <p
              className={`form-message form-message-${messageKind}`}
              role={messageKind === "error" ? "alert" : "status"}
            >
              {message}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="verification-email">
              {t("auth.verifyEmail.email")}
            </label>
            <input
              id="verification-email"
              type="email"
              value={email}
              autoComplete="email"
              dir="ltr"
              required
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="verification-code">
              {t("auth.verifyEmail.code")}
            </label>
            <input
              id="verification-code"
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              dir="ltr"
              required
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/gu, "").slice(0, 6))
              }
            />
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("auth.verifyEmail.verifying")
              : t("auth.verifyEmail.submit")}
          </Button>

          <Button
            variant="secondary"
            type="button"
            disabled={isResending || email.trim().length === 0}
            onClick={() => void handleResend()}
          >
            {isResending
              ? t("auth.verifyEmail.resending")
              : t("auth.verifyEmail.resend")}
          </Button>
        </form>

        <p className="form-footer">
          <Link to="/login">{t("auth.verifyEmail.backToLogin")}</Link>
        </p>
      </section>
    </main>
  );
}
