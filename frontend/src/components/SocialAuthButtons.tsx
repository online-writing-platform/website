import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import useAuth from "../hooks/useAuth";
import { getErrorMessage } from "../lib/error-message";
import type { SignupRequiredResult } from "../types/auth";

interface GoogleCredentialResponse {
  credential?: string;
}

interface AppleSignInResponse {
  authorization: {
    code: string;
    state?: string;
  };
  user?: {
    name?: {
      firstName?: string;
      lastName?: string;
    };
  };
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize(options: {
            client_id: string;
            callback(response: GoogleCredentialResponse): void;
          }): void;
          renderButton(
            parent: HTMLElement,
            options: Record<string, string | number>,
          ): void;
        };
      };
    };
    AppleID?: {
      auth: {
        init(options: {
          clientId: string;
          scope: string;
          redirectURI: string;
          state: string;
          usePopup: boolean;
        }): void;
        signIn(): Promise<AppleSignInResponse>;
      };
    };
  }
}

function loadScript(id: string, src: string): Promise<void> {
  const existing = document.getElementById(id) as HTMLScriptElement | null;
  if (existing?.dataset.loaded === "true") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const script = existing ?? document.createElement("script");
    script.id = id;
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      script.dataset.loaded = "true";
      resolve();
    };
    script.onerror = () => reject(new Error(`Could not load ${src}`));
    if (!existing) document.head.appendChild(script);
  });
}

function displayNameFromApple(response: AppleSignInResponse): string | undefined {
  const first = response.user?.name?.firstName?.trim() ?? "";
  const last = response.user?.name?.lastName?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  return full || undefined;
}

function goToSignup(
  navigate: ReturnType<typeof useNavigate>,
  result: SignupRequiredResult,
): void {
  navigate("/complete-signup", {
    replace: true,
    state: result,
  });
}

export default function SocialAuthButtons() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithGoogle, loginWithApple } = useAuth();
  const googleHost = useRef<HTMLDivElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleBusy, setAppleBusy] = useState(false);

  const googleClientId = (
    import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined
  )?.trim();
  const appleClientId = (
    import.meta.env.VITE_APPLE_CLIENT_ID as string | undefined
  )?.trim();
  const appleRedirectUri = (
    import.meta.env.VITE_APPLE_REDIRECT_URI as string | undefined
  )?.trim();

  useEffect(() => {
    if (!googleClientId || !googleHost.current) return;
    let cancelled = false;

    void loadScript("google-identity-services", "https://accounts.google.com/gsi/client")
      .then(() => {
        if (cancelled || !window.google || !googleHost.current) return;
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback(response) {
            if (!response.credential) return;
            setError(null);
            void loginWithGoogle(response.credential)
              .then((result) => {
                if (result.status === "signup_required") {
                  goToSignup(navigate, result);
                } else {
                  navigate("/", { replace: true });
                }
              })
              .catch((cause) => setError(getErrorMessage(cause)));
          },
        });
        googleHost.current.replaceChildren();
        window.google.accounts.id.renderButton(googleHost.current, {
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: 320,
        });
      })
      .catch((cause) => setError(getErrorMessage(cause)));

    return () => {
      cancelled = true;
    };
  }, [googleClientId, loginWithGoogle, navigate]);

  async function handleApple(): Promise<void> {
    if (!appleClientId || !appleRedirectUri) return;
    setAppleBusy(true);
    setError(null);

    try {
      await loadScript(
        "apple-signin-js",
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
      );
      if (!window.AppleID) throw new Error("Apple Sign In did not initialize.");

      const state = crypto.randomUUID();
      window.AppleID.auth.init({
        clientId: appleClientId,
        scope: "name email",
        redirectURI: appleRedirectUri,
        state,
        usePopup: true,
      });
      const response = await window.AppleID.auth.signIn();
      if (response.authorization.state && response.authorization.state !== state) {
        throw new Error("Apple Sign In state validation failed.");
      }

      const result = await loginWithApple(
        response.authorization.code,
        displayNameFromApple(response),
      );
      if (result.status === "signup_required") {
        goToSignup(navigate, result);
      } else {
        navigate("/", { replace: true });
      }
    } catch (cause) {
      setError(getErrorMessage(cause));
    } finally {
      setAppleBusy(false);
    }
  }

  if (!googleClientId && !(appleClientId && appleRedirectUri)) return null;

  return (
    <div className="external-auth-options">
      {error ? (
        <p className="form-message form-message-error" role="alert">
          {error}
        </p>
      ) : null}
      {googleClientId ? <div ref={googleHost} className="google-auth-host" /> : null}
      {appleClientId && appleRedirectUri ? (
        <button
          type="button"
          className="button external-auth-apple"
          disabled={appleBusy}
          onClick={() => void handleApple()}
        >
          {appleBusy
            ? t("auth.social.connectingApple")
            : t("auth.social.continueApple")}
        </button>
      ) : null}
    </div>
  );
}
