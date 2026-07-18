import "./Header.css";
import { Link } from "react-router-dom";

function Header() {
  return (
    <header className="header">
      <div className="logo">LOGO</div>

      <nav className="nav">
        <Link to="/">خانه</Link>
        <Link to="/profile">پروفایل</Link>
        <Link to="/dashboard">داشبورد</Link>
        <Link to="/search">جستجو</Link>
        <Link to="/Register">ورود / خروج</Link>
      </nav>
    </header>
  );
}

export default Header;
