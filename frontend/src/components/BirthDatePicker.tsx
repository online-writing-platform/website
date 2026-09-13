import { useMemo, useState } from "react";
import {
  fromGregorian,
  JalaliDatePicker,
  toGregorian,
  type JalaliDate,
} from "@aliasadollahi/jalali-datepicker";
import { useTranslation } from "react-i18next";
import { HiOutlineCalendarDays } from "react-icons/hi2";

import useInterfaceLocale from "../hooks/useInterfaceLocale";
import GregorianDatePicker from "./GregorianDatePicker";

import "@aliasadollahi/jalali-datepicker/styles.css";
import "./BirthDatePicker.css";

interface BirthDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

const englishDateFormatter = new Intl.DateTimeFormat("en-US", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "UTC",
  year: "numeric",
});

function formatEnglishDate(value: string): string {
  const [year, month, day] = value.split("-").map(Number);

  if (!year || !month || !day) {
    return "";
  }

  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return "";
  }

  return englishDateFormatter.format(candidate);
}

function BirthDatePicker({
  value,
  onChange,
  required = false,
}: BirthDatePickerProps) {
  const { t } = useTranslation();
  const { direction, language } = useInterfaceLocale();
  const [isOpen, setIsOpen] = useState(false);

  const selectedJalaliDate = useMemo<JalaliDate | null>(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    try {
      return fromGregorian(value);
    } catch {
      return null;
    }
  }, [value]);

  function handleJalaliDateChange(date: JalaliDate | null): void {
    if (!date) {
      return;
    }

    onChange(toGregorian(date, "YYYY-MM-DD"));
    setIsOpen(false);
  }

  function displayValue(): string {
    if (language === "en") {
      return formatEnglishDate(value);
    }

    if (!selectedJalaliDate) {
      return "";
    }

    return (
      String(selectedJalaliDate.year) +
      "/" +
      String(selectedJalaliDate.month).padStart(2, "0") +
      "/" +
      String(selectedJalaliDate.day).padStart(2, "0")
    );
  }

  return (
    <div className="birth-date-picker" dir={direction}>
      <div className="birth-date-input-wrapper" onClick={() => setIsOpen(true)}>
        <input
          id="birthDate"
          name="birthDate"
          type="text"
          value={displayValue()}
          placeholder={t("auth.register.birthDatePlaceholder")}
          readOnly
          required={required}
          autoComplete="bday"
          dir="ltr"
          lang={language}
        />

        <button
          type="button"
          className="birth-date-calendar-button"
          onClick={(event) => {
            event.stopPropagation();
            setIsOpen((current) => !current);
          }}
          aria-label={t("auth.register.chooseBirthDate")}
          aria-expanded={isOpen}
        >
          <HiOutlineCalendarDays />
        </button>
      </div>

      {isOpen ? (
        <div
          className="birth-date-calendar"
          onClick={(event) => event.stopPropagation()}
        >
          {language === "en" ? (
            <GregorianDatePicker
              value={value}
              onSelect={(birthDate) => {
                onChange(birthDate);
                setIsOpen(false);
              }}
            />
          ) : (
            <JalaliDatePicker
              value={selectedJalaliDate}
              onChange={handleJalaliDateChange}
              selectionMode="single"
              mode="instant"
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export default BirthDatePicker;
