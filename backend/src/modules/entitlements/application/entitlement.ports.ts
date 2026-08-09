export interface EntitlementProvider {
    readonly name: string;
    listForUser(userId: string): Promise<string[]>;
}
