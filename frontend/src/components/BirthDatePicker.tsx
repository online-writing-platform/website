import { useState } from "react";
import {
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
  const [isOpen, setIsOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<JalaliDate | null>(null);

  function handleDateChange(date: JalaliDate | null): void {
    if (!date) {
      return;
    }

    setSelectedDate(date);

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
      <div className="birth-date-input-wrapper">
        <input
          id="birthDate"
          name="birthDate"
          type="text"
          value={displayValue()}
          placeholder="تاریخ تولد"
          readOnly
          required={required}
          autoComplete="bday"
        />

        <button
          type="button"
          className="birth-date-calendar-button"
          onClick={() => setIsOpen((current) => !current)}
          aria-label="انتخاب تاریخ تولد"
          aria-expanded={isOpen}
        >
          <HiOutlineCalendarDays />
        </button>
      </div>

      {isOpen && (
        <div className="birth-date-calendar">
          <JalaliDatePicker
            value={selectedDate}
            onConfirm={handleDateChange}
            selectionMode="single"
            mode="confirm"
          />
        </div>
      )}
    </div>
  );
}

export default BirthDatePicker;
