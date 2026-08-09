import { spawn } from "node:child_process";
import process from "node:process";

const task = process.argv[2] ?? "dev";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const children = ["backend", "frontend"].map((directory) =>
    spawn(npm, ["--prefix", directory, "run", task], {
        stdio: "inherit",
        shell: false,
    }),
);

let stopping = false;

function stop(signal = "SIGTERM") {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
        if (!child.killed) child.kill(signal);
    }
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));

for (const child of children) {
    child.on("exit", (code) => {
        if (!stopping && code !== 0) {
            process.exitCode = code ?? 1;
            stop();
        }
    });
}
