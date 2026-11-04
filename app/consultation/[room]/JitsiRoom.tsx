"use client";

import Script from "next/script";
import { Video } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { site } from "@/lib/site";

type JitsiApi = { dispose: () => void; addListener: (event: string, fn: () => void) => void };

declare global {
  interface Window {
    JitsiMeetExternalAPI?: new (domain: string, options: Record<string, unknown>) => JitsiApi;
  }
}

// Optional prefix, e.g. a Jitsi-as-a-Service app ID ("vpaas-magic-cookie-…").
const roomPrefix = process.env.NEXT_PUBLIC_JITSI_ROOM_PREFIX || "";

export default function JitsiRoom({ room }: { room: string }) {
  const container = useRef<HTMLDivElement>(null);
  const api = useRef<JitsiApi | null>(null);
  const [scriptReady, setScriptReady] = useState(false);
  const [name, setName] = useState("");
  const [stage, setStage] = useState<"welcome" | "call" | "ended">("welcome");
  const [error, setError] = useState("");

  // Clean up the call if the person leaves the page.
  useEffect(() => () => api.current?.dispose(), []);

  function join() {
    if (!container.current || !window.JitsiMeetExternalAPI) return;
    setError("");
    api.current?.dispose();
    container.current.innerHTML = "";
    try {
      api.current = new window.JitsiMeetExternalAPI(site.jitsiDomain, {
        roomName: roomPrefix ? `${roomPrefix}/${room}` : room,
        parentNode: container.current,
        width: "100%",
        height: "100%",
        userInfo: { displayName: name.trim() || "Guest" },
        configOverwrite: {
          prejoinConfig: { enabled: false },
          disableDeepLinking: true, // keep mobile users in the browser instead of asking for the app
          startWithAudioMuted: false,
          startWithVideoMuted: false,
        },
        interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
      });
      api.current.addListener("readyToClose", () => {
        api.current?.dispose();
        api.current = null;
        setStage("ended");
      });
      setStage("call");
    } catch {
      setError("We couldn't start the video call. Please refresh the page and try again.");
    }
  }

  return (
    <>
      <Script
        src={`https://${site.jitsiDomain}/external_api.js`}
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setError("The video service could not be reached. Please check your internet connection and refresh.")}
      />

      <div
        ref={container}
        hidden={stage !== "call"}
        className="min-h-[560px] w-full flex-1 bg-charcoal"
        aria-label="Video consultation"
      />
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
