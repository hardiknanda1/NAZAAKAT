import { MAX_PHOTO_BYTES } from "./intake";

// Shrinks a phone photo (often 3-8 MB) to a JPEG of at most `maxSide` px so uploads are quick and fit the server limit.
export async function shrink(file: File, maxSide = 1600): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    for (const quality of [0.82, 0.7, 0.55]) {
      const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
      if (blob && blob.size <= MAX_PHOTO_BYTES) return blob;
    }
  } catch {
    // fall through: use the original if it is small enough
  }
  if (file.size <= MAX_PHOTO_BYTES && /image\/(jpeg|png|webp)/.test(file.type)) return file;
  throw new Error("photo");
}
