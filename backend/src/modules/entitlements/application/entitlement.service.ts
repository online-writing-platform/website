import type { EntitlementProvider } from "./entitlement.ports.js";

export class EntitlementService {
    public constructor(
        private readonly enabled: boolean,
        private readonly provider: EntitlementProvider,
    ) {}

    public async list(userId: string) {
        if (!this.enabled) {
            return {
                monetizationEnabled: false,
                provider: "disabled",
                entitlements: [] as string[],
            };
        }

        return {
            monetizationEnabled: true,
            provider: this.provider.name,
            entitlements: await this.provider.listForUser(userId),
        };
    }
}
