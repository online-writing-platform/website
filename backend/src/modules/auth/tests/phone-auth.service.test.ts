import assert from "node:assert/strict";
import test from "node:test";

import { PhoneAuthService } from "../phone-auth.service.js";

const now = new Date("2026-09-09T08:00:00.000Z");
const phoneNumber = "09123456789";
const options = {
    ttlMinutes: 5,
    resendCooldownSeconds: 60,
    maxAttempts: 5,
    signupGrantTtlMinutes: 15,
};

void test("requesting a phone OTP stores only its hash and sends the plain code", async () => {
    let saved:
        | {
              phoneNumber: string;
              codeHash: string;
              expiresAt: Date;
              sentAt: Date;
          }
        | undefined;
    let sent: { phoneNumber: string; code: string } | undefined;

    const service = new PhoneAuthService(
        {
            findByPhoneNumber: () => Promise.resolve(null),
            saveChallenge: (input: {
                phoneNumber: string;
                codeHash: string;
                expiresAt: Date;
                sentAt: Date;
            }) => {
                saved = input;
                return Promise.resolve({
                    ...input,
                    failedAttempts: 0,
                });
            },
        } as never,
        {} as never,
        {
            generateVerificationCode: () => "654321",
            hashPhoneOtpCode: (phone: string, code: string) =>
                `hash:${phone}:${code}`,
        } as never,
        {
            sendOtp: (phone: string, code: string) => {
                sent = { phoneNumber: phone, code };
                return Promise.resolve();
            },
        },
        {} as never,
        options,
        () => now,
    );

    await service.requestCode(phoneNumber);

    assert.equal(saved?.phoneNumber, phoneNumber);
    assert.equal(saved?.codeHash, `hash:${phoneNumber}:654321`);
    assert.notEqual(saved?.codeHash, "654321");
    assert.equal(saved?.sentAt, now);
    assert.equal(saved?.expiresAt.toISOString(), "2026-09-09T08:05:00.000Z");
    assert.deepEqual(sent, { phoneNumber, code: "654321" });
});

void test("requesting another OTP during the cooldown is rejected", async () => {
    let generated = false;
    const service = new PhoneAuthService(
        {
            findByPhoneNumber: () =>
                Promise.resolve({
                    phoneNumber,
                    codeHash: "hash",
                    failedAttempts: 0,
                    sentAt: new Date("2026-09-09T07:59:30.000Z"),
                    expiresAt: new Date("2026-09-09T08:04:30.000Z"),
                }),
        } as never,
        {} as never,
        {
            generateVerificationCode: () => {
                generated = true;
                return "654321";
            },
        } as never,
        {} as never,
        {} as never,
        options,
        () => now,
    );

    await assert.rejects(
        () => service.requestCode(phoneNumber),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "PHONE_OTP_COOLDOWN",
    );
    assert.equal(generated, false);
});

void test("an invalid phone OTP records a failed attempt", async () => {
    let failedAttemptRecorded = false;
    const service = new PhoneAuthService(
        {
            findByPhoneNumber: () =>
                Promise.resolve({
                    phoneNumber,
                    codeHash: "expected-hash",
                    failedAttempts: 0,
                    sentAt: now,
                    expiresAt: new Date("2026-09-09T08:05:00.000Z"),
                }),
            recordFailedAttempt: () => {
                failedAttemptRecorded = true;
                return Promise.resolve();
            },
        } as never,
        {} as never,
        {
            verifyPhoneOtpCode: () => false,
        } as never,
        {} as never,
        {} as never,
        options,
        () => now,
    );

    await assert.rejects(
        () => service.verifyCode(phoneNumber, "000000", {}),
        (error: unknown) =>
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "INVALID_OR_EXPIRED_PHONE_OTP",
    );
    assert.equal(failedAttemptRecorded, true);
});

void test("a verified new phone number becomes a short-lived signup grant", async () => {
    let grant:
        | {
              provider: string;
              providerSubject: string;
              tokenHash: string;
              expiresAt: Date;
          }
        | undefined;

    const service = new PhoneAuthService(
        {
            findByPhoneNumber: () =>
                Promise.resolve({
                    phoneNumber,
                    codeHash: "expected-hash",
                    failedAttempts: 0,
                    sentAt: now,
                    expiresAt: new Date("2026-09-09T08:05:00.000Z"),
                }),
            consumeChallenge: () => Promise.resolve(true),
        } as never,
        {
            findUserByIdentity: () => Promise.resolve(null),
            upsertSignupGrant: (input: {
                provider: string;
                providerSubject: string;
                tokenHash: string;
                expiresAt: Date;
            }) => {
                grant = input;
                return Promise.resolve();
            },
        } as never,
        {
            verifyPhoneOtpCode: () => true,
            generateSignupGrantToken: () => "signup-token",
            hashSignupGrantToken: (token: string) => `hash:${token}`,
        } as never,
        {} as never,
        {} as never,
        options,
        () => now,
    );

    const result = await service.verifyCode(phoneNumber, "654321", {});

    assert.equal(result.status, "signup_required");
    if (result.status !== "signup_required") return;
    assert.equal(result.provider, "PHONE");
    assert.equal(result.signupToken, "signup-token");
    assert.equal(grant?.provider, "PHONE");
    assert.equal(grant?.providerSubject, phoneNumber);
    assert.equal(grant?.tokenHash, "hash:signup-token");
    assert.equal(grant?.expiresAt.toISOString(), "2026-09-09T08:15:00.000Z");
});
