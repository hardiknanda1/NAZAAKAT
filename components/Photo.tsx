import Image from "next/image";
import type { ReactNode } from "react";
import { findPublicFile } from "@/lib/media";

type Props = {
  name: string; // file name without extension, inside /public/images
  alt: string;
  className?: string; // sizing / aspect ratio of the frame
  sizes: string;
  preload?: boolean;
  fallback?: ReactNode; // shown instead of the default frame while the photo is missing
};

// Editorial photograph from /public/images/<name>.(jpg|webp|png).
// If the photograph hasn't been added yet, a calm toned frame holds its place.
export default function Photo({ name, alt, className = "", sizes, preload = false, fallback }: Props) {
  const src = findPublicFile(`images/${name}.jpg`, `images/${name}.webp`, `images/${name}.png`);

  return (
    <div className={`relative overflow-hidden bg-beige ${className}`}>
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          preload={preload}
          className="object-cover"
        />
      ) : fallback ? (
        <div role="img" aria-label={alt} className="absolute inset-0">
          {fallback}
        </div>
      ) : (
        <div role="img" aria-label={alt} className="absolute inset-0 flex items-end p-6">
          <div className="pointer-events-none absolute inset-4 border border-taupe/50" aria-hidden />
          <span className="relative font-serif text-lg text-muted italic">NAZAAKAT</span>
        </div>
      )}
    </div>
  );
}
