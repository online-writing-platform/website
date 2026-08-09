import type { EntitlementProvider } from "../application/entitlement.ports.js";

export class DisabledEntitlementProvider implements EntitlementProvider {
    public readonly name = "disabled";

    public listForUser(_userId: string): Promise<string[]> {
        return Promise.resolve([]);
    }
}
