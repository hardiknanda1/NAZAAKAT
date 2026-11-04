import { Mail, MessageCircle } from "lucide-react";
import { nav, site, whatsappLink } from "@/lib/site";
import Logo from "./Logo";
import Reveal from "./Reveal";

async function currentYear() {
  "use cache";
  return new Date().getFullYear();
}

export default async function Footer() {
  const wa = whatsappLink();

  return (
    <>
      <section id="contact" aria-labelledby="contact-title" className="py-24 lg:py-32">
        <Reveal className="container-x grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-6">
            <p className="eyebrow">Contact</p>
            <h2 id="contact-title" className="mt-5 font-serif text-5xl leading-[1.08] font-medium text-charcoal lg:text-6xl">
              We would love <span className="italic text-chocolate">to hear from you.</span>
            </h2>
            <p className="mt-6 max-w-md text-lg text-muted">
              Have a question before you book? Send us a message — a real person will reply.
            </p>
          </div>

          <div className="flex flex-col justify-end gap-4 lg:col-span-5 lg:col-start-8">
            {wa ? (
              <a href={wa} target="_blank" rel="noopener noreferrer" className="btn-primary text-lg">
                <MessageCircle size={20} strokeWidth={1.5} aria-hidden /> Chat with us on WhatsApp
              </a>
            ) : (
              <p className="border border-taupe/60 px-6 py-4 text-muted">WhatsApp contact coming soon.</p>
            )}
            {site.email ? (
              <a href={`mailto:${site.email}`} className="btn-secondary text-lg">
                <Mail size={20} strokeWidth={1.5} aria-hidden /> {site.email}
              </a>
            ) : (
              <p className="border border-taupe/60 px-6 py-4 text-muted">Email address coming soon.</p>
            )}
            {site.instagramUrl ? (
              <a href={site.instagramUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary text-lg">
                Follow us on Instagram
              </a>
            ) : (
              <p className="border border-taupe/60 px-6 py-4 text-muted">Instagram coming soon.</p>
            )}
          </div>
        </Reveal>
      </section>

      <footer className="bg-charcoal py-16 text-beige">
        <div className="container-x grid gap-12 md:grid-cols-12">
          <div className="md:col-span-5">
            <Logo tone="light" className="h-12 w-44" />
            <p className="mt-6 max-w-sm text-base">
              Personal fashion consulting for women who want to feel like themselves — beautifully.
            </p>
          </div>
          <nav aria-label="Footer" className="md:col-span-4 md:col-start-7">
            <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
              {nav.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="inline-block py-1 hover:text-ivory">
                    {item.label}
                  </a>
                </li>
              ))}
              <li>
                <a href="#book" className="inline-block py-1 hover:text-ivory">
                  Book Consultation
                </a>
              </li>
            </ul>
          </nav>
        </div>
        <div className="container-x mt-14 border-t border-beige/20 pt-8 text-sm">
          © {await currentYear()} NAZAAKAT. All rights reserved.
        </div>
      </footer>
    </>
  );
}
