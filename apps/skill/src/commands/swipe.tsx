import React, { useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { requireConfig } from "../lib/config.js";
import {
  getDiscover,
  getMutualMatches,
  markMatchesRead,
  postSwipe,
  type Candidate,
  type MutualMatch,
} from "../lib/api.js";

interface Stats {
  likes: number;
  passes: number;
  matches: number;
}

type View = "swipe" | "matches" | "help";

function Header({
  username,
  matchCount,
  subtitle,
}: {
  username: string;
  matchCount: number;
  subtitle?: string;
}): React.ReactElement {
  return (
    <Box marginBottom={1}>
      <Text>
        <Text bold color="magentaBright">
          clawd.date
        </Text>
        <Text dimColor> · </Text>
        <Text>@{username}</Text>
        {subtitle ? (
          <>
            <Text dimColor> · </Text>
            <Text dimColor>{subtitle}</Text>
          </>
        ) : null}
        {matchCount > 0 ? (
          <>
            <Text dimColor> · </Text>
            <Text bold color="magentaBright">
              💘 {matchCount}
            </Text>
          </>
        ) : null}
      </Text>
    </Box>
  );
}

function FooterHint({
  items,
}: {
  items: Array<{ key: string; label: string; highlight?: boolean }>;
}): React.ReactElement {
  return (
    <Box marginTop={1}>
      <Text>
        {items.map((it, i) => (
          <React.Fragment key={i}>
            {i > 0 ? <Text dimColor>  ·  </Text> : null}
            <Text bold color={it.highlight ? "magentaBright" : undefined}>
              [{it.key}]
            </Text>
            <Text dimColor> {it.label}</Text>
          </React.Fragment>
        ))}
      </Text>
    </Box>
  );
}

function Card({ candidate }: { candidate: Candidate }): React.ReactElement {
  const sharedCount =
    candidate.sharedLanguages.length + candidate.sharedTools.length;
  return (
    <Box flexDirection="column">
      <Text bold color="magentaBright">
        @{candidate.username}
      </Text>
      {candidate.bio ? (
        <Text>{candidate.bio}</Text>
      ) : (
        <Text dimColor italic>
          (no bio yet)
        </Text>
      )}
      <Box marginTop={1} flexDirection="column">
        <Text>
          <Text bold>lang  </Text>
          {candidate.languages.length > 0
            ? candidate.languages.join(", ")
            : "—"}
        </Text>
        <Text>
          <Text bold>tools </Text>
          {candidate.tools.length > 0
            ? candidate.tools.slice(0, 8).join(", ") +
              (candidate.tools.length > 8 ? ` +${candidate.tools.length - 8}` : "")
            : "—"}
        </Text>
      </Box>
      {sharedCount > 0 ? (
        <Box marginTop={1}>
          <Text color="cyanBright">
            ✨ {sharedCount} in common:{" "}
            {[...candidate.sharedLanguages, ...candidate.sharedTools].join(", ")}
          </Text>
        </Box>
      ) : null}
    </Box>
  );
}

function MatchesView({
  matches,
  loading,
}: {
  matches: MutualMatch[] | null;
  loading: boolean;
}): React.ReactElement {
  if (loading || !matches) {
    return (
      <Box>
        <Text>
          <Spinner type="dots" /> Loading matches…
        </Text>
      </Box>
    );
  }
  if (matches.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>No mutual matches yet 🦗</Text>
        <Text dimColor>
          A match happens when you and someone else both press like.
        </Text>
        <Text dimColor>Keep swiping — likes you receive show up here.</Text>
      </Box>
    );
  }
  return (
    <Box flexDirection="column">
      <Text bold color="magentaBright">
        💘 {matches.length} mutual match{matches.length === 1 ? "" : "es"}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {matches.map((m, i) => (
          <Box
            key={m.id}
            flexDirection="column"
            marginBottom={i === matches.length - 1 ? 0 : 1}
          >
            <Text>
              <Text bold color="magentaBright">
                @{m.username}
              </Text>
              <Text color="cyan">  https://github.com/{m.username}</Text>
            </Text>
            {m.bio ? <Text>  {m.bio}</Text> : null}
            <Text dimColor>
              {"  "}
              {m.languages.slice(0, 4).join(", ") || "—"}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function HelpView(): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold color="magentaBright">
        clawd.date — matchmaking for devs
      </Text>
      <Text dimColor>
        Background hooks read your Claude Code activity to figure out the
        languages and tools you use. People with overlap appear in your swipe
        deck. A mutual like = a match.
      </Text>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Swipe view</Text>
        <Text>
          <Text color="cyan">  l  →  ↵  </Text>
          <Text dimColor>like the candidate</Text>
        </Text>
        <Text>
          <Text color="cyan">  p  ←     </Text>
          <Text dimColor>pass</Text>
        </Text>
        <Text>
          <Text color="cyan">  r        </Text>
          <Text dimColor>refresh candidate list</Text>
        </Text>
        <Text>
          <Text color="cyan">  m        </Text>
          <Text dimColor>open matches view</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Matches view</Text>
        <Text>
          <Text color="cyan">  s  esc   </Text>
          <Text dimColor>back to swipe</Text>
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold>Anywhere</Text>
        <Text>
          <Text color="cyan">  ?        </Text>
          <Text dimColor>show this help</Text>
        </Text>
        <Text>
          <Text color="cyan">  q        </Text>
          <Text dimColor>quit</Text>
        </Text>
      </Box>
    </Box>
  );
}

function App(): React.ReactElement {
  const { exit } = useApp();
  const [candidates, setCandidates] = useState<Candidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [stats, setStats] = useState<Stats>({ likes: 0, passes: 0, matches: 0 });
  const [busy, setBusy] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [view, setView] = useState<View>("swipe");
  const [previousView, setPreviousView] = useState<View>("swipe");
  const [matches, setMatches] = useState<MutualMatch[] | null>(null);
  const [matchesLoading, setMatchesLoading] = useState(false);
  const [matchCount, setMatchCount] = useState(0);
  const cfg = requireConfig();

  function loadCandidates(): void {
    setError(null);
    setCandidates(null);
    setIndex(0);
    getDiscover(cfg.apiUrl, cfg.githubId)
      .then(setCandidates)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : String(e)),
      );
  }

  useEffect(() => {
    loadCandidates();
    getMutualMatches(cfg.apiUrl, cfg.githubId)
      .then((m) => setMatchCount(m.length))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cfg.apiUrl, cfg.githubId]);

  async function swipe(action: "like" | "pass"): Promise<void> {
    if (busy || !candidates) return;
    if (index >= candidates.length) return;
    const c = candidates[index];
    if (!c) return;
    setBusy(true);
    try {
      const result = await postSwipe(cfg.apiUrl, cfg.githubId, c.githubId, action);
      setStats((s) => ({
        likes: s.likes + (action === "like" ? 1 : 0),
        passes: s.passes + (action === "pass" ? 1 : 0),
        matches: s.matches + (result.mutual ? 1 : 0),
      }));
      if (result.mutual) {
        setFlash(`💘 It's a match with @${c.username}!  Press [m] to view.`);
        setMatchCount((n) => n + 1);
        setTimeout(() => setFlash(null), 3000);
      }
      setIndex((i) => i + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function openMatches(): Promise<void> {
    setPreviousView(view);
    setView("matches");
    setMatchesLoading(true);
    try {
      const m = await getMutualMatches(cfg.apiUrl, cfg.githubId);
      setMatches(m);
      setMatchCount(m.length);
      void markMatchesRead(cfg.apiUrl, cfg.githubId).catch(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setMatchesLoading(false);
    }
  }

  function openHelp(): void {
    setPreviousView(view);
    setView("help");
  }

  useInput((input, key) => {
    if (input === "q") {
      exit();
      return;
    }
    if (input === "?") {
      if (view !== "help") openHelp();
      return;
    }
    if (view === "matches") {
      if (input === "s" || key.escape) setView(previousView);
      return;
    }
    if (view === "help") {
      if (input === "s" || key.escape) setView(previousView);
      return;
    }
    if (key.escape) {
      exit();
      return;
    }
    if (input === "m") {
      void openMatches();
      return;
    }
    if (input === "r") {
      loadCandidates();
      return;
    }
    if (busy || !candidates) return;
    if (input === "l" || key.return || key.rightArrow) void swipe("like");
    else if (input === "p" || key.leftArrow) void swipe("pass");
  });

  const matchHint = {
    key: "m",
    label: matchCount > 0 ? `matches (${matchCount})` : "matches",
    highlight: matchCount > 0,
  };

  if (view === "matches") {
    return (
      <Box flexDirection="column">
        <Box
          paddingX={1}
          paddingY={0}
          borderStyle="round"
          borderColor="magentaBright"
          flexDirection="column"
        >
          <Header username={cfg.username} matchCount={matchCount} subtitle="matches" />
          <MatchesView matches={matches} loading={matchesLoading} />
        </Box>
        <FooterHint
          items={[
            { key: "s", label: "back to swipe" },
            { key: "?", label: "help" },
            { key: "q", label: "quit" },
          ]}
        />
      </Box>
    );
  }

  if (view === "help") {
    return (
      <Box flexDirection="column">
        <Box
          paddingX={1}
          paddingY={0}
          borderStyle="round"
          borderColor="cyan"
          flexDirection="column"
        >
          <HelpView />
        </Box>
        <FooterHint
          items={[
            { key: "s/esc", label: "back" },
            { key: "q", label: "quit" },
          ]}
        />
      </Box>
    );
  }

  if (error) {
    return (
      <Box flexDirection="column">
        <Box
          paddingX={1}
          paddingY={0}
          borderStyle="round"
          borderColor="red"
          flexDirection="column"
        >
          <Header username={cfg.username} matchCount={matchCount} />
          <Text color="red">Error: {error}</Text>
        </Box>
        <FooterHint
          items={[
            { key: "r", label: "retry" },
            { key: "?", label: "help" },
            { key: "q", label: "quit" },
          ]}
        />
      </Box>
    );
  }

  if (!candidates) {
    return (
      <Box flexDirection="column">
        <Box
          paddingX={1}
          paddingY={0}
          borderStyle="round"
          borderColor="magentaBright"
          flexDirection="column"
        >
          <Header username={cfg.username} matchCount={matchCount} />
          <Text>
            <Spinner type="dots" /> Loading candidates…
          </Text>
        </Box>
      </Box>
    );
  }

  if (candidates.length === 0 || index >= candidates.length) {
    const exhausted = candidates.length > 0 && index >= candidates.length;
    return (
      <Box flexDirection="column">
        <Box
          paddingX={1}
          paddingY={0}
          borderStyle="round"
          borderColor="magentaBright"
          flexDirection="column"
        >
          <Header username={cfg.username} matchCount={matchCount} />
          <Text bold>
            {exhausted ? "You've seen everyone 😴" : "No candidates right now 🦗"}
          </Text>
          <Text dimColor>
            {exhausted
              ? `This session: ❤️ ${stats.likes}  ✕ ${stats.passes}  💘 ${stats.matches}`
              : "Either everyone's been swiped, or there are no devs that match your profile yet."}
          </Text>
          <Box marginTop={1} flexDirection="column">
            <Text bold>What you can do:</Text>
            {matchCount > 0 ? (
              <Text>
                <Text color="magentaBright">  ▸ </Text>
                <Text bold color="magentaBright">
                  [m]
                </Text>
                <Text> view your {matchCount} mutual match{matchCount === 1 ? "" : "es"}</Text>
              </Text>
            ) : null}
            <Text>
              <Text color="cyan">  ▸ </Text>
              <Text bold>[r]</Text>
              <Text dimColor> refresh — check for new candidates</Text>
            </Text>
            <Text>
              <Text color="cyan">  ▸ </Text>
              <Text bold>[?]</Text>
              <Text dimColor> help &amp; how it works</Text>
            </Text>
            <Text>
              <Text color="cyan">  ▸ </Text>
              <Text bold>[q]</Text>
              <Text dimColor> quit</Text>
            </Text>
          </Box>
        </Box>
      </Box>
    );
  }

  const c = candidates[index]!;
  return (
    <Box flexDirection="column">
      <Box
        flexDirection="column"
        paddingX={1}
        paddingY={0}
        borderStyle="round"
        borderColor="magentaBright"
      >
        <Header
          username={cfg.username}
          matchCount={matchCount}
          subtitle={`${index + 1} of ${candidates.length}`}
        />
        <Card candidate={c} />
        {flash ? (
          <Box marginTop={1}>
            <Text bold color="magentaBright">
              {flash}
            </Text>
          </Box>
        ) : null}
        <Box marginTop={1}>
          <Text dimColor>
            session: ❤️ {stats.likes}  ✕ {stats.passes}  💘 {stats.matches}
          </Text>
        </Box>
      </Box>
      <FooterHint
        items={[
          { key: "l/→/↵", label: "like" },
          { key: "p/←", label: "pass" },
          matchHint,
          { key: "r", label: "refresh" },
          { key: "?", label: "help" },
          { key: "q", label: "quit" },
        ]}
      />
    </Box>
  );
}

export async function runSwipe(): Promise<void> {
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
