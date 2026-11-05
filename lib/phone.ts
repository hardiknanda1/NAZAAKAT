// Digits only, including country code (e.g. "+91 98765 43210" -> "919876543210").
export function normalisePhone(raw: string | null | undefined) {
  const digits = (raw || "").replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}
