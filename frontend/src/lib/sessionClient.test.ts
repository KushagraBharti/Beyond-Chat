import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { protectedFetch, sessionInvalidEvent, sessionRequest, workOSLoginUrl } from "./sessionClient";

describe("WorkOS session client", () => {
  beforeEach(() => {
    document.cookie = "beyond_csrf=csrf-token; path=/";
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.cookie = "beyond_csrf=; Max-Age=0; path=/";
  });

  it("sends same-origin cookies and double-submit CSRF on mutations", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);
    await sessionRequest("/api/organizations/switch", { method: "POST", body: JSON.stringify({ organizationId: "org_2" }) });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("same-origin");
    expect(new Headers(init.headers).get("X-CSRF-Token")).toBe("csrf-token");
  });

  it("invalidates local auth state after a protected 401", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 401 })));
    const listener = vi.fn();
    window.addEventListener(sessionInvalidEvent, listener);
    await protectedFetch("/api/organizations");
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener(sessionInvalidEvent, listener);
  });

  it("preserves hosted sign-up, invitation, and safe return parameters", () => {
    expect(workOSLoginUrl({ returnTo: "/admin", screenHint: "sign-up", invitationToken: "invite_1" }))
      .toBe("/api/auth/login?returnTo=%2Fadmin&screenHint=sign-up&invitationToken=invite_1");
  });
});
