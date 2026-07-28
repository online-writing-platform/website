import { Pool, type QueryResult, type QueryResultRow } from "pg";

import env from "../config/env";

const pool = new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
});

pool.on("error", (error: Error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

export async function query<Row extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[],
): Promise<QueryResult<Row>> {
    return pool.query<Row>(text, params);
}

interface DatabaseTimeRow extends QueryResultRow {
    current_time: Date;
}

export async function checkDatabaseConnection(): Promise<Date> {
    const result = await pool.query<DatabaseTimeRow>(
        "SELECT NOW() AS current_time",
    );

    return result.rows[0].current_time;
}

export async function closeDatabaseConnection(): Promise<void> {
    await pool.end();
}
