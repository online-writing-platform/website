import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface GregorianDatePickerProps {
  onSelect: (value: string) => void;
  value: string;
}

interface DateParts {
  day: number;
  month: number;
  year: number;
}

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/u;
const NUMBER_OF_MONTHS = 12;
const MAXIMUM_AGE_RANGE = 120;

const monthFormatter = new Intl.DateTimeFormat("en-US", {
  month: "long",
  timeZone: "UTC",
});

const fullDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});

const monthLabels = Array.from({ length: NUMBER_OF_MONTHS }, (_, month) =>
  monthFormatter.format(new Date(Date.UTC(2024, month, 1))),
);

const weekdayLabels = Array.from({ length: 7 }, (_, weekday) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(2024, 0, 7 + weekday))),
);

function parseIsoDate(value: string): DateParts | null {
  const match = ISO_DATE_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { day, month, year };
}

function toIsoDate({ day, month, year }: DateParts): string {
  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

function isSameDate(left: DateParts | null, right: DateParts): boolean {
  return (
    left?.year === right.year &&
    left.month === right.month &&
    left.day === right.day
  );
}

function getToday(): DateParts {
  const today = new Date();

  return {
    day: today.getDate(),
    month: today.getMonth() + 1,
    year: today.getFullYear(),
  };
}

function isAfterToday(date: DateParts, today: DateParts): boolean {
  return toIsoDate(date) > toIsoDate(today);
}

export default function GregorianDatePicker({
  onSelect,
  value,
}: GregorianDatePickerProps) {
  const { t } = useTranslation();
  const selectedDate = useMemo(() => parseIsoDate(value), [value]);
  const today = useMemo(() => getToday(), []);
  const minimumYear = today.year - MAXIMUM_AGE_RANGE;

  const [visibleMonth, setVisibleMonth] = useState(() => {
    const initialYear = selectedDate?.year ?? today.year - 18;
    const initialMonth = selectedDate?.month ?? today.month;

    return new Date(initialYear, initialMonth - 1, 1);
  });

  const visibleYear = visibleMonth.getFullYear();
  const visibleMonthIndex = visibleMonth.getMonth();
  const firstWeekday = new Date(visibleYear, visibleMonthIndex, 1).getDay();
  const daysInMonth = new Date(
    visibleYear,
    visibleMonthIndex + 1,
    0,
  ).getDate();
  const cellCount = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
  const yearOptions = Array.from(
    { length: MAXIMUM_AGE_RANGE + 1 },
    (_, index) => today.year - index,
  );

  const canGoToPreviousMonth =
    visibleYear > minimumYear ||
    (visibleYear === minimumYear && visibleMonthIndex > 0);
  const canGoToNextMonth =
    visibleYear < today.year ||
    (visibleYear === today.year && visibleMonthIndex < today.month - 1);

  function changeMonth(offset: number): void {
    setVisibleMonth(new Date(visibleYear, visibleMonthIndex + offset, 1));
  }

  function changeYear(year: number): void {
    const month =
      year === today.year
        ? Math.min(visibleMonthIndex, today.month - 1)
        : visibleMonthIndex;

    setVisibleMonth(new Date(year, month, 1));
  }

  function selectDay(day: number): void {
    onSelect(
      toIsoDate({
        day,
        month: visibleMonthIndex + 1,
        year: visibleYear,
      }),
    );
  }

  return (
    <div
      className="gregorian-calendar"
      role="group"
      aria-label={t("auth.register.calendar.label")}
      dir="ltr"
      lang="en"
    >
      <div className="gregorian-calendar__header">
        <button
          type="button"
          className="gregorian-calendar__nav"
          aria-label={t("auth.register.calendar.previousMonth")}
          disabled={!canGoToPreviousMonth}
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft aria-hidden="true" size={17} />
        </button>

        <div className="gregorian-calendar__selectors">
          <select
            aria-label={t("auth.register.calendar.month")}
            value={visibleMonthIndex}
            onChange={(event) => {
              setVisibleMonth(
                new Date(visibleYear, Number(event.target.value), 1),
              );
            }}
          >
            {monthLabels.map((month, index) => (
              <option
                key={month}
                value={index}
                disabled={
                  visibleYear === today.year && index > today.month - 1
                }
              >
                {month}
              </option>
            ))}
          </select>

          <select
            aria-label={t("auth.register.calendar.year")}
            value={visibleYear}
            onChange={(event) => changeYear(Number(event.target.value))}
          >
            {yearOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="gregorian-calendar__nav"
          aria-label={t("auth.register.calendar.nextMonth")}
          disabled={!canGoToNextMonth}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight aria-hidden="true" size={17} />
        </button>
      </div>

      <div className="gregorian-calendar__weekdays" aria-hidden="true">
        {weekdayLabels.map((weekday) => (
          <span key={weekday}>{weekday}</span>
        ))}
      </div>

      <div className="gregorian-calendar__days">
        {Array.from({ length: cellCount }, (_, index) => {
          const day = index - firstWeekday + 1;

          if (day < 1 || day > daysInMonth) {
            return (
              <span
                key={"empty-" + String(index)}
                className="gregorian-calendar__empty"
                aria-hidden="true"
              />
            );
          }

          const date = {
            day,
            month: visibleMonthIndex + 1,
            year: visibleYear,
          };
          const isSelected = isSameDate(selectedDate, date);
          const isToday = isSameDate(today, date);

          return (
            <button
              key={day}
              type="button"
              className="gregorian-calendar__day"
              data-selected={isSelected || undefined}
              data-today={isToday || undefined}
              aria-label={fullDateFormatter.format(
                new Date(Date.UTC(visibleYear, visibleMonthIndex, day)),
              )}
              aria-pressed={isSelected}
              disabled={isAfterToday(date, today)}
              onClick={() => selectDay(day)}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}
