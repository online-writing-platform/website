import { useState, type FormEvent } from "react";
import {
  AtSign,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Smartphone,
  UserRound,
  UserRoundPlus,
} from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Link, Navigate, useNavigate } from "react-router-dom";

import BirthDatePicker from "../components/BirthDatePicker";
import SocialAuthButtons from "../components/SocialAuthButtons";
import AuthPageShell from "../features/auth/components/AuthPageShell";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "../styles/Form.css";
import "./Register.css";

interface RegisterForm {
  username: string;
  email: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
  acceptTerms: boolean;
}

interface VisiblePasswords {
  password: boolean;
  confirmPassword: boolean;
}

const initialForm: RegisterForm = {
  username: "",
  email: "",
  birthDate: "",
  password: "",
  confirmPassword: "",
  acceptTerms: false,
};

const initialVisiblePasswords: VisiblePasswords = {
  password: false,
  confirmPassword: false,
};

function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { register, status } = useAuth();

  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<VisiblePasswords>(
    initialVisiblePasswords,
  );

  if (status === "authenticated") {
    return <Navigate to="/settings" replace />;
  }

  function togglePassword(field: keyof VisiblePasswords): void {
    setVisiblePasswords((current) => ({
      ...current,
      [field]: !current[field],
    }));
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
      const result = await register({
        username: form.username.trim().toLowerCase(),
        email: form.email.trim().toLowerCase(),
        birthDate: form.birthDate,
        password: form.password,
        acceptTerms: true,
      });

      const search = new URLSearchParams({ email: result.email }).toString();

      navigate("/verify-email?" + search, {
        replace: true,
        state: { deliveryStatus: result.deliveryStatus },
      });
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthPageShell
      eyebrow={t("auth.register.eyebrow")}
      footer={
        <>
          <p className="auth-security-note">
            <ShieldCheck aria-hidden="true" size={15} />
            <span>{t("auth.register.securityNote")}</span>
          </p>

          <p className="auth-account-switch">
            {t("auth.register.hasAccount")}
            <Link to="/login">{t("auth.register.login")}</Link>
          </p>
        </>
      }
      icon={<UserRoundPlus size={29} />}
      subtitle={t("auth.register.subtitle")}
      title={t("auth.register.title")}
      titleId="register-title"
      width="wide"
    >
      {errorMessage ? (
        <p className="form-message form-message-error" role="alert">
          {errorMessage}
        </p>
      ) : null}

      <form
        className="form"
        onSubmit={(event) => {
          void handleSubmit(event);
        }}
      >
        <div className="auth-register-grid">
          <div className="form-group">
            <label htmlFor="username">{t("auth.register.username")}</label>

            <div className="auth-field-shell">
              <UserRound
                className="auth-field-shell__icon"
                aria-hidden="true"
                size={18}
              />

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
                  setErrorMessage(null);
                }}
                minLength={3}
                maxLength={20}
                pattern="[A-Za-z0-9_-]+"
                autoComplete="username"
                placeholder={t("auth.register.usernamePlaceholder")}
                aria-describedby="username-help"
                dir="ltr"
                required
                autoFocus
              />
            </div>

            <small id="username-help" className="form-help">
              {t("auth.register.usernameHelp")}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="email">{t("auth.register.email")}</label>

            <div className="auth-field-shell">
              <AtSign
                className="auth-field-shell__icon"
                aria-hidden="true"
                size={18}
              />

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
                  setErrorMessage(null);
                }}
                autoComplete="email"
                placeholder={t("auth.register.emailPlaceholder")}
                dir="ltr"
                required
              />
            </div>
          </div>

          <div className="form-group auth-register-field--full">
            <label htmlFor="birthDate">{t("auth.register.birthDate")}</label>

            <BirthDatePicker
              value={form.birthDate}
              onChange={(birthDate) => {
                setForm((current) => ({
                  ...current,
                  birthDate,
                }));
                setErrorMessage(null);
              }}
              required
            />

            <small className="form-help">
              {t("auth.register.birthDateHelp")}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">{t("auth.register.password")}</label>

            <div className="auth-field-shell auth-field-shell--password">
              <LockKeyhole
                className="auth-field-shell__icon"
                aria-hidden="true"
                size={18}
              />

              <input
                id="password"
                name="password"
                type={visiblePasswords.password ? "text" : "password"}
                value={form.password}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    password: event.target.value,
                  }));
                  setErrorMessage(null);
                }}
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                placeholder={t("auth.register.passwordPlaceholder")}
                aria-describedby="password-help"
                dir="ltr"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => togglePassword("password")}
                aria-label={
                  visiblePasswords.password
                    ? t("auth.common.hidePassword")
                    : t("auth.common.showPassword")
                }
                aria-pressed={visiblePasswords.password}
              >
                {visiblePasswords.password ? (
                  <EyeOff aria-hidden="true" size={18} />
                ) : (
                  <Eye aria-hidden="true" size={18} />
                )}
              </button>
            </div>

            <small id="password-help" className="form-help">
              {t("auth.register.passwordHelp")}
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">
              {t("auth.register.confirmPassword")}
            </label>

            <div className="auth-field-shell auth-field-shell--password">
              <LockKeyhole
                className="auth-field-shell__icon"
                aria-hidden="true"
                size={18}
              />

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={visiblePasswords.confirmPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(event) => {
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value,
                  }));
                  setErrorMessage(null);
                }}
                minLength={10}
                maxLength={128}
                autoComplete="new-password"
                placeholder={t("auth.register.confirmPasswordPlaceholder")}
                dir="ltr"
                required
              />

              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => togglePassword("confirmPassword")}
                aria-label={
                  visiblePasswords.confirmPassword
                    ? t("auth.common.hidePassword")
                    : t("auth.common.showPassword")
                }
                aria-pressed={visiblePasswords.confirmPassword}
              >
                {visiblePasswords.confirmPassword ? (
                  <EyeOff aria-hidden="true" size={18} />
                ) : (
                  <Eye aria-hidden="true" size={18} />
                )}
              </button>
            </div>
          </div>
        </div>

        <label className="form-checkbox auth-register-terms">
          <input
            type="checkbox"
            checked={form.acceptTerms}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                acceptTerms: event.target.checked,
              }));
              setErrorMessage(null);
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

        <button
          className="button button--primary auth-submit"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <LoaderCircle className="auth-spin" aria-hidden="true" size={18} />
          ) : (
            <UserRoundPlus aria-hidden="true" size={18} />
          )}

          <span>
            {isSubmitting
              ? t("auth.register.submitting")
              : t("auth.register.submit")}
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
          <strong>{t("auth.register.phoneAuth")}</strong>
          <small>{t("auth.register.phoneAuthHelp")}</small>
        </span>
      </Link>
    </AuthPageShell>
  );
}

export default Register;
