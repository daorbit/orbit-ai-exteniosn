import { useEffect, useRef, useState } from "react";
import {
  ActionIcon, Box, Button, Checkbox, Drawer, Group, Loader, Modal, ScrollArea,
  Stack, Text, TextInput, UnstyledButton,
} from "@mantine/core";
import {
  AlertTriangle, Check, CheckSquare, MessageSquare, Pencil, Plus, Search, Trash2, X,
} from "lucide-react";
import type { useOrbitChat } from "@/orbit/useOrbitChat";
import classes from "./orbitPanel.module.css";

function ago(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(then).toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function OrbitHistoryDrawer({
  chat,
  opened,
  onClose,
}: {
  chat: ReturnType<typeof useOrbitChat>;
  opened: boolean;
  onClose: () => void;
}) {
  const {
    conversations, conversationId, openConversation, deleteConversation,
    deleteConversations, renameConversation, loadingConversation, loadingConversations,
    loadingMoreConversations, hasMoreConversations, loadMoreConversations,
    ensureConversationsLoaded, reset, started,
  } = chat;

  useEffect(() => {
    if (opened) ensureConversationsLoaded();
  }, [opened, ensureConversationsLoaded]);

  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? conversations.filter((c) => c.title.toLowerCase().includes(needle))
    : conversations;

  const [confirmingDelete, setConfirmingDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmingBulkDelete, setConfirmingBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelected(new Set());
  };

  const toggleSelected = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allShownSelected = shown.length > 0 && shown.every((c) => selected.has(c.id));
  const someShownSelected = shown.some((c) => selected.has(c.id));

  const toggleSelectAll = () =>
    setSelected((prev) => {
      if (allShownSelected) {
        const next = new Set(prev);
        for (const c of shown) next.delete(c.id);
        return next;
      }
      const next = new Set(prev);
      for (const c of shown) next.add(c.id);
      return next;
    });

  const confirmBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      await deleteConversations(Array.from(selected));
      exitSelectMode();
    } catch {
    } finally {
      setBulkDeleting(false);
      setConfirmingBulkDelete(false);
    }
  };

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMoreConversations) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMoreConversations();
      },
      { root: node.closest(".mantine-ScrollArea-viewport"), rootMargin: "120px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMoreConversations, loadMoreConversations, shown.length]);

  const beginRename = (id: string, title: string) => {
    setConfirmingDelete(null);
    setEditing(id);
    setDraft(title);
  };

  const commitRename = async (id: string) => {
    const title = draft.trim();
    setEditing(null);
    if (!title || title === conversations.find((c) => c.id === id)?.title) return;
    try {
      await renameConversation(id, title);
    } catch {}
  };

  const confirmTitle = conversations.find((c) => c.id === confirmingDelete)?.title ?? "";

  const confirmDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteConversation(id);
    } catch {
    } finally {
      setDeletingId(null);
      setConfirmingDelete(null);
    }
  };

  const pick = (id: string) => {
    void openConversation(id);
    onClose();
  };

  const startNew = () => {
    reset();
    onClose();
  };

  const close = () => {
    setEditing(null);
    setConfirmingDelete(null);
    exitSelectMode();
    onClose();
  };

  return (
    <Drawer
      opened={opened}
      onClose={close}
      position="right"
      size="100%"
      padding={0}
      withCloseButton={false}
      overlayProps={{ backgroundOpacity: 0.35, blur: 2 }}
      title={null}
      classNames={{ content: classes.drawerContent }}
      styles={{
        content: { display: "flex", flexDirection: "column" },
        body: { display: "flex", flexDirection: "column", flex: 1, minHeight: 0 },
      }}
    >
      <Group justify="space-between" wrap="nowrap" px="md" pt="md" pb={10}>
        <Text size="sm" fw={650}>
          Conversations
        </Text>
        <Group gap={6} wrap="nowrap">
          {loadingConversation && <Loader size={11} type="dots" />}
          <ActionIcon variant="subtle" color="gray" size="sm" onClick={close} aria-label="Close history">
            <X size={15} />
          </ActionIcon>
        </Group>
      </Group>

      <Box px="md" pb="sm">
        {selectMode ? (
          <Group gap={6} wrap="nowrap">
            <Checkbox
              size="xs"
              checked={allShownSelected}
              indeterminate={someShownSelected && !allShownSelected}
              onChange={toggleSelectAll}
              aria-label="Select all"
            />
            <Text size="xs" c="dimmed" style={{ flex: 1 }}>
              {selected.size ? `${selected.size} selected` : "Select all"}
            </Text>
            <Button
              size="xs"
              variant="light"
              color="red"
              radius="md"
              disabled={!selected.size}
              onClick={() => setConfirmingBulkDelete(true)}
            >
              Delete{selected.size ? ` (${selected.size})` : ""}
            </Button>
            <Button size="xs" variant="default" radius="md" onClick={exitSelectMode}>
              Cancel
            </Button>
          </Group>
        ) : (
          <Group gap={6} wrap="nowrap">
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<Plus size={14} />}
              onClick={startNew}
              disabled={!started}
              style={{ flex: 1, minWidth: 0 }}
            >
              New conversation
            </Button>
            <Button
              variant="default"
              size="xs"
              radius="md"
              leftSection={<CheckSquare size={14} />}
              onClick={() => setSelectMode(true)}
              disabled={!conversations.length}
              style={{ flexShrink: 0 }}
            >
              Select
            </Button>
          </Group>
        )}
      </Box>

      {conversations.length > 6 && (
        <Box px="md" pb="sm">
          <TextInput
            size="xs"
            radius="md"
            placeholder="Search conversations"
            value={query}
            onChange={(e) => setQuery(e.currentTarget.value)}
            leftSection={<Search size={13} />}
            rightSection={
              query ? (
                <ActionIcon
                  variant="subtle"
                  color="gray"
                  size="xs"
                  onClick={() => setQuery("")}
                  aria-label="Clear search"
                >
                  <X size={12} />
                </ActionIcon>
              ) : null
            }
          />
        </Box>
      )}

      <ScrollArea className={classes.drawerList} type="hover" scrollbarSize={6}>
        {loadingConversations ? (
          <Stack gap={0}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={classes.threadSkeleton}>
                <div className={classes.threadSkeletonIcon} />
                <div className={classes.threadSkeletonLines}>
                  <div className={classes.threadSkeletonLine} />
                  <div className={classes.threadSkeletonLine} data-w="short" />
                </div>
              </div>
            ))}
          </Stack>
        ) : !conversations.length ? (
          <Text size="xs" c="dimmed" lh={1.5} px={10} py={6}>
            Threads you start are saved here for everyone in this workspace.
          </Text>
        ) : !shown.length ? (
          <Text size="xs" c="dimmed" lh={1.5} px={10} py={6}>
            No conversation matches &ldquo;{query.trim()}&rdquo;.
          </Text>
        ) : (
          <Stack gap={0}>
            {shown.map((c) => {
              const active = c.id === conversationId;

              if (editing === c.id) {
                return (
                  <Box key={c.id} px={4} py={4} mb={4}>
                    <TextInput
                      size="xs"
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.currentTarget.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void commitRename(c.id);
                        }
                        if (e.key === "Escape") setEditing(null);
                      }}
                      rightSectionWidth={48}
                      rightSection={
                        <Group gap={0} wrap="nowrap">
                          <ActionIcon
                            variant="subtle"
                            color="gray"
                            size="xs"
                            onClick={() => setEditing(null)}
                            aria-label="Cancel rename"
                          >
                            <X size={11} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="emerald"
                            size="xs"
                            onClick={() => void commitRename(c.id)}
                            aria-label="Save title"
                          >
                            <Check size={11} />
                          </ActionIcon>
                        </Group>
                      }
                    />
                  </Box>
                );
              }

              const deleting = deletingId === c.id;
              const isSelected = selected.has(c.id);

              return (
                <UnstyledButton
                  key={c.id}
                  className={classes.thread}
                  data-active={active}
                  data-deleting={deleting || undefined}
                  onClick={() => (selectMode ? toggleSelected(c.id) : pick(c.id))}
                >
                  {selectMode ? (
                    <Checkbox
                      size="xs"
                      checked={isSelected}
                      onChange={() => toggleSelected(c.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ marginTop: 6, flexShrink: 0 }}
                      aria-label={`Select ${c.title}`}
                    />
                  ) : (
                    <div className={classes.threadIcon}>
                      {deleting ? <Loader size={13} color="red" /> : <MessageSquare size={14} />}
                    </div>
                  )}

                  <div className={classes.threadBody}>
                    <Text size="xs" fw={active ? 600 : 500} lh={1.4} truncate>
                      {c.title}
                    </Text>
                    <Text size="10px" c="dimmed" lh={1.4}>
                      {ago(c.lastMessageAt)} · {Math.floor(c.messageCount / 2)} question
                      {c.messageCount === 2 ? "" : "s"}
                    </Text>
                  </div>

                  {!deleting && !selectMode && (
                    <div className={classes.threadActions}>
                      <ActionIcon
                        component="div"
                        role="button"
                        tabIndex={0}
                        variant="subtle"
                        className={classes.threadActionBtn}
                        data-tone="edit"
                        aria-label={`Rename ${c.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          beginRename(c.id, c.title);
                        }}
                      >
                        <Pencil size={12} />
                      </ActionIcon>
                      <ActionIcon
                        component="div"
                        role="button"
                        tabIndex={0}
                        variant="subtle"
                        className={classes.threadActionBtn}
                        data-tone="delete"
                        aria-label={`Delete ${c.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditing(null);
                          setConfirmingDelete(c.id);
                        }}
                      >
                        <Trash2 size={12} />
                      </ActionIcon>
                    </div>
                  )}
                </UnstyledButton>
              );
            })}

            {hasMoreConversations && (
              <div ref={sentinelRef} style={{ display: "flex", justifyContent: "center", padding: "10px 0" }}>
                {loadingMoreConversations && <Loader size={14} type="dots" />}
              </div>
            )}
          </Stack>
        )}
      </ScrollArea>

      <Modal
        opened={confirmingDelete != null}
        onClose={() => !deletingId && setConfirmingDelete(null)}
        withCloseButton={false}
        centered
        size={340}
        radius="md"
        overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      >
        <Stack gap={4} align="center" ta="center" py={4}>
          <Box className={classes.confirmIcon}>
            <AlertTriangle size={20} />
          </Box>
          <Text size="sm" fw={650}>
            Delete this conversation?
          </Text>
          <Text size="xs" c="dimmed" lh={1.5} maw={260}>
            {confirmTitle ? <>&ldquo;{confirmTitle}&rdquo; and all its messages will be gone for everyone in this workspace. This can&apos;t be undone.</> : null}
          </Text>
          <Group gap={8} mt={14} w="100%" grow>
            <Button
              variant="default"
              onClick={() => setConfirmingDelete(null)}
              disabled={!!deletingId}
            >
              Cancel
            </Button>
            <Button
              color="red"
              loading={!!deletingId}
              onClick={() => confirmingDelete && void confirmDelete(confirmingDelete)}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={confirmingBulkDelete}
        onClose={() => !bulkDeleting && setConfirmingBulkDelete(false)}
        withCloseButton={false}
        centered
        size={340}
        radius="md"
        overlayProps={{ backgroundOpacity: 0.45, blur: 2 }}
      >
        <Stack gap={4} align="center" ta="center" py={4}>
          <Box className={classes.confirmIcon}>
            <AlertTriangle size={20} />
          </Box>
          <Text size="sm" fw={650}>
            Delete {selected.size} conversation{selected.size === 1 ? "" : "s"}?
          </Text>
          <Text size="xs" c="dimmed" lh={1.5} maw={260}>
            All their messages will be gone for everyone in this workspace. This can&apos;t be undone.
          </Text>
          <Group gap={8} mt={14} w="100%" grow>
            <Button
              variant="default"
              onClick={() => setConfirmingBulkDelete(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button color="red" loading={bulkDeleting} onClick={() => void confirmBulkDelete()}>
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Drawer>
  );
}
