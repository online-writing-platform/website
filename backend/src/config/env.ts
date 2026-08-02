import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
    NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),

    PORT: z.coerce.number().int().min(1).max(65_535).default(5000),

    DATABASE_URL: z.string().trim().min(1),

    CLIENT_ORIGINS: z.string().trim().default("http://localhost:5173"),

    ACCESS_TOKEN_SECRET: z
        .string()
        .min(32, "ACCESS_TOKEN_SECRET must contain at least 32 characters"),

    ACCESS_TOKEN_TTL_SECONDS: z.coerce
        .number()
        .int()
        .min(60)
        .max(86_400)
        .default(900),

    SESSION_TTL_HOURS: z.coerce.number().int().min(1).max(168).default(24),

    PERSISTENT_SESSION_TTL_DAYS: z.coerce
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

    DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).default(10),

    DATABASE_CONNECTION_TIMEOUT_MS: z.coerce
        .number()
        .int()
        .min(100)
        .default(5000),

    DATABASE_IDLE_TIMEOUT_MS: z.coerce.number().int().min(1000).default(30_000),

    TRUST_PROXY: z.enum(["true", "false"]).default("false"),

    LOG_LEVEL: z
        .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
        .default("info"),

    TERMS_VERSION: z.string().trim().min(1).max(20).default("v1"),
});

const parsedEnvironment = environmentSchema.safeParse(process.env);

if (!parsedEnvironment.success) {
    const messages = parsedEnvironment.error.issues.map(
        (issue) => `${issue.path.join(".")}: ${issue.message}`,
    );

    throw new Error(`Invalid environment variables:\n${messages.join("\n")}`);
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
    clientOrigins,

    accessTokenSecret: values.ACCESS_TOKEN_SECRET,
    accessTokenTtlSeconds: values.ACCESS_TOKEN_TTL_SECONDS,

    sessionTtlHours: values.SESSION_TTL_HOURS,
    persistentSessionTtlDays: values.PERSISTENT_SESSION_TTL_DAYS,

    refreshCookieName: values.REFRESH_COOKIE_NAME,

    databasePoolMax: values.DATABASE_POOL_MAX,
    databaseConnectionTimeoutMs: values.DATABASE_CONNECTION_TIMEOUT_MS,
    databaseIdleTimeoutMs: values.DATABASE_IDLE_TIMEOUT_MS,

    trustProxy: values.TRUST_PROXY === "true",
    logLevel: values.LOG_LEVEL,

    termsVersion: values.TERMS_VERSION,
});

export default env;
