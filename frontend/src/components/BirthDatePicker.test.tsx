import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import i18n from "../i18n";
import BirthDatePicker from "./BirthDatePicker";

function EnglishBirthDatePickerHarness() {
  const [value, setValue] = useState("2000-01-15");

  return (
    <div className="form-group">
      <label htmlFor="birthDate">Date of birth</label>
      <BirthDatePicker value={value} onChange={setValue} required />
      <output data-testid="iso-date">{value}</output>
    </div>
  );
}

describe("BirthDatePicker interface calendar", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
  });

  afterEach(() => cleanup());

  it("uses an English Gregorian calendar and keeps the API value in ISO format", () => {
    render(<EnglishBirthDatePickerHarness />);

    const input = screen.getByLabelText("Date of birth") as HTMLInputElement;
    expect(input.value).toBe("01/15/2000");

    fireEvent.click(
      screen.getByRole("button", { name: "Choose date of birth" }),
    );

    expect(
      screen.getByRole("group", { name: "Gregorian calendar" }),
    ).toBeTruthy();
    expect(
      (screen.getByRole("combobox", { name: "Month" }) as HTMLSelectElement)
        .value,
    ).toBe("0");
    expect(
      (screen.getByRole("combobox", { name: "Year" }) as HTMLSelectElement)
        .value,
    ).toBe("2000");

    fireEvent.click(
      screen.getByRole("button", { name: /January 20, 2000/u }),
    );

    expect(screen.getByTestId("iso-date").textContent).toBe("2000-01-20");
    expect(input.value).toBe("01/20/2000");
    expect(
      screen.queryByRole("group", { name: "Gregorian calendar" }),
    ).toBeNull();
  });

  it("keeps the Persian calendar Jalali while applying the minimal theme", async () => {
    await i18n.changeLanguage("fa");

    const { container } = render(
      <div className="form-group">
        <label htmlFor="birthDate">تاریخ تولد</label>
        <BirthDatePicker
          value="2000-01-15"
          onChange={() => undefined}
          required
        />
      </div>,
    );

    fireEvent.click(
      screen.getByRole("button", { name: "انتخاب تاریخ تولد" }),
    );

    const jalaliCalendar = container.querySelector(
      ".jalali-calendar-minimal",
    );

    expect(jalaliCalendar).toBeTruthy();
    expect(jalaliCalendar?.getAttribute("dir")).toBe("rtl");
    expect(
      container.querySelector(".birth-date-calendar--fa"),
    ).toBeTruthy();
    expect(screen.queryByText("امروز")).toBeNull();
  });
});
