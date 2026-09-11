import { prisma } from "../../db/index.js";

export interface PhoneOtpChallengeRecord {
    phoneNumber: string;
    codeHash: string;
    failedAttempts: number;
    expiresAt: Date;
    sentAt: Date;
}

export class PhoneOtpRepository {
    public findByPhoneNumber(
        phoneNumber: string,
    ): Promise<PhoneOtpChallengeRecord | null> {
        return prisma.phoneOtpChallenge.findUnique({
            where: { phoneNumber },
            select: {
                phoneNumber: true,
                codeHash: true,
                failedAttempts: true,
                expiresAt: true,
                sentAt: true,
            },
        });
    }

    public saveChallenge(input: {
        phoneNumber: string;
        codeHash: string;
        expiresAt: Date;
        sentAt: Date;
    }): Promise<PhoneOtpChallengeRecord> {
        return prisma.phoneOtpChallenge.upsert({
            where: { phoneNumber: input.phoneNumber },
            create: {
                phoneNumber: input.phoneNumber,
                codeHash: input.codeHash,
                failedAttempts: 0,
                expiresAt: input.expiresAt,
                sentAt: input.sentAt,
            },
            update: {
                codeHash: input.codeHash,
                failedAttempts: 0,
                expiresAt: input.expiresAt,
                sentAt: input.sentAt,
            },
            select: {
                phoneNumber: true,
                codeHash: true,
                failedAttempts: true,
                expiresAt: true,
                sentAt: true,
            },
        });
    }

    public async deleteChallenge(
        phoneNumber: string,
        codeHash?: string,
    ): Promise<void> {
        await prisma.phoneOtpChallenge.deleteMany({
            where: {
                phoneNumber,
                ...(codeHash ? { codeHash } : {}),
            },
        });
    }

    public async consumeChallenge(
        phoneNumber: string,
        codeHash: string,
        now: Date,
    ): Promise<boolean> {
        const result = await prisma.phoneOtpChallenge.deleteMany({
            where: {
                phoneNumber,
                codeHash,
                expiresAt: { gt: now },
            },
        });

        return result.count === 1;
    }

    public async recordFailedAttempt(
        phoneNumber: string,
        codeHash: string,
        maxAttempts: number,
    ): Promise<void> {
        await prisma.$transaction(async (transaction) => {
            const updated = await transaction.phoneOtpChallenge.updateMany({
                where: { phoneNumber, codeHash },
                data: { failedAttempts: { increment: 1 } },
            });

            if (updated.count !== 1) return;

            const current = await transaction.phoneOtpChallenge.findUnique({
                where: { phoneNumber },
                select: { codeHash: true, failedAttempts: true },
            });

            if (
                current &&
                current.codeHash === codeHash &&
                current.failedAttempts >= maxAttempts
            ) {
                await transaction.phoneOtpChallenge.deleteMany({
                    where: { phoneNumber, codeHash },
                });
            }
        });
    }
}
