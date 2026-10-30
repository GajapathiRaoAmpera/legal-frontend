import { useEffect } from "react";

export function useDocumentTitle(...parts: (string | null | undefined)[]): void {
  const title = [...parts.filter(Boolean), "Risk Reviewer"].join(" · ");
  useEffect(() => {
    document.title = title;
  }, [title]);
}
