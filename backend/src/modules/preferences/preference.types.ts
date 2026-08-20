export type ReaderThemeValue = "SYSTEM" | "LIGHT" | "DARK" | "SEPIA";

export interface UserPreferencesView {
    allowMatureContent: boolean;
    readerTheme: ReaderThemeValue;
    fontScale: number;
    lineHeight: number;
    notifyFollow: boolean;
    notifyComment: boolean;
    notifyReply: boolean;
    notifyVote: boolean;
    notifyChapterPublished: boolean;
    notifyModeration: boolean;
    notifySecurity: boolean;
}

export type UpdatePreferencesInput = Partial<UserPreferencesView>;

export interface PreferenceStore {
    get(userId: string): Promise<UserPreferencesView>;
    update(userId: string, input: UpdatePreferencesInput): Promise<UserPreferencesView>;
    getBirthDate(userId: string): Promise<Date | null>;
}
