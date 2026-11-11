"use client";

import { Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { removeBookingAction } from "./consultants/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center gap-1.5 px-3 text-sm text-muted underline underline-offset-4 hover:text-[#a3182c] disabled:opacity-60">
      <Trash2 size={15} aria-hidden /> {pending ? "Removing…" : "Remove booking"}
    </button>
  );
}

/** Deletes a booking for good, after a confirm. */
export default function RemoveBookingButton({ id, name, upcoming }: { id: string; name: string; upcoming: boolean }) {
  return (
    <form
      action={removeBookingAction}
      onSubmit={(e) => {
        const note = upcoming ? " Their time slot will open again for others to book. Let the client know yourself." : "";
        if (!confirm(`Remove ${name}'s booking for good? Their questionnaire, photos and catalogue are deleted too.${note}`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <Submit />
    </form>
  );
}
