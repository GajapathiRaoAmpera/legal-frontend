import { Link } from "react-router-dom";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";

export function Component() {
  useDocumentTitle("Not found");
  return (
    <div className="flex flex-col gap-3">
      <h1 tabIndex={-1} className="font-serif text-2xl font-semibold">
        Page not found
      </h1>
      <p>
        <Link to="/contracts" className="text-link underline">
          Go to contracts
        </Link>
      </p>
    </div>
  );
}
