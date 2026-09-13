import { useState, type FormEvent } from "react";
import {
  AtSign,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  LogIn,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import SocialAuthButtons from "../components/SocialAuthButtons";
import AuthPageShell from "../features/auth/components/AuthPageShell";
import useAuth from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

import "../styles/Form.css";

interface LoginLocationState {
  from?: { pathname?: string };
}

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const locationState = location.state as LoginLocationState | null;
  const redirectPath = locationState?.from?.pathname ?? "/";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        identifier: identifier.trim(),
        password,
      });
      navigate(redirectPath, { replace: true });
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.code === "EMAIL_VERIFICATION_REQUIRED" &&
        typeof error.details === "object" &&
        error.details !== null &&
        "email" in error.details &&
        typeof error.details.email === "string"
      ) {
        const search = new URLSearchParams({
          email: error.details.email,
        }).toString();
        navigate(`/verify-email?${search}`, { replace: true });
        return;
      }

      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow={t("auth.login.eyebrow")}
      footer={
        <>
          <p className="auth-security-note">
            <ShieldCheck aria-hidden="true" size={15} />
            <span>{t("auth.login.securityNote")}</span>
          </p>

          <p className="auth-account-switch">
            {t("auth.login.noAccount")}
            <Link to="/register">{t("auth.login.register")}</Link>
          </p>
        </>
      }
      icon={<LogIn size={29} />}
      subtitle={t("auth.login.subtitle")}
      title={t("auth.login.title")}
      titleId="login-title"
    >
      {errorMessage ? (
        <p className="form-message form-message-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form className="form" onSubmit={(event) => void handleSubmit(event)}>
        <div className="form-group">
          <label htmlFor="identifier">{t("auth.login.identifier")}</label>

          <div className="auth-field-shell">
            <AtSign
              className="auth-field-shell__icon"
              aria-hidden="true"
              size={18}
            />

            <input
              id="identifier"
              name="identifier"
              value={identifier}
              maxLength={320}
              autoComplete="username"
              placeholder={t("auth.login.identifierPlaceholder")}
              dir="auto"
              required
              autoFocus
              onChange={(event) => {
                setIdentifier(event.target.value);
                setErrorMessage(null);
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <div className="auth-label-row">
            <label htmlFor="password">{t("auth.login.password")}</label>

            <Link className="auth-label-link" to="/forgot-password">
              {t("auth.login.forgotPassword")}
            </Link>
          </div>

          <div className="auth-field-shell auth-field-shell--password">
            <LockKeyhole
              className="auth-field-shell__icon"
              aria-hidden="true"
              size={18}
            />

            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              value={password}
              maxLength={128}
              autoComplete="current-password"
              placeholder={t("auth.login.passwordPlaceholder")}
              dir="ltr"
              required
              onChange={(event) => {
                setPassword(event.target.value);
                setErrorMessage(null);
              }}
            />

            <button
              type="button"
              className="auth-password-toggle"
              onClick={() => setShowPassword((current) => !current)}
              aria-label={
                showPassword
                  ? t("auth.common.hidePassword")
                  : t("auth.common.showPassword")
              }
              aria-pressed={showPassword}
            >
              {showPassword ? (
                <EyeOff aria-hidden="true" size={18} />
              ) : (
                <Eye aria-hidden="true" size={18} />
              )}
            </button>
          </div>
        </div>

        <button
          className="button button--primary auth-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoaderCircle className="auth-spin" aria-hidden="true" size={18} />
          ) : (
            <LogIn aria-hidden="true" size={18} />
          )}

          <span>
            {isSubmitting
              ? t("auth.login.submitting")
              : t("auth.login.submit")}
          </span>
        </button>
      </form>

      <div className="auth-divider">
        <span>{t("auth.common.or")}</span>
      </div>

      <SocialAuthButtons />

      <Link className="auth-phone-link" to="/phone-auth">
        <span className="auth-phone-link__icon" aria-hidden="true">
          <Smartphone size={19} />
        </span>

        <span className="auth-phone-link__copy">
          <strong>{t("auth.login.phoneAuth")}</strong>
          <small>{t("auth.login.phoneAuthHelp")}</small>
        </span>
      </Link>
    </AuthPageShell>
  );
}

export default Login;
