"use client";

import { Loader2, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatShort, formatTime } from "@/lib/time";

type Slot = { id: string; starts_at: string; duration_minutes: number; is_booked: boolean };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const errors: Record<string, string> = {
  unauthorized: "Your sign-in has expired. Please refresh the page and sign in again.",
  not_configured: "This site is not connected to Supabase yet. Add SUPABASE_URL and SUPABASE_SECRET_KEY in Vercel.",
  no_slots: "That gives no future time slots. Please check the dates and times.",
  too_many: "That is too many times to add at once. Please choose a shorter date range.",
  bad_request: "Something went wrong with that request. Please try again.",
  read_failed: "Could not load availability from the database. Open /api/intake/status to check the Supabase setup.",
  save_failed: "Could not save those times to the database. Open /api/intake/status to check the Supabase setup.",
  delete_failed: "Could not remove that time from the database. Open /api/intake/status to check the Supabase setup.",
};

function todayLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}

export default function AvailabilityManager() {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  // Bulk-generate form state
  const [fromDate, setFromDate] = useState(todayLocal());
  const [toDate, setToDate] = useState(todayLocal());
  const [days, setDays] = useState<boolean[]>([false, true, true, true, true, true, false]);
  const [startTime, setStartTime] = useState("10:00");
  const [endTime, setEndTime] = useState("18:00");
  const [duration, setDuration] = useState(45);

  async function load() {
    try {
      const res = await fetch("/api/admin/slots", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "read_failed");
      setSlots(data.slots);
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not load availability. Please refresh the page.");
    }
  }

  useEffect(() => {
    void (async () => {
      await load();
    })();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots || []) {
      const key = formatShort(s.starts_at);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return [...map.entries()];
  }, [slots]);

  // Pure: every slot the current form inputs describe, with no "is this in the past" check, so it
  // can be called during render for the live preview count without touching the clock there.
  // generate() (below) is the version actually submitted, which does filter out past times.
  function generateAll(): { startsAt: string; durationMinutes: number }[] {
    const out: { startsAt: string; durationMinutes: number }[] = [];
    const from = new Date(`${fromDate}T00:00`);
    const to = new Date(`${toDate}T23:59`);
    const [sh, sm] = startTime.split(":").map(Number);
    const [eh, em] = endTime.split(":").map(Number);
    for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
      if (!days[d.getDay()]) continue;
      const dayStart = new Date(d);
      dayStart.setHours(sh, sm, 0, 0);
      const dayEnd = new Date(d);
      dayEnd.setHours(eh, em, 0, 0);
      for (let t = new Date(dayStart); t.getTime() + duration * 60000 <= dayEnd.getTime(); t.setMinutes(t.getMinutes() + duration)) {
        out.push({ startsAt: t.toISOString(), durationMinutes: duration });
      }
    }
    return out;
  }

  function previewCount() {
    return generateAll().length;
  }

  function generate(): { startsAt: string; durationMinutes: number }[] {
    const now = Date.now();
    return generateAll().filter((s) => new Date(s.startsAt).getTime() > now);
  }

  async function addGenerated(e: React.FormEvent) {
    e.preventDefault();
    const rows = generate();
    if (rows.length === 0) {
      setError("That gives no future time slots. Please check the dates and times.");
      return;
    }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/admin/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "save_failed");
      setNotice(`Added ${data.added} time${data.added === 1 ? "" : "s"}. Times that already existed were left as they were.`);
      load();
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not add those times. Please check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  async function removeSlot(id: string) {
    setSlots((s) => s?.filter((x) => x.id !== id) ?? s);
    try {
      const res = await fetch(`/api/admin/slots?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "delete_failed");
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not remove that time. Please refresh and try again.");
      load();
    }
  }

  return (
    <div className="space-y-12">
      <form onSubmit={addGenerated} className="border border-taupe/60 bg-ivory p-5 sm:p-8">
        <h2 className="font-serif text-2xl font-medium text-charcoal">Add open times</h2>
        <p className="mt-2 text-base text-muted">Pick a date range, the days and hours you are free, and how long each consultation is.</p>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="block">
            <span className="text-base font-medium text-charcoal">From date</span>
            <input type="date" value={fromDate} min={todayLocal()} onChange={(e) => setFromDate(e.target.value)} required className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
          <label className="block">
            <span className="text-base font-medium text-charcoal">To date</span>
            <input type="date" value={toDate} min={fromDate} onChange={(e) => setToDate(e.target.value)} required className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
          <label className="block">
            <span className="text-base font-medium text-charcoal">Start time</span>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} required className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
          <label className="block">
            <span className="text-base font-medium text-charcoal">End time</span>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} required className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base" />
          </label>
          <label className="block">
            <span className="text-base font-medium text-charcoal">Each consultation lasts</span>
            <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="mt-1.5 block min-h-12 w-full border border-taupe bg-white px-3 text-base">
              {[30, 45, 60, 90].map((m) => (
                <option key={m} value={m}>
                  {m} minutes
                </option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="mt-5">
          <legend className="text-base font-medium text-charcoal">On these days</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {WEEKDAYS.map((d, i) => (
              <label key={d} className="cursor-pointer">
                <input type="checkbox" checked={days[i]} onChange={() => setDays((arr) => arr.map((v, j) => (j === i ? !v : v)))} className="peer sr-only" />
                <span className="inline-flex min-h-11 items-center rounded-full border border-taupe px-4 text-base text-charcoal transition-colors peer-checked:border-chocolate peer-checked:bg-chocolate peer-checked:text-ivory">
                  {d}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <p className="mt-5 text-base text-muted">This will add up to {previewCount()} open time{previewCount() === 1 ? "" : "s"}.</p>
        <div aria-live="assertive">
          {error && (
            <p role="alert" className="mt-3 text-base text-[#a3182c]">
              {error}
            </p>
          )}
          {notice && <p className="mt-3 text-base text-chocolate">{notice}</p>}
        </div>
        <button type="submit" disabled={busy} className="btn-primary mt-5 rounded-lg text-base disabled:opacity-70">
          {busy ? (
            <>
              <Loader2 size={18} className="animate-spin" aria-hidden /> Adding…
            </>
          ) : (
            <>
              <Plus size={18} aria-hidden /> Add these times
            </>
          )}
        </button>
      </form>

      <div>
        <h2 className="font-serif text-2xl font-medium text-charcoal">Upcoming times</h2>
        {slots === null ? (
          <p className="mt-3 text-base text-muted">Loading…</p>
        ) : grouped.length === 0 ? (
          <p className="mt-3 text-base text-muted">No times added yet.</p>
        ) : (
          <div className="mt-5 space-y-6">
            {grouped.map(([day, daySlots]) => (
              <div key={day}>
                <p className="text-base font-medium text-chocolate">{day}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {daySlots.map((s) => (
                    <li key={s.id}>
                      {s.is_booked ? (
                        <span className="inline-flex min-h-11 items-center border border-taupe/40 bg-beige px-4 text-base text-muted">
                          {formatTime(s.starts_at)} · booked
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => removeSlot(s.id)}
                          className="group inline-flex min-h-11 items-center gap-2 border border-taupe px-4 text-base text-charcoal transition-colors hover:border-[#a3182c] hover:text-[#a3182c]"
                        >
                          {formatTime(s.starts_at)}
                          <Trash2 size={14} className="opacity-0 transition-opacity group-hover:opacity-100" aria-hidden />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
