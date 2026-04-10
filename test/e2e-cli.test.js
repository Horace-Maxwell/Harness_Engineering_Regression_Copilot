import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));

async function makeWorkspace() {
  return mkdir(path.join(os.tmpdir(), `herc-e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`), { recursive: true });
}

const cliPath = path.join(testDir, "..", "dist", "cli.js");

test("CLI init creates a runnable sample workflow", async () => {
  const root = await makeWorkspace();
  await execFileAsync("node", [cliPath, "init"], { cwd: root });
  const reportResult = await execFileAsync("node", [cliPath, "run"], { cwd: root });
  assert.match(reportResult.stdout, /Passed: 1/);
  const gitignore = await readFile(path.join(root, ".gitignore"), "utf8");
  assert.match(gitignore, /\.herc\/incidents/);
  assert.match(gitignore, /\.herc\/reports/);
  assert.match(gitignore, /\.herc\/responses/);
});

test("CLI import deduplicates repeated incidents", async () => {
  const root = await makeWorkspace();
  await execFileAsync("node", [cliPath, "init"], { cwd: root });

  const inputPath = path.join(root, "failures.jsonl");
  await writeFile(
    inputPath,
    '{"message":"Refund after 45 days was incorrectly approved"}\n{"message":"Refund after 45 days was incorrectly approved"}\n',
    "utf8",
  );

  const importResult = await execFileAsync("node", [cliPath, "import", inputPath], { cwd: root });
  assert.match(importResult.stdout, /Imported 1 incident/);
  assert.match(importResult.stdout, /Skipped duplicates: 1/);
});

test("CLI run supports direct response file gating", async () => {
  const root = await makeWorkspace();
  await execFileAsync("node", [cliPath, "init"], { cwd: root });
  const responsePath = path.join(root, "response.txt");
  await writeFile(responsePath, "wrong answer", "utf8");

  let failed = false;
  try {
    await execFileAsync("node", [cliPath, "run", "sample_case", "--response-file", responsePath], { cwd: root });
  } catch (error) {
    failed = true;
    assert.match(String(error.stdout), /Status: failed/);
  }

  assert.equal(failed, true);
});

test("CLI doctor reports a healthy initialized workspace", async () => {
  const root = await makeWorkspace();
  await execFileAsync("node", [cliPath, "init"], { cwd: root });
  const result = await execFileAsync("node", [cliPath, "doctor"], { cwd: root });
  assert.match(result.stdout, /\[pass\] workspace/);
  assert.match(result.stdout, /\[pass\] config/);
  assert.match(result.stdout, /\[pass\] git/);
  assert.match(result.stdout, /\[warn\] git-repo/);
});

test("CLI init can skip gitignore sync when requested", async () => {
  const root = await makeWorkspace();
  await execFileAsync("node", [cliPath, "init", "--no-sync-gitignore"], { cwd: root });
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
  await execFileAsync("node", [cliPath, "init"], { cwd: root });
  await execFileAsync("node", [
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
  await execFileAsync("node", [
    cliPath,
    "accept",
    "case_001",
    "--reviewer",
    "qa",
    "--response",
    "Please include the tracking number in the reply.",
  ], { cwd: root });
  const statusResult = await execFileAsync("node", [cliPath, "set-status", "case_001", "muted"], { cwd: root });
  assert.match(statusResult.stdout, /Status: muted/);
});

test("CLI report can compare the latest run with the previous run", async () => {
  const root = await makeWorkspace();
  await execFileAsync("node", [cliPath, "init"], { cwd: root });
  await execFileAsync("node", [
    cliPath,
    "create-case",
    "Must include tracking number",
    "--check-type",
    "contains",
    "--value",
    "tracking number",
  ], { cwd: root });
  await execFileAsync("node", [
    cliPath,
    "accept",
    "case_001",
    "--reviewer",
    "qa",
    "--response",
    "Please include the tracking number in the reply.",
  ], { cwd: root });

  await execFileAsync("node", [cliPath, "run"], { cwd: root });
  await writeFile(path.join(root, ".herc", "responses", "case_001.txt"), "Missing key detail.", "utf8");

  let failed = false;
  try {
    await execFileAsync("node", [cliPath, "run"], { cwd: root });
  } catch {
    failed = true;
  }
  assert.equal(failed, true);

  const comparison = await execFileAsync("node", [cliPath, "report", "--compare-previous"], { cwd: root });
  assert.match(comparison.stdout, /Compared to:/);
  assert.match(comparison.stdout, /Regressions:/);
  assert.match(comparison.stdout, /case_001: passed -> failed/);
});
