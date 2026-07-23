import * as React from "react";
import { Link } from "react-router-dom";

/**
 * Shared editorial-site presentational primitives, ported from the
 * pre-rebuild Horizons prototype's visual language (warm palette, Fraunces
 * serif, scroll-reveal) onto the current data model. Site-chrome only —
 * these render nothing from Supabase themselves, callers pass content in.
 */

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [seen, setSeen] = React.useState(false);

  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Not every environment has this (older browsers, jsdom in tests) —
    // degrade to "always visible" rather than throwing.
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${seen ? "reveal-in" : ""} ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="type-label mb-6">{children}</p>;
}

export function ArrowLink({
  to,
  children,
  external,
}: {
  to: string;
  children: React.ReactNode;
  external?: boolean;
}) {
  const className =
    "group inline-flex items-center gap-2 type-caption text-brand hover:text-foreground transition-colors";
  if (external) {
    return (
      <a href={to} className={className}>
        {children}
        <ArrowRightIcon />
      </a>
    );
  }
  return (
    <Link to={to} className={className}>
      {children}
      <ArrowRightIcon />
    </Link>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className="h-4 w-4 transition-transform group-hover:translate-x-1"
      aria-hidden="true"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function PageHero({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string | undefined;
}) {
  return (
    <header className="border-border border-b">
      <div className="w-wide pb-16 pt-40 md:pb-24 md:pt-48">
        {kicker && <Eyebrow>{kicker}</Eyebrow>}
        <Reveal>
          <h1 className="type-h1 max-w-4xl">{title}</h1>
        </Reveal>
        {subtitle && (
          <Reveal delay={120}>
            <p className="type-body-lg w-standard mt-8 !px-0">{subtitle}</p>
          </Reveal>
        )}
      </div>
    </header>
  );
}

export function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-5xl leading-none md:text-6xl">{value}</div>
      <div className="type-caption mt-3">{label}</div>
    </div>
  );
}
