// Reads width/height from a PNG or JPEG buffer's header, without decoding the image.
// Used when a catalogue zip is uploaded, so the call screen can size each page's <img> correctly.
// Returns null for anything else (e.g. WebP); the page is still shown, just without a fixed aspect ratio.

export function imageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: 8-byte signature, then an IHDR chunk with width/height as big-endian uint32 at bytes 16-23.
  if (buf.length > 24 && buf.toString("hex", 0, 8) === "89504e470d0a1a0a" && buf.toString("ascii", 12, 16) === "IHDR") {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }

  // JPEG: walk the marker segments until a Start-Of-Frame marker (C0-C3, C5-C7, C9-CB, CD-CF; not C4/C8/CC).
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = buf[i + 1];
      if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd9)) {
        i += 2;
        continue;
      }
      const length = buf.readUInt16BE(i + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
      i += 2 + length;
    }
  }

  return null;
}
