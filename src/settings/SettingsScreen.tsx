import { useState } from "react";
import { ActionIcon, Button, Group, PasswordInput, Stack, Text, TextInput, Title } from "@mantine/core";
import { ArrowLeft } from "lucide-react";
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

  return (
    <div className={classes.wrap}>
      <Group gap={8} wrap="nowrap" className={classes.header}>
        {onCancel && (
          <ActionIcon variant="subtle" color="gray" onClick={onCancel} aria-label="Back">
            <ArrowLeft size={18} />
          </ActionIcon>
        )}
        <OrbitMark size={32} />
        <Title order={3} size="1.1em">Connect Orbit AI</Title>
      </Group>

      <Stack gap="sm">
        <TextInput
          label="Workspace ID"
          placeholder="wksp_..."
          value={workspaceId}
          onChange={(e) => setWorkspaceId(e.currentTarget.value)}
        />
        <PasswordInput
          label="API key"
          placeholder="sk_live_..."
          value={apiKey}
          onChange={(e) => setApiKey(e.currentTarget.value)}
        />

        {error && (
          <Text size="sm" c="red.6">
            {error}
          </Text>
        )}

        <Button onClick={connect} loading={connecting} fullWidth>
          Save & Connect
        </Button>

        {onCancel && (
          <Button onClick={() => clear()} variant="subtle" color="red" fullWidth>
            Disconnect
          </Button>
        )}

        <Text size="xs" c="dimmed">
          Don't have a key? Generate one from Settings → Developers in the Orbit AI web app, under your workspace.
        </Text>
      </Stack>
    </div>
  );
}
