import logger from "../../../config/logger.js";
import { handleJob, handleOutbox } from "./job-handlers.js";
import { PrismaWorkQueue } from "../infrastructure/prisma-work-queue.js";

const queue = new PrismaWorkQueue();
let stopping = false;

export function stopWorker(): void {
    stopping = true;
}

export async function runWorkerCycle(): Promise<boolean> {
    const now = new Date();
    const leaseUntil = new Date(now.getTime() + 30_000);
    const outbox = await queue.claimOutbox(now, leaseUntil);
    if (outbox) {
        try {
            await handleOutbox(outbox);
            await queue.completeOutbox(outbox.id, new Date());
        } catch (error) {
            await queue.failOutbox(outbox, error, new Date());
            logger.error({ error, eventId: outbox.id }, "Outbox handler failed");
        }
        return true;
    }

    const job = await queue.claimJob(now, leaseUntil);
    if (!job) return false;
    try {
        await handleJob(job);
        await queue.completeJob(job.id, new Date());
    } catch (error) {
        await queue.failJob(job, error, new Date());
        logger.error({ error, jobId: job.id, jobType: job.type }, "Job handler failed");
    }
    return true;
}

export async function runWorker(): Promise<void> {
    while (!stopping) {
        const worked = await runWorkerCycle();
        if (!worked) await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
}
