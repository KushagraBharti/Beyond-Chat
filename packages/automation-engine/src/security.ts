import { createHmac, timingSafeEqual } from "node:crypto";

export class WebhookVerificationError extends Error {
  readonly code:
    | "invalid_signature"
    | "stale_timestamp"
    | "malformed_timestamp";
  constructor(
    code: "invalid_signature" | "stale_timestamp" | "malformed_timestamp",
  ) {
    super(code);
    this.code = code;
  }
}
export function signWebhook(
  secret: string,
  timestamp: number,
  rawBody: string,
): string {
  return createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`)
    .digest("hex");
}
export function verifySignedWebhook(input: {
  secret: string;
  timestamp: string;
  signature: string;
  rawBody: string;
  now: Date;
  tolerance_seconds?: number;
}): void {
  const timestamp = Number(input.timestamp);
  if (!Number.isFinite(timestamp))
    throw new WebhookVerificationError("malformed_timestamp");
  if (
    Math.abs(input.now.getTime() / 1000 - timestamp) >
    (input.tolerance_seconds ?? 300)
  )
    throw new WebhookVerificationError("stale_timestamp");
  const expected = Buffer.from(
    signWebhook(input.secret, timestamp, input.rawBody),
    "hex",
  );
  const actual = Buffer.from(input.signature, "hex");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual))
    throw new WebhookVerificationError("invalid_signature");
}
