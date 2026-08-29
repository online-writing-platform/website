import { useCallback, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";

import StartWritingContext, {
  type StartWritingContextValue,
} from "../context/StartWritingContext";

function ignoreClose(): void {}

export default function useStartWriting() {
  const context = useContext(StartWritingContext);
  const navigate = useNavigate();

  const openFallback = useCallback(() => {
    navigate("/write");
  }, [navigate]);

  return useMemo<StartWritingContextValue>(
    () =>
      context ?? {
        openStartWriting: openFallback,
        closeStartWriting: ignoreClose,
      },
    [context, openFallback],
  );
}
