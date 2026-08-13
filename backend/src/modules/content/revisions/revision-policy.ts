import { createHash } from "node:crypto";

export interface DraftRevisionDecision {
    currentHash: string;
    incomingHash: string;
    lastRevisionAt: Date | null;
    now: Date;
    minimumIntervalMs: number;
    force?: boolean;
}

export function chapterContentHash(title: string, content: string): string {
    return createHash("sha256")
        .update(title, "utf8")
        .update("\u0000", "utf8")
        .update(content, "utf8")
        .digest("hex");
}

export function shouldCreateDraftRevision(
    input: DraftRevisionDecision,
): boolean {
    if (input.force === true) return true;
    if (input.currentHash === input.incomingHash) return false;
    if (input.lastRevisionAt === null) return true;

    return (
        input.now.getTime() - input.lastRevisionAt.getTime() >=
        input.minimumIntervalMs
    );
}
