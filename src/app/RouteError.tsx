import { isRouteErrorResponse, Link, useRouteError } from "react-router-dom";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";

export function RouteError() {
  const err = useRouteError();
  const chunk =
    err instanceof Error &&
    /dynamically imported module|Loading chunk|Importing a module script/i.test(err.message);
  return (
    <div className="flex flex-col gap-4">
      <h1 tabIndex={-1} className="font-serif text-2xl font-semibold">
        {chunk ? "A new version is available" : "Something went wrong"}
      </h1>
      <Alert
        tone="error"
        role="alert"
        title={chunk ? "This page could not load." : "This page failed to render."}
      >
        {isRouteErrorResponse(err)
          ? `${err.status} ${err.statusText}`
          : "Reload to try again. Your saved drafts are kept."}
      </Alert>
      <div className="flex gap-2">
        <Button variant="primary" onClick={() => window.location.reload()}>
          Reload to get the latest version
        </Button>
        <Link
          to="/contracts"
          className="inline-flex h-control items-center px-3 text-link underline"
        >
          Go to contracts
        </Link>
      </div>
    </div>
  );
}
