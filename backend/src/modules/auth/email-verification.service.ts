import env from "../../config/env.js";
import logger from "../../config/logger.js";

import { prisma } from "../../db/index.js";

import AppError from "../../errors/app-error.js";

import {
    generateOpaqueToken,
    hashOpaqueToken,
} from "../../security/opaque-token.js";

import { sendEmailVerificationMessage } from "./auth-email.js";

const EMAIL_VERIFICATION_TOKEN_BYTES = 32;

interface IssuedVerificationToken {
    token: string;
    tokenHash: string;
}

function calculateVerificationExpiration(now: Date): Date {
    return new Date(
        now.getTime() + env.emailVerificationTtlHours * 60 * 60 * 1000,
    );
}

function calculateCooldownRemainingSeconds(sentAt: Date, now: Date): number {
    const cooldownMilliseconds =
        env.emailVerificationResendCooldownSeconds * 1000;

    const elapsedMilliseconds = now.getTime() - sentAt.getTime();

    return Math.max(
        0,
        Math.ceil((cooldownMilliseconds - elapsedMilliseconds) / 1000),
    );
}

async function issueVerificationToken(
    userId: string,
    enforceCooldown: boolean,
): Promise<IssuedVerificationToken> {
    const now = new Date();

    if (enforceCooldown) {
        const existingToken = await prisma.emailVerificationToken.findUnique({
            where: {
                userId,
            },

            select: {
                sentAt: true,
            },
        });

        if (existingToken) {
            const retryAfterSeconds = calculateCooldownRemainingSeconds(
                existingToken.sentAt,
                now,
            );

            if (retryAfterSeconds > 0) {
                throw AppError.tooManyRequests(
                    "A verification email was sent recently.",
                    "EMAIL_VERIFICATION_COOLDOWN",
                    {
                        retryAfterSeconds,
                    },
                );
            }
        }
    }

    const token = generateOpaqueToken(EMAIL_VERIFICATION_TOKEN_BYTES);

    const tokenHash = hashOpaqueToken(token);

    const expiresAt = calculateVerificationExpiration(now);

    await prisma.emailVerificationToken.upsert({
        where: {
            userId,
        },

        create: {
            userId,

            tokenHash,

            expiresAt,

            sentAt: now,
        },

        update: {
            tokenHash,

            expiresAt,

            sentAt: now,
        },
    });

    return {
        token,
        tokenHash,
    };
}

export async function trySendInitialEmailVerification(
    userId: string,
    email: string,
): Promise<void> {
    try {
        const { token } = await issueVerificationToken(userId, false);

        await sendEmailVerificationMessage(email, token);
    } catch (error) {
        logger.error(
            {
                err: error,

                userId,
            },
            "Failed to send initial email verification message",
        );
    }
}

export async function resendEmailVerification(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },

        select: {
            email: true,

            emailVerifiedAt: true,

            status: true,
        },
    });

    if (!user || user.status === "DELETED") {
        throw AppError.notFound(
            "The user account was not found.",
            "USER_NOT_FOUND",
        );
    }

    if (user.emailVerifiedAt !== null) {
        throw AppError.conflict(
            "The email address is already verified.",
            "EMAIL_ALREADY_VERIFIED",
        );
    }

    const { token, tokenHash } = await issueVerificationToken(userId, true);

    try {
        await sendEmailVerificationMessage(user.email, token);
    } catch (error) {
        await prisma.emailVerificationToken.deleteMany({
            where: {
                userId,

                tokenHash,
            },
        });

        logger.error(
            {
                err: error,

                userId,
            },
            "Failed to resend email verification message",
        );

        throw AppError.serviceUnavailable(
            "The verification email could not be sent.",
            "EMAIL_DELIVERY_FAILED",
            error,
        );
    }
}

export async function verifyEmailAddress(token: string): Promise<void> {
    const tokenHash = hashOpaqueToken(token);

    const now = new Date();

    const verification = await prisma.emailVerificationToken.findUnique({
        where: {
            tokenHash,
        },

        select: {
            userId: true,

            expiresAt: true,

            user: {
                select: {
                    status: true,

                    emailVerifiedAt: true,
                },
            },
        },
    });

    if (!verification || verification.user.status === "DELETED") {
        throw AppError.badRequest(
            "The verification token is invalid.",
            "INVALID_EMAIL_VERIFICATION_TOKEN",
        );
    }

    if (verification.expiresAt <= now) {
        await prisma.emailVerificationToken.deleteMany({
            where: {
                tokenHash,
            },
        });

        throw AppError.badRequest(
            "The verification token has expired.",
            "EMAIL_VERIFICATION_TOKEN_EXPIRED",
        );
    }

    await prisma.$transaction(async (transaction) => {
        if (verification.user.emailVerifiedAt === null) {
            await transaction.user.update({
                where: {
                    id: verification.userId,
                },

                data: {
                    emailVerifiedAt: now,
                },
            });
        }

        await transaction.emailVerificationToken.deleteMany({
            where: {
                userId: verification.userId,
            },
        });
    });
}
