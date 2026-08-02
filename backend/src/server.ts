import type { Server } from "node:http";

import app from "./app.js";
import env from "./config/env.js";
import logger from "./config/logger.js";
import {
    checkDatabaseConnection,
    closeDatabaseConnection,
    connectDatabase,
} from "./db/index.js";

let server: Server | undefined;
let shutdownPromise: Promise<void> | undefined;

async function startServer(): Promise<void> {
    await connectDatabase();

    const databaseTime = await checkDatabaseConnection();

    logger.info(
        {
            databaseTime: databaseTime.toISOString(),
        },
        "Database connection established",
    );

    server = app.listen(env.port, () => {
        logger.info(
            {
                port: env.port,
                environment: env.nodeEnv,
            },
            "HTTP server started",
        );
    });

    server.on("error", (error) => {
        logger.fatal(
            {
                error,
            },
            "HTTP server error",
        );

        void shutdown("SERVER_ERROR", 1);
    });
}

function closeHttpServer(): Promise<void> {
    if (!server) {
        return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
        server?.close((error) => {
            if (error) {
                reject(error);
                return;
            }

            resolve();
        });
    });
}

async function performShutdown(
    reason: string,
    exitCode: number,
): Promise<void> {
    logger.info(
        {
            reason,
        },
        "Application shutdown started",
    );

    const forceShutdownTimer = setTimeout(() => {
        logger.error("Graceful shutdown timed out; closing active connections");

        server?.closeAllConnections();
    }, 10_000);

    forceShutdownTimer.unref();

    try {
        await closeHttpServer();
        await closeDatabaseConnection();

        logger.info("HTTP server and database connections closed");
    } catch (error) {
        logger.error(
            {
                error,
            },
            "Error during application shutdown",
        );

        process.exitCode = 1;
    } finally {
        clearTimeout(forceShutdownTimer);

        if (process.exitCode === undefined) {
            process.exitCode = exitCode;
        }
    }
}

function shutdown(reason: string, exitCode = 0): Promise<void> {
    shutdownPromise ??= performShutdown(reason, exitCode);

    return shutdownPromise;
}

process.once("SIGINT", () => {
    void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
    void shutdown("SIGTERM");
});

process.once("uncaughtException", (error) => {
    logger.fatal(
        {
            error,
        },
        "Uncaught exception",
    );

    void shutdown("UNCAUGHT_EXCEPTION", 1);
});

process.once("unhandledRejection", (reason) => {
    logger.fatal(
        {
            reason,
        },
        "Unhandled promise rejection",
    );

    void shutdown("UNHANDLED_REJECTION", 1);
});

startServer().catch((error: unknown) => {
    logger.fatal(
        {
            error,
        },
        "Failed to start application",
    );

    void shutdown("STARTUP_FAILURE", 1);
});
