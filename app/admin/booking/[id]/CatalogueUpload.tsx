"use client";

import { FileText, Images, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import type { Catalogue } from "@/lib/supabase";

const errors: Record<string, string> = {
  no_file: "Please choose a file.",
  bad_type: "Please choose a .zip of images, or a .pdf.",
  too_large: "That file is too large.",
  bad_zip: "That zip file could not be read.",
  no_images: "That zip has no image pages (.jpg, .png or .webp) inside it.",
  too_many_pages: "That zip has too many pages. Please keep it to 80 or fewer.",
  page_too_large: "One of the images inside the zip is too large. Please keep each page under 6 MB.",
  not_found: "This booking could not be found.",
  save_failed: "Could not save the catalogue just now. Please try again.",
};

export default function CatalogueUpload({ bookingId, initial }: { bookingId: string; initial: Catalogue | null }) {
  const [catalogue, setCatalogue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setBusy(true);
    setError("");
    const body = new FormData();
    body.set("file", file);
    try {
      const res = await fetch(`/api/admin/booking/${bookingId}/catalogue`, { method: "POST", body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setCatalogue(data.catalogue);
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not save the catalogue just now. Please try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mt-6 border-t border-taupe/40 pt-5">
      <p className="eyebrow">This booking&apos;s catalogue</p>
      {catalogue ? (
        <p className="mt-2 flex items-center gap-2 text-base text-charcoal">
          {catalogue.type === "pdf" ? <FileText size={18} className="text-chocolate" aria-hidden /> : <Images size={18} className="text-chocolate" aria-hidden />}
          {catalogue.type === "pdf" ? `PDF catalogue: ${catalogue.name}` : `${catalogue.pages.length} image pages uploaded.`}
        </p>
      ) : (
        <p className="mt-2 text-base text-muted">No catalogue uploaded yet. The call will show the default catalogue until one is added.</p>
      )}

      <label className="btn-secondary mt-4 inline-flex cursor-pointer rounded-lg text-base focus-within:outline-2 focus-within:outline-offset-3 focus-within:outline-chocolate">
        {busy ? <Loader2 size={18} className="animate-spin" aria-hidden /> : <Upload size={18} aria-hidden />}
        {busy ? "Uploading…" : catalogue ? "Replace catalogue" : "Upload catalogue"}
        <input
          ref={input}
          type="file"
          accept=".zip,.pdf,application/zip,application/pdf"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          className="sr-only"
        />
      </label>
      <p className="mt-2 text-sm text-muted">A .zip of page images (named so they sort in order, e.g. 01.jpg, 02.jpg), or a single .pdf.</p>
      <div aria-live="assertive">
        {error && (
          <p role="alert" className="mt-3 text-base text-[#a3182c]">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
