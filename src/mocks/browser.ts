// `pnpm dev:mock`: the whole API (incl. simulated SSE progress) served by MSW in the browser.
import { setupWorker } from "msw/browser";
import { handlers, makeSseHandlers } from "@/test/handlers";

export const worker = setupWorker(...makeSseHandlers(), ...handlers);
