import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LogIn } from "lucide-react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { errorMessage, type ApiError } from "@/api/errors";
import type { DevUser } from "@/api/types";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/cn";
import { devTokenProvider, prefetchMe, safeNext } from "./auth";
import { useSession } from "./useSession";

const USERS: { id: DevUser; name: string; role: string; blurb: string }[] = [
  {
    id: "rita",
    name: "Rita",
    role: "Reviewer",
    blurb: "Uploads contracts and decides on redlines.",
  },
  {
    id: "larry",
    name: "Larry",
    role: "Lawyer",
    blurb: "Approves, requests changes or rejects packages.",
  },
  { id: "ada", name: "Ada", role: "Admin", blurb: "Maintains the playbook and runs evaluations." },
];

export function Component() {
  useDocumentTitle("Sign in");
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const s = useSession();
  const [user, setUser] = useState<DevUser>("rita");
  const signIn = useMutation<unknown, ApiError, DevUser>({
    mutationFn: async (u) => {
      await devTokenProvider.signIn({ user: u });
      await prefetchMe(qc);
    },
    onSuccess: () => navigate(safeNext(params.get("next")), { replace: true }),
  });

  if (s && !signIn.isPending && !signIn.isSuccess)
    return <Navigate to={safeNext(params.get("next"))} replace />;
  const disabled = signIn.error !== null && [403, 404, 405].includes(signIn.error.status);
  const chosen = USERS.find((u) => u.id === user) ?? USERS[0];

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-6 py-8">
      <div>
        <h1 tabIndex={-1} className="font-serif text-2xl font-semibold">
          Sign in to Risk Reviewer
        </h1>
        <p className="mt-1 text-fg-muted">
          Development sign-in: choose a test user. Roles come from the server.
        </p>
      </div>
      {disabled ? (
        <Alert tone="error" role="alert" title="Dev sign-in is disabled on this server.">
          <Button className="mt-2" aria-disabled="true" aria-describedby="sso-note">
            Sign in with SSO
          </Button>
          <p id="sso-note" className="mt-1 text-sm text-fg-muted">
            Single sign-on is not configured in this build.
          </p>
        </Alert>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!signIn.isPending) signIn.mutate(user);
          }}
        >
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Test user</legend>
            {USERS.map((u) => (
              <label
                key={u.id}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-lg border bg-surface p-3",
                  user === u.id ? "border-primary" : "border-border",
                )}
              >
                <input
                  type="radio"
                  name="user"
                  value={u.id}
                  checked={user === u.id}
                  onChange={() => setUser(u.id)}
                  className="mt-1 size-4 accent-primary"
                />
                <span>
                  <span className="block font-medium">
                    {u.name} <span className="font-normal text-fg-muted">({u.role})</span>
                  </span>
                  <span className="text-sm text-fg-muted">{u.blurb}</span>
                </span>
              </label>
            ))}
          </fieldset>
          {signIn.error ? (
            <Alert tone="error" role="alert" title="Sign-in failed.">
              {errorMessage(signIn.error)}
            </Alert>
          ) : null}
          <Button type="submit" variant="primary" leadingIcon={LogIn} loading={signIn.isPending}>
            Sign in as {chosen?.name}
          </Button>
        </form>
      )}
    </div>
  );
}
