import * as argon2 from "argon2";
import type { Options as Argon2Options } from "argon2";

const ARGON2_OPTIONS: Argon2Options = {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
    hashLength: 32,
};

export async function hashPassword(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
}

export async function verifyPassword(
    passwordHash: string,
    password: string,
): Promise<boolean> {
    try {
        return await argon2.verify(passwordHash, password);
    } catch {
        return false;
    }
}
