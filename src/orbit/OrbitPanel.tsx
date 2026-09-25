import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActionIcon, Box, Group, Loader, Menu, ScrollArea, Stack, Text, Textarea, Title, Tooltip, UnstyledButton,
} from "@mantine/core";
import {
  AlertTriangle, ArrowUp, ArrowUpRight, Check, ChevronDown, Copy, CornerDownRight, Download, FileText,
  Globe, History, Lock, MessageSquareText, Palette, Pencil, Paperclip, RefreshCw, Settings, Share2,
  Square, SquarePen, X,
} from "lucide-react";
import { OrbitMark } from "@/orbit/components/OrbitMark";
import { RichText, toPlainText } from "@/orbit/components/RichText";
import { DataDigestTable, csvFromDigest, formatDigestAsText, isDataDigest } from "@/orbit/components/DataDigestTable";
import { pickOrbitSuggestionsForHostname } from "@/orbit/orbitSuggestions";
import { useTypewriter } from "@/orbit/useTypewriter";
import { useOrbitChat } from "@/orbit/useOrbitChat";
import { usePageContext } from "@/orbit/usePageContext";
import { OrbitHistoryDrawer } from "@/orbit/OrbitHistoryDrawer";
import type { OrbitMessage, OrbitModel } from "@/shared/types";
import classes from "./orbitPanel.module.css";

const SUPPORTED_DOCUMENT_MIME = new Set([
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

const DRAW_RE = /^(draw|generate|gen|create|illustrate|paint|sketch|render|make me (an? )?(image|picture|photo))\b/i;

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Working late?";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {}
}

async function copyDigestAsReport(digest: unknown) {
  if (!isDataDigest(digest)) return;
  await copyText(formatDigestAsText(digest));
}

function downloadDigestAsCsv(digest: unknown) {
  if (!isDataDigest(digest)) return;
  const blob = new Blob([csvFromDigest(digest)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `orbit-report-${Date.now()}.csv`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyImage(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  } catch {
    await copyText(url);
  }
}

async function shareTurn(message: OrbitMessage) {
  const plain = toPlainText(message.content);
  const shareData: ShareData = message.imageUrl
    ? { title: "Orbit AI", text: plain || undefined, url: message.imageUrl }
    : { title: "Orbit AI", text: plain };

  if (navigator.share) {
    try {
      await navigator.share(shareData);
    } catch {}
    return;
  }

  await copyText(message.imageUrl ?? plain);
}

async function downloadImage(url: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const ext = blob.type.split("/")[1]?.split("+")[0] || "png";
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `orbit-${Date.now()}.${ext}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank");
  }
}

function GeneratedImage({ url }: { url: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className={classes.generatedImageWrap}>
      {!loaded && <div className={classes.generatedImageSkeleton} />}
      <img
        src={url}
        alt="Generated"
        className={classes.generatedImage}
        data-loaded={loaded}
        onLoad={() => setLoaded(true)}
      />
      {loaded && (
        <Tooltip label="Download image" withArrow>
          <ActionIcon
            className={classes.generatedImageDownload}
            variant="default"
            radius="xl"
            onClick={() => downloadImage(url)}
            aria-label="Download image"
          >
            <Download size={16} />
          </ActionIcon>
        </Tooltip>
      )}
    </div>
  );
}

function ModelPicker({
  models,
  selectedModel,
  onSelect,
  disabled,
}: {
  models: OrbitModel[];
  selectedModel: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
}) {
  if (!models.length) return null;

  const active = models.find((m) => m.id === selectedModel) ?? models[0];

  return (
    <Menu position="top-start" withArrow shadow="md" width={230} disabled={disabled}>
      <Menu.Target>
        <UnstyledButton className={classes.modelPicker} disabled={disabled} aria-label="Choose model">
          <Text size="xs" fw={500} truncate maw={120}>
            {active.label}
          </Text>
          <ChevronDown size={13} style={{ flexShrink: 0 }} />
        </UnstyledButton>
      </Menu.Target>
      <Menu.Dropdown>
        {models.map((m) => (
          <Menu.Item
            key={m.id}
            disabled={m.locked}
            leftSection={m.locked ? <Lock size={13} /> : <Box w={13} />}
            rightSection={m.id === active.id ? <Check size={13} /> : null}
            onClick={() => onSelect(m.id)}
          >
            <Text size="xs" fw={500}>
              {m.label}
            </Text>
            <Text size="10px" c="dimmed" lh={1.3}>
              {m.hint}
            </Text>
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  );
}

function TurnActions({
  message,
  onRegenerate,
  regenerating,
}: {
  message: OrbitMessage;
  onRegenerate?: () => void;
  regenerating?: boolean;
}) {
  return (
    <Group gap={2} mt={6} wrap="nowrap" align="center">
      <Tooltip label={message.imageUrl ? "Copy image" : "Copy"} withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          radius="xl"
          onClick={() =>
            message.imageUrl ? copyImage(message.imageUrl) : copyText(toPlainText(message.content))
          }
          aria-label="Copy"
        >
          <Copy size={13} />
        </ActionIcon>
      </Tooltip>
      <Tooltip label="Share" withArrow>
        <ActionIcon
          variant="subtle"
          color="gray"
          size="sm"
          radius="xl"
          onClick={() => shareTurn(message)}
          aria-label="Share"
        >
          <Share2 size={13} />
        </ActionIcon>
      </Tooltip>
      {isDataDigest(message.dataDigest) && (
        <>
          <Tooltip label="Copy as report" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="xl"
              onClick={() => copyDigestAsReport(message.dataDigest)}
              aria-label="Copy as report"
            >
              <Download size={13} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Download as CSV" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="xl"
              onClick={() => downloadDigestAsCsv(message.dataDigest)}
              aria-label="Download as CSV"
            >
              <Download size={13} />
            </ActionIcon>
          </Tooltip>
        </>
      )}
      {onRegenerate && (
        <Tooltip label="Regenerate" withArrow>
          <ActionIcon
            variant="subtle"
            color="gray"
            size="sm"
            radius="xl"
            onClick={onRegenerate}
            disabled={regenerating}
            aria-label="Regenerate"
          >
            <RefreshCw size={13} />
          </ActionIcon>
        </Tooltip>
      )}
    </Group>
  );
}

function CitationsList({ citations }: { citations?: { url: string; title: string }[] }) {
  if (!citations?.length) return null;

  return (
    <Group gap={6} mt={10} wrap="wrap" align="center">
      <Globe size={12} style={{ color: "var(--mantine-color-dimmed)", flexShrink: 0 }} />
      {citations.map((c, i) => (
        <Text key={c.url} size="xs" c="dimmed">
          {i + 1}. {c.title}
        </Text>
      ))}
    </Group>
  );
}

function AnswerText({
  message,
  live,
  onDone,
}: {
  message: OrbitMessage;
  live: boolean;
  onDone?: () => void;
}) {
  const shown = useTypewriter(message.content, live, onDone);

  return (
    <Text
      size="sm"
      lh={1.7}
      c={message.failed ? "dimmed" : undefined}
      style={{ whiteSpace: "pre-wrap" }}
    >
      <RichText text={shown} animate={live} />
    </Text>
  );
}

function UserTurn({
  message,
  onEdit,
  editable,
}: {
  message: OrbitMessage;
  onEdit?: (text: string) => void;
  editable?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);

  const begin = () => {
    setDraft(message.content);
    setEditing(true);
  };

  const commit = () => {
    const text = draft.trim();
    setEditing(false);
    if (!text || text === message.content) return;
    onEdit?.(text);
  };

  if (editing) {
    return (
      <Group justify="flex-end" wrap="nowrap">
        <Box className={classes.userTurnEditing}>
          <Textarea
            value={draft}
            autoFocus
            autosize
            minRows={1}
            maxRows={8}
            variant="unstyled"
            size="sm"
            onChange={(e) => setDraft(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                commit();
              }
              if (e.key === "Escape") setEditing(false);
            }}
          />
          <Group gap={6} justify="flex-end" mt={6}>
            <UnstyledButton className={classes.editCancel} onClick={() => setEditing(false)}>
              <Text size="xs">Cancel</Text>
            </UnstyledButton>
            <UnstyledButton
              component="button"
              type="button"
              className={classes.editSave}
              onClick={commit}
              disabled={!draft.trim()}
            >
              <Text size="xs" fw={600}>
                Send
              </Text>
            </UnstyledButton>
          </Group>
        </Box>
      </Group>
    );
  }

  return (
    <Stack gap={6} align="flex-end">
      {message.imageUrl && (
        <img src={message.imageUrl} alt="Attached" className={classes.userTurnImageStandalone} />
      )}
      {message.documentName && (
        <Group gap={6} wrap="nowrap" className={classes.userTurn} style={{ padding: "6px 10px" }}>
          <FileText size={14} style={{ flexShrink: 0, color: "var(--mantine-color-dimmed)" }} />
          <Text size="xs" lh={1.4} truncate maw={220}>
            {message.documentName}
          </Text>
        </Group>
      )}
      {message.content && (
        <Group justify="flex-end" wrap="nowrap" gap={4} className={classes.userTurnRow}>
          <Tooltip label="Edit and re-ask" withArrow position="left" disabled={!editable}>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="sm"
              radius="xl"
              className={classes.userTurnEdit}
              onClick={begin}
              disabled={!editable}
              aria-label="Edit and re-ask"
              aria-hidden={!editable}
              style={editable ? undefined : { visibility: "hidden" }}
            >
              <Pencil size={13} />
            </ActionIcon>
          </Tooltip>
          <Box className={classes.userTurn}>
            <Text size="sm" lh={1.6} style={{ whiteSpace: "pre-wrap" }}>
              {message.content}
            </Text>
          </Box>
        </Group>
      )}
    </Stack>
  );
}

function Turn({
  message,
  isLast,
  live,
  onRevealed,
  onRegenerate,
  onEdit,
  editable,
  regenerating,
}: {
  message: OrbitMessage;
  isLast?: boolean;
  live?: boolean;
  onRevealed?: () => void;
  onRegenerate?: () => void;
  onEdit?: (text: string) => void;
  editable?: boolean;
  regenerating?: boolean;
}) {
  if (message.role === "user") {
    return <UserTurn message={message} onEdit={onEdit} editable={editable} />;
  }

  if (message.stopped) {
    return (
      <Group gap={10} wrap="nowrap" align="center">
        <Text size="xs" c="dimmed">
          Stopped
        </Text>
        {isLast && onRegenerate && (
          <UnstyledButton onClick={onRegenerate} disabled={regenerating}>
            <Group gap={5} wrap="nowrap">
              <RefreshCw size={12} color="var(--mantine-color-emerald-5)" />
              <Text size="xs" c="emerald.5" fw={500}>
                Ask again
              </Text>
            </Group>
          </UnstyledButton>
        )}
      </Group>
    );
  }

  return (
    <div className={classes.answer}>
      <div className={classes.answerHead}>
        {message.failed ? (
          <AlertTriangle size={16} color="var(--mantine-color-orange-5)" />
        ) : (
          <OrbitMark size={20} />
        )}
        <span className={classes.answerName}>Orbit</span>
        {message.modelLabel && <span className={classes.answerModel}>{message.modelLabel}</span>}
      </div>
      <div className={classes.answerBody}>
        {message.imageUrl && <GeneratedImage url={message.imageUrl} />}
        {message.content && (
          <AnswerText message={message} live={Boolean(live)} onDone={onRevealed} />
        )}
        {!live && <DataDigestTable digest={message.dataDigest} takenAtIso={message.digestAt} />}
        {!live && <CitationsList citations={message.citations} />}
        {!message.failed && !live && (
          <TurnActions
            message={message}
            onRegenerate={isLast ? onRegenerate : undefined}
            regenerating={regenerating}
          />
        )}
      </div>
    </div>
  );
}

/** A soft sweep across the word, while Orbit works on an answer. */
function ThinkingRow({ label }: { label: string }) {
  return (
    <div className={classes.answer}>
      <div className={classes.answerHead}>
        <OrbitMark size={20} className={classes.markPulse} />
        <span className={classes.thinking}>{label}</span>
      </div>
    </div>
  );
}

export function OrbitPanel({ onOpenSettings }: { onOpenSettings: () => void }) {
  const chat = useOrbitChat();
  const {
    messages, input, setInput, pendingImage, attachImage, pendingDocument, attachDocument,
    imageMode, setImageMode, send, regenerateLast, editAndResend, stop, thinking, generatingImage,
    available, started, plan, models, selectedModel, setModel,
    hasOlderMessages, loadingOlderMessages, loadOlderMessages,
  } = chat;

  const [liveId, setLiveId] = useState<string | null>(null);
  const wasThinking = useRef(false);

  const pageContext = usePageContext();
  const staticStarters = useMemo(
    () => pickOrbitSuggestionsForHostname(pageContext?.hostname ?? null, 3),
    [pageContext?.hostname],
  );

  useEffect(() => {
    const last = messages[messages.length - 1];
    if (
      wasThinking.current &&
      !thinking &&
      last?.role === "assistant" &&
      !last.failed &&
      !last.stopped &&
      !last.imageUrl
    ) {
      setLiveId(last.id);
    }
    wasThinking.current = thinking;
  }, [thinking, messages]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const manualToggle = useRef(false);

  const sendAndStop = (q?: string) => {
    manualToggle.current = false;
    send(q);
  };

  const acceptImage = (file: File | undefined | null) => {
    if (!file) return;
    setImageError(null);

    if (!file.type.startsWith("image/")) {
      setImageError("That isn't an image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImageError("That image is too large — 6MB or smaller.");
      return;
    }

    setImageMode(false);

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") attachImage(reader.result);
    };
    reader.onerror = () => setImageError("Couldn't read that image.");
    reader.readAsDataURL(file);
  };

  const acceptDocument = useCallback((file: File | undefined | null) => {
    if (!file) return;
    setDocumentError(null);

    if (!SUPPORTED_DOCUMENT_MIME.has(file.type)) {
      setDocumentError("That file type isn't supported — PDF, DOCX, CSV or plain text.");
      return;
    }
    if (file.size > MAX_DOCUMENT_BYTES) {
      setDocumentError("That file is too large — 5MB or smaller.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        attachDocument({ name: file.name, mime: file.type, data: reader.result });
      }
    };
    reader.onerror = () => setDocumentError("Couldn't read that file.");
    reader.readAsDataURL(file);
  }, [attachDocument]);

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.currentTarget.files?.[0];
    if (file && SUPPORTED_DOCUMENT_MIME.has(file.type)) {
      acceptDocument(file);
    } else {
      acceptImage(file);
    }
    e.currentTarget.value = "";
  };

  const onComposerDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && SUPPORTED_DOCUMENT_MIME.has(file.type)) {
      acceptDocument(file);
    } else {
      acceptImage(file);
    }
  };

  const toggleImageMode = () => {
    if (!imageMode && plan && !plan.imageGeneration) {
      return;
    }
    manualToggle.current = true;
    setImageMode((v) => !v);
  };

  const onTextareaPaste = (e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.files).find((f) => f.type.startsWith("image/"));
    if (file) {
      setImageMode(false);
      acceptImage(file);
    }
  };

  const last = messages[messages.length - 1];

  const typing = liveId != null && last?.id === liveId;
  const followUps =
    last?.role === "assistant" && !last.failed && !last.stopped && !typing
      ? (last.suggestions ?? [])
      : [];

  const lastMessageId = useRef<string | null>(null);
  useEffect(() => {
    const newLastId = last?.id ?? null;
    if (newLastId !== lastMessageId.current) {
      lastMessageId.current = newLastId;
      bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, thinking, last]);

  useEffect(() => {
    if (!typing) return;
    const id = setInterval(() => {
      bottom.current?.scrollIntoView({ behavior: "auto", block: "end" });
    }, 120);
    return () => clearInterval(id);
  }, [typing]);

  if (!available) {
    return (
      <div className={classes.page}>
        <Stack gap={8} align="center" justify="center" style={{ height: "100%" }} px="md">
          <OrbitMark size={44} />
          <Text size="sm" c="dimmed" ta="center" lh={1.6}>
            Orbit isn't set up on this workspace yet.
          </Text>
        </Stack>
      </div>
    );
  }

  const empty = !input.trim() && !pendingImage && !pendingDocument;

  const composer = (
    <div className={classes.composerWrap}>
      <div className={classes.composer} onDragOver={(e) => e.preventDefault()} onDrop={onComposerDrop}>
        {pendingImage && (
          <div className={classes.imageChip}>
            <img src={pendingImage} alt="Attached" />
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              radius="xl"
              onClick={() => attachImage(null)}
              aria-label="Remove attached image"
            >
              <X size={12} />
            </ActionIcon>
          </div>
        )}
        {pendingDocument && (
          <Group gap={6} wrap="nowrap" px="md" pt="sm">
            <FileText size={14} style={{ flexShrink: 0, color: "var(--mantine-color-dimmed)" }} />
            <Text size="xs" c="dimmed" truncate style={{ flex: 1 }}>
              {pendingDocument.name}
            </Text>
            <ActionIcon
              variant="subtle"
              color="gray"
              size="xs"
              radius="xl"
              onClick={() => attachDocument(null)}
              aria-label="Remove attached file"
            >
              <X size={12} />
            </ActionIcon>
          </Group>
        )}
        <Textarea
          placeholder={
            imageMode
              ? "Describe what to draw"
              : pendingDocument
                ? "Ask about this file"
                : "Ask anything"
          }
          value={input}
          onChange={(e) => {
            const val = e.currentTarget.value;
            setInput(val);

            if (!manualToggle.current && !pendingImage && !pendingDocument && plan?.imageGeneration) {
              const match = DRAW_RE.test(val.trim());
              if (match && !imageMode) setImageMode(true);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendAndStop();
            }
          }}
          onPaste={onTextareaPaste}
          variant="unstyled"
          autosize
          minRows={1}
          maxRows={started ? 8 : 6}
          px="md"
          pt={10}
          pb={2}
          disabled={thinking}
          data-autofocus
          classNames={{ input: classes.composerInput, wrapper: classes.composerInputWrapper }}
          styles={{
            input: {
              fontSize: 15,
              lineHeight: 1.5,
              background: "transparent",
              border: "none",
              boxShadow: "none",
            },
          }}
        />

        {imageError && (
          <Text size="10px" c="orange.5" px="md" pb={4}>
            {imageError}
          </Text>
        )}
        {documentError && (
          <Text size="10px" c="orange.5" px="md" pb={4}>
            {documentError}
          </Text>
        )}

        <div className={classes.composerFoot}>
          <Group gap={4} wrap="nowrap">
            <ModelPicker
              models={models}
              selectedModel={selectedModel}
              onSelect={setModel}
              disabled={thinking}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.docx,.csv,.txt,application/pdf,text/csv,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              hidden
              onChange={onFilePicked}
            />
            <Tooltip label="Attach a file" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                size="sm"
                disabled={thinking || imageMode || !!pendingImage || !!pendingDocument}
                onClick={() => fileInputRef.current?.click()}
                aria-label="Attach a file"
              >
                <Paperclip size={14} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={imageMode ? "Cancel drawing" : "Draw a picture"} withArrow>
              <ActionIcon
                variant={imageMode ? "filled" : "subtle"}
                color={imageMode ? "emerald" : "gray"}
                radius="xl"
                size="sm"
                disabled={thinking || !!pendingImage || !!pendingDocument}
                onClick={toggleImageMode}
                aria-label={imageMode ? "Cancel drawing" : "Draw a picture"}
                aria-pressed={imageMode}
              >
                <Palette size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap={4} wrap="nowrap">
            <Tooltip label={thinking ? "Stop" : "Send"} withArrow>
              <ActionIcon
                className={classes.send}
                color={thinking ? "red" : "emerald"}
                radius="xl"
                size={32}
                disabled={!thinking && empty}
                onClick={() => (thinking ? stop() : sendAndStop())}
                aria-label={thinking ? "Stop" : "Send"}
              >
                {thinking ? <Square size={11} fill="currentColor" /> : <ArrowUp size={15} />}
              </ActionIcon>
            </Tooltip>
          </Group>
        </div>
      </div>

      <Text size="10px" c="dimmed" ta="center" mt={8} lh={1.4} className={classes.disclaimer}>
        Orbit can't see your data and can be wrong.
      </Text>
    </div>
  );

  return (
    <div className={classes.page}>
      <div className={classes.header}>
        <div className={classes.brand} role="heading" aria-level={1} aria-label="Orbit AI">
          <OrbitMark size={24} />
          <span className={classes.brandName}>Orbit</span>
          {pageContext && (
            <Tooltip label={pageContext.title} withArrow openDelay={400}>
              <span className={classes.siteChip}>
                <Globe size={11} />
                <span>{pageContext.hostname}</span>
              </span>
            </Tooltip>
          )}
        </div>

        <Group gap={2} wrap="nowrap">
          {started && (
            <Tooltip label="New chat" withArrow>
              <ActionIcon
                variant="subtle"
                color="gray"
                size={30}
                onClick={chat.reset}
                aria-label="New chat"
              >
                <SquarePen size={15} />
              </ActionIcon>
            </Tooltip>
          )}
          <Tooltip label="Conversations" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size={30}
              onClick={() => setHistoryOpen(true)}
              aria-label="Conversations"
            >
              <History size={15} />
            </ActionIcon>
          </Tooltip>
          <Tooltip label="Settings" withArrow>
            <ActionIcon
              variant="subtle"
              color="gray"
              size={30}
              onClick={onOpenSettings}
              aria-label="Settings"
            >
              <Settings size={15} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </div>

      <div className={classes.body} data-state={started ? "started" : "empty"}>
        {!started ? (
          <div className={classes.hero}>
            <div className={classes.heroHead}>
              <div className={classes.heroMark}>
                <OrbitMark size={44} />
              </div>
              <Title order={2} className={classes.heroTitle}>
                {greeting()}
              </Title>
              <Text className={classes.heroSub}>
                {pageContext
                  ? <>Ask anything, or about <b>{pageContext.hostname}</b>. Attach a file or draw a picture.</>
                  : "Ask anything, attach a file, or draw a picture."}
              </Text>
            </div>

            {composer}

            <div className={classes.starters} data-ready>
              <div className={classes.startersLabel}>Try asking</div>
              {staticStarters.map((q) => (
                <UnstyledButton
                  key={q}
                  className={classes.starter}
                  onClick={() => sendAndStop(q)}
                >
                  <MessageSquareText size={14} className={classes.starterIcon} />
                  <span className={classes.starterText}>{q}</span>
                  <ArrowUpRight size={14} className={classes.starterArrow} />
                </UnstyledButton>
              ))}
            </div>
          </div>
        ) : (
          <>
            <ScrollArea
              className={classes.scroll}
              type="hover"
              scrollbarSize={7}
              onScrollPositionChange={({ y }) => {
                if (y < 80 && hasOlderMessages && !loadingOlderMessages) {
                  void loadOlderMessages();
                }
              }}
            >
              <div className={classes.column}>
                <Stack gap={28}>
                  {loadingOlderMessages && (
                    <Group justify="center" py={4}>
                      <Loader size={13} type="dots" color="var(--mantine-color-emerald-5)" />
                    </Group>
                  )}
                  {messages.map((m, i) => (
                    <Turn
                      key={m.id}
                      message={m}
                      isLast={i === messages.length - 1}
                      live={m.id === liveId}
                      onRevealed={() => setLiveId(null)}
                      onRegenerate={() => void regenerateLast()}
                      onEdit={(text) => void editAndResend(m.id, text)}
                      editable={!thinking}
                      regenerating={thinking}
                    />
                  ))}

                  {thinking && generatingImage && (
                    <div className={classes.answer}>
                      <div className={classes.answerHead}>
                        <OrbitMark size={20} className={classes.markPulse} />
                        <span className={classes.thinking}>Painting</span>
                      </div>
                      <div className={classes.generatingImage}>
                        <div className={classes.generatingImageSweep} />
                        <Palette size={20} className={classes.generatingImageIcon} />
                      </div>
                    </div>
                  )}

                  {thinking && !generatingImage && <ThinkingRow label="Thinking" />}

                  {!thinking && followUps.length > 0 && (
                    <div className={classes.followUps}>
                      <div className={classes.followUpsLabel}>Related</div>
                      {followUps.map((q) => (
                        <UnstyledButton
                          key={q}
                          className={classes.followUp}
                          onClick={() => sendAndStop(q)}
                        >
                          <CornerDownRight size={13} className={classes.starterIcon} />
                          <span className={classes.starterText}>{q}</span>
                        </UnstyledButton>
                      ))}
                    </div>
                  )}

                  <div ref={bottom} />
                </Stack>
              </div>
            </ScrollArea>

            {composer}
          </>
        )}
      </div>

      <OrbitHistoryDrawer chat={chat} opened={historyOpen} onClose={() => setHistoryOpen(false)} />
    </div>
  );
}
