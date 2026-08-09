import env from "../../../config/env.js";

import { sendMail } from "../../../mail/mailer.js";

import type { PasswordRecoveryEmailSender } from "../application/auth.ports.js";

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
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
