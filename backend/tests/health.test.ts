import assert from "node:assert/strict";
import { test } from "node:test";

import request from "supertest";

import app from "../src/app";

interface HealthResponse {
    status: string;
    service: string;
    timestamp: string;
}

test("GET /health returns backend health status", async () => {
    const response = await request(app).get("/health");
    const body = response.body as HealthResponse;

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "backend");
    assert.equal(new Date(body.timestamp).toISOString(), body.timestamp);
});

test("unknown routes return 404", async () => {
    const response = await request(app).get("/route-that-does-not-exist");

    assert.equal(response.status, 404);
    assert.deepEqual(response.body, {
        message: "Page Not Found",
    });
});
