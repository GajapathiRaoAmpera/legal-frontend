import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import "@fontsource-variable/ibm-plex-sans";
import "@fontsource-variable/source-serif-4";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import { makeQueryClient } from "@/app/queryClient";
import { createRouter } from "@/app/router";
import { Toaster } from "@/components/ui/Toaster";
import { bootstrapUi } from "@/stores/ui";
import "@/styles/app.css";

// theme/density before first paint; no inline script in index.html (CSP script-src 'self')
bootstrapUi();

async function start() {
  if (import.meta.env.MODE === "mock") {
    const { worker } = await import("@/mocks/browser");
    await worker.start({ onUnhandledRequest: "bypass", quiet: true });
  }
  const root = document.getElementById("root");
  if (!root) return;
  createRoot(root).render(
    <StrictMode>
      <QueryClientProvider client={makeQueryClient()}>
        <Tooltip.Provider delayDuration={300}>
          <RouterProvider router={createRouter()} />
          <Toaster />
        </Tooltip.Provider>
      </QueryClientProvider>
    </StrictMode>,
  );
}
void start();
