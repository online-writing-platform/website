import env from "../../config/env.js";
import logger from "../../config/logger.js";
import { AuthRepository } from "./auth.repo.js";
import { DefaultAuthSecurity } from "./auth.security.js";
import { QueuedVerificationEmailSender } from "./verification-email-outbox.js";
import { AuthenticatedSessionService } from "./authenticated-session.service.js";
import { CompleteEmailVerificationUseCase } from "./complete-email-verification.service.js";
import { EmailVerificationService } from "./email-verification.service.js";
import { LoginUserUseCase } from "./login-user.service.js";
import { RegisterUserUseCase } from "./register-user.service.js";
import { SessionRepository } from "./session.repo.js";
import type {
    AuthLogger,
    ClientInformation,
    LoginUserInput,
    RegisterUserInput,
} from "./auth.types.js";

export { mapAuthenticatedUser } from "./auth-user.mapper.js";
export { AuthenticatedSessionService } from "./authenticated-session.service.js";
export { CompleteEmailVerificationUseCase } from "./complete-email-verification.service.js";
export { LoginUserUseCase } from "./login-user.service.js";
export { RegisterUserUseCase } from "./register-user.service.js";

const users = new AuthRepository();
const sessions = new SessionRepository();
const security = new DefaultAuthSecurity();
const verificationEmailSender = new QueuedVerificationEmailSender();
const authLogger: AuthLogger = {
    error(error, context, message) {
        logger.error({ ...context, err: error }, message);
    },
};
const emailVerification = new EmailVerificationService(
    users,
    security,
    verificationEmailSender,
    authLogger,
    {
        ttlMinutes: env.emailVerificationTtlMinutes,
        resendCooldownSeconds:
            env.emailVerificationResendCooldownSeconds,
    },
);
const authenticatedSessions = new AuthenticatedSessionService(
    sessions,
    security,
);
const completeEmailVerification = new CompleteEmailVerificationUseCase(
    emailVerification,
    authenticatedSessions,
);
const loginUser = new LoginUserUseCase(
    users,
    security,
    authenticatedSessions,
);
const registerUser = new RegisterUserUseCase(
    users,
    security,
    emailVerification,
    env.termsVersion,
);

export const authService = {
    register: (input: RegisterUserInput) => registerUser.execute(input),
    login: (input: LoginUserInput, client: ClientInformation) =>
        loginUser.execute(input, client),
    verifyEmail: (
        email: string,
        code: string,
        client: ClientInformation,
    ) => completeEmailVerification.execute(email, code, client),
    resendVerificationEmail: (email: string) =>
        emailVerification.resend(email),
};
