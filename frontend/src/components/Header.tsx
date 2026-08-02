import { Link } from "react-router-dom";

import ThemeButton from "./ThemeButton";

import "./Header.css";
import Button from "./Button";

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

          <Button to="/register">ثبت نام</Button>

          <Button to="/login">ورود</Button>
        </div>
      </div>
    </header>
  );
}

export default Header;
