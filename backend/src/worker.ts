import env from "./config/env.js";
import logger from "./config/logger.js";
import { closeDatabaseConnection, connectDatabase } from "./db/index.js";
import { closeRedis, connectRedis } from "./infrastructure/redis/redis.js";
import { runWorker, stopWorker } from "./modules/jobs/application/worker.js";

async function shutdown(signal: string): Promise<void> {
    logger.info({ signal }, "Worker shutdown started");
    stopWorker();
    await closeRedis();
    await closeDatabaseConnection();
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));

await connectDatabase();
await connectRedis();
if (!env.jobWorkerEnabled) {
    logger.warn("Job worker is disabled by configuration");
} else {
    logger.info("Durable job and outbox worker started");
    await runWorker();
}
