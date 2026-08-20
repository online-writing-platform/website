import i18n from "../i18n";
import { ApiError } from "./api";

const translatedErrorCodes = new Set([
  "NETWORK_ERROR",
  "VALIDATION_ERROR",
  "EMAIL_ALREADY_EXISTS",
  "USERNAME_ALREADY_EXISTS",
  "IDENTITY_ALREADY_EXISTS",
  "INVALID_CREDENTIALS",
  "LOGIN_RATE_LIMIT_EXCEEDED",
  "REGISTRATION_RATE_LIMIT_EXCEEDED",
  "UNAUTHORIZED",
  "INVALID_ACCESS_TOKEN",
  "INACTIVE_SESSION",
  "USER_NOT_FOUND",
]);

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (translatedErrorCodes.has(error.code)) {
      return i18n.t(`errors.${error.code}`);
    }

    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }
  return i18n.t("errors.UNEXPECTED_ERROR");
}
