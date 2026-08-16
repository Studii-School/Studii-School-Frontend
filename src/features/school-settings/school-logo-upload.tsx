"use client";

import Image from "next/image";
import { ImagePlus, Link, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const updateUrl = (next: string) => {
    const trimmed = next.trim();
    if (!trimmed) {
      onChange(undefined);
      return;
    }
    try {
      new URL(trimmed);
      onChange(trimmed);
    } catch {
      onError(`${label} must be a valid image URL.`);
      onChange(trimmed);
    }
  };

  return (
    <div className="min-w-0 max-w-full rounded-xl border p-4">
      <div className="flex min-w-0 items-center gap-3">
        {value ? (
          <Image
            unoptimized
            width={56}
            height={56}
            src={value}
            alt={`${label} preview`}
            className="size-14 shrink-0 rounded-[10px] border object-contain p-1"
          />
        ) : (
          <span className="flex size-14 shrink-0 items-center justify-center rounded-[10px] bg-surface-muted text-muted">
            <ImagePlus size={20} />
          </span>
        )}
        <div className="min-w-0">
          <p className="break-words text-sm font-semibold">{label}</p>
          <p className="mt-1 break-words text-xs text-muted">PNG, JPG or WEBP URL</p>
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
        {value && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => onChange(undefined)}
          >
            <Trash2 size={16} />
            Remove
          </Button>
        )}
      </div>
    </div>
  );
}
