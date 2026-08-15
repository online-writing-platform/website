import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  PenTool,
  Search,
  Globe,
  Menu,
  X,
  Compass,
  Library,
  User,
  Bell,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";

import useAuth from "../hooks/useAuth";
import ThemeButton from "./ThemeButton";
import "./PlatformHeader.css";

function PlatformHeader() {
  const { status, user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleLogout = () => {
    void logout();
    setMobileMenuOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="platform-header">
      <div className="platform-header-inner">
        {/* Brand */}
        <Link
          to="/"
          className="platform-brand"
          aria-label="صفحه اصلی"
          onClick={closeMobileMenu}
        >
          <BookOpen className="platform-brand-icon" />
          <span>داستان</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="platform-nav" aria-label="ناوبری اصلی">
          <NavLink to="/discover" className="platform-nav-link">
            <Compass className="platform-nav-icon" />
            <span>کشف</span>
          </NavLink>

          <NavLink to="/search" className="platform-nav-link">
            <Library className="platform-nav-icon" />
            <span>جستجو</span>
          </NavLink>

          {status === "authenticated" && (
            <>
              <NavLink to="/library" className="platform-nav-link">
                <Library className="platform-nav-icon" />
                <span>کتابخانه</span>
              </NavLink>

              <NavLink to="/write" className="platform-nav-link">
                <PenTool className="platform-nav-icon" />
                <span>نوشتن</span>
              </NavLink>

              <NavLink to="/notifications" className="platform-nav-link">
                <Bell className="platform-nav-icon" />
                <span>اعلان‌ها</span>
              </NavLink>

              <NavLink to="/analytics" className="platform-nav-link">
                <BarChart3 className="platform-nav-icon" />
                <span>آمار</span>
              </NavLink>

              {user && (user.role === "MODERATOR" || user.role === "ADMIN") && (
                <NavLink to="/moderation" className="platform-nav-link">
                  <Settings className="platform-nav-icon" />
                  <span>مدیریت</span>
                </NavLink>
              )}
            </>
          )}
        </nav>

        {/* Search */}
        <div className="platform-search">
          <Search className="platform-search-icon" />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="جستجوی داستان..."
            aria-label="جستجوی داستان"
            dir="rtl"
          />
        </div>

        {/* Account */}
        <div className="platform-account">
          <ThemeButton />

          <button
            type="button"
            className="platform-language-button"
            aria-label="تغییر زبان"
          >
            <Globe className="platform-account-icon" />
            <span>FA</span>
          </button>

          {status === "authenticated" && user ? (
            <>
              <Link
                to={`/users/${encodeURIComponent(user.username)}`}
                className="platform-user"
              >
                <User className="platform-account-icon" />
                <span>{user.displayName}</span>
              </Link>

              <Link to="/settings" className="platform-settings">
                تنظیمات
              </Link>

              <button
                type="button"
                className="platform-logout"
                onClick={handleLogout}
              >
                <LogOut className="platform-account-icon" />
                <span>خروج</span>
              </button>
            </>
          ) : status === "anonymous" ? (
            <>
              <Link to="/login" className="platform-login">
                ورود
              </Link>

              <Link to="/register" className="platform-register">
                ثبت‌نام
              </Link>
            </>
          ) : (
            <span className="muted">...</span>
          )}

          {/* Mobile menu button */}
          <button
            type="button"
            className="platform-mobile-button"
            onClick={() => setMobileMenuOpen((current) => !current)}
            aria-label={mobileMenuOpen ? "بستن منو" : "باز کردن منو"}
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="platform-mobile-menu">
          {/* Mobile Search */}
          <div className="platform-mobile-search">
            <Search className="platform-search-icon" />

            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="جستجوی داستان..."
              aria-label="جستجوی داستان"
              dir="rtl"
            />
          </div>

          <nav className="platform-mobile-nav" aria-label="ناوبری موبایل">
            <NavLink to="/discover" onClick={closeMobileMenu}>
              <Compass />
              <span>کشف</span>
            </NavLink>

            <NavLink to="/search" onClick={closeMobileMenu}>
              <Search />
              <span>جستجو</span>
            </NavLink>

            {status === "authenticated" && (
              <>
                <NavLink to="/library" onClick={closeMobileMenu}>
                  <Library />
                  <span>کتابخانه</span>
                </NavLink>

                <NavLink to="/write" onClick={closeMobileMenu}>
                  <PenTool />
                  <span>نوشتن</span>
                </NavLink>

                <NavLink to="/notifications" onClick={closeMobileMenu}>
                  <Bell />
                  <span>اعلان‌ها</span>
                </NavLink>

                <NavLink to="/analytics" onClick={closeMobileMenu}>
                  <BarChart3 />
                  <span>آمار</span>
                </NavLink>

                {user &&
                  (user.role === "MODERATOR" || user.role === "ADMIN") && (
                    <NavLink to="/moderation" onClick={closeMobileMenu}>
                      <Settings />
                      <span>مدیریت</span>
                    </NavLink>
                  )}
              </>
            )}
          </nav>

          <div className="platform-mobile-account">
            {status === "authenticated" && user ? (
              <>
                <Link
                  to={`/users/${encodeURIComponent(user.username)}`}
                  onClick={closeMobileMenu}
                >
                  <User />
                  <span>پروفایل</span>
                </Link>

                <Link to="/settings" onClick={closeMobileMenu}>
                  <Settings />
                  <span>تنظیمات</span>
                </Link>

                <button type="button" onClick={handleLogout}>
                  <LogOut />
                  <span>خروج</span>
                </button>
              </>
            ) : status === "anonymous" ? (
              <>
                <Link to="/login" onClick={closeMobileMenu}>
                  ورود
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="platform-register"
                >
                  ثبت‌نام
                </Link>
              </>
            ) : null}
          </div>
        </div>
      )}
    </header>
  );
}

export default PlatformHeader;
