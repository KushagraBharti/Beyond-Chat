import { useEffect, useMemo, useState } from "react";
import {
  getCachedProviderStatuses,
  getProviderStatuses,
  getWorkspace,
  startGoogleCalendarConnect,
  type ProviderRecord,
} from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import {
  FieldLabel,
  MotionCard,
  PageSection,
  PrimaryButton,
  SecondaryButton,
  StatusBadge,
  TextInput,
} from "../../components/protectedUi";

export default function SettingsPage() {
  const { user, updateProfileName } = useAuth();
  const [workspaceName, setWorkspaceName] = useState("Beyond Chat");
  const [providers, setProviders] = useState<Record<string, ProviderRecord>>(() => getCachedProviderStatuses() ?? {});
  const [status, setStatus] = useState("Ready");
  const [nameDraft, setNameDraft] = useState("");
  const [nameStatus, setNameStatus] = useState("Saved");

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
        const workspaceResponse = await getWorkspace();
        if (active) {
          setWorkspaceName(workspaceResponse.workspace.name);
        }
      } catch (err) {
        if (active) {
          setStatus(err instanceof Error ? err.message : "Failed to load settings.");
        }
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    void (async () => {
      try {
        const providersResponse = await getProviderStatuses();
        if (active) {
          setProviders(providersResponse.providers);
        }
      } catch (err) {
        if (active && !Object.keys(providers).length) {
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

  return (
    <div className="page-wrap">
      <PageSection
        eyebrow="Settings"
        title="Workspace and provider configuration"
        description="A setup surface for workspace info, connected providers, auth mode, and future model preferences."
      />

      <div className="dashboard-grid dashboard-grid-three">
        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Workspace</h3>
              <p>Current protected shell identity and account state.</p>
            </div>
          </div>
          <div className="stack-sm">
            <div className="list-row">
              <div>
                <strong>Name</strong>
                <div className="mt-3 max-w-sm">
                  <FieldLabel>Display name</FieldLabel>
                  <TextInput
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    placeholder="Your name"
                  />
                  <div className="meta-placeholder mt-2">{nameStatus}</div>
                </div>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>Workspace</strong>
                <p>{workspaceName}</p>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>User</strong>
                <p>{user?.email ?? "Authenticated user"}</p>
              </div>
            </div>
            <div className="list-row">
              <div>
                <strong>Auth mode</strong>
                <p>Supabase session</p>
              </div>
              <StatusBadge status="connected" />
            </div>
          </div>
        </MotionCard>

        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Providers</h3>
              <p>Every provider-backed page consumes the same normalized status shape.</p>
            </div>
          </div>
          <div className="stack-sm">
            {Object.entries(providers).map(([key, provider]) => (
              <div key={key} className="list-row">
                <div>
                  <strong>{provider.label}</strong>
                  <p>{provider.details}</p>
                </div>
                <StatusBadge status={provider.status} />
              </div>
            ))}
          </div>
        </MotionCard>

        <MotionCard>
          <div className="context-builder-head">
            <div>
              <h3>Connections</h3>
              <p>Manual setup can happen later without blocking the implemented UX.</p>
            </div>
          </div>
          <div className="stack-sm">
            <PrimaryButton type="button" onClick={handleGoogleConnect}>
              Connect Google Calendar
            </PrimaryButton>
            <SecondaryButton type="button">Model Preferences</SecondaryButton>
            <SecondaryButton type="button">Workspace Metadata</SecondaryButton>
          </div>
          <div className="meta-placeholder">{status}</div>
        </MotionCard>
      </div>
    </div>
  );
}
