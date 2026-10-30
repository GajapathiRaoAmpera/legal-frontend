import type { ReactElement } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { session } from "@/auth/session";
import { Toaster } from "@/components/ui/Toaster";
import { fakeJwt, USERS } from "./handlers";

export function loginAs(user: keyof typeof USERS | null) {
  if (user) session.set({ access_token: fakeJwt(user), user: USERS[user] });
}

/** Real QueryClient (no retries) + memory router so routes/params/search work like the app. */
export function renderWithProviders(
  ui: ReactElement,
  {
    route = "/",
    path = "/",
    user = "rita",
  }: { route?: string; path?: string; user?: keyof typeof USERS | null } = {},
) {
  loginAs(user);
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    [
      { path, element: ui },
      { path: "*", element: <p>Elsewhere</p> },
    ],
    {
      initialEntries: [route],
    },
  );
  const utils = render(
    <QueryClientProvider client={qc}>
      <Tooltip.Provider>
        <RouterProvider router={router} />
        <Toaster />
      </Tooltip.Provider>
    </QueryClientProvider>,
  );
  return { ...utils, qc, router };
}
