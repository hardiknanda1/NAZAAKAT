"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

const errors: Record<string, string> = {
  taken: "Another consultant was just given this booking.",
  not_found: "This booking is no longer available.",
  unauthorized: "Your sign-in has expired. Please refresh and sign in again.",
};

export default function RequestButton({ bookingId, status }: { bookingId: string; status: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (status === "pending") return <p className="rounded-full bg-beige px-4 py-2 text-sm font-medium text-chocolate">Requested, waiting for the admin</p>;
  if (status === "declined") return <p className="text-sm text-muted">Given to another consultant</p>;

  async function request() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/consultant/request", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ bookingId }) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "save_failed");
      router.refresh();
    } catch (err) {
      setError(errors[(err as Error).message] || "Could not send your request. Please try again.");
      setBusy(false);
    }
  }

  return (
    <div className="text-right">
      <button type="button" onClick={request} disabled={busy} className="btn-secondary min-h-11 px-5 text-sm disabled:opacity-70">
        {busy && <Loader2 size={16} className="animate-spin" aria-hidden />} Ask to take this
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#a3182c]">
          {error}
        </p>
      )}
    </div>
  );
}
