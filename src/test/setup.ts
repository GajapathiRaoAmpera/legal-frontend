/* eslint-disable @typescript-eslint/no-unnecessary-condition, @typescript-eslint/unbound-method -- jsdom polyfills: these members are missing at runtime despite the DOM types */
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, expect, vi } from "vitest";
import * as matchers from "vitest-axe/matchers";
import { session } from "@/auth/session";
import { useDraftsStore } from "@/stores/drafts";
import { useToasts } from "@/stores/toasts";
import { useViewerStore } from "@/stores/viewer";
import { resetDb } from "./handlers";
import { server } from "./server";

expect.extend(matchers);

// jsdom's AbortSignal fails Node's Request brand check, and the data router builds a Request per navigation.
// shortcut: drops abort signals in tests; remove once vitest's jsdom env shares Node's AbortSignal.
const NodeRequest = globalThis.Request;
globalThis.Request = class extends NodeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    super(input, init && { ...init, signal: null });
  }
};

// jsdom gaps
class RO {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= RO as unknown as typeof ResizeObserver;
window.matchMedia ??= vi.fn((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addEventListener: () => undefined,
  removeEventListener: () => undefined,
  addListener: () => undefined,
  removeListener: () => undefined,
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;
Element.prototype.scrollIntoView ??= () => undefined;
HTMLElement.prototype.hasPointerCapture ??= () => false;
HTMLElement.prototype.releasePointerCapture ??= () => undefined;
// virtualizer measures 0 in jsdom; give elements a size so rows render
Object.defineProperties(HTMLElement.prototype, {
  offsetHeight: { configurable: true, get: () => 600 },
  offsetWidth: { configurable: true, get: () => 800 },
});
Element.prototype.getBoundingClientRect = function () {
  return {
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 600,
    right: 800,
    width: 800,
    height: 600,
    toJSON: () => ({}),
  };
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  resetDb();
  session.clear();
  localStorage.clear();
  useDraftsStore.getState().clearAll();
  useToasts.setState({ toasts: [] });
  useViewerStore.getState().reset();
});
afterAll(() => server.close());
