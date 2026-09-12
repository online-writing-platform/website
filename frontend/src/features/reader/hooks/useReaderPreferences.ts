import { useCallback, useEffect, useState } from "react";

import type { AuthContextValue, AuthStatus } from "../../../context/AuthContext";
import { getReaderPreferences, updateReaderPreferences } from "../api";
import {
  DEFAULT_READER_SETTINGS,
  type ReaderSettings,
} from "../types";

interface SettingsState {
  key: string;
  value: ReaderSettings;
}

interface UseReaderPreferencesOptions {
  status: AuthStatus;
  userId?: string;
  request: AuthContextValue["request"];
}

export default function useReaderPreferences({
  status,
  userId,
  request,
}: UseReaderPreferencesOptions) {
  const settingsKey =
    status === "authenticated" && userId ? `user:${userId}` : "anonymous";
  const [settingsState, setSettingsState] = useState<SettingsState>(() => ({
    key: settingsKey,
    value: DEFAULT_READER_SETTINGS,
  }));
  const settings =
    settingsState.key === settingsKey
      ? settingsState.value
      : DEFAULT_READER_SETTINGS;

  useEffect(() => {
    if (status !== "authenticated" || settingsKey === "anonymous") {
      return;
    }

    const controller = new AbortController();
    const currentKey = settingsKey;

    void getReaderPreferences(request, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setSettingsState({
            key: currentKey,
            value: {
              theme: response.data.preferences.readerTheme,
              fontScale: response.data.preferences.fontScale,
              lineHeight: response.data.preferences.lineHeight,
            },
          });
        }
      })
      .catch(() => undefined);

    return () => controller.abort();
  }, [request, settingsKey, status]);

  const updateSettings = useCallback(
    async (next: Partial<ReaderSettings>): Promise<void> => {
      const value = { ...settings, ...next };

      setSettingsState({ key: settingsKey, value });

      if (status === "authenticated") {
        await updateReaderPreferences(request, value).catch(() => undefined);
      }
    },
    [request, settings, settingsKey, status],
  );

  return { settings, updateSettings };
}
