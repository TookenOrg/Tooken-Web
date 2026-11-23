"use client";

import { Building2 } from "lucide-react";
import Image, { type ImageProps } from "next/image";
import { useCallback, useState } from "react";
import { TookenLoader } from "./tooken-loader";

type ImageWithLoaderProps = ImageProps & {
  loaderSize?: number;
  fallback?: React.ReactNode;
};

/**
 * Next.js Image wrapper that overlays the branded TookenLoader until the image
 * finishes loading and falls back cleanly on load errors.
 */
export function ImageWithLoader({
  src,
  alt,
  className,
  loaderSize = 36,
  fallback,
  unoptimized,
  onLoad,
  onError,
  ...props
}: ImageWithLoaderProps) {
  const srcKey = typeof src === "string" ? src : JSON.stringify(src);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [failedKey, setFailedKey] = useState<string | null>(null);

  const isLoaded = loadedKey === srcKey;
  const isFailed = failedKey === srcKey;
  const isNonHttpsRemote =
    typeof src === "string" &&
    !src.startsWith("/") &&
    !src.startsWith("https://");

  const handleImageRef = useCallback(
    (node: HTMLImageElement | null) => {
      if (node?.complete && node.naturalWidth > 0) {
        setLoadedKey(srcKey);
      }
    },
    [srcKey],
  );

  if (isFailed) {
    return (
      fallback ?? (
        <span
          aria-hidden
          className="flex size-full items-center justify-center bg-muted"
        >
          <Building2 className="size-8 text-muted-foreground/45" />
        </span>
      )
    );
  }

  return (
    <>
      {!isLoaded ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[1] flex items-center justify-center bg-muted"
        >
          <TookenLoader size={loaderSize} />
        </span>
      ) : null}
      <Image
        {...props}
        ref={handleImageRef}
        src={src}
        alt={alt}
        unoptimized={unoptimized ?? isNonHttpsRemote}
        className={className}
        onLoad={(event) => {
          setLoadedKey(srcKey);
          onLoad?.(event);
        }}
        onError={(event) => {
          setFailedKey(srcKey);
          onError?.(event);
        }}
      />
    </>
  );
}
