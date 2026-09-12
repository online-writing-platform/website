import { useCallback, useEffect, useState } from "react";

import type { AuthContextValue, AuthStatus } from "../../../context/AuthContext";
import { getErrorMessage } from "../../../lib/error-message";
import { getLibraryStatus, setLibraryStatus } from "../api";

interface LibraryState {
  key: string;
  inLibrary: boolean;
  message: string | null;
}

interface UseReaderLibraryOptions {
  status: AuthStatus;
  userId?: string;
  storyId?: string;
  request: AuthContextValue["request"];
  addedMessage: string;
  removedMessage: string;
}

export default function useReaderLibrary({
  status,
  userId,
  storyId,
  request,
  addedMessage,
  removedMessage,
}: UseReaderLibraryOptions) {
  const libraryKey =
    status === "authenticated" && userId && storyId
      ? `${userId}:${storyId}`
      : null;
  const [state, setState] = useState<LibraryState | null>(null);
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const isInLibrary =
    libraryKey && state?.key === libraryKey ? state.inLibrary : null;
  const message = libraryKey && state?.key === libraryKey ? state.message : null;
  const pending = pendingKey === libraryKey;

  useEffect(() => {
    if (!libraryKey || !storyId) {
      return;
    }

    const controller = new AbortController();
    const currentKey = libraryKey;

    void getLibraryStatus(request, storyId, controller.signal)
      .then((response) => {
        if (!controller.signal.aborted) {
          setState({
            key: currentKey,
            inLibrary: response.data.inLibrary,
            message: null,
          });
        }
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          setState({
            key: currentKey,
            inLibrary: false,
            message: getErrorMessage(cause),
          });
        }
      });

    return () => controller.abort();
  }, [libraryKey, request, storyId]);

  const toggleLibrary = useCallback(async (): Promise<void> => {
    if (!libraryKey || !storyId || isInLibrary === null || pending) {
      return;
    }

    const shouldAdd = !isInLibrary;

    setPendingKey(libraryKey);
    setState({ key: libraryKey, inLibrary: isInLibrary, message: null });

    try {
      await setLibraryStatus(request, storyId, shouldAdd);
      setState({
        key: libraryKey,
        inLibrary: shouldAdd,
        message: shouldAdd ? addedMessage : removedMessage,
      });
    } catch (cause) {
      setState({
        key: libraryKey,
        inLibrary: isInLibrary,
        message: getErrorMessage(cause),
      });
    } finally {
      setPendingKey((current) => (current === libraryKey ? null : current));
    }
  }, [
    addedMessage,
    isInLibrary,
    libraryKey,
    pending,
    removedMessage,
    request,
    storyId,
  ]);

  return { isInLibrary, pending, message, toggleLibrary };
}
