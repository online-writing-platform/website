import type { Server } from "node:http";

import "dotenv/config";

import app from "./app";
import env from "./config/env";
import { checkDatabaseConnection, closeDatabaseConnection } from "./db";

let server: Server | undefined;
let isShuttingDown = false;

async function startServer(): Promise<void> {
    try {
        const databaseTime = await checkDatabaseConnection();

        console.log(
            `Database connected successfully at ${databaseTime.toISOString()}`,
        );

        server = app.listen(env.port, () => {
            console.log(`Server is running on port ${env.port}`);
        });
    } catch (error) {
        console.error("Failed to start server");

        if (error instanceof AggregateError) {
            for (const innerError of error.errors) {
                if (innerError instanceof Error) {
                    console.error(`- ${innerError.message}`);
                } else {
                    console.error("-", innerError);
                }
            }
        } else {
            console.error(error);
        }

        process.exit(1);
    }
}

async function shutdown(signal: NodeJS.Signals): Promise<void> {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.log(`${signal} received. Shutting down gracefully...`);

    try {
        const activeServer = server;

        if (activeServer) {
            await new Promise<void>((resolve, reject) => {
                activeServer.close((error) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    resolve();
                });
            });
        }

        await closeDatabaseConnection();

        console.log("Server and database connections closed");
        process.exit(0);
    } catch (error) {
        console.error("Error during shutdown:", error);
        process.exit(1);
    }
}

process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});

void startServer();
