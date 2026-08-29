import { createContext } from "react";

export interface StartWritingContextValue {
  openStartWriting: () => void;
  closeStartWriting: () => void;
}

const StartWritingContext = createContext<StartWritingContextValue | null>(
  null,
);

export default StartWritingContext;
