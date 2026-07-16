require("dotenv").config();

const app = require("./app");
const env = require("./config/env");

const { checkDatabaseConnection, closeDatabaseConnection } = require("./db");

let server;
let isShuttingDown = false;

async function startServer() {
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
                console.error(`- ${innerError.message}`);
            }
        } else {
            console.error(error);
        }

        process.exit(1);
    }
}

async function shutdown(signal) {
    if (isShuttingDown) {
        return;
    }

    isShuttingDown = true;

    console.log(`${signal} received. Shutting down gracefully...`);

    try {
        if (server) {
            await new Promise((resolve, reject) => {
                server.close((error) => {
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

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer();
