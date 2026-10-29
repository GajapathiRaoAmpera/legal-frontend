#!/usr/bin/env node
// WCAG 2.2 contrast gate for design tokens. Zero dependencies.
// Reads src/styles/tokens.css, falling back to the tokens:begin/end block in docs/DESIGN_SYSTEM.md.
// Exit 1 if any required pair is below threshold. Usage: node scripts/check-contrast.mjs [--md]
import { existsSync, readFileSync } from "node:fs";

const css = existsSync("src/styles/tokens.css")
  ? readFileSync("src/styles/tokens.css", "utf8")
  : readFileSync("docs/DESIGN_SYSTEM.md", "utf8").split("/* tokens:begin */")[1].split("/* tokens:end */")[0];

function block(selector) {
  const start = css.indexOf(selector + " {");
  if (start < 0) throw new Error(`missing selector ${selector}`);
  const body = css.slice(start, css.indexOf("\n}", start));
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const light = block(":root");
const themes = { light, dark: { ...light, ...block('[data-theme="dark"]') } };

function resolve(vars, name, depth = 0) {
  const v = vars[name];
  if (v === undefined || depth > 8) throw new Error(`unresolved token ${name}`);
  const ref = v.match(/^var\((--[\w-]+)\)$/);
  return ref ? resolve(vars, ref[1], depth + 1) : v;
}
function lum(hex) {
  const n = hex.replace("#", "");
  return [0, 2, 4]
    .map((i) => parseInt(n.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((acc, c, i) => acc + c * [0.2126, 0.7152, 0.0722][i], 0);
}
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

const SURFACES = ["canvas", "surface", "sunken", "raised", "overlay"].map((s) => `--color-bg-${s}`);
const pairs = [];
for (const bg of SURFACES) {
  for (const fg of ["default", "muted", "subtle", "link"]) pairs.push([`--color-fg-${fg}`, bg, 4.5, "text"]);
  for (const l of ["high", "medium", "low"]) pairs.push([`--color-risk-${l}-fg`, bg, 4.5, "text+icon"]);
  pairs.push(["--color-focus-ring", bg, 3, "focus ring"]);
  pairs.push(["--color-border-strong", bg, 3, "control border"]);
}
pairs.push(
  ["--color-fg-on-primary", "--color-primary", 4.5, "button text"],
  ["--color-fg-on-primary", "--color-primary-hover", 4.5, "button text"],
  ["--color-fg-on-danger", "--color-danger", 4.5, "button text"],
  ["--color-fg-default", "--color-search-match-bg", 4.5, "body on search hit"],
  ["--color-fg-default", "--color-diff-ins-bg", 4.5, "diff text"],
  ["--color-fg-default", "--color-diff-del-bg", 4.5, "diff text"],
  ["--color-diff-ins-fg", "--color-diff-ins-bg", 3, "diff decoration"],
  ["--color-diff-del-fg", "--color-diff-del-bg", 3, "diff decoration"],
);
for (const l of ["high", "medium", "low"]) {
  pairs.push(
    [`--color-risk-${l}-fg`, `--color-risk-${l}-bg`, 4.5, "badge text"],
    ["--color-fg-default", `--color-risk-${l}-mark`, 4.5, "body on highlight"],
    [`--color-risk-${l}-fg`, `--color-risk-${l}-mark`, 3, "highlight edge"],
  );
}
// informational only: decorative divider, not a WCAG requirement
const info = [["--color-border-default", "--color-bg-surface", 0, "decorative divider (info)"]];

let failed = 0;
const md = process.argv.includes("--md");
if (md) console.log("| Theme | Foreground | Background | Ratio | Req | Use | Pass |\n|---|---|---|---|---|---|---|");
for (const [theme, vars] of Object.entries(themes)) {
  const seen = new Set();
  for (const [fg, bg, req, use] of [...pairs, ...info]) {
    const f = resolve(vars, fg);
    const b = resolve(vars, bg);
    const key = `${fg}|${b}`; // light raised/overlay == surface: skip duplicate rows
    if (seen.has(key)) continue;
    seen.add(key);
    const r = ratio(f, b);
    const ok = r >= req;
    if (!ok) failed++;
    const name = (t) => t.replace("--color-", "");
    if (md) console.log(`| ${theme} | ${name(fg)} \`${f}\` | ${name(bg)} \`${b}\` | ${r.toFixed(2)} | ${req || "-"} | ${use} | ${ok ? "yes" : "NO"} |`);
    else if (!ok) console.error(`FAIL ${theme}: ${fg} ${f} on ${bg} ${b} = ${r.toFixed(2)} < ${req}`);
  }
}
console.log(failed ? `contrast: ${failed} failing pair(s)` : "contrast: all pairs pass");
process.exit(failed ? 1 : 0);
