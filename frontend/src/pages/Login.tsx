import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "./Login.css";
import "../styles/Form.css";

interface LoginLocationState {
  from?: { pathname?: string };
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, status } = useAuth();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/" replace />;
  }

  const locationState = location.state as LoginLocationState | null;
  const redirectPath = locationState?.from?.pathname ?? "/";

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
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
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="login-page">
      <section className="form-card">
        <h1 className="form-title">ورود</h1>
        <p className="form-subtitle">برای ادامه وارد حساب خود شوید.</p>

        <form className="form" onSubmit={(event) => void handleSubmit(event)}>
          {errorMessage && (
            <p className="form-message form-message-error" role="alert">{errorMessage}</p>
          )}

          <div className="form-group">
            <label htmlFor="identifier">ایمیل یا نام کاربری</label>
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
            <label htmlFor="password">رمز عبور</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              maxLength={128}
              autoComplete="current-password"
              required
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button className="button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ورود…" : "ورود"}
          </button>
        </form>

        <p className="form-footer">
          <Link to="/forgot-password">رمز عبور را فراموش کرده‌اید؟</Link>
        </p>
        <p className="form-footer">
          حساب ندارید؟ <Link to="/register">ثبت‌نام</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
