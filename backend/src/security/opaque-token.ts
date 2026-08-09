import { createHash, randomBytes } from "node:crypto";

export function generateOpaqueToken(byteLength = 32): string {
    if (!Number.isInteger(byteLength) || byteLength < 16) {
        throw new RangeError(
            "Opaque token length must be an integer of at least 16 bytes.",
        );
    }

    return randomBytes(byteLength).toString("base64url");
}

export function hashOpaqueToken(token: string): string {
    return createHash("sha256").update(token, "utf8").digest("hex");
}
