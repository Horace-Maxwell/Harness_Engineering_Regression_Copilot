import { readFile } from "node:fs/promises";
import path from "node:path";
import { stdin } from "node:process";

import { Command } from "commander";
import YAML from "yaml";

import type { IncidentRecord } from "../core/types.js";
import { applyGlobalOptions, parseCommaList, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { CliError } from "../lib/errors.js";
import { findWorkspaceRoot, getIncidentsDir, loadIncidentRecords, readConfig, writeTextFile } from "../lib/fs.js";
import { contentHash } from "../lib/hash.js";
import { timestampId } from "../lib/ids.js";
import { blank, bullet, nextStep, section } from "../lib/output.js";
import { summarizeText, titleFromText } from "../lib/text.js";
import { validateConfig, validateIncidentRecord } from "../lib/validate.js";

interface ParsedIncidentEntry {
  text: string;
  raw: string;
  tags?: string[];
}

async function readFromStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf8");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === "\"") {
      if (inQuotes && line[index + 1] === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function pickCsvColumn(headers: string[], preferredColumn: string | undefined): number {
  if (preferredColumn) {
    const numericIndex = Number.parseInt(preferredColumn, 10);
    if (!Number.isNaN(numericIndex)) {
      return numericIndex;
    }

    const headerIndex = headers.findIndex((header) => header.toLowerCase() === preferredColumn.toLowerCase());
    if (headerIndex >= 0) {
      return headerIndex;
    }

    throw new CliError(`CSV column '${preferredColumn}' was not found.`, {
      fix: "Choose a valid header name or zero-based column index with `--csv-column`.",
    });
  }

  const preferredHeaders = ["message", "summary", "content", "input", "error", "description", "title"];
  for (const header of preferredHeaders) {
    const matchIndex = headers.findIndex((candidate) => candidate.toLowerCase() === header);
    if (matchIndex >= 0) {
      return matchIndex;
    }
  }

  return 0;
}

function parseCsvEntries(raw: string, preferredColumn: string | undefined): ParsedIncidentEntry[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  if (lines.length === 1) {
    return [{ text: lines[0], raw: lines[0] }];
  }

  const headers = parseCsvLine(lines[0]);
  const targetColumn = pickCsvColumn(headers, preferredColumn);
  return lines.slice(1).map((line) => {
    const cells = parseCsvLine(line);
    const rowObject = Object.fromEntries(headers.map((header, index) => [header || `column_${index}`, cells[index] ?? ""]));
    const text = (cells[targetColumn] ?? "").trim();
    return {
      text,
      raw: JSON.stringify(rowObject, null, 2),
    };
  }).filter((entry) => entry.text.length > 0);
}

function collectTextCandidates(value: unknown): string[] {
  if (typeof value === "string") {
    return value.trim().length > 0 ? [value.trim()] : [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectTextCandidates(item));
  }

  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as Record<string, unknown>;
  const orderedKeys = [
    "title",
    "summary",
    "message",
    "content",
    "input",
    "output",
    "error",
    "description",
    "expected",
    "response",
    "body",
  ];

  const directMatches = orderedKeys.flatMap((key) => collectTextCandidates(record[key]));
  if (directMatches.length > 0) {
    return directMatches;
  }

  if (Array.isArray(record.messages)) {
    const messageContent = record.messages.flatMap((item) => {
      if (item && typeof item === "object") {
        const content = (item as Record<string, unknown>).content;
        return collectTextCandidates(content);
      }
      return collectTextCandidates(item);
    });
    if (messageContent.length > 0) {
      return messageContent;
    }
  }

  return Object.values(record).flatMap((item) => collectTextCandidates(item));
}

function extractTagsFromObject(value: Record<string, unknown>): string[] {
  const rawTags = value.tags;
  if (Array.isArray(rawTags)) {
    return rawTags.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
  }

  if (typeof rawTags === "string") {
    return parseCommaList(rawTags);
  }

  return [];
}

function entryFromObject(value: Record<string, unknown>): ParsedIncidentEntry {
  const candidates = collectTextCandidates(value);
  const text = candidates.join(" ").trim() || JSON.stringify(value);
  return {
    text,
    raw: JSON.stringify(value, null, 2),
    tags: extractTagsFromObject(value),
  };
}

function parseJsonLikeEntries(raw: string): ParsedIncidentEntry[] | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed)) {
      return parsed.map((item) => {
        if (typeof item === "string") {
          return { text: item, raw: item };
        }
        if (item && typeof item === "object") {
          return entryFromObject(item as Record<string, unknown>);
        }
        return { text: JSON.stringify(item), raw: JSON.stringify(item, null, 2) };
      });
    }
    if (parsed && typeof parsed === "object") {
      return [entryFromObject(parsed as Record<string, unknown>)];
    }
  } catch {
    return null;
  }

  return null;
}

function parseJsonlEntries(raw: string): ParsedIncidentEntry[] | null {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  try {
    return lines.map((line) => {
      const parsed = JSON.parse(line) as unknown;
      if (typeof parsed === "string") {
        return { text: parsed, raw: parsed };
      }
      if (parsed && typeof parsed === "object") {
        return entryFromObject(parsed as Record<string, unknown>);
      }
      return { text: JSON.stringify(parsed), raw: JSON.stringify(parsed, null, 2) };
    });
  } catch {
    return null;
  }
}

function dedupeTags(...sources: Array<string[] | undefined>): string[] | undefined {
  const tagSet = new Set<string>();
  for (const source of sources) {
    for (const tag of source ?? []) {
      if (tag.trim().length > 0) {
        tagSet.add(tag.trim());
      }
    }
  }

  return tagSet.size > 0 ? [...tagSet] : undefined;
}

export function createImportCommand(): Command {
  return withGlobalOptions(new Command("import"))
    .description("Import failures from a file, CSV, JSONL, or stdin paste.")
    .argument("[input]", "Path to a failure file")
    .option("--from-csv <file>", "Import a CSV file of failures")
    .option("--paste", "Read pasted failure text from stdin")
    .option("--stdin-jsonl", "Read JSONL entries from stdin")
    .option("--csv-column <nameOrIndex>", "Choose which CSV column becomes the incident text")
    .option("--append-tag <tags>", "Append one or more comma-separated tags to every imported incident")
    .option("--dry-run", "Preview imported incidents without writing files")
    .action(
      async (
        input: string | undefined,
        options: {
          fromCsv?: string;
          paste?: boolean;
          stdinJsonl?: boolean;
          csvColumn?: string;
          appendTag?: string;
          dryRun?: boolean;
          json?: boolean;
          quiet?: boolean;
          noColor?: boolean;
        },
      ) => {
        applyGlobalOptions(options);
        const projectRoot = await findWorkspaceRoot();
        if (!projectRoot) {
          throw new CliError("Workspace is not initialized yet.", {
            fix: "Run `herc init` first.",
            next: "herc init",
          });
        }
        const config = await readConfig(projectRoot);
        validateConfig(config);

        const sourcePath = options.fromCsv ?? input;
        let raw = "";
        let createdFrom: IncidentRecord["createdFrom"] = "file";

        if (options.paste || options.stdinJsonl) {
          raw = await readFromStdin();
          createdFrom = "paste";
        } else if (options.fromCsv) {
          raw = await readFile(options.fromCsv, "utf8");
          createdFrom = "csv";
        } else if (sourcePath) {
          raw = await readFile(sourcePath, "utf8");
        } else {
          throw new CliError("No import source was provided.", {
            fix: "Provide a file path, `--from-csv`, `--paste`, or `--stdin-jsonl`.",
          });
        }

        let entries: ParsedIncidentEntry[] = [{ text: raw, raw }];
        if (createdFrom === "csv") {
          entries = parseCsvEntries(raw, options.csvColumn);
        } else if (options.stdinJsonl || sourcePath?.endsWith(".jsonl")) {
          entries = parseJsonlEntries(raw) ?? [{ text: raw, raw }];
        } else if (sourcePath?.endsWith(".json")) {
          entries = parseJsonLikeEntries(raw) ?? [{ text: raw, raw }];
        }

        const incidentsDir = getIncidentsDir(projectRoot, config);
        const existingIncidents = await loadIncidentRecords(projectRoot, config);
        const knownHashes = new Set(existingIncidents.map((record) => record.contentHash).filter((value): value is string => Boolean(value)));
        const appendedTags = parseCommaList(options.appendTag);
        const importedIds: string[] = [];
        let duplicateCount = 0;
        let emptyCount = 0;

        for (const entry of entries) {
          if (entry.text.trim().length === 0) {
            emptyCount += 1;
            continue;
          }

          const entryHash = contentHash(entry.text);
          if (knownHashes.has(entryHash)) {
            duplicateCount += 1;
            continue;
          }

          const incidentId = timestampId("incident");
          const rawPath = path.join(incidentsDir, `${incidentId}.txt`);
          const record: IncidentRecord = {
            id: incidentId,
            title: titleFromText(entry.text),
            createdFrom,
            sourcePath,
            importedAt: new Date().toISOString(),
            summary: summarizeText(entry.text, 180),
            contentHash: entryHash,
            rawInputRef: rawPath,
            tags: dedupeTags(entry.tags, appendedTags),
          };
          validateIncidentRecord(record);

          if (!options.dryRun) {
            const targetPath = path.join(incidentsDir, `${incidentId}.yaml`);
            await writeTextFile(targetPath, YAML.stringify(record));
            await writeTextFile(rawPath, entry.raw);
          }
          importedIds.push(incidentId);
          knownHashes.add(entryHash);
        }

        const payload = {
          sourceType: createdFrom,
          inputEntries: entries.length,
          imported: importedIds.length,
          skippedDuplicates: duplicateCount,
          skippedEmpty: emptyCount,
          storedDirectory: incidentsDir,
          firstIncidentId: importedIds[0] ?? null,
          dryRun: options.dryRun === true,
        };
        if (printJsonIfNeeded(payload, options)) {
          return;
        }

        section(`${options.dryRun ? "Previewed" : "Imported"} ${importedIds.length} incident${importedIds.length === 1 ? "" : "s"}`);
        blank();
        bullet(`Source type: ${createdFrom}`);
        bullet(`Input entries: ${entries.length}`);
        bullet(`Imported: ${importedIds.length}`);
        bullet(`Skipped duplicates: ${duplicateCount}`);
        bullet(`Skipped empty entries: ${emptyCount}`);
        bullet(`Stored directory: ${incidentsDir}`);
        bullet(`First incident id: ${importedIds[0] ?? "none"}`);
        blank();
        nextStep(options.dryRun ? "herc import <source>" : "herc distill");
      },
    );
}
