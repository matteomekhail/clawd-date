import React, { useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { requireConfig } from "../lib/config.js";
import {
  getMutualMatches,
  markMatchesRead,
  type MutualMatch,
} from "../lib/api.js";

function App(): React.ReactElement {
  const { exit } = useApp();
  const [matches, setMatches] = useState<MutualMatch[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cfg = requireConfig();

  useEffect(() => {
    (async () => {
      try {
        const m = await getMutualMatches(cfg.apiUrl, cfg.githubId);
        setMatches(m);
        await markMatchesRead(cfg.apiUrl, cfg.githubId).catch(() => {});
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [cfg.apiUrl, cfg.githubId]);

  useInput((input, key) => {
    if (input === "q" || key.escape || key.return) exit();
  });

  if (error) {
    return (
      <Box padding={1}>
        <Text color="red">Error: {error}</Text>
      </Box>
    );
  }
  if (!matches) {
    return (
      <Box padding={1}>
        <Text>
          <Spinner type="dots" /> Loading matches…
        </Text>
      </Box>
    );
  }
  if (matches.length === 0) {
    return (
      <Box
        padding={1}
        borderStyle="round"
        borderColor="gray"
        flexDirection="column"
      >
        <Text bold>No mutual matches yet 🦗</Text>
        <Text dimColor>Run `clawd-date` to swipe. Press any key to quit.</Text>
      </Box>
    );
  }

  return (
    <Box
      padding={1}
      borderStyle="round"
      borderColor="magentaBright"
      flexDirection="column"
    >
      <Text bold color="magentaBright">
        💘 {matches.length} mutual match{matches.length === 1 ? "" : "es"}
      </Text>
      <Box marginTop={1} flexDirection="column">
        {matches.map((m) => (
          <Box key={m.id} marginBottom={1} flexDirection="column">
            <Text>
              <Text bold>@{m.username}</Text>
              {"  "}
              <Text color="cyan">https://github.com/{m.username}</Text>
            </Text>
            {m.bio ? <Text dimColor>  {m.bio}</Text> : null}
            <Text dimColor>  {m.languages.slice(0, 4).join(", ")}</Text>
          </Box>
        ))}
      </Box>
      <Text dimColor>Press any key to quit.</Text>
    </Box>
  );
}

export async function runMatches(): Promise<void> {
  const { waitUntilExit } = render(<App />);
  await waitUntilExit();
}
