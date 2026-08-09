import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport/index.js";

import env from "../config/env.js";
import logger from "../config/logger.js";

export interface MailMessage {
    to: string;
    subject: string;
    text: string;
    html?: string;
}

type SmtpTransporter = nodemailer.Transporter<
    SMTPTransport.SentMessageInfo,
    SMTPTransport.Options
>;

let smtpTransporter: SmtpTransporter | undefined;

function createSmtpTransporter(): SmtpTransporter {
    if (env.mailTransport !== "smtp" || !env.smtpHost) {
        throw new Error("SMTP transport is not configured.");
    }

    const options: SMTPTransport.Options = {
        host: env.smtpHost,

        port: env.smtpPort,

        secure: env.smtpSecure,

        ...(env.smtpUser && env.smtpPass
            ? {
                  auth: {
                      user: env.smtpUser,
                      pass: env.smtpPass,
                  },
              }
            : {}),
    };

    return nodemailer.createTransport(options, {
        from: env.mailFrom,
    });
}

function getSmtpTransporter(): SmtpTransporter {
    if (!smtpTransporter) {
        smtpTransporter = createSmtpTransporter();
    }

    return smtpTransporter;
}

export async function sendMail(message: MailMessage): Promise<void> {
    if (env.mailTransport === "console") {
        logger.info(
            {
                mail: {
                    to: message.to,

                    subject: message.subject,

                    text: message.text,
                },
            },
            "Mail captured by console transport",
        );

        return;
    }

    const transporter = getSmtpTransporter();

    await transporter.sendMail({
        from: env.mailFrom,

        to: message.to,

        subject: message.subject,

        text: message.text,

        ...(message.html
            ? {
                  html: message.html,
              }
            : {}),

        disableFileAccess: true,

        disableUrlAccess: true,
    });
}
