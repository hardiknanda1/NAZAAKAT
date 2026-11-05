"use client";

import { BookOpen, ChevronLeft, ChevronRight, Maximize2, Mic, MicOff, PhoneOff, Video, VideoOff, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { cataloguePages } from "@/lib/catalogue";

type JitsiApi = {
  dispose: () => void;
  addListener: (event: string, fn: (e: never) => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
};
type Session = { domain: string; scriptUrl: string; roomName: string; jwt?: string; moderator: boolean };

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

const PAGE_MESSAGE = "nazaakat-page";
const lastPage = cataloguePages.length - 1;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (window.JitsiMeetExternalAPI) return resolve();
    const el = document.createElement("script");
    el.src = src;
    el.async = true;
    el.onload = () => resolve();
    el.onerror = () => reject(new Error("script"));
    document.head.appendChild(el);
  });
}

function RoundButton({
  label,
  onClick,
  children,
  danger = false,
  pressed,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
  pressed?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full min-[380px]:h-11 min-[380px]:w-11 transition-colors disabled:opacity-35 sm:h-12 sm:w-12 ${
        danger ? "bg-[#a3182c] text-white hover:bg-[#7d1222]" : "bg-white/10 text-white hover:bg-white/20"
      }`}
    >
      {children}
    </button>
  );
}

export default function JitsiRoom({ room }: { room: string }) {
  const container = useRef<HTMLDivElement>(null);
  const api = useRef<JitsiApi | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"welcome" | "call" | "ended">("welcome");
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [fullPage, setFullPage] = useState(false);
  const [showCatalogue, setShowCatalogue] = useState(false);
  const showRef = useRef(false);
  const pageRef = useRef(0);
  const isHost = Boolean(session?.moderator);

  // Ask the server for this room's settings (and a signed token when using JaaS), then load Jitsi.
  useEffect(() => {
    let cancelled = false;
    const host = new URLSearchParams(window.location.search).get("host");
    fetch("/api/jitsi/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ room, host }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(res.status === 404 ? "room" : "setup"))))
      .then(async (data: Session) => {
        await loadScript(data.scriptUrl).catch(() => Promise.reject(new Error("script")));
        if (!cancelled) setSession(data);
      })
      .catch((err: Error) => {
        if (cancelled) return;
        const messages: Record<string, string> = {
          room: "This consultation link is not valid. Please use the exact link we sent you.",
          setup: "The video service is not set up correctly yet. Please let us know on WhatsApp. (Error: video settings)",
          script: "The video service could not be loaded. Please check your internet connection and refresh. (Error: video script)",
        };
        setError(messages[err.message] || "The video service could not be reached. Please check your internet connection and refresh.");
      });
    return () => {
      cancelled = true;
      api.current?.dispose();
    };
  }, [room]);

  // The consultant's page, and whether the catalogue is open, go to everyone through Jitsi's data channel.
  const broadcast = useCallback(() => {
    api.current?.executeCommand(
      "sendEndpointTextMessage",
      "",
      JSON.stringify({ type: PAGE_MESSAGE, page: pageRef.current, show: showRef.current }),
    );
  }, []);

  // Catalogue open: videos stacked in one column (tile view). Closed: Jitsi's normal speaker view.
  const applyCatalogue = useCallback((show: boolean) => {
    showRef.current = show;
    setShowCatalogue(show);
    if (!show) setFullPage(false);
    api.current?.executeCommand("setTileView", show);
  }, []);

  const toggleCatalogue = useCallback(() => {
    applyCatalogue(!showRef.current);
    broadcast();
  }, [applyCatalogue, broadcast]);

  const goTo = useCallback(
    (p: number) => {
      const next = Math.min(Math.max(p, 0), lastPage);
      pageRef.current = next;
      setPage(next);
      if (isHost) broadcast();
    },
    [isHost, broadcast],
  );

  // Resend the current page every few seconds so a late or reconnecting client catches up.
  useEffect(() => {
    if (stage !== "call" || !isHost) return;
    const timer = setInterval(broadcast, 4000);
    return () => clearInterval(timer);
  }, [stage, isHost, broadcast]);

  // Arrow keys turn pages on a laptop.
  useEffect(() => {
    if (stage !== "call" || !showCatalogue) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(pageRef.current + 1);
      if (e.key === "ArrowLeft") goTo(pageRef.current - 1);
      if (e.key === "Escape") setFullPage(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, showCatalogue, goTo]);

  // Preload the neighbouring pages so Next/Prev feel instant.
  useEffect(() => {
    for (const i of [page - 1, page + 1]) {
      if (i >= 0 && i <= lastPage) new window.Image().src = cataloguePages[i].src;
    }
  }, [page]);

  function join() {
    if (!container.current || !session || !window.JitsiMeetExternalAPI) return;
    setError("");
    api.current?.dispose();
    container.current.innerHTML = "";
    try {
      const jitsi = new window.JitsiMeetExternalAPI(session.domain, {
        roomName: session.roomName,
        jwt: session.jwt,
        parentNode: container.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: name.trim() || (session.moderator ? "NAZAAKAT Stylist" : "Guest") },
        configOverwrite: {
          subject: "NAZAAKAT Style Consultation",
          prejoinConfig: { enabled: false },
          disableDeepLinking: true, // keep mobile users in the browser instead of asking for the app
          startWithAudioMuted: false,
          startWithVideoMuted: false,
          toolbarButtons: [], // our own controls sit in the bar below
          p2p: { enabled: false }, // route through the server so page messages always arrive
          disableTileEnlargement: true,
          hideConferenceSubject: true,
          hideConferenceTimer: true,
          notifications: [],
          filmstrip: { disableResizable: true },
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          TILE_VIEW_MAX_COLUMNS: 1, // one column: consultant and client stacked in two rows
        },
      });
      api.current = jitsi;

      jitsi.addListener("videoConferenceJoined", () => {
        jitsi.executeCommand("setTileView", showRef.current);
        if (session.moderator) broadcast();
      });
      jitsi.addListener("participantJoined", () => {
        if (session.moderator) setTimeout(broadcast, 1500);
      });
      jitsi.addListener("endpointTextMessageReceived", (e: { data?: { eventData?: { text?: string } }; eventData?: { text?: string } }) => {
        if (session.moderator) return;
        try {
          const msg = JSON.parse(e?.data?.eventData?.text ?? e?.eventData?.text ?? "");
          if (msg?.type === PAGE_MESSAGE && Number.isInteger(msg.page)) {
            const p = Math.min(Math.max(msg.page, 0), lastPage);
            pageRef.current = p;
            setPage(p);
            if (typeof msg.show === "boolean" && msg.show !== showRef.current) applyCatalogue(msg.show);
          }
        } catch {
          // not one of our messages
        }
      });
      jitsi.addListener("audioMuteStatusChanged", (e: { muted: boolean }) => setMicOn(!e.muted));
      jitsi.addListener("videoMuteStatusChanged", (e: { muted: boolean }) => setCamOn(!e.muted));
      jitsi.addListener("readyToClose", () => {
        setFullPage(false);
        api.current?.dispose();
        api.current = null;
        setStage("ended");
      });
      setStage("call");
    } catch {
      setError("We couldn't start the video call. Please refresh the page and try again.");
    }
  }

  const scriptReady = Boolean(session);
  const current = cataloguePages[page];

  return (
    <>
      {/* Call: full video by default; when the consultant opens the catalogue, videos stack on the left and the page fills the right. */}
      <div hidden={stage !== "call"} className="h-[calc(100dvh-4rem)] min-h-[420px] flex-col bg-[#1a0b0e] sm:h-[calc(100dvh-6rem)] [&:not([hidden])]:flex">
        <div
          className={`grid min-h-0 flex-1 ${
            showCatalogue ? "grid-cols-[minmax(0,34%)_minmax(0,1fr)] lg:grid-cols-[minmax(0,26%)_minmax(0,1fr)]" : "grid-cols-1"
          }`}
        >
          <div className="relative min-h-0 bg-charcoal">
            <div ref={container} className="absolute inset-0" aria-label="Video consultation" />
          </div>
          <figure hidden={!showCatalogue} className="relative min-h-0 items-center justify-center overflow-hidden p-1.5 sm:p-4 [&:not([hidden])]:flex">
            <button
              type="button"
              onClick={() => setFullPage(true)}
              aria-label="Open this page full screen"
              className="relative flex h-full w-full items-center justify-center"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- pre-sized WebP pages, swapped instantly */}
              <img
                src={current.src}
                width={current.width}
                height={current.height}
                alt={`Your style catalogue, page ${page + 1} of ${lastPage + 1}`}
                className="h-auto max-h-full w-auto max-w-full object-contain shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
              />
              <span className="absolute top-1.5 right-1.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/55 text-white sm:top-3 sm:right-3 sm:h-10 sm:w-10">
                <Maximize2 size={16} aria-hidden />
              </span>
            </button>
          </figure>
        </div>

        {fullPage && showCatalogue && (
          <div className="fixed inset-0 z-50 flex flex-col bg-[#120709]" role="dialog" aria-modal="true" aria-label="Catalogue page, full screen">
            <button
              type="button"
              onClick={() => setFullPage(false)}
              className="flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2"
              aria-label="Close full screen and go back to the videos"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- same page image, larger */}
              <img src={current.src} width={current.width} height={current.height} alt={`Your style catalogue, page ${page + 1} of ${lastPage + 1}`} className="h-auto max-h-full w-auto max-w-full object-contain" />
            </button>
            <div className="flex h-16 shrink-0 items-center justify-between gap-2 px-3 sm:h-20 sm:px-6">
              <RoundButton label="Back to the videos" onClick={() => setFullPage(false)}>
                <X size={22} aria-hidden />
              </RoundButton>
              <div className="flex items-center gap-1.5 sm:gap-3">
                <RoundButton label="Previous page" disabled={page === 0} onClick={() => goTo(page - 1)}>
                  <ChevronLeft size={22} aria-hidden />
                </RoundButton>
                <p className="min-w-[3.6rem] text-center text-sm font-medium text-white tabular-nums sm:text-base">
                  {page + 1} / {lastPage + 1}
                </p>
                <RoundButton label="Next page" disabled={page === lastPage} onClick={() => goTo(page + 1)}>
                  <ChevronRight size={22} aria-hidden />
                </RoundButton>
              </div>
            </div>
          </div>
        )}

        <div className="flex h-16 shrink-0 items-center justify-between gap-2 border-t border-white/10 bg-[#120709] px-2 sm:h-20 sm:px-6">
          <div className="flex items-center gap-1.5 sm:gap-3">
            <RoundButton label={micOn ? "Mute microphone" : "Unmute microphone"} pressed={!micOn} onClick={() => api.current?.executeCommand("toggleAudio")}>
              {micOn ? <Mic size={20} aria-hidden /> : <MicOff size={20} aria-hidden />}
            </RoundButton>
            <RoundButton label={camOn ? "Turn camera off" : "Turn camera on"} pressed={!camOn} onClick={() => api.current?.executeCommand("toggleVideo")}>
              {camOn ? <Video size={20} aria-hidden /> : <VideoOff size={20} aria-hidden />}
            </RoundButton>
            <RoundButton label="Leave the call" danger onClick={() => api.current?.executeCommand("hangup")}>
              <PhoneOff size={20} aria-hidden />
            </RoundButton>
          </div>

          <div className="flex items-center gap-1 min-[380px]:gap-1.5 sm:gap-3">
            {showCatalogue && (
              <div className="flex items-center gap-1 min-[380px]:gap-1.5 sm:gap-3" aria-label="Catalogue pages">
                <RoundButton label="Previous page" disabled={page === 0} onClick={() => goTo(page - 1)}>
                  <ChevronLeft size={22} aria-hidden />
                </RoundButton>
                <p className="min-w-[3rem] text-center text-sm font-medium text-white tabular-nums sm:min-w-[3.6rem] sm:text-base" aria-live="polite">
                  {page + 1} / {lastPage + 1}
                </p>
                <RoundButton label="Next page" disabled={page === lastPage} onClick={() => goTo(page + 1)}>
                  <ChevronRight size={22} aria-hidden />
                </RoundButton>
              </div>
            )}
            {isHost && (
              <button
                type="button"
                onClick={toggleCatalogue}
                aria-pressed={showCatalogue}
                aria-label={showCatalogue ? "Close the catalogue" : "Show the catalogue"}
                className={`inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-full px-3 text-sm font-medium transition-colors min-[380px]:h-11 sm:h-12 sm:px-5 sm:text-base ${
                  showCatalogue ? "bg-white/10 text-white hover:bg-white/20" : "bg-[#a3182c] text-white hover:bg-[#7d1222]"
                }`}
              >
                {showCatalogue ? <X size={18} aria-hidden /> : <BookOpen size={18} aria-hidden />}
                <span className={showCatalogue ? "hidden sm:inline" : ""}>{showCatalogue ? "Close catalogue" : "Catalogue"}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {stage !== "call" && (
        <div className="container-x flex flex-1 items-center py-16">
          <div className="mx-auto w-full max-w-xl text-center">
            {stage === "ended" ? (
              <>
                <h1 className="font-serif text-5xl font-medium text-charcoal">Thank you for joining.</h1>
                <p className="mt-5 text-lg text-muted">
                  We hope you enjoyed your consultation. Your recommendations will follow on WhatsApp.
                </p>
                <button type="button" onClick={join} className="btn-secondary mt-10 text-lg">
                  Rejoin the call
                </button>
              </>
            ) : (
              <>
                <p className="eyebrow">Your Consultation</p>
                <h1 className="mt-5 font-serif text-5xl leading-tight font-medium text-charcoal">Welcome. We are ready for you.</h1>
                {session?.moderator && (
                  <p className="mt-4 inline-block border border-taupe/60 bg-beige px-4 py-2 text-base font-medium text-chocolate">
                    You are joining as the consultant (host)
                  </p>
                )}
                <p className="mt-5 text-lg text-muted">
                  When you tap <strong className="font-medium text-charcoal">Join Consultation</strong>, your browser will
                  ask to use your camera and microphone. Please tap <strong className="font-medium text-charcoal">Allow</strong>.
                </p>

                <form
                  className="mt-10 text-left"
                  onSubmit={(e) => {
                    e.preventDefault();
                    join();
                  }}
                >
                  <label htmlFor="display-name" className="block text-lg font-medium text-charcoal">
                    Your name
                  </label>
                  <input
                    id="display-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="name"
                    className="mt-2 block min-h-14 w-full border border-taupe bg-white px-4 text-lg text-charcoal"
                    placeholder="e.g. Priya"
                  />
                  <button type="submit" disabled={!scriptReady} className="btn-primary mt-6 w-full text-lg disabled:opacity-60">
                    <Video size={22} strokeWidth={1.5} aria-hidden />
                    {scriptReady ? "Join Consultation" : "Preparing…"}
                  </button>
                </form>

                {error && (
                  <p role="alert" className="mt-6 text-lg text-chocolate">
                    {error}
                  </p>
                )}
                <p className="mt-8 text-base text-muted">
                  Works on your phone, tablet or computer. No account or app needed.
                </p>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
