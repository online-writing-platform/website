import { ImageIcon, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

import "./TodaySpotlight.css";

type TodaySpotlightProps = {
  imageSrc?: string;
  imageAlt?: string;

  personName?: string;
  personMeta?: string;

  date?: Date;
  className?: string;
};

type SupportedLanguage = "fa" | "en";

function resolveLanguage(language?: string): SupportedLanguage {
  return language?.toLowerCase().startsWith("en") ? "en" : "fa";
}

function getDateLocale(language: SupportedLanguage): string {
  return language === "fa" ? "fa-IR-u-ca-persian" : "en-US";
}

export function TodaySpotlight({
  imageSrc,
  imageAlt,
  personName,
  personMeta,
  date = new Date(),
  className,
}: TodaySpotlightProps) {
  const { i18n } = useTranslation();
  const shouldReduceMotion = useReducedMotion();

  const language = resolveLanguage(i18n.resolvedLanguage);
  const locale = getDateLocale(language);

  const day = new Intl.DateTimeFormat(locale, {
    day: "numeric",
  }).format(date);

  const month = new Intl.DateTimeFormat(locale, {
    month: "long",
  }).format(date);

  const weekday = new Intl.DateTimeFormat(locale, {
    weekday: "long",
  }).format(date);

  const year = new Intl.DateTimeFormat(locale, {
    year: "numeric",
  }).format(date);

  const todayLabel = language === "fa" ? "امروز" : "Today";

  const birthdayLabel = language === "fa" ? "زادروز امروز" : "Born on this day";

  const imagePlaceholder =
    language === "fa" ? "جایگاه تصویر امروز" : "Today's image";

  const resolvedImageAlt = imageAlt ?? personName ?? imagePlaceholder;

  const accessibleDate =
    language === "fa"
      ? `${todayLabel}، ${weekday} ${day} ${month} ${year}`
      : `${todayLabel}, ${weekday}, ${month} ${day}, ${year}`;

  const rootClassName = ["today-spotlight", className]
    .filter(Boolean)
    .join(" ");

  return (
    <motion.section
      className={rootClassName}
      aria-label={accessibleDate}
      initial={
        shouldReduceMotion
          ? undefined
          : {
              opacity: 0,
              y: 18,
            }
      }
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.55,
        ease: [0.22, 1, 0.36, 1],
      }}
    >
      <div className="today-spotlight__card">
        <div
          className="today-spotlight__glow today-spotlight__glow--primary"
          aria-hidden="true"
        />

        <div
          className="today-spotlight__glow today-spotlight__glow--accent"
          aria-hidden="true"
        />

        <div className="today-spotlight__layout">
          <div className="today-spotlight__content">
            <div className="today-spotlight__eyebrow">
              <span
                className="today-spotlight__eyebrow-dot"
                aria-hidden="true"
              />

              <span className="today-spotlight__eyebrow-text">
                {todayLabel}
              </span>

              <span
                className="today-spotlight__eyebrow-line"
                aria-hidden="true"
              />
            </div>

            <div className="today-spotlight__date">
              <span className="today-spotlight__day">{day}</span>

              <div className="today-spotlight__month-year">
                <p className="today-spotlight__month">{month}</p>

                <p className="today-spotlight__year">{year}</p>
              </div>
            </div>

            <div className="today-spotlight__weekday">
              <span
                className="today-spotlight__weekday-line"
                aria-hidden="true"
              />

              <p>{weekday}</p>
            </div>

            {personName ? (
              <div className="today-spotlight__person">
                <div className="today-spotlight__birthday-badge">
                  <Sparkles
                    className="today-spotlight__birthday-icon"
                    aria-hidden="true"
                  />

                  <span>{birthdayLabel}</span>
                </div>

                <h2 className="today-spotlight__person-name">{personName}</h2>

                {personMeta ? (
                  <p className="today-spotlight__person-meta">{personMeta}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <motion.div
            className="today-spotlight__visual"
            whileHover={
              shouldReduceMotion
                ? undefined
                : {
                    y: -5,
                    rotate: language === "fa" ? -0.6 : 0.6,
                  }
            }
            transition={{
              duration: 0.25,
            }}
          >
            <div className="today-spotlight__image-shadow" aria-hidden="true" />

            <div className="today-spotlight__image-frame">
              {imageSrc ? (
                <>
                  <img
                    src={imageSrc}
                    alt={resolvedImageAlt}
                    className="today-spotlight__image"
                  />

                  <div
                    className="today-spotlight__image-overlay"
                    aria-hidden="true"
                  />
                </>
              ) : (
                <div className="today-spotlight__image-placeholder">
                  <div className="today-spotlight__placeholder-icon">
                    <ImageIcon aria-hidden="true" />
                  </div>

                  <span>{imagePlaceholder}</span>
                </div>
              )}

              <span className="today-spotlight__image-dot" aria-hidden="true" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
