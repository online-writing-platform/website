import { Component, type ReactNode } from "react";
import { CircleAlert, House, RefreshCcw } from "lucide-react";
import { useTranslation } from "react-i18next";

import useInterfaceLocale from "../hooks/useInterfaceLocale";

import "./AppErrorBoundary.css";

interface BoundaryCopy {
  description: string;
  eyebrow: string;
  home: string;
  reload: string;
  title: string;
}

interface BoundaryProps {
  children: ReactNode;
  copy: BoundaryCopy;
  direction: "ltr" | "rtl";
  language: "en" | "fa";
}

interface BoundaryState {
  hasError: boolean;
}

class AppErrorBoundaryInner extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): BoundaryState {
    return {
      hasError: true,
    };
  }

  render() {
    const { children, copy, direction, language } = this.props;

    if (!this.state.hasError) {
      return children;
    }

    return (
      <main
        className="app-error-boundary"
        dir={direction}
        lang={language}
      >
        <section className="app-error-boundary__card" role="alert">
          <span className="app-error-boundary__icon" aria-hidden="true">
            <CircleAlert size={34} />
          </span>

          <p className="eyebrow">{copy.eyebrow}</p>
          <h1>{copy.title}</h1>
          <p className="app-error-boundary__description">{copy.description}</p>

          <div className="app-error-boundary__actions">
            <button
              className="primary-action"
              type="button"
              onClick={() => window.location.reload()}
            >
              <RefreshCcw aria-hidden="true" size={17} />
              <span>{copy.reload}</span>
            </button>

            <a className="secondary-action" href="/">
              <House aria-hidden="true" size={17} />
              <span>{copy.home}</span>
            </a>
          </div>
        </section>
      </main>
    );
  }
}

export default function AppErrorBoundary({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const { direction, language } = useInterfaceLocale();

  const copy: BoundaryCopy = {
    description: t("errors.boundary.description"),
    eyebrow: t("errors.boundary.eyebrow"),
    home: t("errors.boundary.home"),
    reload: t("errors.boundary.reload"),
    title: t("errors.boundary.title"),
  };

  return (
    <AppErrorBoundaryInner
      copy={copy}
      direction={direction}
      language={language}
    >
      {children}
    </AppErrorBoundaryInner>
  );
}
