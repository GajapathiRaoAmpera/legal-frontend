import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

// teach tailwind-merge our extra font size so `text-md` isn't mistaken for a color and dropped
const twMerge = extendTailwindMerge({ extend: { theme: { text: ["md"] } } });

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

export function assertNever(x: never): never {
  throw new Error(`Unexpected value: ${String(x)}`);
}
