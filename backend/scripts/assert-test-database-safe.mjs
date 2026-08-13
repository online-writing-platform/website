import { Client } from "pg";
import { pathToFileURL } from "node:url";

export function assertStaticSafety({
    databaseUrl,
    testDatabaseUrl,
    nodeEnv,
    destructiveOptIn,
}) {
    if (nodeEnv === "production") throw new Error("Destructive tests are forbidden in production.");
    if (destructiveOptIn !== "true") {
        throw new Error("ALLOW_DESTRUCTIVE_TEST_DATABASE=true is required.");
    }
    if (!databaseUrl || !testDatabaseUrl) {
        throw new Error("DATABASE_URL and TEST_DATABASE_URL are both required.");
    }
    const normal = new URL(databaseUrl);
    const test = new URL(testDatabaseUrl);
    if (!normal.protocol.startsWith("postgres") || !test.protocol.startsWith("postgres")) {
        throw new Error("Only PostgreSQL test databases are supported.");
    }
    if (normal.href === test.href) {
        throw new Error("TEST_DATABASE_URL must be distinct from DATABASE_URL.");
    }
}

async function identity(connectionString) {
    const client = new Client({ connectionString, connectionTimeoutMillis: 5_000 });
    await client.connect();
    try {
        const result = await client.query(`
            SELECT COALESCE(inet_server_addr()::text, 'local-socket') AS address,
                   inet_server_port() AS port,
                   current_database() AS database
        `);
        return result.rows.at(0);
    } finally {
        await client.end();
    }
}

export async function assertConnectedDatabasesDistinct(environment = process.env) {
    const input = {
        databaseUrl: environment.DATABASE_URL,
        testDatabaseUrl: environment.TEST_DATABASE_URL,
        nodeEnv: environment.NODE_ENV,
        destructiveOptIn: environment.ALLOW_DESTRUCTIVE_TEST_DATABASE,
    };
    assertStaticSafety(input);
    const [normal, test] = await Promise.all([
        identity(input.databaseUrl),
        identity(input.testDatabaseUrl),
    ]);
    if (!normal || !test) throw new Error("Could not establish database identity.");
    if (
        normal.address === test.address &&
        normal.port === test.port &&
        normal.database === test.database
    ) {
        throw new Error("DATABASE_URL and TEST_DATABASE_URL resolve to the same database identity.");
    }
    return test;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    await assertConnectedDatabasesDistinct();
    process.stdout.write("Destructive test database identity verified.\n");
}
