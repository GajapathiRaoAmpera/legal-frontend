#!/usr/bin/env node
// Token gate (ADR-0003): no color literals, arbitrary color utilities or inline style colors outside src/styles/tokens.css.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ALLOWED = new Set(["src/styles/tokens.css"]);
const RULES = [
  [/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(|oklch\(/, "color literal"],
  [/\b(bg|text|border|ring|fill|stroke|outline|from|via|to|shadow|decoration)-\[/, "arbitrary color/shadow utility"],
  [/style=\{\{[^}]*\b(color|background|backgroundColor|borderColor|fill|stroke|outlineColor)\s*:/, "inline style color"],
];

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (/\.(tsx?|css)$/.test(name) && !name.endsWith(".d.ts")) yield p;
  }
}

let failures = 0;
for (const file of walk("src")) {
  if (ALLOWED.has(file.replaceAll("\\", "/"))) continue;
  readFileSync(file, "utf8")
    .split("\n")
    .forEach((line, i) => {
      for (const [re, what] of RULES) {
        if (re.test(line)) {
          failures++;
          console.error(`${file}:${i + 1}: ${what}: ${line.trim().slice(0, 120)}`);
        }
      }
    });
}
console.log(failures ? `check-tokens: ${failures} violation(s)` : "check-tokens: ok");
process.exit(failures ? 1 : 0);
