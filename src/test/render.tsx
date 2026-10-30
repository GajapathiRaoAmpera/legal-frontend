import type { ReactElement } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, type RouteObject } from "react-router-dom";
import { routes } from "@/app/router";
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
    routes: appRoutes,
  }: {
    route?: string;
    path?: string;
    user?: keyof typeof USERS | null;
    routes?: RouteObject[];
  } = {},
) {
  loginAs(user);
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
  const router = createMemoryRouter(
    appRoutes ?? [
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

/** The whole app (shell, layouts, lazy routes) at `route`, signed in as `user`. */
export function renderApp(route: string, user: keyof typeof USERS | null = "rita") {
  return renderWithProviders(<></>, { user, route, routes });
}
