import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { ArrowUp, BookOpen, Heart } from "lucide-react";

import useAuth from "../hooks/useAuth";

import "./Footer.css";

interface FooterLink {
  label: string;
  to: string;
}

interface FooterColumn {
  links: FooterLink[];
  title: string;
}

const COPY = {
  fa: {
    tagline:
      "جایی برای کشف، نوشتن و به‌اشتراک‌گذاشتن داستان‌هایی که ارزش خواندن دارند.",
    communityNote: "همراه نویسندگان و خوانندگان، فصل‌به‌فصل",
    columns: {
      discover: "کاوش",
      writers: "نویسندگان",
      platform: "پلتفرم",
    },
    links: {
      home: "صفحهٔ اصلی",
      browse: "مرور داستان‌ها",
      library: "کتابخانهٔ من",
      startWriting: "شروع نوشتن",
      profile: "پروفایل من",
      analytics: "آمار داستان‌ها",
      login: "ورود به حساب",
      register: "ساخت حساب",
      notifications: "اعلان‌ها",
      settings: "تنظیمات",
      moderation: "مدیریت گزارش‌ها",
      terms: "قوانین و شرایط استفاده",
    },
    rights: "تمام حقوق محفوظ است.",
    madeFor: "ساخته‌شده با عشق برای داستان‌گوها",
    backToTop: "بازگشت به بالای صفحه",
    navigationLabel: "پیوندهای پایین صفحه",
  },
  en: {
    tagline: "A place to discover, write, and share stories worth remembering.",
    communityNote: "With readers and writers, one chapter at a time",
    columns: {
      discover: "Discover",
      writers: "Writers",
      platform: "Platform",
    },
    links: {
      home: "Home",
      browse: "Browse stories",
      library: "My library",
      startWriting: "Start writing",
      profile: "My profile",
      analytics: "Story analytics",
      login: "Log in",
      register: "Create account",
      notifications: "Notifications",
      settings: "Settings",
      moderation: "Report moderation",
      terms: "Terms of service",
    },
    rights: "All rights reserved.",
    madeFor: "Made with love for storytellers",
    backToTop: "Back to the top",
    navigationLabel: "Footer navigation",
  },
} as const;

function Footer() {
  const { i18n, t } = useTranslation();
  const { status, user } = useAuth();

  const language = i18n.resolvedLanguage?.startsWith("en") ? "en" : "fa";

  const direction = language === "fa" ? "rtl" : "ltr";
  const copy = COPY[language];
  const currentYear = new Date().getFullYear();

  const isAuthenticated = status === "authenticated" && Boolean(user);

  const canModerate =
    isAuthenticated && (user?.role === "MODERATOR" || user?.role === "ADMIN");

  const columns: FooterColumn[] = [
    {
      title: copy.columns.discover,
      links: [
        {
          label: copy.links.home,
          to: "/",
        },
        {
          label: copy.links.browse,
          to: "/browse",
        },
        {
          label: copy.links.library,
          to: "/library",
        },
      ],
    },
    {
      title: copy.columns.writers,
      links: [
        {
          label: copy.links.startWriting,
          to: "/write",
        },
        ...(isAuthenticated && user
          ? [
              {
                label: copy.links.profile,
                to: `/users/${encodeURIComponent(user.username)}`,
              },
              {
                label: copy.links.analytics,
                to: "/analytics",
              },
            ]
          : [
              {
                label: copy.links.login,
                to: "/login",
              },
              {
                label: copy.links.register,
                to: "/register",
              },
            ]),
      ],
    },
    {
      title: copy.columns.platform,
      links: [
        ...(isAuthenticated
          ? [
              {
                label: copy.links.notifications,
                to: "/notifications",
              },
              {
                label: copy.links.settings,
                to: "/settings",
              },
            ]
          : []),

        ...(canModerate
          ? [
              {
                label: copy.links.moderation,
                to: "/moderation",
              },
            ]
          : []),

        {
          label: copy.links.terms,
          to: "/terms",
        },
      ],
    },
  ];

  function scrollToTop(): void {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  return (
    <footer className="site-footer" dir={direction} lang={language}>
      <div className="site-footer__glow" aria-hidden="true" />

      <div className="site-footer__inner">
        <div className="site-footer__main">
          <section
            className="site-footer__brand"
            aria-label={t("PlatformHeader.brand")}
          >
            <Link className="site-footer__brand-link" to="/">
              <span className="site-footer__brand-icon" aria-hidden="true">
                <BookOpen />
              </span>

              <span>{t("PlatformHeader.brand")}</span>
            </Link>

            <p>{copy.tagline}</p>

            <span className="site-footer__community-note">
              <Heart aria-hidden="true" />
              {copy.communityNote}
            </span>
          </section>

          <nav
            className="site-footer__navigation"
            aria-label={copy.navigationLabel}
          >
            {columns.map((column) => (
              <section className="site-footer__column" key={column.title}>
                <h2>{column.title}</h2>

                <ul>
                  {column.links.map((link) => (
                    <li key={`${column.title}-${link.to}`}>
                      <Link to={link.to}>{link.label}</Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </nav>
        </div>

        <div className="site-footer__divider" aria-hidden="true" />

        <div className="site-footer__bottom">
          <p>
            © {currentYear} {t("PlatformHeader.brand")}. {copy.rights}
          </p>

          <p className="site-footer__made-for">
            {copy.madeFor}
            <Heart aria-hidden="true" />
          </p>

          <button
            type="button"
            aria-label={copy.backToTop}
            onClick={scrollToTop}
          >
            <ArrowUp aria-hidden="true" />
            <span>{copy.backToTop}</span>
          </button>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
