import env from "../../../config/env.js";
import { sendMail } from "../../../mail/mailer.js";

import type { AccountEmailSender } from "../application/auth.ports.js";

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
