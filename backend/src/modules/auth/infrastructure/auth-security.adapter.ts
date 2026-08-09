import { hashPassword, verifyPassword } from "../../../security/password.js";

import {
    calculateSessionExpiration,
    createAccessToken,
    generateRefreshToken,
    hashRefreshToken,
    verifyAccessToken,
} from "../../../security/token.js";

import {
    generateOpaqueToken,
    hashOpaqueToken,
} from "../../../security/opaque-token.js";

import type { AuthSecurity } from "../application/auth.ports.js";
import type { AccessTokenContext } from "../domain/auth.types.js";

const EMAIL_VERIFICATION_TOKEN_BYTES = 32;
const PASSWORD_RESET_TOKEN_BYTES = 32;
const EMAIL_CHANGE_TOKEN_BYTES = 32;

export class DefaultAuthSecurity implements AuthSecurity {
    public hashPassword(password: string): Promise<string> {
        return hashPassword(password);
    }

    public verifyPassword(
        passwordHash: string,
        password: string,
    ): Promise<boolean> {
        return verifyPassword(passwordHash, password);
    }

    public createAccessToken(context: AccessTokenContext): Promise<string> {
        return createAccessToken(context);
    }

    public verifyAccessToken(token: string): Promise<AccessTokenContext> {
        return verifyAccessToken(token);
    }

    public generateRefreshToken(): string {
        return generateRefreshToken();
    }

    public hashRefreshToken(token: string): string {
        return hashRefreshToken(token);
    }

    public calculateSessionExpiration(): Date {
        return calculateSessionExpiration();
    }

    public generateVerificationToken(): string {
        return generateOpaqueToken(EMAIL_VERIFICATION_TOKEN_BYTES);
    }

    public hashVerificationToken(token: string): string {
        return hashOpaqueToken(token);
    }

    public generatePasswordResetToken(): string {
        return generateOpaqueToken(PASSWORD_RESET_TOKEN_BYTES);
    }

    public hashPasswordResetToken(token: string): string {
        return hashOpaqueToken(token);
    }

    public generateEmailChangeToken(): string {
        return generateOpaqueToken(EMAIL_CHANGE_TOKEN_BYTES);
    }

    public hashEmailChangeToken(token: string): string {
        return hashOpaqueToken(token);
    }
}
