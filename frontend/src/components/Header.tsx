import { Link, useNavigate } from "react-router-dom";

import Button from "./Button";
import ThemeButton from "./ThemeButton";

import useAuth from "../hooks/useAuth";

import "./Header.css";
import SearchBar from "./SearchBar";

function Header() {
  const navigate = useNavigate();

  const { user, status, logout } = useAuth();

  async function handleLogout(): Promise<void> {
    try {
      await logout();
    } finally {
      navigate("/", {
        replace: true,
      });
    }
  }

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <span>Online Writing Platform</span>
        </Link>
        <SearchBar />

        <nav className="navbar">
          <ul>
            <li>
              <Link to="/">خانه</Link>
            </li>

            <li>
              <Link to="/search">جستجو</Link>
            </li>

            {status === "authenticated" && (
              <>
                <li>
                  <Link to="/dashboard">داشبورد</Link>
                </li>

                <li>
                  <Link to="/profile">پروفایل</Link>
                </li>
              </>
            )}

            <li>
              <Link to="/contact">ارتباط با ما</Link>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <ThemeButton />

          {status === "authenticated" && user ? (
            <>
              <Button to="/profile">{user.displayName}</Button>

              <Button
                variant="secondary"
                onClick={() => {
                  void handleLogout();
                }}
              >
                خروج
              </Button>
            </>
          ) : status === "anonymous" ? (
            <>
              <Button to="/register">ثبت نام</Button>

              <Button to="/login">ورود</Button>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
