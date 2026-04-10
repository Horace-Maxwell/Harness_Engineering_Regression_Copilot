import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { access, mkdtemp, readFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(testDir, "..");
const scriptPath = path.join(repoRoot, "github-repo-launch-kit", "scaffold-repo.mjs");
const metaPath = path.join(repoRoot, "github-repo-launch-kit", "project.meta.example.json");

async function makeTempDir(prefix) {
  return mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
}

async function pathExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

test("repo launch kit scaffolds a full repo starter", async () => {
  const targetRoot = await makeTempDir("repo-kit-full");
  const target = path.join(targetRoot, "generated");

  const result = await execFileAsync("node", [scriptPath, "--meta", metaPath, "--target", target]);

  assert.match(result.stdout, /Generated full repo starter/);

  const readme = await readFile(path.join(target, "README.md"), "utf8");
  const ciWorkflow = await readFile(path.join(target, ".github", "workflows", "ci.yml"), "utf8");
  const license = await readFile(path.join(target, "LICENSE"), "utf8");

  assert.match(readme, /# Your Project/);
  assert.doesNotMatch(readme, /\{\{/);
  assert.match(ciWorkflow, /npm ci/);
  assert.match(ciWorkflow, /npm run build/);
  assert.match(license, /MIT License/);
});

test("repo launch kit scaffolds community health mode without repo-only files", async () => {
  const targetRoot = await makeTempDir("repo-kit-community");
  const target = path.join(targetRoot, "generated");

  const result = await execFileAsync("node", [
    scriptPath,
    "--meta",
    metaPath,
    "--target",
    target,
    "--mode",
    "community-health",
  ]);

  assert.match(result.stdout, /community health starter/);
  assert.equal(await pathExists(path.join(target, "README.md")), false);
  assert.equal(await pathExists(path.join(target, "LICENSE")), false);
  assert.equal(await pathExists(path.join(target, "SECURITY.md")), true);
  assert.equal(await pathExists(path.join(target, ".github", "ISSUE_TEMPLATE", "bug_report.yml")), true);
});

test("repo launch kit dry run does not write files", async () => {
  const targetRoot = await makeTempDir("repo-kit-dry");
  const target = path.join(targetRoot, "generated");

  const result = await execFileAsync("node", [
    scriptPath,
    "--meta",
    metaPath,
    "--target",
    target,
    "--dry-run",
  ]);

  assert.match(result.stdout, /Dry run: yes/);
  assert.equal(await pathExists(path.join(target, "README.md")), false);
});
