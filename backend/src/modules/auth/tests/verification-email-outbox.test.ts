import assert from "node:assert/strict";
import test from "node:test";

import { prisma } from "../../../db/index.js";
import type { Prisma } from "../../../generated/prisma/client.js";
import { DefaultAuthSecurity } from "../auth.security.js";
import {
    QueuedVerificationEmailSender,
    decryptVerificationEmailPayload,
    handleVerificationEmailOutbox,
} from "../verification-email-outbox.js";

type UnknownRecord = Record<string, unknown>;

void test("verification email delivery is queued without storing plaintext", async (t) => {
    let event: UnknownRecord | undefined;
    const outbox = prisma.outboxMessage as unknown as {
        create?: (args: { data: UnknownRecord }) => Promise<unknown>;
    };

    t.mock.property(outbox, "create", ({ data }: { data: UnknownRecord }) => {
        event = data;
        return Promise.resolve({ id: "outbox-1", ...data });
    });

    await new QueuedVerificationEmailSender().send(
        "writer@example.com",
        "123456",
    );

    assert.equal(event?.eventType, "EMAIL_VERIFICATION_REQUESTED");
    assert.equal(event?.aggregateType, "USER_EMAIL");
    assert.equal(JSON.stringify(event?.payload).includes("123456"), false);
    assert.equal(
        JSON.stringify(event?.payload).includes("writer@example.com"),
        false,
    );
    assert.deepEqual(decryptVerificationEmailPayload(event?.payload), {
        email: "writer@example.com",
        code: "123456",
    });
});

void test("queued delivery sends only the code that is still active", async (t) => {
    const sender = new QueuedVerificationEmailSender();
    let payload: Prisma.JsonValue | undefined;
    const outbox = prisma.outboxMessage as unknown as {
        create?: (args: { data: UnknownRecord }) => Promise<unknown>;
    };

    t.mock.property(outbox, "create", ({ data }: { data: UnknownRecord }) => {
        payload = data.payload as Prisma.JsonValue;
        return Promise.resolve({ id: "outbox-1", ...data });
    });
    await sender.send("writer@example.com", "123456");
    assert.ok(payload !== undefined);

    const verificationTokens = prisma.emailVerificationToken as unknown as {
        findFirst?: (args: unknown) => Promise<unknown>;
    };
    t.mock.property(verificationTokens, "findFirst", () =>
        Promise.resolve({
            tokenHash: "different-active-code",
        }),
    );
    let deliveryCount = 0;

    await handleVerificationEmailOutbox(
        {
            id: "outbox-1",
            eventType: "EMAIL_VERIFICATION_REQUESTED",
            aggregateType: "USER_EMAIL",
            aggregateId: "email-hash",
            payload,
            attempts: 1,
        },
        () => {
            deliveryCount += 1;
            return Promise.resolve();
        },
    );

    assert.equal(deliveryCount, 0);
});

void test("queued delivery sends the current active code", async (t) => {
    const sender = new QueuedVerificationEmailSender();
    let payload: Prisma.JsonValue | undefined;
    const outbox = prisma.outboxMessage as unknown as {
        create?: (args: { data: UnknownRecord }) => Promise<unknown>;
    };

    t.mock.property(outbox, "create", ({ data }: { data: UnknownRecord }) => {
        payload = data.payload as Prisma.JsonValue;
        return Promise.resolve({ id: "outbox-2", ...data });
    });
    await sender.send("writer@example.com", "123456");
    assert.ok(payload !== undefined);

    const verificationTokens = prisma.emailVerificationToken as unknown as {
        findFirst?: (args: unknown) => Promise<unknown>;
    };
    const activeTokenHash = new DefaultAuthSecurity().hashVerificationCode(
        "writer@example.com",
        "123456",
    );
    t.mock.property(verificationTokens, "findFirst", () =>
        Promise.resolve({ tokenHash: activeTokenHash }),
    );
    let delivered: { email: string; code: string } | undefined;

    await handleVerificationEmailOutbox(
        {
            id: "outbox-2",
            eventType: "EMAIL_VERIFICATION_REQUESTED",
            aggregateType: "USER_EMAIL",
            aggregateId: "email-hash",
            payload,
            attempts: 1,
        },
        (email, code) => {
            delivered = { email, code };
            return Promise.resolve();
        },
    );

    assert.deepEqual(delivered, {
        email: "writer@example.com",
        code: "123456",
    });
});
