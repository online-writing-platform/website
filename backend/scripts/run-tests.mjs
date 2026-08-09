import { readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const backendRoot = fileURLToPath(new URL("../", import.meta.url));
const sourceRoot = join(backendRoot, "src");

function collectTests(directory) {
  const found = [];
  for (const name of readdirSync(directory)) {
    const path = join(directory, name);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      found.push(...collectTests(path));
    } else if (name.endsWith(".test.ts")) {
      found.push(path);
    }
  }
  return found;
}

const tests = collectTests(sourceRoot).sort();

if (tests.length === 0) {
  console.error("No backend tests were found.");
  process.exit(1);
}

console.log(`Running ${tests.length} backend test files:`);
for (const test of tests) {
  console.log(`- ${relative(backendRoot, test)}`);
}

const result = spawnSync(
  process.execPath,
  ["--import", "tsx", "--test", ...tests],
  {
    cwd: backendRoot,
    stdio: "inherit",
    env: process.env,
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
