// @paz/config Tailwind preset.
// Design tokens carried forward from the legacy Horizons prototype
// (apps/web/src/index.css) — the editorial, calm aesthetic was already
// correct; only the delivery mechanism changes.
/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  theme: {
    container: { center: true, padding: "2rem", screens: { "2xl": "1400px" } },
    extend: {
      // Standing Specifications, 18 Sept 2026, "Type": "Face, body and
      // interface alike: Literata... No sans serif anywhere, and that
      // includes the interface chrome. Where small interface text is
      // wanted, it is set in Literata, heavier and more widely tracked,
      // not in a second face." Both keys point at the same face rather
      // than removing `font-sans`/`font-serif` from every call site
      // across the app -- same visual outcome (one face, everywhere),
      // without an invasive rename sweep. `ne` carries the provisional
      // Devanagari face (Tiro Devanagari Hindi) for the /ne locale, kept
      // separate from the Latin stack since it's a different font file
      // entirely, not a fallback within one family.
      fontFamily: {
        serif: ["Literata", "Georgia", "serif"],
        sans: ["Literata", "Georgia", "serif"],
        ne: ['"Tiro Devanagari Hindi"', "Literata", "sans-serif"],
      },
      maxWidth: {
        // Standing Specifications, 18 Sept 2026, "Type": "Measure: 66
        // characters, fixed." `ch` is defined by the current font's own
        // "0" glyph width, so this is the literal ruling rather than an
        // rem-based guess at it -- was 38rem. Single token, so every
        // `max-w-reading` usage (the .w-reading utility class, and the
        // many reading pages -- Papers, Brief, Dispatch, the Record --
        // that use the Tailwind class directly) gets it at once.
        reading: "66ch",
        standard: "52rem",
        wide: "78rem",
      },
      colors: {
        brand: {
          DEFAULT: "hsl(var(--brand))",
          soft: "hsl(var(--brand-soft))",
        },
        verdigris: {
          DEFAULT: "hsl(var(--verdigris))",
          soft: "hsl(var(--verdigris-soft))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
