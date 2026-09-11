import env from "../../config/env.js";
import logger from "../../config/logger.js";

export interface SmsSender {
    sendOtp(phoneNumber: string, code: string): Promise<void>;
}

class ConsoleSmsSender implements SmsSender {
    public async sendOtp(phoneNumber: string, code: string): Promise<void> {
        logger.info(
            { phoneNumber, code },
            "Development phone OTP (SMS_TRANSPORT=console)",
        );
    }
}

class KavenegarSmsSender implements SmsSender {
    public constructor(
        private readonly apiKey: string,
        private readonly template: string,
    ) {}

    public async sendOtp(phoneNumber: string, code: string): Promise<void> {
        const endpoint = `https://api.kavenegar.com/v1/${encodeURIComponent(
            this.apiKey,
        )}/verify/lookup.json`;
        const body = new URLSearchParams({
            receptor: phoneNumber,
            token: code,
            template: this.template,
        });
        const response = await fetch(endpoint, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
                Accept: "application/json",
            },
            body,
            signal: AbortSignal.timeout(10_000),
        });

        if (!response.ok) {
            throw new Error(`Kavenegar returned HTTP ${response.status}.`);
        }

        const payload = (await response.json()) as {
            return?: { status?: number; message?: string };
        };
        const status = payload.return?.status;

        if (typeof status !== "number" || status < 200 || status >= 300) {
            throw new Error(
                `Kavenegar rejected the OTP message: ${payload.return?.message ?? "unknown error"}`,
            );
        }
    }
}

export function createSmsSender(): SmsSender {
    if (env.smsTransport === "kavenegar") {
        if (!env.kavenegarApiKey || !env.kavenegarOtpTemplate) {
            throw new Error("Kavenegar SMS transport is not fully configured.");
        }

        return new KavenegarSmsSender(
            env.kavenegarApiKey,
            env.kavenegarOtpTemplate,
        );
    }

    return new ConsoleSmsSender();
}
