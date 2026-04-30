import Link from "next/link";

type NavProps = {
  current?: "home" | "how";
};

export function Nav({ current }: NavProps) {
  return (
    <nav className="flex items-center justify-between text-[11px] tracking-[0.18em] text-ink-soft animate-fade-in">
      <Link
        href="/"
        aria-label="clawd.date home"
        className="inline-flex items-center group"
      >
        <Logomark />
      </Link>
      <Link
        href="/how-matching-works"
        aria-current={current === "how" ? "page" : undefined}
        className={
          current === "how"
            ? "text-ink font-bold"
            : "hover:text-oxblood transition-colors"
        }
      >
        how it works
      </Link>
    </nav>
  );
}

function Logomark() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="block h-[22px] w-[22px] transition-transform group-hover:rotate-[-6deg]"
      role="img"
      aria-label="clawd.date"
    >
      <circle cx="12" cy="12" r="11.5" fill="#6e1a25" />
      <circle
        cx="12"
        cy="12"
        r="9.6"
        fill="none"
        stroke="#f1e7d2"
        strokeWidth="0.6"
        strokeDasharray="0.9 1.6"
        opacity="0.55"
      />
      <path
        d="M 12 18.6
           C 6.7 14.7, 4.6 11.4, 4.6 8.8
           C 4.6 7.1, 5.9 5.8, 7.6 5.8
           C 9.2 5.8, 10.7 6.7, 12 8.7
           C 13.3 6.7, 14.8 5.8, 16.4 5.8
           C 18.1 5.8, 19.4 7.1, 19.4 8.8
           C 19.4 11.4, 17.3 14.7, 12 18.6 Z"
        fill="#f1e7d2"
      />
    </svg>
  );
}
