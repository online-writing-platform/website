export type ReaderTheme = "SYSTEM" | "LIGHT" | "DARK" | "SEPIA";

export interface ReaderSettings {
  theme: ReaderTheme;
  fontScale: number;
  lineHeight: number;
}

export interface PreferenceResponse {
  data: {
    preferences: {
      readerTheme: ReaderTheme;
      fontScale: number;
      lineHeight: number;
    };
  };
}

export interface LibraryStatusResponse {
  data: {
    inLibrary: boolean;
  };
}

export const DEFAULT_READER_SETTINGS: ReaderSettings = {
  theme: "SYSTEM",
  fontScale: 1,
  lineHeight: 1.75,
};
