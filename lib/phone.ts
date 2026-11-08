// Digits only, including country code (e.g. "+91 98765 43210" -> "919876543210"). A bare 10-digit
// number is taken as Indian, so "98765 43210" gives the same result and WhatsApp links still work.
export function normalisePhone(raw: string | null | undefined) {
  let digits = (raw || "").replace(/\D/g, "").replace(/^00/, "");
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1); // 0 98765 43210
  if (digits.length === 10) digits = `91${digits}`;
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
