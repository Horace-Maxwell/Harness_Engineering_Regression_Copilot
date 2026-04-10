import { Command } from "commander";
import os from "node:os";

import { applyGlobalOptions, printJsonIfNeeded, withGlobalOptions } from "../lib/command.js";
import { findWorkspaceRoot } from "../lib/fs.js";
import { blank, bullet, section } from "../lib/output.js";

const cliVersion = "0.1.0";

export function createVersionCommand(): Command {
  return withGlobalOptions(new Command("version"))
    .description("Show CLI version and environment information.")
    .option("--verbose", "Include workspace and runtime details")
    .action(async (options: { verbose?: boolean; json?: boolean; quiet?: boolean; noColor?: boolean }) => {
      applyGlobalOptions(options);
      const workspaceRoot = await findWorkspaceRoot();
      const payload = {
        cliVersion,
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        workspaceRoot,
        cwd: process.cwd(),
      };

      if (printJsonIfNeeded(payload, options)) {
        return;
      }

      section("Version");
      blank();
      bullet(`CLI: ${cliVersion}`);
      bullet(`Node: ${process.version}`);
      bullet(`Platform: ${process.platform}`);
      bullet(`Arch: ${process.arch}`);
      if (options.verbose) {
        bullet(`Workspace: ${workspaceRoot ?? "none"}`);
        bullet(`CWD: ${process.cwd()}`);
        bullet(`OS: ${os.release()}`);
      }
    });
}
