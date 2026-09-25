import { useState } from "react";
import { useCredentials } from "@/settings/useCredentials";
import { SettingsScreen } from "@/settings/SettingsScreen";
import { OrbitPanel } from "@/orbit/OrbitPanel";

export function App() {
  const { loaded, isConnected, credentials } = useCredentials();
  const [forceSettings, setForceSettings] = useState(false);

  if (!loaded) return null;

  if (!isConnected || forceSettings) {
    return (
      <SettingsScreen
        initialWorkspaceId={credentials?.workspaceId}
        onConnected={() => setForceSettings(false)}
        onCancel={isConnected ? () => setForceSettings(false) : undefined}
      />
    );
  }

  return <OrbitPanel onOpenSettings={() => setForceSettings(true)} />;
}
