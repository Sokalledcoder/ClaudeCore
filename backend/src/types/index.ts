export type ID = string;

export interface Workspace {
  id: ID;
  name: string;
  projectRoot: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentProfile {
  id: ID;
  workspaceId: ID;
  name: string;
  description: string;
  model: string;
  systemPromptPreset: 'claude_code' | 'plain' | 'custom';
  customSystemPromptAppend?: string | null;
  allowedTools: string[];
  enabledSkillScopes: ('user' | 'project')[];
  enabledMcpServers: string[];
  maxTurnsInHistory: number;
  maxDocTokens: number;
  enableScratchpad: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChatSession {
  id: ID;
  workspaceId: ID;
  agentProfileId: ID;
  title: string;
  archived: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: ID;
  sessionId: ID;
  role: MessageRole;
  content: string;
  jobId?: ID | null;
  runId?: ID | null;
  createdAt: Date;
}

export type JobStatus = 'queued' | 'running' | 'success' | 'error' | 'cancelled';

export interface Job {
  id: ID;
  workspaceId: ID;
  agentProfileId: ID;
  title: string;
  description: string;
  status: JobStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type RunStatus = 'running' | 'success' | 'error';

export interface Run {
  id: ID;
  jobId: ID;
  sessionId?: ID | null;
  status: RunStatus;
  finalText?: string | null;
  startedAt: Date;
  finishedAt?: Date | null;
}

export type TraceEventType =
  | 'session_start'
  | 'system_init'
  | 'user_prompt'
  | 'assistant_message'
  | 'pre_tool_use'
  | 'post_tool_use'
  | 'subagent_start'
  | 'subagent_stop'
  | 'context_update'
  | 'stop'
  | 'notification'
  | 'error';

export interface TraceEvent {
  id: ID;
  runId: ID;
  type: TraceEventType;
  timestamp: Date;
  payload: Record<string, unknown>;
}

export interface ContextSnapshot {
  id: ID;
  runId: ID;
  createdAt: Date;
  historySummary: string;
  docsSummary: string;
  skillsSummary: string;
  mcpSummary: string;
  scratchpadSummary?: string;
}

export type MCPTransport = 'stdio' | 'http' | 'sse';

export interface MCPServerConfig {
  id: ID;
  workspaceId: ID;
  name: string;
  transport: MCPTransport;
  command?: string | null;
  args: string[];
  url?: string | null;
  headers: Record<string, string>;
  env: Record<string, string>;
  enabled: boolean;
  lastStatus?: string | null;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MCPTool {
  id: ID;
  workspaceId: ID;
  serverName: string;
  toolName: string;
  fullName: string;
  description: string;
  inputSchema: Record<string, unknown>;
  isHighRisk: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SkillScope = 'user' | 'project';

export interface SkillMetadata {
  id: ID;
  workspaceId: ID;
  slug: string;
  path: string;
  name: string;
  description: string;
  scope: SkillScope;
  trusted: boolean;
  lastIndexedAt: Date;
}

export interface ContextSlice {
  type: 'conversation' | 'task_spec' | 'retrieved_docs' | 'skills' | 'mcp_outputs' | 'scratchpad';
  summary: string;
  tokenEstimate: number;
  items: ContextSliceItem[];
  pinned: boolean;
}

export interface ContextSliceItem {
  id: string;
  title: string;
  content: string;
  source: string;
  pinned: boolean;
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
  systemPromptPreset?: 'claude_code' | 'plain' | 'custom';
  customSystemPromptAppend?: string;
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

export interface SendMessageInput {
  sessionId: string;
  content: string;
  createJob?: boolean;
}

export interface CreateJobInput {
  workspaceId: string;
  agentProfileId: string;
  title: string;
  description?: string;
}

export interface CreateMCPServerInput {
  workspaceId: string;
  name: string;
  transport: MCPTransport;
  command?: string;
  args?: string[];
  url?: string;
  headers?: Record<string, string>;
  env?: Record<string, string>;
  enabled?: boolean;
}

export interface CreateSkillInput {
  workspaceId: string;
  slug: string;
  name: string;
  description?: string;
  content: string;
  scope?: SkillScope;
  trusted?: boolean;
}

export interface StreamingMessage {
  type: 'chunk' | 'tool_call' | 'tool_result' | 'complete' | 'error' | 'trace_event';
  content?: string;
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolResult?: string;
  error?: string;
  traceEvent?: TraceEvent;
  sessionId?: string;
  messageId?: string;
}
