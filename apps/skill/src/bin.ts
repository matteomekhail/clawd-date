import { runInit } from "./commands/init.js";
import { runIngest } from "./commands/ingest.js";
import { runNotify } from "./commands/notify.js";
import { runStatus } from "./commands/status.js";
import { runUninstall } from "./commands/uninstall.js";

async function main(): Promise<void> {
  const cmd = process.argv[2];

  switch (cmd) {
    case "init":
      await runInit();
      return;
    case "uninstall":
      await runUninstall();
      return;
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
    case "--help":
    case "-h":
      process.stdout.write(
        `clawd-date — matchmaking for devs based on Claude Code history\n\n` +
          `Usage:\n` +
          `  clawd-date              Open swipe TUI (default)\n` +
          `  clawd-date swipe        Swipe candidates (Ink TUI)\n` +
          `  clawd-date matches      View mutual matches\n` +
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
  process.stderr.write(
    `clawd-date: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
