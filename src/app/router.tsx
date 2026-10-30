import { createBrowserRouter, Navigate, type RouteObject } from "react-router-dom";
import { AppShell } from "./AppShell";
import { ContractLayout } from "./ContractLayout";
import { RequireAuth } from "./RequireAuth";
import { RouteError } from "./RouteError";

// every leaf is lazy: one chunk per screen (contract-ui-performance §1)
export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { path: "/login", lazy: () => import("@/auth/LoginRoute") },
      {
        element: <RequireAuth />,
        errorElement: <RouteError />,
        children: [
          { path: "/", element: <Navigate to="/contracts" replace /> },
          { path: "/contracts", lazy: () => import("@/features/contracts/routes/ContractsRoute") },
          {
            path: "/contracts/:contractId",
            element: <ContractLayout />,
            children: [
              { index: true, lazy: () => import("@/features/viewer/routes/ViewerRoute") },
              { path: "risks", lazy: () => import("@/features/risk/routes/RisksRoute") },
              { path: "redlines", lazy: () => import("@/features/redlines/routes/RedlinesRoute") },
              { path: "approval", lazy: () => import("@/features/approval/routes/ApprovalRoute") },
            ],
          },
          { path: "/playbook", lazy: () => import("@/features/playbook/routes/PlaybookRoute") },
          {
            path: "/playbook/versions",
            lazy: () => import("@/features/playbook/routes/VersionsRoute"),
          },
          {
            path: "/playbook/versions/:a/diff/:b",
            lazy: () => import("@/features/playbook/routes/VersionDiffRoute"),
          },
          { path: "/eval", lazy: () => import("@/features/eval/routes/EvalRoute") },
          { path: "/eval/:runId", lazy: () => import("@/features/eval/routes/EvalRunRoute") },
        ],
      },
      { path: "*", lazy: () => import("./NotFoundRoute") },
    ],
  },
];

export const createRouter = () => createBrowserRouter(routes);
