import { useEffect, useRef, useState } from "react";
import { Upload } from "lucide-react";
import { errorMessage } from "@/api/errors";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Field, inputClass } from "@/components/ui/Field";
import { cn } from "@/lib/cn";
import { useUpload } from "../hooks/useContracts";
import { validateFile } from "../lib/validateFile";

export function UploadDialog({ onUploaded }: { onUploaded?: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const upload = useUpload();

  useEffect(() => {
    if (retryIn <= 0) return;
    const t = setTimeout(() => setRetryIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [retryIn]);

  const pick = (f: File | null) => {
    setFile(f);
    setFileError(f ? validateFile(f) : null);
    upload.reset();
  };

  const submit = () => {
    const err = validateFile(file);
    setFileError(err);
    if (err || !file) {
      inputRef.current?.focus();
      return;
    }
    upload.mutate(
      { file, title: title.trim() },
      {
        onSuccess: (c) => {
          setOpen(false);
          setFile(null);
          setTitle("");
          onUploaded?.(c.id);
        },
        onError: (e) => {
          if ([413, 415, 422].includes(e.status)) {
            setFileError(errorMessage(e));
            inputRef.current?.focus();
          }
          if (e.status === 429) setRetryIn(e.retryAfter ?? 60);
        },
      },
    );
  };

  const serverErr =
    upload.error && ![413, 415, 422].includes(upload.error.status) ? upload.error : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) upload.reset();
      }}
      title="Upload contract"
      description="Upload a .docx or .pdf (up to 25 MB). Analysis starts automatically."
      trigger={
        <Button variant="primary" leadingIcon={Upload}>
          Upload contract
        </Button>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <Field
          label="Contract file"
          required
          error={fileError}
          helper=".docx or .pdf, up to 25 MB. You can also drop a file here."
        >
          {(p) => (
            // drop target only; the native file input inside is the keyboard path
            <div
              role="presentation"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pick(e.dataTransfer.files[0] ?? null);
              }}
              className={cn(
                "rounded-md border border-dashed p-4",
                dragging ? "border-primary bg-sunken" : "border-border-strong bg-surface",
              )}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => pick(e.target.files?.[0] ?? null)}
                className="w-full text-base file:mr-3 file:h-control file:rounded-md file:border file:border-border-strong file:bg-surface file:px-3 file:text-fg"
                {...p}
              />
            </div>
          )}
        </Field>
        <Field label="Title" helper="Optional. Defaults to the file name.">
          {(p) => (
            <input
              className={cn(inputClass, "h-control")}
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              {...p}
            />
          )}
        </Field>
        {serverErr ? (
          <Alert tone="error" role="alert" title="Upload failed.">
            {serverErr.status === 429
              ? `Upload limit reached. Try again in ${retryIn} s.`
              : errorMessage(serverErr)}
          </Alert>
        ) : null}
        <div className="flex justify-end gap-2">
          <Button
            type="submit"
            variant="primary"
            leadingIcon={Upload}
            loading={upload.isPending}
            aria-disabled={retryIn > 0 || undefined}
          >
            Upload and analyze
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
