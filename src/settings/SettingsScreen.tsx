import { useState } from "react";
import { ActionIcon, Button, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { ArrowLeft, KeyRound, LockKeyhole, LogOut } from "lucide-react";
import { OrbitMark } from "@/orbit/components/OrbitMark";
import { getStatus, OrbitApiError } from "@/orbit/orbitApiClient";
import { useCredentials } from "./useCredentials";
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
  const [error, setError] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  async function connect() {
    const wid = workspaceId.trim();
    const key = apiKey.trim();
    if (!wid || !key) {
      setError("Enter both a workspace ID and an API key.");
      return;
    }

    setConnecting(true);
    setError(null);
    try {
      await getStatus(wid, key);
      await save(wid, key);
      onConnected?.();
    } catch (e) {
      if (e instanceof OrbitApiError && (e.status === 401 || e.status === 404)) {
        setError("Workspace ID or API key is incorrect — check them in your Orbit AI Developers settings.");
      } else {
        setError("Could not reach Orbit AI. Check your connection and try again.");
      }
    } finally {
      setConnecting(false);
    }
  }

  const connected = Boolean(onCancel);

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
        <div className={classes.head}>
          <div className={classes.mark}>
            <OrbitMark size={44} />
          </div>
          <Title order={2} className={classes.title}>
            {connected ? "Your Orbit connection" : "Connect Orbit"}
          </Title>
          <Text className={classes.sub}>
            {connected
              ? "Change the workspace or key this panel uses, or disconnect it."
              : "Link this panel to your workspace to start asking questions."}
          </Text>
        </div>

        {!connected && (
          <ol className={classes.steps}>
            <li>
              <span className={classes.stepNum}>1</span>
              <span>
                Open <b>Settings → Developers</b> in the Orbit AI web app.
              </span>
            </li>
            <li>
              <span className={classes.stepNum}>2</span>
              <span>Create an API key for your workspace.</span>
            </li>
            <li>
              <span className={classes.stepNum}>3</span>
              <span>Paste the workspace ID and key below.</span>
            </li>
          </ol>
        )}

        <Stack gap="sm">
          <TextInput
            label="Workspace ID"
            placeholder="wksp_..."
            value={workspaceId}
            onChange={(e) => setWorkspaceId(e.currentTarget.value)}
            classNames={{ input: classes.input }}
          />
          <PasswordInput
            label="API key"
            placeholder="sk_live_..."
            value={apiKey}
            onChange={(e) => setApiKey(e.currentTarget.value)}
            leftSection={<KeyRound size={14} />}
            classNames={{ input: classes.input }}
          />

          {error && (
            <Text size="xs" c="red.6" lh={1.5}>
              {error}
            </Text>
          )}

          <Button onClick={connect} loading={connecting} fullWidth size="md" mt={4} className={classes.cta}>
            {connected ? "Save changes" : "Connect"}
          </Button>

          {connected && (
            <Button
              onClick={() => clear()}
              variant="subtle"
              color="red"
              fullWidth
              leftSection={<LogOut size={14} />}
            >
              Disconnect
            </Button>
          )}
        </Stack>

        <div className={classes.note}>
          <LockKeyhole size={13} />
          <span>Your key is stored only in this browser and sent only to Orbit.</span>
        </div>
      </div>
    </div>
  );
}
