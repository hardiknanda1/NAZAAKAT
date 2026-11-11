import { isSignedIn } from "@/app/admin/actions";
import { clearCatalogueFolder, getBooking, setBookingCatalogue, signedCatalogueUploads, supabaseConfigured, type Catalogue } from "@/lib/supabase";

// A booking's catalogue, in two small steps so large files never pass through this server (requests here
// are capped at 4.5 MB): the admin page unzips the catalogue itself, asks "start" for one-time upload
// links, uploads each page (or the PDF) straight to Supabase Storage, then calls "finish" with the list.

const MAX_PAGES = 80;
const EXT = new Set(["jpg", "png", "webp"]);

type Start = { action: "start"; kind: "images"; count: number; exts: string[] } | { action: "start"; kind: "pdf" };
type Finish =
  | { action: "finish"; kind: "images"; pages: { path: string; width: number; height: number }[] }
  | { action: "finish"; kind: "pdf"; name: string };

const pagePath = (id: string, i: number, ext: string) => `${id}/${String(i + 1).padStart(2, "0")}.${ext}`;

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isSignedIn())) return Response.json({ error: "unauthorized" }, { status: 401 });
  if (!supabaseConfigured()) return Response.json({ error: "not_configured" }, { status: 503 });

  const { id } = await params;
  const booking = await getBooking(id).catch(() => null);
  if (!booking) return Response.json({ error: "not_found" }, { status: 404 });

  let body: Start | Finish;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  try {
    if (body.action === "start") {
      let paths: string[];
      if (body.kind === "pdf") {
        paths = [`${id}/catalogue.pdf`];
      } else {
        const exts = Array.isArray(body.exts) ? body.exts : [];
        if (exts.length === 0) return Response.json({ error: "no_images" }, { status: 400 });
        if (exts.length > MAX_PAGES) return Response.json({ error: "too_many_pages" }, { status: 400 });
        if (exts.some((e) => !EXT.has(e))) return Response.json({ error: "bad_type" }, { status: 400 });
        paths = exts.map((e, i) => pagePath(id, i, e));
      }
      await clearCatalogueFolder(id);
      return Response.json({ ok: true, uploads: await signedCatalogueUploads(paths) });
    }

    if (body.action === "finish") {
      let catalogue: Catalogue;
      if (body.kind === "pdf") {
        catalogue = { type: "pdf", path: `${id}/catalogue.pdf`, name: String(body.name || "catalogue.pdf").slice(0, 160) };
      } else {
        const pages = Array.isArray(body.pages) ? body.pages.slice(0, MAX_PAGES) : [];
        // Only this booking's own page paths, in the shape "start" handed out.
        const ok = pages.length > 0 && pages.every((p, i) => typeof p?.path === "string" && p.path === pagePath(id, i, p.path.split(".").pop() || "") && EXT.has(p.path.split(".").pop() || ""));
        if (!ok) return Response.json({ error: "bad_request" }, { status: 400 });
        catalogue = {
          type: "images",
          pages: pages.map((p) => ({ path: p.path, width: Math.max(1, Math.round(Number(p.width)) || 1000), height: Math.max(1, Math.round(Number(p.height)) || 1400) })),
        };
      }
      await setBookingCatalogue(id, catalogue);
      return Response.json({ ok: true, catalogue });
    }

    return Response.json({ error: "bad_request" }, { status: 400 });
  } catch (err) {
    console.error("[admin/catalogue] Could not save the catalogue.", err);
    return Response.json({ error: "save_failed" }, { status: 502 });
  }
}
