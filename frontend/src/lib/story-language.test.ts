import { describe, expect, it } from "vitest";

import {
  getActiveStoryLanguage,
  matchesStoryLanguage,
  normalizeStoryLanguage,
} from "./story-language";

describe("story language helpers", () => {
  it("normalizes supported language codes and common aliases", () => {
    expect(normalizeStoryLanguage("fa-IR")).toBe("fa");
    expect(normalizeStoryLanguage("Farsi")).toBe("fa");
    expect(normalizeStoryLanguage("en_US")).toBe("en");
    expect(normalizeStoryLanguage("English")).toBe("en");
  });

  it("never treats an English story as Persian or vice versa", () => {
    expect(matchesStoryLanguage("en", "fa")).toBe(false);
    expect(matchesStoryLanguage("fa", "en")).toBe(false);
    expect(matchesStoryLanguage("en-GB", "en")).toBe(true);
    expect(matchesStoryLanguage("fa-IR", "fa")).toBe(true);
  });

  it("uses Persian as the fallback for an unknown locale", () => {
    expect(getActiveStoryLanguage("de")).toBe("fa");
  });
});
