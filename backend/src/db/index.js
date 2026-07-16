const { Pool } = require("pg");

const env = require("../config/env");

const pool = new Pool({
    connectionString: env.databaseUrl,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error);
});

async function query(text, params) {
    return pool.query(text, params);
}

async function checkDatabaseConnection() {
    const result = await pool.query("SELECT NOW() AS current_time");

    return result.rows[0].current_time;
}

async function closeDatabaseConnection() {
    await pool.end();
}

module.exports = {
    query,
    checkDatabaseConnection,
    closeDatabaseConnection,
};
