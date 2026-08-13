export function nextRetryAt(
    now: Date,
    attempt: number,
    baseDelayMs: number,
    maximumDelayMs: number,
): Date {
    if (!Number.isInteger(attempt) || attempt < 1) {
        throw new RangeError("attempt must be a positive integer");
    }
    if (baseDelayMs < 1 || maximumDelayMs < baseDelayMs) {
        throw new RangeError("retry delays are invalid");
    }

    const exponent = Math.min(attempt - 1, 30);
    const delay = Math.min(maximumDelayMs, baseDelayMs * 2 ** exponent);
    return new Date(now.getTime() + delay);
}
