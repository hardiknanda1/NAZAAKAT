// The consultant profile: shared by the consultant's form, the server check and the admin page.

export const EXPERTISE = [
  "Body shape styling",
  "Colour analysis",
  "Indian and ethnic wear",
  "Western wear",
  "Bridal and wedding",
  "Festive and party wear",
  "Workwear",
  "Wardrobe planning",
  "Personal shopping",
  "Plus-size styling",
  "Men's styling",
];

export const LANGUAGES = ["English", "Hindi", "Punjabi", "Marathi", "Gujarati", "Bengali", "Tamil", "Telugu", "Kannada", "Malayalam", "Urdu"];

export type Profile = {
  name: string;
  phone: string;
  expertise: string[];
  years_experience: number | null;
  languages: string[];
  city: string | null;
  bio: string | null;
  portfolio_url: string | null;
};

const text = (v: unknown, max: number) => {
  const s = String(v ?? "").trim().slice(0, max);
  return s || null;
};
const pick = (v: unknown, allowed: string[]) =>
  Array.isArray(v) ? [...new Set(v.filter((x): x is string => typeof x === "string" && allowed.includes(x)))] : [];

/** Keeps only known options and sensible values, or returns an error code. */
export function cleanProfile(raw: Record<string, unknown>, normalisePhone: (s: string) => string | null): Profile | { error: string } {
  const name = text(raw.name, 120);
  if (!name) return { error: "need_name" };
  const phone = normalisePhone(String(raw.phone ?? ""));
  if (!phone) return { error: "need_phone" };
  const yearsRaw = String(raw.years_experience ?? "").trim();
  const years = yearsRaw === "" ? null : Number(yearsRaw);
  if (years !== null && (!Number.isInteger(years) || years < 0 || years > 60)) return { error: "bad_years" };
  let link = text(raw.portfolio_url, 300);
  if (link && !/^https?:\/\//i.test(link)) link = `https://${link}`;
  if (link) {
    try {
      new URL(link);
    } catch {
      return { error: "bad_link" };
    }
  }
  return {
    name,
    phone,
    expertise: pick(raw.expertise, EXPERTISE),
    years_experience: years,
    languages: pick(raw.languages, LANGUAGES),
    city: text(raw.city, 80),
    bio: text(raw.bio, 600),
    portfolio_url: link,
  };
}
