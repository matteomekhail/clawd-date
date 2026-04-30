import Image from "next/image";
import { Nav } from "@/components/Nav";

export function Hero() {
  return (
    <main className="relative min-h-screen overflow-hidden flex flex-col">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-3 sm:inset-5 border border-rule/40 z-0"
      />

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-5 sm:px-8 lg:px-12 pt-6 sm:pt-8 pb-8 flex-1 flex flex-col">
        <Nav current="home" />

        <section className="my-auto relative grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-10 lg:items-start py-10 sm:py-14">
          <div className="lg:col-span-6 relative">
            <Headline />
            <Subhead />
            <CTAs />
          </div>

          <div className="lg:col-span-6 relative flex justify-center">
            <CliStack />
          </div>
        </section>

        <div className="hatched-rule opacity-50" aria-hidden />

        <p className="mt-5 text-[11px] tracking-[0.06em] text-ink-faint">
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

      <Ornaments />
    </main>
  );
}

function Headline() {
  return (
    <h1 className="animate-fade-up [animation-delay:200ms] font-display text-ink leading-[0.86] tracking-[-0.025em] text-[clamp(3rem,8.4vw,7.6rem)]">
      <span className="block">Love at first</span>
      <span className="relative inline-block mt-2 sm:mt-3">
        <span className="text-oxblood">commit</span>
        <span className="text-ink">.</span>
        <svg
          aria-hidden
          className="absolute -bottom-2 sm:-bottom-3 left-0 w-[78%]"
          viewBox="0 0 400 14"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M2 9 C 70 2, 150 13, 230 6 S 380 9, 398 5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            className="text-oxblood/45"
          />
        </svg>
      </span>
    </h1>
  );
}

function Subhead() {
  return (
    <p className="animate-fade-up [animation-delay:340ms] mt-7 sm:mt-9 max-w-[44ch] text-pretty text-ink-soft text-[15.5px] sm:text-[17px] leading-[1.55]">
      a dating app for developers, paired by your{" "}
      <span className="text-ink">claude code</span> history. because chemistry
      is mostly{" "}
      <span className="text-ink underline decoration-oxblood decoration-[2px] underline-offset-[5px]">
        shared taste in dependencies
      </span>
      .
    </p>
  );
}

function CTAs() {
  return (
    <div className="animate-fade-up [animation-delay:480ms] mt-9 sm:mt-10 flex flex-wrap items-center gap-x-6 gap-y-4">
      <div className="inline-flex items-center gap-2 bg-ink text-bone px-3 py-1.5 text-[13px] tracking-tight font-mono select-all">
        <span aria-hidden className="text-amber/85">$</span>
        <span>npx clawd-date init</span>
      </div>

      <a
        href="/install"
        className="group inline-flex items-center gap-1.5 border-b border-ink/40 pb-1 text-[13px] tracking-tight text-ink transition-colors hover:border-oxblood hover:text-oxblood"
      >
        <span>install in 30 seconds</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          ↗
        </span>
      </a>

      <a
        href="/how-matching-works"
        className="group inline-flex items-center gap-1.5 border-b border-ink/40 pb-1 text-[13px] tracking-tight text-ink transition-colors hover:border-oxblood hover:text-oxblood"
      >
        <span>how matching works</span>
        <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
          ↗
        </span>
      </a>
    </div>
  );
}

function CliStack() {
  return (
    <div className="animate-fade-up [animation-delay:560ms] w-full max-w-[640px] relative flex flex-col gap-3 sm:gap-4">
      <div
        className="paper-card relative overflow-hidden self-start w-[88%] sm:w-[82%]"
        style={{ transform: "rotate(-1.6deg)" }}
      >
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-rule/60 bg-paper-warm">
          <span aria-hidden className="h-2 w-2 rounded-full bg-rust/70" />
          <span aria-hidden className="h-2 w-2 rounded-full bg-amber/75" />
          <span aria-hidden className="h-2 w-2 rounded-full bg-sage/75" />
        </div>
        <div className="bg-[#0a0a0a]">
          <Image
            src="/cli-claude.png"
            alt="Claude Code launch screen with the clawd.date skill loaded"
            width={1138}
            height={382}
            sizes="(min-width: 1280px) 520px, (min-width: 1024px) 42vw, 90vw"
            className="block w-full h-auto"
          />
        </div>
      </div>

      <div className="mt-4 sm:mt-6 w-full flex justify-center">
        <div className="inline-flex items-center gap-2 bg-ink text-bone px-3 py-1.5 text-[13px] tracking-tight font-mono select-all">
          <span aria-hidden className="text-amber/85">$</span>
          <span>clawd-date</span>
          <span
            aria-hidden
            className="inline-block w-[7px] h-[14px] bg-bone animate-blink translate-y-[1px]"
          />
        </div>
      </div>

      <div className="paper-card animate-float-tilt relative overflow-hidden self-end w-full">
        <span
          aria-hidden
          className="absolute -top-3 left-12 h-5 w-24 bg-amber/65 mix-blend-multiply rotate-[-4deg] z-30 pointer-events-none"
        />
        <span
          aria-hidden
          className="absolute -top-2 right-14 h-4 w-16 bg-rust/35 mix-blend-multiply rotate-[6deg] z-30 pointer-events-none"
        />

        <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-rule/60 bg-paper-warm">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rust/70" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber/75" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-sage/75" />
        </div>

        <div className="bg-[#0a0a0a]">
          <Image
            src="/cli-tight.png"
            alt="clawd-date CLI in the terminal"
            width={1280}
            height={472}
            priority
            sizes="(min-width: 1280px) 600px, (min-width: 1024px) 50vw, 100vw"
            className="block w-full h-auto"
          />
        </div>
      </div>
    </div>
  );
}

function Ornaments() {
  return (
    <span
      aria-hidden
      className="hidden md:block pointer-events-none absolute top-24 right-10 lg:right-16 text-oxblood/30 text-7xl select-none"
      style={{
        fontFamily: "var(--font-display)",
      }}
    >
      ✻
    </span>
  );
}
