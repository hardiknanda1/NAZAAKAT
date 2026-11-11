"use client";

import { unzipSync } from "fflate";
import { FileText, Images, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { naturalCompare } from "@/lib/naturalSort";
import type { Catalogue } from "@/lib/supabase";

const MAX_PAGES = 80;
const MAX_PAGE_BYTES = 20_000_000;
const MAX_PDF_BYTES = 50_000_000; // Supabase Storage's default per-file limit
const TYPES: Record<string, { ext: string; type: string }> = {
  jpg: { ext: "jpg", type: "image/jpeg" },
  jpeg: { ext: "jpg", type: "image/jpeg" },
  png: { ext: "png", type: "image/png" },
  webp: { ext: "webp", type: "image/webp" },
};

const errors: Record<string, string> = {
  bad_type: "Please choose a .zip of images, or a .pdf.",
  too_large: "That file is too large. A PDF can be up to 50 MB.",
  bad_zip: "That zip file could not be read.",
  no_images: "That zip has no image pages (.jpg, .png or .webp) inside it.",
  too_many_pages: "That zip has too many pages. Please keep it to 80 or fewer.",
  page_too_large: "One of the images inside the zip is too large. Please keep each page under 20 MB.",
  not_found: "This booking could not be found.",
  unauthorized: "Your sign-in has expired. Please refresh the page and sign in again.",
  not_configured: "This site is not connected to Supabase yet.",
  upload_failed:
    "A page could not be uploaded to storage. Check that the booking-catalogues bucket exists (run supabase/schema.sql), then try again.",
  save_failed: "Could not save the catalogue just now. Please try again.",
};

class UploadError extends Error {}

async function api(bookingId: string, body: object) {
  const res = await fetch(`/api/admin/booking/${bookingId}/catalogue`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new UploadError(data.error || "save_failed");
  return data;
}

async function put(url: string, blob: Blob) {
  const res = await fetch(url, { method: "PUT", headers: { "Content-Type": blob.type, "x-upsert": "true" }, body: blob });
  if (!res.ok) {
    console.error("[catalogue] Storage refused an upload:", res.status, await res.text().catch(() => ""));
    throw new UploadError("upload_failed");
  }
}

async function size(blob: Blob) {
  try {
    const bitmap = await createImageBitmap(blob);
    const dims = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dims;
  } catch {
    return { width: 1000, height: 1400 };
  }
}

export default function CatalogueUpload({ bookingId, initial }: { bookingId: string; initial: Catalogue | null }) {
  const [catalogue, setCatalogue] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  async function uploadPdf(file: File) {
    if (file.size > MAX_PDF_BYTES) throw new UploadError("too_large");
    setProgress("Uploading the PDF…");
    const { uploads } = await api(bookingId, { action: "start", kind: "pdf" });
    await put(Object.values(uploads as Record<string, string>)[0], new Blob([file], { type: "application/pdf" }));
    return (await api(bookingId, { action: "finish", kind: "pdf", name: file.name })).catalogue as Catalogue;
  }

  async function uploadZip(file: File) {
    setProgress("Opening the zip…");
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
        filter: (f) => !f.name.startsWith("__MACOSX/") && !f.name.split("/").pop()?.startsWith("."),
      });
    } catch {
      throw new UploadError("bad_zip");
    }
    const names = Object.keys(entries)
      .filter((n) => !n.endsWith("/") && TYPES[n.split(".").pop()?.toLowerCase() || ""])
      .sort(naturalCompare);
    if (names.length === 0) throw new UploadError("no_images");
    if (names.length > MAX_PAGES) throw new UploadError("too_many_pages");
    if (names.some((n) => entries[n].byteLength > MAX_PAGE_BYTES)) throw new UploadError("page_too_large");

    const files = names.map((n) => {
      const t = TYPES[n.split(".").pop()!.toLowerCase()];
      const data = entries[n];
      return { ext: t.ext, blob: new Blob([data.slice()], { type: t.type }) };
    });
    const { uploads } = (await api(bookingId, { action: "start", kind: "images", count: files.length, exts: files.map((f) => f.ext) })) as {
      uploads: Record<string, string>;
    };
    const paths = Object.keys(uploads);
    const pages: { path: string; width: number; height: number }[] = [];
    for (const [i, f] of files.entries()) {
      setProgress(`Uploading page ${i + 1} of ${files.length}…`);
      const path = paths[i];
      await put(uploads[path], f.blob);
      pages.push({ path, ...(await size(f.blob)) });
    }
    setProgress("Saving…");
    return (await api(bookingId, { action: "finish", kind: "images", pages })).catalogue as Catalogue;
  }

  async function upload(file: File) {
    setBusy(true);
    setError("");
    try {
      const isZip = file.type.includes("zip") || /\.zip$/i.test(file.name);
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
      if (!isZip && !isPdf) throw new UploadError("bad_type");
      setCatalogue(isPdf ? await uploadPdf(file) : await uploadZip(file));
    } catch (err) {
      const code = err instanceof UploadError ? err.message : "save_failed";
      if (!(err instanceof UploadError)) console.error("[catalogue]", err);
      setError(errors[code] || errors.save_failed);
    } finally {
      setBusy(false);
      setProgress("");
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
        {busy ? progress || "Uploading…" : catalogue ? "Replace catalogue" : "Upload catalogue"}
        <input
          ref={input}
          type="file"
          accept=".zip,.pdf,application/zip,application/pdf"
          disabled={busy}
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          className="sr-only"
        />
      </label>
      <p className="mt-2 text-sm text-muted">
        A .zip of page images (named so they sort in order, e.g. 01.jpg, 02.jpg; up to 80 pages), or a single .pdf up to 50 MB.
      </p>
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
