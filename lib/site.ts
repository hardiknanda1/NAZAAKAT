// Public, non-secret site settings. Everything here is safe to expose to the browser.
// Leave a value empty and the site shows a tasteful placeholder instead of inventing details.

export const site = {
  name: "NAZAAKAT",
  url: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  // Public booking page. Vercel's NEXT_PUBLIC_CALENDLY_URL overrides it.
  calendlyUrl: process.env.NEXT_PUBLIC_CALENDLY_URL || "https://calendly.com/mynazaakat",
  // Digits only, with country code, e.g. 9198XXXXXXXX
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
};

export const nav = [
  { href: "#home", label: "Home" },
  { href: "#services", label: "Services" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#about", label: "About" },
  { href: "#contact", label: "Contact" },
];

export function whatsappLink(message = "Hello NAZAAKAT, I would like to know more about a style consultation.") {
  if (!site.whatsappNumber) return "";
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}
