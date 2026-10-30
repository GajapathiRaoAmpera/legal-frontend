import { useEffect, useRef } from "react";
import { announce } from "@/stores/announcer";

/** Announce `message` at most every `minIntervalMs`, immediately when `force(prev,next)` is true (e.g. stage change). */
export function useThrottledAnnouncement(
  message: string | null,
  minIntervalMs = 5000,
  force: (prev: string, next: string) => boolean = () => false,
): void {
  const last = useRef({ at: 0, text: "" });
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!message || message === last.current.text) return;
    const fire = () => {
      last.current = { at: Date.now(), text: message };
      announce(message);
    };
    const wait = minIntervalMs - (Date.now() - last.current.at);
    if (pending.current) clearTimeout(pending.current);
    if (wait <= 0 || force(last.current.text, message)) fire();
    else pending.current = setTimeout(fire, wait);
  }, [message, minIntervalMs, force]);

  useEffect(
    () => () => {
      if (pending.current) clearTimeout(pending.current);
    },
    [],
  );
}
