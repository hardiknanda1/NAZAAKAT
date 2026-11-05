"use client";

import { Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { nav } from "@/lib/site";

export default function Header({ logo }: { logo: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || open ? "bg-ivory/95 shadow-[0_1px_0_rgba(73,55,46,0.08)] backdrop-blur-sm" : "bg-transparent"
      }`}
    >
      <div className="container-x flex h-16 items-center sm:h-24 justify-between gap-6">
        <a href="#home" aria-label="NAZAAKAT — back to top" onClick={close} className="shrink-0">
          {logo}
        </a>

        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="py-2 text-[0.95rem] tracking-wide text-charcoal transition-colors hover:text-chocolate">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2">
          <a href="/start" className="btn-primary hidden min-h-12 px-6 text-[0.95rem] sm:inline-flex">
            Start Consultation
          </a>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="-mr-2 inline-flex h-12 w-12 items-center justify-center text-chocolate lg:hidden"
          >
            {open ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {open && (
        <nav id="mobile-menu" aria-label="Mobile" className="h-[calc(100dvh-4rem)] sm:h-[calc(100dvh-6rem)] overflow-y-auto bg-ivory lg:hidden">
          <ul className="container-x flex flex-col pt-4">
            {nav.map((item) => (
              <li key={item.href} className="border-b border-beige">
                <a href={item.href} onClick={close} className="block py-5 font-serif text-3xl text-charcoal">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="container-x py-8">
            <a href="/start" onClick={close} className="btn-primary w-full text-lg">
              Start Consultation
            </a>
          </div>
        </nav>
      )}
    </header>
  );
}
