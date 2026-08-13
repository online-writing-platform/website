import { createClient, type RedisClientType } from "redis";

import env from "../../config/env.js";
import logger from "../../config/logger.js";

let client: RedisClientType | undefined;
let connected = false;

export function getRedisClient(): RedisClientType | undefined {
    if (!env.redisUrl) return undefined;
    client ??= createClient({
        url: env.redisUrl,
        socket: {
            connectTimeout: 5_000,
            reconnectStrategy: (retries) =>
                Math.min(250 * 2 ** Math.min(retries, 5), 5_000),
        },
    });

    if (client.listenerCount("error") === 0) {
        client.on("error", (error) => {
            connected = false;
            logger.error({ error }, "Redis connection error");
        });
        client.on("ready", () => {
            connected = true;
        });
        client.on("end", () => {
            connected = false;
        });
    }
    return client;
}

export async function connectRedis(): Promise<void> {
    const redis = getRedisClient();
    if (!redis) {
        if (env.isProduction) throw new Error("Redis is required in production.");
        return;
    }
    if (!redis.isOpen) await redis.connect();
    await redis.ping();
    connected = true;
}

export async function checkRedisConnection(): Promise<boolean> {
    const redis = getRedisClient();
    if (!redis) return !env.isProduction;
    if (!redis.isReady || !connected) return false;
    return (await redis.ping()) === "PONG";
}

export async function closeRedis(): Promise<void> {
    if (client?.isOpen) await client.quit();
    connected = false;
}
