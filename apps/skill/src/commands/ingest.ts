import { readConfig } from "../lib/config.js";
import { extractSession } from "../lib/transcript.js";
import { postIngest } from "../lib/api.js";

interface HookInput {
  session_id?: string;
  transcript_path?: string;
  cwd?: string;
  hook_event_name?: string;
}

async function readStdin(): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    if (process.stdin.isTTY) resolve("");
  });
}

export async function runIngest(): Promise<void> {
  const cfg = readConfig();
  if (!cfg) return;

  const raw = await readStdin();
  let input: HookInput = {};
  if (raw.trim()) {
    try {
      input = JSON.parse(raw) as HookInput;
    } catch {
      return;
    }
  }

  const transcriptPath = input.transcript_path;
  const cwd = input.cwd ?? process.cwd();
  if (!transcriptPath) return;

  const session = extractSession(transcriptPath, cwd);
  if (!session) return;

  await postIngest(cfg.apiUrl, cfg.authToken, {
    profile: {
      languages: session.languages,
      tools: session.tools,
    },
    sessions: [session],
  });
}
