import { useEffect, useRef } from "react";
import { useUiStore } from "@/stores/ui";

export function isEditableTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (t as HTMLInputElement).type;
    return !["checkbox", "radio", "button", "submit", "reset", "range", "file"].includes(type);
  }
  return t.getAttribute("role") === "textbox";
}

const dialogOpen = () =>
  document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  ) !== null;

/**
 * Single-key shortcuts (WCAG 2.1.4): ignored in editable fields, with Ctrl/Alt/Meta held,
 * while a dialog is open, or when disabled in Settings. Keys are `KeyboardEvent.key` values ("j", "/", "?").
 */
export function useHotkeys(
  map: Record<string, (e: KeyboardEvent) => void>,
  opts: { enabled?: boolean } = {},
): void {
  const enabled = opts.enabled ?? true;
  const shortcutsOn = useUiStore((s) => s.shortcutsEnabled);
  const ref = useRef(map);
  ref.current = map;

  useEffect(() => {
    if (!enabled || !shortcutsOn) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
      if (isEditableTarget(e.target) || dialogOpen()) return;
      const handler = ref.current[e.key];
      if (handler) handler(e);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [enabled, shortcutsOn]);
}
