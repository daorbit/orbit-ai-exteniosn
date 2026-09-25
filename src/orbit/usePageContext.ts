import { useEffect, useState } from "react";

export type PageContext = {
  hostname: string;
  title: string;
  url: string;
} | null;

function readableHostname(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function usePageContext(): PageContext {
  const [context, setContext] = useState<PageContext>(null);

  useEffect(() => {
    let cancelled = false;

    async function read() {
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (cancelled) return;

        if (!tab?.url) {
          console.warn("[usePageContext] no active tab or tab.url", tab);
          setContext(null);
          return;
        }

        const hostname = readableHostname(tab.url);
        if (!hostname) {
          console.warn("[usePageContext] url not http(s), skipping:", tab.url);
          setContext(null);
          return;
        }

        setContext({ hostname, title: tab.title ?? hostname, url: tab.url });
      } catch (e) {
        console.error("[usePageContext] chrome.tabs.query failed:", e);
        if (!cancelled) setContext(null);
      }
    }

    void read();

    const onActivated = () => void read();
    const onUpdated = (_id: number, info: chrome.tabs.TabChangeInfo) => {
      if (info.url || info.status === "complete") void read();
    };

    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);

    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, []);

  return context;
}
