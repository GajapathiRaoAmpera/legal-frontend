#!/usr/bin/env node
// Bundle budget (contract-ui-performance): shell (entry + its static imports) ≤ 180 KB gzip,
// each lazy route chunk (+ static imports not already in the shell) ≤ 120 KB gzip. react-pdf/pdfjs excluded.
import { readFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const SHELL_KB = 180;
const ROUTE_KB = 120;
const manifest = JSON.parse(readFileSync("dist/.vite/manifest.json", "utf8"));
const gz = (file) => gzipSync(readFileSync(`dist/${file}`)).length / 1024;

function closure(key, seen = new Set()) {
  const chunk = manifest[key];
  if (!chunk || seen.has(key)) return seen;
  seen.add(key);
  for (const imp of chunk.imports ?? []) closure(imp, seen);
  return seen;
}
const size = (keys) => [...keys].reduce((sum, k) => sum + gz(manifest[k].file), 0);

const entry = Object.keys(manifest).find((k) => manifest[k].isEntry);
const shell = closure(entry);
const shellKb = size(shell);
let failed = shellKb > SHELL_KB;
console.log(`${failed ? "FAIL" : "ok  "} shell ${shellKb.toFixed(1)} KB (≤ ${SHELL_KB})`);

const EXCLUDED = /react-pdf|pdfjs|SideBySidePreview|pdf\.worker/;
for (const [key, chunk] of Object.entries(manifest)) {
  if (!chunk.isDynamicEntry || EXCLUDED.test(key)) continue;
  const own = [...closure(key)].filter((k) => !shell.has(k));
  const kb = size(own);
  const bad = kb > ROUTE_KB;
  failed ||= bad;
  console.log(`${bad ? "FAIL" : "ok  "} ${key} ${kb.toFixed(1)} KB (≤ ${ROUTE_KB})`);
}
process.exit(failed ? 1 : 0);
