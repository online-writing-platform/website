import {
    SignJWT,
    createRemoteJWKSet,
    importPKCS8,
    jwtVerify,
    type JWTPayload,
} from "jose";

import env from "../../config/env.js";
import AppError from "../../errors/app-error.js";
import type { AuthProvider } from "../../generated/prisma/enums.js";
import type { AuthenticatedSessionService } from "./authenticated-session.service.js";
import type { AuthSecurity, ClientInformation } from "./auth.types.js";
import type { ExternalAuthResult } from "./external-auth.types.js";
import type { IdentityAuthRepository } from "./identity-auth.repo.js";

const googleJwks = createRemoteJWKSet(
    new URL("https://www.googleapis.com/oauth2/v3/certs"),
);
const appleJwks = createRemoteJWKSet(
    new URL("https://appleid.apple.com/auth/keys"),
);

interface FederatedProfile {
    provider: "GOOGLE" | "APPLE";
    subject: string;
    email: string | null;
    emailVerified: boolean;
    displayName: string | null;
}

function claimString(payload: JWTPayload, name: string): string | null {
    const value = payload[name];
    return typeof value === "string" && value.trim() ? value.trim() : null;
}

export class FederatedAuthService {
    public constructor(
        private readonly identities: IdentityAuthRepository,
        private readonly security: AuthSecurity,
        private readonly authenticatedSessions: AuthenticatedSessionService,
        private readonly signupGrantTtlMinutes: number,
    ) {}

    private async finish(
        profile: FederatedProfile,
        clientInformation: ClientInformation,
    ): Promise<ExternalAuthResult> {
        const provider: AuthProvider = profile.provider;
        const existing = await this.identities.findUserByIdentity(
            provider,
            profile.subject,
        );

        if (existing) {
            if (existing.status === "SUSPENDED") {
                throw AppError.forbidden(
                    "This account has been suspended.",
                    "ACCOUNT_SUSPENDED",
                );
            }
            if (existing.status !== "ACTIVE") {
                throw AppError.unauthorized(
                    "The account is no longer active.",
                    "INACTIVE_ACCOUNT",
                );
            }

            return {
                status: "authenticated",
                authentication: await this.authenticatedSessions.create(
                    existing,
                    clientInformation,
                ),
            };
        }

        if (profile.email) {
            const emailOwner = await this.identities.findUserIdByEmail(
                profile.email.toLowerCase(),
            );
            if (emailOwner) {
                throw AppError.conflict(
                    "An account with this email already exists. Sign in to that account before linking this provider.",
                    "ACCOUNT_LINK_REQUIRED",
                    { email: profile.email },
                );
            }
        }

        const signupToken = this.security.generateSignupGrantToken();
        const now = new Date();
        await this.identities.upsertSignupGrant({
            provider,
            providerSubject: profile.subject,
            email: profile.email?.toLowerCase() ?? null,
            emailVerified: profile.emailVerified,
            displayName: profile.displayName?.slice(0, 80) ?? null,
            tokenHash: this.security.hashSignupGrantToken(signupToken),
            expiresAt: new Date(
                now.getTime() + this.signupGrantTtlMinutes * 60_000,
            ),
        });

        return {
            status: "signup_required",
            provider: profile.provider,
            signupToken,
            email: profile.email,
            displayName: profile.displayName,
        };
    }

    public async authenticateGoogle(
        credential: string,
        clientInformation: ClientInformation,
    ): Promise<ExternalAuthResult> {
        if (!env.googleClientId) {
            throw AppError.serviceUnavailable(
                "Google sign-in is not configured.",
                "GOOGLE_AUTH_NOT_CONFIGURED",
            );
        }

        let payload: JWTPayload;
        try {
            ({ payload } = await jwtVerify(credential, googleJwks, {
                issuer: ["https://accounts.google.com", "accounts.google.com"],
                audience: env.googleClientId,
                algorithms: ["RS256"],
            }));
        } catch {
            throw AppError.unauthorized(
                "The Google credential is invalid or expired.",
                "INVALID_GOOGLE_CREDENTIAL",
            );
        }

        if (!payload.sub) {
            throw AppError.unauthorized(
                "The Google credential is invalid.",
                "INVALID_GOOGLE_CREDENTIAL",
            );
        }

        const email = claimString(payload, "email");
        const name = claimString(payload, "name");

        return this.finish(
            {
                provider: "GOOGLE",
                subject: payload.sub,
                email,
                emailVerified: payload.email_verified === true,
                displayName: name,
            },
            clientInformation,
        );
    }

    private async createAppleClientSecret(): Promise<string> {
        if (
            !env.appleClientId ||
            !env.appleTeamId ||
            !env.appleKeyId ||
            !env.applePrivateKey
        ) {
            throw AppError.serviceUnavailable(
                "Apple sign-in is not configured.",
                "APPLE_AUTH_NOT_CONFIGURED",
            );
        }

        const key = await importPKCS8(env.applePrivateKey, "ES256");

        return new SignJWT({})
            .setProtectedHeader({ alg: "ES256", kid: env.appleKeyId })
            .setIssuer(env.appleTeamId)
            .setSubject(env.appleClientId)
            .setAudience("https://appleid.apple.com")
            .setIssuedAt()
            .setExpirationTime("5m")
            .sign(key);
    }

    public async authenticateApple(
        code: string,
        displayName: string | undefined,
        clientInformation: ClientInformation,
    ): Promise<ExternalAuthResult> {
        if (!env.appleClientId || !env.appleRedirectUri) {
            throw AppError.serviceUnavailable(
                "Apple sign-in is not configured.",
                "APPLE_AUTH_NOT_CONFIGURED",
            );
        }

        const clientSecret = await this.createAppleClientSecret();
        const body = new URLSearchParams({
            client_id: env.appleClientId,
            client_secret: clientSecret,
            code,
            grant_type: "authorization_code",
            redirect_uri: env.appleRedirectUri,
        });
        const response = await fetch("https://appleid.apple.com/auth/token", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body,
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            throw AppError.unauthorized(
                "The Apple authorization code is invalid or expired.",
                "INVALID_APPLE_AUTHORIZATION",
            );
        }

        const tokens = (await response.json()) as { id_token?: unknown };
        if (typeof tokens.id_token !== "string") {
            throw AppError.unauthorized(
                "Apple did not return a valid identity token.",
                "INVALID_APPLE_AUTHORIZATION",
            );
        }

        let payload: JWTPayload;
        try {
            ({ payload } = await jwtVerify(tokens.id_token, appleJwks, {
                issuer: "https://appleid.apple.com",
                audience: env.appleClientId,
                algorithms: ["RS256"],
            }));
        } catch {
            throw AppError.unauthorized(
                "The Apple identity token is invalid.",
                "INVALID_APPLE_AUTHORIZATION",
            );
        }

        if (!payload.sub) {
            throw AppError.unauthorized(
                "The Apple identity token is invalid.",
                "INVALID_APPLE_AUTHORIZATION",
            );
        }

        const email = claimString(payload, "email");
        const emailVerifiedClaim = payload.email_verified;
        const emailVerified =
            emailVerifiedClaim === true || emailVerifiedClaim === "true";

        return this.finish(
            {
                provider: "APPLE",
                subject: payload.sub,
                email,
                emailVerified,
                displayName: displayName?.trim().slice(0, 80) || null,
            },
            clientInformation,
        );
    }
}
