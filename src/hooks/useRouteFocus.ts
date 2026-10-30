import { useEffect, useRef, type RefObject } from "react";
import { useLocation } from "react-router-dom";
import { announce } from "@/stores/announcer";

/**
 * After a pathname change (not the first load, not search-param changes): focus the route's
 * `<h1 tabIndex={-1}>` inside #main once the lazy chunk has rendered it, then announce document.title.
 */
export function useRouteFocus(): void {
  const { pathname } = useLocation();
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    let tries = 0;
    let frame = 0;
    const attempt = () => {
      const h1 = document.querySelector<HTMLElement>("#main h1");
      if (h1) {
        h1.focus();
        announce(document.title);
      } else if (tries++ < 60) frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    return () => cancelAnimationFrame(frame);
  }, [pathname]);
}

/** Focus a pane heading when `paneKey` changes (not on first render). */
export function usePaneFocus(ref: RefObject<HTMLElement | null>, paneKey: string | null): void {
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (paneKey) ref.current?.focus();
  }, [paneKey, ref]);
}
