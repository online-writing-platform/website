import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import "../styles/Form.css";

function normalizeOtpInput(value: string): string {
  const persianDigits = "۰۱۲۳۴۵۶۷۸۹";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";

  return [...value]
    .map((character) => {
      const persianIndex = persianDigits.indexOf(character);
      if (persianIndex >= 0) return String(persianIndex);
      const arabicIndex = arabicDigits.indexOf(character);
      if (arabicIndex >= 0) return String(arabicIndex);
      return character;
    })
    .join("")
    .replace(/\D/g, "")
    .slice(0, 6);
}

export default function PhoneAuthPage() {
  const navigate = useNavigate();
  const { status, requestPhoneOtp, verifyPhoneOtp } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authenticated") return <Navigate to="/" replace />;

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await requestPhoneOtp(phoneNumber);
      setCodeRequested(true);
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    setBusy(true);
    setError(null);
    try {
      await requestPhoneOtp(phoneNumber);
      setCode("");
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await verifyPhoneOtp(phoneNumber, code);
      if (result.status === "signup_required") {
        navigate("/complete-signup", { replace: true, state: result });
      } else {
        navigate("/", { replace: true });
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="login-page">
      <section className="form-card">
        <h1 className="form-title">ورود یا ثبت‌نام با شماره موبایل</h1>
        <p className="form-subtitle">شماره موبایل ایران را به شکل 09123456789 وارد کنید.</p>
        {error ? <p className="form-message form-message-error">{error}</p> : null}

        {!codeRequested ? (
          <form className="form" onSubmit={(event) => void requestCode(event)}>
            <div className="form-group">
              <label htmlFor="phone-number">شماره موبایل</label>
              <input
                id="phone-number"
                inputMode="numeric"
                autoComplete="tel-national"
                dir="ltr"
                placeholder="09123456789"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                required
              />
            </div>
            <button className="button" type="submit" disabled={busy}>
              {busy ? "در حال ارسال…" : "ارسال کد"}
            </button>
          </form>
        ) : (
          <form className="form" onSubmit={(event) => void verifyCode(event)}>
            <div className="form-group">
              <label htmlFor="phone-code">کد ۶ رقمی</label>
              <input
                id="phone-code"
                inputMode="numeric"
                autoComplete="one-time-code"
                dir="ltr"
                maxLength={6}
                value={code}
                onChange={(event) => setCode(normalizeOtpInput(event.target.value))}
                required
              />
            </div>
            <button className="button" type="submit" disabled={busy || code.length !== 6}>
              {busy ? "در حال بررسی…" : "تأیید و ادامه"}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => void resendCode()}
            >
              ارسال مجدد کد
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={busy}
              onClick={() => {
                setCodeRequested(false);
                setCode("");
              }}
            >
              تغییر شماره
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
