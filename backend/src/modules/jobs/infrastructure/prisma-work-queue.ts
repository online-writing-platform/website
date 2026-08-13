import { prisma } from "../../../db/index.js";
import type { JobStatus, OutboxStatus, Prisma } from "../../../generated/prisma/client.js";
import { nextRetryAt } from "../domain/retry-policy.js";

export interface ClaimedJob {
    id: string;
    type: string;
    payload: Prisma.JsonValue;
    attempts: number;
    maxAttempts: number;
}

export interface ClaimedOutbox {
    id: string;
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Prisma.JsonValue;
    attempts: number;
}

function safeError(error: unknown): string {
    const message = error instanceof Error ? error.message : String(error);
    return message.replace(/[\r\n]+/gu, " ").slice(0, 2_000);
}

export class PrismaWorkQueue {
    public async claimJob(now: Date, leaseUntil: Date): Promise<ClaimedJob | null> {
        const rows = await prisma.$queryRaw<ClaimedJob[]>`
            WITH candidate AS (
                SELECT "id"
                FROM "jobs"
                WHERE (
                    ("status" = 'PENDING' AND "available_at" <= ${now})
                    OR ("status" = 'RUNNING' AND "lease_until" < ${now})
                )
                ORDER BY "available_at", "id"
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE "jobs" AS job
            SET "status" = 'RUNNING',
                "lease_until" = ${leaseUntil},
                "attempts" = job."attempts" + 1,
                "updated_at" = ${now}
            FROM candidate
            WHERE job."id" = candidate."id"
            RETURNING job."id", job."type", job."payload", job."attempts",
                      job."max_attempts" AS "maxAttempts"
        `;
        return rows.at(0) ?? null;
    }

    public async completeJob(id: string, now: Date): Promise<void> {
        await prisma.job.updateMany({
            where: { id, status: "RUNNING" },
            data: { status: "SUCCEEDED", completedAt: now, leaseUntil: null, lastError: null },
        });
    }

    public async failJob(job: ClaimedJob, error: unknown, now: Date): Promise<void> {
        const exhausted = job.attempts >= job.maxAttempts;
        const status: JobStatus = exhausted ? "DEAD" : "PENDING";
        await prisma.job.updateMany({
            where: { id: job.id, status: "RUNNING" },
            data: {
                status,
                leaseUntil: null,
                lastError: safeError(error),
                availableAt: exhausted ? now : nextRetryAt(now, job.attempts, 1_000, 60 * 60_000),
            },
        });
    }

    public async claimOutbox(now: Date, leaseUntil: Date): Promise<ClaimedOutbox | null> {
        const rows = await prisma.$queryRaw<ClaimedOutbox[]>`
            WITH candidate AS (
                SELECT "id"
                FROM "outbox_messages"
                WHERE (
                    ("status" = 'PENDING' AND "available_at" <= ${now})
                    OR ("status" = 'PROCESSING' AND "lease_until" < ${now})
                )
                ORDER BY "occurred_at", "id"
                FOR UPDATE SKIP LOCKED
                LIMIT 1
            )
            UPDATE "outbox_messages" AS message
            SET "status" = 'PROCESSING',
                "lease_until" = ${leaseUntil},
                "attempts" = message."attempts" + 1
            FROM candidate
            WHERE message."id" = candidate."id"
            RETURNING message."id", message."event_type" AS "eventType",
                      message."aggregate_type" AS "aggregateType",
                      message."aggregate_id" AS "aggregateId",
                      message."payload", message."attempts"
        `;
        return rows.at(0) ?? null;
    }

    public async completeOutbox(id: string, now: Date): Promise<void> {
        await prisma.outboxMessage.updateMany({
            where: { id, status: "PROCESSING" },
            data: { status: "DISPATCHED", dispatchedAt: now, leaseUntil: null, lastError: null },
        });
    }

    public async failOutbox(message: ClaimedOutbox, error: unknown, now: Date): Promise<void> {
        const exhausted = message.attempts >= 20;
        const status: OutboxStatus = exhausted ? "DEAD" : "PENDING";
        await prisma.outboxMessage.updateMany({
            where: { id: message.id, status: "PROCESSING" },
            data: {
                status,
                leaseUntil: null,
                lastError: safeError(error),
                availableAt: exhausted ? now : nextRetryAt(now, message.attempts, 1_000, 60 * 60_000),
            },
        });
    }
}
