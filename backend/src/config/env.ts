import "dotenv/config";

import { z } from "zod";

const optionalEnvironmentString = z.preprocess((value) => {
    if (typeof value === "string" && value.trim().length === 0) {
        return undefined;
    }
    return value;
}, z.string().trim().min(1).optional());

const environmentSchema = z
    .object({
        NODE_ENV: z
            .enum(["development", "test", "production"])
            .default("development"),

        PORT: z.coerce.number().int().min(1).max(65_535).default(5000),
        DATABASE_URL: z.string().trim().min(1),
        REDIS_URL: optionalEnvironmentString,
        CLIENT_ORIGINS: z.string().trim().default("http://localhost:5173"),
        WEB_APP_URL: z
            .string()
            .trim()
            .url()
            .default("http://localhost:5173"),
        PUBLIC_API_URL: z
            .string()
            .trim()
            .url()
            .default("http://localhost:5000"),

        ACCESS_TOKEN_SECRET: z
            .string()
            .min(
                32,
                "ACCESS_TOKEN_SECRET must contain at least 32 characters",
            ),
        EMAIL_VERIFICATION_SECRET: optionalEnvironmentString,
        PHONE_OTP_SECRET: optionalEnvironmentString,
        ACCESS_TOKEN_TTL_SECONDS: z.coerce
            .number()
            .int()
            .min(60)
            .max(86_400)
            .default(900),
        SESSION_TTL_DAYS: z.coerce
            .number()
            .int()
            .min(1)
            .max(365)
            .default(30),
        REFRESH_COOKIE_NAME: z
            .string()
            .trim()
            .min(1)
            .default("writing_refresh_token"),

        EMAIL_VERIFICATION_TTL_MINUTES: z.coerce
            .number()
            .int()
            .min(1)
            .max(60)
            .default(10),
        EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS: z.coerce
            .number()
            .int()
            .min(30)
            .max(3600)
            .default(60),

        PASSWORD_RESET_TTL_MINUTES: z.coerce
            .number()
            .int()
            .min(10)
            .max(1440)
            .default(30),
        PASSWORD_RESET_RESEND_COOLDOWN_SECONDS: z.coerce
            .number()
            .int()
            .min(30)
            .max(3600)
            .default(60),

        EMAIL_CHANGE_TTL_MINUTES: z.coerce
            .number()
            .int()
            .min(10)
            .max(1440)
            .default(30),
        EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS: z.coerce
            .number()
            .int()
            .min(30)
            .max(3600)
            .default(60),

        MAIL_TRANSPORT: z.enum(["console", "smtp"]).default("console"),
        MAIL_FROM: z
            .string()
            .trim()
            .min(3)
            .default("Writing Platform <no-reply@example.com>"),
        SMTP_HOST: optionalEnvironmentString,
        SMTP_PORT: z.coerce.number().int().min(1).max(65_535).default(587),
        SMTP_SECURE: z.enum(["true", "false"]).default("false"),
        SMTP_USER: optionalEnvironmentString,
        SMTP_PASS: optionalEnvironmentString,

        MEDIA_PROVIDER: z.enum(["local", "s3"]).default("local"),
        MEDIA_LOCAL_ROOT: z
            .string()
            .trim()
            .min(1)
            .default("./var/media"),
        MEDIA_MAX_BYTES: z.coerce
            .number()
            .int()
            .min(100_000)
            .max(20_000_000)
            .default(5_000_000),
        MEDIA_MAX_PIXELS: z.coerce
            .number()
            .int()
            .min(1_000_000)
            .max(80_000_000)
            .default(40_000_000),
        S3_ENDPOINT: optionalEnvironmentString,
        S3_REGION: z.string().trim().min(1).default("us-east-1"),
        S3_BUCKET: optionalEnvironmentString,
        S3_ACCESS_KEY_ID: optionalEnvironmentString,
        S3_SECRET_ACCESS_KEY: optionalEnvironmentString,

        DATABASE_POOL_MAX: z.coerce
            .number()
            .int()
            .min(1)
            .max(100)
            .default(10),
        DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
            .number()
            .int()
            .min(100)
            .default(5000),
        DATABASE_IDLE_TIMEOUT_MS: z.coerce
            .number()
            .int()
            .min(1000)
            .default(30_000),

        TRUST_PROXY: z.enum(["true", "false"]).default("false"),
        LOG_LEVEL: z
            .enum([
                "fatal",
                "error",
                "warn",
                "info",
                "debug",
                "trace",
                "silent",
            ])
            .default("info"),
        TERMS_VERSION: z.string().trim().min(1).max(20).default("v1"),
        CURSOR_SECRET: optionalEnvironmentString,
        JOB_WORKER_ENABLED: z.enum(["true", "false"]).default("true"),
    })
    .superRefine((values, context) => {
        if (values.NODE_ENV === "production" && !values.REDIS_URL) {
            context.addIssue({
                code: "custom",
                path: ["REDIS_URL"],
                message: "REDIS_URL is required for production security controls.",
            });
        }

        if (
            values.NODE_ENV === "production" &&
            (!values.CURSOR_SECRET || values.CURSOR_SECRET.length < 32)
        ) {
            context.addIssue({
                code: "custom",
                path: ["CURSOR_SECRET"],
                message: "CURSOR_SECRET must contain at least 32 characters in production.",
            });
        }
        if (
            values.NODE_ENV === "production" &&
            (!values.EMAIL_VERIFICATION_SECRET ||
                values.EMAIL_VERIFICATION_SECRET.length < 32)
        ) {
            context.addIssue({
                code: "custom",
                path: ["EMAIL_VERIFICATION_SECRET"],
                message:
                    "EMAIL_VERIFICATION_SECRET must contain at least 32 characters in production.",
            });
        }
        if (values.NODE_ENV === "production" &&
            (!values.PHONE_OTP_SECRET || values.PHONE_OTP_SECRET.length < 32)
        ) {
            context.addIssue({
                code: "custom",
                path: ["PHONE_OTP_SECRET"],
                message: "PHONE_OTP_SECRET must contain at least 32 characters in production.",
            });
        }
        if (
            values.NODE_ENV === "production" &&
            values.MAIL_TRANSPORT !== "smtp"
        ) {
            context.addIssue({
                code: "custom",
                path: ["MAIL_TRANSPORT"],
                message: "MAIL_TRANSPORT must be smtp in production.",
            });
        }

        if (values.MAIL_TRANSPORT === "smtp" && !values.SMTP_HOST) {
            context.addIssue({
                code: "custom",
                path: ["SMTP_HOST"],
                message:
                    "SMTP_HOST is required when MAIL_TRANSPORT is smtp.",
            });
        }

        const hasSmtpUser = values.SMTP_USER !== undefined;
        const hasSmtpPassword = values.SMTP_PASS !== undefined;
        if (hasSmtpUser !== hasSmtpPassword) {
            context.addIssue({
                code: "custom",
                path: ["SMTP_USER"],
                message:
                    "SMTP_USER and SMTP_PASS must either both be provided or both be omitted.",
            });
        }

        if (values.MEDIA_PROVIDER === "s3") {
            if (!values.S3_BUCKET) {
                context.addIssue({
                    code: "custom",
                    path: ["S3_BUCKET"],
                    message:
                        "S3_BUCKET is required when MEDIA_PROVIDER is s3.",
                });
            }
            const hasKey = values.S3_ACCESS_KEY_ID !== undefined;
            const hasSecret = values.S3_SECRET_ACCESS_KEY !== undefined;
            if (hasKey !== hasSecret) {
                context.addIssue({
                    code: "custom",
                    path: ["S3_ACCESS_KEY_ID"],
                    message:
                        "S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must both be provided or both omitted.",
                });
            }
        }
    });

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
    const messages = parsedEnvironment.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );
    throw new Error(
        `Invalid environment variables:\n${messages.join("\n")}`,
    );
}

const values = parsedEnvironment.data;

const clientOrigins = values.CLIENT_ORIGINS.split(",")
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0);

if (clientOrigins.length === 0) {
    throw new Error("CLIENT_ORIGINS must contain at least one origin");
}

const env = Object.freeze({
    nodeEnv: values.NODE_ENV,
    isDevelopment: values.NODE_ENV === "development",
    isTest: values.NODE_ENV === "test",
    isProduction: values.NODE_ENV === "production",
    port: values.PORT,
    databaseUrl: values.DATABASE_URL,
    redisUrl: values.REDIS_URL,
    clientOrigins,
    webAppUrl: values.WEB_APP_URL,
    publicApiUrl: values.PUBLIC_API_URL.replace(/\/+$/u, ""),
    accessTokenSecret: values.ACCESS_TOKEN_SECRET,
    emailVerificationSecret:
        values.EMAIL_VERIFICATION_SECRET ?? values.ACCESS_TOKEN_SECRET,
    phoneOtpSecret:
        values.PHONE_OTP_SECRET ?? values.ACCESS_TOKEN_SECRET,
    accessTokenTtlSeconds: values.ACCESS_TOKEN_TTL_SECONDS,
    sessionTtlDays: values.SESSION_TTL_DAYS,
    refreshCookieName: values.REFRESH_COOKIE_NAME,
    emailVerificationTtlMinutes: values.EMAIL_VERIFICATION_TTL_MINUTES,
    emailVerificationResendCooldownSeconds:
        values.EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS,
    passwordResetTtlMinutes: values.PASSWORD_RESET_TTL_MINUTES,
    passwordResetResendCooldownSeconds:
        values.PASSWORD_RESET_RESEND_COOLDOWN_SECONDS,
    emailChangeTtlMinutes: values.EMAIL_CHANGE_TTL_MINUTES,
    emailChangeResendCooldownSeconds:
        values.EMAIL_CHANGE_RESEND_COOLDOWN_SECONDS,
    mailTransport: values.MAIL_TRANSPORT,
    mailFrom: values.MAIL_FROM,
    smtpHost: values.SMTP_HOST,
    smtpPort: values.SMTP_PORT,
    smtpSecure: values.SMTP_SECURE === "true",
    smtpUser: values.SMTP_USER,
    smtpPass: values.SMTP_PASS,
    mediaProvider: values.MEDIA_PROVIDER,
    mediaLocalRoot: values.MEDIA_LOCAL_ROOT,
    mediaMaxBytes: values.MEDIA_MAX_BYTES,
    mediaMaxPixels: values.MEDIA_MAX_PIXELS,
    s3Endpoint: values.S3_ENDPOINT,
    s3Region: values.S3_REGION,
    s3Bucket: values.S3_BUCKET ?? "",
    s3AccessKeyId: values.S3_ACCESS_KEY_ID,
    s3SecretAccessKey: values.S3_SECRET_ACCESS_KEY,
    databasePoolMax: values.DATABASE_POOL_MAX,
    databaseConnectionTimeoutMs: values.DATABASE_CONNECTION_TIMEOUT_MS,
    databaseIdleTimeoutMs: values.DATABASE_IDLE_TIMEOUT_MS,
    trustProxy: values.TRUST_PROXY === "true",
    logLevel: values.LOG_LEVEL,
    termsVersion: values.TERMS_VERSION,
    cursorSecret: values.CURSOR_SECRET ?? values.ACCESS_TOKEN_SECRET,
    jobWorkerEnabled: values.JOB_WORKER_ENABLED === "true",
});

export default env;
