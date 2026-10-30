import DiffMatchPatch from "diff-match-patch";

export type DiffOp = { op: -1 | 0 | 1; text: string };

const TOKEN = /(\s+|[^\p{L}\p{N}\s])/u;

/** Map each distinct word/space/punctuation token to one char (the line-mode trick applied to words). */
function encode(text: string, dict: Map<string, string>, tokens: string[]): string {
  let out = "";
  for (const t of text.split(TOKEN)) {
    if (!t) continue;
    let ch = dict.get(t);
    if (ch === undefined) {
      let code = tokens.length + 1;
      if (code >= 0xd800) code += 0x800; // skip the surrogate range so chars stay single code units
      ch = String.fromCharCode(code);
      dict.set(t, ch);
      tokens.push(t);
    }
    out += ch;
  }
  return out;
}

/** Semantic word-level diff (never character-level noise). Text stays plain strings; render as text nodes. */
export function diffWords(
  original: string,
  proposed: string,
  opts: { timeoutMs?: number } = {},
): DiffOp[] {
  const dmp = new DiffMatchPatch();
  dmp.Diff_Timeout = (opts.timeoutMs ?? 1000) / 1000;
  const dict = new Map<string, string>();
  const tokens: string[] = [];
  const a = encode(original, dict, tokens);
  const b = encode(proposed, dict, tokens);
  const diffs = dmp.diff_main(a, b, false);
  dmp.diff_cleanupSemantic(diffs);
  const decode = (s: string) =>
    s
      .split("")
      .map((c) => {
        let code = c.charCodeAt(0);
        if (code >= 0xe000) code -= 0x800;
        return tokens[code - 1] ?? "";
      })
      .join("");
  const ops: DiffOp[] = [];
  for (const [op, chars] of diffs) {
    const text = decode(chars);
    if (!text) continue;
    const last = ops.at(-1);
    if (last && last.op === op) last.text += text;
    else ops.push({ op: op as DiffOp["op"], text });
  }
  return ops;
}

export const DIFF_LIMIT = 200_000;
