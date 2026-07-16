function getRequiredEnv(name) {
    const value = process.env[name];

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function getPort() {
    const port = Number(process.env.PORT || 5000);

    if (!Number.isInteger(port) || port <= 0) {
        throw new Error("PORT must be a positive integer");
    }

    return port;
}

const env = {
    nodeEnv: process.env.NODE_ENV || "development",
    port: getPort(),
    databaseUrl: getRequiredEnv("DATABASE_URL"),
};

module.exports = env;
