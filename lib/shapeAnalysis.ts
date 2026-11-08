import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { z } from "zod";
import { SHAPE_IDS } from "./shapes";

// Reads a visitor's body shape from one photo, using Claude's vision. Server only: the API key never
// reaches the browser, and the photo is sent straight to the API and not stored anywhere.

export function analyserConfigured() {
  return Boolean((process.env.ANTHROPIC_API_KEY || "").trim());
}

const Result = z.object({
  status: z.enum(["ok", "unclear"]),
  shape: z.enum([...(SHAPE_IDS as [string, ...string[]]), "none"]),
  confidence: z.enum(["high", "medium", "low"]),
  reason: z.string(),
});

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

export async function analysePhoto(photo: Buffer, mediaType: "image/jpeg" | "image/png" | "image/webp"): Promise<Analysis> {
  const client = new Anthropic();
  const response = await client.beta.messages.parse({
    model: "claude-opus-5-5",
    max_tokens: 8000,
    // If a safety check declines the request, the API retries it on a suitable model by itself.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: SYSTEM,
    output_config: { effort: "medium", format: betaZodOutputFormat(Result) },
    messages: [
      {
        role: "user",
        content: [
          { type: "image", source: { type: "base64", media_type: mediaType, data: photo.toString("base64") } },
          { type: "text", text: "What is this person's body shape?" },
        ],
      },
    ],
  });

  const out = response.parsed_output;
  if (response.stop_reason === "refusal" || !out) {
    console.error(`[shape] No usable answer (stop_reason: ${response.stop_reason}).`);
    return { status: "unclear", reason: "We couldn't read this photo. Please try a clear, front-facing photo from shoulders to hips." };
  }
  if (out.status === "unclear" || out.shape === "none") return { status: "unclear", reason: out.reason };
  return { status: "ok", shape: out.shape, confidence: out.confidence, reason: out.reason };
}
