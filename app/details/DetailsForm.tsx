"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import Intake from "@/components/Intake";

export default function DetailsForm() {
  const [done, setDone] = useState(false);
  if (!done) return <Intake inviteeUri={null} onDone={() => setDone(true)} />;
  return (
    <div className="flex gap-4 border border-chocolate/30 bg-ivory p-6 sm:p-10" role="status">
      <CircleCheck className="mt-1 shrink-0 text-chocolate" size={28} strokeWidth={1.5} aria-hidden />
      <div>
        <p className="font-serif text-3xl font-medium text-charcoal">Thank you. Your stylist has your details.</p>
        <p className="mt-3 text-lg text-muted">
          We will send your private video consultation link to your WhatsApp number. Simply tap it at your appointment time. No
          account or app download needed.
        </p>
        <Link href="/" className="btn-secondary mt-8 rounded-lg text-lg">
          Back to home
        </Link>
      </div>
    </div>
  );
}
