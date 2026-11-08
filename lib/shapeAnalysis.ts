import { SHAPE_IDS } from "./shapes";

// Reads a visitor's body shape from one photo with Google's Gemini (REST, no SDK). Server only: the
// API key never reaches the browser, and the photo is sent straight to the API and not stored here.
// Keep billing enabled on the Google project: on the free tier Google may use the photos it receives
// to improve its products, which this site promises not to allow.

const env = (name: string) => (process.env[name] || "").trim();
// Models are tried in this order: when one is overloaded or unavailable (Google answers 503 under
// heavy demand, and retires older models for new accounts), the next one takes over.
// The Lite models are a little less precise, so they come last.
const DEFAULT_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.6-flash",
  "gemini-3.5-flash",
  "gemini-flash-latest",
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
];
const MODEL_NAME = /^[a-z0-9][a-z0-9.-]*$/;

/** GEMINI_MODEL as model names, tidied: "models/Gemini 3.8 Flash" or quoted values still work. A comma list sets the order. */
function configuredModels() {
  return env("GEMINI_MODEL")
    .split(",")
    .map((m) =>
      m
        .replace(/^\s*["']|["']\s*$/g, "")
        .trim()
        .replace(/^models\//i, "")
        .toLowerCase()
        .replace(/\s+/g, "-"),
    )
    .filter(Boolean);
}

/** True when GEMINI_MODEL is set but some of it isn't a valid model name after tidying. */
export const modelNameInvalid = () => configuredModels().some((m) => !MODEL_NAME.test(m));

/** Models to try, in order: any set in GEMINI_MODEL first, then the defaults as fallbacks. */
export function modelChain() {
  const chosen = configuredModels().filter((m) => MODEL_NAME.test(m));
  return [...new Set([...chosen, ...DEFAULT_MODELS])];
}
export const geminiModel = () => modelChain()[0];
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

// The whole analysis must finish inside the route's 60-second limit.
const TOTAL_BUDGET_MS = 48_000;
// Under heavy demand a model may accept a request and then hang, so the next model is asked as well
// after this long without an answer (or straight away when one fails). The first good answer wins.
const HEDGE_MS = 5_000;

// Gemini 3 models reason at length by default, which is slow and unnecessary for picking one of five
// shapes; a low thinking level answers much faster.
function thinkingConfig(model: string) {
  return model.startsWith("gemini-3") ? { thinkingConfig: { thinkingLevel: "low" } } : {};
}

function analysisBody(model: string, mediaType: string, base64: string) {
  return {
    systemInstruction: { parts: [{ text: SYSTEM }] },
    contents: [
      { role: "user", parts: [{ inlineData: { mimeType: mediaType, data: base64 } }, { text: "What is this person's body shape?" }] },
    ],
    generationConfig: { responseMimeType: "application/json", responseSchema: SCHEMA, temperature: 0.2, ...thinkingConfig(model) },
  };
}

/** One generateContent call; throws a readable error for a timeout or a non-2xx answer. */
async function callModel(model: string, body: object, timeoutMs: number, cancel?: AbortSignal): Promise<GeminiResponse> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal: cancel ? AbortSignal.any([cancel, AbortSignal.timeout(timeoutMs)]) : AbortSignal.timeout(timeoutMs),
      headers: { "x-goog-api-key": env("GEMINI_API_KEY"), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (err) {
    if ((err as Error).name === "TimeoutError") throw new Error(`${model}: no answer within ${Math.round(timeoutMs / 1000)}s`);
    throw new Error(`${model}: ${(err as Error).message}`);
  }
  if (!res.ok) {
    const raw = await res.text();
    let message = raw;
    try {
      message = (JSON.parse(raw) as { error?: { message?: string } }).error?.message || raw;
    } catch {
      // not JSON: keep the raw text
    }
    throw new Error(`${model}: ${res.status} ${message.slice(0, 300)}`);
  }
  return (await res.json()) as GeminiResponse;
}

/**
 * Asks the models in order, overlapping: the next one is asked when the current one fails, or after
 * HEDGE_MS without an answer. The first good answer wins and every other request is cancelled.
 */
function firstAnswer(base64: string, mediaType: string): Promise<GeminiResponse> {
  const chain = modelChain();
  const deadline = Date.now() + TOTAL_BUDGET_MS;
  const cancel = new AbortController();
  const failures: string[] = [];
  return new Promise((resolve, reject) => {
    let launched = 0;
    let failed = 0;
    let done = false;
    let next: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (done) return;
      done = true;
      clearTimeout(next);
      clearTimeout(overall);
      cancel.abort();
      fn();
    };
    const launch = () => {
      if (done || launched >= chain.length) return;
      const model = chain[launched++];
      clearTimeout(next);
      if (launched < chain.length) next = setTimeout(launch, HEDGE_MS);
      callModel(model, analysisBody(model, mediaType, base64), Math.max(1_000, deadline - Date.now()), cancel.signal).then(
        (data) =>
          finish(() => {
            if (failures.length) console.warn(`[shape] Used ${model} after: ${failures.join(" | ")}`);
            resolve(data);
          }),
        (err: Error) => {
          if (done) return;
          failures.push(err.message);
          failed++;
          if (failed === chain.length) finish(() => reject(new Error(`Gemini request failed for every model: ${failures.join(" | ")}`)));
          else launch();
        },
      );
    };
    const overall = setTimeout(
      () =>
        finish(() =>
          reject(new Error(`No Gemini model answered within ${TOTAL_BUDGET_MS / 1000}s: ${failures.join(" | ") || "no replies"}`)),
        ),
      TOTAL_BUDGET_MS,
    );
    launch();
  });
}

export async function analysePhoto(photo: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<Analysis> {
  const data = await firstAnswer(photo.toString("base64"), mediaType);

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

async function probe(model: string, timeoutMs = 25_000): Promise<Probe> {
  const started = Date.now();
  const seconds = () => Math.round((Date.now() - started) / 100) / 10;
  try {
    const data = await callModel(model, analysisBody(model, "image/png", TEST_IMAGE), timeoutMs);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    return { ok: true, seconds: seconds(), detail: text.slice(0, 120) || `no text (finish: ${data.candidates?.[0]?.finishReason})` };
  } catch (err) {
    return { ok: false, seconds: seconds(), detail: (err as Error).message };
  }
}

/**
 * Lists the Flash models this key can use (free) and sends the real analysis request (with a blank
 * pixel) to every model in the fallback chain side by side, to show which ones answer right now.
 */
export async function diagnose() {
  const chain = modelChain();
  const [models, ...results] = await Promise.all([
    fetch(`${apiBase()}/v1beta/models?pageSize=200`, {
      headers: { "x-goog-api-key": env("GEMINI_API_KEY") },
      signal: AbortSignal.timeout(10_000),
    })
      .then(async (r) => {
        const data = (await r.json()) as { models?: { name: string; supportedGenerationMethods?: string[] }[] };
        return (data.models || [])
          .filter((m) => /flash/i.test(m.name) && (m.supportedGenerationMethods || []).includes("generateContent"))
          .map((m) => m.name.replace(/^models\//, ""));
      })
      .catch((e: Error) => [`could not list models: ${e.message}`]),
    ...chain.map((m) => probe(m)),
  ]);
  const probes = Object.fromEntries(chain.map((m, i) => [m, results[i]]));
  const firstWorking = chain.find((m, i) => results[i].ok) ?? null;
  return { chain, firstWorking, probes, flashModelsForThisKey: models };
}
