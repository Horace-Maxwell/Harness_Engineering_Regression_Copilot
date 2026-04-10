#!/usr/bin/env node

import { access, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { constants as fsConstants } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const coreCommunityHealthFiles = new Set([
  ".github/ISSUE_TEMPLATE/bug_report.yml",
  ".github/ISSUE_TEMPLATE/feature_request.yml",
  ".github/ISSUE_TEMPLATE/config.yml",
  ".github/PULL_REQUEST_TEMPLATE.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "SUPPORT.md",
  "CODE_OF_CONDUCT.md",
]);

const supportedOptionalPacks = ["codeowners", "governance", "roadmap"];

const licenseTexts = {
  "MIT": path.join(__dirname, "licenses", "MIT.txt"),
  "Apache-2.0": path.join(__dirname, "licenses", "Apache-2.0.txt"),
  "BSD-3-Clause": path.join(__dirname, "licenses", "BSD-3-Clause.txt"),
  "Unlicense": path.join(__dirname, "licenses", "Unlicense.txt"),
};

function printHelp() {
  console.log(`GitHub Repo Launch Kit

Usage:
  node github-repo-launch-kit/scaffold-repo.mjs --meta <project.meta.json> --target <directory> [--dry-run] [--overwrite]
  node github-repo-launch-kit/scaffold-repo.mjs --meta <project.meta.json> --target <directory> --mode community-health

Options:
  --meta <path>        Path to project metadata JSON.
  --target <path>      Output directory.
  --mode <mode>        full-repo or community-health. Overrides the meta file.
  --dry-run            Show what would be written without writing files.
  --overwrite          Overwrite existing files in the target directory.
  --help               Show this message.
`);
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      continue;
    }

    const key = token.slice(2);
    const next = argv[index + 1];

    if (!next || next.startsWith("--")) {
      args[key] = true;
      continue;
    }

    args[key] = next;
    index += 1;
  }

  return args;
}

function formatIndentedBlock(value) {
  const content = String(value || "").trim() || `echo "No command configured yet."`;
  return content
    .split(/\r?\n/)
    .map((line) => `          ${line}`)
    .join("\n");
}

function makeMarkdownLink(url) {
  return url ? `[${url}](${url})` : `Not yet provided / 暂未提供`;
}

function makeContactLine(name, email) {
  if (name && email) {
    return `${name} <${email}>`;
  }
  if (name) {
    return name;
  }
  if (email) {
    return email;
  }
  return `Not yet provided / 暂未提供`;
}

function normalizeMeta(rawMeta, modeOverride) {
  const meta = {
    mode: modeOverride || rawMeta.mode || "full-repo",
    projectName: rawMeta.projectName || "Your Project",
    projectSlug: rawMeta.projectSlug || "your-project",
    tagline: rawMeta.tagline || "One clear sentence that explains why this project matters.",
    description: rawMeta.description || "Replace this with a short project description.",
    projectType: rawMeta.projectType || "tool",
    audience: rawMeta.audience || "Developers and teams who need a reliable workflow.",
    primaryLanguage: rawMeta.primaryLanguage || "TypeScript",
    license: rawMeta.license || "MIT",
    maturity: rawMeta.maturity || "experimental",
    homepageUrl: rawMeta.homepageUrl || "",
    docsUrl: rawMeta.docsUrl || "",
    demoUrl: rawMeta.demoUrl || "",
    supportUrl: rawMeta.supportUrl || "",
    securityContact: rawMeta.securityContact || "",
    maintainerName: rawMeta.maintainerName || "",
    maintainerEmail: rawMeta.maintainerEmail || "",
    orgOrUser: rawMeta.orgOrUser || "your-org",
    defaultBranch: rawMeta.defaultBranch || "main",
    copyrightHolder: rawMeta.copyrightHolder || rawMeta.maintainerName || "Your Name or Organization",
    copyrightYear: rawMeta.copyrightYear || String(new Date().getFullYear()),
    codeownersTarget: rawMeta.codeownersTarget || "@your-org/maintainers",
    installCommand: rawMeta.installCommand || `echo "Add an install command."`,
    quickstartCommand: rawMeta.quickstartCommand || `echo "Add a quickstart command."`,
    buildCommand: rawMeta.buildCommand || `echo "Add a build command."`,
    testCommand: rawMeta.testCommand || `echo "Add a test command."`,
    localDevCommand: rawMeta.localDevCommand || `echo "Add a local development command."`,
    setupCommand: rawMeta.setupCommand || `echo "Add a setup command."`,
    features: Array.isArray(rawMeta.features) ? rawMeta.features : [],
  };

  return meta;
}

function validateMeta(meta) {
  if (!["full-repo", "community-health"].includes(meta.mode)) {
    throw new Error(`Unsupported mode: ${meta.mode}`);
  }

  for (const feature of meta.features) {
    if (!supportedOptionalPacks.includes(feature)) {
      throw new Error(`Unsupported feature pack: ${feature}`);
    }
  }
}

async function walkDirectory(directory, prefix = "") {
  const entries = (await readdir(directory, { withFileTypes: true })).sort((left, right) =>
    left.name.localeCompare(right.name),
  );
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? path.posix.join(prefix, entry.name) : entry.name;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDirectory(absolutePath, relativePath)));
      continue;
    }

    files.push({
      absolutePath,
      relativePath,
    });
  }

  return files;
}

function shouldIncludeBaseFile(relativePath, meta) {
  if (meta.mode === "full-repo") {
    return true;
  }

  return coreCommunityHealthFiles.has(relativePath);
}

async function readText(filePath) {
  return readFile(filePath, "utf8");
}

async function fileExists(filePath) {
  try {
    await access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function buildReplacementMap(meta) {
  return new Map([
    ["{{PROJECT_NAME}}", meta.projectName],
    ["{{PROJECT_SLUG}}", meta.projectSlug],
    ["{{TAGLINE}}", meta.tagline],
    ["{{DESCRIPTION}}", meta.description],
    ["{{PROJECT_TYPE}}", meta.projectType],
    ["{{AUDIENCE}}", meta.audience],
    ["{{PRIMARY_LANGUAGE}}", meta.primaryLanguage],
    ["{{LICENSE_NAME}}", meta.license],
    ["{{MATURITY}}", meta.maturity],
    ["{{HOMEPAGE_URL}}", meta.homepageUrl || "#"],
    ["{{DOCS_URL}}", meta.docsUrl || "#"],
    ["{{DEMO_URL}}", meta.demoUrl || "#"],
    ["{{SUPPORT_URL}}", meta.supportUrl || "#"],
    ["{{SECURITY_CONTACT}}", meta.securityContact || "security@example.com"],
    ["{{MAINTAINER_NAME}}", meta.maintainerName || "Maintainer Name"],
    ["{{MAINTAINER_EMAIL}}", meta.maintainerEmail || "maintainer@example.com"],
    ["{{MAINTAINER_DISPLAY}}", makeContactLine(meta.maintainerName, meta.maintainerEmail)],
    ["{{ORG_OR_USER}}", meta.orgOrUser],
    ["{{DEFAULT_BRANCH}}", meta.defaultBranch],
    ["{{COPYRIGHT_HOLDER}}", meta.copyrightHolder],
    ["{{COPYRIGHT_YEAR}}", meta.copyrightYear],
    ["{{CODEOWNERS_TARGET}}", meta.codeownersTarget],
    ["{{INSTALL_COMMAND}}", meta.installCommand],
    ["{{QUICKSTART_COMMAND}}", meta.quickstartCommand],
    ["{{BUILD_COMMAND}}", meta.buildCommand],
    ["{{TEST_COMMAND}}", meta.testCommand],
    ["{{LOCAL_DEV_COMMAND}}", meta.localDevCommand],
    ["{{SETUP_COMMAND}}", meta.setupCommand],
    ["{{SETUP_COMMAND_BLOCK}}", formatIndentedBlock(meta.setupCommand)],
    ["{{BUILD_COMMAND_BLOCK}}", formatIndentedBlock(meta.buildCommand)],
    ["{{TEST_COMMAND_BLOCK}}", formatIndentedBlock(meta.testCommand)],
    ["{{HOMEPAGE_DISPLAY}}", makeMarkdownLink(meta.homepageUrl)],
    ["{{DOCS_DISPLAY}}", makeMarkdownLink(meta.docsUrl)],
    ["{{DEMO_DISPLAY}}", makeMarkdownLink(meta.demoUrl)],
    ["{{SUPPORT_DISPLAY}}", makeMarkdownLink(meta.supportUrl)],
    ["{{SECURITY_CONTACT_DISPLAY}}", meta.securityContact || "security@example.com"],
  ]);
}

function applyReplacements(content, replacementMap) {
  let output = content;
  for (const [token, value] of replacementMap.entries()) {
    output = output.split(token).join(value);
  }
  return output;
}

async function buildLicenseContent(meta) {
  if (meta.mode !== "full-repo") {
    return null;
  }

  if (licenseTexts[meta.license]) {
    const text = await readText(licenseTexts[meta.license]);
    return applyReplacements(text, buildReplacementMap(meta));
  }

  return `Custom License Notice

Replace this file with the final license text before publishing.

Selected license: ${meta.license}
Project: ${meta.projectName}
Copyright: ${meta.copyrightYear} ${meta.copyrightHolder}
`;
}

async function ensureDirectory(directoryPath, dryRun) {
  if (dryRun) {
    return;
  }
  await mkdir(directoryPath, { recursive: true });
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const metaPath = path.resolve(process.cwd(), String(args.meta || path.join(__dirname, "project.meta.example.json")));
  const targetPath = path.resolve(process.cwd(), String(args.target || path.join(process.cwd(), "repo-output")));
  const dryRun = Boolean(args["dry-run"]);
  const overwrite = Boolean(args.overwrite);
  const metaRaw = JSON.parse(await readText(metaPath));
  const meta = normalizeMeta(metaRaw, args.mode);
  validateMeta(meta);

  const replacementMap = buildReplacementMap(meta);
  const operations = [];
  const collisions = [];

  const baseFiles = await walkDirectory(path.join(__dirname, "templates", "base"));
  for (const file of baseFiles) {
    if (!shouldIncludeBaseFile(file.relativePath, meta)) {
      continue;
    }

    operations.push({
      sourcePath: file.absolutePath,
      relativePath: file.relativePath,
    });
  }

  if (meta.mode === "full-repo") {
    for (const feature of meta.features) {
      const featureDirectory = path.join(__dirname, "templates", "optional", feature);
      const featureFiles = await walkDirectory(featureDirectory);
      for (const file of featureFiles) {
        operations.push({
          sourcePath: file.absolutePath,
          relativePath: file.relativePath,
        });
      }
    }
  }

  for (const operation of operations) {
    const outputPath = path.join(targetPath, operation.relativePath);
    if (!overwrite && (await fileExists(outputPath))) {
      collisions.push(operation.relativePath);
    }
  }

  if (!overwrite && meta.mode === "full-repo" && (await fileExists(path.join(targetPath, "LICENSE")))) {
    collisions.push("LICENSE");
  }

  if (collisions.length > 0) {
    throw new Error(`Refusing to overwrite existing files without --overwrite:\n- ${collisions.join("\n- ")}`);
  }

  if (!dryRun) {
    await mkdir(targetPath, { recursive: true });
  }

  for (const operation of operations) {
    const source = await readText(operation.sourcePath);
    const output = applyReplacements(source, replacementMap);
    const outputPath = path.join(targetPath, operation.relativePath);
    await ensureDirectory(path.dirname(outputPath), dryRun);
    if (!dryRun) {
      await writeFile(outputPath, output, "utf8");
    }
  }

  const licenseContent = await buildLicenseContent(meta);
  if (licenseContent) {
    const licensePath = path.join(targetPath, "LICENSE");
    await ensureDirectory(path.dirname(licensePath), dryRun);
    if (!dryRun) {
      await writeFile(licensePath, licenseContent, "utf8");
    }
  }

  const modeDescription = meta.mode === "full-repo" ? "full repo starter" : "community health starter";
  console.log(`Generated ${modeDescription} for ${meta.projectName}`);
  console.log(`Mode: ${meta.mode}`);
  console.log(`Target: ${targetPath}`);
  console.log(`Files planned: ${operations.length + (licenseContent ? 1 : 0)}`);
  console.log(`Dry run: ${dryRun ? "yes" : "no"}`);

  if (dryRun) {
    for (const operation of operations) {
      console.log(`- ${operation.relativePath}`);
    }
    if (licenseContent) {
      console.log(`- LICENSE`);
    }
  }

  if (!dryRun) {
    console.log(`Next: review README.md, CI commands, and any remaining placeholders before publishing.`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
