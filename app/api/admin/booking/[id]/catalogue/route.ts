import { unzipSync } from "fflate";
import { isSignedIn } from "@/app/admin/actions";
import { imageDimensions } from "@/lib/image-size";
import { clearCatalogueFolder, getBooking, setBookingCatalogue, supabaseConfigured, uploadCatalogueFile, type Catalogue } from "@/lib/supabase";

const MAX_PAGES = 80;
const MAX_IMAGE_BYTES = 6_000_000;
const MAX_ZIP_BYTES = 80_000_000;
const MAX_PDF_BYTES = 25_000_000;
const IMAGE_EXT: Record<string, string> = { jpg: "jpg", jpeg: "jpg", png: "png", webp: "webp" };

// Orders "page 2.png" before "page 10.png": splits into text/number chunks and compares numbers as numbers.
function naturalCompare(a: string, b: string) {
  const split = (s: string) => s.match(/\d+|\D+/g) || [s];
  const ap = split(a);
  const bp = split(b);
  for (let i = 0; i < Math.max(ap.length, bp.length); i++) {
    const x = ap[i] ?? "";
    const y = bp[i] ?? "";
    if (x === y) continue;
    const nx = Number(x);
    const ny = Number(y);
    if (!Number.isNaN(nx) && !Number.isNaN(ny)) return nx - ny;
    return x < y ? -1 : 1;
  }
  return 0;
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const { id } = await params;
  const booking = await getBooking(id).catch(() => null);
  if (!booking) return Response.json({ error: "not_found" }, { status: 404 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "too_large" }, { status: 413 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return Response.json({ error: "no_file" }, { status: 400 });

  const isZip = file.type.includes("zip") || /\.zip$/i.test(file.name);
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!isZip && !isPdf) return Response.json({ error: "bad_type" }, { status: 400 });

  try {
    await clearCatalogueFolder(id);

    if (isPdf) {
      if (file.size > MAX_PDF_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
      await uploadCatalogueFile(`${id}/catalogue.pdf`, await file.arrayBuffer(), "application/pdf");
      const catalogue: Catalogue = { type: "pdf", path: `${id}/catalogue.pdf`, name: file.name.slice(0, 160) };
      await setBookingCatalogue(id, catalogue);
      return Response.json({ ok: true, catalogue });
    }

    if (file.size > MAX_ZIP_BYTES) return Response.json({ error: "too_large" }, { status: 413 });
    const buf = new Uint8Array(await file.arrayBuffer());
    let entries: Record<string, Uint8Array>;
    try {
      entries = unzipSync(buf, {
        filter: (f) => !f.name.startsWith("__MACOSX/") && !f.name.split("/").pop()?.startsWith("."),
      });
    } catch {
      return Response.json({ error: "bad_zip" }, { status: 400 });
    }

    const names = Object.keys(entries)
      .filter((n) => !n.endsWith("/"))
      .filter((n) => IMAGE_EXT[n.split(".").pop()?.toLowerCase() || ""])
      .sort(naturalCompare);

    if (names.length === 0) return Response.json({ error: "no_images" }, { status: 400 });
    if (names.length > MAX_PAGES) return Response.json({ error: "too_many_pages" }, { status: 400 });
    if (names.some((n) => entries[n].byteLength > MAX_IMAGE_BYTES)) return Response.json({ error: "page_too_large" }, { status: 413 });

    const pages: { path: string; width: number; height: number }[] = [];
    for (const [i, name] of names.entries()) {
      const ext = IMAGE_EXT[name.split(".").pop()!.toLowerCase()];
      const data = entries[name];
      const dims = imageDimensions(Buffer.from(data)) ?? { width: 1000, height: 1400 };
      const path = `${id}/${String(i + 1).padStart(2, "0")}.${ext}`;
      await uploadCatalogueFile(path, data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer, `image/${ext === "jpg" ? "jpeg" : ext}`);
      pages.push({ path, width: dims.width, height: dims.height });
    }

    const catalogue: Catalogue = { type: "images", pages };
    await setBookingCatalogue(id, catalogue);
    return Response.json({ ok: true, catalogue });
  } catch (err) {
    console.error("[admin/catalogue] Could not save the catalogue.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
