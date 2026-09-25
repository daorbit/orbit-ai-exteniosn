import type { OrbitMessage } from "@/shared/types";

const DRAFT_KEY = "orbitDraft";

export type OrbitDraft = {
  messages: OrbitMessage[];
  conversationId: string | null;
  input: string;
};

export async function readOrbitDraft(): Promise<OrbitDraft | null> {
  const stored = await chrome.storage.session.get(DRAFT_KEY);
  const draft = stored[DRAFT_KEY];
  if (!draft || !Array.isArray(draft.messages)) return null;
  return {
    messages: draft.messages,
    conversationId: draft.conversationId ?? null,
    input: typeof draft.input === "string" ? draft.input : "",
  };
}

export async function writeOrbitDraft(draft: OrbitDraft): Promise<void> {
  await chrome.storage.session.set({ [DRAFT_KEY]: draft });
}

export async function clearOrbitDraft(): Promise<void> {
  await chrome.storage.session.remove(DRAFT_KEY);
}
