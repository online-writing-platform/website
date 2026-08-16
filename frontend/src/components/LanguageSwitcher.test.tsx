import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import i18n from "../i18n";
import LanguageSwitcher from "./LanguageSwitcher";

describe("LanguageSwitcher", () => {
  beforeEach(async () => {
    window.localStorage.clear();
    await i18n.changeLanguage("fa");
  });

  it("shows the target language and switches the document to English", async () => {
    render(<LanguageSwitcher />);

    const button = screen.getByRole("button", {
      name: "تغییر زبان به انگلیسی",
    });

    expect(button.textContent).toContain("English");

    fireEvent.click(button);
    await waitFor(() => {
      expect(i18n.resolvedLanguage).toBe("en");
      expect(document.documentElement.lang).toBe("en");
      expect(document.documentElement.dir).toBe("ltr");
      expect(window.localStorage.getItem("platform-language")).toBe("en");
    });

    expect(
      screen.getByRole("button", {
        name: "Switch language to Persian",
      }).textContent,
    ).toContain("فارسی");
  });
});
