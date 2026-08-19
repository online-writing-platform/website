import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BookOpen,
  PenTool,
  Search,
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
import LanguageSwitcher from "./LanguageSwitcher";
import ThemeButton from "./ThemeButton";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "./ui/navigation-menu";
import "./PlatformHeader.css";

function PlatformHeader() {
  const { t } = useTranslation();
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
          aria-label={t("PlatformHeader.home")}
          onClick={closeMobileMenu}
        >
          <BookOpen className="platform-brand-icon" />
          <span>{t("PlatformHeader.brand")}</span>
        </Link>

        {/* Desktop Navigation */}
        <nav
          className="platform-nav"
          aria-label={t("PlatformHeader.mainNavigation")}
        >
          <NavLink to="/discover" className="platform-nav-link">
            <Compass className="platform-nav-icon" />
            <span>{t("PlatformHeader.discover")}</span>
          </NavLink>

          <NavLink to="/search" className="platform-nav-link">
            <Library className="platform-nav-icon" />
            <span>{t("PlatformHeader.search")}</span>
          </NavLink>

          {status === "authenticated" &&
            user &&
            (user.role === "MODERATOR" || user.role === "ADMIN") && (
              <NavLink to="/moderation" className="platform-nav-link">
                <Settings className="platform-nav-icon" />
                <span>{t("PlatformHeader.moderation")}</span>
              </NavLink>
            )}
        </nav>

        {/* Search */}
        <div className="platform-search">
          <Search className="platform-search-icon" />

          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder={t("PlatformHeader.searchPlaceholder")}
            aria-label={t("PlatformHeader.searchAriaLabel")}
          />
        </div>

        {/* Account */}
        <div className="platform-account">
          <ThemeButton />

          <LanguageSwitcher />

          {status === "authenticated" && user ? (
            <NavigationMenu
              className="platform-profile"
              align="end"
              aria-label={t("PlatformHeader.accountMenu")}
            >
              <NavigationMenuList>
                <NavigationMenuItem value="account">
                  <NavigationMenuTrigger className="platform-profile-trigger">
                    <User className="platform-account-icon" />
                    <span>{user.displayName}</span>
                  </NavigationMenuTrigger>

                  <NavigationMenuContent className="platform-profile-menu">
                    <ul className="platform-profile-menu-list">
                      <li>
                        <NavigationMenuLink
                          render={
                            <NavLink
                              to={`/users/${encodeURIComponent(user.username)}`}
                            />
                          }
                          closeOnClick
                        >
                          <User />
                          <span>{t("PlatformHeader.profile")}</span>
                        </NavigationMenuLink>
                      </li>

                      <li>
                        <NavigationMenuLink
                          render={<NavLink to="/library" />}
                          closeOnClick
                        >
                          <Library />
                          <span>{t("PlatformHeader.library")}</span>
                        </NavigationMenuLink>
                      </li>

                      <li>
                        <NavigationMenuLink
                          render={<NavLink to="/write" />}
                          closeOnClick
                        >
                          <PenTool />
                          <span>{t("PlatformHeader.write")}</span>
                        </NavigationMenuLink>
                      </li>

                      <li>
                        <NavigationMenuLink
                          render={<NavLink to="/notifications" />}
                          closeOnClick
                        >
                          <Bell />
                          <span>{t("PlatformHeader.notifications")}</span>
                        </NavigationMenuLink>
                      </li>

                      <li>
                        <NavigationMenuLink
                          render={<NavLink to="/analytics" />}
                          closeOnClick
                        >
                          <BarChart3 />
                          <span>{t("PlatformHeader.analytics")}</span>
                        </NavigationMenuLink>
                      </li>

                      <li
                        className="platform-profile-menu-divider"
                        role="separator"
                      />

                      <li>
                        <NavigationMenuLink
                          render={<NavLink to="/settings" />}
                          closeOnClick
                        >
                          <Settings />
                          <span>{t("PlatformHeader.settings")}</span>
                        </NavigationMenuLink>
                      </li>

                      <li>
                        <NavigationMenuLink
                          render={
                            <button type="button" onClick={handleLogout} />
                          }
                          className="platform-profile-logout"
                          closeOnClick
                        >
                          <LogOut />
                          <span>{t("PlatformHeader.logout")}</span>
                        </NavigationMenuLink>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          ) : status === "anonymous" ? (
            <>
              <Link to="/login" className="platform-login">
                {t("PlatformHeader.login")}
              </Link>

              <Link to="/register" className="platform-register">
                {t("PlatformHeader.register")}
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
            aria-label={
              mobileMenuOpen
                ? t("PlatformHeader.closeMenu")
                : t("PlatformHeader.openMenu")
            }
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
              placeholder={t("PlatformHeader.searchPlaceholder")}
              aria-label={t("PlatformHeader.searchAriaLabel")}
            />
          </div>

          <nav
            className="platform-mobile-nav"
            aria-label={t("PlatformHeader.mobileNavigation")}
          >
            <NavLink to="/discover" onClick={closeMobileMenu}>
              <Compass />
              <span>{t("PlatformHeader.discover")}</span>
            </NavLink>

            <NavLink to="/search" onClick={closeMobileMenu}>
              <Search />
              <span>{t("PlatformHeader.search")}</span>
            </NavLink>

            {status === "authenticated" && (
              <>
                <NavLink to="/library" onClick={closeMobileMenu}>
                  <Library />
                  <span>{t("PlatformHeader.library")}</span>
                </NavLink>

                <NavLink to="/write" onClick={closeMobileMenu}>
                  <PenTool />
                  <span>{t("PlatformHeader.write")}</span>
                </NavLink>

                <NavLink to="/notifications" onClick={closeMobileMenu}>
                  <Bell />
                  <span>{t("PlatformHeader.notifications")}</span>
                </NavLink>

                <NavLink to="/analytics" onClick={closeMobileMenu}>
                  <BarChart3 />
                  <span>{t("PlatformHeader.analytics")}</span>
                </NavLink>

                {user &&
                  (user.role === "MODERATOR" || user.role === "ADMIN") && (
                    <NavLink to="/moderation" onClick={closeMobileMenu}>
                      <Settings />
                      <span>{t("PlatformHeader.moderation")}</span>
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
                  <span>{t("PlatformHeader.profile")}</span>
                </Link>

                <Link to="/settings" onClick={closeMobileMenu}>
                  <Settings />
                  <span>{t("PlatformHeader.settings")}</span>
                </Link>

                <button type="button" onClick={handleLogout}>
                  <LogOut />
                  <span>{t("PlatformHeader.logout")}</span>
                </button>
              </>
            ) : status === "anonymous" ? (
              <>
                <Link to="/login" onClick={closeMobileMenu}>
                  {t("PlatformHeader.login")}
                </Link>

                <Link
                  to="/register"
                  onClick={closeMobileMenu}
                  className="platform-register"
                >
                  {t("PlatformHeader.register")}
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
