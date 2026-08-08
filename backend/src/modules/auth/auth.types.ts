export interface AuthContext {
    userId: string;
    sessionId: string;
}

export interface ClientInformation {
    userAgent?: string;
    ipAddress?: string;
}
