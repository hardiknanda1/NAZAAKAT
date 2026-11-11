const TIME_ZONE = "Asia/Kolkata";

export function formatWhen(iso: string) {
  const opts: Intl.DateTimeFormatOptions = { dateStyle: "full", timeStyle: "short" };
  try {
    return new Intl.DateTimeFormat("en-IN", { ...opts, timeZone: TIME_ZONE }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-IN", opts).format(new Date(iso));
  }
}

export function formatShort(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", timeZone: TIME_ZONE }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(iso));
  }
}

export function formatTime(iso: string) {
  try {
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit", timeZone: TIME_ZONE }).format(new Date(iso));
  } catch {
    return new Intl.DateTimeFormat("en-IN", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));
  }
}

/** The current time in milliseconds (a helper, so server components can read the clock). */
export const nowMs = () => Date.now();
