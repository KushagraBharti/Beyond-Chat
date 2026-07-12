import type { ContentRisk } from "./contracts.ts";

const MALICIOUS = [/ignore (all |any |the )?(previous|prior) instructions/i, /system\s*message/i, /(?:call|use)\s+(?:the )?(?:tool|function)/i, /exfiltrat(?:e|ion)|send (?:the )?(?:secret|token|credential)/i];
const SUSPICIOUS = [/assistant\s*:/i, /developer\s*:/i, /do not reveal/i, /jailbreak/i];

export function classifyContent(text: string): ContentRisk {
  const malicious = MALICIOUS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  if (malicious.length) return Object.freeze({ schema_version: "1.0", classification: "malicious", signals: Object.freeze(malicious), safe_boundary: "untrusted_source" });
  const suspicious = SUSPICIOUS.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
  return Object.freeze({ schema_version: "1.0", classification: suspicious.length ? "suspicious" : "clean", signals: Object.freeze(suspicious), safe_boundary: "untrusted_source" });
}

/** Source text is data, never instructions. Consumers must place it in an untrusted-data channel. */
export function safeExcerpt(text: string, maxCharacters = 800): Readonly<{ boundary: "untrusted_source"; text: string; risk: ContentRisk }> {
  const normalized = text.replaceAll("\u0000", "").slice(0, maxCharacters);
  return Object.freeze({ boundary: "untrusted_source", text: normalized, risk: classifyContent(normalized) });
}
