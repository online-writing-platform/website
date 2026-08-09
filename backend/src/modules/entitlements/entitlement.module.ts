import env from "../../config/env.js";
import { EntitlementService } from "./application/entitlement.service.js";
import { DisabledEntitlementProvider } from "./infrastructure/disabled-entitlement.provider.js";

const provider = new DisabledEntitlementProvider();

export const entitlementModule = {
    service: new EntitlementService(env.monetizationEnabled, provider),
};
