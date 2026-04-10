import { execFile } from "node:child_process";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

async function gitOutput(args: string[], cwd: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("git", args, {
      cwd,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return stdout;
  } catch {
    return null;
  }
}

export async function isGitAvailable(cwd: string): Promise<boolean> {
  return (await gitOutput(["--version"], cwd)) !== null;
}

export async function isGitRepository(cwd: string): Promise<boolean> {
  const output = await gitOutput(["rev-parse", "--is-inside-work-tree"], cwd);
  return output?.trim() === "true";
}

export async function getChangedCaseIds(projectRoot: string, casesDir: string): Promise<string[] | null> {
  const relativeCasesDir = path.relative(projectRoot, casesDir) || ".";

  const diffOutput = await gitOutput(["diff", "--name-only", "--", relativeCasesDir], projectRoot);
  const statusOutput = await gitOutput(["status", "--porcelain", "--", relativeCasesDir], projectRoot);

  if (diffOutput === null && statusOutput === null) {
    return null;
  }

  const filePaths = new Set<string>();
  for (const line of (diffOutput ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    filePaths.add(line);
  }
  for (const line of (statusOutput ?? "").split(/\r?\n/).map((item) => item.trim()).filter(Boolean)) {
    const candidate = line.slice(3).trim();
    if (candidate) {
      filePaths.add(candidate);
    }
  }

  const caseIds = new Set<string>();
  for (const filePath of filePaths) {
    if (path.extname(filePath) !== ".yaml") {
      continue;
    }
    caseIds.add(path.basename(filePath, ".yaml"));
  }

  return [...caseIds];
}
