export type SupportedStoryLanguage = "fa" | "en";
export type StoryDirection = "rtl" | "ltr" | "auto";

export interface StoryTextAttributes {
  dir: StoryDirection;
  lang?: SupportedStoryLanguage;
}

export function normalizeStoryLanguage(
  language?: string,
): SupportedStoryLanguage | null {
  const normalizedLanguage = language
    ?.trim()
    .toLowerCase()
    .replaceAll("_", "-");

  const primaryLanguage = normalizedLanguage?.split("-")[0];

  if (
    primaryLanguage === "fa" ||
    primaryLanguage === "fas" ||
    primaryLanguage === "per" ||
    normalizedLanguage === "farsi" ||
    normalizedLanguage === "persian"
  ) {
    return "fa";
  }

  if (
    primaryLanguage === "en" ||
    primaryLanguage === "eng" ||
    normalizedLanguage === "english"
  ) {
    return "en";
  }

  return null;
}

export function getActiveStoryLanguage(
  interfaceLanguage?: string,
): SupportedStoryLanguage {
  return normalizeStoryLanguage(interfaceLanguage) ?? "fa";
}

export function getStoryTextAttributes(language?: string): StoryTextAttributes {
  const normalizedLanguage = normalizeStoryLanguage(language);

  if (normalizedLanguage === "fa") {
    return { dir: "rtl", lang: "fa" };
  }

  if (normalizedLanguage === "en") {
    return { dir: "ltr", lang: "en" };
  }

  return { dir: "auto" };
}

export function matchesStoryLanguage(
  storyLanguage: string,
  activeLanguage: SupportedStoryLanguage,
): boolean {
  return normalizeStoryLanguage(storyLanguage) === activeLanguage;
}
