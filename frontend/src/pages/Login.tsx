import { useState, type FormEvent } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";

import Button from "../components/Button";
import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";

import "./Login.css";
import "../styles/Form.css";

interface LoginLocationState {
  from?: {
    pathname?: string;
  };
}

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, status } = useAuth();

  const [identifier, setIdentifier] = useState("");

  const [password, setPassword] = useState("");

  const [rememberMe, setRememberMe] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (status === "authenticated") {
    return <Navigate to="/profile" replace />;
  }

  const locationState = location.state as LoginLocationState | null;

  const redirectPath = locationState?.from?.pathname ?? "/profile";

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> {
    event.preventDefault();

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      await login({
        identifier: identifier.trim().toLowerCase(),

        password,
        rememberMe,
      });

      navigate(redirectPath, {
        replace: true,
      });
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

        <p className="form-subtitle">
          خوش آمدید، برای ادامه وارد حساب خود شوید.
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
            <label htmlFor="identifier">ایمیل یا نام کاربری</label>

            <input
              id="identifier"
              name="identifier"
              type="text"
              value={identifier}
              onChange={(event) => {
                setIdentifier(event.target.value);
              }}
              autoComplete="username"
              placeholder="نام کاربری یا ایمیل"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">رمز عبور</label>

            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
              }}
              maxLength={128}
              autoComplete="current-password"
              placeholder="••••••••"
              required
            />
          </div>

          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => {
                setRememberMe(event.target.checked);
              }}
            />

            <span>مرا به خاطر بسپار</span>
          </label>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "در حال ورود..." : "ورود"}
          </Button>
        </form>

        <p className="form-footer">
          حساب کاربری ندارید؟
          <Link to="/register">ثبت‌نام</Link>
        </p>
      </section>
    </main>
  );
}

export default Login;
