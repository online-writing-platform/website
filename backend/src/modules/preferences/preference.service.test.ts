import assert from "node:assert/strict";
import test from "node:test";

import AppError from "../../errors/app-error.js";
import type { PreferenceStore } from "./preference.types.js";
import { PreferenceService } from "./preference.service.js";

const defaultPreferences = {
    allowMatureContent: false,
    readerTheme: "SYSTEM" as const,
    fontScale: 1,
    lineHeight: 1.75,
    notifyFollow: true,
    notifyComment: true,
    notifyReply: true,
    notifyVote: true,
    notifyChapterPublished: true,
    notifyModeration: true,
    notifySecurity: true,
};

function storeForBirthDate(birthDate: Date): PreferenceStore {
    return {
        get: () => Promise.resolve(defaultPreferences),
        getBirthDate: () => Promise.resolve(birthDate),
        update: (_userId, input) =>
            Promise.resolve({
                ...defaultPreferences,
                ...input,
            }),
    };
}

void test("minor accounts cannot enable mature content", async () => {
    const currentYear = new Date().getUTCFullYear();
    const service = new PreferenceService(
        storeForBirthDate(new Date(`${currentYear - 10}-01-01T00:00:00Z`)),
    );

    await assert.rejects(
        () => service.update("user", { allowMatureContent: true }),
        (error: unknown) => {
            if (!(error instanceof AppError)) return false;
            assert.equal(error.code, "MATURE_CONTENT_AGE_RESTRICTED");
            return true;
        },
    );
});

void test("non-age-sensitive reader preferences remain editable", async () => {
    const service = new PreferenceService(
        storeForBirthDate(new Date("2015-01-01T00:00:00Z")),
    );

    const result = await service.update("user", {
        readerTheme: "SEPIA",
        fontScale: 1.15,
    });

    assert.equal(result.readerTheme, "SEPIA");
    assert.equal(result.fontScale, 1.15);
});
