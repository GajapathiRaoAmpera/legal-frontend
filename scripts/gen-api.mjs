#!/usr/bin/env node
// Regenerate src/api/schema.d.ts from the backend OpenAPI schema (ADR-0002).
// Source order: $OPENAPI_URL (default http://localhost:8000/openapi.json, 3s timeout, refreshes the local snapshot)
// → ../legal-backend/openapi.json → ./openapi.snapshot.json. A file path in OPENAPI_URL is also accepted.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const SNAPSHOT = "openapi.snapshot.json";
const BACKEND = "../legal-backend/openapi.json";
const OUT = "src/api/schema.d.ts";
const url = process.env.OPENAPI_URL ?? "http://localhost:8000/openapi.json";

async function pickSource() {
  if (!/^https?:/.test(url)) {
    if (existsSync(url)) return { path: url, label: url };
  } else {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
      const body = res.ok ? await res.json() : null;
      // port 8000 may be another local app: only accept a schema that has our contracts API
      if (body?.paths?.["/api/v1/contracts"]) {
        writeFileSync(SNAPSHOT, JSON.stringify(body, null, 2) + "\n");
        return { path: SNAPSHOT, label: `${url} (snapshot refreshed)` };
      }
      if (body) console.warn(`gen:api: ${url} is not the Risk Reviewer API, ignoring it`);
    } catch {
      // backend not running: fall through to committed snapshots
    }
  }
  if (existsSync(BACKEND)) return { path: BACKEND, label: BACKEND };
  if (existsSync(SNAPSHOT)) return { path: SNAPSHOT, label: SNAPSHOT };
  return null;
}

const src = await pickSource();
if (!src) {
  console.error("Start the backend (make -C ../legal-backend up) or export its schema.");
  process.exit(1);
}
JSON.parse(readFileSync(src.path, "utf8")); // fail fast on invalid JSON
console.log(`gen:api source: ${src.label}`);
const bin = (name) => `node_modules/.bin/${name}`;
execFileSync(bin("openapi-typescript"), [src.path, "-o", OUT, "--alphabetize"], { stdio: "inherit" });
execFileSync(bin("prettier"), ["--write", OUT], { stdio: "inherit" });
