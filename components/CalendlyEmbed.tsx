"use client";

import Script from "next/script";
import { CalendarDays, CircleCheck } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    Calendly?: {
      initInlineWidget: (opts: { url: string; parentElement: HTMLElement; resize?: boolean }) => void;
    };
  }
}

function withTheme(url: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("hide_gdpr_banner", "1");
    u.searchParams.set("background_color", "f8f5f0");
    u.searchParams.set("text_color", "292725");
    u.searchParams.set("primary_color", "49372e");
    return u.toString();
  } catch {
    return url;
  }
}

export default function CalendlyEmbed({ url, fallback }: { url: string; fallback: React.ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const confirmation = useRef<HTMLDivElement>(null);
  const [booked, setBooked] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const init = useCallback(() => {
    if (!box.current || !window.Calendly) return;
    box.current.innerHTML = "";
    window.Calendly.initInlineWidget({ url: withTheme(url), parentElement: box.current, resize: true });
    setReady(true);
  }, [url]);

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== "https://calendly.com") return;
      if (e.data?.event === "calendly.event_scheduled") setBooked(true);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useEffect(() => {
    if (booked) confirmation.current?.focus();
  }, [booked]);

  if (!url || failed) return <>{fallback}</>;

  return (
    <div>
      <Script src="https://assets.calendly.com/assets/external/widget.js" strategy="lazyOnload" onReady={init} onError={() => setFailed(true)} />

      <div aria-live="polite">
        {booked && (
          <div
            ref={confirmation}
            tabIndex={-1}
            className="mb-6 flex gap-4 border border-chocolate/30 bg-ivory p-6 sm:p-8"
          >
            <CircleCheck className="mt-1 shrink-0 text-chocolate" size={28} strokeWidth={1.5} aria-hidden />
            <div>
              <p className="font-serif text-2xl font-medium text-charcoal">Your consultation is booked.</p>
              <p className="mt-2 text-lg text-muted">
                Thank you. We will send your private video consultation link to your WhatsApp number shortly. Simply tap
                the link at your appointment time — no account or app download needed.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="relative min-h-[720px] bg-ivory">
        {!ready && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-muted">
            <CalendarDays size={32} strokeWidth={1.25} aria-hidden />
            <p>Loading available times…</p>
          </div>
        )}
        <div ref={box} className="relative min-h-[720px] w-full" title="Choose a consultation time" />
      </div>
    </div>
  );
}
