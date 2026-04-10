import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, realpath, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const nodeCommand = process.execPath;

async function makeWorkspace() {
  return mkdir(path.join(os.tmpdir(), `herc-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), { recursive: true });
}

const cliPath = path.join(testDir, "..", "dist", "cli.js");

test("CLI init creates a runnable sample workflow", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });
  const reportResult = await execFileAsync(nodeCommand, [cliPath, "run"], { cwd: root });
  assert.match(reportResult.stdout, /Passed: 1/);
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.herc\/incidents/);
  assert.match(gitignore, /\.herc\/reports/);
  assert.match(gitignore, /\.herc\/responses/);
});

test("CLI import deduplicates repeated incidents", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });

  const inputPath = path.join(root, "failures.jsonl");
  await writeFile(
    inputPath,
    '{"message":"Refund after 45 days was incorrectly approved"}\n{"message":"Refund after 45 days was incorrectly approved"}\n',
    "utf8",
  );

  const importResult = await execFileAsync(nodeCommand, [cliPath, "import", inputPath], { cwd: root });
  assert.match(importResult.stdout, /Imported 1 incident/);
  assert.match(importResult.stdout, /Skipped duplicates: 1/);
});

test("CLI run supports direct response file gating", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });
  const responsePath = path.join(root, "response.txt");
  await writeFile(responsePath, "wrong answer", "utf8");

  let failed = false;
  try {
    await execFileAsync(nodeCommand, [cliPath, "run", "sample_case", "--response-file", responsePath], { cwd: root });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /Status: failed/);
  }

  assert.equal(failed, true);
});

test("CLI doctor reports a healthy initialized workspace", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });
  const result = await execFileAsync(nodeCommand, [cliPath, "doctor"], { cwd: root });
  assert.match(result.stdout, /\[pass\] workspace/);
  assert.match(result.stdout, /\[pass\] config/);
  assert.match(result.stdout, /\[pass\] git/);
  assert.match(result.stdout, /\[warn\] git-repo/);
});

test("CLI doctor quick mode skips full schema validation", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });
  const result = await execFileAsync(nodeCommand, [cliPath, "doctor", "--quick"], { cwd: root });
  assert.match(result.stdout, /Quick mode skipped full case and incident validation/);
});

test("CLI init can skip gitignore sync when requested", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init", "--no-sync-gitignore"], { cwd: root });
  let missing = false;
  try {
    await readFile(path.join(root, ".gitignore"), "utf8");
  } catch {
    missing = true;
  }
  assert.equal(missing, true);
});

test("CLI create-case, accept, and set-status work together", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });
  await execFileAsync(nodeCommand, [
    cliPath,
    "create-case",
    "Must include tracking number",
    "--check-type",
    "contains",
    "--value",
    "tracking number",
    "--tag",
    "support,shipping",
  ], { cwd: root });
  await execFileAsync(nodeCommand, [
    cliPath,
    "accept",
    "case_001",
    "--reviewer",
    "qa",
    "--response",
    "Please include the tracking number in the reply.",
  ], { cwd: root });
  const statusResult = await execFileAsync(nodeCommand, [cliPath, "set-status", "case_001", "muted"], { cwd: root });
  assert.match(statusResult.stdout, /Status: muted/);
});

test("CLI report can compare the latest run with the previous run", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init"], { cwd: root });
  await execFileAsync(nodeCommand, [
    cliPath,
    "create-case",
    "Must include tracking number",
    "--check-type",
    "contains",
    "--value",
    "tracking number",
  ], { cwd: root });
  await execFileAsync(nodeCommand, [
    cliPath,
    "accept",
    "case_001",
    "--reviewer",
    "qa",
    "--response",
    "Please include the tracking number in the reply.",
  ], { cwd: root });

  await execFileAsync(nodeCommand, [cliPath, "run"], { cwd: root });
  await writeFile(path.join(root, ".herc", "responses", "case_001.txt"), "Missing key detail.", "utf8");

  let failed = false;
  try {
    await execFileAsync(nodeCommand, [cliPath, "run"], { cwd: root });
  } catch {
    failed = true;
  }
  assert.equal(failed, true);

  const comparison = await execFileAsync(nodeCommand, [cliPath, "report", "--compare-previous"], { cwd: root });
  assert.match(comparison.stdout, /Compared to:/);
  assert.match(comparison.stdout, /Regressions:/);
  assert.match(comparison.stdout, /case_001: passed -> failed/);
});

test("CLI doctor --fix bootstraps a missing workspace for automation-first setup", async () => {
  const root = await makeWorkspace();
  const result = await execFileAsync(nodeCommand, [cliPath, "doctor", "--fix", "--json"], { cwd: root });
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.ready, true);
  assert.equal(await realpath(parsed.workspaceRoot), await realpath(root));
  assert.ok(parsed.fixesApplied.some((fix) => fix.kind === "bootstrap"));

  const config = await readFile(path.join(root, ".herc", "config.yaml"), "utf8");
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  assert.match(config, /projectName:/);
  assert.match(gitignore, /\.herc\/reports/);
});

test("CLI doctor --fix repairs missing directories and ignore rules in an existing workspace", async () => {
  const root = await makeWorkspace();
  await execFileAsync(nodeCommand, [cliPath, "init", "--no-sync-gitignore"], { cwd: root });
  await writeFile(path.join(root, ".gitignore"), "", "utf8");

  const responsesDir = path.join(root, ".herc", "responses");
  await execFileAsync(nodeCommand, ["-e", `require('node:fs').rmSync(${JSON.stringify(responsesDir)}, { recursive: true, force: true })`], { cwd: root });

  const result = await execFileAsync(nodeCommand, [cliPath, "doctor", "--fix", "--json"], { cwd: root });
  const parsed = JSON.parse(result.stdout);

  assert.equal(parsed.ready, true);
  assert.ok(parsed.fixesApplied.some((fix) => fix.kind === "workspace_dirs"));
  assert.ok(parsed.fixesApplied.some((fix) => fix.kind === "gitignore"));

  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.herc\/responses/);
});

test("CLI report exits non-zero when no workspace exists", async () => {
  const root = await makeWorkspace();
  let failed = false;
  try {
    await execFileAsync(nodeCommand, [cliPath, "report"], { cwd: root });
  } catch (error) {
    failed = true;
    assert.match(String(error.stderr), /Workspace is not initialized yet/);
  }

  assert.equal(failed, true);
});
