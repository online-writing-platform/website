import i18n from "../i18n";
import { ApiError } from "./api";

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const translationKey = `errors.${error.code}`;
    const translatedMessage = i18n.t(translationKey, { defaultValue: "" });

    if (translatedMessage) return translatedMessage;

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }
  return i18n.t("errors.UNEXPECTED_ERROR");
}
