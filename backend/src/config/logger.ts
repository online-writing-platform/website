import pino from "pino";

import env from "./env.js";

const logger = pino({
    level: env.logLevel,
    base: {
        service: "writing-platform-backend",
        environment: env.nodeEnv,
    },
    redact: {
        paths: [
            "req.headers.authorization",
            "req.headers.cookie",
            "res.headers.set-cookie",
            "req.body.password",
            "req.body.currentPassword",
            "req.body.newPassword",
            "req.body.token",
            "*.password",
            "*.currentPassword",
            "*.newPassword",
            "*.passwordHash",
            "*.refreshToken",
            "*.token",
            "*.tokenHash",
        ],
        censor: "[REDACTED]",
    },
    timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
