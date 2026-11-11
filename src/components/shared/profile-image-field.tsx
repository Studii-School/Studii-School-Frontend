"use client";

import { ImagePlus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type ProfileImageFieldProps = {
  value?: string;
  onChange(value: string): void;
  label?: string;
  name?: string;
  disabled?: boolean;
};

export function ProfileImageField({
  value = "",
  onChange,
  label = "Profile image",
  name = "Profile",
  disabled = false,
}: ProfileImageFieldProps) {
  const upload = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) return;
    onChange(await resizeProfileImage(file));
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap items-center gap-4 rounded-xl border bg-surface-muted p-4">
        <img
          src={value || "/default-profile.svg"}
          alt={value ? `${name} profile` : `Default ${name} profile`}
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = "/default-profile.svg";
          }}
          className="size-24 rounded-xl border bg-surface object-cover"
        />
        <div className="min-w-0 flex-1 space-y-3">
          <Input
            type="url"
            value={value.startsWith("data:") ? "" : value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="https://example.com/profile.jpg"
            aria-label={`${label} URL`}
            disabled={disabled}
          />
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[10px] border bg-surface px-4 py-2 text-sm font-semibold">
              <ImagePlus size={16} /> Upload image
              <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled} onChange={(event) => void upload(event.target.files?.[0])} />
            </label>
            {value && <Button type="button" variant="outline" disabled={disabled} onClick={() => onChange("")}><Trash2 size={15} />Remove</Button>}
          </div>
          <p className="text-xs text-muted">Paste a public image link or upload PNG, JPEG, or WebP up to 5 MB.</p>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onerror = reject;
    image.onload = () => resolve(image);
    image.src = src;
  });
}

async function resizeProfileImage(file: File) {
  const source = await readFileAsDataUrl(file);
  const image = await loadImage(source);
  const maxSize = 520;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.84);
}
