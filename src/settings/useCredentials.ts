import { useCallback, useEffect, useState } from "react";

export type Credentials = {
  workspaceId: string;
  apiKey: string;
};

const STORAGE_KEYS = ["workspaceId", "apiKey"] as const;

async function readStored(): Promise<Credentials | null> {
  const stored = await chrome.storage.local.get(STORAGE_KEYS);
  const workspaceId = typeof stored.workspaceId === "string" ? stored.workspaceId : "";
  const apiKey = typeof stored.apiKey === "string" ? stored.apiKey : "";
  if (!workspaceId || !apiKey) return null;
  return { workspaceId, apiKey };
}

export function useCredentials() {
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    readStored().then((c) => {
      if (!cancelled) {
        setCredentials(c);
        setLoaded(true);
      }
    });

    const onChanged = (
      changes: { [key: string]: chrome.storage.StorageChange },
      areaName: chrome.storage.AreaName,
    ) => {
      if (areaName !== "local") return;
      if (!("workspaceId" in changes) && !("apiKey" in changes)) return;
      readStored().then((c) => {
        if (!cancelled) setCredentials(c);
      });
    };

    chrome.storage.onChanged.addListener(onChanged);
    return () => {
      cancelled = true;
      chrome.storage.onChanged.removeListener(onChanged);
    };
  }, []);

  const save = useCallback(async (workspaceId: string, apiKey: string) => {
    await chrome.storage.local.set({ workspaceId, apiKey });
    setCredentials({ workspaceId, apiKey });
  }, []);

  const clear = useCallback(async () => {
    await chrome.storage.local.remove([...STORAGE_KEYS]);
    setCredentials(null);
  }, []);

  return {
    credentials,
    loaded,
    isConnected: credentials !== null,
    save,
    clear,
  };
}
