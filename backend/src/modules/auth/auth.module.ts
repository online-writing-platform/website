import env from "../../config/env.js";
import logger from "../../config/logger.js";

import { AuthenticateSessionUseCase } from "./application/authenticate-session.use-case.js";

import { EmailVerificationService } from "./application/email-verification.service.js";

import { LoginUserUseCase } from "./application/login-user.use-case.js";

import { LogoutUserUseCase } from "./application/logout-user.use-case.js";

import { RefreshSessionUseCase } from "./application/refresh-session.use-case.js";

import { RegisterUserUseCase } from "./application/register-user.use-case.js";

import { RequestPasswordResetUseCase } from "./application/request-password-reset.use-case.js";

import { ResetPasswordUseCase } from "./application/reset-password.use-case.js";

import type { AuthLogger } from "./application/auth.ports.js";

import { DefaultAuthSecurity } from "./infrastructure/auth-security.adapter.js";

import { DefaultPasswordRecoveryEmailSender } from "./infrastructure/password-recovery-email.sender.js";

import { DefaultVerificationEmailSender } from "./infrastructure/email-verification.sender.js";

import { PrismaAuthStore } from "./infrastructure/prisma-auth.store.js";

const store = new PrismaAuthStore();

const security = new DefaultAuthSecurity();

const verificationEmailSender = new DefaultVerificationEmailSender();

const passwordRecoveryEmailSender = new DefaultPasswordRecoveryEmailSender();

const authLogger: AuthLogger = {
    error(error, context, message) {
        logger.error(
            {
                ...context,

                err: error,
            },
            message,
        );
    },
};

const emailVerification = new EmailVerificationService(
    store,
    security,
    verificationEmailSender,
    authLogger,
    {
        ttlHours: env.emailVerificationTtlHours,

        resendCooldownSeconds: env.emailVerificationResendCooldownSeconds,
    },
);

export const authModule = {
    registerUser: new RegisterUserUseCase(
        store,
        security,
        emailVerification,
        env.termsVersion,
    ),

    loginUser: new LoginUserUseCase(store, security),

    refreshSession: new RefreshSessionUseCase(store, security),

    logoutUser: new LogoutUserUseCase(store, security),

    authenticateSession: new AuthenticateSessionUseCase(store, security),

    requestPasswordReset: new RequestPasswordResetUseCase(
        store,
        security,
        passwordRecoveryEmailSender,
        authLogger,
        {
            ttlMinutes: env.passwordResetTtlMinutes,

            resendCooldownSeconds: env.passwordResetResendCooldownSeconds,
        },
    ),

    resetPassword: new ResetPasswordUseCase(
        store,
        security,
        passwordRecoveryEmailSender,
        authLogger,
    ),

    emailVerification,
};
