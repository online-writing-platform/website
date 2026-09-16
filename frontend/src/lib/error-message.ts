import i18n from "../i18n";
import { ApiError } from "./api";

function translateApiError(code: string): string | null {
  const translationKey = `errors.${code}`;
  const translatedMessage = i18n.t(translationKey, { defaultValue: "" });

  return translatedMessage || null;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return translateApiError(error.code) ?? i18n.t("errors.REQUEST_FAILED");
  }

  return i18n.t("errors.UNEXPECTED_ERROR");
}
