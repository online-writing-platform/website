import env from "../../../config/env.js";

import { sendMail } from "../../../mail/mailer.js";

import type { VerificationEmailSender } from "../application/auth.ports.js";

function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

function createVerificationUrl(token: string): string {
    const url = new URL("/verify-email", env.webAppUrl);

    url.searchParams.set("token", token);

    return url.toString();
}

export class DefaultVerificationEmailSender implements VerificationEmailSender {
    public async send(email: string, token: string): Promise<void> {
        const verificationUrl = createVerificationUrl(token);

        const safeVerificationUrl = escapeHtml(verificationUrl);

        await sendMail({
            to: email,

            subject: "Verify your email address",

            text: [
                "Welcome to Writing Platform.",
                "",
                "Verify your email address by opening the following link:",
                verificationUrl,
                "",
                "If you did not create this account, you can ignore this email.",
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
    <title>Verify your email</title>
</head>
<body>
    <p>Welcome to Writing Platform.</p>

    <p>
        Please verify your email address to finish setting up your account.
    </p>

    <p>
        <a href="${safeVerificationUrl}">
            Verify email
        </a>
    </p>

    <p>
        If you did not create this account, you can ignore this email.
    </p>
</body>
</html>
            `.trim(),
        });
    }
}
