"use client";

import { useRef, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/base";
import { uploadMedia } from "@/lib/api/logistics";
import { apiErrorText } from "@/lib/utils";

const MAX_BYTES = 5 * 1024 * 1024;

/** Attach a photo or PDF (max 5 MB) through the media upload; value is the stored reference. */
export function FileUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value?: string;
  onChange: (ref: string) => void;
}) {
  const params = useParams();
  const tenantSlug = (params?.orgSlug as string) ?? "";
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file?: File) => {
    if (!file) return;
    if (file.size > MAX_BYTES) {
      toast.error("The file is larger than 5 MB");
      return;
    }
    setBusy(true);
    try {
      onChange(await uploadMedia(tenantSlug, file));
    } catch (err) {
      toast.error(apiErrorText(err, `Could not upload the ${label.toLowerCase()}`));
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />
      {value ? (
        <span className="inline-flex min-w-0 items-center gap-1 rounded-md border border-border px-2 py-1 text-xs">
          <FileText className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{label} attached</span>
          <button type="button" aria-label={`Remove ${label.toLowerCase()}`} onClick={() => onChange("")}>
            <X className="size-3.5 text-muted-foreground hover:text-destructive" />
          </button>
        </span>
      ) : null}
      <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => input.current?.click()}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Paperclip className="size-3.5" />}
        {value ? "Replace" : `Attach ${label.toLowerCase()}`}
      </Button>
    </div>
  );
}
