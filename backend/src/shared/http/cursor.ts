import { createHmac, timingSafeEqual } from "node:crypto";
import type { ZodType } from "zod";

import AppError from "../../errors/app-error.js";

function base64Url(value: Buffer | string): string {
    return Buffer.from(value).toString("base64url");
}

export function createCursorCodec(secret: string) {
    if (Buffer.byteLength(secret) < 32) throw new Error("Cursor secret is too short.");

    function signature(payload: string): Buffer {
        return createHmac("sha256", secret).update(payload).digest();
    }

    return {
        encode<T extends object>(tuple: T): string {
            const payload = base64Url(JSON.stringify({ version: 1, tuple }));
            return `${payload}.${base64Url(signature(payload))}`;
        },
        decode<T>(cursor: string, schema: ZodType<T>): T {
            const [payload, suppliedSignature, extra] = cursor.split(".");
            if (!payload || !suppliedSignature || extra !== undefined) {
                throw AppError.validation("The pagination cursor is invalid.", "INVALID_CURSOR");
            }
            const expected = signature(payload);
            let supplied: Buffer;
            try {
                supplied = Buffer.from(suppliedSignature, "base64url");
            } catch {
                throw AppError.validation("The pagination cursor is invalid.", "INVALID_CURSOR");
            }
            if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
                throw AppError.validation("The pagination cursor is invalid.", "INVALID_CURSOR");
            }
            try {
                const envelope = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as unknown;
                if (typeof envelope !== "object" || envelope === null || !("version" in envelope) || envelope.version !== 1 || !("tuple" in envelope)) {
                    throw new Error("invalid envelope");
                }
                return schema.parse(envelope.tuple);
            } catch {
                throw AppError.validation("The pagination cursor is invalid.", "INVALID_CURSOR");
            }
        },
    };
}
