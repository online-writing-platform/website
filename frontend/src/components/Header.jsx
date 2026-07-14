import "./Header.css";

function Header() {
  return (
    <header className="header">
      <div className="logo">LOGO</div>

      <nav className="nav">
        <a href="/">خانه</a>
        <a href="/profile">پروفایل</a>
        <a href="/dashboard">داشبورد</a>
        <a href="/search">جستجو</a>
        <a href="/login">ورود / خروج</a>
      </nav>
    </header>
  );
}

export default Header;
