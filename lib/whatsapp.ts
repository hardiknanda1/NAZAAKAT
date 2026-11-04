// Minimal WhatsApp Business Platform (Meta Cloud API) client.
// Business-initiated messages must use a template approved in WhatsApp Manager.

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v23.0";

export function whatsappConfigured() {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/** Digits only, including country code (e.g. "+91 98765 43210" → "919876543210"). */
export function normalisePhone(raw: string | null | undefined) {
  const digits = (raw || "").replace(/\D/g, "").replace(/^00/, "");
  return digits.length >= 8 && digits.length <= 15 ? digits : null;
}

export async function sendTemplate(to: string, template: string, params: string[]) {
  const res = await fetch(`https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to,
      type: "template",
      template: {
        name: template,
        language: { code: process.env.WHATSAPP_TEMPLATE_LANGUAGE || "en" },
        components: [{ type: "body", parameters: params.map((text) => ({ type: "text", text })) }],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp API ${res.status}: ${await res.text()}`);
  }
}
