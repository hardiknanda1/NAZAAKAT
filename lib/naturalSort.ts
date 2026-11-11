// Orders "page 2.png" before "page 10.png": splits into text/number chunks and compares numbers as numbers.
export function naturalCompare(a: string, b: string) {
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
