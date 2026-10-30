/* eslint-disable no-console -- the one sanctioned console wrapper (CODE_STYLE §9); no-op in production */
type Fields = Record<string, string | number | boolean | null>;
const on = import.meta.env.DEV && import.meta.env.MODE !== "test";

export const log = {
  debug: (msg: string, f?: Fields) => on && console.debug(msg, f ?? ""),
  warn: (msg: string, f?: Fields) => on && console.warn(msg, f ?? ""),
  error: (msg: string, f?: Fields) => on && console.error(msg, f ?? ""),
};
