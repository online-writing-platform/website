export interface RegisterData {
    email?: string;
    username?: string;
    displayName?: string;
}

export interface RegisteredUser {
    id: number;
    email?: string;
    username?: string;
    displayName?: string;
}

export async function registerUser(
    registerData: RegisterData,
): Promise<RegisteredUser> {
    const { email, username, displayName } = registerData;

    // TODO: Replace this fake user with database logic
    return {
        id: 1,
        email,
        username,
        displayName,
    };
}
