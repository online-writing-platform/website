import { prisma } from "../../db/index.js";

import type {
    UpdatePreferencesInput,
    UserPreferencesView,
} from "./preference.types.js";
import type { PreferenceStore } from "./preference.types.js";

const preferenceSelect = {
    allowMatureContent: true,
    readerTheme: true,
    fontScale: true,
    lineHeight: true,
    notifyFollow: true,
    notifyComment: true,
    notifyReply: true,
    notifyVote: true,
    notifyChapterPublished: true,
    notifyModeration: true,
    notifySecurity: true,
} as const;

export class PreferenceRepository implements PreferenceStore {
    public async get(userId: string): Promise<UserPreferencesView> {
        return prisma.userPreference.upsert({
            where: { userId },
            update: {},
            create: { userId },
            select: preferenceSelect,
        });
    }

    public update(
        userId: string,
        input: UpdatePreferencesInput,
    ): Promise<UserPreferencesView> {
        return prisma.userPreference.upsert({
            where: { userId },
            create: { userId, ...input },
            update: input,
            select: preferenceSelect,
        });
    }

    public async getBirthDate(userId: string): Promise<Date | null> {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { birthDate: true },
        });

        return user?.birthDate ?? null;
    }
}
