import env from "../../config/env.js";
import logger from "../../config/logger.js";

import { AuthenticateSessionUseCase } from "./application/authenticate-session.use-case.js";
import { ChangePasswordUseCase } from "./application/change-password.use-case.js";
import { ChangeUsernameUseCase } from "./application/change-username.use-case.js";
import { ConfirmEmailChangeUseCase } from "./application/confirm-email-change.use-case.js";
import { DeleteAccountUseCase } from "./application/delete-account.use-case.js";
import { EmailVerificationService } from "./application/email-verification.service.js";
import { ListSessionsUseCase } from "./application/list-sessions.use-case.js";
import { LoginUserUseCase } from "./application/login-user.use-case.js";
import { LogoutUserUseCase } from "./application/logout-user.use-case.js";
import { RefreshSessionUseCase } from "./application/refresh-session.use-case.js";
import { RegisterUserUseCase } from "./application/register-user.use-case.js";
import { RequestEmailChangeUseCase } from "./application/request-email-change.use-case.js";
import { RequestPasswordResetUseCase } from "./application/request-password-reset.use-case.js";
import { ResetPasswordUseCase } from "./application/reset-password.use-case.js";
import { RevokeOtherSessionsUseCase } from "./application/revoke-other-sessions.use-case.js";
import { RevokeSessionUseCase } from "./application/revoke-session.use-case.js";
import type { AuthLogger } from "./application/auth.ports.js";

import { DefaultAccountEmailSender } from "./infrastructure/account-email.sender.js";
import { DefaultAuthSecurity } from "./infrastructure/auth-security.adapter.js";
import { DefaultPasswordRecoveryEmailSender } from "./infrastructure/password-recovery-email.sender.js";
import { DefaultVerificationEmailSender } from "./infrastructure/email-verification.sender.js";
import { PrismaAuthStore } from "./infrastructure/prisma-auth.store.js";

const store = new PrismaAuthStore();
const security = new DefaultAuthSecurity();
const verificationEmailSender = new DefaultVerificationEmailSender();
const passwordRecoveryEmailSender = new DefaultPasswordRecoveryEmailSender();
const accountEmailSender = new DefaultAccountEmailSender();

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
    changePassword: new ChangePasswordUseCase(
        store,
        security,
        passwordRecoveryEmailSender,
        authLogger,
    ),
    changeUsername: new ChangeUsernameUseCase(store, security),
    requestEmailChange: new RequestEmailChangeUseCase(
        store,
        security,
        accountEmailSender,
        {
            ttlMinutes: env.emailChangeTtlMinutes,
            resendCooldownSeconds: env.emailChangeResendCooldownSeconds,
        },
    ),
    confirmEmailChange: new ConfirmEmailChangeUseCase(store, security),
    listSessions: new ListSessionsUseCase(store),
    revokeSession: new RevokeSessionUseCase(store),
    revokeOtherSessions: new RevokeOtherSessionsUseCase(store),
    deleteAccount: new DeleteAccountUseCase(store, security),
    emailVerification,
};
