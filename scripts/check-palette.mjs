#!/usr/bin/env node
// Build Programme 18: the palette's accessibility limits, enforced.
//
// Measured against the ground #F5F0E8: text and brick pass for body and small
// text; verdigris passes for large text only, so it may sit on a rule, a
// panel edge or a heading and never on body text, a link or a label; the
// rule colour is a rule and never text. This fails when a source file
// reaches for those colours in a way that breaks the limits.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const GROUND = "#F5F0E8";
const COLOURS = { text: "#23201D", brick: "#8C4A38", verdigris: "#4F8677", rule: "#C9C1B4" };

function luminance(hex) {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const ratios = Object.fromEntries(
  Object.entries(COLOURS).map(([k, v]) => [k, contrast(v, GROUND)]),
);
const problems = [];
if (ratios.text < 7) problems.push(`text ${ratios.text.toFixed(1)}:1 is below 7:1`);
if (ratios.brick < 4.5) problems.push(`brick ${ratios.brick.toFixed(1)}:1 is below 4.5:1`);
if (ratios.verdigris >= 4.5) {
  // Fine if it ever rises, but then this check should be relaxed on purpose.
  problems.push("verdigris now passes 4.5:1; revisit this check deliberately");
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules" || name === "dist" || name === "build") continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(tsx|ts|css)$/.test(name)) out.push(p);
  }
  return out;
}

// Verdigris and the rule colour are never text: no text-*, no link classes,
// no label classes built from them.
const FORBIDDEN = [
  [/text-verdigris/, "verdigris set as text"],
  [/text-border(?![-\w])/, "the rule colour set as text"],
  [/hover:text-verdigris/, "verdigris set as link text"],
  [/(?<![-\w])color:\s*hsl\(var\(--verdigris/, "verdigris set as a CSS text colour"],
  [/(?<![-\w])color:\s*hsl\(var\(--border/, "the rule colour set as a CSS text colour"],
];
for (const root of ["apps/web/src", "packages/ui/src"]) {
  for (const file of walk(root)) {
    const text = readFileSync(file, "utf8");
    for (const [re, why] of FORBIDDEN) {
      if (re.test(text)) problems.push(`${file}: ${why}`);
    }
  }
}

console.log(
  Object.entries(ratios)
    .map(([k, v]) => `${k} ${v.toFixed(1)}:1`)
    .join(", "),
);
if (problems.length) {
  console.error(problems.join("\n"));
  process.exit(1);
}
console.log("Palette limits hold.");
