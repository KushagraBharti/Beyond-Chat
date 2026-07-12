export const sessionInvalidEvent = "beyond:session-invalid";
const csrfCookieName = import.meta.env.VITE_WORKOS_CSRF_COOKIE_NAME || "beyond_csrf";

export type OrganizationRole = "owner" | "admin" | "builder" | "member" | "viewer";

export interface WorkOSSession {
  profileId: string;
  email: string | null;
  organizationId: string;
  workosOrganizationId: string;
  role: OrganizationRole;
  /** Server-computed permission list for the selected organization. */
  permissions?: string[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function cookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${encodeURIComponent(name)}=`;
  const part = document.cookie.split(";").map((value) => value.trim()).find((value) => value.startsWith(prefix));
  return part ? decodeURIComponent(part.slice(prefix.length)) : null;
}

async function errorFrom(response: Response): Promise<ApiError> {
  const payload = await response.clone().json().catch(() => null) as { detail?: unknown; error?: unknown } | null;
  const detail = payload?.detail ?? payload?.error ?? response.statusText;
  return new ApiError(typeof detail === "string" && detail ? detail : "Request failed.", response.status);
}

export async function protectedFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (!["GET", "HEAD", "OPTIONS"].includes(method)) {
    let csrf: string | null = null;
    const csrfResponse = await fetch(`/api/auth/csrf?nonce=${Date.now()}`, {
      credentials: "same-origin",
      cache: "no-store",
    });
    if (csrfResponse.ok) {
      const payload = await csrfResponse.json() as { token?: unknown };
      csrf = typeof payload.token === "string" ? payload.token : null;
    }
    csrf ??= cookieValue(csrfCookieName);
    if (csrf) headers.set("X-CSRF-Token", csrf);
  }

  const response = await fetch(path, { ...init, headers, credentials: "same-origin" });
  if (response.status === 401 && path !== "/api/auth/session") {
    window.dispatchEvent(new CustomEvent(sessionInvalidEvent));
  }
  return response;
}

export async function sessionRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await protectedFetch(path, init);
  if (!response.ok) throw await errorFrom(response);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getAuthSession() {
  return sessionRequest<WorkOSSession>("/api/auth/session");
}

export function workOSLoginUrl(options: {
  returnTo?: string;
  screenHint?: "sign-in" | "sign-up";
  invitationToken?: string;
  organizationId?: string;
} = {}) {
  const params = new URLSearchParams();
  if (options.returnTo) params.set("returnTo", options.returnTo);
  if (options.screenHint) params.set("screenHint", options.screenHint);
  if (options.invitationToken) params.set("invitationToken", options.invitationToken);
  if (options.organizationId) params.set("organizationId", options.organizationId);
  const query = params.toString();
  return `/api/auth/login${query ? `?${query}` : ""}`;
}

export async function logoutSession(): Promise<void> {
  const response = await protectedFetch("/api/auth/logout", { method: "POST", redirect: "manual" });
  if (response.type !== "opaqueredirect" && !response.ok && response.status !== 303) throw await errorFrom(response);
  window.dispatchEvent(new CustomEvent(sessionInvalidEvent));
}
