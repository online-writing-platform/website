import { Link, NavLink } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import ThemeButton from "./ThemeButton";

import "./PlatformHeader.css";

function PlatformHeader() {
  const { status, user, logout } = useAuth();

  return (
    <header className="platform-header">
      <div className="platform-header-inner">
        <Link to="/" className="platform-brand" aria-label="صفحه اصلی">
          داستان
        </Link>

        <nav className="platform-nav" aria-label="ناوبری اصلی">
          <NavLink to="/search">جستجو</NavLink>
          {status === "authenticated" ? (
            <>
              <NavLink to="/library">کتابخانه</NavLink>
              <NavLink to="/write">نوشتن</NavLink>
              <NavLink to="/notifications">اعلان‌ها</NavLink>
              <NavLink to="/analytics">آمار</NavLink>
              {user && (user.role === "MODERATOR" || user.role === "ADMIN") ? (
                <NavLink to="/moderation">مدیریت</NavLink>
              ) : null}
            </>
          ) : null}
        </nav>

        <div className="platform-account">
          <ThemeButton />
          {status === "authenticated" && user ? (
            <>
              <Link to={`/users/${encodeURIComponent(user.username)}`}>
                {user.displayName}
              </Link>
              <Link to="/settings">تنظیمات</Link>
              <button
                type="button"
                className="header-text-button"
                onClick={() => {
                  void logout();
                }}
              >
                خروج
              </button>
            </>
          ) : status === "anonymous" ? (
            <>
              <Link to="/login">ورود</Link>
              <Link className="header-register" to="/register">
                ثبت‌نام
              </Link>
            </>
          ) : (
            <span className="muted">...</span>
          )}
        </div>
      </div>
    </header>
  );
}

export default PlatformHeader;
