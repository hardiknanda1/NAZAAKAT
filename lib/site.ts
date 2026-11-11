// Public, non-secret site settings. Everything here is safe to expose to the browser.
// Leave a value empty and the site shows a tasteful placeholder instead of inventing details.

const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL;

export const site = {
  name: "NAZAAKAT",
  // NEXT_PUBLIC_SITE_URL wins; otherwise Vercel's production address; localhost only in development.
  url:
    process.env.NEXT_PUBLIC_SITE_URL ||
    (vercelHost ? `https://${vercelHost}` : "http://localhost:3000"),
  // Digits only, with country code, e.g. 9198XXXXXXXX
  whatsappNumber: (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "").replace(/\D/g, ""),
  instagramUrl: process.env.NEXT_PUBLIC_INSTAGRAM_URL || "",
  // Shown in the contact section. NEXT_PUBLIC_CONTACT_EMAIL (comma-separated) replaces this list.
  emails: (process.env.NEXT_PUBLIC_CONTACT_EMAIL || "hardiknanda0130@gmail.com, aashana.july04@gmail.com, proshita.abhayagarwal008@gmail.com")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean),
};

// "About" and "Book" are their own pages; the rest are sections on the home page.
// Written as "/#section" (not "#section") so they still work when clicked from another page.
export const nav = [
  { href: "/", label: "Home" },
  { href: "/#services", label: "Services" },
  { href: "/#how-it-works", label: "How It Works" },
  { href: "/about", label: "About" },
  { href: "/#contact", label: "Contact" },
];

export const BOOK_HREF = "/book";

export function whatsappLink(message = "Hello NAZAAKAT, I would like to know more about a style consultation.") {
  if (!site.whatsappNumber) return "";
  return `https://wa.me/${site.whatsappNumber}?text=${encodeURIComponent(message)}`;
}

/** Where a consultant who forgot their password asks for a temporary one. */
export const consultantHelp = () => ({
  whatsapp: whatsappLink("Hello NAZAAKAT, I'm a consultant and I forgot my password. Could you send me a temporary one?"),
  email: site.emails[0] ?? "",
});
