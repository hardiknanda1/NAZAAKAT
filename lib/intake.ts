// The questionnaire shown right after booking. Used by the form and the admin page, so labels always match.
// Kept short and mostly tap-to-choose for clients who are not comfortable with long forms.

export type Question =
  | { id: string; label: string; type: "choice"; options: string[]; required?: boolean }
  | { id: string; label: string; type: "multi"; options: string[]; required?: boolean }
  | { id: string; label: string; type: "text"; placeholder?: string; required?: boolean };

export const questions: Question[] = [
  { id: "height", label: "Your height", type: "text", placeholder: "e.g. 5 ft 3 in", required: true },
  { id: "wear", label: "What do you wear most?", type: "choice", options: ["Mostly Indian", "Mostly Western", "A mix of both"], required: true },
  {
    id: "occasions",
    label: "Which occasions do you dress for most?",
    type: "multi",
    options: ["Everyday", "Work", "Festive and weddings", "Parties and evenings", "Travel"],
    required: true,
  },
  {
    id: "focus",
    label: "Anything you would like your clothes to highlight or balance?",
    type: "text",
    placeholder: "Optional",
  },
  { id: "colours", label: "Colours you love, or avoid", type: "text", placeholder: "Optional" },
  { id: "notes", label: "Anything else we should know?", type: "text", placeholder: "Optional" },
];

export const MAX_PHOTOS = 5;
export const MAX_PHOTO_BYTES = 1_500_000; // after the browser shrinks them; keeps the upload under Vercel's 4.5 MB limit
export const MAX_TOTAL_BYTES = 4_200_000;

/** Keeps only known questions and options, trimmed, so nothing unexpected is stored. */
export function cleanAnswers(raw: unknown): Record<string, string | string[]> {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out: Record<string, string | string[]> = {};
  for (const q of questions) {
    const v = input[q.id];
    if (q.type === "multi") {
      const picked = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && q.options.includes(x)) : [];
      if (picked.length) out[q.id] = picked;
    } else if (typeof v === "string" && v.trim()) {
      if (q.type === "choice" && !q.options.includes(v)) continue;
      out[q.id] = v.trim().slice(0, 600);
    }
  }
  return out;
}

/** The required questions left unanswered, by label (empty when the questionnaire is complete). */
export function missingAnswers(answers: Record<string, string | string[]>) {
  return questions.filter((q) => q.required && !answers[q.id]?.length).map((q) => q.label);
}
