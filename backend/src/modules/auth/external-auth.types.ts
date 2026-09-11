import type { AuthenticationResult } from "./auth.types.js";

export type ExternalAuthProvider = "PHONE" | "GOOGLE" | "APPLE";

export type ExternalAuthResult =
    | {
          status: "authenticated";
          authentication: AuthenticationResult;
      }
    | {
          status: "signup_required";
          provider: ExternalAuthProvider;
          signupToken: string;
          email: string | null;
          displayName: string | null;
      };
