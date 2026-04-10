import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(scriptPath), "..");
const resultsDir = path.join(root, "benchmarks", "results");
const nodeCommand = process.execPath;

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    shell: process.platform === "win32" && command.toLowerCase().endsWith(".cmd"),
    windowsHide: true,
  });

  if (result.error || result.status !== 0) {
    throw new Error(
      [
        `Command failed: ${command} ${args.join(" ")}`,
        result.error?.message,
        result.stdout?.trim(),
        result.stderr?.trim(),
      ]
        .filter(Boolean)
        .join("\n\n"),
    );
  }

  return result.stdout;
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

async function writeJsonResult(scriptName, outputFile) {
  console.error(`[benchmark:reproduce] Running ${scriptName}`);
  const stdout = run(nodeCommand, [path.join("benchmarks", scriptName)]);
  JSON.parse(stdout);
  await writeFile(path.join(resultsDir, outputFile), `${stdout.trim()}\n`, "utf8");
  console.error(`[benchmark:reproduce] Wrote ${outputFile}`);
}

await mkdir(resultsDir, { recursive: true });

console.error("[benchmark:reproduce] Building CLI");
run(npmCommand(), ["run", "build"]);

await writeJsonResult("run-benchmarks.mjs", "benchmark-results-2026-04-10.json");
await writeJsonResult("run-workflow-impact.mjs", "workflow-impact-results-2026-04-10.json");
await writeJsonResult("run-adoption-impact.mjs", "adoption-impact-results-2026-04-10.json");
await writeJsonResult("run-workflow-upgrade-impact.mjs", "workflow-upgrade-impact-results-2026-04-10.json");

console.error("[benchmark:reproduce] Regenerating whitepaper");
run(nodeCommand, [path.join("benchmarks", "generate-whitepaper.mjs")]);

console.log("Reproduced public benchmark results and regenerated EVALUATION_WHITEPAPER.md");
