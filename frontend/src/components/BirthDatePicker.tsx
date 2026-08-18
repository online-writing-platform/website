import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  fromGregorian,
  JalaliDatePicker,
  toGregorian,
  type JalaliDate,
} from "@aliasadollahi/jalali-datepicker";
import { HiOutlineCalendarDays } from "react-icons/hi2";

import "@aliasadollahi/jalali-datepicker/styles.css";

interface BirthDatePickerProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

function BirthDatePicker({
  value,
  onChange,
  required = false,
}: BirthDatePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const selectedDate = useMemo<JalaliDate | null>(() => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return null;
    }

    try {
      return fromGregorian(value);
    } catch {
      return null;
    }
  }, [value]);

  function handleDateChange(date: JalaliDate | null): void {
    if (!date) {
      return;
    }

    const gregorianDate = toGregorian(date, "YYYY-MM-DD");

    onChange(gregorianDate);
    setIsOpen(false);
  }

  function displayValue(): string {
    if (!selectedDate) {
      return "";
    }

    return `${selectedDate.year}/${String(selectedDate.month).padStart(
      2,
      "0",
    )}/${String(selectedDate.day).padStart(2, "0")}`;
  }

  return (
    <div className="birth-date-picker">
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

      {isOpen && (
        <div
          className="birth-date-calendar"
          onClick={(event) => event.stopPropagation()}
        >
          <JalaliDatePicker
            value={selectedDate}
            onChange={handleDateChange}
            selectionMode="single"
            mode="instant"
          />
        </div>
      )}
    </div>
  );
}

export default BirthDatePicker;
