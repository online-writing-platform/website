import { ImageIcon, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";

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
  const imagePlaceholder =
    language === "fa" ? "جایگاه تصویر امروز" : "Today's image";
  const resolvedImageAlt = imageAlt ?? imagePlaceholder;

  const accessibleDate =
    language === "fa"
      ? `${todayLabel}، ${weekday} ${day} ${month} ${year}`
      : `${todayLabel}, ${weekday}, ${month} ${day}, ${year}`;

  return (
    <motion.section
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
      aria-label={accessibleDate}
      className={[
        "mx-auto w-[calc(100%-2rem)] max-w-[78rem] py-12 md:py-16",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="relative isolate overflow-visible rounded-[2rem] border border-[var(--border)] px-6 py-8 shadow-[var(--shadow)] md:px-10 md:py-10 lg:px-14"
        style={{
          background:
            "linear-gradient(135deg, var(--surface) 0%, var(--primary-soft) 62%, var(--accent-soft) 100%)",
        }}
      >
        {/* Decorative background */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -start-20 -top-24 -z-10 h-56 w-56 rounded-full blur-3xl"
          style={{
            backgroundColor: "var(--primary)",
            opacity: 0.09,
          }}
        />

        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-20 end-[28%] -z-10 h-44 w-44 rounded-full blur-3xl"
          style={{
            backgroundColor: "var(--accent)",
            opacity: 0.1,
          }}
        />

        <div className="relative grid items-center gap-10 md:min-h-[280px] md:grid-cols-[minmax(0,1fr)_minmax(260px,0.78fr)] md:gap-12">
          {/* Date */}
          <div className="relative z-10 max-w-xl">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="h-2.5 w-2.5 rounded-full"
                style={{
                  backgroundColor: "var(--accent)",
                }}
              />

              <span
                className="text-xs font-semibold uppercase tracking-[0.24em]"
                style={{
                  color: "var(--primary)",
                }}
              >
                {todayLabel}
              </span>

              <span
                aria-hidden="true"
                className="h-px flex-1 opacity-70"
                style={{
                  backgroundColor: "var(--border)",
                }}
              />
            </div>

            <div className="mt-8 flex items-end gap-5 md:mt-10">
              <span
                className="block font-semibold leading-[0.72] tracking-[-0.075em]"
                style={{
                  color: "var(--foreground)",
                  fontSize: "clamp(5.2rem, 12vw, 9rem)",
                }}
              >
                {day}
              </span>

              <div className="pb-1 md:pb-2">
                <p
                  className="m-0 text-2xl font-semibold leading-tight md:text-3xl"
                  style={{
                    color: "var(--foreground)",
                  }}
                >
                  {month}
                </p>

                <p
                  className="m-0 mt-1 text-sm font-medium md:text-base"
                  style={{
                    color: "var(--text-secondary)",
                  }}
                >
                  {year}
                </p>
              </div>
            </div>

            <div className="mt-8 flex items-center gap-4">
              <span
                aria-hidden="true"
                className="h-px w-12"
                style={{
                  backgroundColor: "var(--primary)",
                }}
              />

              <p
                className="m-0 text-lg font-medium md:text-xl"
                style={{
                  color: "var(--text-secondary)",
                }}
              >
                {weekday}
                {personName ? (
                  <div className="mt-8">
                    <div
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold"
                      style={{
                        backgroundColor: "var(--accent-soft)",
                        color: "var(--accent)",
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5" />

                      <span>
                        {language === "fa"
                          ? "زادروز امروز"
                          : "Born on this day"}
                      </span>
                    </div>

                    <h2
                      className="m-0 mt-3 text-2xl font-bold md:text-3xl"
                      style={{
                        color: "var(--foreground)",
                      }}
                    >
                      {personName}
                    </h2>

                    {personMeta ? (
                      <p
                        className="m-0 mt-1 text-sm"
                        style={{
                          color: "var(--text-secondary)",
                        }}
                      >
                        {personMeta}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </p>
            </div>
          </div>

          {/* Image */}
          <motion.div
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
            className="relative z-20 mx-auto w-full max-w-[350px] md:-mb-10 md:-mt-20 md:justify-self-end"
          >
            <div
              aria-hidden="true"
              className="absolute inset-3 -z-10 rounded-[2.4rem] blur-2xl"
              style={{
                backgroundColor: "var(--primary)",
                opacity: 0.16,
              }}
            />

            <div
              className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border-[8px] bg-[var(--surface-hover)]"
              style={{
                borderColor: "var(--surface)",
                boxShadow: "0 24px 65px rgb(24 24 27 / 20%)",
              }}
            >
              {imageSrc ? (
                <>
                  <img
                    src={imageSrc}
                    alt={resolvedImageAlt}
                    className="h-full w-full object-cover"
                  />

                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(to top, rgb(0 0 0 / 18%) 0%, transparent 38%)",
                    }}
                  />
                </>
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
                  <div
                    className="flex h-16 w-16 items-center justify-center rounded-2xl"
                    style={{
                      backgroundColor: "var(--primary-soft)",
                      color: "var(--primary)",
                    }}
                  >
                    <ImageIcon className="h-7 w-7" aria-hidden="true" />
                  </div>

                  <span
                    className="text-sm font-medium"
                    style={{
                      color: "var(--text-secondary)",
                    }}
                  >
                    {imagePlaceholder}
                  </span>
                </div>
              )}

              <div
                aria-hidden="true"
                className="absolute end-4 top-4 h-3 w-3 rounded-full border-2"
                style={{
                  backgroundColor: "var(--accent)",
                  borderColor: "var(--surface)",
                }}
              />
            </div>

            <div
              aria-hidden="true"
              className="absolute -bottom-4 -start-4 flex h-14 w-14 items-center justify-center rounded-2xl border shadow-lg"
              style={{
                backgroundColor: "var(--surface)",
                borderColor: "var(--border)",
                color: "var(--accent)",
              }}
            >
              <Sparkles className="h-6 w-6" />
            </div>
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
