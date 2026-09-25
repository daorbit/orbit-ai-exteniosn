import { useCallback, useEffect, useRef, useState } from "react";
import * as api from "./orbitApiClient";
import { useCredentials } from "@/settings/useCredentials";
import { clearOrbitDraft, readOrbitDraft, writeOrbitDraft } from "./orbitDraftStorage";
import type {
  OrbitConversationSummary,
  OrbitMessage,
  PendingDocument,
} from "@/shared/types";

const HISTORY_WINDOW = 30;

let counter = 0;
const nextId = () => `orbit-${Date.now()}-${counter++}`;

function errMessage(e: unknown, fallback: string): string {
  if (e instanceof api.OrbitApiError) return e.message;
  if (e instanceof Error) return e.message;
  return fallback;
}

export function useOrbitChat() {
  const { credentials } = useCredentials();
  const workspaceId = credentials?.workspaceId ?? "";
  const apiKey = credentials?.apiKey ?? "";

  const [messages, setMessages] = useState<OrbitMessage[]>([]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [generatingImage, setGeneratingImage] = useState(false);

  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null);
  const [imageMode, setImageMode] = useState(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const conversationRef = useRef<string | null>(null);
  const historyRef = useRef<OrbitMessage[]>([]);

  const draftRestored = useRef(false);
  useEffect(() => {
    readOrbitDraft()
      .then((draft) => {
        draftRestored.current = true;
        if (!draft || !draft.messages.length) return;
        setMessages(draft.messages);
        historyRef.current = draft.messages;
        setInput(draft.input);
        setConversationId(draft.conversationId);
        conversationRef.current = draft.conversationId;
      })
      .catch(() => {
        draftRestored.current = true;
      });
  }, []);

  useEffect(() => {
    if (!draftRestored.current) return;
    if (!messages.length) {
      void clearOrbitDraft();
      return;
    }
    void writeOrbitDraft({ messages, conversationId, input });
  }, [messages, conversationId, input]);

  const [configured, setConfigured] = useState(true);
  const [plan, setPlan] = useState<import("@/shared/types").OrbitPlan | null>(null);
  const [models, setModels] = useState<import("@/shared/types").OrbitModel[]>([]);
  const [remaining, setRemaining] = useState<number | null>(null);

  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const selectedModelRef = useRef<string | null>(null);
  const setModel = useCallback((id: string | null) => {
    selectedModelRef.current = id;
    setSelectedModel(id);
  }, []);

  useEffect(() => {
    if (!workspaceId || !apiKey) return;
    let cancelled = false;
    api.getStatus(workspaceId, apiKey).then(
      (status) => {
        if (cancelled) return;
        setConfigured(status.configured);
        setPlan(status.plan);
        setModels(status.models);
      },
      () => {},
    );
    return () => {
      cancelled = true;
    };
  }, [workspaceId, apiKey]);

  const [conversationPages, setConversationPages] = useState<OrbitConversationSummary[]>([]);
  const [conversationsCursor, setConversationsCursor] = useState<string | null>(null);
  const [hasMoreConversations, setHasMoreConversations] = useState(true);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [loadingMoreConversations, setLoadingMoreConversations] = useState(false);
  const conversationsRequested = useRef(false);

  const loadFirstConversationsPage = useCallback(async () => {
    if (!workspaceId || !apiKey) return;
    setLoadingConversations(true);
    try {
      const page = await api.getConversations(workspaceId, apiKey);
      setConversationPages(page.conversations);
      setConversationsCursor(page.nextCursor);
      setHasMoreConversations(page.nextCursor != null);
    } catch {
    } finally {
      setLoadingConversations(false);
    }
  }, [workspaceId, apiKey]);

  useEffect(() => {
    setConversationPages([]);
    setConversationsCursor(null);
    setHasMoreConversations(true);
    conversationsRequested.current = false;
  }, [workspaceId]);

  const ensureConversationsLoaded = useCallback(() => {
    if (conversationsRequested.current || !workspaceId) return;
    conversationsRequested.current = true;
    void loadFirstConversationsPage();
  }, [loadFirstConversationsPage, workspaceId]);

  const loadMoreConversations = useCallback(async () => {
    if (!workspaceId || !apiKey || !hasMoreConversations || loadingMoreConversations || loadingConversations) return;
    setLoadingMoreConversations(true);
    try {
      const page = await api.getConversations(workspaceId, apiKey, conversationsCursor ?? undefined);
      setConversationPages((prev) => [...prev, ...page.conversations]);
      setConversationsCursor(page.nextCursor);
      setHasMoreConversations(page.nextCursor != null);
    } catch {
    } finally {
      setLoadingMoreConversations(false);
    }
  }, [workspaceId, apiKey, conversationsCursor, hasMoreConversations, loadingMoreConversations, loadingConversations]);

  const [loadingConversation, setLoadingConversation] = useState(false);

  const inFlight = useRef<AbortController | null>(null);
  const abandoned = useRef(false);

  const run = useCallback(
    async (opts: {
      question: string;
      image?: string;
      document?: PendingDocument;
      drawing: boolean;
      history: OrbitMessage[];
    }) => {
      if (!workspaceId || !apiKey) return;

      const history = opts.history
        .slice(-HISTORY_WINDOW)
        .filter((m) => !m.failed && !m.stopped)
        .map((m) => {
          let content = m.content;
          if (m.imageUrl) {
            const tag = m.role === "assistant" ? "[generated an image]" : "[attached an image]";
            content = `${tag} ${content}`;
          } else if (m.documentName) {
            content = `[attached ${m.documentName}] ${content}`;
          }
          return { role: m.role, content };
        });

      setGeneratingImage(opts.drawing);
      setThinking(true);
      abandoned.current = false;

      const controller = new AbortController();
      inFlight.current = controller;

      try {
        const answered = await api.ask(
          workspaceId,
          apiKey,
          {
            question: opts.question,
            history,
            image: opts.image,
            generateImage: opts.drawing,
            document: opts.document,
            conversationId: conversationRef.current ?? undefined,
            model: selectedModelRef.current ?? undefined,
          },
          controller.signal,
        );

        setRemaining(answered.remaining);
        if (answered.conversationId) {
          conversationRef.current = answered.conversationId;
          setConversationId(answered.conversationId);
          void loadFirstConversationsPage();
        }
        setMessages((prev) => {
          const next = [
            ...prev,
            {
              id: nextId(),
              role: "assistant" as const,
              content: answered.reply,
              imageUrl: answered.imageUrl,
              suggestions: answered.suggestions,
              dataDigest: answered.dataDigest,
              citations: answered.citations,
              modelLabel: answered.modelLabel,
            },
          ];
          historyRef.current = next;
          return next;
        });
      } catch (e) {
        if (abandoned.current) {
          setMessages((prev) => {
            const next = [
              ...prev,
              {
                id: nextId(),
                role: "assistant" as const,
                content: "Stopped.",
                stopped: true,
              },
            ];
            historyRef.current = next;
            return next;
          });
          return;
        }

        setMessages((prev) => {
          const next = [
            ...prev,
            {
              id: nextId(),
              role: "assistant" as const,
              content: errMessage(e, "Orbit could not answer that. Try again."),
              failed: true,
            },
          ];
          historyRef.current = next;
          return next;
        });
      } finally {
        inFlight.current = null;
        setThinking(false);
        setGeneratingImage(false);
      }
    },
    [workspaceId, apiKey, loadFirstConversationsPage],
  );

  const stop = useCallback(() => {
    abandoned.current = true;
    inFlight.current?.abort();
    inFlight.current = null;
  }, []);

  const send = useCallback(
    async (raw?: string) => {
      const question = (raw ?? input).trim();
      const image = pendingImage;
      const document = pendingDocument;

      if ((!question && !image && !document) || thinking || !workspaceId) return;

      const before = historyRef.current;
      const userTurn: OrbitMessage = {
        id: nextId(),
        role: "user",
        content: question,
        imageUrl: image ?? undefined,
        documentName: document?.name,
      };
      setMessages(() => {
        const next = [...before, userTurn];
        historyRef.current = next;
        return next;
      });
      setInput("");
      setPendingImage(null);
      setPendingDocument(null);
      const drawing = imageMode && !image && !document;
      setImageMode(false);

      await run({
        question,
        image: image ?? undefined,
        document: document ?? undefined,
        drawing,
        history: before,
      });
    },
    [run, input, pendingImage, pendingDocument, imageMode, thinking, workspaceId],
  );

  const regenerateLast = useCallback(async () => {
    const current = historyRef.current;
    const lastIndex = current.length - 1;
    const last = current[lastIndex];
    if (!last || last.role !== "assistant" || thinking) return;

    const userTurn = current[lastIndex - 1];
    if (!userTurn || userTurn.role !== "user") return;
    if (!userTurn.content && !userTurn.imageUrl && !userTurn.documentName) return;

    const withoutLast = current.slice(0, lastIndex);
    setMessages(withoutLast);
    historyRef.current = withoutLast;

    await run({
      question: userTurn.content,
      image: userTurn.imageUrl,
      drawing: last.stopped
        ? imageMode && !userTurn.imageUrl
        : Boolean(last.imageUrl) && !userTurn.imageUrl,
      history: withoutLast.slice(0, -1),
    });
  }, [run, thinking, imageMode]);

  const editAndResend = useCallback(
    async (messageId: string, text: string) => {
      const question = text.trim();
      if (!question || thinking) return;

      const current = historyRef.current;
      const at = current.findIndex((m) => m.id === messageId);
      if (at < 0 || current[at].role !== "user") return;

      const before = current.slice(0, at);
      const edited: OrbitMessage = { ...current[at], content: question };

      const next = [...before, edited];
      setMessages(next);
      historyRef.current = next;

      await run({
        question,
        image: edited.imageUrl,
        drawing: Boolean(current[at + 1]?.imageUrl) && !edited.imageUrl,
        history: before,
      });
    },
    [run, thinking],
  );

  const [olderMessagesCursor, setOlderMessagesCursor] = useState<number | null | undefined>(undefined);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);

  const reset = useCallback(() => {
    setMessages([]);
    setInput("");
    setPendingImage(null);
    setImageMode(false);
    historyRef.current = [];
    conversationRef.current = null;
    setConversationId(null);
    setOlderMessagesCursor(undefined);
  }, []);

  const toOrbitMessage = (m: {
    id: string;
    role: "user" | "assistant";
    content: string;
    imageUrl?: string;
    failed: boolean;
    suggestions: string[];
    dataDigest?: unknown;
    citations?: { url: string; title: string }[];
    createdAt: string;
    modelLabel?: string;
  }): OrbitMessage => ({
    id: m.id,
    role: m.role,
    content: m.content,
    imageUrl: m.imageUrl,
    failed: m.failed || undefined,
    suggestions: m.suggestions.length ? m.suggestions : undefined,
    dataDigest: m.dataDigest,
    citations: m.citations,
    digestAt: m.createdAt,
    modelLabel: m.modelLabel,
  });

  const openConversation = useCallback(
    async (id: string) => {
      if (!workspaceId || !apiKey) return;
      setLoadingConversation(true);
      try {
        const convo = await api.getConversation(workspaceId, apiKey, id);
        const restored = convo.messages.map(toOrbitMessage);
        setMessages(restored);
        historyRef.current = restored;
        conversationRef.current = convo.id;
        setConversationId(convo.id);
        setOlderMessagesCursor(convo.hasMore ? convo.nextBefore : null);
        setInput("");
        setPendingImage(null);
      } catch {
      } finally {
        setLoadingConversation(false);
      }
    },
    [workspaceId, apiKey],
  );

  const loadOlderMessages = useCallback(async () => {
    const id = conversationRef.current;
    if (!workspaceId || !apiKey || !id || !olderMessagesCursor || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const page = await api.getConversation(workspaceId, apiKey, id, olderMessagesCursor);
      const older = page.messages.map(toOrbitMessage);
      setMessages((prev) => {
        const next = [...older, ...prev];
        historyRef.current = next;
        return next;
      });
      setOlderMessagesCursor(page.hasMore ? page.nextBefore : null);
    } catch {
    } finally {
      setLoadingOlderMessages(false);
    }
  }, [workspaceId, apiKey, olderMessagesCursor, loadingOlderMessages]);

  const removeSaved = useCallback(
    async (id: string) => {
      if (!workspaceId || !apiKey) return;
      await api.deleteConversation(workspaceId, apiKey, id);
      setConversationPages((prev) => prev.filter((c) => c.id !== id));
      if (conversationRef.current === id) reset();
    },
    [workspaceId, apiKey, reset],
  );

  const bulkRemoveSaved = useCallback(
    async (ids: string[]) => {
      if (!workspaceId || !apiKey || !ids.length) return;
      await api.bulkDeleteConversations(workspaceId, apiKey, ids);
      const removed = new Set(ids);
      setConversationPages((prev) => prev.filter((c) => !removed.has(c.id)));
      if (conversationRef.current && removed.has(conversationRef.current)) reset();
    },
    [workspaceId, apiKey, reset],
  );

  const renameSaved = useCallback(
    async (id: string, title: string) => {
      if (!workspaceId || !apiKey) return;
      await api.renameConversation(workspaceId, apiKey, id, title);
      setConversationPages((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
    },
    [workspaceId, apiKey],
  );

  const outOfQuota = remaining === 0;

  return {
    messages,
    input,
    setInput,
    pendingImage,
    attachImage: setPendingImage,
    pendingDocument,
    attachDocument: setPendingDocument,
    imageMode,
    setImageMode,
    send,
    reset,
    regenerateLast,
    editAndResend,
    stop,
    thinking,
    generatingImage,
    available: configured,
    started: messages.length > 0,
    plan,
    models,
    selectedModel,
    setModel,
    remaining,
    outOfQuota,
    conversations: conversationPages,
    loadingConversations,
    loadingMoreConversations,
    hasMoreConversations,
    loadMoreConversations,
    ensureConversationsLoaded,
    conversationId,
    loadingConversation,
    openConversation,
    deleteConversation: removeSaved,
    deleteConversations: bulkRemoveSaved,
    renameConversation: renameSaved,
    hasOlderMessages: olderMessagesCursor != null,
    loadingOlderMessages,
    loadOlderMessages,
  };
}
