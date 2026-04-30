import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "How matching works",
  description:
    "The method behind clawd.date. Two points per shared language, one per shared tool. No horoscopes, no AI matchmaker, no quiz.",
};

export default function HowMatchingWorksPage() {
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
        <Nav current="how" />

        <Header />

        <div className="hatched-rule opacity-50 mt-14 sm:mt-20 mb-14 sm:mb-20" aria-hidden />

        <SectionData />
        <SectionMath />
        <SectionMatch />

        <div className="hatched-rule opacity-50 mt-20 sm:mt-24 mb-12 sm:mb-16" aria-hidden />

        <Aside />

        <div className="hatched-rule opacity-50 mt-16 sm:mt-20 mb-10 sm:mb-14" aria-hidden />

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
        <span>How matching </span>
        <span className="text-oxblood">works</span>
        <span className="text-ink">.</span>
      </h1>
    </header>
  );
}

function SectionData() {
  return (
    <Section>
      <SectionHeading>We don&rsquo;t ask you for a profile.</SectionHeading>
      <Paragraph>
        when you run <Code>clawd-date init</Code>, the skill installs a
        claude&nbsp;code <Code>SessionEnd</Code> hook. after every session, the
        hook reads what you actually did (the languages you wrote in, the
        tools and binaries you reached for) and pushes a small record to
        clawd.date.
      </Paragraph>
      <Paragraph>two arrays end up on your user row:</Paragraph>
      <CodeBlock>
        {`{
  languages: ["TypeScript", "Rust", "Python"],
  tools:     ["Convex", "Next.js", "Bun"]
}`}
      </CodeBlock>
      <Paragraph>
        that&rsquo;s your profile. it updates every time you ship something.
        there&rsquo;s nothing else to write, nothing to maintain, no bio that
        slowly drifts away from who you actually are.
      </Paragraph>
    </Section>
  );
}

function SectionMath() {
  return (
    <Section>
      <SectionHeading>Two points per language. One per tool.</SectionHeading>
      <Paragraph>
        when you open the swipe deck, every other dev&rsquo;s arrays are
        intersected with yours. the score is{" "}
        <span className="text-ink font-medium">
          twice the shared languages, plus the shared tools.
        </span>
      </Paragraph>

      <CodeBlock>
        {`const sharedLanguages = candidate.languages.filter(
  (lang) => mine.has(lang),
);
const sharedTools = candidate.tools.filter(
  (tool) => mine.has(tool),
);

const score =
  sharedLanguages.length * 2 +
  sharedTools.length;`}
      </CodeBlock>

      <Paragraph>
        sorted descending. the top <Code>50</Code> come back. anyone you&rsquo;ve
        already swiped on is filtered out before you ever see them.
      </Paragraph>

      <PullQuote>
        we considered ast shapes, commit cadence, embeddings of your{" "}
        <Code>CLAUDE.md</Code>. we settled on counting.
      </PullQuote>

      <WorkedExample />
    </Section>
  );
}

function SectionMatch() {
  return (
    <Section>
      <SectionHeading>Both swipe yes. That&rsquo;s the protocol.</SectionHeading>
      <Paragraph>
        the cli shows you one candidate at a time. press <Code>[l]</Code> to
        like, <Code>[p]</Code> to pass. likes are private. nobody finds out
        you liked them unless they like you back.
      </Paragraph>
      <Paragraph>
        when two people both like each other, the swipe handler writes a
        notification into both inboxes in the same transaction. open{" "}
        <Code>[m]</Code> in the cli to see your matches; the github handle is
        right there. the rest is up to you.
      </Paragraph>
    </Section>
  );
}

function Aside() {
  const items = [
    "no personality quiz, no mbti, no horoscope.",
    "no selfies. no carousel of curated thirst traps.",
    "no “ai” claim about who you’d be compatible with.",
    "no ad networks. no trackers. no profile sold to anyone.",
    "no leaked likes. the like is hidden until both sides commit.",
  ];

  return (
    <ul className="space-y-2.5 text-ink-soft text-[15.5px] leading-[1.6] max-w-[64ch]">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span aria-hidden className="text-oxblood select-none">·</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
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

      <div className="inline-flex items-center gap-2 bg-ink text-bone px-3 py-1.5 text-[13px] tracking-tight font-mono select-all">
        <span aria-hidden className="text-amber/85">$</span>
        <span>clawd-date init</span>
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
      <pre className="bg-[#0f0a07] text-bone overflow-x-auto px-5 py-4 text-[13px] leading-[1.7] font-mono">
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

function WorkedExample() {
  const example = `you  vs.  @theo-tabs-not-spaces

languages
  yours    TypeScript, Rust, Python
  theirs   TypeScript
  shared   TypeScript                      → +2

tools
  yours    Convex, Next.js, Bun, Tailwind
  theirs   Convex, Bun, Tailwind
  shared   Convex, Bun, Tailwind           → +3

score   = 5`;

  return (
    <div className="mt-9 paper-card relative">
      <pre className="font-mono text-[13px] leading-[1.7] text-ink whitespace-pre overflow-x-auto px-5 py-4">
        {example}
      </pre>
    </div>
  );
}
