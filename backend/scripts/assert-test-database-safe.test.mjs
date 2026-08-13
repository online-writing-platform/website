import assert from "node:assert/strict";
import { test } from "node:test";

import { assertStaticSafety } from "./assert-test-database-safe.mjs";

test("destructive test guard rejects equal URLs and missing explicit opt-in", () => {
    assert.throws(() => assertStaticSafety({
        databaseUrl: "postgresql://a:b@localhost:5432/app",
        testDatabaseUrl: "postgresql://a:b@localhost:5432/app",
        nodeEnv: "test",
        destructiveOptIn: "true",
    }));
    assert.throws(() => assertStaticSafety({
        databaseUrl: "postgresql://a:b@localhost:5432/app",
        testDatabaseUrl: "postgresql://a:b@localhost:5432/app_test",
        nodeEnv: "test",
        destructiveOptIn: "false",
    }));
});

test("static guard accepts distinct parseable URLs only with exact opt-in", () => {
    assert.doesNotThrow(() => assertStaticSafety({
        databaseUrl: "postgresql://a:b@localhost:5432/app",
        testDatabaseUrl: "postgresql://a:b@localhost:5432/app_test",
        nodeEnv: "test",
        destructiveOptIn: "true",
    }));
});
