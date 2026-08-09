export {
    authenticate,
    optionalAuthenticate,
    requireRole,
    requireVerifiedEmail,
} from "./api/auth.middleware.js";

export { default as authRoutes } from "./api/auth.routes.js";

export type {
    AuthContext,
    UserRoleValue,
} from "./domain/auth.types.js";
