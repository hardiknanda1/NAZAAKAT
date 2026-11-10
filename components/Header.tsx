"use client";

import { ArrowRight, Menu, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import wordmark from "@/public/logo-wordmark.webp";
import { BOOK_HREF, nav } from "@/lib/site";

const GOLD = "#d9b36a";
const CREAM = "#f3e6d6";

// Floating dark-maroon bar with a soft silk sheen on the right, as in the brand mockup.
const BAR =
  "radial-gradient(60% 140% at 100% 0%, rgba(150, 22, 38, 0.55) 0%, rgba(110, 14, 26, 0.18) 45%, transparent 70%), linear-gradient(100deg, #220303 0%, #2c0405 55%, #3a0709 100%)";

export default function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

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
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5 sm:pt-4">
      <div
        className={`mx-auto max-w-[96rem] overflow-hidden rounded-[1.4rem] border border-[#d9b36a]/15 transition-shadow duration-300 sm:rounded-[2rem] ${
          scrolled || open ? "shadow-[0_14px_40px_-14px_rgba(40,4,6,0.6)]" : "shadow-[0_10px_30px_-16px_rgba(40,4,6,0.45)]"
        }`}
        style={{ background: BAR }}
      >
        <div className="flex h-[4.5rem] items-center justify-between gap-4 px-4 sm:h-[5.25rem] sm:px-8 lg:px-8 xl:px-12">
          <div className="flex items-center gap-6 lg:gap-6 xl:gap-9">
            <Link href="/" aria-label="NAZAAKAT, back to home" onClick={close} className="shrink-0">
              <Image src={wordmark} alt="NAZAAKAT" preload sizes="10rem" className="h-10 w-auto sm:h-[3.1rem]" />
            </Link>
            <span aria-hidden className="hidden h-11 w-px lg:block" style={{ background: `${GOLD}99` }} />
          </div>

          <nav aria-label="Main" className="hidden lg:block">
            <ul className="flex items-center gap-6 xl:gap-12">
              {nav.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={item.href === pathname ? "page" : undefined}
                    className="border-b-2 border-transparent pb-1 font-serif text-[1.08rem] tracking-wide whitespace-nowrap xl:text-[1.2rem] text-[#f3e6d6] transition-colors hover:text-[#d9b36a] aria-[current=page]:border-[#d9b36a] aria-[current=page]:text-[#d9b36a]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="flex items-center gap-2">
            <Link
              href={BOOK_HREF}
              className="hidden min-h-12 items-center gap-2 rounded-xl border-[1.5px] px-5 text-[0.98rem] font-semibold tracking-wide whitespace-nowrap xl:px-6 transition-colors hover:bg-[#d9b36a]/10 sm:inline-flex"
              style={{ borderColor: GOLD, color: CREAM }}
            >
              Book Consultation <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
            </Link>
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label={open ? "Close menu" : "Open menu"}
              className="-mr-2 inline-flex h-12 w-12 items-center justify-center lg:hidden"
              style={{ color: CREAM }}
            >
              {open ? <X size={28} strokeWidth={1.5} /> : <Menu size={28} strokeWidth={1.5} />}
            </button>
          </div>
        </div>

        {open && (
          <nav id="mobile-menu" aria-label="Mobile" className="max-h-[calc(100dvh-7rem)] overflow-y-auto border-t border-[#d9b36a]/20 lg:hidden">
            <ul className="flex flex-col px-5 pt-2 sm:px-8">
              {nav.map((item) => (
                <li key={item.href} className="border-b border-[#d9b36a]/15">
                  <Link
                    href={item.href}
                    onClick={close}
                    aria-current={item.href === pathname ? "page" : undefined}
                    className="block py-4 font-serif text-2xl text-[#f3e6d6] aria-[current=page]:text-[#d9b36a]"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="px-5 py-6 sm:px-8">
              <Link
                href={BOOK_HREF}
                onClick={close}
                className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-xl border-[1.5px] text-lg font-semibold"
                style={{ borderColor: GOLD, color: CREAM }}
              >
                Book Consultation <ArrowRight size={18} strokeWidth={1.75} aria-hidden />
              </Link>
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
