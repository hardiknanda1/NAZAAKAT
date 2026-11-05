import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import AvailabilityManager from "./AvailabilityManager";

export const metadata: Metadata = {
  title: "Availability | NAZAAKAT",
  robots: { index: false, follow: false },
};

export default function AvailabilityPage() {
  return (
    <div className="container-x max-w-4xl py-12">
      <Link href="/admin" className="inline-flex items-center gap-1.5 text-base text-muted hover:text-chocolate">
        <ArrowLeft size={16} aria-hidden /> Back to bookings
      </Link>
      <h1 className="mt-5 font-serif text-5xl font-medium text-charcoal">Availability</h1>
      <p className="mt-3 max-w-2xl text-lg text-muted">
        Add the times you are free for consultations. Clients can only book an open time shown here; once booked, a slot
        is removed from what others can choose.
      </p>
      <div className="mt-10">
        <AvailabilityManager />
      </div>
    </div>
  );
}
