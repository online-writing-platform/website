import { Link } from "react-router-dom";

import ThemeButton from "./ThemeButton";

import "./Header.css";
import ButtonLink from "./Button";

function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="logo">
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

          <ButtonLink to="/register">ثبت نام</ButtonLink>

          <ButtonLink to="/login">ورود</ButtonLink>
        </div>
      </div>
    </header>
  );
}

export default Header;
