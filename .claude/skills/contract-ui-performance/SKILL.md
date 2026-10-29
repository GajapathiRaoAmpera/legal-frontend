---
name: contract-ui-performance
description: Use when touching performance-sensitive frontend code — virtualizing 200+ page contracts or long tables, route code splitting and bundle budgets, progressive clause loading, SSE progress streams and reconnects, optimistic updates with rollback, query caching/invalidation, or when a screen feels slow (INP, jank, layout shift).
---

# contract-ui-performance

## Purpose
Keep the tool fast on real contracts (up to ~1M chars and ~2,000 clauses) and responsive during live agent runs, with correct cache behavior under optimistic updates and reconnecting streams.

## Inputs / Outputs

```ts
import type { Contract, ContractStatus, ClauseWithRisk, Page, Redline } from "@/api/types";
import type { ContractEvent, ProgressEvent } from "@/api/sse";
// GET /api/v1/contracts/{id}/clauses?limit&offset → Page<ClauseWithRisk> = { items; total; limit; offset }
// GET /api/v1/contracts/{id}/events?access_token= → SSE: progress {stage,node,done,total,message} | status {status} | done | error

type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";
type Budget = { shellKb: 180; routeChunkKb: 120 };                 // gzip, enforced by scripts/check-bundle.mjs
const ACTIVE_STATUSES: ReadonlySet<ContractStatus> = new Set(["uploaded", "parsing", "analyzing"]);
```

Signatures:
```ts
export function useContractEvents(contractId: string, opts: { enabled: boolean; onEvent?: (e: ContractEvent) => void }):
  { lastProgress: ProgressEvent | null; status: ContractStatus | null; connection: ConnectionState };
export function parseSseEvent(type: string, data: string | null): ContractEvent | null;          // pure, validates shape, null on garbage
export function backoffDelay(attempt: number, rand?: () => number): number;                       // 1s·2^n, cap 30s, ±20% jitter
export function useClauses(contractId: string): UseInfiniteQueryResult<InfiniteData<Page<ClauseWithRisk>>, ApiError>;
export function useVirtualBlocks(opts: { count: number; getScrollElement: () => HTMLElement | null; estimateSize: (i: number) => number }): Virtualizer<HTMLElement, Element>;
export function optimisticListUpdate<T extends { id: string }>(qc: QueryClient, key: QueryKey, id: string, patch: Partial<T>): Promise<{ previous: T[] | undefined }>;
```

## Procedure
1. **Code splitting**: every route in `router.tsx` uses `lazy: () => import("@/features/x/routes/XRoute")`. Heavy libraries are imported only inside their route or a lazy component: `react-pdf` (approval preview), `diff-match-patch` (redlines, playbook diff), eval charts. Prefetch the viewer chunk on contract row hover/focus (`import()` call). Handle chunk load errors in the route `errorElement` with "Reload to get the latest version".
2. **Bundle budget**: after `vite build`, `scripts/check-bundle.mjs` reads `dist/.vite/manifest.json` (`build.manifest: true`), gzips each entry plus its static imports, and fails if the shell exceeds 180 KB or any route chunk exceeds 120 KB. Run in `/verify`.
3. **Virtualized text** (`@tanstack/react-virtual`): virtualize the `TextBlock[]` from contract-viewer-ux, with `estimateSize = Math.ceil(block.length / 90) * 26 + 16` (chars per line × line height), `measureElement` for real heights, `overscan: 6`, and `getItemKey: i => blocks[i].start`. The container has a fixed height (flex child with `min-h-0`), never window scrolling, so the sticky summary works. Compute segments inside the block component with `useMemo`, and wrap blocks in `React.memo` keyed by `(block, spansVersion, matchVersion)`.
4. **Span indexing**: sort spans once by start. Per block, binary-search the first span with `end > block.start` and walk until `start >= block.end`. Never filter the whole span array per block.
5. **Progressive clauses**: `useInfiniteQuery({ queryKey: keys.clauses(id), queryFn: ({pageParam}) => GET …?limit=200&offset=pageParam, initialPageParam: 0, getNextPageParam: (last) => last.offset + last.limit < last.total ? last.offset + last.limit : undefined })`. A `useEffect` fetches the next page while `hasNextPage && !isFetchingNextPage` (sequential, one in flight, which respects the 60 req/min limit for 2,000 clauses = 10 requests). Flatten with `useMemo(() => data.pages.flatMap(p => p.items), [data])`. Derive spans incrementally: rebuild only when the page count changes.
6. **SSE** (`useContractEvents`):
   - Open `new EventSource(url)` with `url = ${API_BASE}/contracts/${id}/events?access_token=${encodeURIComponent(session.getToken())}` only when `opts.enabled`.
   - `addEventListener("progress"|"status"|"done", …)` parses via `parseSseEvent`. Garbage is ignored (dev `log.warn`).
   - The `"error"` listener receives **both** server `event: error` (a `MessageEvent` with `data`) and transport errors (a plain `Event`). If `e instanceof MessageEvent && e.data` it is a terminal server error: close and set status `failed` in the cache. Otherwise, if `es.readyState === EventSource.CLOSED`, schedule a reconnect after `backoffDelay(attempt++)` with a **fresh token**. If `CONNECTING`, the browser is auto-retrying, so set `"reconnecting"`.
   - `open` resets `attempt = 0`, sets `"open"`, and **invalidates `keys.contract(id)`** (events during the gap are lost and there is no Last-Event-ID replay).
   - `status`: `qc.setQueryData(keys.contract(id), c => c && { ...c, status })` and invalidate `["contracts"]` lists (throttled to 2s).
   - `done`: close, then invalidate clauses, risk-report, redlines and package.
   - Close when the status leaves `ACTIVE_STATUSES`, on unmount, and after 60s of `document.hidden`, reopening on `visibilitychange` visible.
   - Throttle React state updates from `progress` to one per animation frame (`requestAnimationFrame` coalescing). Announcements are throttled separately (legal-a11y).
   - On the list page, stream at most 6 contracts (the HTTP/1.1 per-origin connection limit). Others poll `GET /contracts/{id}` every 5s via `refetchInterval`.
7. **Optimistic updates** (redlines, comments): `optimisticListUpdate` = `await qc.cancelQueries({queryKey: key})`, then `previous = qc.getQueryData<T[]>(key)`, then `qc.setQueryData<T[]>(key, list => list?.map(x => x.id === id ? {...x, ...patch} : x))`, then return `{previous}`. `onError: (_e, _v, ctx) => ctx && qc.setQueryData(key, ctx.previous)`. `onSettled: invalidate`. Use mutation `scope` per entity so they run serially. **Never** optimistic for approvals or uploads.
8. **Query defaults** (`queryClient.ts`): `staleTime 30s`, `gcTime 5min`, no retry on 4xx, `refetchOnWindowFocus` on for package/redlines. Contract text has `staleTime: Infinity` and is removed from the cache on leaving the contract (`qc.removeQueries({queryKey: keys.contractText(id)})` in the contract layout's unmount).
9. **Rendering hygiene**: no `useEffect`-derived state, and `useMemo` only for O(n) work over clauses/segments. Use `useDeferredValue` for the search query and table filters. `startTransition` for filter toggles (`h`). Reserve space for skeletons (CLS < 0.05). Self-hosted fonts with `font-display: swap` and preload of the two variable fonts only.
10. **Measure**: Playwright `@slow` large-contract spec (TESTING.md) plus manual Chrome Performance trace, recording INP and long tasks in the PR description when touching the viewer.

## Edge cases
- **SSE token expiry** during a long run: the reconnect uses a fresh token. If the session is gone (401 elsewhere), stop reconnecting and let the auth redirect happen.
- **Backend restarts**: repeated transport errors cap at 30s backoff. After 10 failed attempts, show "Live updates paused. Retry." and fall back to polling every 10s.
- **Duplicate/out-of-order progress**: ignore a `progress` whose `done` is less than the last `done` for the same `stage`.
- **Optimistic rollback overlapping a refetch**: `cancelQueries` in `onMutate` prevents an in-flight GET from overwriting the optimistic value, and `onSettled` invalidation reconciles.
- **Unmount during mutation**: the mutation lives in the QueryClient, so rollback still applies. Toasts are global.
- **200+ pages with search**: `findMatches` over 1M chars runs in less than 20ms with `indexOf`. If the query is 1 char, require ≥2 chars before searching.
- **Huge single paragraph** (no blank lines): `splitIntoBlocks` hard-splits at `maxBlockChars`, so no block is taller than about 3 viewports.
- **Scroll anchoring** when measured heights differ from estimates: rely on the virtualizer's `scrollToIndex` after measurement, calling it again in `requestAnimationFrame` once for deep links.
- **Mobile/tablet**: same virtualization. Touch scrolling must not be blocked by `pointer` listeners (`passive: true`).

## Definition of done
- [ ] All routes lazy; heavy libs only in their chunks; budget script passes
- [ ] 200-page fixture: < 200 DOM blocks, first highlight < 2s after text, no long task > 100ms while scrolling
- [ ] `parseSseEvent`, `backoffDelay`, reconnect-with-fresh-token and refetch-on-open unit-tested with a fake EventSource
- [ ] Optimistic helpers tested for success, error rollback, and concurrent mutations
- [ ] No server data in Zustand; query keys come from `keys.ts`; invalidations listed per mutation
- [ ] CLS < 0.05 on list, viewer and dashboard (skeletons with final dimensions)

## Anti-patterns
- Rendering the full contract text or all clauses as DOM nodes.
- `window` scroll virtualization under a sticky layout. One `useEffect` per clause.
- Polling `GET /contracts/{id}` every second while an SSE stream is open.
- Treating every `"error"` event as fatal, or reconnecting with the same stale URL forever.
- Optimistic approval, or optimistic updates without `cancelQueries` and a snapshot.
- Importing `react-pdf` or `diff-match-patch` from shared modules (they leak into the shell chunk).
- Fetching all clause pages in parallel (rate limit 429s).
