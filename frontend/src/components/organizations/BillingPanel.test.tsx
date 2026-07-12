import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { authState, billing } = vi.hoisted(() => ({
  authState: { session: null as unknown, refreshSession: vi.fn() },
  billing: {
    getBillingStatus: vi.fn(),
    startCheckout: vi.fn(),
    openPortal: vi.fn(),
  },
}));

vi.mock("../../context/AuthContext", () => ({ useAuth: () => authState }));
vi.mock("../../features/billing/v2", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../features/billing/v2")>();
  return { ...original, ...billing };
});

import { BillingPanel } from "./BillingPanel";

function status(overrides: Record<string, unknown> = {}) {
  return {
    organization_id: "org-a",
    subscription_status: "none",
    entitlement_state: "disabled",
    seat_quantity: 0,
    billable_members: 0,
    checkout_enabled: false,
    portal_enabled: false,
    externally_verified: false,
    ...overrides,
  };
}

beforeEach(() => {
  Object.values(billing).forEach((mock) => mock.mockReset());
  authState.session = {
    profileId: "p", email: "owner@example.com", organizationId: "org-a",
    workosOrganizationId: "org_w", role: "owner",
    permissions: ["manage_organization_settings", "view_organization"],
  };
  billing.getBillingStatus.mockResolvedValue(status());
});

describe("BillingPanel", () => {
  it("shows the truthful disabled state with an inert checkout control", async () => {
    render(<BillingPanel />);
    expect(await screen.findByText(/No verified subscription exists/i)).toBeInTheDocument();
    const checkout = screen.getByRole("button", { name: /checkout unavailable/i });
    expect(checkout).toBeDisabled();
    expect(screen.queryByRole("button", { name: /billing portal/i })).not.toBeInTheDocument();
  });

  it("starts checkout only when the server enables it", async () => {
    billing.getBillingStatus.mockResolvedValue(status({ checkout_enabled: true }));
    billing.startCheckout.mockResolvedValue({ url: "https://checkout.stripe.example/s" });
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, assign });
    render(<BillingPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /start subscription checkout/i }));
    await waitFor(() => expect(billing.startCheckout).toHaveBeenCalled());
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://checkout.stripe.example/s"));
    vi.unstubAllGlobals();
  });

  it("shows verified paid state with seats and a portal control", async () => {
    billing.getBillingStatus.mockResolvedValue(status({
      entitlement_state: "enabled", externally_verified: true,
      seat_quantity: 12, portal_enabled: true, subscription_status: "active",
    }));
    render(<BillingPanel />);
    expect(await screen.findByText(/subscription is active and server-verified/i)).toBeInTheDocument();
    expect(screen.getByText(/12 paid seats/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /open billing portal/i })).toBeInTheDocument();
  });

  it("denies management controls without the settings permission", async () => {
    authState.session = { ...(authState.session as object), role: "member", permissions: ["view_organization"] };
    billing.getBillingStatus.mockResolvedValue(status({ checkout_enabled: true }));
    render(<BillingPanel />);
    expect(await screen.findByText(/requires an administrative role/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /checkout/i })).not.toBeInTheDocument();
  });

  it("surfaces a not-activated message when the backend fails closed", async () => {
    const { ApiError } = await import("../../lib/sessionClient");
    billing.getBillingStatus.mockResolvedValue(status({ checkout_enabled: true }));
    billing.startCheckout.mockRejectedValue(new ApiError("Paid checkout is not enabled.", 503));
    render(<BillingPanel />);
    fireEvent.click(await screen.findByRole("button", { name: /start subscription checkout/i }));
    expect(await screen.findByText(/not activated for this deployment/i)).toBeInTheDocument();
  });
});
