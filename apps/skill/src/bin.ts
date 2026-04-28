import { runInit } from "./commands/init.js";
import { runIngest } from "./commands/ingest.js";
import { runNotify } from "./commands/notify.js";

async function main(): Promise<void> {
  const cmd = process.argv[2];

  switch (cmd) {
    case "init":
      await runInit();
      return;
    case "ingest":
      await runIngest();
      return;
    case "notify":
      await runNotify();
      return;
    case "--help":
    case "-h":
    case undefined:
      process.stdout.write(
        `clawd-match — matchmaking for devs based on Claude Code history\n\n` +
          `Usage:\n` +
          `  clawd-match init       Setup hooks in ~/.claude/settings.json + identity\n` +
          `  clawd-match ingest     (hook) Ship session activity to clawd.date\n` +
          `  clawd-match notify     (hook) Print unread matches to terminal\n`,
      );
      return;
    default:
      process.stderr.write(`unknown command: ${cmd}\n`);
      process.exit(1);
  }
}

main().catch((err) => {
  process.stderr.write(
    `clawd-match: ${err instanceof Error ? err.message : String(err)}\n`,
  );
  process.exit(1);
});
