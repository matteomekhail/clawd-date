import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "Install clawd.date",
  description:
    "Two commands. One GitHub Device Flow. Then claude code starts noticing other devs while you ship.",
};

export default function InstallPage() {
  return (
    <main className="relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 sm:inset-5 border border-rule/40 z-0"
      />

      <span
        aria-hidden
        className="hidden md:block pointer-events-none absolute top-24 right-10 lg:right-16 text-oxblood/25 text-7xl select-none z-0"
        style={{
          fontFamily: "var(--font-display)",
        }}
      >
        ✻
      </span>

      <div className="relative z-10 mx-auto w-full max-w-[1080px] px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-16 sm:pb-24">
        <Nav current="install" />

        <Header />

        <div className="hatched-rule opacity-50 mt-14 sm:mt-20 mb-14 sm:mb-20" aria-hidden />

        <SectionPrereq />
        <SectionRun />
        <SectionAlternative />
        <SectionWhatHappens />
        <SectionUninstall />

        <div className="hatched-rule opacity-50 mt-20 sm:mt-24 mb-12 sm:mb-16" aria-hidden />

        <PageFooter />

        <p className="mt-10 text-[11px] tracking-[0.06em] text-ink-faint">
          developed by{" "}
          <a
            href="https://matteomekhail.dev"
            target="_blank"
            rel="noopener noreferrer"
            className="text-ink-soft underline decoration-rule decoration-[1px] underline-offset-[3px] hover:text-oxblood hover:decoration-oxblood transition-colors"
          >
            matteo mekhail
          </a>
        </p>
      </div>
    </main>
  );
}

function Header() {
  return (
    <header className="mt-12 sm:mt-16 lg:mt-20 max-w-[36ch] lg:max-w-none">
      <h1 className="animate-fade-up [animation-delay:200ms] font-display text-ink leading-[0.9] tracking-[-0.02em] text-[clamp(2.6rem,7vw,6rem)]">
        <span>One </span>
        <span className="text-oxblood">command</span>
        <span className="text-ink">.</span>
      </h1>
      <p className="animate-fade-up [animation-delay:340ms] mt-7 sm:mt-9 max-w-[52ch] text-ink-soft text-[15.5px] sm:text-[17px] leading-[1.55]">
        no signup form, no password, no email magic link. github decides who you
        are; the cli does everything else.
      </p>
    </header>
  );
}

function SectionPrereq() {
  return (
    <Section>
      <SectionHeading>Before you start.</SectionHeading>
      <Paragraph>three things on your machine, all of which you almost certainly already have:</Paragraph>
      <ul className="mt-6 space-y-3 text-ink-soft text-[15.5px] leading-[1.6] max-w-[60ch]">
        <Item>
          <Code>node ≥ 20</Code> — check with <Code>node -v</Code>. anything
          newer also fine.
        </Item>
        <Item>
          <Code>claude code</Code> installed and at least one session run. the
          skill plugs into the same <Code>~/.claude/settings.json</Code> as the
          rest of your hooks.
        </Item>
        <Item>
          a <Code>github</Code> account. that&rsquo;s your identity here. you
          authorize it via device flow — no password ever leaves the browser.
        </Item>
      </ul>
    </Section>
  );
}

function SectionRun() {
  return (
    <Section>
      <SectionHeading>Two commands.</SectionHeading>
      <Paragraph>
        first one drops the binary on your <Code>$PATH</Code>. second one logs
        you in via github device flow and wires up the claude code hooks.
      </Paragraph>

      <CodeBlock>{`$ npm i -g clawd-date
$ clawd-date init`}</CodeBlock>

      <Paragraph>
        prefer a different package manager? same package, same flags:
      </Paragraph>

      <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ManagerCard manager="npm" command="npm i -g clawd-date" />
        <ManagerCard manager="pnpm" command="pnpm add -g clawd-date" />
        <ManagerCard manager="bun" command="bun add -g clawd-date" />
      </div>

      <Paragraph>
        on <Code>init</Code> the cli prints a short code and a github url. open
        the url, paste the code, click authorize. that&rsquo;s the whole login.
      </Paragraph>

      <CodeBlock>{`  Open this URL in your browser:
    https://github.com/login/device
  and enter the code:
    XXXX-XXXX

  Waiting for you to authorize…
  Verifying with backend…

  ✅ Authenticated as @yourhandle
  ✅ Config saved to ~/.config/clawd-date/config.json
  ✅ Hooks installed: SessionStart, SessionEnd
  ✅ Statusline installed`}</CodeBlock>

      <Paragraph>
        open a fresh claude code session. you&rsquo;ll see the statusline pick
        up at the bottom. you&rsquo;re live. from now on:
      </Paragraph>

      <CodeBlock>{`$ clawd-date           # open the swipe deck
$ clawd-date matches   # see your mutual matches`}</CodeBlock>
    </Section>
  );
}

function SectionAlternative() {
  return (
    <Section>
      <SectionHeading>Don&rsquo;t want to install globally?</SectionHeading>
      <Paragraph>
        run it through <Code>npx</Code> instead. it grabs the latest version
        each time and throws it away when it&rsquo;s done. fine for a one-off
        try, slower for daily use because every <Code>clawd-date</Code> command
        re-downloads.
      </Paragraph>

      <CodeBlock>{`$ npx clawd-date init      # one-shot, no global install`}</CodeBlock>

      <Paragraph>
        the hooks installed by <Code>init</Code> reference{" "}
        <Code>clawd-date</Code> directly, not <Code>npx clawd-date</Code>{" "}
        — so if you go this route, the statusline and session hooks
        won&rsquo;t fire. for the full experience, go global.
      </Paragraph>
    </Section>
  );
}

function SectionWhatHappens() {
  return (
    <Section>
      <SectionHeading>What gets touched.</SectionHeading>
      <Paragraph>
        the cli writes in two places, both in your home directory, both
        reversible:
      </Paragraph>

      <CodeBlock>{`~/.config/clawd-date/config.json   # mode 0600 — token + identity
~/.claude/settings.json            # hooks + statusline pointer`}</CodeBlock>

      <Paragraph>
        before touching <Code>settings.json</Code> the cli copies it to{" "}
        <Code>settings.json.backup-&lt;timestamp&gt;</Code>. if you have a
        custom statusline, the cli detects it and steps aside instead of
        overwriting.
      </Paragraph>

      <PullQuote>
        nothing global, nothing root, nothing in <Code>$PATH</Code> beyond the
        bin npm already manages.
      </PullQuote>

      <Paragraph>
        the auth token is a 1-year HMAC-signed bearer scoped to your github id.
        every request to clawd.date is verified server-side; the token is the
        only thing that proves it&rsquo;s you.
      </Paragraph>
    </Section>
  );
}

function SectionUninstall() {
  return (
    <Section>
      <SectionHeading>Leaving cleanly.</SectionHeading>
      <Paragraph>
        one command undoes the install. removes the hooks, the statusline, the
        config, the cache, and (if present) any stragglers from the old{" "}
        <Code>clawd-match</Code> name.
      </Paragraph>

      <CodeBlock>{`$ clawd-date uninstall      # remove hooks, config, cache
$ npm uninstall -g clawd-date   # then drop the binary itself`}</CodeBlock>

      <Paragraph>
        order matters: <Code>uninstall</Code> needs the binary to know what to
        clean up. drop it after, with the same package manager you used to
        install (<Code>pnpm rm -g</Code> / <Code>bun rm -g</Code> work too).
      </Paragraph>

      <Paragraph>
        your row in the database stays unless you ask. drop us a line and
        we&rsquo;ll wipe it.
      </Paragraph>
    </Section>
  );
}

function PageFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-5">
      <Link
        href="/"
        className="group inline-flex items-center gap-1.5 border-b border-ink/40 pb-1 text-[13px] tracking-tight text-ink transition-colors hover:border-oxblood hover:text-oxblood"
      >
        <span
          aria-hidden
          className="transition-transform group-hover:-translate-x-0.5"
        >
          ←
        </span>
        <span>back to home</span>
      </Link>

      <div className="flex items-center gap-4 sm:gap-6">
        <Link
          href="/how-matching-works"
          className="group inline-flex items-center gap-1.5 border-b border-ink/40 pb-1 text-[13px] tracking-tight text-ink transition-colors hover:border-oxblood hover:text-oxblood"
        >
          <span>how matching works</span>
          <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
            ↗
          </span>
        </Link>

        <div className="inline-flex items-center gap-2 bg-ink text-bone px-3 py-1.5 text-[13px] tracking-tight font-mono select-all">
          <span aria-hidden className="text-amber/85">$</span>
          <span>npm i -g clawd-date</span>
        </div>
      </div>
    </footer>
  );
}

function Section({ children }: { children: ReactNode }) {
  return (
    <section className="mt-16 sm:mt-24 first:mt-0 max-w-[64ch]">
      {children}
    </section>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2
      className="font-display text-ink text-[clamp(1.6rem,3vw,2.3rem)] leading-[1.15] tracking-[-0.01em]"
      style={{ fontVariationSettings: '"SOFT" 30, "opsz" 144' }}
    >
      {children}
    </h2>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return (
    <p className="mt-5 text-ink-soft text-[15.5px] leading-[1.65] max-w-[58ch]">
      {children}
    </p>
  );
}

function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.86em] bg-paper-warm/85 text-ink px-1.5 py-[1px] rounded-[2px] whitespace-nowrap">
      {children}
    </code>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <div className="mt-7 paper-card overflow-hidden">
      <pre className="bg-[#0f0a07] text-bone overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] font-mono whitespace-pre">
        <code>{children}</code>
      </pre>
    </div>
  );
}

function PullQuote({ children }: { children: ReactNode }) {
  return (
    <blockquote
      className="mt-9 border-l-2 border-oxblood pl-5 text-ink text-[18px] sm:text-[20px] leading-[1.45] max-w-[52ch]"
      style={{ fontFamily: "var(--font-display)" }}
    >
      {children}
    </blockquote>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-3">
      <span aria-hidden className="text-oxblood select-none mt-[2px]">·</span>
      <span>{children}</span>
    </li>
  );
}

function ManagerCard({
  manager,
  command,
}: {
  manager: string;
  command: string;
}) {
  return (
    <div className="paper-card overflow-hidden">
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-rule/60 bg-paper-warm">
        <span aria-hidden className="h-2 w-2 rounded-full bg-rust/70" />
        <span aria-hidden className="h-2 w-2 rounded-full bg-amber/75" />
        <span aria-hidden className="h-2 w-2 rounded-full bg-sage/75" />
        <span className="ml-2 text-[10px] tracking-[0.18em] text-ink-faint uppercase">
          {manager}
        </span>
      </div>
      <pre className="bg-[#0f0a07] text-bone px-4 py-3 text-[12.5px] leading-[1.6] font-mono select-all">
        <span className="text-amber/85">$ </span>
        {command}
      </pre>
    </div>
  );
}
