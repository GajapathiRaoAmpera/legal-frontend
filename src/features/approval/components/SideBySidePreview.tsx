// Lazy chunk (react-pdf + pdf.js worker bundled same-origin for CSP worker-src 'self').
import { useEffect, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import "react-pdf/dist/Page/TextLayer.css";
import { client } from "@/api/client";
import { Alert } from "@/components/ui/Alert";
import { Skeleton } from "@/components/ui/Skeleton";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export default function SideBySidePreview({ contractId }: { contractId: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [pages, setPages] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    let objectUrl: string | null = null;
    void client
      .GET("/api/v1/contracts/{contract_id}/export", {
        params: { path: { contract_id: contractId }, query: { format: "side_by_side_pdf" } },
        parseAs: "blob",
        signal: ctrl.signal,
      })
      .then(
        (r) => {
          if (r.data instanceof Blob) {
            objectUrl = URL.createObjectURL(r.data);
            setUrl(objectUrl);
          } else setFailed(true);
        },
        () => !ctrl.signal.aborted && setFailed(true),
      );
    return () => {
      ctrl.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [contractId]);

  if (failed) return <Alert tone="error" title="The preview could not be loaded." />;
  if (!url) return <Skeleton className="h-96 w-full" />;
  return (
    <div className="max-h-[80vh] overflow-auto rounded-lg border border-border bg-sunken p-2">
      <Document
        file={url}
        onLoadSuccess={(d) => setPages(d.numPages)}
        onLoadError={() => setFailed(true)}
        loading={<Skeleton className="h-96 w-full" />}
      >
        {/* shortcut: renders up to 20 pages without virtualization; virtualize if exports get long */}
        {Array.from({ length: Math.min(pages, 20) }, (_, i) => (
          <Page
            key={i}
            pageNumber={i + 1}
            width={760}
            renderAnnotationLayer={false}
            className="mx-auto mb-2"
          />
        ))}
      </Document>
    </div>
  );
}
