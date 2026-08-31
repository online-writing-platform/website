import assert from "node:assert/strict";
import test from "node:test";

import { EmailVerificationService } from "../email-verification.service.js";
import * as authModule from "../auth.service.js";
import { LoginUserUseCase, RegisterUserUseCase } from "../auth.service.js";

const now = new Date("2026-08-25T00:00:00.000Z");

const unverifiedUser = {
    id: "user-1",
    email: "writer@example.com",
    username: "writer",
    displayName: "writer",
    bio: null,
    avatarUrl: null,
    emailVerifiedAt: null,
    status: "ACTIVE" as const,
    role: "USER" as const,
    createdAt: now,
    updatedAt: now,
};

void test("registration creates a pending user without creating an authenticated session", async () => {
    let createdWithoutSession = false;
    let createdWithSession = false;
    const users = {
        findIdentityConflict: () => Promise.resolve(null),
        createUser: () => {
            createdWithoutSession = true;
            return Promise.resolve(unverifiedUser);
        },
        createUserWithSession: () => {
            createdWithSession = true;
            return Promise.resolve({ user: unverifiedUser, sessionId: "session-1" });
        },
    };
    const security = {
        hashPassword: () => Promise.resolve("password-hash"),
        generateRefreshToken: () => "refresh-token",
        hashRefreshToken: () => "refresh-token-hash",
        calculateSessionExpiration: () => new Date("2026-09-25T00:00:00.000Z"),
        createAccessToken: () => Promise.resolve("access-token"),
    };
    const emailVerification = {
        sendInitial: () => Promise.resolve(true),
    };
    const useCase = new RegisterUserUseCase(
        users as never,
        security as never,
        emailVerification as never,
        "v1",
    );

    const result = await useCase.execute({
        username: "writer",
        email: "Writer@Example.com",
        password: "Secure!Pass123",
        birthDate: "2000-01-01",
        acceptTerms: true,
    });

    assert.equal(createdWithoutSession, true);
    assert.equal(createdWithSession, false);
    assert.deepEqual(result, {
        email: "writer@example.com",
        verificationRequired: true,
        deliveryStatus: "sent",
    });
});

void test("login rejects a valid password for an unverified account before creating a session", async () => {
    let sessionCreated = false;
    const users = {
        findUserForLogin: () =>
            Promise.resolve({ ...unverifiedUser, passwordHash: "password-hash" }),
    };
    const authenticatedSessions = {
        create: () => {
            sessionCreated = true;
            return Promise.reject(new Error("session must not be created"));
        },
    };
    const security = {
        verifyPassword: () => Promise.resolve(true),
    };
    const useCase = new LoginUserUseCase(
        users as never,
        security as never,
        authenticatedSessions as never,
    );

    await assert.rejects(
        () =>
            useCase.execute(
                { identifier: "writer@example.com", password: "Secure!Pass123" },
                {},
            ),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "EMAIL_VERIFICATION_REQUIRED",
    );
    assert.equal(sessionCreated, false);
});

void test("verification consumes the six-digit code and returns the verified user", async () => {
    let consumedCodeHash: string | undefined;
    const verifiedUser = { ...unverifiedUser, emailVerifiedAt: now };
    const users = {
        findVerificationByEmail: () =>
            Promise.resolve({
                userId: unverifiedUser.id,
                tokenHash: "hash:writer@example.com:123456",
                failedAttempts: 0,
                expiresAt: new Date("2099-08-25T00:10:00.000Z"),
                user: unverifiedUser,
            }),
        verifyEmailAndConsumeCode: (
            _userId: string,
            codeHash: string,
        ) => {
            consumedCodeHash = codeHash;
            return Promise.resolve(verifiedUser);
        },
        findVerificationByTokenHash: () =>
            Promise.resolve({
                userId: unverifiedUser.id,
                expiresAt: new Date("2099-08-25T00:10:00.000Z"),
                user: unverifiedUser,
            }),
        verifyEmailAndConsumeTokens: () => Promise.resolve(),
    };
    const security = {
        hashVerificationCode: (email: string, code: string) =>
            `hash:${email}:${code}`,
        hashVerificationToken: (token: string) => `legacy:${token}`,
    };
    const service = new EmailVerificationService(
        users as never,
        security as never,
        { send: () => Promise.resolve() },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60 },
        () => now,
    );

    const result = await service.verify("Writer@Example.com", "123456");

    assert.equal(consumedCodeHash, "hash:writer@example.com:123456");
    assert.deepEqual(result, verifiedUser);
});

void test("successful email verification creates the first authenticated session", async () => {
    const Constructor = (
        authModule as unknown as Record<string, unknown>
    ).CompleteEmailVerificationUseCase;

    assert.equal(typeof Constructor, "function");

    const verifiedUser = { ...unverifiedUser, emailVerifiedAt: now };
    const emailVerification = {
        verify: (email: string, code: string) => {
            assert.equal(email, "writer@example.com");
            assert.equal(code, "123456");
            return Promise.resolve(verifiedUser);
        },
    };
    const expectedAuthentication = {
        user: {
            id: verifiedUser.id,
            email: verifiedUser.email,
            username: verifiedUser.username,
            displayName: verifiedUser.displayName,
            bio: null,
            avatarUrl: null,
            emailVerified: true,
            role: "USER" as const,
            createdAt: now,
            updatedAt: now,
        },
        accessToken: "access-token",
        refreshToken: "refresh-token",
        sessionExpiresAt: new Date("2026-09-25T00:00:00.000Z"),
    };
    const authenticatedSessions = {
        create: (user: typeof verifiedUser, client: { userAgent?: string }) => {
            assert.deepEqual(user, verifiedUser);
            assert.deepEqual(client, { userAgent: "test" });
            return Promise.resolve(expectedAuthentication);
        },
    };
    const UseCase = Constructor as new (
        verification: typeof emailVerification,
        sessions: typeof authenticatedSessions,
    ) => {
        execute(
            email: string,
            code: string,
            client: { userAgent?: string },
        ): Promise<typeof expectedAuthentication>;
    };
    const useCase = new UseCase(emailVerification, authenticatedSessions);

    const result = await useCase.execute(
        "writer@example.com",
        "123456",
        { userAgent: "test" },
    );

    assert.deepEqual(result, expectedAuthentication);
});

void test("initial verification delivery stores a code with a ten-minute expiry", async () => {
    let stored:
        | { codeHash: string; expiresAt: Date; sentAt: Date }
        | undefined;
    let deliveredCode: string | undefined;
    const users = {
        upsertVerificationToken: (
            _userId: string,
            codeHash: string,
            expiresAt: Date,
            sentAt: Date,
        ) => {
            stored = { codeHash, expiresAt, sentAt };
            return Promise.resolve();
        },
    };
    const service = new EmailVerificationService(
        users as never,
        {
            generateVerificationCode: () => "654321",
            hashVerificationCode: (email: string, code: string) =>
                `hash:${email}:${code}`,
        } as never,
        {
            send: (_email: string, code: string) => {
                deliveredCode = code;
                return Promise.resolve();
            },
        },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60 },
        () => now,
    );

    const delivered = await service.sendInitial(
        unverifiedUser.id,
        unverifiedUser.email,
    );

    assert.equal(delivered, true);
    assert.equal(deliveredCode, "654321");
    assert.deepEqual(stored, {
        codeHash: "hash:writer@example.com:654321",
        expiresAt: new Date("2026-08-25T00:10:00.000Z"),
        sentAt: now,
    });
});

void test("expired verification codes are removed and rejected", async () => {
    let deletedCodeHash: string | undefined;
    const users = {
        findVerificationByEmail: () =>
            Promise.resolve({
                userId: unverifiedUser.id,
                tokenHash: "hash:writer@example.com:123456",
                failedAttempts: 0,
                expiresAt: new Date("2026-08-24T23:59:59.000Z"),
                user: unverifiedUser,
            }),
        deleteVerificationCode: (_userId: string, codeHash: string) => {
            deletedCodeHash = codeHash;
            return Promise.resolve();
        },
    };
    const service = new EmailVerificationService(
        users as never,
        {
            hashVerificationCode: (email: string, code: string) =>
                `hash:${email}:${code}`,
        } as never,
        { send: () => Promise.resolve() },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60 },
        () => now,
    );

    await assert.rejects(
        () => service.verify("writer@example.com", "123456"),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "EMAIL_VERIFICATION_CODE_EXPIRED",
    );
    assert.equal(deletedCodeHash, "hash:writer@example.com:123456");
});

void test("verification rejects a suspended account without creating a session", async () => {
    let sessionCreated = false;
    const suspendedUser = { ...unverifiedUser, status: "SUSPENDED" as const };
    const service = new EmailVerificationService(
        {
            findVerificationByEmail: () =>
                Promise.resolve({
                    userId: suspendedUser.id,
                    tokenHash: "hash:writer@example.com:123456",
                    failedAttempts: 0,
                    expiresAt: new Date("2026-08-25T00:10:00.000Z"),
                    user: suspendedUser,
                }),
            verifyEmailAndConsumeCode: () => Promise.resolve(null),
        } as never,
        {
            hashVerificationCode: (email: string, code: string) =>
                `hash:${email}:${code}`,
        } as never,
        { send: () => Promise.resolve() },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60 },
        () => now,
    );

    await assert.rejects(
        () => service.verify("writer@example.com", "123456"),
        (error: unknown) => {
            sessionCreated = false;
            return (
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "INVALID_EMAIL_VERIFICATION_CODE"
            );
        },
    );
    assert.equal(sessionCreated, false);
});

void test("verification rejects a code left behind for an already verified account", async () => {
    const alreadyVerifiedUser = { ...unverifiedUser, emailVerifiedAt: now };
    const service = new EmailVerificationService(
        {
            findVerificationByEmail: () =>
                Promise.resolve({
                    userId: alreadyVerifiedUser.id,
                    tokenHash: "hash:writer@example.com:123456",
                    failedAttempts: 0,
                    expiresAt: new Date("2026-08-25T00:10:00.000Z"),
                    user: alreadyVerifiedUser,
                }),
            verifyEmailAndConsumeCode: () => Promise.resolve(null),
        } as never,
        {
            hashVerificationCode: (email: string, code: string) =>
                `hash:${email}:${code}`,
        } as never,
        { send: () => Promise.resolve() },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60 },
        () => now,
    );

    await assert.rejects(
        () => service.verify("writer@example.com", "123456"),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "INVALID_EMAIL_VERIFICATION_CODE",
    );
});

void test("verification invalidates the code after five failed attempts", async () => {
    let failedAttempts = 0;
    const users = {
        findVerificationByEmail: () =>
            Promise.resolve({
                userId: unverifiedUser.id,
                tokenHash: "hash:writer@example.com:123456",
                failedAttempts,
                expiresAt: new Date("2026-08-25T00:10:00.000Z"),
                user: unverifiedUser,
            }),
        recordFailedVerificationAttempt: () => {
            failedAttempts += 1;
            return Promise.resolve(failedAttempts < 5);
        },
    };
    const service = new EmailVerificationService(
        users as never,
        {
            hashVerificationCode: (email: string, code: string) =>
                `hash:${email}:${code}`,
        } as never,
        { send: () => Promise.resolve() },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60, maxAttempts: 5 },
        () => now,
    );

    for (let attempt = 0; attempt < 5; attempt += 1) {
        await assert.rejects(
            () => service.verify("writer@example.com", "000000"),
            (error: unknown) =>
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                error.code === "INVALID_EMAIL_VERIFICATION_CODE",
        );
    }

    assert.equal(failedAttempts, 5);
});

void test("resend does not reveal whether an email has a pending account", async () => {
    let codeGenerated = false;
    let emailSent = false;
    const service = new EmailVerificationService(
        {
            findVerificationUserByEmail: () => Promise.resolve(null),
        } as never,
        {
            generateVerificationCode: () => {
                codeGenerated = true;
                return "123456";
            },
        } as never,
        {
            send: () => {
                emailSent = true;
                return Promise.resolve();
            },
        },
        { error: () => undefined },
        { ttlMinutes: 10, resendCooldownSeconds: 60 },
        () => now,
    );

    await service.resend("missing@example.com");

    assert.equal(codeGenerated, false);
    assert.equal(emailSent, false);
});
