import { useState, type FormEvent } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";

import BirthDatePicker from "../components/BirthDatePicker";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { SignupRequiredResult } from "../types/auth";
import "../styles/Form.css";

export default function CompleteSignupPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { status, completeExternalSignup } = useAuth();
  const signup = location.state as SignupRequiredResult | null;
  const [username, setUsername] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") return <Navigate to="/" replace />;
  if (!signup || signup.status !== "signup_required" || !signup.signupToken) {
    return <Navigate to="/register" replace />;
  }

  const signupToken = signup.signupToken;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!acceptTerms || !birthDate) return;
    setBusy(true);
    setError(null);
    try {
      await completeExternalSignup({
        signupToken,
        username: username.trim().toLowerCase(),
        birthDate,
        acceptTerms: true,
      });
      navigate("/", { replace: true });
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="register-page">
      <section className="form-card">
        <h1 className="form-title">تکمیل ثبت‌نام</h1>
        <p className="form-subtitle">
          احراز هویت با {signup.provider} انجام شد. اطلاعات حساب را تکمیل کنید.
        </p>
        {signup.email ? <p className="form-help" dir="ltr">{signup.email}</p> : null}
        {error ? <p className="form-message form-message-error">{error}</p> : null}
        <form className="form" onSubmit={(event) => void submit(event)}>
          <div className="form-group">
            <label htmlFor="external-username">نام کاربری</label>
            <input
              id="external-username"
              value={username}
              minLength={3}
              maxLength={20}
              pattern="[A-Za-z0-9_-]+"
              autoComplete="username"
              dir="ltr"
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="external-birth-date">تاریخ تولد</label>
            <BirthDatePicker value={birthDate} onChange={setBirthDate} required />
          </div>
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={acceptTerms}
              onChange={(event) => setAcceptTerms(event.target.checked)}
            />
            <span>شرایط استفاده را می‌پذیرم.</span>
          </label>
          <button className="button" type="submit" disabled={busy || !acceptTerms}>
            {busy ? "در حال ساخت حساب…" : "ساخت حساب"}
          </button>
        </form>
      </section>
    </main>
  );
}
