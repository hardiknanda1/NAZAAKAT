import { questions } from "@/lib/intake";
import { formatWhen } from "@/lib/time";
import type { Intake } from "@/lib/supabase";

// A client's questionnaire answers and private photos (1-hour signed links), shared by the
// bookings list and the single-booking consultant page.
export default function IntakeSummary({ intake, urls }: { intake: Intake; urls: Record<string, string> }) {
  const answered = questions.filter((q) => intake.answers?.[q.id]);
  return (
    <div className="mt-6 border-t border-taupe/40 pt-5">
      <p className="eyebrow">Questionnaire, sent {formatWhen(intake.created_at)}</p>
      {intake.photos.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-3">
          {intake.photos.map((path, i) =>
            urls[path] ? (
              <a key={path} href={urls[path]} target="_blank" rel="noopener noreferrer" className="block">
                {/* eslint-disable-next-line @next/next/no-img-element -- private photo via a short-lived signed link */}
                <img src={urls[path]} alt={`Photo ${i + 1} from ${intake.name || "client"}`} className="h-36 w-28 rounded-md object-cover sm:h-44 sm:w-32" />
              </a>
            ) : null,
          )}
        </div>
      )}
      {answered.length > 0 ? (
        <dl className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
          {answered.map((q) => {
            const v = intake.answers[q.id];
            return (
              <div key={q.id}>
                <dt className="text-sm text-muted">{q.label}</dt>
                <dd className="text-base text-charcoal">{Array.isArray(v) ? v.join(", ") : v}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-4 text-base text-muted">No answers, photos only.</p>
      )}
    </div>
  );
}
