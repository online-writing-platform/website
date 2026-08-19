import { useState, type FormEvent } from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { LuEyeClosed, LuEye } from "react-icons/lu";

import Button from "../components/Button";
import BirthDatePicker from "../components/BirthDatePicker";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "@aliasadollahi/jalali-datepicker/styles.css";
import "./Register.css";
import "../styles/Form.css";

interface RegisterForm {
  username: string;
  email: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

const initialForm: RegisterForm = {
  username: "",
  email: "",
  birthDate: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, status } = useAuth();

  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  if (status === "authenticated") {
    return <Navigate to="/settings" replace />;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (!form.birthDate) {
      setErrorMessage(t("auth.register.validation.birthDateRequired"));
      return;
    }

    if (form.password !== form.confirmPassword) {
      setErrorMessage(t("auth.register.validation.passwordsMismatch"));
      return;
    }

    if (!form.acceptTerms) {
      setErrorMessage(t("auth.register.validation.termsRequired"));
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        birthDate: form.birthDate,
        password: form.password,
        acceptTerms: true,
      });

      navigate("/settings", { replace: true });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="register-page">
      <section className="form-card" aria-labelledby="register-title">
        <h1 id="register-title" className="form-title">
          {t("auth.register.title")}
        </h1>

        <p className="form-subtitle">{t("auth.register.subtitle")}</p>

        <form
          className="form"
          onSubmit={(event) => {
            void handleSubmit(event);
          }}
        >
          {errorMessage && (
            <p className="form-message form-message-error" role="alert">
              {errorMessage}
            </p>
          )}

          <div className="form-group">
            <label htmlFor="username">{t("auth.register.username")}</label>

            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  username: event.target.value,
                }));
              }}
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_-]+"
              autoComplete="username"
              dir="ltr"
              required
            />

            <small className="form-help">
              {t("auth.register.usernameHelp")}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="email">{t("auth.register.email")}</label>

            <input
              id="email"
              name="email"
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  email: event.target.value,
                }));
              }}
              autoComplete="email"
              dir="ltr"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="birthDate">{t("auth.register.birthDate")}</label>

            <BirthDatePicker
              value={form.birthDate}
              onChange={(birthDate) => {
                setForm((current) => ({
                  ...current,
                  birthDate,
                }));
              }}
              required
            />

            <small className="form-help">
              {t("auth.register.birthDateHelp")}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("auth.register.password")}</label>

            <div className="password-input-wrapper">
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }));
                }}
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                required
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

          <div className="form-group">
            <label htmlFor="confirmPassword">
              {t("auth.register.confirmPassword")}
            </label>

            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }));
                }}
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                required
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

          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  acceptTerms: event.target.checked,
                }));
              }}
            />

            <span>
              <Trans
                i18nKey="auth.register.acceptTerms"
                components={{
                  termsLink: <Link to="/terms" />,
                }}
              />
            </span>
          </label>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting
              ? t("auth.register.submitting")
              : t("auth.register.submit")}
          </Button>
        </form>

        <p className="form-footer">
          {t("auth.register.hasAccount")}{" "}
          <Link to="/login">{t("auth.register.login")}</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
