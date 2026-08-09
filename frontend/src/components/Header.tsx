import { Link, useNavigate } from "react-router-dom";
import LOGO from "../assets/LOGO.webp";
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
          <img src={LOGO} alt="LOGO" />
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
              <Link className="nav-link" to="/profile">
                {user.displayName}
              </Link>

              <button className="nav-link" onClick={() => void handleLogout()}>
                خروج
              </button>
            </>
          ) : status === "anonymous" ? (
            <>
              <Link className="nav-link" to="/register">
                ثبت نام
              </Link>

              <Link className="nav-link" to="/login">
                ورود
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </header>
  );
}

export default Header;
