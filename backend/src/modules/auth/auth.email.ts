import env from "../../config/env.js";
import { sendMail } from "../../mail/mailer.js";
import type {
    AccountEmailSender,
    PasswordRecoveryEmailSender,
} from "./auth.types.js";

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function createEmailChangeUrl(token: string): string {
    const url = new URL("/confirm-email-change", env.webAppUrl);

    url.searchParams.set("token", token);

    return url.toString();
}

export class DefaultAccountEmailSender implements AccountEmailSender {
    public async sendEmailChangeLink(email: string, token: string): Promise<void> {
        const confirmationUrl = createEmailChangeUrl(token);
        const safeConfirmationUrl = escapeHtml(confirmationUrl);

        await sendMail({
            to: email,
            subject: "Confirm your new email address",
            text: [
                "A request was made to use this email address for a Writing Platform account.",
                "",
                "Confirm the change by opening the following link:",
                confirmationUrl,
                "",
                "If you did not request this change, you can ignore this email.",
            ].join("\n"),
            html: `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Confirm email change</title>
</head>
<body>
    <p>A request was made to use this email address for a Writing Platform account.</p>
    <p><a href="${safeConfirmationUrl}">Confirm email change</a></p>
    <p>If you did not request this change, you can ignore this email.</p>
</body>
</html>
            `.trim(),
        });
    }
}

export function buildVerificationCodeEmail(
    code: string,
    ttlMinutes = env.emailVerificationTtlMinutes,
): {
    subject: string;
    text: string;
    html: string;
} {
    const safeCode = escapeHtml(code);

    return {
        subject: "Verify your email address",
        text: [
            "Welcome to Writing Platform.",
            "",
            "Enter this six-digit code to verify your email address:",
            code,
            "",
            `This code expires in ${ttlMinutes} minutes.`,
            "",
            "If you did not create this account, you can ignore this email.",
        ].join("\n"),
        html: `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your email</title>
</head>
<body>
    <p>Welcome to Writing Platform.</p>
    <p>Enter this six-digit code to verify your email address:</p>
    <p><strong style="font-size: 24px; letter-spacing: 0.3em;">${safeCode}</strong></p>
    <p>This code expires in ${ttlMinutes} minutes.</p>
    <p>If you did not create this account, you can ignore this email.</p>
</body>
</html>
        `.trim(),
    };
}

export async function sendVerificationCodeEmail(
    email: string,
    code: string,
): Promise<void> {
    const message = buildVerificationCodeEmail(code);

    await sendMail({
        to: email,
        ...message,
    });
}

function createPasswordResetUrl(token: string): string {
    const url = new URL("/reset-password", env.webAppUrl);

    url.searchParams.set("token", token);

    return url.toString();
}

export class DefaultPasswordRecoveryEmailSender implements PasswordRecoveryEmailSender {
    public async sendResetLink(email: string, token: string): Promise<void> {
        const resetUrl = createPasswordResetUrl(token);

        const safeResetUrl = escapeHtml(resetUrl);

        await sendMail({
            to: email,

            subject: "Reset your password",

            text: [
                "We received a request to reset your Writing Platform password.",
                "",
                "Open the following link to choose a new password:",
                resetUrl,
                "",
                "If you did not request a password reset, you can ignore this email.",
            ].join("\n"),

            html: `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
    <title>Reset your password</title>
</head>
<body>
    <p>
        We received a request to reset your Writing Platform password.
    </p>

    <p>
        <a href="${safeResetUrl}">
            Reset password
        </a>
    </p>

    <p>
        If you did not request a password reset, you can ignore this email.
    </p>
</body>
</html>
            `.trim(),
        });
    }

    public async sendPasswordChangedNotice(email: string): Promise<void> {
        await sendMail({
            to: email,

            subject: "Your password was changed",

            text: [
                "Your Writing Platform password was successfully changed.",
                "",
                "All existing sessions have been signed out.",
                "",
                "If you did not make this change, contact support immediately.",
            ].join("\n"),

            html: `
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta
        name="viewport"
        content="width=device-width, initial-scale=1"
    >
    <title>Password changed</title>
</head>
<body>
    <p>
        Your Writing Platform password was successfully changed.
    </p>

    <p>
        All existing sessions have been signed out.
    </p>

    <p>
        If you did not make this change, contact support immediately.
    </p>
</body>
</html>
            `.trim(),
        });
    }
}
