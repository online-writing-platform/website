import { PreferenceService } from "./application/preference.service.js";
import { PrismaPreferenceStore } from "./infrastructure/prisma-preference.store.js";

const store = new PrismaPreferenceStore();

export const preferenceModule = {
    service: new PreferenceService(store),
};
