import {
    createCipheriv,
    createDecipheriv,
    createHash,
    createHmac,
    randomBytes,
} from "node:crypto";

import env from "../../config/env.js";
import { prisma } from "../../db/index.js";
import type { ClaimedOutbox } from "../../background/queue.repo.js";
import { normalizeEmail } from "../../utils/normalize.js";
import { sendVerificationCodeEmail } from "./auth.email.js";
import { DefaultAuthSecurity } from "./auth.security.js";
import type { VerificationEmailSender } from "./auth.types.js";

const EVENT_TYPE = "EMAIL_VERIFICATION_REQUESTED";
const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const encryptionKey = createHash("sha256")
    .update("email-verification-outbox\0", "utf8")
    .update(env.emailVerificationSecret, "utf8")
    .digest();

interface VerificationEmailMessage {
    email: string;
    code: string;
}

interface EncryptedVerificationEmailPayload {
    [key: string]: string | number;
    version: 1;
    initializationVector: string;
    authenticationTag: string;
    ciphertext: string;
}

function encryptedPayloadRecord(
    payload: unknown,
): EncryptedVerificationEmailPayload {
    if (
        typeof payload !== "object" ||
        payload === null ||
        Array.isArray(payload)
    ) {
        throw new Error("Verification email payload must be an object.");
    }

    const record = payload as Record<string, unknown>;

    if (
        record.version !== 1 ||
        typeof record.initializationVector !== "string" ||
        typeof record.authenticationTag !== "string" ||
        typeof record.ciphertext !== "string"
    ) {
        throw new Error("Verification email payload is invalid.");
    }

    return {
        version: 1,
        initializationVector: record.initializationVector,
        authenticationTag: record.authenticationTag,
        ciphertext: record.ciphertext,
    };
}

function encryptVerificationEmailPayload(
    message: VerificationEmailMessage,
): EncryptedVerificationEmailPayload {
    const initializationVector = randomBytes(12);
    const cipher = createCipheriv(
        ENCRYPTION_ALGORITHM,
        encryptionKey,
        initializationVector,
    );
    const ciphertext = Buffer.concat([
        cipher.update(JSON.stringify(message), "utf8"),
        cipher.final(),
    ]);

    return {
        version: 1,
        initializationVector: initializationVector.toString("base64url"),
        authenticationTag: cipher.getAuthTag().toString("base64url"),
        ciphertext: ciphertext.toString("base64url"),
    };
}

export function decryptVerificationEmailPayload(
    payload: unknown,
): VerificationEmailMessage {
    const encrypted = encryptedPayloadRecord(payload);
    const decipher = createDecipheriv(
        ENCRYPTION_ALGORITHM,
        encryptionKey,
        Buffer.from(encrypted.initializationVector, "base64url"),
    );

    decipher.setAuthTag(Buffer.from(encrypted.authenticationTag, "base64url"));

    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(encrypted.ciphertext, "base64url")),
        decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as unknown;

    if (
        typeof parsed !== "object" ||
        parsed === null ||
        Array.isArray(parsed)
    ) {
        throw new Error("Verification email message must be an object.");
    }

    const message = parsed as Record<string, unknown>;

    if (
        typeof message.email !== "string" ||
        message.email.length > 320 ||
        typeof message.code !== "string" ||
        !/^\d{6}$/u.test(message.code)
    ) {
        throw new Error("Verification email message is invalid.");
    }

    return {
        email: normalizeEmail(message.email),
        code: message.code,
    };
}

export class QueuedVerificationEmailSender implements VerificationEmailSender {
    public async send(email: string, code: string): Promise<void> {
        const normalizedEmail = normalizeEmail(email);
        const aggregateId = createHmac(
            "sha256",
            env.emailVerificationSecret,
        )
            .update("verification-email-recipient\0", "utf8")
            .update(normalizedEmail, "utf8")
            .digest("hex");

        await prisma.outboxMessage.create({
            data: {
                eventType: EVENT_TYPE,
                aggregateType: "USER_EMAIL",
                aggregateId,
                payload: encryptVerificationEmailPayload({
                    email: normalizedEmail,
                    code,
                }),
            },
        });
    }
}

type VerificationEmailDelivery = (
    email: string,
    code: string,
) => Promise<void>;

export async function handleVerificationEmailOutbox(
    message: ClaimedOutbox,
    deliver: VerificationEmailDelivery = sendVerificationCodeEmail,
): Promise<void> {
    if (message.eventType !== EVENT_TYPE) {
        throw new Error("Unexpected verification email event type.");
    }

    const { email, code } = decryptVerificationEmailPayload(message.payload);
    const security = new DefaultAuthSecurity();
    const tokenHash = security.hashVerificationCode(email, code);
    const activeCode = await prisma.emailVerificationToken.findFirst({
        where: {
            expiresAt: { gt: new Date() },
            user: {
                email,
                status: "ACTIVE",
                emailVerifiedAt: null,
            },
        },
        select: { tokenHash: true },
    });

    if (!activeCode || activeCode.tokenHash !== tokenHash) {
        return;
    }

    await deliver(email, code);
}
