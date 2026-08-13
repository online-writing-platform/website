import assert from "node:assert/strict";
import test from "node:test";

import AppError from "./app-error.js";

void test("keeps malformed, validation, domain, conflict, and payload errors distinct", () => {
    assert.equal(AppError.badRequest("bad").statusCode, 400);
    assert.equal(AppError.validation("bad").statusCode, 422);
    assert.equal(AppError.domainRule("bad").statusCode, 422);
    assert.equal(AppError.conflict("bad").statusCode, 409);
    assert.equal(AppError.tooLarge("bad").statusCode, 413);
});
