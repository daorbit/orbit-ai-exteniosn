import type {
  AskOrbitRequest,
  AskOrbitResponse,
  OrbitConversationDetail,
  OrbitConversationsPage,
  OrbitStatus,
} from "@/shared/types";

const API_BASE = import.meta.env.VITE_API_BASE ?? "";

export class OrbitApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(
  workspaceId: string,
  apiKey: string,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const res = await fetch(`${API_BASE}/api/workspaces/${workspaceId}/orbit${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...init?.headers,
    },
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      if (typeof body?.error === "string") message = body.error;
    } catch {}
    throw new OrbitApiError(res.status, message);
  }

  return res.json() as Promise<T>;
}

export function getStatus(workspaceId: string, apiKey: string, signal?: AbortSignal) {
  return request<OrbitStatus>(workspaceId, apiKey, "/status", { signal });
}

export function ask(
  workspaceId: string,
  apiKey: string,
  body: AskOrbitRequest,
  signal?: AbortSignal,
) {
  return request<AskOrbitResponse>(workspaceId, apiKey, "/ask", {
    method: "POST",
    body: JSON.stringify(body),
    signal,
  });
}

export function getConversations(workspaceId: string, apiKey: string, cursor?: string) {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : "";
  return request<OrbitConversationsPage>(workspaceId, apiKey, `/conversations${query}`);
}

export function getConversation(
  workspaceId: string,
  apiKey: string,
  conversationId: string,
  before?: number,
) {
  const query = typeof before === "number" ? `?before=${before}` : "";
  return request<OrbitConversationDetail>(
    workspaceId,
    apiKey,
    `/conversations/${conversationId}${query}`,
  );
}

export function renameConversation(
  workspaceId: string,
  apiKey: string,
  conversationId: string,
  title: string,
) {
  return request<{ ok: true }>(workspaceId, apiKey, `/conversations/${conversationId}`, {
    method: "PATCH",
    body: JSON.stringify({ title }),
  });
}

export function deleteConversation(workspaceId: string, apiKey: string, conversationId: string) {
  return request<{ ok: true }>(workspaceId, apiKey, `/conversations/${conversationId}`, {
    method: "DELETE",
  });
}

export function bulkDeleteConversations(workspaceId: string, apiKey: string, ids: string[]) {
  return request<{ ok: true; deleted: number }>(workspaceId, apiKey, "/conversations/bulk-delete", {
    method: "POST",
    body: JSON.stringify({ ids }),
  });
}
