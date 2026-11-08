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
    const res = await fetch(`${apiBase()}/v1beta/models/${geminiModel()}`, {
      headers: { "x-goog-api-key": env("GEMINI_API_KEY") },
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
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

// Stop waiting well before the platform's 60-second limit, so a slow answer becomes a clear error.
const ANSWER_TIMEOUT_MS = 40_000;

// Gemini 3 models reason at length by default, which is slow and unnecessary for picking one of five
// shapes; a low thinking level answers much faster.
function thinkingConfig(model: string) {
  return model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {};
}

export async function analysePhoto(photo: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<Analysis> {
  const model = geminiModel();
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(ANSWER_TIMEOUT_MS),
      headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: mediaType, data: photo.toString("base64") } }, { text: "What is this person's body shape?" }],
          },
        ],
        generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2, ...thinkingConfig(model) },
      }),
    });
  } catch (err) {
    if ((err as Error).name === "TimeoutError")
      throw new Error(`Gemini (${model}) did not answer within ${ANSWER_TIMEOUT_MS / 1000} seconds.`);
    throw err;
  }
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


type Probe = { ok: boolean; seconds: number; detail: string };

async function probe(body: object, timeoutMs = 30_000): Promise<Probe> {
  const started = Date.now();
  const seconds = () => Math.round((Date.now() - started) / 100) / 10;
  try {
    const res = await fetch(`${apiBase()}/v1beta/models/${geminiModel()}:generateContent`, {
      method: "POST",
      headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    const raw = await res.text();
    if (!res.ok) return { ok: false, seconds: seconds(), detail: `${res.status}: ${raw.slice(0, 300)}` };
    const data = JSON.parse(raw) as GeminiResponse;
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    return { ok: true, seconds: seconds(), detail: text.slice(0, 120) || `no text (finish: ${data.candidates?.[0]?.finishReason})` };
  } catch (err) {
    const e = err as Error;
    return { ok: false, seconds: seconds(), detail: e.name === "TimeoutError" ? `no answer within ${timeoutMs / 1000}s` : e.message };
  }
}

/**
 * Narrows down a failing analysis: lists the Flash models this key can use (free) and sends a few small
 * requests side by side, each adding one part of the real request, to see which part stalls or fails.
 */
export async function diagnose() {
  const model = geminiModel();
  const image = { inlineData: { mimeType: "image/png", data: TEST_IMAGE } };
  const [models, textOnly, textLowThinking, imageNoSchema, fullRequest] = await Promise.all([
    fetch(`${apiBase()}/v1beta/models?pageSize=200`, { headers: { "x-goog-api-key": env("GEMINI_API_KEY") }, signal: AbortSignal.timeout(10_000) })
      .then(async (r) => {
        const data = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
        return (data.models || [])
          .filter((m) => /flash/i.test(m.name) && (m.supportedGenerationMethods || []).includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""));
      })
      .catch((e: Error) => [`could not list models: ${e.message}`]),
    probe({ contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }] }),
    probe({ contents: [{ role: "user", parts: [{ text: "Reply with the single word OK." }] }], generationConfig: { ...thinkingConfig(model) } }),
    probe({ contents: [{ role: "user", parts: [image, { text: "Describe this image in five words." }] }], generationConfig: { ...thinkingConfig(model) } }),
    probe({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: [{ role: "user", parts: [image, { text: "What is this person's body shape?" }] }],
      generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2, ...thinkingConfig(model) },
    }),
  ]);
  return { model, flashModelsForThisKey: models, probes: { textOnly, textLowThinking, imageNoSchema, fullRequest } };
}
