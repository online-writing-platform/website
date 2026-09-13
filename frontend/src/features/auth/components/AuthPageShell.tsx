import type { ReactNode } from "react";

import useInterfaceLocale from "../../../hooks/useInterfaceLocale";

import "./AuthPageShell.css";

interface AuthPageShellProps {
  children: ReactNode;
  eyebrow: string;
  footer?: ReactNode;
  icon: ReactNode;
  subtitle: string;
  title: string;
  titleId: string;
  width?: "compact" | "wide";
}

export default function AuthPageShell({
  children,
  eyebrow,
  footer,
  icon,
  subtitle,
  title,
  titleId,
  width = "compact",
}: AuthPageShellProps) {
  const { direction, language } = useInterfaceLocale();

  return (
    <main className="auth-page" dir={direction} lang={language}>
      <div
        className="auth-page__decoration auth-page__decoration--primary"
        aria-hidden="true"
      />
      <div
        className="auth-page__decoration auth-page__decoration--accent"
        aria-hidden="true"
      />

      <section
        className={`form-card auth-card auth-card--${width}`}
        aria-labelledby={titleId}
      >
        <header className="auth-card__header">
          <span className="auth-card__icon" aria-hidden="true">
            {icon}
          </span>

          <p className="auth-card__eyebrow">{eyebrow}</p>

          <h1 id={titleId} className="form-title">
            {title}
          </h1>

          <p className="form-subtitle">{subtitle}</p>
        </header>

        <div className="auth-card__content">{children}</div>

        {footer ? <footer className="auth-card__footer">{footer}</footer> : null}
      </section>
    </main>
  );
}
