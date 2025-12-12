const API_BASE = '/api';

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `HTTP error ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}

export const api = {
  settings: {
    checkClaudeCode: (): Promise<{ installed: boolean; authenticated: boolean }> =>
      fetchApi('/settings/check-claude-code'),
    update: (data: { connectionMode: string; apiKey?: string }): Promise<void> =>
      fetchApi('/settings', { method: 'PUT', body: JSON.stringify(data) }),
    get: (): Promise<{ connectionMode: string }> =>
      fetchApi('/settings'),
  },

  filesystem: {
    browse: (path?: string): Promise<{
      currentPath: string;
      parentPath: string | null;
      directories: Array<{ name: string; path: string; isDirectory: boolean }>;
    }> => fetchApi(`/filesystem/browse${path ? `?path=${encodeURIComponent(path)}` : ''}`),
    quickPaths: (): Promise<{
      quickPaths: Array<{ name: string; path: string }>;
    }> => fetchApi('/filesystem/quick-paths'),
    createFolder: (parentPath: string, folderName: string): Promise<{
      success: boolean;
      path: string;
      name: string;
    }> => fetchApi('/filesystem/create-folder', { 
      method: 'POST', 
      body: JSON.stringify({ parentPath, folderName }) 
    }),
  },

  workspaces: {
    list: () => fetchApi<Workspace[]>('/workspaces'),
    get: (id: string) => fetchApi<Workspace>(`/workspaces/${id}`),
    create: (data: CreateWorkspaceInput) =>
      fetchApi<Workspace>('/workspaces', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateWorkspaceInput>) =>
      fetchApi<Workspace>(`/workspaces/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/workspaces/${id}`, { method: 'DELETE' }),
    scanSkills: (id: string) =>
      fetchApi<SkillMetadata[]>(`/workspaces/${id}/scan-skills`, { method: 'POST' }),
  },

  profiles: {
    list: (workspaceId: string) =>
      fetchApi<AgentProfile[]>(`/profiles?workspaceId=${workspaceId}`),
    get: (id: string) => fetchApi<AgentProfile>(`/profiles/${id}`),
    create: (data: CreateAgentProfileInput) =>
      fetchApi<AgentProfile>('/profiles', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<CreateAgentProfileInput>) =>
      fetchApi<AgentProfile>(`/profiles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/profiles/${id}`, { method: 'DELETE' }),
  },

  sessions: {
    list: (workspaceId: string) =>
      fetchApi<ChatSession[]>(`/sessions?workspaceId=${workspaceId}`),
    get: (id: string) => fetchApi<ChatSession>(`/sessions/${id}`),
    getMessages: (id: string, limit = 100) =>
      fetchApi<ChatMessage[]>(`/sessions/${id}/messages?limit=${limit}`),
    create: (data: CreateChatSessionInput) =>
      fetchApi<ChatSession>('/sessions', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: { title?: string; archived?: boolean }) =>
      fetchApi<ChatSession>(`/sessions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    delete: (id: string) => fetchApi<void>(`/sessions/${id}`, { method: 'DELETE' }),
  },

  skills: {
    list: (workspaceId: string) =>
      fetchApi<SkillMetadata[]>(`/skills?workspaceId=${workspaceId}`),
    get: (workspaceId: string, slug: string) =>
      fetchApi<{ metadata: SkillMetadata; content: string }>(
        `/skills/${slug}?workspaceId=${workspaceId}`
      ),
    create: (data: CreateSkillInput) =>
      fetchApi<SkillMetadata>('/skills', { method: 'POST', body: JSON.stringify(data) }),
    update: (workspaceId: string, slug: string, data: UpdateSkillInput) =>
      fetchApi<SkillMetadata>(`/skills/${slug}?workspaceId=${workspaceId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (workspaceId: string, slug: string) =>
      fetchApi<void>(`/skills/${slug}?workspaceId=${workspaceId}`, { method: 'DELETE' }),
    generateFromChat: (data: { workspaceId: string; chatHistory: ChatMessage[]; skillName: string }) =>
      fetchApi<{ content: string }>('/skills/generate-from-chat', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  mcp: {
    listServers: (workspaceId: string) =>
      fetchApi<MCPServerConfig[]>(`/mcp/servers?workspaceId=${workspaceId}`),
    getServer: (id: string) => fetchApi<MCPServerConfig>(`/mcp/servers/${id}`),
    createServer: (data: CreateMCPServerInput) =>
      fetchApi<MCPServerConfig>('/mcp/servers', { method: 'POST', body: JSON.stringify(data) }),
    updateServer: (id: string, data: Partial<CreateMCPServerInput>) =>
      fetchApi<MCPServerConfig>(`/mcp/servers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteServer: (id: string) =>
      fetchApi<void>(`/mcp/servers/${id}`, { method: 'DELETE' }),
    testServer: (id: string) =>
      fetchApi<{ success: boolean; message?: string; error?: string }>(
        `/mcp/servers/${id}/test`,
        { method: 'POST' }
      ),
    discoverTools: (id: string) =>
      fetchApi<MCPTool[]>(`/mcp/servers/${id}/discover-tools`, { method: 'POST' }),
    listTools: (workspaceId: string, serverName?: string) =>
      fetchApi<MCPTool[]>(
        `/mcp/tools?workspaceId=${workspaceId}${serverName ? `&serverName=${serverName}` : ''}`
      ),
  },

  jobs: {
    list: (workspaceId: string) =>
      fetchApi<Job[]>(`/jobs?workspaceId=${workspaceId}`),
    get: (id: string) => fetchApi<Job>(`/jobs/${id}`),
    create: (data: CreateJobInput) =>
      fetchApi<Job>('/jobs', { method: 'POST', body: JSON.stringify(data) }),
    cancel: (id: string) =>
      fetchApi<Job>(`/jobs/${id}/cancel`, { method: 'POST' }),
    delete: (id: string) => fetchApi<void>(`/jobs/${id}`, { method: 'DELETE' }),
    listRuns: (jobId: string) => fetchApi<Run[]>(`/jobs/${jobId}/runs`),
    getRun: (runId: string) => fetchApi<Run>(`/jobs/runs/${runId}`),
    getTrace: (runId: string) => fetchApi<TraceEvent[]>(`/jobs/runs/${runId}/trace`),
    getContext: (runId: string) => fetchApi<ContextSnapshot[]>(`/jobs/runs/${runId}/context`),
  },
};

export interface Workspace {
  id: string;
  name: string;
  projectRoot: string;
  createdAt: string;
  updatedAt: string;
}

export interface AgentProfile {
  id: string;
  workspaceId: string;
  name: string;
  description: string;
  model: string;
  systemPromptPreset: 'claude_code' | 'plain' | 'custom';
  customSystemPromptAppend?: string;
  allowedTools: string[];
  enabledSkillScopes: ('user' | 'project')[];
  enabledMcpServers: string[];
  maxTurnsInHistory: number;
  maxDocTokens: number;
  enableScratchpad: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatSession {
  id: string;
  workspaceId: string;
  agentProfileId: string;
  title: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  jobId?: string;
  runId?: string;
  createdAt: string;
}

export interface SkillMetadata {
  id: string;
  workspaceId: string;
  slug: string;
  path: string;
  name: string;
  description: string;
  scope: 'user' | 'project';
  trusted: boolean;
  lastIndexedAt: string;
}

export interface MCPServerConfig {
  id: string;
  workspaceId: string;
  name: string;
  transport: 'stdio' | 'http' | 'sse';
  command?: string;
  args: string[];
  url?: string;
  headers: Record<string, string>;
  env: Record<string, string>;
  enabled: boolean;
  lastStatus?: string;
  lastError?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MCPTool {
  id: string;
  workspaceId: string;
  serverName: string;
  toolName: string;
  fullName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  isHighRisk: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Job {
  id: string;
  workspaceId: string;
  agentProfileId: string;
  title: string;
  description: string;
  status: 'queued' | 'running' | 'success' | 'error' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface Run {
  id: string;
  jobId: string;
  sessionId?: string;
  status: 'running' | 'success' | 'error';
  finalText?: string;
  startedAt: string;
  finishedAt?: string;
}

export interface TraceEvent {
  id: string;
  runId: string;
  type: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface ContextSnapshot {
  id: string;
  runId: string;
  createdAt: string;
  historySummary: string;
  docsSummary: string;
  skillsSummary: string;
  mcpSummary: string;
  scratchpadSummary?: string;
}

export interface CreateWorkspaceInput {
  name: string;
  projectRoot: string;
}

export interface CreateAgentProfileInput {
  workspaceId: string;
  name: string;
  description?: string;
  model?: string;
  systemPrompt?: string | null;
  allowedTools?: string[];
  enabledSkillScopes?: ('user' | 'project')[];
  enabledMcpServers?: string[];
  maxTurnsInHistory?: number;
  maxDocTokens?: number;
  enableScratchpad?: boolean;
}

export interface CreateChatSessionInput {
  workspaceId: string;
  agentProfileId: string;
  title?: string;
}

export interface CreateSkillInput {
  workspaceId: string;
  slug: string;
  name: string;
  description?: string;
  content: string;
  scope?: 'user' | 'project';
  trusted?: boolean;
}

export interface UpdateSkillInput {
  name?: string;
  description?: string;
  content?: string;
  trusted?: boolean;
}

export interface CreateMCPServerInput {
  workspaceId: string;
  name: string;
  transport: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface CreateJobInput {
  workspaceId: string;
  agentProfileId: string;
  title: string;
  description?: string;
}
