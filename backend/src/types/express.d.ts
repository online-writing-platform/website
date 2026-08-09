import type { AuthContext } from "../modules/auth/index.js";

declare global {
    namespace Express {
        interface Request {
            auth?: AuthContext;
            validatedQuery?: unknown;
        }
    }
}

export {};
