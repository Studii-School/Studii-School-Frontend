"use client";

import { useState } from "react";
import Image from "next/image";
import { ImagePlus, Link, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function isPublicImageUrl(value?: string): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function SchoolLogoUpload({
  label,
  value,
  onChange,
  onError,
}: {
  label: string;
  value?: string;
  onChange: (value?: string) => void;
  onError: (message: string) => void;
}) {
  const [failedUrl, setFailedUrl] = useState<string>();
  const updateUrl = (next: string) => {
    const trimmed = next.trim();
    setFailedUrl(undefined);
    if (!trimmed) {
      onChange(undefined);
      onError("");
      return;
    }
    onChange(trimmed);
    onError(isPublicImageUrl(trimmed) ? "" : `${label} must be a public HTTP or HTTPS image URL.`);
  };

  return (
    <div className="min-w-0 max-w-full rounded-xl border p-4">
      <div className="flex min-w-0 items-center gap-3">
        {isPublicImageUrl(value) && failedUrl !== value ? (
          <Image
            unoptimized
            width={56}
            height={56}
            src={value}
            alt={`${label} preview`}
            className="size-14 shrink-0 rounded-[10px] border object-contain p-1"
            onError={() => {
              setFailedUrl(value);
              onError(`${label} could not be loaded. Check the image URL.`);
            }}
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-muted">
            <ImagePlus size={20} />
          </span>
        )}
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{label}</p>
          <p className="mt-1 break-words text-xs text-muted">{label.includes("favicon") ? "ICO, PNG, JPG or WEBP URL" : "PNG, JPG or WEBP URL"}</p>
        </div>
      </div>
      <div className="mt-3 flex min-w-0 flex-col gap-2">
        <label className="relative block min-w-0">
          <span className="sr-only">{label} URL</span>
          <Link className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={16} />
          <Input
            className="pl-9"
            type="url"
            value={value ?? ""}
            onChange={(event) => updateUrl(event.target.value)}
            placeholder="https://example.com/image.png"
          />
        </label>
        {value && failedUrl === value && <p className="text-xs text-danger">This image could not be loaded. Use a public image URL.</p>}
        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setFailedUrl(undefined); onChange(undefined); onError(""); }}
          >
            <Trash2 size={16} />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
