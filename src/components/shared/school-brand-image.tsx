"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";

export function SchoolBrandImage({
  logoUrl,
  crestUrl,
  alt,
  width,
  height,
  className,
  fallback,
}: {
  logoUrl?: string;
  crestUrl?: string;
  alt: string;
  width: number;
  height: number;
  className: string;
  fallback: ReactNode;
}) {
  const candidates = [...new Set([logoUrl, crestUrl].filter((url): url is string => Boolean(url)))];
  const sourceKey = candidates.join("\n");
  const [failure, setFailure] = useState<{ sourceKey: string; urls: string[] }>({ sourceKey: "", urls: [] });
  const failedUrls = failure.sourceKey === sourceKey ? failure.urls : [];
  const source = candidates.find((url) => !failedUrls.includes(url));

  if (!source) return <>{fallback}</>;

  return (
    <Image
      key={source}
      unoptimized
      width={width}
      height={height}
      src={source}
      alt={alt}
      className={className}
      onError={() => setFailure((current) => ({
        sourceKey,
        urls: [...new Set([...(current.sourceKey === sourceKey ? current.urls : []), source])],
      }))}
    />
  );
}
