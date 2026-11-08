// One-time codes by text message, through Twilio Verify (https://www.twilio.com/docs/verify/api).
// Twilio creates, sends and checks the code and limits retries, so no code is ever stored here.
// Without Twilio set up, local development (never production) accepts the code 123456.

const env = (name: string) => (process.env[name] || "").trim();

export function otpConfigured() {
  return Boolean(env("TWILIO_ACCOUNT_SID") && env("TWILIO_AUTH_TOKEN") && env("TWILIO_VERIFY_SERVICE_SID"));
}

const DEV_CODE = "123456";
const devMode = () => !otpConfigured() && process.env.NODE_ENV !== "production";

/** Digits with country code -> E.164. A bare 10-digit number is taken as Indian (+91). */
export function toE164(digits: string) {
  return `+${digits.length === 10 ? `91${digits}` : digits}`;
}

async function twilio(path: string, form: Record<string, string>) {
  const auth = Buffer.from(`${env("TWILIO_ACCOUNT_SID")}:${env("TWILIO_AUTH_TOKEN")}`).toString("base64");
  return fetch(`https://verify.twilio.com/v2/Services/${env("TWILIO_VERIFY_SERVICE_SID")}/${path}`, {
    method: "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(form),
  });
}

/** Sends a code to the number. Returns "sent", "not_configured" or "failed". */
export async function sendCode(e164: string): Promise<"sent" | "not_configured" | "failed"> {
  if (devMode()) {
    console.log(`[otp] Development mode: the code for ${e164} is ${DEV_CODE}.`);
    return "sent";
  }
  if (!otpConfigured()) return "not_configured";
  try {
    const res = await twilio("Verifications", { To: e164, Channel: env("TWILIO_VERIFY_CHANNEL") || "sms" });
    if (res.ok) return "sent";
    console.error(`[otp] Twilio could not send a code (${res.status}): ${await res.text()}`);
  } catch (err) {
    console.error("[otp] Could not reach Twilio.", err);
  }
  return "failed";
}

/** True only when the code is the one just sent to this number. */
export async function checkCode(e164: string, code: string): Promise<boolean> {
  if (devMode()) return code === DEV_CODE;
  if (!otpConfigured()) return false;
  try {
    const res = await twilio("VerificationCheck", { To: e164, Code: code });
    if (!res.ok) return false; // 404 once the code has expired or been used
    const data = (await res.json()) as { status?: string };
    return data.status === "approved";
  } catch (err) {
    console.error("[otp] Could not reach Twilio.", err);
    return false;
  }
}
