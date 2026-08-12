import { z } from "zod";

export const MIN_USERNAME_LENGTH = 3;
export const MAX_USERNAME_LENGTH = 20;

export const USERNAME_PATTERN = /^[A-Za-z0-9_-]+$/;

export const usernameSchema = z
  .string()
  .trim()
  .min(
    MIN_USERNAME_LENGTH,
    `Username must contain at least ${MIN_USERNAME_LENGTH} characters.`,
  )
  .max(
    MAX_USERNAME_LENGTH,
    `Username cannot contain more than ${MAX_USERNAME_LENGTH} characters.`,
  )
  .regex(
    USERNAME_PATTERN,
    "Username can only contain letters, numbers, underscores, and hyphens.",
  );
