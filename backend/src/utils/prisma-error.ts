interface PrismaErrorLike {
    code: string;
}

export function isPrismaErrorCode(
    error: unknown,
    expectedCode: string,
): error is PrismaErrorLike {
    if (typeof error !== "object" || error === null) {
        return false;
    }

    if (!("code" in error)) {
        return false;
    }

    return error.code === expectedCode;
}
