import { useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { LuEyeClosed, LuEye } from "react-icons/lu";

import useAuth from "../hooks/useAuth";
import { ApiError } from "../lib/api";
import { getErrorMessage } from "../lib/error-message";

import "./Login.css";
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
    <main className="login-page">
      <section className="form-card">
        <h1 className="form-title">{t("auth.login.title")}</h1>

        <p className="form-subtitle">{t("auth.login.subtitle")}</p>

        <form className="form" onSubmit={(event) => void handleSubmit(event)}>
          {errorMessage && (
            <p className="form-message form-message-error" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="identifier">{t("auth.login.identifier")}</label>

            <input
              id="identifier"
              name="identifier"
              value={identifier}
              maxLength={320}
              autoComplete="username"
              required
              onChange={(event) => setIdentifier(event.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("auth.login.password")}</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={password}
                maxLength={128}
                autoComplete="current-password"
                required
                onChange={(event) => setPassword(event.target.value)}
              />

              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={
                  showPassword
                    ? t("auth.common.hidePassword")
                    : t("auth.common.showPassword")
                }
              >
                {showPassword ? <LuEye /> : <LuEyeClosed />}
              </button>
            </div>
          </div>

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? t("auth.login.submitting") : t("auth.login.submit")}
          </button>
        </form>

        <p className="form-footer">
          <Link to="/forgot-password">{t("auth.login.forgotPassword")}</Link>
        </p>

        <p className="form-footer">
          {t("auth.login.noAccount")}{" "}
          <Link to="/register">{t("auth.login.register")}</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
