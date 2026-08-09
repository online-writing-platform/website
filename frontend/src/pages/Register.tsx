import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";

import Button from "../components/Button";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

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
  const navigate = useNavigate();
  const { register, status } = useAuth();
  const [form, setForm] = useState<RegisterForm>(initialForm);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/settings" replace />;
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    if (form.password !== form.confirmPassword) {
      setErrorMessage("رمز عبور و تکرار آن یکسان نیستند.");
      return;
    }

    if (!form.acceptTerms) {
      setErrorMessage("برای ثبت‌نام باید قوانین سایت را بپذیرید.");
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
          ثبت‌نام
        </h1>

        <p className="form-subtitle">
          حساب نویسندگی و مطالعه خود را بسازید.
        </p>

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
            <label htmlFor="username">نام کاربری</label>
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
              pattern="[A-Za-z0-9_]+"
              autoComplete="username"
              dir="ltr"
              required
            />
            <small className="form-help">
              ۳ تا ۲۰ کاراکتر؛ حروف انگلیسی، عدد و underscore.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="email">ایمیل</label>
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
            <label htmlFor="birthDate">تاریخ تولد</label>
            <input
              id="birthDate"
              name="birthDate"
              type="date"
              value={form.birthDate}
              onChange={(event) => {
                setForm((current) => ({
                  ...current,
                  birthDate: event.target.value,
                }));
              }}
              autoComplete="bday"
              required
            />
            <small className="form-help">
              برای اعمال سیاست محتوای بزرگسال در سمت سرور استفاده می‌شود.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="password">رمز عبور</label>
            <input
              id="password"
              name="password"
              type="password"
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
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">تکرار رمز عبور</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
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
              <Link to="/terms">قوانین سایت</Link> را مطالعه کرده‌ام و
              می‌پذیرم.
            </span>
          </label>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ثبت‌نام..." : "ثبت‌نام"}
          </Button>
        </form>

        <p className="form-footer">
          حساب کاربری دارید؟ <Link to="/login">ورود</Link>
        </p>
      </section>
    </main>
  );
}

export default Register;
