import { existsSync, readFileSync } from "node:fs";
import { basename } from "node:path";
import type { SessionPayload } from "@clawd-date/shared";

const EXT_TO_LANGUAGE: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TypeScript",
  js: "JavaScript",
  jsx: "JavaScript",
  mjs: "JavaScript",
  cjs: "JavaScript",
  py: "Python",
  rs: "Rust",
  go: "Go",
  java: "Java",
  kt: "Kotlin",
  swift: "Swift",
  rb: "Ruby",
  php: "PHP",
  cs: "C#",
  cpp: "C++",
  cc: "C++",
  c: "C",
  h: "C",
  hpp: "C++",
  scala: "Scala",
  ex: "Elixir",
  exs: "Elixir",
  erl: "Erlang",
  clj: "Clojure",
  hs: "Haskell",
  ml: "OCaml",
  zig: "Zig",
  lua: "Lua",
  sh: "Shell",
  bash: "Shell",
  zsh: "Shell",
  fish: "Shell",
  sql: "SQL",
  html: "HTML",
  css: "CSS",
  scss: "SCSS",
  vue: "Vue",
  svelte: "Svelte",
  astro: "Astro",
  dart: "Dart",
  r: "R",
  jl: "Julia",
  nim: "Nim",
};

const PACKAGE_INSTALL_PATTERNS: RegExp[] = [
  /\b(?:npm|pnpm|yarn|bun)\s+(?:add|install|i)\s+([^\s|&;]+(?:\s+[^\s|&;-][^\s|&;]*)*)/g,
  /\bpip\s+install\s+([^\s|&;]+(?:\s+[^\s|&;-][^\s|&;]*)*)/g,
  /\bcargo\s+add\s+([^\s|&;]+(?:\s+[^\s|&;-][^\s|&;]*)*)/g,
  /\bgo\s+get\s+([^\s|&;]+)/g,
  /\bgem\s+install\s+([^\s|&;]+)/g,
  /\bbrew\s+install\s+([^\s|&;]+(?:\s+[^\s|&;-][^\s|&;]*)*)/g,
];

function langFromPath(path: string): string | null {
  const ext = path.split(".").pop()?.toLowerCase();
  if (!ext) return null;
  return EXT_TO_LANGUAGE[ext] ?? null;
}

function extractPackages(command: string): string[] {
  const out: string[] = [];
  for (const pattern of PACKAGE_INSTALL_PATTERNS) {
    pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = pattern.exec(command))) {
      const tokens = m[1]!.split(/\s+/).filter((t) => t && !t.startsWith("-"));
      out.push(...tokens);
    }
  }
  return out;
}

interface TranscriptLine {
  message?: {
    content?: Array<
      | { type: "text"; text?: string }
      | {
          type: "tool_use";
          name?: string;
          input?: Record<string, unknown>;
        }
    >;
  };
  timestamp?: string;
  cwd?: string;
}

export interface ExtractedSession extends SessionPayload {}

export function extractSession(
  transcriptPath: string,
  cwd: string,
): ExtractedSession | null {
  if (!existsSync(transcriptPath)) return null;

  const raw = readFileSync(transcriptPath, "utf8");
  const lines = raw.split("\n").filter((l) => l.trim().length > 0);

  const languages = new Set<string>();
  const tools = new Set<string>();
  let earliest = Number.POSITIVE_INFINITY;
  let latest = 0;
  let toolCount = 0;
  let editCount = 0;
  let bashCount = 0;

  for (const line of lines) {
    let entry: TranscriptLine;
    try {
      entry = JSON.parse(line) as TranscriptLine;
    } catch {
      continue;
    }

    if (entry.timestamp) {
      const t = Date.parse(entry.timestamp);
      if (!Number.isNaN(t)) {
        if (t < earliest) earliest = t;
        if (t > latest) latest = t;
      }
    }

    const content = entry.message?.content;
    if (!Array.isArray(content)) continue;

    for (const block of content) {
      if (block.type !== "tool_use") continue;
      toolCount++;
      const input = block.input ?? {};
      const name = block.name ?? "";

      if (name === "Edit" || name === "Write" || name === "Read" || name === "MultiEdit" || name === "NotebookEdit") {
        editCount++;
        const path = (input.file_path ?? input.notebook_path) as string | undefined;
        if (path) {
          const lang = langFromPath(path);
          if (lang) languages.add(lang);
        }
      } else if (name === "Bash") {
        bashCount++;
        const command = input.command as string | undefined;
        if (command) {
          for (const pkg of extractPackages(command)) tools.add(pkg);
          if (/\bgit\b/.test(command)) tools.add("git");
          if (/\bdocker\b/.test(command)) tools.add("docker");
          if (/\bkubectl\b/.test(command)) tools.add("kubernetes");
          if (/\bterraform\b/.test(command)) tools.add("terraform");
        }
      }
    }
  }

  if (toolCount === 0) return null;

  const project = basename(cwd);
  const occurredAt = latest || Date.now();
  const summary = JSON.stringify({
    edits: editCount,
    bashCommands: bashCount,
    durationMs: latest && earliest !== Number.POSITIVE_INFINITY ? latest - earliest : 0,
    topLanguages: [...languages].slice(0, 5),
    topTools: [...tools].slice(0, 10),
  });

  return {
    project,
    languages: [...languages],
    tools: [...tools],
    summary,
    occurredAt,
  };
}
