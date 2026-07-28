import type { NextFunction, Request, Response } from "express";

import { registerUser, type RegisterData } from "../services/auth.service";

export function register(
    req: Request<Record<string, never>, unknown, RegisterData>,
    res: Response,
    next: NextFunction,
): Response | void {
    try {
        const user = registerUser(req.body);

        return res.status(201).json({
            message: "User registered successfully.",
            user,
        });
    } catch (error) {
        next(error);
    }
}
