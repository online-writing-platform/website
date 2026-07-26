import "./Header.css";
import { Link } from "react-router-dom";
import ThemeButton from "./ThemeButton";

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
          <img src="" alt="Logo" />

          <span>Online Writing Platform</span>
        </Link>

        <nav className="navbar">
          <ul>
            <li>
              <Link to="/">خانه</Link>
            </li>

            <li>
              <Link to="/search">جستجو</Link>
            </li>

            <li>
              <Link to="/dashboard">داشبورد</Link>
            </li>

            <li>
              <Link to="/profile">پروفایل</Link>
            </li>

            <li>
              <Link to="/contact">ارتباط با ما</Link>
            </li>
          </ul>
        </nav>

        <div className="header-actions">
          <ThemeButton />

          <Link className="register-btn" to="/register">
            ورود / ثبت نام
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
