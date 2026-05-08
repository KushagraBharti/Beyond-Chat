import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  createCheckoutSession,
  createPortalSession,
  getBillingStatus,
  getCachedProviderStatuses,
  getProviderStatuses,
  startGoogleCalendarConnect,
  type BillingStatus,
  type ProviderRecord,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  MotionCard,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TextInput,
} from "../../components/protectedUi";
import "./SettingsPage.css";

const providerIcons: Record<string, ReactNode> = {
  googleCalendar: <CalendarIcon />,
  supabase: <DatabaseIcon />,
  supabaseStorage: <ArchiveIcon />,
  openrouter: <SparkIcon />,
  openrouterImages: <ImageIcon />,
  exa: <SearchIcon />,
  dexter: <FinanceIcon />,
  financialDatasets: <FinanceIcon />,
  notion: <DocumentIcon />,
  googleDrive: <ArchiveIcon />,
  slack: <ChatIcon />,
};

function CalendarIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v4" />
      <path d="M16 3.5v4" />
      <path d="M3.5 10h17" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
      <path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6" />
    </svg>
  );
}

function ArchiveIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="5" width="16" height="4" rx="1.5" />
      <path d="M5.5 9.5V18a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V9.5" />
      <path d="M10 13.5h4" />
    </svg>
  );
}

function SparkIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
      <path d="m19 15 .8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8Z" />
    </svg>
  );
}

function ImageIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
      <circle cx="9" cy="10" r="1.4" />
      <path d="m20.5 16.5-5.4-5.4L7 19.5" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="m16 16 4 4" />
    </svg>
  );
}

function FinanceIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 18 10 12.5l3.2 3.2L19 9.5" />
      <path d="M19 14V9.5h-4.5" />
    </svg>
  );
}

function DocumentIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M7 3.5h7.5L20 9v9.5a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-13a2 2 0 0 1 2-2Z" />
      <path d="M14.5 3.5V9H20" />
      <path d="M8.5 13h7" />
      <path d="M8.5 16.5h5" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.5 7.5A3.5 3.5 0 0 1 8 4h8a3.5 3.5 0 0 1 3.5 3.5v4A3.5 3.5 0 0 1 16 15h-5.5L6 18v-3H8a3.5 3.5 0 0 1-3.5-3.5Z" />
      <path d="M8 8.75h8" />
      <path d="M8 11.75h5" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5 19 6v5.5c0 4.2-2.8 7.7-7 9-4.2-1.3-7-4.8-7-9V6Z" />
      <path d="m9.5 12 1.7 1.7 3.5-4" />
    </svg>
  );
}

function statusLabel(status: ProviderRecord["status"]) {
  return status.replace("_", " ");
}

export default function SettingsPage() {
  const { user, updateProfileName } = useAuth();
  const [providers, setProviders] = useState<Record<string, ProviderRecord>>(() => getCachedProviderStatuses() ?? {});
  const hasCachedProvidersRef = useRef(Object.keys(providers).length > 0);
  const [status, setStatus] = useState("Ready");
  const [billing, setBilling] = useState<BillingStatus | null>(null);
  const [billingFetching, setBillingFetching] = useState(true);
  const [billingLoading, setBillingLoading] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [nameStatus, setNameStatus] = useState("Saved");
  const billingActionDisabled =
    billingLoading ||
    billingFetching ||
    !billing ||
    (billing?.plan === "pro" ? billing.portal_configured === false : billing?.checkout_configured === false);
  const billingSetupMessage =
    billing?.billing_storage === "unavailable"
      ? "Billing storage is not configured yet; the account remains on the free plan."
      : billing?.plan === "pro" && billing.portal_configured === false
        ? "Stripe portal is not configured for this account."
        : billing?.plan !== "pro" && billing?.checkout_configured === false
          ? "Stripe checkout is not configured yet."
          : null;

  const displayName = useMemo(() => {
    const metadata = user?.user_metadata;
    if (metadata && typeof metadata.first_name === "string" && metadata.first_name.trim()) {
      return metadata.first_name.trim();
    }
    if (metadata && typeof metadata.name === "string" && metadata.name.trim()) {
      return metadata.name.trim();
    }
    const localPart = user?.email?.split("@")[0]?.trim();
    return localPart || "";
  }, [user]);

  useEffect(() => {
    setNameDraft(displayName);
  }, [displayName]);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const providersResponse = await getProviderStatuses();
        if (active) {
          setProviders(providersResponse.providers);
        }
      } catch (err) {
        if (active && !hasCachedProvidersRef.current) {
          setStatus(err instanceof Error ? err.message : "Failed to load settings.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!nameDraft.trim() || nameDraft.trim() === displayName) {
      setNameStatus("Saved");
      return;
    }

    setNameStatus("Saving...");
    const timeoutId = window.setTimeout(async () => {
      try {
        await updateProfileName(nameDraft);
        setNameStatus("Saved");
      } catch (err) {
        setNameStatus(err instanceof Error ? err.message : "Failed to save name.");
      }
    }, 350);

    return () => window.clearTimeout(timeoutId);
  }, [displayName, nameDraft, updateProfileName]);

  useEffect(() => {
    let active = true;
    setBillingFetching(true);
    void getBillingStatus()
      .then((data) => {
        if (active) setBilling(data);
      })
      .catch((err) => {
        if (active) setStatus(err instanceof Error ? err.message : "Failed to load billing.");
      })
      .finally(() => {
        if (active) setBillingFetching(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const handleBillingAction = async () => {
    setBillingLoading(true);
    try {
      if (billing?.plan === "pro") {
        const { portalUrl } = await createPortalSession();
        window.location.href = portalUrl;
      } else {
        const { checkoutUrl } = await createCheckoutSession();
        window.location.href = checkoutUrl;
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Billing action failed.");
    } finally {
      setBillingLoading(false);
    }
  };

  const handleGoogleConnect = async () => {
    try {
      const response = await startGoogleCalendarConnect();
      if (response.url) {
        window.open(response.url, "_blank", "noopener,noreferrer");
        setStatus("Opened Google OAuth flow in a new tab.");
      } else {
        setStatus(`Google Calendar is currently ${response.status}.`);
      }
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Connect failed.");
    }
  };

  const providerEntries = Object.entries(providers);
  const connectedProviders = providerEntries.filter(([, provider]) => provider.status === "connected").length;
  const attentionProviders = providerEntries.filter(([, provider]) => provider.status !== "connected").length;
  const planLabel = billingFetching ? "Loading" : billing?.plan ?? "free";
  const requestLimit = billing?.limits.requests ?? null;
  const requestUsagePercent = requestLimit ? Math.min(100, (billing.usage.requests / requestLimit) * 100) : 100;
  const profileInitial = (displayName || user?.email || "U").slice(0, 1).toUpperCase();

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div className="settings-hero-copy">
          <div className="settings-kicker">Workspace settings</div>
          <h1>Settings</h1>
          <p>
            A quiet control panel for account identity, billing state, and provider readiness across every studio.
          </p>
        </div>

        <div className="settings-hero-panel" aria-label="Settings summary">
          <div className="settings-mini-stat">
            <span>Plan</span>
            <strong>{planLabel}</strong>
          </div>
          <div className="settings-mini-stat">
            <span>Providers live</span>
            <strong>{connectedProviders}/{providerEntries.length || "-"}</strong>
          </div>
          <div className="settings-mini-stat">
            <span>Needs attention</span>
            <strong>{attentionProviders}</strong>
          </div>
        </div>
      </section>

      <div className="settings-layout">
        <div className="settings-main-column">
          <MotionCard className="settings-card settings-account-card">
            <div className="settings-card-head">
              <div>
                <span>Account</span>
                <h2>Identity</h2>
                <p>Keep your profile recognizable throughout the workspace.</p>
              </div>
              <div className="settings-avatar" aria-hidden="true">{profileInitial}</div>
            </div>

            <div className="settings-profile-panel">
              <div className="settings-input-block">
                <label htmlFor="settings-display-name">Display name</label>
                <TextInput
                  id="settings-display-name"
                  value={nameDraft}
                  onChange={(event) => setNameDraft(event.target.value)}
                  placeholder="Your name"
                />
                <span className={`settings-save-state ${nameStatus === "Saved" ? "is-saved" : ""}`}>{nameStatus}</span>
              </div>
              <div className="settings-profile-facts">
                <div>
                  <span>Email</span>
                  <strong>{user?.email ?? "Authenticated user"}</strong>
                </div>
                <div>
                  <span>Auth mode</span>
                  <strong>Supabase session</strong>
                </div>
              </div>
            </div>

            <div className="settings-auth-strip">
              <span className="settings-icon-bubble"><ShieldIcon /></span>
              <div>
                <strong>Protected session</strong>
                <p>Authenticated with Supabase and scoped to this workspace.</p>
              </div>
              <StatusBadge status="connected" label="active" />
            </div>
          </MotionCard>

          <MotionCard className="settings-card settings-providers-card">
            <div className="settings-card-head">
              <div>
                <span>Provider readiness</span>
                <h2>Provider status</h2>
                <p>Service health and configuration state for studio-backed features.</p>
              </div>
              <div className="settings-provider-count">
                <strong>{connectedProviders}</strong>
                <span>live</span>
              </div>
            </div>

            {providerEntries.length ? (
              <div className="settings-provider-grid">
                {providerEntries.map(([key, provider]) => (
                  <div key={key} className={`settings-provider-tile status-tone-${provider.status}`}>
                    <div className="settings-provider-icon">{providerIcons[key] ?? <SparkIcon />}</div>
                    <div className="settings-provider-copy">
                      <div className="settings-provider-line">
                        <strong>{provider.label}</strong>
                        <span>{statusLabel(provider.status)}</span>
                      </div>
                      <p>{provider.details}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="settings-empty-panel">
                Provider statuses are loading. If the backend is unavailable, cached statuses appear here when available.
              </div>
            )}
          </MotionCard>
        </div>

        <aside className="settings-side-column">
          <MotionCard className="settings-card settings-billing-card">
            <div className="settings-card-head">
              <div>
                <span>Plan &amp; billing</span>
                <h2>Plan</h2>
                <p>Subscription state, monthly usage, and Stripe actions.</p>
              </div>
              {!billingFetching ? (
                <StatusBadge
                  status={billing?.billing_storage === "unavailable" ? "not_configured" : billing?.plan === "pro" ? "connected" : "disconnected"}
                />
              ) : null}
            </div>

            <div className="settings-plan-plate">
              <span>Current plan</span>
              <strong>{billingFetching ? "Loading..." : billing?.plan ?? "Free"}</strong>
            </div>

            {billing ? (
              <div className="settings-usage-block">
                <div className="settings-usage-top">
                  <span>Requests this month</span>
                  <strong>
                    {billing.usage.requests}{requestLimit !== null ? ` / ${requestLimit}` : ""}
                  </strong>
                </div>
                <div className="settings-meter" aria-hidden="true">
                  <span style={{ width: `${requestUsagePercent}%` }} />
                </div>
                <div className="settings-usage-bottom">
                  <span>${billing.usage.spend_usd.toFixed(4)} spent</span>
                  <span>
                    {billing.limits.spend_usd ? `$${billing.limits.spend_usd.toFixed(2)} limit` : "Spend tracked"}
                  </span>
                </div>
              </div>
            ) : null}

            {billingSetupMessage ? <div className="settings-note">{billingSetupMessage}</div> : null}
            <PrimaryButton type="button" onClick={handleBillingAction} disabled={billingActionDisabled} className="settings-full-button">
              {billingLoading
                ? "Redirecting..."
                : billing?.plan === "pro"
                  ? "Manage subscription"
                  : billing?.checkout_configured === false
                    ? "Upgrade unavailable"
                    : "Upgrade to Pro - $10/mo"}
            </PrimaryButton>
          </MotionCard>

          <MotionCard className="settings-card settings-actions-card">
            <div className="settings-card-head">
              <div>
                <span>Connections</span>
                <h2>Integrations</h2>
                <p>External context links and preference surfaces.</p>
              </div>
            </div>

            <div className="settings-action-stack">
              <PrimaryButton type="button" onClick={handleGoogleConnect} className="settings-full-button">
                Connect Google Calendar
              </PrimaryButton>
              <SecondaryButton type="button" className="settings-full-button" onClick={() => setStatus("Model preferences are not wired yet.")}>
                Model Preferences
              </SecondaryButton>
              <SecondaryButton type="button" className="settings-full-button" onClick={() => setStatus("Profile metadata is managed through the account panel.")}>
                Profile Metadata
              </SecondaryButton>
            </div>

            <div className="settings-status-console">
              <span className="settings-icon-bubble"><ProfileIcon /></span>
              <p>{status}</p>
            </div>
          </MotionCard>
        </aside>
      </div>
    </div>
  );
}
