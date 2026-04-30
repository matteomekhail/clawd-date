import { runInit } from "./commands/init.js";
import { runIngest } from "./commands/ingest.js";
import { runNotify } from "./commands/notify.js";
import { runStatus } from "./commands/status.js";
import { runUninstall } from "./commands/uninstall.js";
import { NotConfiguredError, printNotConfigured } from "./lib/config.js";

async function main(): Promise<void> {
  const cmd = process.argv[2];

  switch (cmd) {
    case "init": {
      const initArgs = process.argv.slice(3);
      await runInit({ skipSettings: initArgs.includes("--no-settings") });
      return;
    }
    case "uninstall": {
      const uninstallArgs = process.argv.slice(3);
      await runUninstall({ skipSettings: uninstallArgs.includes("--no-settings") });
      return;
    }
    case "ingest":
      await runIngest();
      return;
    case "notify":
      await runNotify();
      return;
    case "status":
      await runStatus();
      return;
    case "swipe":
    case undefined: {
      const { runSwipe } = await import("./commands/swipe.js");
      await runSwipe();
      return;
    }
    case "matches": {
      const { runMatches } = await import("./commands/matches.js");
      await runMatches();
      return;
    }
    case "profile": {
      const { runProfile } = await import("./commands/profile.js");
      await runProfile();
      return;
    }
    case "--help":
    case "-h":
      process.stdout.write(
        `clawd-date — matchmaking for devs based on Claude Code history\n\n` +
          `Usage:\n` +
          `  clawd-date              Open swipe TUI (default)\n` +
          `  clawd-date swipe        Swipe candidates (Ink TUI)\n` +
          `  clawd-date matches      View mutual matches\n` +
          `  clawd-date profile      Set your gender & who you want to see\n` +
          `  clawd-date init         Setup hooks + statusline + identity\n` +
          `  clawd-date uninstall    Remove hooks, statusline, slash command, config\n` +
          `  clawd-date ingest       (hook) Ship session activity\n` +
          `  clawd-date notify       (hook) Print status to stderr\n` +
          `  clawd-date status       (statusline) Print status one-liner\n`,
      );
      return;
    default:
      process.stderr.write(`unknown command: ${cmd}\n`);
      process.exit(1);
  }
}

main().catch((err) => {
  if (err instanceof NotConfiguredError) {
    printNotConfigured();
    process.exit(1);
  }
  process.stderr.write(
    `clawd-date: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
