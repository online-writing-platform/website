import type {
    UpdatePreferencesInput,
    UserPreferencesView,
} from "../domain/preference.types.js";

export interface PreferenceStore {
    get(userId: string): Promise<UserPreferencesView>;
    update(userId: string, input: UpdatePreferencesInput): Promise<UserPreferencesView>;
    getBirthDate(userId: string): Promise<Date | null>;
}
