import React, { useEffect, useState } from "react";
import { Box, Text, render, useApp, useInput } from "ink";
import Spinner from "ink-spinner";
import { readConfig, printNotConfigured } from "../lib/config.js";
import type { LocalConfig } from "../lib/config.js";
import { getProfile, postProfile, type Gender, type Profile } from "../lib/api.js";

const GENDERS: Array<{ value: Gender; label: string }> = [
  { value: "man", label: "Man" },
  { value: "woman", label: "Woman" },
  { value: "other", label: "Other" },
];

type Step = "gender" | "preference" | "saving" | "done" | "error";

function Header({ username }: { username: string }): React.ReactElement {
  return (
    <Box marginBottom={1}>
      <Text>
        <Text bold color="magentaBright">
          clawd.date
        </Text>
        <Text dimColor> · </Text>
        <Text>@{username}</Text>
        <Text dimColor> · </Text>
        <Text dimColor>profile</Text>
      </Text>
    </Box>
  );
}

export function App({ cfg }: { cfg: LocalConfig }): React.ReactElement {
  const { exit } = useApp();
  const [initial, setInitial] = useState<Profile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>("gender");
  // -1 = nothing selected yet, so a new user can't accidentally accept the
  // first option ("man") with two enters before moving the cursor.
  const [genderIndex, setGenderIndex] = useState(-1);
  const [gender, setGender] = useState<Gender | null>(null);
  const [prefIndex, setPrefIndex] = useState(0);
  const [preference, setPreference] = useState<Set<Gender>>(new Set());

  // The save flow uses setStep("done") + a brief delay before exit() so the
  // user sees the "Saved" frame. The timer is held in state so a clean unmount
  // (e.g. q during the post-save window) cancels it instead of leaking.
  const [exitTimer, setExitTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (exitTimer) clearTimeout(exitTimer);
  }, [exitTimer]);

  useEffect(() => {
    getProfile(cfg.apiUrl, cfg.authToken)
      .then((p) => {
        setInitial(p);
        if (p.gender) {
          const idx = GENDERS.findIndex((g) => g.value === p.gender);
          if (idx >= 0) setGenderIndex(idx);
        }
        if (p.genderPreference.length > 0) {
          setPreference(new Set(p.genderPreference));
        }
      })
      .catch((e: unknown) =>
        setLoadError(e instanceof Error ? e.message : String(e)),
      );
  }, [cfg.apiUrl, cfg.authToken]);

  async function save(finalGender: Gender, finalPref: Gender[]): Promise<void> {
    setStep("saving");
    setSaveError(null);
    try {
      await postProfile(cfg.apiUrl, cfg.authToken, {
        gender: finalGender,
        genderPreference: finalPref,
      });
      setStep("done");
      setExitTimer(setTimeout(() => exit(), 800));
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
      setStep("error");
    }
  }

  useInput((input, key) => {
    if (input === "q" || key.escape) {
      exit();
      return;
    }
    // Ignore everything else until the initial profile has loaded — otherwise
    // an Enter pressed during the spinner would silently advance steps.
    if (!initial) return;
    if (step === "gender") {
      if (key.upArrow || input === "k") {
        setGenderIndex((i) => (i <= 0 ? GENDERS.length - 1 : i - 1));
        return;
      }
      if (key.downArrow || input === "j") {
        setGenderIndex((i) => (i < 0 ? 0 : (i + 1) % GENDERS.length));
        return;
      }
      if (key.return) {
        if (genderIndex < 0) return;
        const picked = GENDERS[genderIndex]!.value;
        setGender(picked);
        setStep("preference");
        return;
      }
      return;
    }
    if (step === "preference") {
      if (key.upArrow || input === "k") {
        setPrefIndex((i) => (i - 1 + GENDERS.length) % GENDERS.length);
        return;
      }
      if (key.downArrow || input === "j") {
        setPrefIndex((i) => (i + 1) % GENDERS.length);
        return;
      }
      if (input === " ") {
        const value = GENDERS[prefIndex]!.value;
        setPreference((s) => {
          const next = new Set(s);
          if (next.has(value)) next.delete(value);
          else next.add(value);
          return next;
        });
        return;
      }
      if (key.return) {
        if (preference.size === 0 || gender == null) return;
        void save(gender, Array.from(preference));
        return;
      }
      if (input === "b") {
        setStep("gender");
        return;
      }
      return;
    }
    if (step === "error") {
      if (input === "r" && gender != null) {
        void save(gender, Array.from(preference));
      }
    }
  });

  if (loadError) {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="red">
        <Header username={cfg.username} />
        <Text color="red">Failed to load profile: {loadError}</Text>
        <Text dimColor>Press q to quit.</Text>
      </Box>
    );
  }

  if (!initial) {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="magentaBright">
        <Header username={cfg.username} />
        <Text>
          <Spinner type="dots" /> Loading profile…
        </Text>
      </Box>
    );
  }

  if (step === "saving") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="magentaBright">
        <Header username={cfg.username} />
        <Text>
          <Spinner type="dots" /> Saving…
        </Text>
      </Box>
    );
  }

  if (step === "done") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="green">
        <Header username={cfg.username} />
        <Text color="green">✅ Saved.</Text>
      </Box>
    );
  }

  if (step === "error") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="red">
        <Header username={cfg.username} />
        <Text color="red">Error: {saveError}</Text>
        <Box marginTop={1}>
          <Text dimColor>[r] retry  · [q] quit</Text>
        </Box>
      </Box>
    );
  }

  if (step === "gender") {
    return (
      <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="magentaBright">
        <Header username={cfg.username} />
        <Text bold>I am a…</Text>
        <Box flexDirection="column" marginTop={1}>
          {GENDERS.map((g, i) => {
            const selected = i === genderIndex;
            return (
              <Text key={g.value} color={selected ? "magentaBright" : undefined}>
                {selected ? "▸ " : "  "}
                {g.label}
              </Text>
            );
          })}
        </Box>
        <Box marginTop={1}>
          <Text dimColor>↑/↓ move  ·  ↵ select  ·  q quit</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingX={1} borderStyle="round" borderColor="magentaBright">
      <Header username={cfg.username} />
      <Text bold>Show me…</Text>
      <Text dimColor>Pick one or more.</Text>
      <Box flexDirection="column" marginTop={1}>
        {GENDERS.map((g, i) => {
          const cursor = i === prefIndex;
          const checked = preference.has(g.value);
          return (
            <Text key={g.value} color={cursor ? "magentaBright" : undefined}>
              {cursor ? "▸ " : "  "}
              {checked ? "[x] " : "[ ] "}
              {g.label}
            </Text>
          );
        })}
      </Box>
      {preference.size === 0 ? (
        <Box marginTop={1}>
          <Text color="yellow">Pick at least one to save.</Text>
        </Box>
      ) : null}
      <Box marginTop={1}>
        <Text dimColor>
          ↑/↓ move  ·  space toggle  ·  ↵ save  ·  b back  ·  q quit
        </Text>
      </Box>
    </Box>
  );
}

export async function runProfile(): Promise<void> {
  const cfg = readConfig();
  if (!cfg) {
    printNotConfigured();
    process.exit(1);
  }
  const { waitUntilExit } = render(<App cfg={cfg} />);
  await waitUntilExit();
}
