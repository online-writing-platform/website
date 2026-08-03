import { ApiError } from "./api";

const errorMessages: Record<string, string> = {
  NETWORK_ERROR:
    "ارتباط با سرور برقرار نشد. مطمئن شوید بک‌اند در حال اجرا است.",

  VALIDATION_ERROR: "اطلاعات واردشده معتبر نیست. فیلدها را بررسی کنید.",

  EMAIL_ALREADY_EXISTS: "قبلاً حسابی با این ایمیل ساخته شده است.",

  USERNAME_ALREADY_EXISTS: "این نام کاربری قبلاً انتخاب شده است.",

  IDENTITY_ALREADY_EXISTS: "ایمیل یا نام کاربری واردشده قبلاً استفاده شده است.",

  INVALID_CREDENTIALS: "ایمیل، نام کاربری یا رمز عبور اشتباه است.",

  LOGIN_RATE_LIMIT_EXCEEDED:
    "تعداد تلاش‌های ورود بیش از حد مجاز است. کمی بعد دوباره امتحان کنید.",

  REGISTRATION_RATE_LIMIT_EXCEEDED:
    "تعداد تلاش‌های ثبت‌نام بیش از حد مجاز است. کمی بعد دوباره امتحان کنید.",

  UNAUTHORIZED: "برای انجام این عملیات باید وارد حساب خود شوید.",

  INVALID_ACCESS_TOKEN: "نشست شما منقضی شده است. دوباره وارد شوید.",

  INACTIVE_SESSION: "نشست شما دیگر فعال نیست. دوباره وارد شوید.",

  USER_NOT_FOUND: "کاربر موردنظر پیدا نشد.",
};

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return errorMessages[error.code] ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "خطای پیش‌بینی‌نشده‌ای رخ داد.";
}
