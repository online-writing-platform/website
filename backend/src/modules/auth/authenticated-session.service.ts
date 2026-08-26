import { mapAuthenticatedUser } from "./auth-user.mapper.js";
import type { SessionRepository } from "./session.repo.js";
import type {
    AuthenticationResult,
    AuthSecurity,
    AuthUserRecord,
    ClientInformation,
} from "./auth.types.js";

interface SessionMaterial {
    refreshToken: string;
    refreshTokenHash: string;
    expiresAt: Date;
    userAgent?: string;
    ipAddress?: string;
}

function sanitizeClientInformation(
    clientInformation: ClientInformation,
): ClientInformation {
    const userAgent = clientInformation.userAgent?.trim().slice(0, 512);
    const ipAddress = clientInformation.ipAddress?.trim().slice(0, 45);

    return {
        ...(userAgent ? { userAgent } : {}),
        ...(ipAddress ? { ipAddress } : {}),
    };
}

function createSessionMaterial(
    security: AuthSecurity,
    clientInformation: ClientInformation,
): SessionMaterial {
    const refreshToken = security.generateRefreshToken();

    return {
        refreshToken,
        refreshTokenHash: security.hashRefreshToken(refreshToken),
        expiresAt: security.calculateSessionExpiration(),
        ...sanitizeClientInformation(clientInformation),
    };
}

export class AuthenticatedSessionService {
    public constructor(
        private readonly sessions: SessionRepository,
        private readonly security: AuthSecurity,
    ) {}

    public async create(
        user: AuthUserRecord,
        clientInformation: ClientInformation,
    ): Promise<AuthenticationResult> {
        const sessionMaterial = createSessionMaterial(
            this.security,
            clientInformation,
        );
        const session = await this.sessions.createSession({
            userId: user.id,
            refreshTokenHash: sessionMaterial.refreshTokenHash,
            expiresAt: sessionMaterial.expiresAt,
            ...(sessionMaterial.userAgent
                ? { userAgent: sessionMaterial.userAgent }
                : {}),
            ...(sessionMaterial.ipAddress
                ? { ipAddress: sessionMaterial.ipAddress }
                : {}),
        });
        const accessToken = await this.security.createAccessToken({
            userId: user.id,
            sessionId: session.id,
        });

        return {
            user: mapAuthenticatedUser(user),
            accessToken,
            refreshToken: sessionMaterial.refreshToken,
            sessionExpiresAt: sessionMaterial.expiresAt,
        };
    }
}
