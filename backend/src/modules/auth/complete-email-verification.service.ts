import type { AuthenticatedSessionService } from "./authenticated-session.service.js";
import type { EmailVerificationService } from "./email-verification.service.js";
import type {
    AuthenticationResult,
    ClientInformation,
} from "./auth.types.js";

export class CompleteEmailVerificationUseCase {
    public constructor(
        private readonly emailVerification: EmailVerificationService,
        private readonly authenticatedSessions: AuthenticatedSessionService,
    ) {}

    public async execute(
        email: string,
        code: string,
        clientInformation: ClientInformation,
    ): Promise<AuthenticationResult> {
        const user = await this.emailVerification.verify(email, code);

        return this.authenticatedSessions.create(user, clientInformation);
    }
}
