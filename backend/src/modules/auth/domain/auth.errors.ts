export class IdentityAlreadyExistsError extends Error {
    public constructor() {
        super("The email or username is already in use.");

        this.name = "IdentityAlreadyExistsError";

        Error.captureStackTrace(this, IdentityAlreadyExistsError);
    }
}
