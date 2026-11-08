import { SHAPE_IDS } from "./shapes";

// Reads a visitor's body shape from one photo with Google's Gemini (REST, no SDK). Server only: the
// API key never reaches the browser, and the photo is sent straight to the API and not stored here.
// Keep billing enabled on the Google project: on the free tier Google may use the photos it receives
// to improve its products, which this site promises not to allow.

const env = (name: string) => (process.env[name] || "").trim();
// Google retires older models for new accounts (gemini-2.5-flash already is); GEMINI_MODEL overrides this.
const DEFAULT_MODEL = "gemini-3.8-flash";
const MODEL_NAME = /^[a-z0-9][a-z0-9.-]*$/;

/** GEMINI_MODEL tidied up: "models/Gemini 3.8 Flash" or a quoted value still give "gemini-3.8-flash". */
function configuredModel() {
  return env("GEMINI_MODEL")
    .replace(/^["']|["']$/g, "")
    .trim()
    .replace(/^models\//i, "")
    .toLowerCase()
    .replace(/\s+/g, "-");
}

/** True when GEMINI_MODEL is set but still isn't a valid model name after tidying. */
export const modelNameInvalid = () => Boolean(configuredModel()) && !MODEL_NAME.test(configuredModel());
export const geminiModel = () => (configuredModel() && !modelNameInvalid() ? configuredModel() : DEFAULT_MODEL);
const apiBase = () => (env("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com").replace(/\/$/, "");

export function analyserConfigured() {
  return Boolean(env("GEMINI_API_KEY"));
}

/** Checks the key and model with a free lookup (no photo, no cost). */
export async function analyserReachable(): Promise<"ok" | "bad_key" | "bad_model" | "unreachable"> {
  try {
    const res = await fetch(`${apiBase()}/v1beta/models/${geminiModel()}`, { headers: { "x-goog-api-key": env("GEMINI_API_KEY") }, cache: "no-store" });
    if (res.ok) return "ok";
    if (res.status === 404) return "bad_model";
    return "bad_key";
  } catch {
    return "unreachable";
  }
}

export type Analysis =
  | { status: "ok"; shape: string; confidence: "high" | "medium" | "low"; reason: string }
  | { status: "unclear"; reason: string };

const SYSTEM = `You help a personal fashion consultancy tell a client their body shape from one photo, so their stylist can suggest flattering clothes.

Classify the person into exactly one of these shapes, judging only the proportions of shoulders, bust, waist and hips:
- hourglass: shoulders/bust and hips about equally wide, with a clearly narrower, defined waist.
- pear: hips noticeably wider than shoulders and bust; the waist is usually defined.
- apple: the middle (bust and waist) is the fullest part; the waist is not narrower than bust or hips; legs and arms are often slimmer.
- rectangle: shoulders, waist and hips about the same width, with little waist definition.
- inverted-triangle: shoulders and/or bust noticeably wider than the hips.

Clothing can hide the outline: look at where the fabric falls and use your best judgement, and say so with lower confidence.

Use status "unclear" (and shape "none") when you cannot judge fairly, for example: the photo does not show one person from shoulders to hips facing roughly towards the camera; several people are in it; it is too dark, blurry or cropped; the clothes are too loose to see any outline; the person looks under 18; or it is not a real photo of a person. Then use "reason" to say briefly and kindly what kind of photo would work.

For status "ok", write "reason" as one or two warm, encouraging sentences to the person, in the second person, describing their proportions (for example "Your shoulders and hips are beautifully balanced, with a defined waist."). Never comment on weight, size, attractiveness or anything other than proportions.`;

const SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["ok", "unclear"] },
    shape: { type: "STRING", enum: [...SHAPE_IDS, "none"] },
    confidence: { type: "STRING", enum: ["high", "medium", "low"] },
    reason: { type: "STRING" },
  },
  required: ["status", "shape", "confidence", "reason"],
  propertyOrdering: ["status", "shape", "confidence", "reason"],
};

const UNREADABLE = "We couldn't read this photo. Please try a clear, front-facing photo from shoulders to hips.";

type GeminiResponse = {
  candidates?: { finishReason?: string; content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
};

export async function analysePhoto(photo: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<Analysis> {
  const res = await fetch(`${apiBase()}/v1beta/models/${geminiModel()}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [
        {
          role: "user",
          parts: [{ inlineData: { mimeType: mediaType, data: photo.toString("base64") } }, { text: "What is this person's body shape?" }],
        },
      ],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2 },
    }),
  });
  if (!res.ok) {
    const raw = await res.text();
    let message = raw;
    try {
      message = (JSON.parse(raw) as { error?: { message?: string } }).error?.message || raw;
    } catch {
      // not JSON: keep the raw text
    }
    throw new Error(`Gemini request failed (${res.status}): ${message.slice(0, 500)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  const candidate = data.candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text || "").join("") || "";
  if (data.promptFeedback?.blockReason || !text) {
    console.error(`[shape] No usable answer (block: ${data.promptFeedback?.blockReason}, finish: ${candidate?.finishReason}).`);
    return { status: "unclear", reason: UNREADABLE };
  }

  let out: { status?: string; shape?: string; confidence?: string; reason?: string };
  try {
    out = JSON.parse(text);
  } catch {
    console.error("[shape] The answer was not valid JSON.");
    return { status: "unclear", reason: UNREADABLE };
  }
  const reason = typeof out.reason === "string" && out.reason.trim() ? out.reason.trim().slice(0, 400) : UNREADABLE;
  if (out.status !== "ok" || !out.shape || !SHAPE_IDS.includes(out.shape)) return { status: "unclear", reason };
  const confidence = out.confidence === "high" || out.confidence === "low" ? out.confidence : "medium";
  return { status: "ok", shape: out.shape, confidence, reason };
}

// A blank 1 x 1 pixel PNG: enough to send Gemini a real request of the same kind as a visitor's photo.
const TEST_IMAGE = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

/** Sends Gemini one real analysis request (a blank pixel, costs a tiny fraction of a cent) and reports what happened. */
export async function testAnalysis(): Promise<{ ok: true; answer: string } | { ok: false; error: string }> {
  try {
    const result = await analysePhoto(Buffer.from(TEST_IMAGE, "base64"), "image/png");
    return { ok: true, answer: result.status === "unclear" ? `unclear (expected for a blank image): ${result.reason}` : result.shape };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
