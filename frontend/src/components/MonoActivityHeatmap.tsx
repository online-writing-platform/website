import { useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import "./MonoActivityHeatmap.css";

export interface PublicationActivityPoint {
  date: string;
  count: number;
}

type ContributionLevel = 0 | 1 | 2 | 3 | 4;

interface Contribution extends PublicationActivityPoint {
  isFuture: boolean;
  level: ContributionLevel;
}

interface MonoActivityHeatmapProps {
  activity: PublicationActivityPoint[];
  accentColor?: "purple";
  language: "fa" | "en";
  weeks?: number;
}

const COPY = {
  fa: {
    locale: "fa-IR",
    eyebrow: "فعالیت انتشار",
    title: "میزان انتشارها در روز",
    description:
      "تعداد داستان‌های عمومی که این نویسنده در هر روز منتشر کرده است.",
    period: (weeks: number) => `${weeks.toLocaleString("fa-IR")} هفتهٔ اخیر`,
    total: (count: number) =>
      `${count.toLocaleString("fa-IR")} داستان منتشرشده`,
    dayWithCount: (count: number, date: string) =>
      `${count.toLocaleString("fa-IR")} انتشار در ${date}`,
    dayWithoutCount: (date: string) => `بدون انتشار در ${date}`,
    hoverPrompt: "برای دیدن جزئیات، نشانگر را روی خانه‌ها ببرید.",
    less: "کمتر",
    more: "بیشتر",
    gridLabel: "نمودار میزان انتشار داستان‌ها در روز",
  },
  en: {
    locale: "en-US",
    eyebrow: "Publishing activity",
    title: "Daily publishing activity",
    description: "Public stories published by this writer on each day.",
    period: (weeks: number) => `${weeks.toLocaleString("en-US")} weeks`,
    total: (count: number) =>
      `${count.toLocaleString("en-US")} published ${
        count === 1 ? "story" : "stories"
      }`,
    dayWithCount: (count: number, date: string) =>
      `${count.toLocaleString("en-US")} ${
        count === 1 ? "publication" : "publications"
      } on ${date}`,
    dayWithoutCount: (date: string) => `No publications on ${date}`,
    hoverPrompt: "Hover or focus a tile to view its publishing activity.",
    less: "Less",
    more: "More",
    gridLabel: "Daily story publication activity chart",
  },
} as const;

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function getUtcDay(date: Date): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()),
  );
}

function getDateKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function createCalendar(
  activity: PublicationActivityPoint[],
  numberOfWeeks: number,
): Contribution[] {
  const today = getUtcDay(new Date());

  const startOfCurrentWeek = new Date(
    today.getTime() - today.getUTCDay() * DAY_IN_MILLISECONDS,
  );

  const calendarStart = new Date(
    startOfCurrentWeek.getTime() -
      (numberOfWeeks - 1) * 7 * DAY_IN_MILLISECONDS,
  );

  const countsByDate = new Map<string, number>();

  for (const point of activity) {
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(point.date) || point.count <= 0) {
      continue;
    }

    countsByDate.set(
      point.date,
      (countsByDate.get(point.date) ?? 0) + point.count,
    );
  }

  return Array.from({ length: numberOfWeeks * 7 }, (_, index) => {
    const date = new Date(
      calendarStart.getTime() + index * DAY_IN_MILLISECONDS,
    );

    const dateKey = getDateKey(date);
    const count = countsByDate.get(dateKey) ?? 0;

    return {
      date: dateKey,
      count,
      isFuture: date.getTime() > today.getTime(),
      level: (count === 0 ? 0 : Math.min(4, count)) as ContributionLevel,
    };
  });
}

function toWeeks(contributions: Contribution[]): Contribution[][] {
  const weeks: Contribution[][] = [];

  for (let index = 0; index < contributions.length; index += 7) {
    weeks.push(contributions.slice(index, index + 7));
  }

  return weeks;
}

export default function MonoActivityHeatmap({
  activity,
  accentColor = "purple",
  language,
  weeks = 20,
}: MonoActivityHeatmapProps) {
  const copy = COPY[language];
  const direction = language === "fa" ? "rtl" : "ltr";
  const reduceMotion = useReducedMotion();

  const safeWeeks = Math.max(4, Math.min(52, Math.round(weeks)));

  const [hoveredDay, setHoveredDay] = useState<Contribution | null>(null);

  const contributions = useMemo(
    () => createCalendar(activity, safeWeeks),
    [activity, safeWeeks],
  );

  const contributionWeeks = useMemo(
    () => toWeeks(contributions),
    [contributions],
  );

  const totalPublications = contributions.reduce(
    (total, contribution) => total + contribution.count,
    0,
  );

  const dateFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(copy.locale, {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      }),
    [copy.locale],
  );

  const monthFormatter = useMemo(
    () =>
      new Intl.DateTimeFormat(copy.locale, {
        month: "short",
        timeZone: "UTC",
      }),
    [copy.locale],
  );

  const monthLabels = useMemo(() => {
    return contributionWeeks.map((week, index) => {
      const firstDay = week[0];

      if (!firstDay) {
        return null;
      }

      const monthKey = firstDay.date.slice(0, 7);

      const previousMonth = contributionWeeks[index - 1]?.[0]?.date.slice(0, 7);

      if (monthKey === previousMonth) {
        return null;
      }

      return monthFormatter.format(new Date(`${firstDay.date}T00:00:00Z`));
    });
  }, [contributionWeeks, monthFormatter]);

  function describeDay(day: Contribution): string {
    const formattedDate = dateFormatter.format(
      new Date(`${day.date}T00:00:00Z`),
    );

    return day.count > 0
      ? copy.dayWithCount(day.count, formattedDate)
      : copy.dayWithoutCount(formattedDate);
  }

  return (
    <section
      className="mono-activity"
      data-accent={accentColor}
      dir={direction}
      lang={language}
      aria-labelledby="profile-publication-activity-title"
    >
      <header className="mono-activity__header">
        <div>
          <div className="mono-activity__eyebrow-row">
            <span>{copy.eyebrow}</span>

            <span className="mono-activity__badge">
              {copy.period(safeWeeks)}
            </span>
          </div>

          <h2 id="profile-publication-activity-title">{copy.title}</h2>

          <p>{copy.description}</p>
        </div>

        <strong>{copy.total(totalPublications)}</strong>
      </header>

      <div className="mono-activity__stage">
        <div className="mono-activity__scroll" dir="ltr">
          <div className="mono-activity__month-row" aria-hidden="true">
            {monthLabels.map((month, index) => (
              <span key={`${month ?? "month"}-${index}`}>
                {month ? <small>{month}</small> : null}
              </span>
            ))}
          </div>

          <div
            className="mono-activity__grid"
            role="grid"
            aria-label={copy.gridLabel}
            onPointerLeave={() => setHoveredDay(null)}
          >
            {contributionWeeks.map((week, weekIndex) => (
              <div
                className="mono-activity__week"
                role="row"
                key={week[0]?.date ?? weekIndex}
              >
                {week.map((day, dayIndex) => (
                  <motion.button
                    className="mono-activity__cell"
                    data-future={day.isFuture || undefined}
                    data-level={day.level}
                    type="button"
                    role="gridcell"
                    tabIndex={day.isFuture ? -1 : 0}
                    aria-label={describeDay(day)}
                    key={day.date}
                    initial={
                      reduceMotion
                        ? false
                        : {
                            opacity: 0,
                            scale: 0.5,
                          }
                    }
                    animate={{
                      opacity: 1,
                      scale: 1,
                    }}
                    transition={{
                      duration: reduceMotion ? 0 : 0.2,
                      delay: reduceMotion
                        ? 0
                        : weekIndex * 0.012 + dayIndex * 0.004,
                    }}
                    whileHover={
                      reduceMotion || day.isFuture
                        ? undefined
                        : {
                            scale: 1.32,
                            zIndex: 2,
                          }
                    }
                    onFocus={() => setHoveredDay(day)}
                    onBlur={() => setHoveredDay(null)}
                    onPointerEnter={() => setHoveredDay(day)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="mono-activity__tooltip" aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={hoveredDay?.date ?? "prompt"}
              initial={
                reduceMotion
                  ? false
                  : {
                      opacity: 0,
                      y: 3,
                    }
              }
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={
                reduceMotion
                  ? undefined
                  : {
                      opacity: 0,
                      y: -3,
                    }
              }
              transition={{
                duration: reduceMotion ? 0 : 0.14,
              }}
            >
              {hoveredDay ? describeDay(hoveredDay) : copy.hoverPrompt}
            </motion.span>
          </AnimatePresence>
        </div>
      </div>

      <footer className="mono-activity__footer">
        <span>{copy.period(safeWeeks)}</span>

        <div className="mono-activity__legend" aria-hidden="true">
          <span>{copy.less}</span>

          {[0, 1, 2, 3, 4].map((level) => (
            <i data-level={level} key={level} />
          ))}

          <span>{copy.more}</span>
        </div>
      </footer>
    </section>
  );
}
