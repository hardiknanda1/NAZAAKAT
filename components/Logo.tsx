import Image from "next/image";
import { findPublicFile } from "@/lib/media";

// Renders the supplied brand logo from /public (logo.svg, logo.png or logo.webp).
// Until the file is added, a plain text name is shown — it is a placeholder, not a logo.
export default function Logo({ className = "h-12 w-20 sm:h-[5.25rem] sm:w-28", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const src = findPublicFile("logo.svg", "logo.png", "logo.webp");

  if (src) {
    return (
      <span className={`relative block ${className}`}>
        <Image src={src} alt="NAZAAKAT" fill sizes="200px" className="object-contain object-left" preload />
      </span>
    );
  }

  return (
    <span
      className={`font-serif text-2xl leading-none font-medium tracking-[0.28em] ${tone === "light" ? "text-ivory" : "text-chocolate"}`}
    >
      NAZAAKAT
    </span>
  );
}
