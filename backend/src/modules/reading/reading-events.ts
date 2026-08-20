const DEFAULT_RESUME_INTERVAL_MS = 6 * 60 * 60 * 1_000;

export interface MeaningfulHistoryInput {
    previousChapterId: string | null;
    nextChapterId: string | null;
    previousReadAt: Date | null;
    now: Date;
    completed: boolean;
    resumeIntervalMs?: number;
}

export function shouldRecordMeaningfulHistory(
    input: MeaningfulHistoryInput,
): boolean {
    if (input.completed) return true;
    if (input.previousChapterId !== input.nextChapterId) return true;
    if (input.previousReadAt === null) return true;

    return (
        input.now.getTime() - input.previousReadAt.getTime() >=
        (input.resumeIntervalMs ?? DEFAULT_RESUME_INTERVAL_MS)
    );
}

export function readSignalBucket(at: Date, bucketMinutes: number): string {
    if (!Number.isInteger(bucketMinutes) || bucketMinutes < 1 || bucketMinutes > 1_440) {
        throw new RangeError("bucketMinutes must be an integer from 1 through 1440");
    }

    const bucketMs = bucketMinutes * 60_000;
    return new Date(Math.floor(at.getTime() / bucketMs) * bucketMs).toISOString();
}
