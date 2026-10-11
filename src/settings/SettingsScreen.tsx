import { useState, type FormEvent } from "react";
import { ActionIcon, Loader } from "@mantine/core";
import { notify } from "@/shared/notify";
import { ArrowLeft, ArrowRight, ArrowUpRight, LockKeyhole, LogOut } from "lucide-react";
import { OrbitMark } from "@/orbit/components/OrbitMark";
import { getStatus, OrbitApiError } from "@/orbit/orbitApiClient";
import { STUDIO_DEVELOPERS_URL } from "@/shared/links";
import { useCredentials } from "./useCredentials";
import { StepTile } from "./StepTile";
import { CredentialField } from "./CredentialField";
import classes from "./settingsScreen.module.css";

export function SettingsScreen({
  initialWorkspaceId,
  onConnected,
  onCancel,
}: {
  initialWorkspaceId?: string;
  onConnected?: () => void;
  onCancel?: () => void;
}) {
  const { save, clear } = useCredentials();
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId ?? "");
  const [apiKey, setApiKey] = useState("");
  const [connecting, setConnecting] = useState(false);

  const connected = Boolean(onCancel);
  const ready = workspaceId.trim().length > 0 && apiKey.trim().length > 0;

  async function connect(e: FormEvent) {
    e.preventDefault();
    if (!ready || connecting) return;

    setConnecting(true);
    try {
      await getStatus(workspaceId.trim(), apiKey.trim());
      await save(workspaceId.trim(), apiKey.trim());
      onConnected?.();
    } catch (err) {
      const wrong = err instanceof OrbitApiError && (err.status === 401 || err.status === 404);
      notify.error(
        wrong
          ? "Workspace ID or API key is incorrect."
          : "Couldn't reach Orbit. Check your connection and try again.",
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <div className={classes.wrap}>
      {connected && (
        <div className={classes.topBar}>
          <ActionIcon variant="subtle" color="gray" size={30} onClick={onCancel} aria-label="Back">
            <ArrowLeft size={16} />
          </ActionIcon>
          <span className={classes.topTitle}>Connection</span>
        </div>
      )}

      <div className={classes.content}>
        <header className={classes.hero}>
          <OrbitMark size={52} />
          <p className={classes.eyebrow}>Orbit AI for Chrome</p>
          <h1 className={classes.title}>
            {connected ? "Your connection." : "Connect your workspace."}
          </h1>
          <p className={classes.lead}>
            {connected
              ? "Switch the workspace or key this panel uses."
              : "Ask Orbit from any tab. Setup takes under a minute."}
          </p>
        </header>

        {!connected && (
          <StepTile
            step={1}
            title="Get your API key"
            body="Open the Developers page in Quantalog Studio, create an API key and copy your workspace ID."
          >
            <a
              href={STUDIO_DEVELOPERS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={classes.secondary}
            >
              Open Quantalog Studio
              <ArrowUpRight size={16} />
            </a>
          </StepTile>
        )}

        <StepTile
          step={connected ? undefined : 2}
          title={connected ? "Credentials" : "Paste and connect"}
        >
          <form onSubmit={connect} noValidate className={classes.form}>
            <CredentialField
              label="Workspace ID"
              value={workspaceId}
              onChange={setWorkspaceId}
              placeholder="Paste your workspace ID"
            />
            <CredentialField
              label="API key"
              value={apiKey}
              onChange={setApiKey}
              placeholder="Paste your API key"
              secret
            />
            <button
              type="submit"
              className={classes.primary}
              disabled={!ready || connecting}
              data-loading={connecting || undefined}
            >
              {connecting ? (
                <Loader size={18} color="currentColor" />
              ) : (
                <>
                  {connected ? "Save changes" : "Connect"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </StepTile>

        {connected && (
          <button type="button" className={classes.disconnect} onClick={() => clear()}>
            <LogOut size={15} />
            Disconnect
          </button>
        )}

        <p className={classes.note}>
          <LockKeyhole size={12} />
          Stored only in this browser. Sent only to Orbit.
        </p>
      </div>
    </div>
  );
}
