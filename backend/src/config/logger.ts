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
            "*.password",
            "*.passwordHash",
            "*.refreshToken",
        ],
        censor: "[REDACTED]",
    },

    timestamp: pino.stdTimeFunctions.isoTime,
});

export default logger;
